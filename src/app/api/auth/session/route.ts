/**
 * API para obtener sesión actual
 * Condominio Laguna Norte - Sistema de Gestión v2
 */

import { NextResponse } from 'next/server';
import { getCurrentSession, getPermissions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  try {
    const session = await getCurrentSession();
    
    if (!session) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }
    
    // Combinar permisos del rol con overrides personalizados del usuario
    const permisos = getPermissions(session.user.rol, session.userPermisos);
    
    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        nombre: session.user.nombre,
        apellido: session.user.apellido,
        rol: session.user.rol,
        permisos,
      },
    });
    
  } catch (error) {
    console.error('Error obteniendo sesión:', error);
    return NextResponse.json(
      { error: 'Error al obtener sesión' },
      { status: 500 }
    );
  }
}
