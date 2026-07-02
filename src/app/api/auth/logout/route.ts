/**
 * API de Logout
 * Condominio Laguna Norte - Sistema de Gestión v2
 */

import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie, getCurrentSession, logAction } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    
    if (session) {
      // Registrar logout en logs
      const ip = request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';
      
      await logAction(
        session.userId, 
        'logout', 
        'User', 
        session.userId, 
        null, 
        null, 
        ip,
        userAgent
      );
    }
    
    // Limpiar cookie de sesión
    await clearSessionCookie();
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Error en logout:', error);
    return NextResponse.json(
      { error: 'Error al cerrar sesión' },
      { status: 500 }
    );
  }
}
