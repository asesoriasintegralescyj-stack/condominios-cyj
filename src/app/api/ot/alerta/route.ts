/**
 * API: /api/ot/alerta
 *
 * POST — Genera el RESUMEN DIARIO de OT del supervisor SUP1.
 *        Envía siempre un correo (alerta si meta no cumplida, resumen si cumplida) a:
 *          To: operaciones.lagunanorte@gmail.com
 *          Cc: administracionlagunanorte@gmail.com
 *        From: asesoriasintegralescyj@gmail.com (SMTP_USER)
 *        Subject adaptativo:
 *          - Meta no cumplida (< 3 OT): "NO HAY REGISTRO DE TRABAJOS"
 *          - Meta cumplida (≥ 3 OT):    "RESUMEN DIARIO DE OT — DD-MM-YYYY (N OTs)"
 *
 * El cron de Vercel llama este endpoint al cierre del día (18:00 Santiago).
 *
 * Lógica:
 *   - Busca User con rol='supervisor' AND activo=true (SUP1)
 *   - Si no hay supervisor activo, retorna sin acción.
 *   - Carga TODAS las OT donde creadoPor = supervisor.id creadas hoy (Santiago)
 *   - Calcula conteo por estado (Pendiente, En Progreso, Completado, Cancelado)
 *   - Envía correo con resumen completo (lista de OT + tabla por estado)
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { enviarAlertaOtSupervisor } from '@/lib/email-ot-alerta'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const MIN_OT_DIARIA = 3
const SUPERVISOR_CODIGO = 'SUP1'
// Email específico del Supervisor Móvil SUP1 (no del Jefe de Operaciones).
// Las alertas de OT y el control diario de creación de OT corresponden
// al Supervisor Móvil. El Jefe de Operaciones (supervisor.test@cyj.cl)
// es responsable de las Listas de Verificación (LV) del PMI.
const SUPERVISOR_MOVIL_EMAIL = 'sup1@cyj.cl'

/**
 * Devuelve la fecha actual en zona America/Santiago (UTC-4 fijo).
 * Chile no usa DST desde 2015, por lo que UTC-4 es constante.
 */
function fechaSantiagoNow(): Date {
  const now = new Date()
  const tzOffset = -4 * 60 // minutos
  return new Date(now.getTime() + tzOffset * 60 * 1000)
}

function fechaSantiagoISO(d: Date): string {
  return fechaSantiagoNow().toISOString().slice(0, 10)
}

