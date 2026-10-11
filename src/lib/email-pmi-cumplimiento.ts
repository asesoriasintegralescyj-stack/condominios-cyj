/**
 * Email helper para alertas de incumplimiento del PMI.
 *
 * Envía un correo HTML al Jefe de Operaciones cuando se detectan
 * Listas de Verificación (LVs) programadas para una fecha que NO cuentan
 * con registro de ejecución.
 *
 * Reutiliza la misma configuración SMTP que ya usa el módulo de Solicitud
 * de Compra (SMTP_HOST, SMTP_USER, SMTP_PASSWORD). Si no hay SMTP
 * configurado, registra un warning y retorna gracefully sin lanzar error.
 *
 * From: asesoriasintegralescyj@gmail.com (SMTP_USER)
 * To:   operaciones.lagunanorte@gmail.com
 * Cc:   administracionlagunanorte@gmail.com
 */

import nodemailer, { type Transporter } from 'nodemailer'

const PMI_EMAIL_FROM = process.env.SMTP_USER || 'asesoriasintegralescyj@gmail.com'
const PMI_EMAIL_TO = 'operaciones.lagunanorte@gmail.com'
const PMI_EMAIL_CC = 'administracionlagunanorte@gmail.com'

export interface LvFaltante {
  codigo: string
  nombre: string
  sector: string
  frecuencia: string
  responsable: string
}

export interface PmiAlertaPayload {
  fecha: string // YYYY-MM-DD
  totalProgramadas: number
  totalCompletadas: number
  totalFaltantes: number
  porcentaje: number
  lvsFaltantes: LvFaltante[]
}

let cachedTransport: Transporter | null = null

function hasSmtpConfig(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      (process.env.SMTP_PASSWORD || process.env.SMTP_PASS),
  )
}

function getTransport(): Transporter | null {
  if (!hasSmtpConfig()) return null
  if (cachedTransport) return cachedTransport
  const port = parseInt(process.env.SMTP_PORT || '587', 10)
  cachedTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS,
    },
  })
  return cachedTransport
}

