/**
 * Email utility genérico (Gmail SMTP via nodemailer).
 * Reutilizable por cualquier módulo: rondas, OTs, PMI, etc.
 */

import nodemailer, { type Transporter } from 'nodemailer'

// Remitente y destinatario por defecto
const DEFAULT_FROM = process.env.SMTP_USER || 'asesoriasintegralescyj@gmail.com'
const DEFAULT_TO = 'administracionlagunanorte@gmail.com'

let cachedTransport: Transporter | null = null

export function hasSmtpConfig(): boolean {
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

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export interface SendEmailOptions {
  to?: string
  subject: string
  html: string
  text?: string
  replyTo?: string
  from?: string
  attachments?: Array<{ filename: string; content: Buffer; contentType: string }>
}

export interface SendEmailResult {
  ok: boolean
  error?: string
  skipped?: boolean
  messageId?: string
}

export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  const transport = getTransport()
  if (!transport) {
    console.warn('[Email] SMTP no configurado. Email no enviado.')
    return { ok: false, skipped: true, error: 'SMTP no configurado' }
  }

  try {
    const info = await transport.sendMail({
      from: opts.from || `"Sistema Condominios CyJ" <${DEFAULT_FROM}>`,
      to: opts.to || DEFAULT_TO,
      replyTo: opts.replyTo || DEFAULT_FROM,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      attachments: opts.attachments,
    })
    return { ok: true, messageId: info.messageId }
  } catch (error) {
    console.error('[Email] Error enviando:', error)
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    }
  }
}

/** Cabecera corporativa HTML reutilizable */
export function emailHeader(title: string, subtitle?: string): string {
  return `
    <div style="background:#0f2040;color:#fff;padding:20px;border-radius:8px 8px 0 0;">
      <h1 style="margin:0;font-size:20px;">${escapeHtml(title)}</h1>
      ${subtitle ? `<p style="margin:4px 0 0;color:#cbd5e1;font-size:13px;">${escapeHtml(subtitle)}</p>` : ''}
    </div>`
}

/** Pie de página HTML reutilizable */
export function emailFooter(): string {
  const now = new Date()
  const fecha = new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now)
  return `
    <div style="padding:16px 20px;background:#f1f5f9;border-radius:0 0 8px 8px;font-size:11px;color:#64748b;">
      Reporte generado automáticamente el ${fecha} · Asesorías Integrales CyJ · Administración Condominio Laguna Norte
    </div>`
}

/** Wrapper completo de email HTML */
export function emailWrap(title: string, subtitle: string, bodyHtml: string): string {
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;max-width:800px;margin:0 auto;">
      ${emailHeader(title, subtitle)}
      <div style="border:1px solid #e2e8f0;border-top:none;padding:20px;">
        ${bodyHtml}
      </div>
      ${emailFooter()}
    </div>`
}
