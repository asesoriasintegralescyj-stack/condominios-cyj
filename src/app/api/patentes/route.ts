import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/patentes
 * Lista patentes (compatibilidad con app móvil).
 * Query params: soloAbiertas, ubicacion, from, to, limit
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const soloAbiertas = searchParams.get('soloAbiertas') === 'true'
    const ubicacion = searchParams.get('ubicacion') || undefined
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const limit = Math.min(parseInt(searchParams.get('limit') || '200', 10) || 200, 500)

    const where: any = {}
    if (soloAbiertas) where.salidaAt = null
    if (ubicacion) where.ubicacion = ubicacion
    if (from || to) {
      where.entradaAt = {}
      if (from) where.entradaAt.gte = new Date(Number(from))
      if (to) where.entradaAt.lte = new Date(Number(to))
    }

    const patentes = await withRetry(() =>
      db.movilPatente.findMany({
        where,
        orderBy: { entradaAt: 'desc' },
        take: limit,
      }),
    )
    const total = await withRetry(() => db.movilPatente.count({ where }))

    return NextResponse.json({ patentes, total })
  } catch (err) {
    console.error('GET /api/patentes error:', err)
    return NextResponse.json({ patentes: [], total: 0 })
  }
}

/**
 * POST /api/patentes
 * Registra entrada de patente desde la app móvil.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const patente = (body.patente || '').trim().toUpperCase()
    if (!patente) return NextResponse.json({ error: 'Patente requerida' }, { status: 400 })

    const ubicacion = body.ubicacion || ''
    const scannedBy = body.scannedBy || ''
    const profileId = body.profileId || null
    const latitude = body.latitude !== null && body.latitude !== undefined ? parseFloat(body.latitude) : null
    const longitude = body.longitude !== null && body.longitude !== undefined ? parseFloat(body.longitude) : null
    const foto = body.foto || null
    const notes = body.notes || ''
    const entradaQrCode = body.entradaQrCode || null
    const entradaScanId = body.entradaScanId || null

    const created = await withRetry(() =>
      db.movilPatente.create({
        data: {
          patente,
          ubicacion,
          entradaQrCode,
          entradaScanId,
          scannedBy,
          profileId,
          latitude,
          longitude,
          foto,
          notes,
        },
      }),
    )

    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    console.error('POST /api/patentes error:', err)
    const msg = err instanceof Error ? err.message : 'Error al registrar patente'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * PUT /api/patentes
 * Registra salida de patente o actualiza registro.
 * La app móvil usa PUT para registrar salidas.
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const existing = await withRetry(() =>
      db.movilPatente.findUnique({ where: { id } }),
    )
    if (!existing) {
      return NextResponse.json({ error: 'Patente no encontrada' }, { status: 404 })
    }

    // Si viene salidaQrCode o salidaScanId, registrar la salida
    const updateData: any = {}
    if (data.salidaQrCode !== undefined) updateData.salidaQrCode = data.salidaQrCode
    if (data.salidaScanId !== undefined) updateData.salidaScanId = data.salidaScanId
    if (data.salidaAt !== undefined) {
      updateData.salidaAt = typeof data.salidaAt === 'string' ? new Date(data.salidaAt) : new Date()
    } else if (data.salidaQrCode || data.salidaScanId) {
      // Auto-set salidaAt if not provided but a salida field is present
      updateData.salidaAt = new Date()
    }
    if (data.ubicacion !== undefined) updateData.ubicacion = data.ubicacion
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.foto !== undefined) updateData.foto = data.foto

    const updated = await withRetry(() =>
      db.movilPatente.update({ where: { id }, data: updateData }),
    )

    return NextResponse.json(updated)
  } catch (err) {
    console.error('PUT /api/patentes error:', err)
    const msg = err instanceof Error ? err.message : 'Error al actualizar patente'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
