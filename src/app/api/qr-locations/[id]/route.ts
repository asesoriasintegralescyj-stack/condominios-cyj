import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const location = await withRetry(() => db.movilQrLocation.findUnique({ where: { id } }))
    if (!location) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
    return NextResponse.json(location)
  } catch (err) {
    console.error('GET /api/qr-locations/[id] error:', err)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await request.json()
    const existing = await withRetry(() => db.movilQrLocation.findUnique({ where: { id } }))
    if (!existing) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

    if (body.code && body.code !== existing.code) {
      const codeExists = await withRetry(() => db.movilQrLocation.findUnique({ where: { code: body.code } }))
      if (codeExists) return NextResponse.json({ error: 'Código ya existe' }, { status: 409 })
    }

    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.code !== undefined) updateData.code = body.code
    if (body.description !== undefined) updateData.description = body.description
    if (body.location !== undefined) updateData.location = body.location
    if (body.active !== undefined) updateData.active = body.active

    const location = await withRetry(() => db.movilQrLocation.update({ where: { id }, data: updateData }))
    return NextResponse.json(location)
  } catch (err) {
    console.error('PUT /api/qr-locations/[id] error:', err)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const existing = await withRetry(() => db.movilQrLocation.findUnique({ where: { id } }))
    if (!existing) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

    await withRetry(() => db.movilQrLocation.update({ where: { id }, data: { active: false } }))
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/qr-locations/[id] error:', err)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
