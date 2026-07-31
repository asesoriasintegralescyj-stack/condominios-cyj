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
// Flujo de dos etapas:
//   1. Jefe de Operaciones (rol=supervisor, Luis García): aprueba/rechaza la terminación
//      Acciones: 'aprobar_supervisor' | 'rechazar_supervisor'
//      → etapaAprobacionSupervisor = 'Aprobada' | 'Rechazada'
//   2. Administrador (rol=admin): da aprobación final → genera SC automática
//      Acciones: 'aprobar_admin' | 'rechazar_admin'
//      → estadoAprobacion = 'Aprobada' | 'Rechazada'
// Compatibilidad: 'aprobar' / 'rechazar' se tratan como acciones admin (etapa final)
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
    const nombreAprobador = `${session.user.nombre} ${session.user.apellido || ''}`.trim()

    if (!otId || !accion) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 })
    }

    // Normalizar acción
    // 'aprobar' / 'rechazar' → compatibilidad hacia atrás, se mapean a *_admin
    const accionNormalizada =
      accion === 'aprobar' ? 'aprobar_admin'
      : accion === 'rechazar' ? 'rechazar_admin'
      : accion

    const accionesValidas = ['aprobar_supervisor', 'rechazar_supervisor', 'aprobar_admin', 'rechazar_admin']
    if (!accionesValidas.includes(accionNormalizada)) {
      return NextResponse.json({ error: 'Acción inválida. Debe ser: aprobar_supervisor, rechazar_supervisor, aprobar_admin o rechazar_admin' }, { status: 400 })
    }

    // Validación por rol
    const isAdmin = session.user.rol === 'admin'
    const isSupervisor = session.user.rol === 'supervisor'
    if (accionNormalizada.endsWith('_supervisor') && !isSupervisor) {
      return apiError('Solo el Jefe de Operaciones (Supervisor) puede realizar esta acción. El Administrador interviene en la segunda etapa.', 403)
    }
    if (accionNormalizada.endsWith('_admin') && !isAdmin) {
      return apiError('Solo el Administrador puede realizar esta acción.', 403)
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

    // Validar secuencia del flujo
    const etapaSupervisorActual = otActual.etapaAprobacionSupervisor || 'Pendiente'
    const etapaAdminActual = otActual.estadoAprobacion || 'Pendiente'

    if (accionNormalizada.endsWith('_supervisor') && etapaSupervisorActual !== 'Pendiente') {
      return NextResponse.json({
        error: `La OT ya fue procesada por el Jefe de Operaciones (etapa actual: ${etapaSupervisorActual})`,
      }, { status: 400 })
    }
    if (accionNormalizada.endsWith('_admin')) {
      if (etapaSupervisorActual !== 'Aprobada') {
        return NextResponse.json({
          error: `El Administrador solo puede aprobar OTs que ya fueron aprobadas por el Jefe de Operaciones. Etapa supervisor actual: ${etapaSupervisorActual}`,
        }, { status: 400 })
      }
      if (etapaAdminActual !== 'Pendiente') {
        return NextResponse.json({
          error: `La OT ya fue procesada por el Administrador (etapa actual: ${etapaAdminActual})`,
        }, { status: 400 })
      }
    }

    const fechaAccion = new Date().toISOString()
    const isAprobar = accionNormalizada.startsWith('aprobar')
    const isRechazar = accionNormalizada.startsWith('rechazar')

    // Datos a actualizar según la acción
    const updateData: any = {}
    const etapaNuevaHistorial = accionNormalizada.endsWith('_supervisor')
      ? (isAprobar ? 'Aprobada Supervisor' : 'Rechazada Supervisor')
      : (isAprobar ? 'Aprobada Admin' : 'Rechazada Admin')

    if (accionNormalizada === 'aprobar_supervisor') {
      updateData.etapaAprobacionSupervisor = 'Aprobada'
      updateData.supervisorAprobadorId = aprobadoPor || null
      updateData.supervisorAprobadorNombre = nombreAprobador
      updateData.supervisorFechaAprobacion = fechaAccion
      updateData.supervisorObservaciones = observaciones || null
    } else if (accionNormalizada === 'rechazar_supervisor') {
      updateData.etapaAprobacionSupervisor = 'Rechazada'
      updateData.supervisorAprobadorId = aprobadoPor || null
      updateData.supervisorAprobadorNombre = nombreAprobador
      updateData.supervisorFechaAprobacion = fechaAccion
      updateData.supervisorObservaciones = observaciones || null
      // Rechazo supervisor → estado final también rechazado
      updateData.estadoAprobacion = 'Rechazada'
      updateData.fechaAprobacion = fechaAccion
      updateData.aprobadoPor = aprobadoPor || null
      updateData.observacionesAprob = observaciones || null
    } else if (accionNormalizada === 'aprobar_admin') {
      updateData.estadoAprobacion = 'Aprobada'
      updateData.fechaAprobacion = fechaAccion
      updateData.aprobadoPor = aprobadoPor || null
      updateData.observacionesAprob = observaciones || null
    } else if (accionNormalizada === 'rechazar_admin') {
      updateData.estadoAprobacion = 'Rechazada'
      updateData.fechaAprobacion = fechaAccion
      updateData.aprobadoPor = aprobadoPor || null
      updateData.observacionesAprob = observaciones || null
    }

    // Actualizar OT y crear registro en historial en una transacción
    const ordenActualizada = await db.$transaction(async (tx) => {
      const updated = await tx.ordenTrabajo.update({
        where: { id: otId },
        data: updateData
      })

      // Crear registro en historial
      await tx.historialAprobacionOT.create({
        data: {
          otId: otId,
          estadoAnterior: `${etapaSupervisorActual}/${etapaAdminActual}`,
          estadoNuevo: etapaNuevaHistorial,
          observaciones: observaciones || null,
          aprobadoPor: aprobadoPor || null,
          nombreAprobador: nombreAprobador || null,
          fechaAccion: fechaAccion,
        }
      })

      // Notificaciones al creador de la OT (Alfredo)
      try {
        if (otActual.creadoPor) {
          const mensajes: Record<string, { titulo: string; mensaje: string; tipo: string }> = {
            aprobar_supervisor: {
              titulo: 'OT aprobada por Jefe de Operaciones',
              mensaje: `Tu OT ${otActual.otNum} - "${otActual.titulo}" fue aprobada por Luis García (Jefe de Operaciones). Pasa a revisión final del Administrador.`,
              tipo: 'Info',
            },
            rechazar_supervisor: {
              titulo: 'OT rechazada por Jefe de Operaciones',
              mensaje: `Tu OT ${otActual.otNum} - "${otActual.titulo}" fue rechazada por Luis García.${observaciones ? ` Motivo: ${observaciones}` : ''}`,
              tipo: 'Alerta',
            },
            aprobar_admin: {
              titulo: 'OT aprobada por Administrador',
              mensaje: `Tu OT ${otActual.otNum} - "${otActual.titulo}" fue aprobada finalmente por el Administrador. Se generarán las Solicitudes de Compra asociadas.`,
              tipo: 'Info',
            },
            rechazar_admin: {
              titulo: 'OT rechazada por Administrador',
              mensaje: `Tu OT ${otActual.otNum} - "${otActual.titulo}" fue rechazada por el Administrador.${observaciones ? ` Motivo: ${observaciones}` : ''}`,
              tipo: 'Alerta',
            },
          }
          const notif = mensajes[accionNormalizada]
          await tx.notificacion.create({
            data: {
              titulo: notif.titulo,
              mensaje: notif.mensaje,
              tipo: notif.tipo,
              categoria: 'Operaciones',
              destino: 'Usuario específico',
              destinoId: otActual.creadoPor,
              leido: false,
            },
          })
        }
      } catch (e) {
        console.error('Error creando notificación al creador OT:', e)
      }

      // Si aprueba supervisor → notificar a admins
      if (accionNormalizada === 'aprobar_supervisor') {
        try {
          const admins = await tx.user.findMany({
            where: { rol: 'admin', activo: true },
            select: { id: true },
          })
          if (admins.length > 0) {
            await tx.notificacion.createMany({
              data: admins.map((a) => ({
                titulo: 'OT lista para aprobación final',
                mensaje: `La OT ${otActual.otNum} - "${otActual.titulo}" fue aprobada por Luis García. Requiere aprobación final del Administrador.`,
                tipo: 'Alerta',
                categoria: 'Operaciones',
                destino: 'Usuario específico',
                destinoId: a.id,
                leido: false,
              })),
            })
          }
        } catch (e) {
          console.error('Error creando notificaciones a admins:', e)
        }
      }

      return updated
    })

    return NextResponse.json({
      success: true,
      orden: ordenActualizada,
      mensaje: `OT ${etapaNuevaHistorial} correctamente`
    })
  } catch (error) {
    console.error('Error procesando aprobación:', error)
    return NextResponse.json({ error: 'Error procesando aprobación' }, { status: 500 })
  }
}
