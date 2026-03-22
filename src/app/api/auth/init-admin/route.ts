/**
 * API para crear el usuario administrador inicial
 * Accesible vía GET para facilitar la configuración inicial
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

async function createAdmin() {
  // Verificar si ya existe algún usuario administrador
  const existingAdmin = await db.user.findFirst({
    where: { rol: 'admin' }
  })
  
  if (existingAdmin) {
    return { 
      success: false,
      message: 'Ya existe un usuario administrador',
      error: 'ADMIN_EXISTS'
    }
  }
  
  // Crear usuario administrador con credenciales conocidas
  const hashedPassword = await hashPassword('admin123')
  
  const admin = await db.user.create({
    data: {
      email: 'admin@cyj.cl',
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
      email: admin.email,
      nombre: admin.nombre,
      rol: admin.rol
    },
    credentials: {
      usuario: 'admin@cyj.cl',
      password: 'admin123'
    }
  }
}

export async function GET() {
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
      error: 'Error al crear usuario administrador',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST() {
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
      error: 'Error al crear usuario administrador',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
