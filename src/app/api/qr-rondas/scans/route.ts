/**
 * API para gestión de ESCANEOS QR (registros de rondas)
 * Sistema de Gestión de Condominios (escritorio) — condominios-cyj
 *
 * Comparte la tabla MovilQrScan con la app móvil.
 * Cualquier escaneo que haga un guardia en la app móvil aparece aquí
 * instantáneamente (sin necesidad de sincronización manual).
 */

import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// Forzar renderizado dinámico — sin caché
export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET — Listar escaneos con filtros opcionales
// Query params:
//   - qrLocationId: filtrar por ubicación QR
//   - scannedBy:    filtrar por nombre del guardia
//   - profileId:    filtrar por perfil
//   - from:         timestamp ms (inclusive)
//   - to:           timestamp ms (inclusive)
//   - limit:        por defecto 200, máx 500
//   - offset:       paginación
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const qrLocationId = searchParams.get('qrLocationId') || undefined
    const scannedBy = searchParams.get('scannedBy') || undefined
    const profileId = searchParams.get('profileId') || undefined
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '200', 10) || 200,
      500,
    )
    const offset = Math.max(
      parseInt(searchParams.get('offset') || '0', 10) || 0,
      0,
    )

    const where: any = {}
    if (qrLocationId) where.qrLocationId = qrLocationId
    if (scannedBy) where.scannedBy = scannedBy
    if (profileId) where.profileId = profileId
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(Number(from))
      if (to) where.createdAt.lte = new Date(Number(to))
    }

    // Importante: el schema Prisma NO define @relation entre MovilQrScan y
    // MovilQrLocation (mismo diseño que la app móvil). No podemos usar
    // `include: { location }`. Hacemos lookup manual con cache.
    const scansRaw = await withRetry(() =>
      db.movilQrScan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
    )
    const total = await withRetry(() => db.movilQrScan.count({ where }))

    // Hidratar cada scan con su ubicación (lookup manual, con cache)
    const locationCache = new Map<
      string,
      { id: string; name: string; location: string; code: string } | null
    >()
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
          } catch {
            loc = null
          }
          locationCache.set(s.qrLocationId, loc)
        }
        return { ...s, location: loc }
      }),
    )

    return NextResponse.json({ scans, total })
  } catch (error) {
    console.error('Error fetching QR scans:', error)
    return NextResponse.json({ scans: [], total: 0 })
  }
}
