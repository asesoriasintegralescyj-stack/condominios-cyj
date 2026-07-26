/**
 * Email helper para alertas de OT no generadas por el supervisor SUP1.
 *
 * Envía un correo HTML cuando el supervisor (rol='supervisor') no ha creado
 * el mínimo de 3 OT durante el día en curso (America/Santiago).
 *
 * Reutiliza la misma configuración SMTP que el resto del sistema
 * (SMTP_HOST, SMTP_USER, SMTP_PASSWORD). Si no hay SMTP configurado,
 * registra un warning y retorna gracefully sin lanzar error.
 *
 * From: asesoriasintegralescyj@gmail.com (SMTP_USER)
 * To:   operaciones.lagunanorte@gmail.com
 * Cc:   administracionlagunanorte@gmail.com
 *
 * Subject fijo: "NO HAY REGISTRO DE TRABAJOS"
 */

import nodemailer, { type Transporter } from 'nodemailer'

const OT_EMAIL_FROM = process.env.SMTP_USER || 'asesoriasintegralescyj@gmail.com'
const OT_EMAIL_TO = 'operaciones.lagunanorte@gmail.com'
const OT_EMAIL_CC = 'administracionlagunanorte@gmail.com'

export interface OtAlertaPayload {
  fecha: string // YYYY-MM-DD
  supervisorNombre: string
  supervisorEmail: string
  supervisorCodigo: string // Etiqueta, por defecto "SUP1"
  otCreadasHoy: number
  otMeta: number // Mínimo requerido = 3
  otRecientes: Array<{
    otNum: string
    titulo: string
    estado: string
    createdAt: string
  }>
  horaConsulta: string // HH:MM Santiago
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
  const [a, m, d] = fechaISO.split('-').map(Number)
  const date = new Date(Date.UTC(a, m - 1, d, 12, 0, 0))
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${dias[date.getUTCDay()]} ${d} de ${meses[date.getUTCMonth()]} de ${a}`
}

function buildAlertEmailHtml(p: OtAlertaPayload): string {
  const fechaLarga = formatFechaLarga(p.fecha)
  const fechaCorta = p.fecha.split('-').reverse().join('-') // DD-MM-YYYY

  const faltantes = Math.max(0, p.otMeta - p.otCreadasHoy)
  const cumpleMeta = p.otCreadasHoy >= p.otMeta

  const estadoColor = cumpleMeta ? '#166534' : '#991b1b'
  const estadoBg = cumpleMeta ? '#dcfce7' : '#fee2e2'
  const estadoLabel = cumpleMeta
    ? 'META CUMPLIDA'
    : `FALTAN ${faltantes} OT POR GENERAR`

  const otRows = p.otRecientes.length
    ? p.otRecientes
        .map(
          (ot) => `
        <tr>
          <td style="font-family:Menlo,Consolas,monospace;font-size:12px;font-weight:700;color:#1e40af;padding:8px 10px;border:1px solid #e2e8f0;background:#eff6ff;">${escapeHtml(ot.otNum)}</td>
          <td style="font-weight:600;color:#0f172a;padding:8px 10px;border:1px solid #e2e8f0;">${escapeHtml(ot.titulo)}</td>
          <td style="color:#475569;padding:8px 10px;border:1px solid #e2e8f0;">${escapeHtml(ot.estado)}</td>
          <td style="color:#64748b;font-size:12px;padding:8px 10px;border:1px solid #e2e8f0;">${escapeHtml(ot.createdAt)}</td>
        </tr>`,
        )
        .join('')
    : `<tr><td colspan="4" style="padding:18px;text-align:center;color:#991b1b;font-weight:600;background:#fef2f2;border:1px solid #fecaca;">⚠ SIN REGISTROS — El supervisor no ha generado OT durante el día</td></tr>`

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>NO HAY REGISTRO DE TRABAJOS - ${escapeHtml(fechaCorta)}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#991b1b 0%,#7f1d1d 100%);padding:24px 28px;color:#ffffff;">
              <h1 style="margin:0 0 4px 0;font-size:22px;font-weight:700;">NO HAY REGISTRO DE TRABAJOS</h1>
              <p style="margin:0;font-size:13px;opacity:0.92;">Alerta automática de supervisor SUP1 — Condominios Laguna Norte CyJ</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:24px 28px;">
              <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#1e293b;">
                Estimado equipo de operaciones,
              </p>

              <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#1e293b;">
                El sistema de gestión <strong>Condominios Laguna Norte — CyJ</strong> ha detectado que al cierre
                de la hora <strong>${escapeHtml(p.horaConsulta)}</strong> del día
                <strong>${escapeHtml(fechaLarga)}</strong>, el supervisor
                <strong style="color:#991b1b;">${escapeHtml(p.supervisorNombre)} (${escapeHtml(p.supervisorCodigo)})</strong>
                ha generado <strong style="color:#991b1b;">${p.otCreadasHoy} OT</strong>
                de un mínimo requerido de <strong>${p.otMeta} OT diarias</strong>.
              </p>

              <!-- Alert banner -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:${estadoBg};border:2px solid ${estadoColor};border-radius:8px;margin:16px 0;">
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0 0 4px 0;font-size:15px;font-weight:700;color:${estadoColor};">📅 Reporte: ${escapeHtml(fechaCorta)} · Hora: ${escapeHtml(p.horaConsulta)}</p>
                    <p style="margin:0;font-size:13px;color:${estadoColor};">
                      Estado: <strong>${estadoLabel}</strong> · Mínimo diario: ${p.otMeta} OT
                    </p>
                  </td>
                </tr>
              </table>

              <!-- KPI cards -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
                <tr>
                  <td width="50%" style="padding:0 4px 0 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#dbeafe;border-radius:8px;">
                      <tr><td style="padding:14px 8px;text-align:center;">
                        <div style="font-size:24px;font-weight:700;color:#1e40af;line-height:1;">${p.otCreadasHoy}</div>
                        <div style="font-size:11px;font-weight:600;color:#1e40af;text-transform:uppercase;margin-top:4px;letter-spacing:0.5px;">OT Generadas Hoy</div>
                      </td></tr>
                    </table>
                  </td>
                  <td width="50%" style="padding:0 0 0 4px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:${estadoBg};border-radius:8px;">
                      <tr><td style="padding:14px 8px;text-align:center;">
                        <div style="font-size:24px;font-weight:700;color:${estadoColor};line-height:1;">${p.otMeta}</div>
                        <div style="font-size:11px;font-weight:600;color:${estadoColor};text-transform:uppercase;margin-top:4px;letter-spacing:0.5px;">Mínimo Requerido</div>
                      </td></tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:18px 0 10px 0;font-size:14px;font-weight:600;color:#1e293b;">
                Detalle de OT generadas hoy:
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
                <thead>
                  <tr>
                    <th style="background:#f1f5f9;color:#475569;padding:10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border:1px solid #e2e8f0;">N° OT</th>
                    <th style="background:#f1f5f9;color:#475569;padding:10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border:1px solid #e2e8f0;">Título</th>
                    <th style="background:#f1f5f9;color:#475569;padding:10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border:1px solid #e2e8f0;">Estado</th>
                    <th style="background:#f1f5f9;color:#475569;padding:10px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border:1px solid #e2e8f0;">Creada</th>
                  </tr>
                </thead>
                <tbody>
                  ${otRows}
                </tbody>
              </table>

              <p style="margin:18px 0 0 0;font-size:14px;line-height:1.6;color:#1e293b;">
                <strong>Acción requerida:</strong> Se solicita al supervisor coordinar la generación de las OT pendientes
                para alcanzar la meta diaria mínima de ${p.otMeta} OT. El sistema continuará enviando recordatorios
                cada hora hasta cumplir la meta o finalizar la jornada.
              </p>

              <p style="margin:12px 0 0 0;font-size:13px;color:#64748b;">
                Este correo es generado automáticamente por el sistema cada hora durante el horario de operaciones
                (08:00–18:00 hora Santiago). Una vez que el supervisor genere las OT mínimas, el sistema
                detendrá los envíos de manera automática.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:14px 28px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center;">
              Correo automático enviado desde ${escapeHtml(OT_EMAIL_FROM)} vía SMTP configurado ·
              No responder directamente a este correo ·
              Condominios CyJ · Supervisor: ${escapeHtml(p.supervisorCodigo)} · ${escapeHtml(p.fecha)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export interface OtSendResult {
  enviado: boolean
  messageId?: string
  error?: string
  motivoNoEnvio?: string
}

/**
 * Envía el correo de alerta. Si la meta ya está cumplida (otCreadasHoy >= otMeta),
 * NO envía el correo y retorna motivoNoEnvio explicando el motivo.
 */
export async function enviarAlertaOtSupervisor(
  payload: OtAlertaPayload,
): Promise<OtSendResult> {
  if (payload.otCreadasHoy >= payload.otMeta) {
    return {
      enviado: false,
      motivoNoEnvio: `Meta cumplida (${payload.otCreadasHoy}/${payload.otMeta} OT) — no se envía alerta`,
    }
  }

  const transport = getTransport()
  if (!transport) {
    console.warn('[OT Alerta] SMTP no configurado — no se envió el correo')
    return {
      enviado: false,
      error:
        'SMTP no configurado (falta SMTP_HOST/SMTP_USER/SMTP_PASSWORD en variables de entorno)',
    }
  }

  const subject = 'NO HAY REGISTRO DE TRABAJOS'
  const html = buildAlertEmailHtml(payload)

  try {
    const info = await transport.sendMail({
      from: `"Sistema Condominios CyJ" <${OT_EMAIL_FROM}>`,
      to: OT_EMAIL_TO,
      cc: OT_EMAIL_CC,
      replyTo: OT_EMAIL_FROM,
      subject,
      html,
    })
    return { enviado: true, messageId: info.messageId }
  } catch (err) {
    console.error('[OT Alerta] Error enviando correo:', err)
    return { enviado: false, error: String(err) }
  }
}
