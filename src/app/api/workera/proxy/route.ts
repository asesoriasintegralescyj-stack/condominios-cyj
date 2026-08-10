/**
 * Proxy API Workera - Server-side
 * -------------------------------
 * Este endpoint actúa como proxy entre el frontend y la API de Workera.
 * Todas las llamadas pasan por aquí para evitar problemas de CORS en el navegador.
 * 
 * Uso: GET /api/workera/proxy?endpoint=employee&page=1
 *      GET /api/workera/proxy?endpoint=attendanceData&start=2026-08-01&end=2026-08-10
 */
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';

const WORKERA_BASE_URL = 'https://api.workera.com/apiClient/v1';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

async function workeraServerFetch(endpoint: string, params: Record<string, string>): Promise<any> {
  const apiUser = process.env.WORKERA_API_USER;
  const apiKey = process.env.WORKERA_API_KEY;

  if (!apiUser || !apiKey) {
    throw new Error('Credenciales de Workera no configuradas en el servidor');
  }

  const url = new URL(`${WORKERA_BASE_URL}/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.append(k, v);
    }
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'API_USER': apiUser,
      'API_KEY': apiKey,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => 'Error desconocido');
    throw new Error(`Workera API ${response.status}: ${text}`);
  }

  return response.json();
}

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || (session.user.rol !== 'admin' && !session.user.permisos?.includes('asistencia'))) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');

    if (!endpoint) {
      return NextResponse.json({ error: 'Falta parámetro endpoint' }, { status: 400 });
    }

    // Validar endpoints permitidos
    const allowedEndpoints = [
      'employee',
      'attendanceData',
      'workshift/assign',
      'workshift/schedules',
      'permission',
      'permissionTypes',
      'overtimeAuthorization',
      'branchOffice',
      'department',
      'timezone',
    ];

    const endpointBase = endpoint.split('?')[0];
    if (!allowedEndpoints.includes(endpointBase)) {
      return NextResponse.json({ error: 'Endpoint no permitido' }, { status: 400 });
    }

    // Recoger todos los query params excepto 'endpoint'
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (key !== 'endpoint') {
        params[key] = value;
      }
    });

    const data = await workeraServerFetch(endpoint, params);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error proxy Workera:', error.message);
    return NextResponse.json(
      { error: error.message || 'Error al conectar con Workera' },
      { status: 502 }
    );
  }
}
