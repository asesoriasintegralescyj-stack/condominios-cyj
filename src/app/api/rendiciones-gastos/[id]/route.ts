<<<<<<< HEAD
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

=======
/**
 * API Rendición de Gastos por ID - GET/PUT/DELETE
 */
import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError, handlePrismaError } from '@/lib/api-helpers'

// GET - Obtener rendición por ID con boletas
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  try {
>>>>>>> 4585c06d3f055df9c7b5541ddeae5adb8114b7b5
    const { id } = await params

    const rendicion = await withRetry(() =>
      db.rendicionGasto.findUnique({
        where: { id },
        include: {
<<<<<<< HEAD
          responsable: { select: { id: true, nombre: true, cargo: true, email: true } },
          boletas: {
            include: {
              centroCosto: { select: { id: true, nombre: true, codigo: true } },
=======
          responsable: { select: { id: true, nombre: true, cargo: true } },
          boletas: {
            include: {
              centroCosto: { select: { id: true, codigo: true, nombre: true } },
>>>>>>> 4585c06d3f055df9c7b5541ddeae5adb8114b7b5
              categoria: { select: { id: true, nombre: true, color: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      })
    )

<<<<<<< HEAD
    if (!rendicion) return apiError('Rendición no encontrada', 404)
    return apiSuccess(rendicion)
=======
    if (!rendicion) {
      return apiError('Rendición no encontrada', 404)
    }

    return NextResponse.json(rendicion)
>>>>>>> 4585c06d3f055df9c7b5541ddeae5adb8114b7b5
  } catch (error) {
    return handlePrismaError(error)
  }
}

<<<<<<< HEAD
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

=======
// PUT - Actualizar rendición
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  try {
    const { id } = await params
    const body = await request.json()
    const {
      periodo,
      concepto,
      descripcion,
      estado,
      responsableId,
      responsableNombre,
      montoAsignado,
      observaciones,
      motivoRechazo,
      boletas,
    } = body

    // Verificar que la rendición existe
>>>>>>> 4585c06d3f055df9c7b5541ddeae5adb8114b7b5
    const existing = await withRetry(() =>
      db.rendicionGasto.findUnique({ where: { id } })
    )
    if (!existing) return apiError('Rendición no encontrada', 404)
<<<<<<< HEAD
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
=======

    // Solo se puede editar si está en Borrador o En Revisión
    if (existing.estado === 'Aprobada' || existing.estado === 'Anulada') {
      return apiError('No se puede editar una rendición aprobada o anulada', 400)
    }

    // Recalcular monto total si se envían boletas
    let montoTotal = existing.montoTotal
    if (boletas && Array.isArray(boletas)) {
      montoTotal = boletas.reduce((sum: number, b: any) => sum + (b.monto || 0), 0)
    }

    // Verificar monto asignado
    if (montoAsignado && montoAsignado > 0 && montoTotal > montoAsignado) {
      return apiError(
        `El monto total ($${Math.round(montoTotal)}) excede el monto asignado ($${Math.round(montoAsignado)})`,
        400
      )
    }

    // Si se envían boletas, hacer upsert completo
    if (boletas && Array.isArray(boletas)) {
      // Eliminar boletas existentes y crear nuevas
      await withRetry(() =>
        db.$transaction(async (tx) => {
          // Eliminar boletas actuales
          await tx.boletaRendicion.deleteMany({ where: { rendicionId: id } })

          // Crear nuevas boletas
          await tx.boletaRendicion.createMany({
            data: boletas.map((b: any) => ({
              id: b.id || undefined, // No usar ID existente, crear nuevas
              rendicionId: id,
              descripcion: b.descripcion || '',
              monto: b.monto || 0,
              fecha: b.fecha || null,
              nDocumento: b.nDocumento || null,
              proveedor: b.proveedor || null,
              notas: b.notas || null,
              comprobante: b.comprobante || null,
              documento: b.documento || null,
              centroCostoId: b.centroCostoId || null,
              categoriaId: b.categoriaId || null,
            })),
          })

          // Actualizar cabecera
          await tx.rendicionGasto.update({
            where: { id },
            data: {
              periodo: periodo || existing.periodo,
              concepto: concepto || existing.concepto,
              descripcion: descripcion !== undefined ? descripcion : existing.descripcion,
              estado: estado || existing.estado,
              montoTotal,
              montoAsignado: montoAsignado !== undefined ? montoAsignado : existing.montoAsignado,
              responsableId: responsableId || null,
              responsableNombre: responsableNombre || null,
              observaciones: observaciones !== undefined ? observaciones : existing.observaciones,
              motivoRechazo: motivoRechazo !== undefined ? motivoRechazo : existing.motivoRechazo,
            },
          })
        })
      )
    } else {
      // Solo actualizar campos de la cabecera
      await withRetry(() =>
        db.rendicionGasto.update({
          where: { id },
          data: {
            ...(periodo ? { periodo } : {}),
            ...(concepto ? { concepto } : {}),
            ...(descripcion !== undefined ? { descripcion } : {}),
            ...(estado ? { estado } : {}),
            ...(montoAsignado !== undefined ? { montoAsignado } : {}),
            ...(responsableId !== undefined ? { responsableId } : {}),
            ...(responsableNombre !== undefined ? { responsableNombre } : {}),
            ...(observaciones !== undefined ? { observaciones } : {}),
            ...(motivoRechazo !== undefined ? { motivoRechazo } : {}),
            ...(boletas !== undefined ? { montoTotal } : {}),
          },
        })
      )
    }

    // Retornar la rendición actualizada
    const updated = await withRetry(() =>
      db.rendicionGasto.findUnique({
        where: { id },
        include: {
          responsable: { select: { id: true, nombre: true, cargo: true } },
          boletas: {
            include: {
              centroCosto: { select: { id: true, codigo: true, nombre: true } },
              categoria: { select: { id: true, nombre: true, color: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      })
    )

    return NextResponse.json(updated)
>>>>>>> 4585c06d3f055df9c7b5541ddeae5adb8114b7b5
  } catch (error) {
    return handlePrismaError(error)
  }
}

<<<<<<< HEAD
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

=======
// DELETE - Eliminar rendición (solo Borrador)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  if (session.user.rol !== 'admin' && session.user.rol !== 'supervisor') {
    return apiError('Sin permisos para eliminar rendiciones', 403)
  }

  try {
>>>>>>> 4585c06d3f055df9c7b5541ddeae5adb8114b7b5
    const { id } = await params

    const existing = await withRetry(() =>
      db.rendicionGasto.findUnique({ where: { id } })
    )
    if (!existing) return apiError('Rendición no encontrada', 404)
<<<<<<< HEAD
    if (existing.estado !== 'Borrador') {
      return apiError('Solo se pueden eliminar rendiciones en estado Borrador')
=======

    if (existing.estado !== 'Borrador') {
      return apiError('Solo se pueden eliminar rendiciones en estado Borrador', 400)
>>>>>>> 4585c06d3f055df9c7b5541ddeae5adb8114b7b5
    }

    await withRetry(() =>
      db.rendicionGasto.delete({ where: { id } })
    )

<<<<<<< HEAD
    return apiSuccess({ deleted: true })
=======
    return NextResponse.json({ ok: true })
>>>>>>> 4585c06d3f055df9c7b5541ddeae5adb8114b7b5
  } catch (error) {
    return handlePrismaError(error)
  }
}
