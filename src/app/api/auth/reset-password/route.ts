/**
 * API para restablecer la contraseña usando un token de recuperación.
 * POST { token, newPassword }
 *
 * - Valida el token y su expiración.
 * - Actualiza la contraseña.
 * - Limpia el token.
 * - Crea notificaciones al usuario y a los admins.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, verifyPassword, logAction, encrypt } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, newPassword } = body

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token requerido' }, { status: 400 })
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json(
        { error: 'La nueva contraseña debe tener al menos 8 caracteres' },
        { status: 400 },
      )
    }

    const user = await db.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExp: { gt: new Date() },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Token inválido o expirado. Solicita un nuevo enlace de recuperación.' },
        { status: 400 },
      )
    }

    // No permitir repetir la contraseña actual
    const sameAsCurrent = await verifyPassword(newPassword, user.password)
    if (sameAsCurrent) {
      return NextResponse.json(
        { error: 'La nueva contraseña no puede ser igual a la anterior' },
        { status: 400 },
      )
    }

    const hashedPassword = await hashPassword(newPassword)
    const now = new Date()
    // Guardar passwordTemp para que admin pueda ver la clave recuperada
    const encryptedTemp = encrypt(newPassword)

    await db.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExp: null,
        lastPasswordChange: now,
        lastPasswordChangeMotivo: 'recuperacion',
        cambiarPasswordProximoLogin: false,
        passwordTemp: encryptedTemp,
      },
    })

    // Auditoría
    await logAction(
      user.id,
      'password_reset',
      'User',
      user.id,
      null,
      { fecha: now.toISOString() },
    )

    // Notificación al usuario
    try {
      await db.notificacion.create({
        data: {
          titulo: 'Contraseña restablecida',
          mensaje: `Tu contraseña fue restablecida correctamente el ${now.toLocaleString('es-CL')} mediante el enlace de recuperación. Si no fuiste tú, contacta al administrador de inmediato.`,
          tipo: 'Alerta',
          categoria: 'Seguridad',
          destino: 'Usuario específico',
          destinoId: user.id,
          leido: false,
        },
      })
    } catch (e) {
      console.error('Error creando notificación al usuario:', e)
    }

    // Notificación a administradores
    try {
      const admins = await db.user.findMany({
        where: { rol: 'admin', activo: true },
        select: { id: true },
      })
      if (admins.length > 0) {
        await db.notificacion.createMany({
          data: admins.map((a) => ({
            titulo: 'Contraseña restablecida por recuperación',
            mensaje: `El usuario ${user.nombre} ${user.apellido || ''} (${user.email}) restableció su contraseña mediante el enlace de recuperación.`,
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

    return NextResponse.json({
      success: true,
      message: 'Contraseña restablecida correctamente. Ya puedes iniciar sesión con tu nueva contraseña.',
    })
  } catch (error) {
    console.error('Error en reset-password:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