function escapeHtml(text: string): string {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatFechaLarga(fechaISO: string): string {
  // fechaISO = "2026-07-26" → "Sábado 26-07-2026"
  const [a, m, d] = fechaISO.split('-').map(Number)
  const date = new Date(Date.UTC(a, m - 1, d, 12, 0, 0))
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${dias[date.getUTCDay()]} ${d} de ${meses[date.getUTCMonth()]} de ${a}`
}

function buildAlertEmailHtml(p: PmiAlertaPayload): string {
  const fechaLarga = formatFechaLarga(p.fecha)
  const fechaCorta = p.fecha.split('-').reverse().join('-') // DD-MM-YYYY

  const faltantesRows = p.lvsFaltantes
    .map(
      lv => `
      <tr>
        <td style="background:#fee2e2;font-weight:bold;color:#991b1b;font-family:Menlo,Consolas,monospace;font-size:12px;padding:8px 10px;border:1px solid #fecaca;">${escapeHtml(lv.codigo)}</td>
        <td style="background:#fef2f2;font-weight:600;color:#7f1d1d;padding:8px 10px;border:1px solid #fecaca;">${escapeHtml(lv.nombre)}</td>
        <td style="background:#fef2f2;color:#7f1d1d;padding:8px 10px;border:1px solid #fecaca;">${escapeHtml(lv.sector)}</td>
        <td style="background:#fef2f2;color:#7f1d1d;padding:8px 10px;border:1px solid #fecaca;">${escapeHtml(lv.frecuencia)}</td>
        <td style="background:#fef2f2;color:#7f1d1d;padding:8px 10px;border:1px solid #fecaca;">${escapeHtml(lv.responsable)}</td>
      </tr>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Alerta PMI - ${escapeHtml(fechaCorta)}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#991b1b 0%,#7f1d1d 100%);padding:24px 28px;color:#ffffff;">
              <h1 style="margin:0 0 4px 0;font-size:22px;font-weight:700;">⚠ FALTA CUMPLIMIENTO PMI</h1>
              <p style="margin:0;font-size:13px;opacity:0.92;">Plan de Mantenimiento Integral — Condominios Laguna Norte CyJ</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:24px 28px;">
              <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#1e293b;">
                Estimado Luis García (Jefe de Operaciones),
              </p>

              <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#1e293b;">
                El sistema de gestión <strong>Condominios Laguna Norte — CyJ</strong> ha detectado que al cierre del día
                <strong>${escapeHtml(fechaLarga)}</strong> existen <strong style="color:#991b1b;">${p.totalFaltantes} Lista(s) de Verificación</strong>
                del Plan de Mantenimiento Integral (PMI) que estaban programadas para esa fecha y
                <strong>NO cuentan con registro de ejecución</strong>.
              </p>

              <!-- Alert banner -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border:2px solid #dc2626;border-radius:8px;margin:16px 0;">
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0 0 4px 0;font-size:15px;font-weight:700;color:#991b1b;">📅 Fecha del reporte: ${escapeHtml(fechaCorta)}</p>
                    <p style="margin:0;font-size:13px;color:#7f1d1d;">
                      Porcentaje de cumplimiento: <strong>${p.porcentaje}%</strong> · Meta diaria: ≥ 90%
                    </p>
                  </td>
                </tr>
              </table>

              <!-- KPI cards -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
                <tr>
                  <td width="33%" style="padding:0 4px 0 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#dbeafe;border-radius:8px;">
                      <tr><td style="padding:14px 8px;text-align:center;">
                        <div style="font-size:24px;font-weight:700;color:#1e40af;line-height:1;">${p.totalProgramadas}</div>
                        <div style="font-size:11px;font-weight:600;color:#1e40af;text-transform:uppercase;margin-top:4px;letter-spacing:0.5px;">Programadas</div>
                      </td></tr>
                    </table>
                  </td>
                  <td width="33%" style="padding:0 4px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#dcfce7;border-radius:8px;">
                      <tr><td style="padding:14px 8px;text-align:center;">
                        <div style="font-size:24px;font-weight:700;color:#166534;line-height:1;">${p.totalCompletadas}</div>
                        <div style="font-size:11px;font-weight:600;color:#166534;text-transform:uppercase;margin-top:4px;letter-spacing:0.5px;">Completadas</div>
                      </td></tr>
                    </table>
                  </td>
                  <td width="33%" style="padding:0 0 0 4px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fee2e2;border-radius:8px;">
                      <tr><td style="padding:14px 8px;text-align:center;">
                        <div style="font-size:24px;font-weight:700;color:#991b1b;line-height:1;">${p.totalFaltantes}</div>
                        <div style="font-size:11px;font-weight:600;color:#991b1b;text-transform:uppercase;margin-top:4px;letter-spacing:0.5px;">Faltantes</div>
                      </td></tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:18px 0 10px 0;font-size:14px;font-weight:600;color:#1e293b;">
                Listas de Verificación FALTANTES:
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
                <thead>
                  <tr>
                    <th style="background:#fee2e2;color:#7f1d1d;padding:10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border:1px solid #fecaca;">Código</th>
                    <th style="background:#fee2e2;color:#7f1d1d;padding:10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border:1px solid #fecaca;">Nombre LV</th>
                    <th style="background:#fee2e2;color:#7f1d1d;padding:10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border:1px solid #fecaca;">Sector</th>
                    <th style="background:#fee2e2;color:#7f1d1d;padding:10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border:1px solid #fecaca;">Frecuencia</th>
                    <th style="background:#fee2e2;color:#7f1d1d;padding:10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border:1px solid #fecaca;">Responsable</th>
                  </tr>
                </thead>
                <tbody>
                  ${faltantesRows || '<tr><td colspan="5" style="padding:14px;text-align:center;color:#64748b;">No hay LVs faltantes</td></tr>'}
                </tbody>
              </table>

              <p style="margin:18px 0 0 0;font-size:14px;line-height:1.6;color:#1e293b;">
                <strong>Acción requerida:</strong> Se solicita a Luis García (Jefe de Operaciones) coordinar la ejecución
                de las LVs pendientes o registrar la justificación correspondiente en el sistema a la brevedad.
              </p>

              <p style="margin:12px 0 0 0;font-size:13px;color:#64748b;">
                Este correo es generado automáticamente por el sistema. Las LVs completadas también quedan
                registradas en el módulo PMI del sistema y forman parte del histórico de cumplimiento.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:14px 28px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center;">
              Correo automático enviado desde ${escapeHtml(PMI_EMAIL_FROM)} vía SMTP configurado ·
              No responder directamente a este correo ·
              Condominios CyJ · ${escapeHtml(p.fecha)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export interface SendResult {
  enviado: boolean
  messageId?: string
  error?: string
}

export async function enviarAlertaPmiCumplimiento(payload: PmiAlertaPayload): Promise<SendResult> {
  if (payload.totalFaltantes === 0) {
    return { enviado: false, error: 'No hay LVs faltantes — nada que reportar' }
  }

  const transport = getTransport()
  if (!transport) {
    console.warn('[PMI Alerta] SMTP no configurado — no se envió el correo')
    return { enviado: false, error: 'SMTP no configurado (falta SMTP_HOST/SMTP_USER/SMTP_PASSWORD en variables de entorno)' }
  }

  const fechaCorta = payload.fecha.split('-').reverse().join('-')
  const subject = `⚠ FALTA CUMPLIMIENTO PMI — ${fechaCorta} (${payload.totalFaltantes} LVs pendientes)`

  const html = buildAlertEmailHtml(payload)

  try {
    const info = await transport.sendMail({
      from: `"Sistema Condominios CyJ" <${PMI_EMAIL_FROM}>`,
      to: PMI_EMAIL_TO,
      cc: PMI_EMAIL_CC,
      replyTo: PMI_EMAIL_FROM,
      subject,
      html,
    })
    return { enviado: true, messageId: info.messageId }
  } catch (err) {
    console.error('[PMI Alerta] Error enviando correo:', err)
    return { enviado: false, error: String(err) }
  }
}
