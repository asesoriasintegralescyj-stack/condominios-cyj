/**
 * API para que el supervisor justifique atrasos/ausencias.
 * POST { inasistenciaId, tipoJustificacion, observaciones, documento? }
 *
 * Crea una JustificacionAsistencia y cambia el estado de la inasistencia a "justificado".
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, logAction } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Solo supervisor (y admin) pueden justificar
  if (session.user.rol !== 'supervisor' && session.user.rol !== 'admin') {
    return NextResponse.json({ error: 'Solo el supervisor puede justificar' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { inasistenciaId, tipoJustificacion, observaciones, documento, documentoNombre } = body

    if (!inasistenciaId || !tipoJustificacion) {
      return NextResponse.json(
        { error: 'Faltan datos: inasistenciaId y tipoJustificacion son obligatorios' },
        { status: 400 },
      )
    }

    const tiposValidos = ['Permiso', 'Enfermedad', 'Personal', 'Fuerza Mayor', 'Otro']
    if (!tiposValidos.includes(tipoJustificacion)) {
      return NextResponse.json(
        { error: 'Tipo de justificación inválido' },
        { status: 400 },
      )
    }

    const inasistencia = await db.inasistenciaAtraso.findUnique({
      where: { id: inasistenciaId },
    })

    if (!inasistencia) {
      return NextResponse.json({ error: 'Inasistencia no encontrada' }, { status: 404 })
    }

    if (inasistencia.estado !== 'pendiente' && inasistencia.estado !== 'rechazado') {
      return NextResponse.json(
        { error: `La inasistencia ya está ${inasistencia.estado}` },
        { status: 400 },
      )
    }

    const aprobadorNombre = `${session.user.nombre} ${session.user.apellido || ''}`.trim()

    // Crear o actualizar justificación
    const justificacion = await db.justificacionAsistencia.upsert({
      where: { inasistenciaId },
      update: {
        supervisorId: session.userId,
        supervisorNombre: aprobadorNombre,
        fechaJustificacion: new Date(),
        tipoJustificacion,
        observaciones: observaciones || null,
        documento: documento || null,
        documentoNombre: documentoNombre || null,
        estado: 'pendiente_revision',
      },
      create: {
        inasistenciaId,
        supervisorId: session.userId,
        supervisorNombre: aprobadorNombre,
        fechaJustificacion: new Date(),
        tipoJustificacion,
        observaciones: observaciones || null,
        documento: documento || null,
        documentoNombre: documentoNombre || null,
        estado: 'pendiente_revision',
      },
    })

    // Actualizar estado de la inasistencia
    await db.inasistenciaAtraso.update({
      where: { id: inasistenciaId },
      data: { estado: 'justificado' },
    })

    // Auditoría
    await logAction(
      session.userId,
      'asistencia_justificar',
      'InasistenciaAtraso',
      inasistenciaId,
      { estado: inasistencia.estado },
      { estado: 'justificado', tipoJustificacion, observaciones },
    )

    // Notificar al admin
    try {
      const admins = await db.user.findMany({
        where: { rol: 'admin', activo: true },
        select: { id: true },
      })
      if (admins.length > 0) {
        await db.notificacion.createMany({
          data: admins.map((a) => ({
            titulo: 'Justificación de asistencia pendiente de revisión',
            mensaje: `El supervisor ${aprobadorNombre} justificó una ${inasistencia.tipo} de ${inasistencia.nombreTrabajador} el ${inasistencia.fecha}. Tipo: ${tipoJustificacion}. Requiere tu aprobación.`,
            tipo: 'Alerta',
            categoria: 'General',
            destino: 'Usuario específico',
            destinoId: a.id,
            leido: false,
          })),
        })
      }
    } catch (e) {
      console.error('Error notificando a admins:', e)
    }

    return NextResponse.json({
      success: true,
      justificacion,
      message: 'Justificación enviada a revisión del administrador',
    })
  } catch (error) {
    console.error('Error justificando:', error)
    return NextResponse.json({ error: 'Error al justificar' }, { status: 500 })
  }
}
