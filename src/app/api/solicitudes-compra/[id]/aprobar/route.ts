/**
 * API para aprobar/rechazar Solicitudes de Compra.
 *
 * Flujo:
 *   1. Cualquier rol (excepto guardia y auditor) puede CREAR una solicitud.
 *      → etapaAprobacion = "Pendiente Supervisor"
 *   2. Supervisor (con permiso 'solicitudescompra.aprobar_supervisor') aprueba/rechaza.
 *      → etapaAprobacion = "Aprobada Supervisor" | "Rechazada Supervisor"
 *   3. Admin (con permiso 'solicitudescompra.aprobar_admin') aprueba/rechaza.
 *      → etapaAprobacion = "Aprobada Admin" | "Rechazada Admin"
 *      Al aprobar admin, estado pasa a "En Proceso" para gestión de compra.
 *
 * Body:
 *   { accion: 'aprobar_supervisor' | 'rechazar_supervisor' | 'aprobar_admin' | 'rechazar_admin',
 *     observaciones?: string }
 *
 * Crea notificación al solicitante y a los roles siguientes del flujo.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, hasPermission, logAction } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const ETAPAS = {
  aprobar_supervisor: 'Aprobada Supervisor',
  rechazar_supervisor: 'Rechazada Supervisor',
  devolver_supervisor: 'Pendiente Supervisor',
  aprobar_admin: 'Aprobada Admin',
  rechazar_admin: 'Rechazada Admin',
  devolver_admin: 'Pendiente Supervisor',
} as const

const PERMISOS_POR_ACCION = {
  aprobar_supervisor: 'solicitudescompra.aprobar_supervisor',
  rechazar_supervisor: 'solicitudescompra.aprobar_supervisor',
  devolver_supervisor: 'solicitudescompra.aprobar_supervisor',
  aprobar_admin: 'solicitudescompra.aprobar_admin',
  rechazar_admin: 'solicitudescompra.aprobar_admin',
  devolver_admin: 'solicitudescompra.aprobar_admin',
} as const

type Accion = keyof typeof ETAPAS

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  const { id } = await params
  const body = await request.json()
  const { accion, observaciones } = body as { accion: Accion; observaciones?: string }

  if (!accion || !ETAPAS[accion]) {
    return apiError('Acción inválida. Debe ser: aprobar_supervisor, rechazar_supervisor, devolver_supervisor, aprobar_admin, rechazar_admin o devolver_admin', 400)
  }

  // El admin SOLO interviene en la 2da etapa (aprobar_admin / rechazar_admin).
  // El supervisor (rol explícito, NO admin) aprueba/rechaza en la 1ra etapa.
  // Esto evita que el admin "salte" la etapa del supervisor.
  const isAdmin = session.user.rol === 'admin'
  const isSupervisor = session.user.rol === 'supervisor'
  const permisoRequerido = PERMISOS_POR_ACCION[accion]

  // Validación por rol:
  // - acciones *_supervisor → solo rol supervisor (explícito)
  // - acciones *_admin → solo rol admin
  if (accion.endsWith('_supervisor') && !isSupervisor) {
    return apiError('Solo el Supervisor puede realizar esta acción. El Administrador interviene en la segunda etapa del flujo.', 403)
  }
  if (accion.endsWith('_admin') && !isAdmin) {
    return apiError('Solo el Administrador puede realizar esta acción.', 403)
  }
  // Doble validación por permiso (por si el rol tiene permisos personalizados)
  if (!hasPermission(session.user.rol, permisoRequerido, session.userPermisos)) {
    return apiError(`No tiene permisos para realizar esta acción (${accion})`, 403)
  }

  try {
    const solicitud = await db.solicitudCompra.findUnique({ where: { id } })
    if (!solicitud) {
      return apiError('Solicitud no encontrada', 404)
    }

    // Validar secuencia del flujo
    const etapaActual = solicitud.etapaAprobacion
    const isDevolver = accion.startsWith('devolver_')
    if (isDevolver) {
      // La devolución requiere observaciones obligatorias
      if (!observaciones || !observaciones.trim()) {
        return apiError('Para devolver una solicitud debe indicar las correcciones necesarias', 400)
      }
      // Supervisor puede devolver desde Pendiente Supervisor (re-abrir para edición)
      if (accion === 'devolver_supervisor' && etapaActual !== 'Pendiente Supervisor') {
        return apiError(`Solo se puede devolver una solicitud en etapa Pendiente Supervisor (etapa actual: ${etapaActual})`, 400)
      }
      // Admin puede devolver desde Aprobada Supervisor
      if (accion === 'devolver_admin' && etapaActual !== 'Aprobada Supervisor') {
        return apiError(`Solo se puede devolver una solicitud en etapa Aprobada Supervisor (etapa actual: ${etapaActual})`, 400)
      }
    } else if ((accion === 'aprobar_supervisor' || accion === 'rechazar_supervisor') && etapaActual !== 'Pendiente Supervisor') {
      return apiError(`La solicitud no está pendiente de aprobación del supervisor (etapa actual: ${etapaActual})`, 400)
    }
    if ((accion === 'aprobar_admin' || accion === 'rechazar_admin') && etapaActual !== 'Aprobada Supervisor') {
      return apiError(`La solicitud no está pendiente de aprobación del admin (etapa actual: ${etapaActual})`, 400)
    }

    const etapaNueva = ETAPAS[accion]
    const now = new Date()
    const aprobadorNombre = `${session.user.nombre} ${session.user.apellido || ''}`.trim()

    // Datos a actualizar
    const updateData: any = {
      etapaAprobacion: etapaNueva,
      updatedAt: now,
    }

    if (accion === 'aprobar_supervisor') {
      updateData.supervisorAprobadorId = session.userId
      updateData.supervisorAprobadorNombre = aprobadorNombre
      updateData.supervisorFechaAprobacion = now
      updateData.supervisorObservaciones = observaciones || null
    } else if (accion === 'rechazar_supervisor') {
      updateData.supervisorAprobadorId = session.userId
      updateData.supervisorAprobadorNombre = aprobadorNombre
      updateData.supervisorFechaAprobacion = now
      updateData.supervisorObservaciones = observaciones || null
      updateData.estado = 'Rechazada'
    } else if (accion === 'aprobar_admin') {
      updateData.adminAprobadorId = session.userId
      updateData.adminAprobadorNombre = aprobadorNombre
      updateData.adminFechaAprobacion = now
      updateData.adminObservaciones = observaciones || null
      updateData.estado = 'En Proceso' // Lista para gestionar compra
    } else if (accion === 'rechazar_admin') {
      updateData.adminAprobadorId = session.userId
      updateData.adminAprobadorNombre = aprobadorNombre
      updateData.adminFechaAprobacion = now
      updateData.adminObservaciones = observaciones || null
      updateData.estado = 'Rechazada'
    } else if (accion === 'devolver_supervisor') {
      // Devolver: la solicitud vuelve a Pendiente Supervisor con observaciones
      // para que el solicitante corrija y reenvíe
      updateData.estado = 'Solicitado'
    } else if (accion === 'devolver_admin') {
      // Devolver desde admin: vuelve a Pendiente Supervisor
      updateData.estado = 'Solicitado'
    }

    // Transacción: actualizar SC + crear historial + crear notificaciones
    const updated = await db.$transaction(async (tx) => {
      const s = await tx.solicitudCompra.update({
        where: { id },
        data: updateData,
      })

      // Historial
      await tx.historialAprobacionSC.create({
        data: {
          solicitudId: id,
          etapaAnterior: etapaActual,
          etapaNueva,
          accion,
          observaciones: observaciones || null,
          aprobadorId: session.userId,
          aprobadorNombre,
        },
      })

      // Notificación al solicitante
      if (solicitud.solicitadoPorId) {
        const mensajes: Record<Accion, { titulo: string; mensaje: string; tipo: string }> = {
          aprobar_supervisor: {
            titulo: 'Solicitud aprobada por Supervisor',
            mensaje: `Tu solicitud ${solicitud.codigo} - "${solicitud.titulo}" fue aprobada por el supervisor ${aprobadorNombre} y pasa a gestión del administrador.`,
            tipo: 'Info',
          },
          rechazar_supervisor: {
            titulo: 'Solicitud rechazada por Supervisor',
            mensaje: `Tu solicitud ${solicitud.codigo} - "${solicitud.titulo}" fue rechazada por el supervisor ${aprobadorNombre}.${observaciones ? ` Motivo: ${observaciones}` : ''}`,
            tipo: 'Alerta',
          },
          aprobar_admin: {
            titulo: 'Solicitud aprobada por Administrador',
            mensaje: `Tu solicitud ${solicitud.codigo} - "${solicitud.titulo}" fue aprobada por el administrador ${aprobadorNombre} y está en proceso de compra.`,
            tipo: 'Info',
          },
          rechazar_admin: {
            titulo: 'Solicitud rechazada por Administrador',
            mensaje: `Tu solicitud ${solicitud.codigo} - "${solicitud.titulo}" fue rechazada por el administrador ${aprobadorNombre}.${observaciones ? ` Motivo: ${observaciones}` : ''}`,
            tipo: 'Alerta',
          },
          devolver_supervisor: {
            titulo: 'Solicitud devuelta por Supervisor',
            mensaje: `Tu solicitud ${solicitud.codigo} - "${solicitud.titulo}" fue devuelta para correcciones por el supervisor ${aprobadorNombre}.${observaciones ? ` Correcciones: ${observaciones}` : ''}`,
            tipo: 'Alerta',
          },
          devolver_admin: {
            titulo: 'Solicitud devuelta por Administrador',
            mensaje: `Tu solicitud ${solicitud.codigo} - "${solicitud.titulo}" fue devuelta para correcciones por el administrador ${aprobadorNombre}.${observaciones ? ` Correcciones: ${observaciones}` : ''}`,
            tipo: 'Alerta',
          },
        }
        const notif = mensajes[accion]
        try {
          await tx.notificacion.create({
            data: {
              titulo: notif.titulo,
              mensaje: notif.mensaje,
              tipo: notif.tipo,
              categoria: 'Compras',
              destino: 'Usuario específico',
              destinoId: solicitud.solicitadoPorId,
              leido: false,
            },
          })
        } catch (e) {
          console.error('Error creando notificación al solicitante:', e)
        }
      }

      // Si aprueba supervisor → notificar a admins para que gestionen
      if (accion === 'aprobar_supervisor') {
        try {
          const admins = await tx.user.findMany({
            where: { rol: 'admin', activo: true },
            select: { id: true },
          })
          if (admins.length > 0) {
            await tx.notificacion.createMany({
              data: admins.map((a) => ({
                titulo: 'Nueva solicitud de compra aprobada por supervisor',
                mensaje: `La solicitud ${solicitud.codigo} - "${solicitud.titulo}" fue aprobada por ${aprobadorNombre}. Requiere tu gestión para proceder con la compra.`,
                tipo: 'Alerta',
                categoria: 'Compras',
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

      // Si aprueba admin → notificar a supervisor y al solicitante
      if (accion === 'aprobar_admin') {
        try {
          const supervisores = await tx.user.findMany({
            where: { rol: 'supervisor', activo: true },
            select: { id: true },
          })
          if (supervisores.length > 0) {
            await tx.notificacion.createMany({
              data: supervisores.map((s) => ({
                titulo: 'Solicitud de compra aprobada por administrador',
                mensaje: `La solicitud ${solicitud.codigo} - "${solicitud.titulo}" fue aprobada por ${aprobadorNombre} y está en proceso de compra.`,
                tipo: 'Info',
                categoria: 'Compras',
                destino: 'Usuario específico',
                destinoId: s.id,
                leido: false,
              })),
            })
          }
        } catch (e) {
          console.error('Error creando notificaciones a supervisores:', e)
        }
      }

      return s
    })

    // Log de auditoría
    await logAction(
      session.userId,
      `sc_${accion}`,
      'SolicitudCompra',
      id,
      { etapaAnterior: etapaActual, estado: solicitud.estado },
      { etapaNueva, estado: updateData.estado, observaciones },
    )

    return NextResponse.json({
      success: true,
      solicitud: updated,
      etapaNueva,
      message: `Solicitud ${accion.includes('aprobar') ? 'aprobada' : accion.includes('rechazar') ? 'rechazada' : 'devuelta para correcciones'} correctamente`,
    })
  } catch (error) {
    console.error('Error procesando aprobación SC:', error)
    return NextResponse.json({ error: 'Error procesando aprobación' }, { status: 500 })
  }
}
