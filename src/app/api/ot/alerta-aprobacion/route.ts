/**
 * API: /api/ot/alerta-aprobacion
 *
 * POST — Genera un correo con las OT pendientes de aprobación.
 *        El correo se envía SIEMPRE que haya al menos 1 OT pendiente:
 *          - Esperando aprobación del Jefe de Operaciones (Luis García) — etapaSupervisor='Pendiente'
 *          - Esperando aprobación final del Admin — etapaSupervisor='Aprobada' AND estadoAprobacion='Pendiente'
 *
 *        To: operaciones.lagunanorte@gmail.com
 *        Cc: administracionlagunanorte@gmail.com
 *        From: asesoriasintegralescyj@gmail.com (SMTP_USER)
 *        Subject: ⚠ OT PENDIENTE DE APROBACIÓN — DD-MM-YYYY (N OTs)
 *
 * El cron de Vercel llama este endpoint diariamente. Si no hay OT pendientes,
 * no se envía correo (motivoNoEnvio explicará).
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import {
  enviarAlertaOtPendientesAprobacion,
  type OtPendienteAprobacion,
} from '@/lib/email-ot-aprobacion'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function fechaSantiagoNow(): Date {
  const now = new Date()
  const tzOffset = -4 * 60
  return new Date(now.getTime() + tzOffset * 60 * 1000)
}

function fechaSantiagoISO(): string {
  return fechaSantiagoNow().toISOString().slice(0, 10)
}

function horaSantiagoHHMM(): string {
  const santiago = fechaSantiagoNow()
  const hh = String(santiago.getUTCHours()).padStart(2, '0')
  const mm = String(santiago.getUTCMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function diasPendiente(fechaISO: string | null): number {
  if (!fechaISO) return 0
  try {
    const fecha = new Date(fechaISO)
    const ahora = new Date()
    const diffMs = ahora.getTime() - fecha.getTime()
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
  } catch {
    return 0
  }
}

export async function POST(request: NextRequest) {
  // Verificar acceso: admin/supervisor autenticado, cron de Vercel, o CRON_SECRET
  const authHeader = request.headers.get('authorization') || ''
  const xCronSecret = request.headers.get('x-cron-secret') || ''
  const cronSecret = process.env.CRON_SECRET
  const isCron = cronSecret && (
    authHeader === `Bearer ${cronSecret}` ||
    xCronSecret === cronSecret
  )
  const isVercelCron = request.headers.get('x-vercel-cron') === '1'

  if (!isCron && !isVercelCron) {
    const session = await getCurrentSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    if (session.user.rol !== 'admin' && session.user.rol !== 'supervisor') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }
  }

  try {
    const fechaISO = fechaSantiagoISO()
    const horaConsulta = horaSantiagoHHMM()

    // Cargar OTs en estado 'Completado' que NO están completamente aprobadas
    // Pendientes de:
    //   - Jefe de Operaciones: etapaAprobacionSupervisor = 'Pendiente' (null inclusive)
    //   - Admin: etapaAprobacionSupervisor = 'Aprobada' AND estadoAprobacion = 'Pendiente'
    const ots = await db.ordenTrabajo.findMany({
      where: {
        estado: 'Completado',
        OR: [
          // Esperando aprobación de Luis (Jefe de Operaciones)
          {
            OR: [
              { etapaAprobacionSupervisor: null },
              { etapaAprobacionSupervisor: 'Pendiente' },
            ],
          },
          // Esperando aprobación final del Admin
          {
            etapaAprobacionSupervisor: 'Aprobada',
            OR: [
              { estadoAprobacion: null },
              { estadoAprobacion: 'Pendiente' },
            ],
          },
        ],
      },
      select: {
        id: true,
        otNum: true,
        titulo: true,
        tipo: true,
        prioridad: true,
        ubicacion: true,
        estadoAprobacion: true,
        etapaAprobacionSupervisor: true,
        fechaFinReal: true,
        fechaSolicitudAprob: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    })

    const otsPendientes: OtPendienteAprobacion[] = ots.map((ot) => {
      const etapaSup = ot.etapaAprobacionSupervisor || 'Pendiente'
      const etapaAdm = ot.estadoAprobacion || 'Pendiente'
      // Para el conteo: si etapaSup === 'Aprobada' y etapaAdm === 'Pendiente' → espera admin
      //                  si etapaSup === 'Pendiente' → espera supervisor
      // fechaFinReal y fechaSolicitudAprob son String (ISO); updatedAt es Date
      const fechaCompletadoRaw =
        ot.fechaFinReal || ot.fechaSolicitudAprob || ot.updatedAt.toISOString()
      return {
        otNum: ot.otNum,
        titulo: ot.titulo,
        tipo: ot.tipo,
        prioridad: ot.prioridad,
        ubicacion: ot.ubicacion,
        estadoAprobacion: etapaAdm,
        etapaAprobacionSupervisor: etapaSup,
        fechaCompletado: fechaCompletadoRaw,
        fechaSolicitudAprob: ot.fechaSolicitudAprob,
        completadoPorNombre: null,
        diasPendiente: diasPendiente(ot.fechaSolicitudAprob || ot.fechaFinReal || null),
      }
    })

    const pendientesSupervisor = otsPendientes.filter(
      (o) => o.etapaAprobacionSupervisor === 'Pendiente',
    ).length
    const pendientesAdmin = otsPendientes.filter(
      (o) =>
        o.etapaAprobacionSupervisor === 'Aprobada' &&
        o.estadoAprobacion === 'Pendiente',
    ).length

    const result = await enviarAlertaOtPendientesAprobacion({
      fecha: fechaISO,
      horaConsulta,
      totalPendientes: otsPendientes.length,
      pendientesSupervisor,
      pendientesAdmin,
      otsPendientes,
    })

    return NextResponse.json({
      fecha: fechaISO,
      horaConsulta,
      totalPendientes: otsPendientes.length,
      pendientesSupervisor,
      pendientesAdmin,
      otsDetalle: otsPendientes,
      enviado: result.enviado,
      messageId: result.messageId,
      error: result.error,
      motivoNoEnvio: result.motivoNoEnvio,
    })
  } catch (error) {
    console.error('Error en alerta OT aprobación:', error)
    return NextResponse.json(
      { error: 'Error procesando alerta OT aprobación', detalle: String(error) },
      { status: 500 },
    )
  }
}

// Vercel Cron por defecto hace GET — alias del POST
export async function GET(request: NextRequest) {
  return POST(request)
}
