/**
 * Email helper for Solicitud de Compra notifications.
 *
 * Sends a richly-formatted HTML email to administracionlagunanorte@gmail.com
 * with the full request details. If SMTP env vars are not configured, the
 * function logs a warning and returns gracefully (does NOT throw), so the
 * caller can persist `emailEnviado = false` and still succeed.
 */

import nodemailer, { type Transporter } from 'nodemailer'
import {
  generateSolicitudCompraPdfBuffer,
  type MaterialSolicitud,
} from '@/lib/pdf-solicitud-compra'

// El email se envía DESDE asesoriasintegralescyj@gmail.com (remitente, configurado via SMTP_USER)
// HACIA administracionlagunanorte@gmail.com (destinatario fijo)
export const SOLICITUD_COMPRA_EMAIL_TO = 'administracionlagunanorte@gmail.com'
export const SOLICITUD_COMPRA_EMAIL_FROM = process.env.SMTP_USER || 'asesoriasintegralescyj@gmail.com'

export type { MaterialSolicitud }

export interface EmailSolicitudPayload {
  codigo: string
  titulo: string
  descripcion?: string | null
  prioridad: string
  estado: string
  materiales: MaterialSolicitud[]
  totalEstimado: number
  solicitadoPor?: string | null
  fechaSolicitud?: string | null
  fechaEspera?: string | null
  proveedorSugerido?: string | null
  observaciones?: string | null
  origenCodigo?: string | null
  origenTipo?: string | null
  // Optional: photos and cotizaciones links from origin proyecto/OT
  fotosAntes?: string[]
  fotosDespues?: string[]
  cotizacionesLinks?: string[]
}

let cachedTransport: Transporter | null = null

