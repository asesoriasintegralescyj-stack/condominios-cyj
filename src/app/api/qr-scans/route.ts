import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/qr-scans
 * Lista escaneos QR (compatibilidad con app móvil).
 * La app móvil usa esta URL en vez de /api/qr-rondas/scans.
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

    const scansRaw = await withRetry(() =>
      db.movilQrScan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
    )
    const total = await withRetry(() => db.movilQrScan.count({ where }))

    const locationCache = new Map<string, { id: string; name: string; location: string; code: string } | null>()
    const scans = await Promise.all(
      scansRaw.map(async (s) => {
        let loc = locationCache.get(s.qrLocationId)
        if (loc === undefined) {
          try {
            loc = await withRetry(() =>
              db.movilQrLocation.findUnique({
                where: { id: s.qrLocationId },
                select: { id: true, name: true, location: true, code: true },
              }),
            )
          } catch { loc = null }
          locationCache.set(s.qrLocationId, loc)
        }
        return { ...s, location: loc }
      }),
    )

    return NextResponse.json({ scans, total })
  } catch (err) {
    console.error('GET /api/qr-scans error:', err)
    return NextResponse.json({ scans: [], total: 0 })
  }
}

/**
 * POST /api/qr-scans
 * Registra un nuevo escaneo QR desde la app móvil.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    let qrLocationId: string | undefined = body.qrLocationId
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

    const scan = await withRetry(() =>
      db.movilQrScan.create({
        data: { qrLocationId, scannedBy, profileId, latitude, longitude, notes, createdAt },
      }),
    )

    let locationData: { id: string; name: string; location: string; code: string } | null = null
    try {
      locationData = await withRetry(() =>
        db.movilQrLocation.findUnique({
          where: { id: qrLocationId! },
          select: { id: true, name: true, location: true, code: true },
        }),
      )
    } catch { /* ignore */ }

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
