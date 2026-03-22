/**
 * API de diagnóstico para verificar el estado de la base de datos
 * y crear el usuario administrador si es necesario
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

export async function GET() {
  try {
    // Intentar contar usuarios para verificar conexión
    const userCount = await db.user.count()
    
    // Verificar si existe admin
    const adminExists = await db.user.findFirst({
      where: { rol: 'admin' }
    })
    
    if (adminExists) {
      return NextResponse.json({
        status: 'OK',
        database: 'Conectada',
        userCount,
        adminExists: true,
        message: 'El administrador ya existe. Usa las credenciales:',
        credentials: {
          usuario: 'admin@cyj.cl',
          password: 'admin123'
        }
      })
    }
    
    // Crear admin si no existe
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
    
    return NextResponse.json({
      status: 'OK',
      database: 'Conectada',
      userCount: userCount + 1,
      adminExists: true,
      message: '¡Administrador creado exitosamente!',
      credentials: {
        usuario: admin.email,
        password: 'admin123'
      }
    })
    
  } catch (error) {
    console.error('Error en setup:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    
    return NextResponse.json({
      status: 'ERROR',
      database: 'Error de conexión',
      error: errorMessage,
      help: 'La base de datos no está configurada correctamente.',
      steps: [
        '1. Verifica que DATABASE_URL esté configurado en Vercel',
        '2. Ve a Neon.tech y copia tu cadena de conexión',
        '3. En Vercel, ve a Settings > Environment Variables',
        '4. Agrega DATABASE_URL con el valor de tu conexión Neon',
        '5. Haz un nuevo deploy'
      ]
    }, { status: 500 })
  }
}

export async function POST() {
  return GET()
}
