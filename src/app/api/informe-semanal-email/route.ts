import { NextResponse } from 'next/server'
import { getCurrentSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const EMAIL_USER = 'asesoriasintegralescyj@gmail.com'
const EMAIL_PASS = process.env.EMAIL_PASSWORD || ''

export async function POST(request: Request) {
  const session = await getCurrentSession()
  if (!session || session.user.rol !== 'admin') {
    return NextResponse.json({ error: 'Solo administradores' }, { status: 403 })
  }

  try {
    const url = new URL(request.url)
    const dias = url.searchParams.get('dias') || '7'

    // Generar el informe Word
    const informeRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/informe-semanal?formato=word&dias=${dias}`, {
      headers: { cookie: request.headers.get('cookie') || '' },
    })

    if (!informeRes.ok) {
      const err = await informeRes.json()
      return NextResponse.json({ error: 'Error al generar informe: ' + (err.error || 'desconocido') }, { status: 500 })
    }

    const informeData = await informeRes.json()

    if (!informeData.archivos?.word) {
      return NextResponse.json({ error: 'No se pudo generar el archivo Word' }, { status: 500 })
    }

    // Convertir base64 a buffer
    const wordBuffer = Buffer.from(informeData.archivos.word, 'base64')

    // Enviar email con nodemailer
    const nodemailer = await import('nodemailer')
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    })

    await transporter.sendMail({
      from: `"Sistema CYJ" <${EMAIL_USER}>`,
      to: EMAIL_USER,
      subject: `📋 Informe Semanal - Condominio Laguna Norte (${informeData.periodo.desde} al ${informeData.periodo.hasta})`,
      html: generateEmailHTML(informeData),
      attachments: [{
        filename: informeData.filename_word,
        content: wordBuffer,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }],
    })

    return NextResponse.json({ success: true, message: 'Informe enviado por email' })
  } catch (error) {
    console.error('Error enviando informe por email:', error)
    return NextResponse.json({ error: 'Error al enviar email: ' + String(error) }, { status: 500 })
  }
}

function generateEmailHTML(data: any): string {
  const r = data.resumen
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #0F2044; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 22px;">CONDOMINIO LAGUNA NORTE</h1>
        <p style="margin: 5px 0 0; font-size: 14px; color: #93C5FD;">Informe Semanal de Gestión</p>
      </div>
      <div style="background: #F8FAFC; padding: 20px; border: 1px solid #E2E8F0; border-radius: 0 0 8px 8px;">
        <p style="color: #64748B; font-size: 13px;">Período: <strong>${data.periodo.desde} al ${data.periodo.hasta}</strong></p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px;">
          <tr style="background: #1E3A5F; color: white;">
            <td style="padding: 8px; text-align: left;">Área</td>
            <td style="padding: 8px; text-align: center;">Total</td>
            <td style="padding: 8px; text-align: center;">Completados</td>
            <td style="padding: 8px; text-align: center;">Pendientes</td>
          </tr>
          <tr style="background: white;"><td style="padding: 6px;">OTs</td><td style="text-align: center;">${r.nuevasOTs}</td><td style="text-align: center; color: green;">${r.otsCompletadas}</td><td style="text-align: center; color: orange;">${r.otsPendientes}</td></tr>
          <tr style="background: #F1F5F9;"><td style="padding: 6px;">Proyectos</td><td style="text-align: center;">${r.totalProyectos}</td><td style="text-align: center; color: green;">${r.proyectosCompletados}</td><td style="text-align: center;">${r.proyectosEnEjecucion}</td></tr>
          <tr style="background: white;"><td style="padding: 6px;">Solicitudes Compra</td><td style="text-align: center;">${r.totalSolicitudes}</td><td style="text-align: center; color: green;">${r.solicitudesAprobadas}</td><td style="text-align: center; color: orange;">${r.solicitudesPendientes}</td></tr>
          <tr style="background: #F1F5F9;"><td style="padding: 6px;">Rendiciones</td><td style="text-align: center;">${r.totalRendiciones}</td><td style="text-align: center; color: green;">${r.rendicionesAprobadas}</td><td style="text-align: center; color: orange;">${r.rendicionesPendientes}</td></tr>
          <tr style="background: white;"><td style="padding: 6px;">PMI</td><td style="text-align: center;">${r.totalPMI}</td><td style="text-align: center; color: green;">${r.pmiCompletados}</td><td style="text-align: center; color: orange;">${r.pmiPendientes}</td></tr>
          <tr style="background: #F1F5F9;"><td style="padding: 6px;">Lecturas QR</td><td style="text-align: center;" colspan="3">${r.totalRondas}</td></tr>
        </table>
        <p style="margin-top: 15px; color: #64748B; font-size: 12px; text-align: center;">
          El informe detallado en formato Word se adjunta a este correo.<br>
          <em>Generado automáticamente por el Sistema de Gestión Condominial Laguna Norte</em>
        </p>
      </div>
    </div>
  `
}
