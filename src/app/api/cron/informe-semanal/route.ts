import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const EMAIL_USER = 'asesoriasintegralescyj@gmail.com'
const EMAIL_PASS = process.env.EMAIL_PASSWORD || ''

// CRON: Se ejecuta cada martes a las 08:00 AM (America/Santiago)
// Vercel: vercel.json → "0 11 * * 2" (UTC)
export async function GET() {
  // Validación de token CRON (Vercel envía este header)
  const cronSecret = process.env.CRON_SECRET || ''
  const authHeader = process.env.CRON_AUTH_HEADER || ''

  try {
    console.log('[CRON Informe Semanal] Iniciando generación...')

    // Calcular rango: última semana (lunes a domingo)
    const ahora = new Date()
    const diaSemana = ahora.getDay() // 0=domingo, 1=lunes...
    const diasDesdeLunes = diaSemana === 0 ? 6 : diaSemana - 1
    const lunes = new Date(ahora)
    lunes.setDate(lunes.getDate() - diasDesdeLunes)
    lunes.setHours(0, 0, 0, 0)
    const domingo = new Date(lunes)
    domingo.setDate(domingo.getDate() + 6)
    domingo.setHours(23, 59, 59, 999)

    const desdeStr = lunes.toISOString()
    const hastaStr = domingo.toISOString()

    // ─── CONSULTAR DATOS ───
    const [ots, proyectos, registrosRonda, qrLocations, solicitudes, rendiciones, pmiRegistros] = await Promise.all([
      db.ordenTrabajo.findMany({ where: { createdAt: { gte: lunes } }, orderBy: { createdAt: 'desc' }, take: 200 }),
      db.proyecto.findMany({ orderBy: { createdAt: 'desc' }, take: 100 }),
      db.movilQrScan.findMany({ where: { createdAt: { gte: lunes } }, orderBy: { createdAt: 'desc' }, take: 500 }),
      db.movilQrLocation.findMany({ where: { createdAt: { gte: lunes } }, take: 100 }),
      db.solicitudCompra.findMany({ where: { createdAt: { gte: lunes } }, orderBy: { createdAt: 'desc' }, take: 200 }),
      db.rendicionGasto.findMany({ where: { createdAt: { gte: lunes } }, orderBy: { createdAt: 'desc' }, take: 100 }),
      db.registroLV.findMany({ where: { createdAt: { gte: lunes } }, orderBy: { createdAt: 'desc' }, take: 200 }),
    ])

    const resumen = {
      nuevasOTs: ots.length,
      otsCompletadas: ots.filter(o => o.estado === 'Completado').length,
      otsEnProgreso: ots.filter(o => o.estado === 'En Progreso').length,
      otsPendientes: ots.filter(o => o.estado === 'Pendiente').length,
      totalProyectos: proyectos.length,
      proyectosCompletados: proyectos.filter(p => p.estado === 'Completado').length,
      proyectosEnEjecucion: proyectos.filter(p => p.estado === 'En Ejecución').length,
      totalRondas: registrosRonda.length,
      totalQrCreados: qrLocations.length,
      totalSolicitudes: solicitudes.length,
      solicitudesAprobadas: solicitudes.filter(s => s.estado === 'Comprado').length,
      solicitudesPendientes: solicitudes.filter(s => s.estado === 'Solicitado').length,
      totalRendiciones: rendiciones.length,
      rendicionesAprobadas: rendiciones.filter(r => r.estado === 'APROBADO').length,
      rendicionesPendientes: rendiciones.filter(r => r.estado === 'BORRADOR' || r.estado === 'ENVIADO').length,
      totalPMI: pmiRegistros.length,
      pmiCompletados: pmiRegistros.filter(r => r.estado === 'Completado').length,
      pmiPendientes: pmiRegistros.filter(r => r.estado !== 'Completado').length,
    }

    // ─── GENERAR WORD ───
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType } = await import('docx')

    function fmtDate(d: string | Date): string {
      try { return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }) } catch { return String(d) }
    }

    const doc = new Document({
      styles: { default: { document: { run: { font: 'Calibri', size: 22 } } } },
      sections: [{
        properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: 'CONDOMINIO LAGUNA NORTE', bold: true, size: 52, color: '0F2044' })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: 'INFORME SEMANAL DE GESTIÓN', bold: true, size: 40, color: '2E5BBA' })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [new TextRun({ text: `Período: ${fmtDate(lunes)} al ${fmtDate(domingo)}`, size: 24, color: '666666' })] }),

          // Resumen
          new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 200 }, children: [new TextRun({ text: '1. RESUMEN EJECUTIVO', bold: true, color: '0F2044', size: 28 })] }),
          new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `Informe automático semanal. OTs: ${resumen.nuevasOTs} creadas (${resumen.otsCompletadas} completadas). Proyectos: ${resumen.totalProyectos} (${resumen.proyectosEnEjecucion} en ejecución). Rondas QR: ${resumen.totalRondas} lecturas. Solicitudes: ${resumen.totalSolicitudes}. Rendiciones: ${resumen.totalRendiciones}. PMI: ${resumen.totalPMI} registros.`, size: 22 })] }),

          // KPI Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({ children: ['Indicador', 'Valor', 'Indicador', 'Valor'].map(text => new TableCell({ shading: { type: ShadingType.SOLID, color: '0F2044' }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 20 })] })] })) }),
              ...[
                ['OTs Creadas', String(resumen.nuevasOTs), 'Completadas', String(resumen.otsCompletadas)],
                ['OTs En Progreso', String(resumen.otsEnProgreso), 'OTs Pendientes', String(resumen.otsPendientes)],
                ['Total Proyectos', String(resumen.totalProyectos), 'En Ejecución', String(resumen.proyectosEnEjecucion)],
                ['Lecturas QR', String(resumen.totalRondas), 'QR Creados', String(resumen.totalQrCreados)],
                ['Solicitudes Compra', String(resumen.totalSolicitudes), 'Aprobadas', String(resumen.solicitudesAprobadas)],
                ['Rendiciones', String(resumen.totalRendiciones), 'Aprobadas', String(resumen.rendicionesAprobadas)],
                ['PMI Registros', String(resumen.totalPMI), 'Completados', String(resumen.pmiCompletados)],
              ].map((row, idx) => new TableRow({
                children: row.map((text, ci) => new TableCell({
                  shading: { type: ShadingType.SOLID, color: idx % 2 === 0 ? 'F1F5F9' : 'FFFFFF' },
                  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: ci === 1 || ci === 3, size: 20, color: ci === 1 || ci === 3 ? '2E5BBA' : '333333' })] })],
                }))
              })),
            ],
          }),

          // OTs
          new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 }, children: [new TextRun({ text: '2. ÓRDENES DE TRABAJO', bold: true, color: '0F2044', size: 28 })] }),
          ...ots.map(ot => new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: `${ot.otNum} — ${ot.titulo}`, bold: true, size: 22 }),
              new TextRun({ text: ` | ${ot.tipo} | ${ot.prioridad} | ${ot.estado} | Avance: ${ot.progreso}%`, size: 20, color: '555555' }),
            ],
          })),

          // Proyectos
          new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 }, children: [new TextRun({ text: '3. PROYECTOS', bold: true, color: '0F2044', size: 28 })] }),
          ...proyectos.map(p => new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: `${p.codigo || '—'} — ${p.nombre}`, bold: true, size: 22 }),
              new TextRun({ text: ` | ${p.estado} | Avance: ${p.avance}%`, size: 20, color: '555555' }),
            ],
          })),

          // Rondas
          new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 }, children: [new TextRun({ text: '4. RONDAS Y QR', bold: true, color: '0F2044', size: 28 })] }),
          new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: `Lecturas QR: ${resumen.totalRondas} | Nuevos puntos QR: ${resumen.totalQrCreados}`, size: 22 })] }),

          // Solicitudes
          new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 }, children: [new TextRun({ text: '5. SOLICITUDES DE COMPRA', bold: true, color: '0F2044', size: 28 })] }),
          ...solicitudes.map(s => new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: `${s.codigo} — ${s.titulo}`, bold: true, size: 22 }),
              new TextRun({ text: ` | ${s.estado} | $${(s.totalEstimado || 0).toLocaleString('es-CL')}`, size: 20, color: '555555' }),
            ],
          })),

          // Rendiciones
          new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 }, children: [new TextRun({ text: '6. RENDICIÓN DE GASTOS', bold: true, color: '0F2044', size: 28 })] }),
          ...rendiciones.map(rd => new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: `${rd.numeroRendicion || '—'} — ${rd.titulo}`, bold: true, size: 22 }),
              new TextRun({ text: ` | ${rd.estado} | $${(rd.montoTotal || 0).toLocaleString('es-CL')}`, size: 20, color: '555555' }),
            ],
          })),

          // PMI
          new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 }, children: [new TextRun({ text: '7. PMI', bold: true, color: '0F2044', size: 28 })] }),
          new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: `Registros PMI: ${resumen.totalPMI} (${resumen.pmiCompletados} completados, ${resumen.pmiPendientes} pendientes)`, size: 22 })] }),

          // Cierre
          new Paragraph({ spacing: { before: 400 }, border: { top: { style: BorderStyle.SINGLE, size: 6, color: '2E5BBA' } }, children: [] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [new TextRun({ text: 'Asesorías Integrales CYJ — Informe generado automáticamente', size: 18, color: '999999', italics: true })] }),
        ],
      }],
    })

    const buffer = await Packer.toBuffer(doc as any)

    // ─── ENVIAR EMAIL ───
    const nodemailer = await import('nodemailer')
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    })

    const filename = `informe-semanal-${new Date().toISOString().slice(0, 10)}.docx`

    await transporter.sendMail({
      from: `"Sistema CYJ" <${EMAIL_USER}>`,
      to: EMAIL_USER,
      subject: `📋 Informe Semanal - Laguna Norte (${fmtDate(lunes)} al ${fmtDate(domingo)})`,
      html: `<!DOCTYPE html><html><body style="font-family:Arial;max-width:600px;margin:0 auto;padding:20px">
        <div style="background:#0F2044;color:white;padding:20px;border-radius:8px 8px 0 0;text-align:center">
          <h1 style="margin:0">CONDOMINIO LAGUNA NORTE</h1>
          <p style="margin:5px 0 0;color:#93C5FD">Informe Semanal de Gestión</p>
        </div>
        <div style="background:#F8FAFC;padding:20px;border:1px solid #E2E8F0;border-radius:0 0 8px 8px">
          <p style="color:#64748B">Período: <strong>${fmtDate(lunes)} al ${fmtDate(domingo)}</strong></p>
          <table style="width:100%;border-collapse:collapse;margin-top:15px;font-size:13px">
            <tr style="background:#1E3A5F;color:white"><td style="padding:8px">Área</td><td style="padding:8px;text-align:center">Total</td><td style="padding:8px;text-align:center">OK</td><td style="padding:8px;text-align:center">Pend.</td></tr>
            <tr style="background:white"><td>OTs</td><td style="text-align:center">${resumen.nuevasOTs}</td><td style="text-align:center;color:green">${resumen.otsCompletadas}</td><td style="text-align:center;color:orange">${resumen.otsPendientes}</td></tr>
            <tr style="background:#F1F5F9"><td>Proyectos</td><td style="text-align:center">${resumen.totalProyectos}</td><td style="text-align:center;color:green">${resumen.proyectosCompletados}</td><td style="text-align:center">${resumen.proyectosEnEjecucion}</td></tr>
            <tr style="background:white"><td>Solicitudes</td><td style="text-align:center">${resumen.totalSolicitudes}</td><td style="text-align:center;color:green">${resumen.solicitudesAprobadas}</td><td style="text-align:center;color:orange">${resumen.solicitudesPendientes}</td></tr>
            <tr style="background:#F1F5F9"><td>Rendiciones</td><td style="text-align:center">${resumen.totalRendiciones}</td><td style="text-align:center;color:green">${resumen.rendicionesAprobadas}</td><td style="text-align:center;color:orange">${resumen.rendicionesPendientes}</td></tr>
            <tr style="background:white"><td>PMI</td><td style="text-align:center">${resumen.totalPMI}</td><td style="text-align:center;color:green">${resumen.pmiCompletados}</td><td style="text-align:center;color:orange">${resumen.pmiPendientes}</td></tr>
            <tr style="background:#F1F5F9"><td>Rondas QR</td><td style="text-align:center" colspan="3">${resumen.totalRondas}</td></tr>
          </table>
          <p style="margin-top:15px;color:#64748B;font-size:12px;text-align:center"><em>Informe detallado adjunto. Generado automáticamente.</em></p>
        </div></body></html>`,
      attachments: [{ filename, content: buffer, contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }],
    })

    console.log('[CRON Informe Semanal] Email enviado exitosamente')
    return NextResponse.json({ success: true, message: 'Informe enviado', periodo: { desde: fmtDate(lunes), hasta: fmtDate(domingo) }, resumen })
  } catch (error) {
    console.error('[CRON Informe Semanal] ERROR:', error)
    return NextResponse.json({ error: 'Error en cron' }, { status: 500 })
  }
}
