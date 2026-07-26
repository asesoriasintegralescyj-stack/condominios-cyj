/**
 * Email helper para RESUMEN DIARIO de OT del supervisor SUP1.
 *
 * Envía un correo HTML con un resumen de las OT creadas por el supervisor
 * (rol='supervisor', etiquetado como SUP1) durante el día en curso
 * (America/Santiago), agrupadas por estado.
 *
 * Comportamiento:
 *   - Si otCreadasHoy < otMeta (3): Subject = "NO HAY REGISTRO DE TRABAJOS"
 *     (alerta, banda roja, indica OT faltantes)
 *   - Si otCreadasHoy >= otMeta: Subject = "RESUMEN DIARIO DE OT — DD-MM-YYYY (N OTs)"
 *     (reporte informativo, banda verde, meta cumplida)
 *
 * El correo SIEMPRE se envía cuando se invoca al endpoint (no se omite
 * aunque la meta esté cumplida), para que Operaciones reciba el resumen
 * diario completo con la lista de OT y su estado.
 *
 * Reutiliza la misma configuración SMTP que el resto del sistema
 * (SMTP_HOST, SMTP_USER, SMTP_PASSWORD). Si no hay SMTP configurado,
 * registra un warning y retorna gracefully sin lanzar error.
 *
 * From: asesoriasintegralescyj@gmail.com (SMTP_USER)
 * To:   operaciones.lagunanorte@gmail.com
 * Cc:   administracionlagunanorte@gmail.com
 */

import nodemailer, { type Transporter } from 'nodemailer'

const OT_EMAIL_FROM = process.env.SMTP_USER || 'asesoriasintegralescyj@gmail.com'
const OT_EMAIL_TO = 'operaciones.lagunanorte@gmail.com'
const OT_EMAIL_CC = 'administracionlagunanorte@gmail.com'

export interface OtResumenEstado {
  pendiente: number
  enProgreso: number
  completado: number
  cancelado: number
}

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
  resumenPorEstado: OtResumenEstado
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

function formatHoraCorta(iso: string): string {
  try {
    const d = new Date(iso)
    // Convertir a Santiago UTC-4
    const santiago = new Date(d.getTime() - 4 * 60 * 60 * 1000)
    const hh = String(santiago.getUTCHours()).padStart(2, '0')
    const mm = String(santiago.getUTCMinutes()).padStart(2, '0')
    return `${hh}:${mm}`
  } catch {
    return iso
  }
}

function estadoBadgeColor(estado: string): { bg: string; color: string } {
  const e = (estado || '').toLowerCase()
  if (e.includes('complet')) return { bg: '#dcfce7', color: '#166534' }
  if (e.includes('progres')) return { bg: '#dbeafe', color: '#1e40af' }
  if (e.includes('cancel')) return { bg: '#fee2e2', color: '#991b1b' }
  if (e.includes('pendient')) return { bg: '#fef3c7', color: '#92400e' }
  return { bg: '#f1f5f9', color: '#475569' }
}

