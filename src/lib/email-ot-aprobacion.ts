/**
 * Email helper para alertas de OT pendientes de aprobación.
 *
 * Envía un correo HTML cuando hay OTs marcadas como "Completado" por el
 * Supervisor (Alfredo Muñoz) pero aún NO aprobadas por el Jefe de
 * Operaciones (Luis García) o por el Administrador.
 *
 * Reutiliza la misma configuración SMTP del sistema.
 *
 * From: asesoriasintegralescyj@gmail.com (SMTP_USER)
 * To:   operaciones.lagunanorte@gmail.com
 * Cc:   administracionlagunanorte@gmail.com
 *
 * Subject: ⚠ OT PENDIENTE DE APROBACIÓN — DD-MM-YYYY (N OTs)
 */

import nodemailer, { type Transporter } from 'nodemailer'

const OT_APROB_EMAIL_FROM = process.env.SMTP_USER || 'asesoriasintegralescyj@gmail.com'
const OT_APROB_EMAIL_TO = 'operaciones.lagunanorte@gmail.com'
const OT_APROB_EMAIL_CC = 'administracionlagunanorte@gmail.com'

// IDs/nombres fijos de los responsables del flujo
const SUPERVISOR_NOMBRE = 'Alfredo Muñoz'        // Crea OTs, las marca Completado
const JEFE_OPERACIONES_NOMBRE = 'Luis García'    // Aprueba en 1ra etapa
const ADMIN_NOMBRE = 'Administrador'             // Aprueba en 2da etapa

export interface OtPendienteAprobacion {
  otNum: string
  titulo: string
  tipo: string
  prioridad: string
  ubicacion: string | null
  estadoAprobacion: string // 'Pendiente', 'Aprobada Supervisor', 'Aprobada Admin', 'Rechazada'
  etapaAprobacionSupervisor: string // 'Pendiente', 'Aprobada', 'Rechazada'
  fechaCompletado: string
  fechaSolicitudAprob: string | null
  completadoPorNombre: string | null
  diasPendiente: number
}

