import { NextRequest } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError, apiSuccess, handlePrismaError } from '@/lib/api-helpers'

// GET: listar categorías activas
export async function GET() {
  try {
    const session = await getCurrentSession()
    if (!session) return apiError('No autenticado', 401)

    const categorias = await withRetry(() =>
      db.categoriaGasto.findMany({
        where: { activa: true },
        orderBy: { nombre: 'asc' },
      })
    )
    return apiSuccess(categorias)
  } catch (error) {
    return handlePrismaError(error)
  }
}

// POST: crear categoría (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession()
    if (!session) return apiError('No autenticado', 401)
    if (session.user.rol !== 'admin') return apiError('Solo administradores', 403)

    const body = await req.json()
    const { nombre, descripcion, color, condominioId } = body

    if (!nombre?.trim()) return apiError('El nombre es obligatorio')

    const categoria = await withRetry(() =>
      db.categoriaGasto.create({
        data: {
          nombre: nombre.trim(),
          descripcion: descripcion?.trim() || null,
          color: color || '#0f2044',
          condominioId: condominioId || null,
        },
      })
    )
    return apiSuccess(categoria, 201)
  } catch (error) {
    return handlePrismaError(error)
  }
}

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

    const categoria = await withRetry(() =>
      db.categoriaGasto.update({
        where: { id },
        data: {
          nombre: nombre.trim(),
          descripcion: descripcion?.trim() || null,
          color: color || '#0f2044',
        },
      })
    )
    return apiSuccess(categoria)
  } catch (error) {
    return handlePrismaError(error)
  }
}

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
      db.categoriaGasto.update({
        where: { id },
        data: { activa: false },
      })
    )
    return apiSuccess(categoria)
  } catch (error) {
    return handlePrismaError(error)
  }
}
