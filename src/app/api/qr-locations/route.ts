import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/qr-locations
 * Lista ubicaciones QR (compatibilidad con app móvil).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const active = searchParams.get('active')
    const search = searchParams.get('search')

    const where: any = {}
    if (active !== null && active !== undefined && active !== '') {
      where.active = active === 'true'
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } },
      ]
    }

    const locations = await withRetry(() =>
      db.movilQrLocation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      }),
    )

    return NextResponse.json(locations)
  } catch (err) {
    console.error('GET /api/qr-locations error:', err)
    return NextResponse.json([])
  }
}

/**
 * POST /api/qr-locations
 * Crea una nueva ubicación QR.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const name = body.name?.trim()
    const code = body.code?.trim()

    if (!name) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

    let finalCode = code
    if (!finalCode) {
      const count = await withRetry(() => db.movilQrLocation.count())
      finalCode = `QR-${String(count + 1).padStart(3, '0')}`
    }

    const existing = await withRetry(() =>
      db.movilQrLocation.findUnique({ where: { code: finalCode } }),
    )
    if (existing) {
      return NextResponse.json({ error: `Código ${finalCode} ya existe` }, { status: 409 })
    }

    const location = await withRetry(() =>
      db.movilQrLocation.create({
        data: {
          name,
          code: finalCode,
          description: body.description || '',
          location: body.location || '',
          active: body.active !== undefined ? body.active : true,
          createdBy: body.createdBy || 'admin',
        },
      }),
    )

    return NextResponse.json(location, { status: 201 })
  } catch (err) {
    console.error('POST /api/qr-locations error:', err)
    const msg = err instanceof Error ? err.message : 'Error al crear ubicación'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/**
 * PUT /api/qr-locations
 * Actualiza una ubicación QR existente.
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const existing = await withRetry(() =>
      db.movilQrLocation.findUnique({ where: { id } }),
    )
    if (!existing) {
      return NextResponse.json({ error: 'Ubicación no encontrada' }, { status: 404 })
    }

    if (data.code && data.code !== existing.code) {
      const codeExists = await withRetry(() =>
        db.movilQrLocation.findUnique({ where: { code: data.code } }),
      )
      if (codeExists) {
        return NextResponse.json({ error: `Código ${data.code} ya existe` }, { status: 409 })
      }
    }

    const updateData: any = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.code !== undefined) updateData.code = data.code
    if (data.description !== undefined) updateData.description = data.description
    if (data.location !== undefined) updateData.location = data.location
    if (data.active !== undefined) updateData.active = data.active

    const location = await withRetry(() =>
      db.movilQrLocation.update({ where: { id }, data: updateData }),
    )

    return NextResponse.json(location)
  } catch (err) {
    console.error('PUT /api/qr-locations error:', err)
    const msg = err instanceof Error ? err.message : 'Error al actualizar ubicación'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
