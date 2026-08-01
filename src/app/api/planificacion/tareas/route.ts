import { NextRequest } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 30

// GET - Listar tareas con filtros y paginación
export async function GET(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  try {
    const searchParams = request.nextUrl.searchParams
    const estado = searchParams.get('estado') || undefined
    const prioridad = searchParams.get('prioridad') || undefined
    const categoria = searchParams.get('categoria') || undefined
    const asignadoA = searchParams.get('asignadoA') || undefined
    const fechaDesde = searchParams.get('fechaDesde') || undefined
    const fechaHasta = searchParams.get('fechaHasta') || undefined
    const search = searchParams.get('search') || undefined
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: Record<string, unknown> = {}

    if (estado) where.estado = estado
    if (prioridad) where.prioridad = prioridad
    if (categoria) where.categoria = categoria
    if (asignadoA) where.asignadoA = asignadoA

    if (fechaDesde || fechaHasta) {
      const fechaFilter: Record<string, unknown> = {}
      if (fechaDesde) fechaFilter.gte = new Date(fechaDesde)
      if (fechaHasta) fechaFilter.lte = new Date(fechaHasta)
      where.fechaInicio = fechaFilter
    }

    if (search) {
      where.OR = [
        { titulo: { contains: search } },
        { descripcion: { contains: search } },
        { asignadoA: { contains: search } },
        { ubicacion: { contains: search } },
        { categoria: { contains: search } },
        { etiquetas: { contains: search } },
      ]
    }

    const [tareas, total] = await Promise.all([
      withRetry(() =>
        db.tareaPlanificacion.findMany({
          where: Object.keys(where).length > 0 ? where : undefined,
          orderBy: [{ prioridad: 'desc' }, { fechaInicio: 'asc' }, { creadoEn: 'desc' }],
          take: limit,
          skip: offset,
        })
      ),
      withRetry(() =>
        db.tareaPlanificacion.count({
          where: Object.keys(where).length > 0 ? where : undefined,
        })
      ),
    ])

    return apiSuccess({ tareas, total, limit, offset })
  } catch (error) {
    console.error('Error al listar tareas de planificación:', error)
    return apiError('Error al listar tareas', 500)
  }
}

// POST - Crear nueva tarea
export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  try {
    const data = await request.json()

    if (!data.titulo || typeof data.titulo !== 'string' || data.titulo.trim().length === 0) {
      return apiError('El título es obligatorio', 400)
    }

    const tarea = await withRetry(() =>
      db.tareaPlanificacion.create({
        data: {
          titulo: data.titulo.trim(),
          descripcion: data.descripcion || null,
          estado: data.estado || 'pendiente',
          prioridad: data.prioridad || 'media',
          fechaInicio: data.fechaInicio ? new Date(data.fechaInicio) : new Date(),
          fechaFin: data.fechaFin ? new Date(data.fechaFin) : null,
          horaInicio: data.horaInicio || null,
          horaFin: data.horaFin || null,
          diaCompleto: data.diaCompleto === true,
          asignadoA: data.asignadoA || null,
          asignadoEmail: data.asignadoEmail || null,
          categoria: data.categoria || null,
          ubicacion: data.ubicacion || null,
          condominioId: data.condominioId || null,
          creadoById: session.userId,
          recordatorio: data.recordatorio || null,
          recurrente: data.recurrente === true,
          notas: data.notas || null,
          etiquetas: data.etiquetas || null,
          completadoEn: data.estado === 'completada' ? new Date() : null,
        },
      })
    )

    return apiSuccess(tarea, 201)
  } catch (error) {
    console.error('Error al crear tarea de planificación:', error)
    return apiError('Error al crear tarea', 500)
  }
}
