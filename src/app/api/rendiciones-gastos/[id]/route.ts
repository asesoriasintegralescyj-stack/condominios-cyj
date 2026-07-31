import { NextRequest } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError, apiSuccess, handlePrismaError } from '@/lib/api-helpers'

// GET: obtener una rendición por ID
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession()
    if (!session) return apiError('No autenticado', 401)

    const { id } = await params

    const rendicion = await withRetry(() =>
      db.rendicionGasto.findUnique({
        where: { id },
        include: {
          responsable: { select: { id: true, nombre: true, cargo: true, email: true } },
          boletas: {
            include: {
              centroCosto: { select: { id: true, nombre: true, codigo: true } },
              categoria: { select: { id: true, nombre: true, color: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      })
    )

    if (!rendicion) return apiError('Rendición no encontrada', 404)
    return apiSuccess(rendicion)
  } catch (error) {
    return handlePrismaError(error)
  }
}

// PUT: actualizar rendición (solo Borrador/En Revisión)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession()
    if (!session) return apiError('No autenticado', 401)

    const { id } = await params
    const body = await req.json()
    const { periodo, concepto, descripcion, responsableId, responsableNombre, observaciones, boletas } = body

    const existing = await withRetry(() =>
      db.rendicionGasto.findUnique({ where: { id } })
    )
    if (!existing) return apiError('Rendición no encontrada', 404)
    if (existing.estado !== 'Borrador' && existing.estado !== 'En Revisión') {
      return apiError('Solo se pueden editar rendiciones en estado Borrador o En Revisión')
    }

    const montoTotal = (boletas || []).reduce((sum: number, b: any) => sum + (Number(b.monto) || 0), 0)

    // Obtener monto asignado del responsable
    let montoAsignado = 0
    if (responsableId) {
      const asignacion = await withRetry(() =>
        db.montoAsignadoPersonal.findFirst({
          where: { personalId: responsableId, estado: 'Activo' },
        })
      )
      montoAsignado = asignacion?.monto || 0
    }

    const updated = await withRetry(() =>
      db.$transaction(async (tx) => {
        // Eliminar boletas existentes
        await tx.boletaRendicion.deleteMany({ where: { rendicionId: id } })

        // Actualizar rendición y crear nuevas boletas
        return tx.rendicionGasto.update({
          where: { id },
          data: {
            periodo: periodo?.trim() || existing.periodo,
            concepto: concepto?.trim() || existing.concepto,
            descripcion: descripcion?.trim() || null,
            montoTotal,
            montoAsignado,
            responsableId: responsableId || null,
            responsableNombre: responsableNombre || null,
            observaciones: observaciones?.trim() || null,
            boletas: {
              create: (boletas || []).map((b: any) => ({
                descripcion: b.descripcion?.trim() || '',
                monto: Number(b.monto) || 0,
                fecha: b.fecha || null,
                nDocumento: b.nDocumento?.trim() || null,
                proveedor: b.proveedor?.trim() || null,
                notas: b.notas?.trim() || null,
                comprobante: b.comprobante || null,
                documento: b.documento || null,
                centroCostoId: b.centroCostoId || null,
                categoriaId: b.categoriaId || null,
              })),
            },
          },
          include: {
            boletas: {
              include: {
                centroCosto: { select: { id: true, nombre: true, codigo: true } },
                categoria: { select: { id: true, nombre: true, color: true } },
              },
            },
          },
        })
      })
    )

    return apiSuccess(updated)
  } catch (error) {
    return handlePrismaError(error)
  }
}

// DELETE: eliminar rendición (solo Borrador, admin/supervisor)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession()
    if (!session) return apiError('No autenticado', 401)
    if (session.user.rol !== 'admin' && session.user.rol !== 'supervisor') {
      return apiError('Solo administradores o supervisores', 403)
    }

    const { id } = await params

    const existing = await withRetry(() =>
      db.rendicionGasto.findUnique({ where: { id } })
    )
    if (!existing) return apiError('Rendición no encontrada', 404)
    if (existing.estado !== 'Borrador') {
      return apiError('Solo se pueden eliminar rendiciones en estado Borrador')
    }

    await withRetry(() =>
      db.rendicionGasto.delete({ where: { id } })
    )

    return apiSuccess({ deleted: true })
  } catch (error) {
    return handlePrismaError(error)
  }
}
