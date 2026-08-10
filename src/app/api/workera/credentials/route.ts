/**
 * API para entregar credenciales de Workera al frontend.
 * Solo accesible para administradores autenticados.
 * Las credenciales se usan en el CLIENTE (navegador) para llamar a Workera
 * directamente, evitando el bloqueo geográfico del servidor.
 */

import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  try {
    const session = await getCurrentSession();
    
    if (!session || session.user.rol !== 'admin') {
      return NextResponse.json({ error: 'Solo administrador' }, { status: 403 });
    }

    const apiUser = process.env.WORKERA_API_USER;
    const apiKey = process.env.WORKERA_API_KEY;

    if (!apiUser || !apiKey) {
      return NextResponse.json(
        { error: 'Credenciales de Workera no configuradas' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      apiUser,
      apiKey,
      baseUrl: 'https://api.workera.com/apiClient/v1',
    });
  } catch (error) {
    console.error('Error obteniendo credenciales Workera:', error);
    return NextResponse.json(
      { error: 'Error al obtener credenciales' },
      { status: 500 }
    );
  }
}
