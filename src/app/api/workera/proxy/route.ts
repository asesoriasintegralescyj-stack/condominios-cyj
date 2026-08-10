/**
 * Proxy API Workera - Edge Function
 * ----------------------------------
 * Este endpoint actúa como proxy entre el frontend y la API de Workera.
 * Corre como Edge Function en Vercel, lo que significa que se ejecuta en el
 * PoP (Point of Presence) más cercano al usuario. Para usuarios en Chile,
 * esto es Santiago, Chile - evadiendo el bloqueo geográfico de Workera.
 * 
 * Uso: GET /api/workera/proxy?endpoint=employee&page=1
 *      GET /api/workera/proxy?endpoint=attendanceData&start=2026-08-01&end=2026-08-10
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const WORKERA_BASE_URL = 'https://api.workera.com/apiClient/v1';

// Edge Runtime: corre en el PoP más cercano al usuario
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// Endpoints permitidos
const ALLOWED_ENDPOINTS = [
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

async function workeraFetch(endpoint: string, params: Record<string, string>): Promise<any> {
  const apiUser = process.env.WORKERA_API_USER;
  const apiKey = process.env.WORKERA_API_KEY;

  if (!apiUser || !apiKey) {
    throw new Error('Credenciales de Workera no configuradas');
  }

  const url = new URL(`${WORKERA_BASE_URL}/${endpoint}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v) url.searchParams.append(k, v);
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
    // Verificar autenticación: la cookie de sesión debe existir
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('condominio-cyj-session');

    if (!sessionCookie?.value) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');

    if (!endpoint) {
      return NextResponse.json({ error: 'Falta parámetro endpoint' }, { status: 400 });
    }

    // Validar endpoint
    const endpointBase = endpoint.split('?')[0];
    if (!ALLOWED_ENDPOINTS.includes(endpointBase)) {
      return NextResponse.json({ error: 'Endpoint no permitido' }, { status: 400 });
    }

    // Recoger query params excepto 'endpoint'
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (key !== 'endpoint' && value) {
        params[key] = value;
      }
    });

    const data = await workeraFetch(endpoint, params);
    return NextResponse.json(data);
  } catch (error: any) {
    const message = error.message || 'Error al conectar con Workera';
    const isGeoBlocked = message.includes('Country request') || 
                         message.includes('406') ||
                         message.includes('bloqueada') ||
                         message.includes('blocked');
    
    return NextResponse.json(
      { 
        error: message,
        geoBlocked: isGeoBlocked,
      },
      { status: isGeoBlocked ? 502 : 500 }
    );
  }
}
