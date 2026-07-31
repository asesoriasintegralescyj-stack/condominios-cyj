/**
 * API: /api/pmi/cumplimiento/alerta
 *
 * POST — Envía una alerta por correo al supervisor con las LVs faltantes
 *        para una fecha dada (por defecto HOY en America/Santiago).
 *
 * Body opcional: { fecha?: "YYYY-MM-DD" }
 *
 * Solo admin/supervisor pueden disparar el envío manual.
 * El cron de Vercel también llama este endpoint con un header CRON_SECRET.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { leCorrespondeALaFecha } from '@/lib/pmi/lv-data'
import { enviarAlertaPmiCumplimiento, type LvFaltante } from '@/lib/email-pmi-cumplimiento'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function fechaSantiagoISO(d: Date): string {
  const tzOffset = -4 * 60
  const local = new Date(d.getTime() + tzOffset * 60 * 1000)
  return local.toISOString().slice(0, 10)
}

export async function POST(request: NextRequest) {
  // Verificar acceso: usuario autenticado admin/supervisor O cron de Vercel
  // Vercel envía automáticamente Authorization: Bearer <CRON_SECRET> cuando
  // la variable CRON_SECRET está configurada en el proyecto.
  const authHeader = request.headers.get('authorization') || ''
  const xCronSecret = request.headers.get('x-cron-secret') || ''
  const cronSecret = process.env.CRON_SECRET
  const isCron = cronSecret && (
    authHeader === `Bearer ${cronSecret}` ||
    xCronSecret === cronSecret
  )

  // Para llamadas GET de Vercel Cron (que no envían body), aceptar también
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
    let body: any = {}
    try {
      body = await request.json()
    } catch {
      // body vacío (cron)
    }

    const fechaParam = typeof body.fecha === 'string' ? body.fecha : ''
    let fechaISO: string
    let fechaDate: Date
    if (fechaParam && /^\d{4}-\d{2}-\d{2}$/.test(fechaParam)) {
      fechaISO = fechaParam
      const [a, m, d] = fechaParam.split('-').map(Number)
      fechaDate = new Date(Date.UTC(a, m - 1, d, 12, 0, 0))
    } else {
      fechaISO = fechaSantiagoISO(new Date())
      const [a, m, d] = fechaISO.split('-').map(Number)
      fechaDate = new Date(Date.UTC(a, m - 1, d, 12, 0, 0))
    }

    // 1. Cargar LVs activas y filtrar por fecha
    const lvs = await db.listaVerificacion.findMany({
      where: { activa: true },
      orderBy: [{ codigo: 'asc' }],
    })
    const lvsProgramadas = lvs.filter(lv =>
      leCorrespondeALaFecha(lv.frecuencia, fechaDate),
    )

    // 2. Cargar registros existentes para esa fecha
    const registros = await db.registroLV.findMany({
      where: { fecha: fechaISO },
      select: { lvId: true, estado: true, createdAt: true },
    })
    const lvIdsConRegistro = new Set(
      registros
        .filter(r => r.estado !== 'Pendiente')
        .map(r => r.lvId),
    )

    // 3. Calcular faltantes
    const faltantes: LvFaltante[] = lvsProgramadas
      .filter(lv => !lvIdsConRegistro.has(lv.id))
      .map(lv => ({
        codigo: lv.codigo,
        nombre: lv.nombre,
        sector: lv.sector,
        frecuencia: lv.frecuencia,
        responsable: lv.responsable,
      }))

    const totalProgramadas = lvsProgramadas.length
    const totalCompletadas = totalProgramadas - faltantes.length
    const totalFaltantes = faltantes.length
    const porcentaje =
      totalProgramadas === 0
        ? 100
        : Math.round((totalCompletadas / totalProgramadas) * 100)

    // 4. Enviar correo
    const result = await enviarAlertaPmiCumplimiento({
      fecha: fechaISO,
      totalProgramadas,
      totalCompletadas,
      totalFaltantes,
      porcentaje,
      lvsFaltantes: faltantes,
    })

    return NextResponse.json({
      fecha: fechaISO,
      totalProgramadas,
      totalCompletadas,
      totalFaltantes,
      porcentaje,
      enviado: result.enviado,
      messageId: result.messageId,
      error: result.error,
    })
  } catch (error) {
    console.error('Error enviando alerta PMI:', error)
    return NextResponse.json(
      { error: 'Error enviando alerta', detalle: String(error) },
      { status: 500 },
    )
  }
}

// Vercel Cron por defecto hace GET — alias del POST para que el cron funcione
// sin configuración adicional.
export async function GET(request: NextRequest) {
  return POST(request)
}
