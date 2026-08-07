import { NextRequest } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError, apiSuccess, handlePrismaError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// GET: listar montos asignados
export async function GET() {
  try {
    const session = await getCurrentSession()
    if (!session) return apiError('No autenticado', 401)

    const montos = await withRetry(() =>
      db.montoAsignadoPersonal.findMany({
        where: { estado: 'Activo' },
        include: { personal: { select: { id: true, nombre: true, cargo: true } } },
        orderBy: { createdAt: 'desc' },
      })
    )
    return apiSuccess(montos)
  } catch (error) {
    return handlePrismaError(error)
  }
}

// POST: crear o actualizar monto asignado (upsert)
export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession()
    if (!session) return apiError('No autenticado', 401)
    if (session.user.rol !== 'admin' && session.user.rol !== 'supervisor') {
      return apiError('Solo administradores o supervisores', 403)
    }

    const body = await req.json()
    const { personalId, monto, periodo, notas } = body

    if (!personalId) return apiError('personalId es obligatorio')
    if (typeof monto !== 'number' || monto < 0) return apiError('Monto inválido')

    // Upsert: buscar si ya existe un monto activo para ese personal
    const existing = await withRetry(() =>
      db.montoAsignadoPersonal.findFirst({
        where: { personalId, estado: 'Activo' },
      })
    )

    if (existing) {
      const updated = await withRetry(() =>
        db.montoAsignadoPersonal.update({
          where: { id: existing.id },
          data: { monto, periodo: periodo || 'Mensual', notas: notas?.trim() || null },
        })
      )
      return apiSuccess(updated)
    }

    const created = await withRetry(() =>
      db.montoAsignadoPersonal.create({
        data: {
          personalId,
          monto,
          periodo: periodo || 'Mensual',
          notas: notas?.trim() || null,
        },
      })
    )
    return apiSuccess(created, 201)
  } catch (error) {
    return handlePrismaError(error)
  }
}
