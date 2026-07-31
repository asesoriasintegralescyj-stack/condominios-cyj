/**
 * API Categorías de Rendición de Gastos - CRUD
 */
import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError, handlePrismaError } from '@/lib/api-helpers'

// GET - Listar categorías activas
export async function GET() {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  try {
    const categorias = await withRetry(() =>
      db.categoriaGasto.findMany({
        where: { activa: true },
        orderBy: { nombre: 'asc' },
      })
    )

    return NextResponse.json(categorias)
  } catch (error) {
    return handlePrismaError(error)
  }
}

// POST - Crear categoría (solo admin)
export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  if (session.user.rol !== 'admin') {
    return apiError('Solo el administrador puede crear categorías', 403)
  }

  try {
    const body = await request.json()
    const { nombre, descripcion, color } = body

    if (!nombre) {
      return apiError('El nombre es obligatorio', 400)
    }

    const categoria = await withRetry(() =>
      db.categoriaGasto.create({
        data: {
          nombre,
          descripcion: descripcion || null,
          color: color || '#0f2044',
        },
      })
    )

    return NextResponse.json(categoria, { status: 201 })
  } catch (error) {
    return handlePrismaError(error)
  }
}

// PUT - Actualizar categoría (solo admin)
export async function PUT(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  if (session.user.rol !== 'admin') {
    return apiError('Solo el administrador puede editar categorías', 403)
  }

  try {
    const body = await request.json()
    const { id, nombre, descripcion, color, activa } = body

    if (!id) return apiError('ID es obligatorio', 400)

    const categoria = await withRetry(() =>
      db.categoriaGasto.update({
        where: { id },
        data: {
          ...(nombre !== undefined ? { nombre } : {}),
          ...(descripcion !== undefined ? { descripcion } : {}),
          ...(color !== undefined ? { color } : {}),
          ...(activa !== undefined ? { activa } : {}),
        },
      })
    )

    return NextResponse.json(categoria)
  } catch (error) {
    return handlePrismaError(error)
  }
}

// DELETE - Desactivar categoría (solo admin)
export async function DELETE(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  if (session.user.rol !== 'admin') {
    return apiError('Solo el administrador puede desactivar categorías', 403)
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return apiError('ID es obligatorio', 400)

    await withRetry(() =>
      db.categoriaGasto.update({
        where: { id },
        data: { activa: false },
      })
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handlePrismaError(error)
  }
}
