<<<<<<< HEAD
import { NextRequest } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError, apiSuccess, handlePrismaError } from '@/lib/api-helpers'

// GET: listar categorías activas
export async function GET() {
  try {
    const session = await getCurrentSession()
    if (!session) return apiError('No autenticado', 401)

=======
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
>>>>>>> 4585c06d3f055df9c7b5541ddeae5adb8114b7b5
    const categorias = await withRetry(() =>
      db.categoriaGasto.findMany({
        where: { activa: true },
        orderBy: { nombre: 'asc' },
      })
    )
<<<<<<< HEAD
    return apiSuccess(categorias)
=======

    return NextResponse.json(categorias)
>>>>>>> 4585c06d3f055df9c7b5541ddeae5adb8114b7b5
  } catch (error) {
    return handlePrismaError(error)
  }
}

<<<<<<< HEAD
// POST: crear categoría (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession()
    if (!session) return apiError('No autenticado', 401)
    if (session.user.rol !== 'admin') return apiError('Solo administradores', 403)

    const body = await req.json()
    const { nombre, descripcion, color, condominioId } = body

    if (!nombre?.trim()) return apiError('El nombre es obligatorio')
=======
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
>>>>>>> 4585c06d3f055df9c7b5541ddeae5adb8114b7b5

    const categoria = await withRetry(() =>
      db.categoriaGasto.create({
        data: {
<<<<<<< HEAD
          nombre: nombre.trim(),
          descripcion: descripcion?.trim() || null,
          color: color || '#0f2044',
          condominioId: condominioId || null,
        },
      })
    )
    return apiSuccess(categoria, 201)
=======
          nombre,
          descripcion: descripcion || null,
          color: color || '#0f2044',
        },
      })
    )

    return NextResponse.json(categoria, { status: 201 })
>>>>>>> 4585c06d3f055df9c7b5541ddeae5adb8114b7b5
  } catch (error) {
    return handlePrismaError(error)
  }
}

<<<<<<< HEAD
// PUT: actualizar categoría (admin only)
export async function PUT(req: NextRequest) {
  try {
    const session = await getCurrentSession()
    if (!session) return apiError('No autenticado', 401)
    if (session.user.rol !== 'admin') return apiError('Solo administradores', 403)

    const body = await req.json()
    const { id, nombre, descripcion, color } = body

    if (!id) return apiError('ID obligatorio')
    if (!nombre?.trim()) return apiError('El nombre es obligatorio')
=======
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
>>>>>>> 4585c06d3f055df9c7b5541ddeae5adb8114b7b5

    const categoria = await withRetry(() =>
      db.categoriaGasto.update({
        where: { id },
        data: {
<<<<<<< HEAD
          nombre: nombre.trim(),
          descripcion: descripcion?.trim() || null,
          color: color || '#0f2044',
        },
      })
    )
    return apiSuccess(categoria)
=======
          ...(nombre !== undefined ? { nombre } : {}),
          ...(descripcion !== undefined ? { descripcion } : {}),
          ...(color !== undefined ? { color } : {}),
          ...(activa !== undefined ? { activa } : {}),
        },
      })
    )

    return NextResponse.json(categoria)
>>>>>>> 4585c06d3f055df9c7b5541ddeae5adb8114b7b5
  } catch (error) {
    return handlePrismaError(error)
  }
}

<<<<<<< HEAD
// DELETE: desactivar categoría (admin only)
export async function DELETE(req: NextRequest) {
  try {
    const session = await getCurrentSession()
    if (!session) return apiError('No autenticado', 401)
    if (session.user.rol !== 'admin') return apiError('Solo administradores', 403)

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return apiError('ID obligatorio')

    const categoria = await withRetry(() =>
=======
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
>>>>>>> 4585c06d3f055df9c7b5541ddeae5adb8114b7b5
      db.categoriaGasto.update({
        where: { id },
        data: { activa: false },
      })
    )
<<<<<<< HEAD
    return apiSuccess(categoria)
=======

    return NextResponse.json({ ok: true })
>>>>>>> 4585c06d3f055df9c7b5541ddeae5adb8114b7b5
  } catch (error) {
    return handlePrismaError(error)
  }
}