function buildAlertEmailHtml(p: OtAlertaPayload): string {
  const fechaLarga = formatFechaLarga(p.fecha)
  const fechaCorta = p.fecha.split('-').reverse().join('-') // DD-MM-YYYY

  const cumpleMeta = p.otCreadasHoy >= p.otMeta
  const faltantes = Math.max(0, p.otMeta - p.otCreadasHoy)

  const estadoColor = cumpleMeta ? '#166534' : '#991b1b'
  const estadoBg = cumpleMeta ? '#dcfce7' : '#fee2e2'
  const estadoLabel = cumpleMeta
    ? 'META CUMPLIDA'
    : `FALTAN ${faltantes} OT POR GENERAR`

  // Cards de resumen por estado
  const estados = [
    { label: 'Pendiente', value: p.resumenPorEstado.pendiente, bg: '#fef3c7', color: '#92400e' },
    { label: 'En Progreso', value: p.resumenPorEstado.enProgreso, bg: '#dbeafe', color: '#1e40af' },
    { label: 'Completado', value: p.resumenPorEstado.completado, bg: '#dcfce7', color: '#166534' },
    { label: 'Cancelado', value: p.resumenPorEstado.cancelado, bg: '#fee2e2', color: '#991b1b' },
  ]

  const estadoCards = estados
    .map(
      (e) => `
      <td width="25%" style="padding:0 4px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:${e.bg};border-radius:8px;">
          <tr><td style="padding:14px 6px;text-align:center;">
            <div style="font-size:24px;font-weight:700;color:${e.color};line-height:1;">${e.value}</div>
            <div style="font-size:10px;font-weight:600;color:${e.color};text-transform:uppercase;margin-top:4px;letter-spacing:0.5px;">${escapeHtml(e.label)}</div>
          </td></tr>
        </table>
      </td>`,
    )
    .join('')

  // Filas de OT (todas las creadas hoy)
  const otRows = p.otRecientes.length
    ? p.otRecientes
        .map((ot) => {
          const badge = estadoBadgeColor(ot.estado)
          return `
        <tr>
          <td style="font-family:Menlo,Consolas,monospace;font-size:12px;font-weight:700;color:#1e40af;padding:8px 10px;border:1px solid #e2e8f0;background:#eff6ff;">${escapeHtml(ot.otNum)}</td>
          <td style="font-weight:600;color:#0f172a;padding:8px 10px;border:1px solid #e2e8f0;">${escapeHtml(ot.titulo)}</td>
          <td style="padding:8px 10px;border:1px solid #e2e8f0;">
            <span style="display:inline-block;padding:3px 8px;border-radius:4px;background:${badge.bg};color:${badge.color};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.3px;">${escapeHtml(ot.estado)}</span>
          </td>
          <td style="color:#64748b;font-size:12px;padding:8px 10px;border:1px solid #e2e8f0;">${escapeHtml(formatHoraCorta(ot.createdAt))} hrs</td>
        </tr>`
        })
        .join('')
    : `<tr><td colspan="4" style="padding:18px;text-align:center;color:#991b1b;font-weight:600;background:#fef2f2;border:1px solid #fecaca;">⚠ SIN REGISTROS — El supervisor no ha generado OT durante el día</td></tr>`

  // Header adaptativo
  const headerGradient = cumpleMeta
    ? 'linear-gradient(135deg,#166534 0%,#14532d 100%)'
    : 'linear-gradient(135deg,#991b1b 0%,#7f1d1d 100%)'
  const headerTitle = cumpleMeta
    ? `RESUMEN DIARIO DE OT — ${escapeHtml(fechaCorta)}`
    : 'NO HAY REGISTRO DE TRABAJOS'
  const headerSubtitle = cumpleMeta
    ? `Reporte diario del supervisor ${escapeHtml(p.supervisorCodigo)} — Condominios Laguna Norte CyJ`
    : `Alerta automática de supervisor ${escapeHtml(p.supervisorCodigo)} — Condominios Laguna Norte CyJ`

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(headerTitle)}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="background:${headerGradient};padding:24px 28px;color:#ffffff;">
              <h1 style="margin:0 0 4px 0;font-size:22px;font-weight:700;">${escapeHtml(headerTitle)}</h1>
              <p style="margin:0;font-size:13px;opacity:0.92;">${headerSubtitle}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:24px 28px;">
              <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#1e293b;">
                Estimado equipo de operaciones,
              </p>

              <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#1e293b;">
                El sistema de gestión <strong>Condominios Laguna Norte — CyJ</strong> registra que al cierre
                de las <strong>${escapeHtml(p.horaConsulta)}</strong> horas del día
                <strong>${escapeHtml(fechaLarga)}</strong>, el supervisor
                <strong style="color:${estadoColor};">${escapeHtml(p.supervisorNombre)} (${escapeHtml(p.supervisorCodigo)})</strong>
                ha generado <strong style="color:${estadoColor};">${p.otCreadasHoy} OT</strong>
                de un mínimo requerido de <strong>${p.otMeta} OT diarias</strong>.
              </p>

              <!-- Alert banner -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:${estadoBg};border:2px solid ${estadoColor};border-radius:8px;margin:16px 0;">
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0 0 4px 0;font-size:15px;font-weight:700;color:${estadoColor};">📅 Reporte: ${escapeHtml(fechaCorta)} · Hora: ${escapeHtml(p.horaConsulta)} hrs</p>
                    <p style="margin:0;font-size:13px;color:${estadoColor};">
                      Estado: <strong>${estadoLabel}</strong> · Mínimo diario: ${p.otMeta} OT
                    </p>
                  </td>
                </tr>
              </table>

              <!-- KPI cards: OT generadas vs meta -->
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

              <!-- Resumen por estado -->
              <p style="margin:18px 0 10px 0;font-size:14px;font-weight:600;color:#1e293b;">
                📊 Resumen por estado:
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;">
                <tr>${estadoCards}</tr>
              </table>

              <!-- Detalle de OT -->
              <p style="margin:18px 0 10px 0;font-size:14px;font-weight:600;color:#1e293b;">
                📋 Detalle de OT creadas hoy (ordenadas por más reciente):
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

              <!-- Resumen ejecutivo -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:8px;margin:18px 0 0 0;padding:14px 18px;border-left:4px solid ${estadoColor};">
                <tr>
                  <td>
                    <p style="margin:0 0 6px 0;font-size:14px;font-weight:700;color:${estadoColor};">📝 Resumen ejecutivo</p>
                    <p style="margin:0;font-size:13px;line-height:1.6;color:#1e293b;">
                      De las <strong>${p.otCreadasHoy} OT</strong> creadas por ${escapeHtml(p.supervisorCodigo)} durante el día:
                      <strong>${p.resumenPorEstado.completado}</strong> completada(s),
                      <strong>${p.resumenPorEstado.enProgreso}</strong> en progreso,
                      <strong>${p.resumenPorEstado.pendiente}</strong> pendiente(s) y
                      <strong>${p.resumenPorEstado.cancelado}</strong> cancelada(s).
                      ${cumpleMeta
                        ? `Meta diaria de <strong>${p.otMeta} OT</strong> cumplida. ✅`
                        : `Faltan <strong>${faltantes} OT</strong> para alcanzar la meta diaria de <strong>${p.otMeta} OT</strong>. ⚠`
                      }
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:14px 0 0 0;font-size:13px;color:#64748b;">
                Este correo es generado automáticamente por el sistema. El reporte se envía al cierre
                de la jornada (18:00 hora Santiago) con el detalle completo de las OT creadas durante el día.
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
 * Envía el correo de resumen diario. Siempre envía el correo (incluso si
 * la meta está cumplida), con subject adaptativo:
 *   - Meta cumplida → "RESUMEN DIARIO DE OT — DD-MM-YYYY (N OTs)"
 *   - Meta no cumplida → "NO HAY REGISTRO DE TRABAJOS"
 */
export async function enviarAlertaOtSupervisor(
  payload: OtAlertaPayload,
): Promise<OtSendResult> {
  const transport = getTransport()
  if (!transport) {
    console.warn('[OT Resumen] SMTP no configurado — no se envió el correo')
    return {
      enviado: false,
      error:
        'SMTP no configurado (falta SMTP_HOST/SMTP_USER/SMTP_PASSWORD en variables de entorno)',
    }
  }

  const fechaCorta = payload.fecha.split('-').reverse().join('-')
  const cumpleMeta = payload.otCreadasHoy >= payload.otMeta

  // Subject adaptativo: alerta si meta no cumplida, resumen informativo si cumplida
  const subject = cumpleMeta
    ? `RESUMEN DIARIO DE OT — ${fechaCorta} (${payload.otCreadasHoy} OTs)`
    : 'NO HAY REGISTRO DE TRABAJOS'

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
    console.error('[OT Resumen] Error enviando correo:', err)
    return { enviado: false, error: String(err) }
  }
}
