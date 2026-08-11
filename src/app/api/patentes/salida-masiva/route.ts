import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/patentes/salida-masiva
 * Registra salida masiva de todas las patentes abiertas.
 * Compatibilidad con app móvil.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const scannedBy = body.scannedBy || ''
    const profileId = body.profileId || null

    // Buscar todas las patentes sin salida
    const abiertas = await withRetry(() =>
      db.movilPatente.findMany({
        where: { salidaAt: null },
      }),
    )

    if (abiertas.length === 0) {
      return NextResponse.json({ message: 'No hay patentes abiertas', closed: 0 })
    }

    // Registrar salida masiva
    const results = await Promise.all(
      abiertas.map((p) =>
        withRetry(() =>
          db.movilPatente.update({
            where: { id: p.id },
            data: {
              salidaAt: new Date(),
              salidaQrCode: 'SALIDA-MASIVA',
              scannedBy: scannedBy || p.scannedBy,
            },
          }),
        ),
      ),
    )

    return NextResponse.json({ 
      message: `Se registró la salida de ${results.length} patentes`, 
      closed: results.length 
    })
  } catch (err) {
    console.error('POST /api/patentes/salida-masiva error:', err)
    return NextResponse.json({ error: 'Error al registrar salidas' }, { status: 500 })
  }
}
