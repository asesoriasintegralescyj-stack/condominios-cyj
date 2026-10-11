import { NextRequest } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 30

// GET - Obtener tarea por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  try {
    const { id } = await params

    const tarea = await withRetry(() =>
      db.tareaPlanificacion.findUnique({
        where: { id },
      })
    )

    if (!tarea) {
      return apiError('Tarea no encontrada', 404)
    }

    return apiSuccess(tarea)
  } catch (error) {
    console.error('Error al obtener tarea de planificación:', error)
    return apiError('Error al obtener tarea', 500)
  }
}

// PUT - Actualizar tarea
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  try {
    const { id } = await params
    const data = await request.json()

    if (!data.titulo || typeof data.titulo !== 'string' || data.titulo.trim().length === 0) {
      return apiError('El título es obligatorio', 400)
    }

    const tarea = await withRetry(() =>
      db.tareaPlanificacion.findUnique({
        where: { id },
      })
    )

    if (!tarea) {
      return apiError('Tarea no encontrada', 404)
    }

    const updateData: Record<string, unknown> = {
      titulo: data.titulo.trim(),
      descripcion: data.descripcion !== undefined ? data.descripcion : tarea.descripcion,
      estado: data.estado !== undefined ? data.estado : tarea.estado,
      prioridad: data.prioridad !== undefined ? data.prioridad : tarea.prioridad,
      fechaInicio: data.fechaInicio !== undefined ? (data.fechaInicio ? new Date(data.fechaInicio) : null) : tarea.fechaInicio,
      fechaFin: data.fechaFin !== undefined ? (data.fechaFin ? new Date(data.fechaFin) : null) : tarea.fechaFin,
      horaInicio: data.horaInicio !== undefined ? data.horaInicio : tarea.horaInicio,
      horaFin: data.horaFin !== undefined ? data.horaFin : tarea.horaFin,
      diaCompleto: data.diaCompleto !== undefined ? data.diaCompleto === true : tarea.diaCompleto,
      asignadoA: data.asignadoA !== undefined ? data.asignadoA : tarea.asignadoA,
      asignadoEmail: data.asignadoEmail !== undefined ? data.asignadoEmail : tarea.asignadoEmail,
      categoria: data.categoria !== undefined ? data.categoria : tarea.categoria,
      ubicacion: data.ubicacion !== undefined ? data.ubicacion : tarea.ubicacion,
      condominioId: data.condominioId !== undefined ? data.condominioId : tarea.condominioId,
      recordatorio: data.recordatorio !== undefined ? data.recordatorio : tarea.recordatorio,
      recurrente: data.recurrente !== undefined ? data.recurrente === true : tarea.recurrente,
      notas: data.notas !== undefined ? data.notas : tarea.notas,
      etiquetas: data.etiquetas !== undefined ? data.etiquetas : tarea.etiquetas,
      googleEventId: data.googleEventId !== undefined ? data.googleEventId : tarea.googleEventId,
      googleTaskId: data.googleTaskId !== undefined ? data.googleTaskId : tarea.googleTaskId,
      sincronizado: data.sincronizado !== undefined ? data.sincronizado === true : tarea.sincronizado,
    }

    // Si el estado cambia a completada, registrar la fecha de completado
    const nuevoEstado = data.estado !== undefined ? data.estado : tarea.estado
    if (nuevoEstado === 'completada' && tarea.estado !== 'completada') {
      updateData.completadoEn = new Date()
    } else if (nuevoEstado !== 'completada') {
      updateData.completadoEn = null
    }

    const tareaActualizada = await withRetry(() =>
      db.tareaPlanificacion.update({
        where: { id },
        data: updateData,
      })
    )

    return apiSuccess(tareaActualizada)
  } catch (error) {
    console.error('Error al actualizar tarea de planificación:', error)
    return apiError('Error al actualizar tarea', 500)
  }
}

// DELETE - Eliminar tarea
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  try {
    const { id } = await params

    const tarea = await withRetry(() =>
      db.tareaPlanificacion.findUnique({
        where: { id },
      })
    )

    if (!tarea) {
      return apiError('Tarea no encontrada', 404)
    }

    await withRetry(() =>
      db.tareaPlanificacion.delete({
        where: { id },
      })
    )

    return apiSuccess({ deleted: true })
  } catch (error) {
    console.error('Error al eliminar tarea de planificación:', error)
    return apiError('Error al eliminar tarea', 500)
  }
}
