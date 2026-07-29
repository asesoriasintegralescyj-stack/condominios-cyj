import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { apiSuccess, apiError, handlePrismaError } from '@/lib/api-helpers'

// ============================================================
// GET /api/rendicion-gastos/[id] — Obtener una rendición
// ============================================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return apiError('No autenticado', 401)

    const { id } = await params

    const rendicion = await db.rendicionGasto.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, nombre: true, apellido: true, email: true, rol: true } },
        centroCosto: { select: { id: true, codigo: true, nombre: true } },
        items: { orderBy: { fechaGasto: 'asc' } },
      },
    })

    if (!rendicion) return apiError('Rendición no encontrada', 404)

    // Solo admin/supervisor o el dueño puede ver
    if (user.rol !== 'admin' && user.rol !== 'supervisor' && rendicion.userId !== user.id) {
      return apiError('Sin permisos', 403)
    }

    // Recalcular monto total desde items
    const montoTotal = rendicion.items.reduce((sum, item) => sum + item.montoRendir, 0)

    return apiSuccess({ ...rendicion, montoTotal })
  } catch (error) {
    return handlePrismaError(error)
  }
}

// ============================================================
// PUT /api/rendicion-gastos/[id] — Actualizar rendición
// ============================================================
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return apiError('No autenticado', 401)

    const { id } = await params
    const body = await request.json()
    const { titulo, descripcion, estado, items, notaRevision, centroCostoId } = body

    const existente = await db.rendicionGasto.findUnique({
      where: { id },
      include: { items: true },
    })

    if (!existente) return apiError('Rendición no encontrada', 404)

    // Solo admin/supervisor puede cambiar estado, o el dueño puede editar borrador/rechazado
    const isOwner = existente.userId === user.id
    const canEdit = isOwner && (existente.estado === 'BORRADOR' || existente.estado === 'RECHAZADO' || existente.estado === 'MODIFICACION')
    const canReview = user.rol === 'admin' || user.rol === 'supervisor'

    if (estado && !canReview) {
      return apiError('Solo un administrador o supervisor puede cambiar el estado', 403)
    }

    if (!estado && !canEdit) {
      return apiError('No puede editar esta rendición en su estado actual', 403)
    }

    // --- ACCIÓN DE REVISIÓN (admin/supervisor) ---
    if (estado && canReview) {
      if (!['APROBADO', 'RECHAZADO', 'MODIFICACION'].includes(estado)) {
        return apiError('Estado de revisión no válido')
      }

      const updateData: any = {
        estado,
        revisadoPor: user.id,
        revisadoAt: new Date(),
        notaRevision: notaRevision || null,
      }

      // Si se rechaza o solicita modificación, permitir que el dueño edite
      const rendicionActualizada = await db.rendicionGasto.update({
        where: { id },
        data: updateData,
        include: {
          user: { select: { id: true, nombre: true, apellido: true } },
          centroCosto: { select: { id: true, codigo: true, nombre: true } },
          items: true,
        },
      })

      // Notificar al dueño
      const estadoLabel = estado === 'APROBADO' ? 'aprobada' : estado === 'RECHAZADO' ? 'rechazada' : 'solicitó modificaciones a la'
      const notifTipo = estado === 'APROBADO' ? 'SUCCESS' : 'WARNING'
      await db.notificacion.create({
        data: {
          titulo: `Rendición ${estadoLabel}`,
          mensaje: `Se ha ${estadoLabel} la rendición ${existente.numeroRendicion}${notaRevision ? ': ' + notaRevision : ''}`,
          tipo: notifTipo,
          categoria: 'rendicion',
          leido: false,
        },
      })

      return apiSuccess(rendicionActualizada)
    }

    // --- EDICIÓN DEL DUEÑO ---
    const updateData: any = {}
    if (titulo !== undefined) updateData.titulo = titulo.trim()
    if (descripcion !== undefined) updateData.descripcion = descripcion?.trim() || null
    if (centroCostoId !== undefined) updateData.centroCostoId = centroCostoId || null

    // Si se envía para revisión
    if (body.enviar) {
      updateData.estado = 'ENVIADO'
      updateData.enviadoAt = new Date()
    }

    // Actualizar items si se proporcionan
    if (items && Array.isArray(items)) {
      // Eliminar items existentes y recrear
      await db.itemRendicion.deleteMany({ where: { rendicionId: id } })
      
      const montoTotal = items.reduce((sum: number, item: any) => sum + (item.montoRendir || 0), 0)
      updateData.montoTotal = montoTotal

      updateData.items = {
        create: items.map((item: any) => ({
          descripcion: item.descripcion?.trim() || (item._keep ? existente.items.find((e: any) => e.id === item.id)?.descripcion : ''),
          numeroBoleta: item.numeroBoleta?.trim() || (item._keep ? existente.items.find((e: any) => e.id === item.id)?.numeroBoleta : ''),
          montoRendir: item.montoRendir ?? (item._keep ? existente.items.find((e: any) => e.id === item.id)?.montoRendir : 0),
          categoria: item.categoria || (item._keep ? existente.items.find((e: any) => e.id === item.id)?.categoria : ''),
          fechaGasto: item.fechaGasto ? new Date(item.fechaGasto) : (item._keep ? existente.items.find((e: any) => e.id === item.id)?.fechaGasto : new Date()),
          fotoBoletaUrl: item.fotoBoletaUrl !== undefined ? item.fotoBoletaUrl : (item._keep ? existente.items.find((e: any) => e.id === item.id)?.fotoBoletaUrl : null),
          fotoCompraUrl: item.fotoCompraUrl !== undefined ? item.fotoCompraUrl : (item._keep ? existente.items.find((e: any) => e.id === item.id)?.fotoCompraUrl : null),
        })),
      }
    }

    const rendicionActualizada = await db.rendicionGasto.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, nombre: true, apellido: true } },
        centroCosto: { select: { id: true, codigo: true, nombre: true } },
        items: { orderBy: { fechaGasto: 'asc' } },
      },
    })

    // Notificar si se envió para revisión
    if (body.enviar) {
      await db.notificacion.create({
        data: {
          titulo: 'Nueva Rendición por Revisar',
          mensaje: `${user.nombre} ${user.apellido || ''} envió la rendición ${existente.numeroRendicion} por $${new Intl.NumberFormat('es-CL').format(Math.round(rendicionActualizada.montoTotal))}`,
          tipo: 'INFO',
          categoria: 'rendicion',
          leido: false,
        },
      })
    }

    return apiSuccess(rendicionActualizada)
  } catch (error) {
    return handlePrismaError(error)
  }
}

// ============================================================
// DELETE /api/rendicion-gastos/[id] — Eliminar rendición (solo borrador)
// ============================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return apiError('No autenticado', 401)

    const { id } = await params

    const existente = await db.rendicionGasto.findUnique({ where: { id } })
    if (!existente) return apiError('Rendición no encontrada', 404)

    // Solo el dueño puede eliminar, y solo si es borrador
    if (existente.userId !== user.id) {
      return apiError('Solo el creador puede eliminar', 403)
    }
    if (existente.estado !== 'BORRADOR') {
      return apiError('Solo se pueden eliminar rendiciones en borrador', 400)
    }

    await db.rendicionGasto.delete({ where: { id } })

    return apiSuccess({ eliminado: true })
  } catch (error) {
    return handlePrismaError(error)
  }
}
