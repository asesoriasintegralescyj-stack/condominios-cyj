/**
 * API para que el admin apruebe/rechace justificaciones de asistencia.
 * POST { accion: 'aprobar' | 'rechazar', adminObservaciones? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, logAction } from '@/lib/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Solo admin puede aprobar/rechazar
  if (session.user.rol !== 'admin') {
    return NextResponse.json({ error: 'Solo el administrador puede aprobar/rechazar' }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { accion, adminObservaciones } = body

    if (accion !== 'aprobar' && accion !== 'rechazar') {
      return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
    }

    if (accion === 'rechazar' && !adminObservaciones?.trim()) {
      return NextResponse.json(
        { error: 'Debe ingresar el motivo del rechazo' },
        { status: 400 },
      )
    }

    const justificacion = await db.justificacionAsistencia.findUnique({
      where: { id },
      include: { inasistencia: true },
    })

    if (!justificacion) {
      return NextResponse.json({ error: 'Justificación no encontrada' }, { status: 404 })
    }

    const nuevoEstado = accion === 'aprobar' ? 'aprobado' : 'rechazado'
    const aprobadorNombre = `${session.user.nombre} ${session.user.apellido || ''}`.trim()
    const now = new Date()

    await db.$transaction(async (tx) => {
      await tx.justificacionAsistencia.update({
        where: { id },
        data: {
          estado: nuevoEstado,
          adminId: session.userId,
          adminNombre: aprobadorNombre,
          fechaRevision: now,
          adminObservaciones: adminObservaciones || null,
        },
      })

      await tx.inasistenciaAtraso.update({
        where: { id: justificacion.inasistenciaId },
        data: { estado: nuevoEstado },
      })
    })

    await logAction(
      session.userId,
      `asistencia_${accion}`,
      'JustificacionAsistencia',
      id,
      { estado: justificacion.estado },
      { estado: nuevoEstado, adminObservaciones },
    )

    if (justificacion.supervisorId) {
      try {
        await db.notificacion.create({
          data: {
            titulo: `Justificación ${accion === 'aprobar' ? 'aprobada' : 'rechazada'} por administrador`,
            mensaje: `El administrador ${aprobadorNombre} ${accion === 'aprobar' ? 'aprobó' : 'rechazó'} la justificación de ${justificacion.inasistencia.nombreTrabajador} del ${justificacion.inasistencia.fecha}.${adminObservaciones ? ` Observaciones: ${adminObservaciones}` : ''}`,
            tipo: accion === 'aprobar' ? 'Info' : 'Alerta',
            categoria: 'General',
            destino: 'Usuario específico',
            destinoId: justificacion.supervisorId,
            leido: false,
          },
        })
      } catch (e) {
        console.error('Error notificando:', e)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Justificación ${accion === 'aprobar' ? 'aprobada' : 'rechazada'} correctamente`,
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Error al procesar' }, { status: 500 })
  }
}
