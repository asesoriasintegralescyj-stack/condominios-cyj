import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 30


export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getCurrentSession()
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    if (session.user.rol !== 'admin' && session.user.rol !== 'supervisor') {
      return NextResponse.json({ error: 'Solo administradores o supervisores' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const existing = await withRetry(() => db.movilProfile.findUnique({ where: { id } }))
    if (!existing) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.password !== undefined) updateData.password = body.password
    if (body.accessCode !== undefined) updateData.accessCode = body.accessCode
    if (body.color !== undefined) updateData.color = body.color
    if (body.icon !== undefined) updateData.icon = body.icon
    if (body.workAreaIds !== undefined) updateData.workAreaIds = body.workAreaIds
    if (body.permissions !== undefined) updateData.permissions = body.permissions
    if (body.personalId !== undefined) updateData.personalId = body.personalId

    const profile = await withRetry(() =>
      db.movilProfile.update({ where: { id }, data: updateData }),
    )

    return NextResponse.json(profile)
  } catch (err) {
    console.error('PUT /api/profiles/[id] error:', err)
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getCurrentSession()
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    if (session.user.rol !== 'admin' && session.user.rol !== 'supervisor') {
      return NextResponse.json({ error: 'Solo administradores o supervisores' }, { status: 403 })
    }

    const { id } = await params
    await withRetry(() => db.movilProfile.delete({ where: { id } }))
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/profiles/[id] error:', err)
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
