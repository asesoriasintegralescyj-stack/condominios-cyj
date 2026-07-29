/**
 * API para gestión de ESCANEOS QR (registros de rondas)
 * Sistema de Gestión de Condominios (escritorio) — condominios-cyj
 *
 * Comparte la tabla MovilQrScan con la app móvil.
 * Cualquier escaneo que haga un guardia en la app móvil aparece aquí
 * instantáneamente (sin necesidad de sincronización manual).
 *
 * OPTIMIZADO: Batch location lookup (una sola query en vez de N+1)
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

    // 1 query: obtener escaneos
    // 1 query: contar total
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

    // OPTIMIZACIÓN: Batch location lookup (1 sola query en vez de N)
    if (scansRaw.length === 0) {
      return NextResponse.json({ scans: [], total })
    }

    const locationIds = [...new Set(scansRaw.map((s) => s.qrLocationId))]
    const locations = await withRetry(() =>
      db.movilQrLocation.findMany({
        where: { id: { in: locationIds } },
        select: { id: true, name: true, location: true, code: true },
      }),
    )

    const locMap = new Map<string, { id: string; name: string; location: string; code: string }>()
    for (const loc of locations) locMap.set(loc.id, loc)

    // Enriquecer sin queries adicionales
    const scans = scansRaw.map((s) => ({
      ...s,
      location: locMap.get(s.qrLocationId) || null,
    }))

    return NextResponse.json({ scans, total })
  } catch (error) {
    console.error('Error fetching QR scans:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ scans: [], total: 0, error: msg })
  }
}
