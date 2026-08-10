import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/qr-scans
 * Lista escaneos QR (compatibilidad con app móvil).
 * La app móvil usa esta URL en vez de /api/qr-rondas/scans.
 *
 * OPTIMIZADO: Batch location lookup (1 sola query en vez de N+1)
 * para evitar saturar el pool de conexiones de Aiven.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const qrLocationId = searchParams.get('qrLocationId') || undefined
    const scannedBy = searchParams.get('scannedBy') || undefined
    const profileId = searchParams.get('profileId') || undefined
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10) || 200, 500)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0)

    const where: any = {}
    if (qrLocationId) where.qrLocationId = qrLocationId
    if (scannedBy) where.scannedBy = scannedBy
    if (profileId) where.profileId = profileId
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(Number(from))
      if (to) where.createdAt.lte = new Date(Number(to))
    }

    // 2 queries en paralelo (no más)
    const [scansRaw, total] = await Promise.all([
      withRetry(() =>
        db.movilQrScan.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
      ),
      withRetry(() => db.movilQrScan.count({ where })),
    ])

    if (scansRaw.length === 0) {
      return NextResponse.json({ scans: [], total })
    }

    // OPTIMIZACIÓN: 1 sola query batch para todas las ubicaciones
    const locationIds = [...new Set(scansRaw.map((s) => s.qrLocationId))]
    const locations = await withRetry(() =>
      db.movilQrLocation.findMany({
        where: { id: { in: locationIds } },
        select: { id: true, name: true, location: true, code: true },
      }),
    )

    const locMap = new Map<string, { id: string; name: string; location: string; code: string }>()
    for (const loc of locations) locMap.set(loc.id, loc)

    const scans = scansRaw.map((s) => ({
      ...s,
      location: locMap.get(s.qrLocationId) || null,
    }))

    return NextResponse.json({ scans, total })
  } catch (err) {
    console.error('GET /api/qr-scans error:', err)
    return NextResponse.json({ scans: [], total: 0 })
  }
}

/**
 * POST /api/qr-scans
 * Registra un nuevo escaneo QR desde la app móvil.
 *
 * OPTIMIZADO: Mínimas queries (lookup + create + location enrichment)
 * para no saturar el pool de conexiones de Aiven.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    let qrLocationId: string | undefined = body.qrLocationId
    let locationName: string | undefined

    // Solo hacer lookup si no se proporciona qrLocationId directamente
    if (!qrLocationId && body.code) {
      const loc = await withRetry(() =>
        db.movilQrLocation.findUnique({ where: { code: String(body.code).trim() } }),
      )
      if (!loc) {
        return NextResponse.json({ error: `Código QR no reconocido: ${body.code}` }, { status: 404 })
      }
      if (!loc.active) {
        return NextResponse.json({ error: `La ubicación ${loc.name} está inactiva` }, { status: 400 })
      }
      qrLocationId = loc.id
      locationName = loc.name
    }

    if (!qrLocationId) {
      return NextResponse.json({ error: 'Se requiere code o qrLocationId' }, { status: 400 })
    }

    const latitude = parseCoord(body.latitude)
    const longitude = parseCoord(body.longitude)
    const scannedBy = typeof body.scannedBy === 'string' ? body.scannedBy : ''
    const profileId = typeof body.profileId === 'string' && body.profileId.trim() ? body.profileId : null
    const notes = typeof body.notes === 'string' ? body.notes : ''
    const scannedAt =
      typeof body.scannedAt === 'number' && Number.isFinite(body.scannedAt)
        ? new Date(body.scannedAt)
        : typeof body.scannedAt === 'string' && body.scannedAt
          ? new Date(body.scannedAt)
          : new Date()
    const createdAt = isNaN(scannedAt.getTime()) ? new Date() : scannedAt

    // Crear escaneo
    const scan = await withRetry(() =>
      db.movilQrScan.create({
        data: { qrLocationId, scannedBy, profileId, latitude, longitude, notes, createdAt },
      }),
    )

    // Enriquecer con datos de ubicación si no se obtuvieron antes
    let locationData: { id: string; name: string; location: string; code: string } | null = null
    if (!locationName) {
      try {
        locationData = await withRetry(() =>
          db.movilQrLocation.findUnique({
            where: { id: qrLocationId! },
            select: { id: true, name: true, location: true, code: true },
          }),
        )
      } catch { /* ignore */ }
    } else {
      // Si ya tenemos el nombre, devolver lo que podemos sin query extra
      locationData = { id: qrLocationId!, name: locationName, location: '', code: String(body.code || '') }
    }

    return NextResponse.json({ ...scan, location: locationData })
  } catch (err) {
    console.error('POST /api/qr-scans error:', err)
    const msg = err instanceof Error ? err.message : 'Error al registrar escaneo'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

function parseCoord(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return null
}