export interface OtAprobacionPayload {
  fecha: string // YYYY-MM-DD
  horaConsulta: string
  totalPendientes: number
  pendientesSupervisor: number // Esperando aprobación de Luis (Jefe Operaciones)
  pendientesAdmin: number      // Esperando aprobación de Admin (ya aprobados por Luis)
  otsPendientes: OtPendienteAprobacion[]
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

function formatFechaCorta(iso: string): string {
  try {
    const d = new Date(iso)
    const santiago = new Date(d.getTime() - 4 * 60 * 60 * 1000)
    const dd = String(santiago.getUTCDate()).padStart(2, '0')
    const mm = String(santiago.getUTCMonth() + 1).padStart(2, '0')
    const yyyy = santiago.getUTCFullYear()
    const hh = String(santiago.getUTCHours()).padStart(2, '0')
    const mins = String(santiago.getUTCMinutes()).padStart(2, '0')
    return `${dd}-${mm}-${yyyy} ${hh}:${mins}`
  } catch {
    return iso
  }
}

function etapaBadgeColor(etapaSupervisor: string, etapaAdmin: string | null): { bg: string; color: string; label: string } {
  // Etapa supervisor: 'Pendiente' | 'Aprobada' | 'Rechazada'
  // Etapa admin: 'Pendiente' | 'Aprobada' | 'Rechazada' | null
  if (etapaSupervisor === 'Rechazada' || etapaAdmin === 'Rechazada') {
    return { bg: '#fee2e2', color: '#991b1b', label: 'RECHAZADA' }
  }
  if (etapaAdmin === 'Aprobada') {
    return { bg: '#dcfce7', color: '#166534', label: 'APROBADA FINAL' }
  }
  if (etapaSupervisor === 'Aprobada') {
    return { bg: '#fef3c7', color: '#92400e', label: 'ESPERA ADMIN' }
  }
  return { bg: '#dbeafe', color: '#1e40af', label: 'ESPERA LUIS' }
}

function buildAprobacionEmailHtml(p: OtAprobacionPayload): string {
  const fechaLarga = formatFechaLarga(p.fecha)
  const fechaCorta = p.fecha.split('-').reverse().join('-')

  const otRows = p.otsPendientes.length
    ? p.otsPendientes
        .map((ot) => {
          const badge = etapaBadgeColor(ot.etapaAprobacionSupervisor, ot.estadoAprobacion)
          return `
        <tr>
          <td style="font-family:Menlo,Consolas,monospace;font-size:12px;font-weight:700;color:#1e40af;padding:8px 10px;border:1px solid #e2e8f0;background:#eff6ff;">${escapeHtml(ot.otNum)}</td>
          <td style="font-weight:600;color:#0f172a;padding:8px 10px;border:1px solid #e2e8f0;">${escapeHtml(ot.titulo)}</td>
          <td style="color:#475569;padding:8px 10px;border:1px solid #e2e8f0;font-size:12px;">${escapeHtml(ot.tipo)} / ${escapeHtml(ot.prioridad)}</td>
          <td style="color:#64748b;padding:8px 10px;border:1px solid #e2e8f0;font-size:12px;">${escapeHtml(ot.ubicacion || '—')}</td>
          <td style="padding:8px 10px;border:1px solid #e2e8f0;">
            <span style="display:inline-block;padding:3px 8px;border-radius:4px;background:${badge.bg};color:${badge.color};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.3px;">${escapeHtml(badge.label)}</span>
          </td>
          <td style="color:#64748b;font-size:12px;padding:8px 10px;border:1px solid #e2e8f0;">${escapeHtml(formatFechaCorta(ot.fechaCompletado))}</td>
          <td style="color:#475569;font-size:12px;padding:8px 10px;border:1px solid #e2e8f0;text-align:center;">${ot.diasPendiente}d</td>
        </tr>`
        })
        .join('')
    : `<tr><td colspan="7" style="padding:18px;text-align:center;color:#166534;font-weight:600;background:#f0fdf4;border:1px solid #bbf7d0;">✓ No hay OT pendientes de aprobación</td></tr>`

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>OT Pendientes de Aprobación — ${escapeHtml(fechaCorta)}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e40af 0%,#1e3a8a 100%);padding:24px 28px;color:#ffffff;">
              <h1 style="margin:0 0 4px 0;font-size:22px;font-weight:700;">⚠ OT PENDIENTE DE APROBACIÓN</h1>
              <p style="margin:0;font-size:13px;opacity:0.92;">Reporte de OTs marcadas como Completadas que requieren revisión — Condominios Laguna Norte CyJ</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:24px 28px;">
              <p style="margin:0 0 12px 0;font-size:14px;line-height:1.6;color:#1e293b;">
                Estimado equipo,
              </p>

              <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#1e293b;">
                El sistema registra que al cierre de las <strong>${escapeHtml(p.horaConsulta)}</strong> horas del día
                <strong>${escapeHtml(fechaLarga)}</strong>, existen
                <strong style="color:#1e40af;">${p.totalPendientes} OT(s)</strong> marcadas como
                <em>Completado</em> por <strong>${escapeHtml(SUPERVISOR_NOMBRE)}</strong> (Supervisor Móvil)
                que requieren aprobación del flujo:
              </p>

              <!-- Resumen del flujo -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:2px solid #1e40af;border-radius:8px;margin:16px 0;">
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0 0 6px 0;font-size:13px;font-weight:700;color:#1e40af;">📋 Flujo de aprobación de OT:</p>
                    <p style="margin:0;font-size:12px;color:#1e3a8a;line-height:1.6;">
                      <strong>1.</strong> ${escapeHtml(SUPERVISOR_NOMBRE)} (Supervisor) ejecuta y marca OT como Completado →<br>
                      <strong>2.</strong> ${escapeHtml(JEFE_OPERACIONES_NOMBRE)} (Jefe de Operaciones) revisa y aprueba la terminación →<br>
                      <strong>3.</strong> ${escapeHtml(ADMIN_NOMBRE)} revisa y da aprobación final para liberar materiales (SC automática)
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
                        <div style="font-size:24px;font-weight:700;color:#1e40af;line-height:1;">${p.totalPendientes}</div>
                        <div style="font-size:10px;font-weight:600;color:#1e40af;text-transform:uppercase;margin-top:4px;letter-spacing:0.5px;">Total Pendientes</div>
                      </td></tr>
                    </table>
                  </td>
                  <td width="33%" style="padding:0 4px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fef3c7;border-radius:8px;">
                      <tr><td style="padding:14px 8px;text-align:center;">
                        <div style="font-size:24px;font-weight:700;color:#92400e;line-height:1;">${p.pendientesSupervisor}</div>
                        <div style="font-size:10px;font-weight:600;color:#92400e;text-transform:uppercase;margin-top:4px;letter-spacing:0.5px;">Esperan a ${escapeHtml(JEFE_OPERACIONES_NOMBRE.split(' ')[0])}</div>
                      </td></tr>
                    </table>
                  </td>
                  <td width="34%" style="padding:0 0 0 4px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fee2e2;border-radius:8px;">
                      <tr><td style="padding:14px 8px;text-align:center;">
                        <div style="font-size:24px;font-weight:700;color:#991b1b;line-height:1;">${p.pendientesAdmin}</div>
                        <div style="font-size:10px;font-weight:600;color:#991b1b;text-transform:uppercase;margin-top:4px;letter-spacing:0.5px;">Esperan al Admin</div>
                      </td></tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:18px 0 10px 0;font-size:14px;font-weight:600;color:#1e293b;">
                📋 Detalle de OT pendientes:
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:12px;">
                <thead>
                  <tr>
                    <th style="background:#f1f5f9;color:#475569;padding:8px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;border:1px solid #e2e8f0;">N° OT</th>
                    <th style="background:#f1f5f9;color:#475569;padding:8px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;border:1px solid #e2e8f0;">Título</th>
                    <th style="background:#f1f5f9;color:#475569;padding:8px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;border:1px solid #e2e8f0;">Tipo/Prior.</th>
                    <th style="background:#f1f5f9;color:#475569;padding:8px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;border:1px solid #e2e8f0;">Ubicación</th>
                    <th style="background:#f1f5f9;color:#475569;padding:8px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;border:1px solid #e2e8f0;">Etapa</th>
                    <th style="background:#f1f5f9;color:#475569;padding:8px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;border:1px solid #e2e8f0;">Completada</th>
                    <th style="background:#f1f5f9;color:#475569;padding:8px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;border:1px solid #e2e8f0;">Días</th>
                  </tr>
                </thead>
                <tbody>
                  ${otRows}
                </tbody>
              </table>

              <p style="margin:18px 0 0 0;font-size:14px;line-height:1.6;color:#1e293b;">
                <strong>Acción requerida:</strong>
                ${p.pendientesSupervisor > 0
                  ? `${escapeHtml(JEFE_OPERACIONES_NOMBRE)} debe revisar y aprobar/rechazar las OT en etapa "ESPERA LUIS" desde el módulo de Aprobaciones del sistema.`
                  : ''}
                ${p.pendientesAdmin > 0
                  ? `${p.pendientesSupervisor > 0 ? '<br>' : ''}El Administrador debe dar aprobación final a las OT en etapa "ESPERA ADMIN" para liberar las Solicitudes de Compra asociadas.`
                  : ''}
                ${p.totalPendientes === 0 ? 'No hay acciones pendientes. ✅' : ''}
              </p>

              <p style="margin:12px 0 0 0;font-size:13px;color:#64748b;">
                Este correo es generado automáticamente por el sistema cada hora cuando hay OT pendientes.
                Las OT se marcan como Completado cuando ${escapeHtml(SUPERVISOR_NOMBRE)} finaliza la ejecución en terreno.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:14px 28px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center;">
              Correo automático enviado desde ${escapeHtml(OT_APROB_EMAIL_FROM)} vía SMTP configurado ·
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

export interface OtAprobSendResult {
  enviado: boolean
  messageId?: string
  error?: string
  motivoNoEnvio?: string
}

/**
 * Envía el correo. Si no hay OT pendientes, NO envía (motivoNoEnvio explicará).
 */
export async function enviarAlertaOtPendientesAprobacion(
  payload: OtAprobacionPayload,
): Promise<OtAprobSendResult> {
  if (payload.totalPendientes === 0) {
    return {
      enviado: false,
      motivoNoEnvio: 'No hay OT pendientes de aprobación — no se envía alerta',
    }
  }

  const transport = getTransport()
  if (!transport) {
    console.warn('[OT Aprobación] SMTP no configurado — no se envió el correo')
    return {
      enviado: false,
      error:
        'SMTP no configurado (falta SMTP_HOST/SMTP_USER/SMTP_PASSWORD en variables de entorno)',
    }
  }

  const fechaCorta = payload.fecha.split('-').reverse().join('-')
  const subject = `⚠ OT PENDIENTE DE APROBACIÓN — ${fechaCorta} (${payload.totalPendientes} OTs)`
  const html = buildAprobacionEmailHtml(payload)

  try {
    const info = await transport.sendMail({
      from: `"Sistema Condominios CyJ" <${OT_APROB_EMAIL_FROM}>`,
      to: OT_APROB_EMAIL_TO,
      cc: OT_APROB_EMAIL_CC,
      replyTo: OT_APROB_EMAIL_FROM,
      subject,
      html,
    })
    return { enviado: true, messageId: info.messageId }
  } catch (err) {
    console.error('[OT Aprobación] Error enviando correo:', err)
    return { enviado: false, error: String(err) }
  }
}
