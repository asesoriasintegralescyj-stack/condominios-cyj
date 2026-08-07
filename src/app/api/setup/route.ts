/**
 * API de diagnóstico para verificar el estado de la base de datos.
 *
 * ⚠️ CREACIÓN DE ADMIN REMOVIDA por seguridad.
 *
 * El admin inicial debe crearse vía script local:
 *   npm run db:seed
 *
 * O usando variables de entorno en CI:
 *   INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD
 *
 * En producción este endpoint solo retorna diagnóstico (sin crear usuarios).
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET() {
  // Bloquear creación de admin en producción
  if (process.env.NODE_ENV === 'production') {
    // Solo mostrar diagnóstico mínimo en producción
    try {
      const userCount = await db.user.count();
      return NextResponse.json({
        status: 'OK',
        database: 'Conectada',
        userCount,
        message: 'Producción. Use npm run db:seed localmente para crear admins.'
      })
    } catch (error) {
      console.error('Error en setup (producción):', error)
      return NextResponse.json(
        { status: 'ERROR', error: 'Error de conexión a la base de datos' },
        { status: 500 }
      )
    }
  }

  // En desarrollo: diagnóstico completo
  try {
    const userCount = await db.user.count()

    const adminExists = await db.user.findFirst({
      where: { rol: 'admin' },
      select: { email: true }
    })

    return NextResponse.json({
      status: 'OK',
      database: 'Conectada',
      userCount,
      adminExists: !!adminExists,
      adminEmail: adminExists?.email || null,
      message: adminExists
        ? 'Admin ya existe. Use las credenciales configuradas.'
        : 'No hay admin. Ejecute: npm run db:seed'
    })
  } catch (error) {
    console.error('Error en setup (dev):', error)
    return NextResponse.json(
      {
        status: 'ERROR',
        database: 'Error de conexión',
        error: 'Error al conectar a la base de datos',
        help: 'Verifique DATABASE_URL en .env.local'
      },
      { status: 500 }
    )
  }
}

export async function POST() {
  return GET()
}
