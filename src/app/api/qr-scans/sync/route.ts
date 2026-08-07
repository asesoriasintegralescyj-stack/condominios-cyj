import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 30


/**
 * POST /api/qr-scans/sync
 * Sincroniza escaneos realizados offline por la app móvil de guardias.
 *
 * Body: { scans: OfflineScan[] }
 *   Cada scan puede traer:
 *     - code: código QR escaneado (ej: "QR-PORTERIA-01")
 *     - qrLocationId: alternativo directo
 *     - scannedBy: nombre del guardia
 *     - profileId: ID del perfil
 *     - latitude, longitude: GPS
 *     - notes: observaciones
 *     - scannedAt: timestamp ms del momento real del escaneo
 *
 * Retorna: { success, synced, failed, errors[], results[] }
 */
export async function POST(request: NextRequest) {
  try {
    const { scans } = await request.json()
    if (!Array.isArray(scans)) {
      return NextResponse.json({ success: true, synced: 0, failed: 0, errors: [], results: [] })
    }

    const codeCache = new Map<string, string | null>()

    let synced = 0
    let failed = 0
    const errors: { index: number; code?: string; error: string }[] = []
    const results: { success: boolean; code?: string; offlineId?: string; error?: string }[] = []

    for (let i = 0; i < scans.length; i++) {
      const s = scans[i] || {}
      try {
        let qrLocationId: string | undefined = s.qrLocationId
        if (!qrLocationId && s.code) {
          const codeKey = String(s.code).trim()
          if (codeCache.has(codeKey)) {
            qrLocationId = codeCache.get(codeKey) || undefined
          } else {
            const loc = await withRetry(() =>
              db.movilQrLocation.findUnique({ where: { code: codeKey } }),
            )
            codeCache.set(codeKey, loc?.id || null)
            qrLocationId = loc?.id
          }
        }

        if (!qrLocationId) {
          failed++
          const errMsg = `Código QR no reconocido: ${s.code || '(vacío)'}`
          errors.push({ index: i, code: s.code, error: errMsg })
          results.push({ success: false, code: s.code, offlineId: s.id, error: errMsg })
          continue
        }

        const scannedAt =
          typeof s.scannedAt === 'number' && Number.isFinite(s.scannedAt)
            ? new Date(s.scannedAt)
            : typeof s.scannedAt === 'string' && s.scannedAt
              ? new Date(s.scannedAt)
              : new Date()
        const createdAt = isNaN(scannedAt.getTime()) ? new Date() : scannedAt

        const latitude = parseCoord(s.latitude)
        const longitude = parseCoord(s.longitude)
        const scannedBy = typeof s.scannedBy === 'string' ? s.scannedBy : ''
        const profileId = typeof s.profileId === 'string' && s.profileId.trim() ? s.profileId : null
        const notes = typeof s.notes === 'string' ? s.notes : ''

        await withRetry(() =>
          db.movilQrScan.create({
            data: {
              qrLocationId,
              scannedBy,
              profileId,
              latitude,
              longitude,
              notes,
              createdAt,
            },
          }),
        )
        synced++
        results.push({ success: true, code: s.code, offlineId: s.id })
      } catch (err) {
        failed++
        const errMsg = err instanceof Error ? err.message : 'Error desconocido'
        errors.push({ index: i, code: s.code, error: errMsg })
        results.push({ success: false, code: s.code, offlineId: s.id, error: errMsg })
      }
    }

    return NextResponse.json({ success: true, synced, failed, errors, results })
  } catch (err) {
    console.error('POST /api/qr-scans/sync error:', err)
    return NextResponse.json(
      { error: 'Error al sincronizar escaneos' },
      { status: 500 },
    )
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
