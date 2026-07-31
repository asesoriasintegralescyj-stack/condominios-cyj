import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { apiSuccess, apiError, handlePrismaError } from '@/lib/api-helpers'

// ============================================================
// GET /api/rendicion-gastos/categorias — Listar categorías
// ============================================================
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return apiError('No autenticado', 401)

    const categorias = await db.categoriaGasto.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
    })

    return apiSuccess(categorias)
  } catch (error) {
    return handlePrismaError(error)
  }
}

// ============================================================
// POST /api/rendicion-gastos/categorias — Crear categoría (admin)
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return apiError('No autenticado', 401)
    if (user.rol !== 'admin' && user.rol !== 'supervisor') {
      return apiError('Sin permisos', 403)
    }

    const body = await request.json()
    const { nombre, icon } = body

    if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
      return apiError('El nombre es obligatorio')
    }

    const categoria = await db.categoriaGasto.create({
      data: {
        nombre: nombre.trim(),
        icon: icon || '📦',
      },
    })

    return apiSuccess(categoria, 201)
  } catch (error) {
    return handlePrismaError(error)
  }
}