function hasSmtpConfig(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      (process.env.SMTP_PASSWORD || process.env.SMTP_PASS)
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

function formatCLP(n: number): string {
  const rounded = Math.round(n || 0)
  return `$${rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function buildMaterialesTable(materiales: MaterialSolicitud[]): string {
  if (!materiales || materiales.length === 0) {
    return '<p style="color:#64748b;font-style:italic;">(Sin materiales)</p>'
  }
  const rows = materiales
    .map(
      (m, i) => `
        <tr style="background-color:${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding:8px 12px;border:1px solid #e2e8f0;">${escapeHtml(m.nombre || '')}</td>
          <td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:center;">${m.cantidad}</td>
          <td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:center;">${escapeHtml(m.unidad || '')}</td>
          <td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:right;">${formatCLP(m.precioEstimado)}</td>
          <td style="padding:8px 12px;border:1px solid #e2e8f0;text-align:right;font-weight:600;">${formatCLP(m.total)}</td>
        </tr>`
    )
    .join('')

  return `
    <table style="border-collapse:collapse;width:100%;font-size:13px;font-family:Arial,Helvetica,sans-serif;">
      <thead>
        <tr style="background-color:#0f2040;color:#ffffff;">
          <th style="padding:10px 12px;border:1px solid #0f2040;text-align:left;">Material</th>
          <th style="padding:10px 12px;border:1px solid #0f2040;text-align:center;">Cant.</th>
          <th style="padding:10px 12px;border:1px solid #0f2040;text-align:center;">Unidad</th>
          <th style="padding:10px 12px;border:1px solid #0f2040;text-align:right;">P. Estimado</th>
          <th style="padding:10px 12px;border:1px solid #0f2040;text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
      <tfoot>
        <tr style="background-color:#fef3c7;font-weight:700;">
          <td colspan="4" style="padding:10px 12px;border:1px solid #e2e8f0;text-align:right;">TOTAL ESTIMADO</td>
          <td style="padding:10px 12px;border:1px solid #e2e8f0;text-align:right;font-size:14px;">${formatCLP(
            materiales.reduce((acc, m) => acc + (m.total || 0), 0)
          )}</td>
        </tr>
      </tfoot>
    </table>`
}

export function buildSolicitudHtml(payload: EmailSolicitudPayload): string {
  const {
    codigo,
    titulo,
    descripcion,
    prioridad,
    estado,
    materiales,
    totalEstimado,
    solicitadoPor,
    fechaEspera,
    proveedorSugerido,
    observaciones,
    origenCodigo,
    origenTipo,
  } = payload

  const prioridadColor: Record<string, string> = {
    Baja: '#10b981',
    Media: '#f59e0b',
    Alta: '#f97316',
    Urgente: '#ef4444',
  }

  const rows: { label: string; value: string }[] = [
    { label: 'Código', value: escapeHtml(codigo) },
    { label: 'Título', value: escapeHtml(titulo) },
    { label: 'Estado', value: escapeHtml(estado) },
    {
      label: 'Prioridad',
      value: `<span style="background-color:${prioridadColor[prioridad] || '#64748b'};color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">${escapeHtml(
        prioridad
      )}</span>`,
    },
  ]
  if (solicitadoPor) rows.push({ label: 'Solicitado por', value: escapeHtml(solicitadoPor) })
  if (origenTipo && origenCodigo) {
    rows.push({ label: 'Origen', value: `${escapeHtml(origenTipo)} - ${escapeHtml(origenCodigo)}` })
  } else if (origenTipo) {
    rows.push({ label: 'Origen', value: escapeHtml(origenTipo) })
  }
  if (fechaEspera) rows.push({ label: 'Fecha esperada', value: escapeHtml(fechaEspera) })
  if (proveedorSugerido) rows.push({ label: 'Proveedor sugerido', value: escapeHtml(proveedorSugerido) })

  const infoRowsHtml = rows
    .map(
      (r) => `
      <tr>
        <td style="padding:6px 12px;border:1px solid #e2e8f0;background:#f1f5f9;font-weight:600;width:200px;">${r.label}</td>
        <td style="padding:6px 12px;border:1px solid #e2e8f0;">${r.value}</td>
      </tr>`
    )
    .join('')

  const descripcionHtml = descripcion
    ? `<div style="margin:16px 0;padding:10px 12px;background:#f8fafc;border-left:3px solid #0f2040;font-size:13px;">
        <strong>Descripción:</strong><br/>${escapeHtml(descripcion)}
       </div>`
    : ''

  const observacionesHtml = observaciones
    ? `<div style="margin:16px 0;padding:10px 12px;background:#fffbeb;border-left:3px solid #f59e0b;font-size:13px;">
        <strong>Observaciones:</strong><br/>${escapeHtml(observaciones)}
       </div>`
    : ''

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:800px;">
    <div style="background:#0f2040;color:#fff;padding:20px;border-radius:8px 8px 0 0;">
      <h1 style="margin:0;font-size:20px;">Nueva Solicitud de Compra</h1>
      <p style="margin:4px 0 0;color:#cbd5e1;font-size:13px;">
        Asesorías Integrales CyJ - Administración de Condominios
      </p>
    </div>
    <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;padding:20px;">
      <table style="border-collapse:collapse;width:100%;font-size:13px;margin-bottom:8px;">
        ${infoRowsHtml}
      </table>
      ${descripcionHtml}
      <h2 style="font-size:15px;color:#0f2040;margin:20px 0 8px;">Materiales solicitados</h2>
      ${buildMaterialesTable(materiales)}
      ${observacionesHtml}
      <p style="margin-top:24px;font-size:12px;color:#64748b;">
        Total estimado: <strong style="color:#0f2040;">${formatCLP(totalEstimado)}</strong><br/>
        Este correo fue generado automáticamente por el sistema de gestión de condominios.
      </p>
    </div>
  </div>`
}

export interface SendSolicitudEmailResult {
  ok: boolean
  error?: string
  skipped?: boolean
  messageId?: string
}

/**
 * Sends the solicitud de compra email. Returns gracefully if SMTP is not
 * configured (ok=false, skipped=true) so the caller can mark emailEnviado=false
 * but still succeed the HTTP request.
 *
 * The email includes an HTML body AND a PDF attachment generated with jspdf
 * (see generateSolicitudCompraPdfBuffer). If the PDF generation fails the
 * email is still sent without the attachment, and the error is logged.
 */
export async function sendSolicitudCompraEmail(
  payload: EmailSolicitudPayload
): Promise<SendSolicitudEmailResult> {
  const transport = getTransport()
  if (!transport) {
    console.warn(
      '[SolicitudCompra] SMTP no configurado (SMTP_HOST/SMTP_USER/SMTP_PASSWORD faltantes). ' +
        'El email no se enviará pero la solicitud se guardará correctamente.'
    )
    return { ok: false, skipped: true, error: 'SMTP no configurado' }
  }

  const subject = `Nueva Solicitud de Compra ${payload.codigo} - ${payload.titulo}`
  const html = buildSolicitudHtml(payload)

  // Generate the PDF attachment
  let pdfBuffer: Buffer | null = null
  try {
    pdfBuffer = generateSolicitudCompraPdfBuffer({
      codigo: payload.codigo,
      titulo: payload.titulo,
      descripcion: payload.descripcion,
      prioridad: payload.prioridad,
      estado: payload.estado,
      materiales: payload.materiales,
      totalEstimado: payload.totalEstimado,
      solicitadoPor: payload.solicitadoPor,
      fechaSolicitud: payload.fechaSolicitud,
      fechaEspera: payload.fechaEspera,
      proveedorSugerido: payload.proveedorSugerido,
      observaciones: payload.observaciones,
      origenTipo: payload.origenTipo,
      origenCodigo: payload.origenCodigo,
      fotosAntes: payload.fotosAntes,
      fotosDespues: payload.fotosDespues,
      cotizacionesLinks: payload.cotizacionesLinks,
    })
  } catch (error) {
    console.error(
      '[SolicitudCompra] Error generando PDF adjunto (email se enviará sin adjunto):',
      error
    )
  }

  const attachments =
    pdfBuffer !== null
      ? [
          {
            filename: `Solicitud_${payload.codigo}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ]
      : undefined

  try {
    const info = await transport.sendMail({
      from: `"Sistema Condominios CyJ" <${SOLICITUD_COMPRA_EMAIL_FROM}>`,
      to: SOLICITUD_COMPRA_EMAIL_TO,
      replyTo: SOLICITUD_COMPRA_EMAIL_FROM,
      subject,
      html,
      text: `Nueva Solicitud de Compra ${payload.codigo} - ${payload.titulo}. Total estimado: ${formatCLP(
        payload.totalEstimado
      )}. Ingrese al sistema para ver el detalle.`,
      attachments,
    })
    return { ok: true, messageId: info.messageId }
  } catch (error) {
    console.error('[SolicitudCompra] Error enviando email:', error)
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}
