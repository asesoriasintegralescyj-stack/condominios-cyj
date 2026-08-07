import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// GET - Obtener un perfil por ID
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  try {
    const { id } = await params
    const perfil = await db.movilProfile.findUnique({ where: { id } })
    if (!perfil) return apiError('Perfil no encontrado', 404)

    // Lookup personal vinculado
    let personal = null
    if (perfil.personalId) {
      personal = await db.personal.findUnique({
        where: { id: perfil.personalId },
        select: { id: true, nombre: true, cargo: true, estado: true },
      })
    }

    return NextResponse.json({ ...perfil, personal })
  } catch (error) {
    console.error('Error fetching perfil móvil:', error)
    return NextResponse.json({ error: 'Error al obtener perfil' }, { status: 500 })
  }
}

// PUT - Actualizar perfil
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'usuarios.editar', session.userPermisos)) {
    return apiError('Sin permisos', 403)
  }
  try {
    const { id } = await params
    const data = await request.json()
    const { personal, ...updateData } = data
    const perfil = await db.movilProfile.update({
      where: { id },
      data: updateData,
    })

    // Lookup personal vinculado
    let personalLinked = null
    if (perfil.personalId) {
      personalLinked = await db.personal.findUnique({
        where: { id: perfil.personalId },
        select: { id: true, nombre: true, cargo: true, estado: true },
      })
    }

    return NextResponse.json({ ...perfil, personal: personalLinked })
  } catch (error) {
    console.error('Error updating perfil móvil:', error)
    return NextResponse.json({ error: 'Error al actualizar perfil' }, { status: 500 })
  }
}

// DELETE - Eliminar perfil
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'usuarios.eliminar', session.userPermisos)) {
    return apiError('Sin permisos', 403)
  }
  try {
    const { id } = await params
    await db.movilProfile.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting perfil móvil:', error)
    return NextResponse.json({ error: 'Error al eliminar perfil' }, { status: 500 })
  }
}
