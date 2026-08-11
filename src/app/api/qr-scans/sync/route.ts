import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Dar más tiempo para procesar batches de escaneos offline.
export const maxDuration = 30

/**
 * POST /api/qr-scans/sync
 * Sincroniza escaneos realizados offline por la app móvil de guardias.
 *
 * OPTIMIZADO: Fase 1 resuelve todos los códigos QR en batch (1 query),
 * luego usa createMany para insertar todos los escaneos válidos en 1 sola query.
 * Antes: N queries de lookup + N creates individuales = 2N queries.
 * Ahora: 1 batch lookup + 1 createMany = 2 queries fijas.
 *
 * Body: { scans: OfflineScan[] }
 * Retorna: { success, synced, failed, errors[], results[] }
 */
export async function POST(request: NextRequest) {
  try {
    const { scans } = await request.json()
    if (!Array.isArray(scans) || scans.length === 0) {
      return NextResponse.json({ success: true, synced: 0, failed: 0, errors: [], results: [] })
    }

    // ─── FASE 1: Resolver todos los códigos QR en batch ───
    const codeToIndex = new Map<string, number[]>()
    const scanData: Array<{
      index: number
      qrLocationId: string | undefined
      code: string
      scannedBy: string
      profileId: string | null
      latitude: number | null
      longitude: number | null
      notes: string
      createdAt: Date
      valid: boolean
      error?: string
    }> = []

    for (let i = 0; i < scans.length; i++) {
      const s = scans[i] || {}
      const code = typeof s.code === 'string' ? String(s.code).trim() : ''

      let qrLocationId: string | undefined = s.qrLocationId

      if (!qrLocationId && code) {
        if (!codeToIndex.has(code)) codeToIndex.set(code, [])
        codeToIndex.get(code)!.push(i)
      }

      const scannedAt =
        typeof s.scannedAt === 'number' && Number.isFinite(s.scannedAt)
          ? new Date(s.scannedAt)
          : typeof s.scannedAt === 'string' && s.scannedAt
            ? new Date(s.scannedAt)
            : new Date()
      const createdAt = isNaN(scannedAt.getTime()) ? new Date() : scannedAt

      scanData.push({
        index: i,
        qrLocationId,
        code,
        scannedBy: typeof s.scannedBy === 'string' ? s.scannedBy : '',
        profileId: typeof s.profileId === 'string' && s.profileId.trim() ? s.profileId : null,
        latitude: parseCoord(s.latitude),
        longitude: parseCoord(s.longitude),
        notes: typeof s.notes === 'string' ? s.notes : '',
        createdAt,
        valid: !!qrLocationId,
        error: !qrLocationId && !code ? 'Código QR vacío y sin qrLocationId' : undefined,
      })
    }

    // Resolver todos los códigos QR en una sola batch query
    const uniqueCodes = [...codeToIndex.keys()]
    const codeToIdMap = new Map<string, string | null>()

    if (uniqueCodes.length > 0) {
      try {
        const locations = await withRetry(() =>
          db.movilQrLocation.findMany({
            where: { code: { in: uniqueCodes } },
            select: { id: true, code: true, active: true },
          }),
        )
        for (const loc of locations) {
          codeToIdMap.set(loc.code, loc.active ? loc.id : null)
        }
        for (const code of uniqueCodes) {
          if (!codeToIdMap.has(code)) codeToIdMap.set(code, null)
        }
      } catch (err) {
        console.error('[Sync] Error resolviendo códigos QR:', err)
        for (const code of uniqueCodes) codeToIdMap.set(code, null)
      }
    }

    // Asignar qrLocationId resueltos y validar
    for (const sd of scanData) {
      if (!sd.valid && sd.code) {
        const resolvedId = codeToIdMap.get(sd.code)
        if (resolvedId) {
          sd.qrLocationId = resolvedId
          sd.valid = true
        } else {
          sd.error = `Código QR no reconocido: ${sd.code}`
        }
      }
    }

    // ─── FASE 2: Separar válidos de inválidos ───
    const validScans = scanData.filter((s) => s.valid && s.qrLocationId)
    const invalidScans = scanData.filter((s) => !s.valid)

    let synced = 0
    let failed = invalidScans.length
    const errors: { index: number; code?: string; error: string }[] = []
    const results: { success: boolean; code?: string; offlineId?: string; error?: string }[] = []

    for (const s of invalidScans) {
      const errMsg = s.error || 'Datos inválidos'
      errors.push({ index: s.index, code: s.code, error: errMsg })
      results.push({ success: false, code: s.code, offlineId: scans[s.index]?.id, error: errMsg })
    }

    // ─── FASE 3: Insertar todos los escaneos válidos con createMany ───
    if (validScans.length > 0) {
      try {
        await withRetry(() =>
          db.movilQrScan.createMany({
            data: validScans.map((s) => ({
              qrLocationId: s.qrLocationId!,
              scannedBy: s.scannedBy,
              profileId: s.profileId,
              latitude: s.latitude,
              longitude: s.longitude,
              notes: s.notes,
              createdAt: s.createdAt,
            })),
            skipDuplicates: false,
          }),
        )
        synced = validScans.length
        for (const s of validScans) {
          results.push({ success: true, code: s.code, offlineId: scans[s.index]?.id })
        }
      } catch (err) {
        // Fallback a inserts individuales si createMany falla
        console.warn('[Sync] createMany falló, fallback a individual:', err)
        for (const s of validScans) {
          try {
            await withRetry(
              () =>
                db.movilQrScan.create({
                  data: {
                    qrLocationId: s.qrLocationId!,
                    scannedBy: s.scannedBy,
                    profileId: s.profileId,
                    latitude: s.latitude,
                    longitude: s.longitude,
                    notes: s.notes,
                    createdAt: s.createdAt,
                  },
                }),
              2,
              300,
            )
            synced++
            results.push({ success: true, code: s.code, offlineId: scans[s.index]?.id })
          } catch (innerErr) {
            failed++
            const errMsg = innerErr instanceof Error ? innerErr.message : 'Error desconocido'
            errors.push({ index: s.index, code: s.code, error: errMsg })
            results.push({ success: false, code: s.code, offlineId: scans[s.index]?.id, error: errMsg })
          }
        }
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
