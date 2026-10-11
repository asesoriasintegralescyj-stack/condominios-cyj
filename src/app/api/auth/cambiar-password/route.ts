/**
 * API para cambiar la contraseña del usuario autenticado.
 * - Si viene `currentPassword`: el usuario está cambiándola voluntariamente.
 * - Si viene `forceFirstLogin=true`: cambio obligatorio en primer login (no requiere contraseña actual porque ya está autenticado).
 *
 * Crea una Notificación dirigida al usuario y a los administradores.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, verifyPassword, hashPassword, logAction, encrypt } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { currentPassword, newPassword, forceFirstLogin } = body

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json(
        { error: 'La nueva contraseña debe tener al menos 8 caracteres' },
        { status: 400 },
      )
    }

    const user = await db.user.findUnique({ where: { id: session.userId } })
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Si NO es cambio forzado por primer login, validar contraseña actual
    if (!forceFirstLogin) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Debe proporcionar su contraseña actual' },
          { status: 400 },
        )
      }
      const valid = await verifyPassword(currentPassword, user.password)
      if (!valid) {
        return NextResponse.json({ error: 'Contraseña actual incorrecta' }, { status: 400 })
      }
    }

    // No permitir repetir la contraseña actual
    const sameAsCurrent = await verifyPassword(newPassword, user.password)
    if (sameAsCurrent) {
      return NextResponse.json(
        { error: 'La nueva contraseña no puede ser igual a la actual' },
        { status: 400 },
      )
    }

    const hashedPassword = await hashPassword(newPassword)
    const now = new Date()
    const motivo = forceFirstLogin ? 'cambio_forzado' : 'cambio_voluntario'

    // IMPORTANTE: Siempre guardar passwordTemp para que el admin pueda ver
    // la clave actual del usuario, incluso si fue cambiada voluntariamente.
    const encryptedTemp = encrypt(newPassword)

    await db.user.update({
      where: { id: session.userId },
      data: {
        password: hashedPassword,
        lastPasswordChange: now,
        lastPasswordChangeMotivo: motivo,
        cambiarPasswordProximoLogin: false,
        passwordTemp: encryptedTemp,
      },
    })

    // Auditoría
    await logAction(
      session.userId,
      'password_change',
      'User',
      session.userId,
      null,
      { motivo, fecha: now.toISOString() },
    )

    // Crear notificación al propio usuario
    try {
      await db.notificacion.create({
        data: {
          titulo: 'Contraseña actualizada',
          mensaje: `Tu contraseña fue actualizada correctamente el ${now.toLocaleString('es-CL')}. Si no fuiste tú, contacta al administrador de inmediato.`,
          tipo: 'Alerta',
          categoria: 'Seguridad',
          destino: 'Usuario específico',
          destinoId: session.userId,
          leido: false,
        },
      })
    } catch (e) {
      console.error('Error creando notificación al usuario:', e)
    }

    // Crear notificación a administradores
    try {
      const admins = await db.user.findMany({
        where: { rol: 'admin', activo: true },
        select: { id: true },
      })
      if (admins.length > 0) {
        await db.notificacion.createMany({
          data: admins.map((a) => ({
            titulo: 'Cambio de contraseña',
            mensaje: `El usuario ${user.nombre} ${user.apellido || ''} (${user.email}) cambió su contraseña. Motivo: ${motivo === 'cambio_forzado' ? 'primer login (forzado)' : 'cambio voluntario'}.`,
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
      message: 'Contraseña actualizada correctamente',
    })
  } catch (error) {
    console.error('Error en cambiar-password:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// GET auxiliar: devolver estado de la contraseña del usuario autenticado
export async function GET() {
  try {
    const session = await getCurrentSession()
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: {
        cambiarPasswordProximoLogin: true,
        lastPasswordChange: true,
        lastPasswordChangeMotivo: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      cambiarPasswordProximoLogin: user.cambiarPasswordProximoLogin,
      lastPasswordChange: user.lastPasswordChange,
      lastPasswordChangeMotivo: user.lastPasswordChangeMotivo,
    })
  } catch (error) {
    console.error('Error en GET cambiar-password:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
