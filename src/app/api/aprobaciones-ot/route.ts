import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

// GET - Obtener OTs pendientes de aprobación
export async function GET(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'ots.ver')) {
    return apiError('Sin permisos', 403)
  }
  try {
    const searchParams = request.nextUrl.searchParams
    const estadoFiltro = searchParams.get('estado') || 'all' // Pendiente, Aprobada, Rechazada, all
    const search = searchParams.get('search') || ''
    
    const whereClause: any = {
      estado: 'Completado', // Solo OTs completadas
    }
    
    // Filtro por estado de aprobación
    if (estadoFiltro !== 'all') {
      whereClause.estadoAprobacion = estadoFiltro
    }
    
    // Búsqueda por texto
    if (search) {
      whereClause.OR = [
        { otNum: { contains: search } },
        { titulo: { contains: search } },
      ]
    }
    
    const ordenes = await db.ordenTrabajo.findMany({
      where: whereClause,
      include: {
        propiedad: true,
        asignado: true,
        centroCosto: true,
        materiales: true,
        herramientas: true,
        tareas: true,
        personalOT: true,
        historialAprobaciones: {
          orderBy: { createdAt: 'desc' }
        },
      },
      orderBy: { updatedAt: 'desc' }
    })
    
    // Calcular estadísticas
    const stats = await db.ordenTrabajo.groupBy({
      by: ['estadoAprobacion'],
      where: { estado: 'Completado' },
      _count: true
    })
    
    const estadisticas = {
      Pendiente: stats.find(s => s.estadoAprobacion === 'Pendiente')?._count || 0,
      Aprobada: stats.find(s => s.estadoAprobacion === 'Aprobada')?._count || 0,
      Rechazada: stats.find(s => s.estadoAprobacion === 'Rechazada')?._count || 0,
    }
    
    return NextResponse.json({
      ordenes,
      estadisticas
    })
  } catch (error) {
    console.error('Error fetching aprobaciones:', error)
    return NextResponse.json({ error: 'Error fetching aprobaciones' }, { status: 500 })
  }
}

// POST - Aprobar/Rechazar una OT
export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'ots.aprobar')) {
    return apiError('Sin permisos', 403)
  }
  try {
    const data = await request.json()
    const { otId, accion, observaciones } = data
    const aprobadoPor = session.userId
    const nombreAprobador = session.user.nombre + ' ' + session.user.apellido
    
    if (!otId || !accion) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 })
    }
    
    if (accion !== 'aprobar' && accion !== 'rechazar') {
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
    }
    
    // Obtener OT actual
    const otActual = await db.ordenTrabajo.findUnique({
      where: { id: otId }
    })
    
    if (!otActual) {
      return NextResponse.json({ error: 'Orden de trabajo no encontrada' }, { status: 404 })
    }
    
    if (otActual.estado !== 'Completado') {
      return NextResponse.json({ error: 'La OT debe estar completada para aprobarse' }, { status: 400 })
    }
    
    const nuevoEstado = accion === 'aprobar' ? 'Aprobada' : 'Rechazada'
    const fechaAccion = new Date().toISOString()
    
    // Actualizar OT y crear registro en historial en una transacción
    const ordenActualizada = await db.$transaction(async (tx) => {
      const updated = await tx.ordenTrabajo.update({
        where: { id: otId },
        data: {
          estadoAprobacion: nuevoEstado,
          fechaAprobacion: fechaAccion,
          aprobadoPor: aprobadoPor || null,
          observacionesAprob: observaciones || null,
        }
      })

      // Crear registro en historial
      await tx.historialAprobacionOT.create({
        data: {
          otId: otId,
          estadoAnterior: otActual.estadoAprobacion || 'Pendiente',
          estadoNuevo: nuevoEstado,
          observaciones: observaciones || null,
          aprobadoPor: aprobadoPor || null,
          nombreAprobador: nombreAprobador || null,
          fechaAccion: fechaAccion,
        }
      })

      return updated
    })
    
    return NextResponse.json({
      success: true,
      orden: ordenActualizada,
      mensaje: `OT ${accion === 'aprobar' ? 'aprobada' : 'rechazada'} correctamente`
    })
  } catch (error) {
    console.error('Error procesando aprobación:', error)
    return NextResponse.json({ error: 'Error procesando aprobación' }, { status: 500 })
  }
}
