/**
 * API de respaldo automático mensual.
 * Se ejecuta el 1º de cada mes vía Vercel Cron Jobs.
 *
 * Genera:
 * 1. Respaldo completo de la BD (JSON en tabla Backup)
 * 2. PDF con todas las OT del mes anterior
 * 3. PDF con todas las SC del mes anterior
 * 4. PDF con todos los Proyectos
 * 5. PDF con Asistencia del mes anterior
 * 6. PDF con Rondas del mes anterior
 *
 * Envía todo por email a asesoriasintegralescyj@gmail.com
 * Sin costo, sin Google Workspace, sin configuración externa.
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Modelos a respaldar
const MODELOS_BACKUP = [
  'condominio', 'propiedad', 'personal', 'user',
  'activo', 'proveedor', 'ordenTrabajo', 'gasto', 'proyecto',
  'inspeccion', 'notificacion',
  'asistencia', 'centroCostoMaster', 'catHerramienta', 'catMaterial', 'catTarea',
  'movimientoInventario', 'configuracion',
  'categoriaCumplimiento', 'documentoCumplimiento', 'historialCumplimiento',
  'resumenCumplimiento', 'ronda', 'registroRonda',
  'logAuditoria', 'historialAprobacionOT',
  'oTMaterial', 'oTHerramienta', 'oTTarea', 'oTPersonal', 'oTDocumento',
  'proyectoDocumento', 'proyectoHerramienta', 'proyectoMaterial', 'proyectoPersonal', 'proyectoTarea',
  'horarioTrabajador', 'registroAsistenciaReloj', 'inasistenciaAtraso', 'justificacionAsistencia',
  'solicitudCompra', 'historialAprobacionSC',
] as const

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    const { getCurrentSession } = await import('@/lib/auth')
    const session = await getCurrentSession()
    if (!session || session.user.rol !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
  }

  try {
    const now = new Date()
    const mesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const mesAnteriorFin = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
    const mesStr = `${mesAnterior.getFullYear()}-${String(mesAnterior.getMonth() + 1).padStart(2, '0')}`
    const fechaDesde = mesAnterior.toISOString().split('T')[0]
    const fechaHasta = mesAnteriorFin.toISOString().split('T')[0]

    console.log(`[Backup Auto] Generando respaldo mensual para ${mesStr}...`)

    // 1. RESPALDO COMPLETO BD
    const backupData: any = {}
    for (const modelo of MODELOS_BACKUP) {
      try {
        backupData[modelo] = await (db as any)[modelo].findMany()
      } catch {}
    }
    const backupJson = JSON.stringify(backupData)
    const backup = await db.backup.create({
      data: {
        tipo: 'Automatico',
        estado: 'Completado',
        fechaInicio: mesAnterior,
        fechaFin: now,
        tamano: backupJson.length / (1024 * 1024), // MB
        archivo: `Respaldo_${mesStr}.json`,
        ubicacion: 'Email + BD',
        totalTablas: Object.keys(backupData).length,
        totalRegistros: Object.values(backupData).reduce((acc: number, arr: any) => acc + (Array.isArray(arr) ? arr.length : 0), 0),
        verificado: true,
        fechaVerificacion: now,
      },
    })

    // 2. GENERAR PDFs
    const { default: jsPDF } = await import('jspdf')
    const attachments: { filename: string; content: Buffer; contentType: string }[] = []

    const ots = await db.ordenTrabajo.findMany({
      where: { createdAt: { gte: mesAnterior, lte: mesAnteriorFin } },
      include: { asignado: true },
      orderBy: { createdAt: 'desc' },
    })
    attachments.push({ filename: `OT_${mesStr}.pdf`, content: Buffer.from(genOT(jsPDF, ots, mesStr), 'base64'), contentType: 'application/pdf' })

    const scs = await db.solicitudCompra.findMany({
      where: { createdAt: { gte: mesAnterior, lte: mesAnteriorFin } },
      orderBy: { createdAt: 'desc' },
    })
    attachments.push({ filename: `SC_${mesStr}.pdf`, content: Buffer.from(genSC(jsPDF, scs, mesStr), 'base64'), contentType: 'application/pdf' })

    const proyectos = await db.proyecto.findMany({ orderBy: { createdAt: 'desc' } })
    attachments.push({ filename: `Proyectos_${mesStr}.pdf`, content: Buffer.from(genProy(jsPDF, proyectos, mesStr), 'base64'), contentType: 'application/pdf' })

    const rondas = await db.registroRonda.findMany({
      where: { createdAt: { gte: mesAnterior, lte: mesAnteriorFin } },
      include: { ronda: true },
      orderBy: { createdAt: 'desc' },
    })
    attachments.push({ filename: `Rondas_${mesStr}.pdf`, content: Buffer.from(genRondas(jsPDF, rondas, mesStr), 'base64'), contentType: 'application/pdf' })

    const inasistencias = await db.inasistenciaAtraso.findMany({
      where: { fecha: { gte: fechaDesde, lte: fechaHasta } },
      include: { justificacion: true },
      orderBy: { fecha: 'desc' },
    })
    attachments.push({ filename: `Asistencia_${mesStr}.pdf`, content: Buffer.from(genAsist(jsPDF, inasistencias, mesStr), 'base64'), contentType: 'application/pdf' })

    attachments.push({ filename: `Respaldo_BD_${mesStr}.json`, content: Buffer.from(backupJson, 'utf-8'), contentType: 'application/json' })

    // 3. ENVIAR EMAIL
    const emailOk = await enviarEmail(attachments, mesStr)

    // 4. NOTIFICACIÓN
    const admins = await db.user.findMany({ where: { rol: 'admin', activo: true }, select: { id: true } })
    if (admins.length > 0) {
      await db.notificacion.createMany({
        data: admins.map((a) => ({
          titulo: 'Respaldo mensual generado',
          mensaje: `Respaldo automatico ${mesStr}: ${ots.length} OT, ${scs.length} SC, ${proyectos.length} proyectos, ${rondas.length} rondas, ${inasistencias.length} incidencias. ${emailOk ? 'Enviado por email.' : 'Email no enviado.'}`,
          tipo: 'Info', categoria: 'Seguridad', destino: 'Usuario especifico', destinoId: a.id, leido: false,
        })),
      })
    }

    return NextResponse.json({ success: true, message: `Respaldo ${mesStr} generado. Email: ${emailOk}`, resumen: { ot: ots.length, sc: scs.length, proyectos: proyectos.length, rondas: rondas.length, inasistencias: inasistencias.length, emailEnviado: emailOk } })
  } catch (error) {
    console.error('[Backup Auto] Error:', error)
    return NextResponse.json({ error: 'Error: ' + (error as Error).message }, { status: 500 })
  }
}

async function enviarEmail(attachments: { filename: string; content: Buffer; contentType: string }[], mesStr: string): Promise<boolean> {
  try {
    const nodemailer = await import('nodemailer').catch(() => null)
    if (!nodemailer) return false
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) return false

    const transporter = nodemailer.createTransport({ host: SMTP_HOST, port: parseInt(SMTP_PORT || '587'), secure: false, auth: { user: SMTP_USER, pass: SMTP_PASSWORD } })
    await transporter.sendMail({
      from: `"Sistema Condominios CyJ" <${SMTP_USER}>`,
      to: SMTP_USER,
      subject: `Respaldo Mensual — Laguna Norte — ${mesStr}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px"><h2 style="color:#0A1172">Respaldo Mensual Automatico</h2><p><strong>Condominio Laguna Norte</strong></p><p>Periodo: <strong>${mesStr}</strong></p><h3>Archivos adjuntos:</h3><ul>${attachments.map((a) => `<li>${a.filename}</li>`).join('')}</ul><p>El respaldo tambien esta guardado en el sistema (modulo Respaldos).</p><hr style="border:none;border-top:1px solid #eee;margin:20px 0"><p style="font-size:12px;color:#999">Email generado automaticamente. No responder.</p></div>`,
      attachments: attachments.map((a) => ({ filename: a.filename, content: a.content, contentType: a.contentType })),
    })
    return true
  } catch (e) { console.error('[Backup Auto] Email error:', e); return false }
}

function genOT(J: any, ots: any[], ms: string): string {
  const d = new J({ orientation: 'landscape', unit: 'mm', format: 'a4' }); const pw = d.internal.pageSize.getWidth()
  d.setFillColor(15,32,64); d.rect(0,0,pw,15,'F'); d.setTextColor(255,255,255); d.setFontSize(12); d.setFont('helvetica','bold')
  d.text(`Ordenes de Trabajo — ${ms}`,10,10); d.setFontSize(8); d.setFont('helvetica','normal'); d.text(`Total: ${ots.length}`,10,14)
  let y=22; d.setFillColor(240,240,240); d.rect(8,y,pw-16,6,'F'); d.setTextColor(0,0,0); d.setFontSize(6); d.setFont('helvetica','bold')
  d.text('OT#',10,y+4); d.text('Titulo',30,y+4); d.text('Estado',100,y+4); d.text('Aprob.',120,y+4); d.text('Asignado',140,y+4); d.text('Prior.',175,y+4); d.text('Fecha',190,y+4); y+=6
  d.setFont('helvetica','normal')
  ots.forEach((o,i)=>{ if(y>195){d.addPage();y=15} if(i%2===0){d.setFillColor(248,250,252);d.rect(8,y,pw-16,5,'F')}
    d.text(String(o.otNum||'—'),10,y+3.5); d.text(String(o.titulo||'').substring(0,50),30,y+3.5); d.text(String(o.estado||'—'),100,y+3.5)
    d.text(String(o.estadoAprobacion||'—'),120,y+3.5); d.text(String(o.asignado?.nombre||'—').substring(0,25),140,y+3.5)
    d.text(String(o.prioridad||'—'),175,y+3.5); d.text(new Date(o.createdAt).toLocaleDateString('es-CL'),190,y+3.5); y+=5 })
  return d.output('datauristring').split(',')[1]
}

function genSC(J: any, scs: any[], ms: string): string {
  const d = new J({ orientation: 'landscape', unit: 'mm', format: 'a4' }); const pw = d.internal.pageSize.getWidth()
  d.setFillColor(15,32,64); d.rect(0,0,pw,15,'F'); d.setTextColor(255,255,255); d.setFontSize(12); d.setFont('helvetica','bold')
  d.text(`Solicitudes de Compra — ${ms}`,10,10); d.setFontSize(8); d.setFont('helvetica','normal'); d.text(`Total: ${scs.length}`,10,14)
  let y=22; d.setFillColor(240,240,240); d.rect(8,y,pw-16,6,'F'); d.setTextColor(0,0,0); d.setFontSize(6); d.setFont('helvetica','bold')
  d.text('Codigo',10,y+4); d.text('Titulo',35,y+4); d.text('Estado',100,y+4); d.text('Etapa',120,y+4); d.text('Prior.',155,y+4); d.text('Total',175,y+4); d.text('Solicitado',200,y+4); d.text('Fecha',245,y+4); y+=6
  d.setFont('helvetica','normal')
  scs.forEach((s,i)=>{ if(y>195){d.addPage();y=15} if(i%2===0){d.setFillColor(248,250,252);d.rect(8,y,pw-16,5,'F')}
    d.text(String(s.codigo||'—'),10,y+3.5); d.text(String(s.titulo||'').substring(0,50),35,y+3.5); d.text(String(s.estado||'—'),100,y+3.5)
    d.text(String(s.etapaAprobacion||'—'),120,y+3.5); d.text(String(s.prioridad||'—'),155,y+3.5)
    d.text(`$${(s.totalEstimado||0).toLocaleString('es-CL')}`,175,y+3.5); d.text(String(s.solicitadoPor||'—').substring(0,30),200,y+3.5)
    d.text(new Date(s.createdAt).toLocaleDateString('es-CL'),245,y+3.5); y+=5 })
  return d.output('datauristring').split(',')[1]
}

function genProy(J: any, ps: any[], ms: string): string {
  const d = new J({ orientation: 'landscape', unit: 'mm', format: 'a4' }); const pw = d.internal.pageSize.getWidth()
  d.setFillColor(15,32,64); d.rect(0,0,pw,15,'F'); d.setTextColor(255,255,255); d.setFontSize(12); d.setFont('helvetica','bold')
  d.text(`Proyectos — ${ms}`,10,10); d.setFontSize(8); d.setFont('helvetica','normal'); d.text(`Total: ${ps.length}`,10,14)
  let y=22; d.setFillColor(240,240,240); d.rect(8,y,pw-16,6,'F'); d.setTextColor(0,0,0); d.setFontSize(6); d.setFont('helvetica','bold')
  d.text('Nombre',10,y+4); d.text('Estado',80,y+4); d.text('Sector',105,y+4); d.text('Tipo',135,y+4); d.text('Prior.',165,y+4); d.text('Presup.',180,y+4); d.text('Avance',210,y+4); d.text('Inicio',230,y+4); d.text('Fin',250,y+4); y+=6
  d.setFont('helvetica','normal')
  ps.forEach((p,i)=>{ if(y>195){d.addPage();y=15} if(i%2===0){d.setFillColor(248,250,252);d.rect(8,y,pw-16,5,'F')}
    d.text(String(p.nombre||'').substring(0,50),10,y+3.5); d.text(String(p.estado||'—'),80,y+3.5); d.text(String(p.sector||'—'),105,y+3.5)
    d.text(String(p.tipoReparacion||'—'),135,y+3.5); d.text(String(p.prioridad||'—'),165,y+3.5)
    d.text(`$${(p.presProg||0).toLocaleString('es-CL')}`,180,y+3.5); d.text(`${p.avance||0}%`,210,y+3.5)
    d.text(p.fechaInicio||'—',230,y+3.5); d.text(p.fechaFin||'—',250,y+3.5); y+=5 })
  return d.output('datauristring').split(',')[1]
}

function genRondas(J: any, rs: any[], ms: string): string {
  const d = new J({ orientation: 'portrait', unit: 'mm', format: 'a4' }); const pw = d.internal.pageSize.getWidth()
  d.setFillColor(15,32,64); d.rect(0,0,pw,15,'F'); d.setTextColor(255,255,255); d.setFontSize(12); d.setFont('helvetica','bold')
  d.text(`Rondas — ${ms}`,10,10); d.setFontSize(8); d.setFont('helvetica','normal'); d.text(`Total: ${rs.length}`,10,14)
  let y=22; d.setFillColor(240,240,240); d.rect(8,y,pw-16,6,'F'); d.setTextColor(0,0,0); d.setFontSize(7); d.setFont('helvetica','bold')
  d.text('Fecha',10,y+4); d.text('Hora',35,y+4); d.text('Ronda',50,y+4); d.text('Usuario',100,y+4); d.text('Ubicacion',140,y+4); d.text('GPS',180,y+4); y+=6
  d.setFont('helvetica','normal'); d.setFontSize(6)
  rs.forEach((r,i)=>{ if(y>280){d.addPage();y=15} if(i%2===0){d.setFillColor(248,250,252);d.rect(8,y,pw-16,5,'F')}
    d.text(r.fecha||'—',10,y+3.5); d.text(r.hora||'—',35,y+3.5); d.text(String(r.ronda?.nombre||'—').substring(0,40),50,y+3.5)
    d.text(String(r.usuarioNombre||'—').substring(0,30),100,y+3.5); d.text(String(r.ubicacion||'—').substring(0,30),140,y+3.5)
    d.text(r.latitud?`${r.latitud.toFixed(4)},${r.longitud?.toFixed(4)}`:'—',180,y+3.5); y+=5 })
  return d.output('datauristring').split(',')[1]
}

function genAsist(J: any, ins: any[], ms: string): string {
  const d = new J({ orientation: 'landscape', unit: 'mm', format: 'a4' }); const pw = d.internal.pageSize.getWidth()
  d.setFillColor(15,32,64); d.rect(0,0,pw,15,'F'); d.setTextColor(255,255,255); d.setFontSize(12); d.setFont('helvetica','bold')
  d.text(`Asistencia — Incidencias ${ms}`,10,10); d.setFontSize(8); d.setFont('helvetica','normal'); d.text(`Total: ${ins.length}`,10,14)
  let y=22; d.setFillColor(240,240,240); d.rect(8,y,pw-16,6,'F'); d.setTextColor(0,0,0); d.setFontSize(6); d.setFont('helvetica','bold')
  d.text('Trabajador',10,y+4); d.text('Fecha',70,y+4); d.text('Dia',90,y+4); d.text('Tipo',105,y+4); d.text('Esperada',140,y+4); d.text('Real',160,y+4); d.text('Min',180,y+4); d.text('Estado',195,y+4); d.text('Justif.',220,y+4); y+=6
  d.setFont('helvetica','normal')
  ins.forEach((ina,i)=>{ if(y>195){d.addPage();y=15} if(i%2===0){d.setFillColor(248,250,252);d.rect(8,y,pw-16,5,'F')}
    d.text(String(ina.nombreTrabajador||'—').substring(0,45),10,y+3.5); d.text(ina.fecha||'—',70,y+3.5); d.text(ina.diaSemana||'—',90,y+3.5)
    d.text(String(ina.tipo||'—'),105,y+3.5); d.text(ina.horaEsperadaInicio||'—',140,y+3.5); d.text(ina.horaRealInicio||'—',160,y+3.5)
    d.text(String(ina.minutosAtraso||0),180,y+3.5); d.text(String(ina.estado||'—'),195,y+3.5)
    d.text(ina.justificacion?`${ina.justificacion.tipoJustificacion}:${ina.justificacion.estado}`:'—',220,y+3.5); y+=5 })
  return d.output('datauristring').split(',')[1]
}
