/**
 * API para solicitar recuperación de contraseña.
 * POST { email }
 * - Genera un token único con expiración de 1 hora.
 * - Lo guarda en User.resetToken / resetTokenExp.
 * - Crea una notificación a los administradores.
 * - Si el email no existe, igualmente devuelve 200 para no filtrar usuarios.
 *
 * El envío por email se realiza mediante la utilidad sendPasswordResetEmail.
 * Si no hay configuración SMTP, el token se retorna en la respuesta (solo dev).
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { randomBytes } from 'crypto'
import { logAction } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000 // 1 hora

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const user = await db.user.findUnique({ where: { email: normalizedEmail } })

    // Por seguridad, siempre devolvemos 200 aunque el usuario no exista
    if (!user || !user.activo) {
      return NextResponse.json({
        success: true,
        message: 'Si el email existe, recibirás un enlace de recuperación en breve.',
      })
    }

    // Generar token
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS)

    await db.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExp: expiresAt,
      },
    })

    // Auditoría
    await logAction(
      user.id,
      'password_reset_request',
      'User',
      user.id,
      null,
      { email: normalizedEmail, expiresAt: expiresAt.toISOString() },
    )

    // Construir URL de reseteo
    const baseUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000'
    const resetUrl = `${baseUrl}/reset-password?token=${token}`

    // Crear notificación a administradores
    try {
      const admins = await db.user.findMany({
        where: { rol: 'admin', activo: true },
        select: { id: true },
      })
      if (admins.length > 0) {
        await db.notificacion.createMany({
          data: admins.map((a) => ({
            titulo: 'Solicitud de recuperación de contraseña',
            mensaje: `El usuario ${user.nombre} ${user.apellido || ''} (${user.email}) solicitó recuperar su contraseña. Se envió un enlace de recuperación a su email.`,
            tipo: 'Info',
            categoria: 'Seguridad',
            destino: 'Usuario específico',
            destinoId: a.id,
            leido: false,
          })),
        })
      }
    } catch (e) {
      console.error('Error creando notificaciones a admins:', e)
    }

    // Intentar enviar email (opcional, no bloqueante)
    let emailSent = false
    try {
      // Intento de envío con nodemailer si está configurado
      const nodemailer = await import('nodemailer').catch(() => null)
      if (nodemailer && process.env.EMAIL_SERVER && process.env.EMAIL_FROM) {
        const transporter = nodemailer.createTransport(JSON.parse(process.env.EMAIL_SERVER))
        await transporter.sendMail({
          from: process.env.EMAIL_FROM,
          to: user.email,
          subject: 'Recuperación de Contraseña — Asesorías Integrales CyJ',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
              <h2 style="color: #0A1172;">Recuperación de Contraseña</h2>
              <p>Hola <strong>${user.nombre}</strong>,</p>
              <p>Hemos recibido una solicitud para recuperar tu contraseña en el sistema de Asesorías Integrales CyJ.</p>
              <p>Haz clic en el siguiente botón para establecer una nueva contraseña:</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background: #0A1172; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Cambiar mi contraseña</a>
              </p>
              <p style="font-size: 12px; color: #666;">Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:</p>
              <p style="font-size: 12px; color: #666; word-break: break-all;">${resetUrl}</p>
              <p style="font-size: 12px; color: #666;">Este enlace expirará en 1 hora.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="font-size: 12px; color: #999;">Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña actual permanecerá sin cambios.</p>
            </div>
          `,
        })
        emailSent = true
      }
    } catch (e) {
      console.error('Error enviando email:', e)
    }

    // En desarrollo o si no se pudo enviar el email, devolvemos el token
    // para que el admin pueda compartirlo manualmente.
    if (!emailSent && process.env.NODE_ENV !== 'production') {
      return NextResponse.json({
        success: true,
        message: 'Token de recuperación generado (modo desarrollo).',
        resetUrl,
        token, // ⚠️ solo en desarrollo
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Si el email existe, recibirás un enlace de recuperación en breve.',
    })
  } catch (error) {
    console.error('Error en recuperar-password:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
