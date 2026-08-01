/**
 * API para crear el usuario administrador inicial
 *
 * ⚠️ BLOQUEADO en producción por seguridad.
 * ⚠️ No devuelve el password en la respuesta.
 *
 * En producción, use: npm run db:seed
 * O configure: INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD en CI.
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

async function createAdmin() {
  // Verificar si ya existe algún usuario administrador
  const existingAdmin = await db.user.findFirst({
    where: { rol: 'admin' },
    select: { email: true }
  })

  if (existingAdmin) {
    return {
      success: false,
      message: 'Ya existe un usuario administrador',
      error: 'ADMIN_EXISTS'
    }
  }

  // Credenciales desde variables de entorno (defaults solo para dev)
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || 'admin@cyj.cl'
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || 'admin123'

  if (!adminPassword || adminPassword.length < 8) {
    return {
      success: false,
      message: 'INITIAL_ADMIN_PASSWORD debe tener al menos 8 caracteres',
      error: 'WEAK_PASSWORD'
    }
  }

  const hashedPassword = await hashPassword(adminPassword)

  await db.user.create({
    data: {
      email: adminEmail,
      nombre: 'Administrador',
      apellido: 'Sistema',
      password: hashedPassword,
      rol: 'admin',
      activo: true,
      emailVerificado: new Date(),
      permisos: JSON.stringify({
        'usuarios.ver': true, 'usuarios.crear': true, 'usuarios.editar': true, 'usuarios.eliminar': true,
        'residentes.ver': true, 'residentes.crear': true, 'residentes.editar': true, 'residentes.eliminar': true,
        'propiedades.ver': true, 'propiedades.crear': true, 'propiedades.editar': true, 'propiedades.eliminar': true,
        'personal.ver': true, 'personal.crear': true, 'personal.editar': true, 'personal.eliminar': true,
        'proveedores.ver': true, 'proveedores.crear': true, 'proveedores.editar': true, 'proveedores.eliminar': true,
        'ots.ver': true, 'ots.crear': true, 'ots.editar': true, 'ots.eliminar': true, 'ots.aprobar': true,
        'proyectos.ver': true, 'proyectos.crear': true, 'proyectos.editar': true, 'proyectos.eliminar': true,
        'gastos.ver': true, 'gastos.crear': true, 'gastos.editar': true, 'gastos.eliminar': true, 'gastos.aprobar': true,
        'inspecciones.ver': true, 'inspecciones.crear': true, 'inspecciones.editar': true, 'inspecciones.eliminar': true,
        'activos.ver': true, 'activos.crear': true, 'activos.editar': true, 'activos.eliminar': true,
        'catalogos.ver': true, 'catalogos.crear': true, 'catalogos.editar': true, 'catalogos.eliminar': true,
        'centros-costo.ver': true, 'centros-costo.crear': true, 'centros-costo.editar': true, 'centros-costo.eliminar': true,
        'reportes.ver': true, 'reportes.exportar': true,
        'configuracion.ver': true, 'configuracion.editar': true,
        'logs.ver': true,
        'inventario.ver': true, 'inventario.editar': true,
      })
    }
  })

  return {
    success: true,
    message: 'Usuario administrador creado exitosamente',
    user: {
      email: adminEmail,
      rol: 'admin'
    }
    // No devolver el password
  }
}

export async function GET() {
  // Bloquear en producción
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Endpoint deshabilitado en producción. Use npm run db:seed.' },
      { status: 404 }
    )
  }

  try {
    const result = await createAdmin()

    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error creando admin:', error)
    return NextResponse.json({
      success: false,
      error: 'Error al crear usuario administrador'
    }, { status: 500 })
  }
}

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Endpoint deshabilitado en producción. Use npm run db:seed.' },
      { status: 404 }
    )
  }
  return GET()
}