function horaSantiagoHHMM(d: Date): string {
  const santiago = fechaSantiagoNow()
  const hh = String(santiago.getUTCHours()).padStart(2, '0')
  const mm = String(santiago.getUTCMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

/**
 * Calcula el rango UTC correspondiente al día de hoy en Santiago.
 * Santiago = UTC-4. El día "hoy" en Santiago comienza a las 04:00 UTC
 * del mismo día calendario y termina a las 04:00 UTC del día siguiente.
 */
function rangoHoySantiagoUTC(): { inicio: Date; fin: Date; fechaISO: string } {
  const santiago = fechaSantiagoNow()
  const yyyy = santiago.getUTCFullYear()
  const mm = santiago.getUTCMonth()
  const dd = santiago.getUTCDate()
  // 00:00 Santiago = 04:00 UTC del mismo día
  const inicio = new Date(Date.UTC(yyyy, mm, dd, 4, 0, 0))
  const fin = new Date(Date.UTC(yyyy, mm, dd + 1, 4, 0, 0))
  const fechaISO = `${yyyy}-${String(mm + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
  return { inicio, fin, fechaISO }
}

export async function POST(request: NextRequest) {
  // Verificar acceso: usuario admin/supervisor autenticado, cron de Vercel,
  // o bearer token CRON_SECRET.
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
    const { inicio, fin, fechaISO } = rangoHoySantiagoUTC()
    const horaConsulta = horaSantiagoHHMM(new Date())

    // 1. Buscar Supervisor Móvil SUP1 por email específico
    const supervisor = await db.user.findUnique({
      where: { email: SUPERVISOR_MOVIL_EMAIL },
      select: { id: true, email: true, nombre: true, apellido: true, activo: true, rol: true },
    })

    if (supervisor && !supervisor.activo) {
      return NextResponse.json({
        fecha: fechaISO,
        horaConsulta,
        supervisorEncontrado: false,
        mensaje: `Usuario ${SUPERVISOR_MOVIL_EMAIL} está inactivo`,
      })
    }

    if (supervisor && supervisor.rol !== 'supervisor') {
      return NextResponse.json({
        fecha: fechaISO,
        horaConsulta,
        supervisorEncontrado: false,
        mensaje: `Usuario ${SUPERVISOR_MOVIL_EMAIL} tiene rol '${supervisor.rol}', no 'supervisor'`,
      })
    }

    if (!supervisor) {
      return NextResponse.json({
        fecha: fechaISO,
        horaConsulta,
        supervisorEncontrado: false,
        mensaje: `No se encontró usuario supervisor con email ${SUPERVISOR_MOVIL_EMAIL}`,
      })
    }

    const supervisorNombreCompleto = `${supervisor.nombre}${supervisor.apellido ? ' ' + supervisor.apellido : ''}`

    // 2. Cargar TODAS las OT creadas por el supervisor hoy (UTC range mapping a Santiago)
    const otHoy = await db.ordenTrabajo.findMany({
      where: {
        creadoPor: supervisor.id,
        createdAt: { gte: inicio, lt: fin },
      },
      select: {
        otNum: true,
        titulo: true,
        estado: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const otCreadasHoy = otHoy.length

    // 3. Calcular resumen por estado
    const normalizeEstado = (e: string) => (e || '').toLowerCase().trim()
    const resumenPorEstado = {
      pendiente: 0,
      enProgreso: 0,
      completado: 0,
      cancelado: 0,
    }
    for (const ot of otHoy) {
      const e = normalizeEstado(ot.estado)
      if (e.includes('complet')) resumenPorEstado.completado++
      else if (e.includes('progres')) resumenPorEstado.enProgreso++
      else if (e.includes('cancel')) resumenPorEstado.cancelado++
      else if (e.includes('pendient')) resumenPorEstado.pendiente++
      // Estados desconocidos no se cuentan en ninguna categoría
    }

    // 4. Enviar resumen diario (siempre envía — subject adaptativo en el helper)
    const result = await enviarAlertaOtSupervisor({
      fecha: fechaISO,
      supervisorNombre: supervisorNombreCompleto,
      supervisorEmail: supervisor.email,
      supervisorCodigo: SUPERVISOR_CODIGO,
      otCreadasHoy,
      otMeta: MIN_OT_DIARIA,
      otRecientes: otHoy.map((ot) => ({
        otNum: ot.otNum,
        titulo: ot.titulo,
        estado: ot.estado,
        createdAt: ot.createdAt.toISOString(),
      })),
      horaConsulta,
      resumenPorEstado,
    })

    return NextResponse.json({
      fecha: fechaISO,
      horaConsulta,
      supervisor: {
        codigo: SUPERVISOR_CODIGO,
        id: supervisor.id,
        nombre: supervisorNombreCompleto,
        email: supervisor.email,
      },
      otCreadasHoy,
      otMeta: MIN_OT_DIARIA,
      cumpleMeta: otCreadasHoy >= MIN_OT_DIARIA,
      resumenPorEstado,
      otDetalle: otHoy.map((ot) => ({
        otNum: ot.otNum,
        titulo: ot.titulo,
        estado: ot.estado,
        createdAt: ot.createdAt.toISOString(),
      })),
      enviado: result.enviado,
      messageId: result.messageId,
      error: result.error,
      motivoNoEnvio: result.motivoNoEnvio,
    })
  } catch (error) {
    console.error('Error en alerta OT:', error)
    return NextResponse.json(
      { error: 'Error procesando alerta OT', detalle: String(error) },
      { status: 500 },
    )
  }
}

// Vercel Cron por defecto hace GET — alias del POST para que el cron funcione
// sin configuración adicional.
export async function GET(request: NextRequest) {
  return POST(request)
}
