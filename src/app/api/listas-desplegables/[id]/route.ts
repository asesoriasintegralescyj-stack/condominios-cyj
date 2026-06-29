import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'
import { apiError, handlePrismaError } from '@/lib/api-helpers'

// GET - Obtener un valor por id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const lista = await db.listaDesplegable.findUnique({ where: { id } })
    if (!lista) return apiError('No encontrado', 404)
    return NextResponse.json(lista)
  } catch (error) {
    console.error('Error fetching lista desplegable:', error)
    return handlePrismaError(error)
  }
}

// PUT - Actualizar un valor
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (
    session.user.rol !== 'admin' &&
    !hasPermission(session.user.rol, 'catalogos.editar') &&
    !hasPermission(session.user.rol, 'proyectos.editar')
  ) {
    return apiError('Sin permisos', 403)
  }
  try {
    const { id } = await params
    const data = await request.json()

    const updateData: any = {}
    if (data.nombre !== undefined) updateData.nombre = String(data.nombre).trim()
    if (data.valor !== undefined) updateData.valor = String(data.valor).trim()
    if (data.activo !== undefined) updateData.activo = Boolean(data.activo)

    const actualizado = await db.listaDesplegable.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(actualizado)
  } catch (error) {
    console.error('Error updating lista desplegable:', error)
    return handlePrismaError(error)
  }
}

// DELETE - Desactivar un valor (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (
    session.user.rol !== 'admin' &&
    !hasPermission(session.user.rol, 'catalogos.eliminar') &&
    !hasPermission(session.user.rol, 'proyectos.eliminar')
  ) {
    return apiError('Sin permisos', 403)
  }
  try {
    const { id } = await params
    const desactivado = await db.listaDesplegable.update({
      where: { id },
      data: { activo: false },
    })
    return NextResponse.json(desactivado)
  } catch (error) {
    console.error('Error deleting lista desplegable:', error)
    return handlePrismaError(error)
  }
}
