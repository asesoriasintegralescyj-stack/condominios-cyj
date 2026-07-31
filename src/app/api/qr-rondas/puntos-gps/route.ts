import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/qr-rondas/puntos-gps
 * Lista los puntos GPS fijos guardados (referencias de ubicacion).
 * No requiere admin (conserje tambien puede ver).
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Usar la tabla MovilQrLocation pero con campos extra de GPS.
    // Como no podemos alterar el schema facilmente, guardamos los GPS
    // en la descripcion como JSON: {"lat": -33.32, "lng": -70.75}
    const locations = await withRetry(() =>
      db.movilQrLocation.findMany({
        where: { active: true },
        orderBy: { createdAt: 'asc' },
      }),
    )

    // Extraer GPS de la descripcion si existe
    const puntos = locations.map(loc => {
      let gpsLat: number | null = null
      let gpsLng: number | null = null
      try {
        const match = loc.description.match(/\{"lat":\s*(-?[\d.]+),\s*"lng":\s*(-?[\d.]+)\}/)
        if (match) {
          gpsLat = parseFloat(match[1])
          gpsLng = parseFloat(match[2])
        }
      } catch {}

      return {
        id: loc.id,
        name: loc.name,
        code: loc.code,
        location: loc.location,
        gpsLat,
        gpsLng,
      }
    })

    return NextResponse.json({ puntos })
  } catch (error) {
    console.error('Error fetching puntos GPS:', error)
    return NextResponse.json({ puntos: [] })
  }
}

/**
 * PUT /api/qr-rondas/puntos-gps
 * Guarda las coordenadas GPS de un punto.
 * Solo admin.
 *
 * Body:
 *   - id: string (ID de MovilQrLocation)
 *   - lat: number
 *   - lng: number
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (user.rol !== 'admin') {
      return NextResponse.json({ error: 'Solo admin puede editar puntos GPS' }, { status: 403 })
    }

    const body = await request.json()
    const { id, lat, lng } = body

    if (!id || typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json({ error: 'id, lat, lng son obligatorios' }, { status: 400 })
    }

    // Obtener la ubicacion actual
    const loc = await withRetry(() => db.movilQrLocation.findUnique({ where: { id } }))
    if (!loc) {
      return NextResponse.json({ error: 'Ubicacion no encontrada' }, { status: 404 })
    }

    // Limpiar descripcion anterior de GPS previo y agregar el nuevo
    let descLimpia = loc.description.replace(/\s*\{"lat":\s*-?[\d.]+,\s*"lng":\s*-?[\d.]+\}\s*/g, '').trim()
    const nuevaDesc = `${descLimpia} {"lat": ${lat}, "lng": ${lng}}`

    await withRetry(() =>
      db.movilQrLocation.update({
        where: { id },
        data: { description: nuevaDesc },
      }),
    )

    return NextResponse.json({ success: true, id, lat, lng })
  } catch (error) {
    console.error('Error guardando punto GPS:', error)
    return NextResponse.json({ error: 'Error al guardar punto GPS' }, { status: 500 })
  }
}
