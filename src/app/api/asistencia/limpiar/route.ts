/**
 * API para limpiar TODOS los datos de asistencia (registros + inasistencias + justificaciones).
 * Útil antes de re-importar para evitar que datos viejos con fechas incorrectas se mezclen.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  if (session.user.rol !== 'admin' && session.user.rol !== 'supervisor') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const { soloFechasInvalidas } = body

    let deleted: {
      registros: number
      inasistencias: number
      justificaciones: number
      horarios?: number
    } = {
      registros: 0,
      inasistencias: 0,
      justificaciones: 0,
    }

    if (soloFechasInvalidas) {
      // Solo borrar registros con fechas anteriores al 2000 (ej: 1970)
      deleted.registros = await db.registroAsistenciaReloj.deleteMany({
        where: { fecha: { lt: '2000-01-01' } },
      }).then((r) => r.count).catch(() => 0)

      deleted.inasistencias = await db.inasistenciaAtraso.deleteMany({
        where: { fecha: { lt: '2000-01-01' } },
      }).then((r) => r.count).catch(() => 0)
    } else {
      // Borrar TODO PERO conservar horarios (ya están guardados)
      deleted.justificaciones = await db.justificacionAsistencia.deleteMany({})
        .then((r) => r.count).catch(() => 0)

      deleted.inasistencias = await db.inasistenciaAtraso.deleteMany({})
        .then((r) => r.count).catch(() => 0)

      deleted.registros = await db.registroAsistenciaReloj.deleteMany({})
        .then((r) => r.count).catch(() => 0)

      // NO borrar HorarioTrabajador — se conservan para no tener que reimportar la nomina
    }

    return NextResponse.json({
      success: true,
      message: soloFechasInvalidas
        ? `Fechas inválidas eliminadas: ${deleted.registros} registros, ${deleted.inasistencias} inasistencias`
        : `Datos limpiados completamente: ${deleted.registros} registros, ${deleted.inasistencias} inasistencias, ${deleted.justificaciones} justificaciones, ${deleted.horarios || 0} horarios`,
      deleted,
    })
  } catch (error) {
    console.error('Error limpiando:', error)
    return NextResponse.json({ error: 'Error al limpiar datos' }, { status: 500 })
  }
}
