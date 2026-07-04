/**
 * API de Login Personalizada
 * Condominio Laguna Norte - Sistema de Gestión v2
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  authenticateUser, 
  setSessionCookie, 
  logAction,
  getPermissions,
  verifySession
} from '@/lib/auth';
import { db as prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;
    
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }
    
    const rawIp = request.headers.get('x-forwarded-for') ||
                  request.headers.get('x-real-ip') ||
                  'unknown';
    const ip = Array.isArray(rawIp) ? rawIp[0] : rawIp.split(',')[0].trim();
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const result = await authenticateUser(
      email,
      password,
      userAgent,
      ip
    );
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 401 }
      );
    }
    
    // Establecer cookie de sesión
    await setSessionCookie(result.token!);
    
    // Obtener datos del usuario
    const session = await verifySession(result.token!);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Error al crear sesión' },
        { status: 500 }
      );
    }
    
    const permisos = getPermissions(session.user.rol);
    
    // Verificar si el usuario debe cambiar su contraseña en el primer login
    const userRows = await prisma.$queryRawUnsafe(`SELECT "cambiarPasswordProximoLogin" FROM "User" WHERE "id" = $1`, session.user.id) as any[]
    const userFull = userRows[0]
    
    return NextResponse.json({
      success: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        nombre: session.user.nombre,
        apellido: session.user.apellido,
        rol: session.user.rol,
        permisos,
      },
      // Si true, el frontend debe mostrar el modal de cambio de contraseña obligatorio
      cambiarPasswordProximoLogin: userFull?.cambiarPasswordProximoLogin || false,
    });
    
  } catch (error) {
    console.error('Error en login:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
