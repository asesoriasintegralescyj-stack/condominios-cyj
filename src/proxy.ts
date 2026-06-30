/**
 * Proxy de Protección de Rutas (Next.js 16)
 * Reemplaza middleware.ts deprecado
 *
 * Sistema de Gestión de Condominios v3
 * Asesorías Integrales CyJ SpA
 *
 * Incluye:
 * - Rate limiting por IP (Edge Runtime compatible)
 * - Autenticación de sesiones
 * - Protección de rutas
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  checkRateLimit,
  getClientIp,
  getEndpointTypeWithMethod,
  getRateLimitEndpoint,
  shouldRateLimit,
  createRateLimitResponse,
} from '@/lib/rate-limit';

// Rutas que no requieren autenticación
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/session',
  '/api/auth/[...nextauth]',
  '/api/auth/init-admin',
  '/api/seed',
  '/api/seed-catalogos',
  '/api/setup',
  '/api/descargar',
  // Página pública de herramientas accedida desde QR
  '/h',
  // QR de herramientas (imagen pública accesible sin auth)
  '/api/herramientas',
  // Página pública de activos accedida desde QR
  '/a',
  // Página pública de registro de rondas accedida desde QR
  '/ronda',
  // Listas desplegables: GET es público para que el frontend pueda cargar opciones de dropdowns
  // POST/PUT/DELETE validan autenticación internamente
  '/api/listas-desplegables',
];

// Rutas públicas adicionales evaluadas por patrón regex
// (ej: /api/activos/<id>/qr — la imagen QR debe ser accesible sin auth,
// pero el resto de /api/activos sigue protegido)
const PUBLIC_ROUTE_PATTERNS: RegExp[] = [
  /^\/api\/activos\/[^/]+\/qr$/,
];

// Verificar si una ruta es pública
function isPublicRoute(pathname: string): boolean {
  // Chequeo por patrón regex (rutas QR públicas de activos)
  if (PUBLIC_ROUTE_PATTERNS.some((pattern) => pattern.test(pathname))) {
    return true;
  }
  return PUBLIC_ROUTES.some(route => {
    if (route.includes('[...')) {
      const baseRoute = route.replace('[...nextauth]', '');
      return pathname.startsWith(baseRoute);
    }
    return pathname === route || pathname.startsWith(route + '/');
  });
}

// Rutas de API que requieren autenticación admin
const PROTECTED_API_ROUTES = [
  '/api/propiedades',
  '/api/personal',
  '/api/proveedores',
  '/api/ordenes-trabajo',
  '/api/proyectos',
  '/api/inspecciones',
  '/api/activos',
  '/api/catalogos',
  '/api/centros-costo',
  '/api/dashboard',
  '/api/caja-chica',
  '/api/pdf',
  '/api/usuarios',
  '/api/condominios',
  '/api/asistencia',
  '/api/auditoria',
  '/api/backups',
  '/api/inventario',
  '/api/cumplimiento',
  '/api/rondas',
  '/api/notificaciones',
  '/api/aprobaciones',
  '/api/aprobaciones-ot',
  '/api/solicitudes-compra',
];

// Verificar si una ruta de API necesita protección
function isProtectedApiRoute(pathname: string): boolean {
  return PROTECTED_API_ROUTES.some(route => pathname.startsWith(route));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Permitir archivos estáticos
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') // Archivos con extensión
  ) {
    return NextResponse.next();
  }

  // === RATE LIMITING ===
  // Aplicar rate limiting a las rutas de API
  if (shouldRateLimit(pathname)) {
    const clientIp = getClientIp(request);
    const endpoint = getRateLimitEndpoint(pathname);
    const endpointType = getEndpointTypeWithMethod(pathname, method);

    const rateLimitResult = await checkRateLimit(
      clientIp,
      endpoint,
      endpointType
    );

    // Si el rate limit fue excedido, retornar 429
    if (!rateLimitResult.allowed) {
      console.warn(`[Rate Limit] IP ${clientIp} bloqueada en ${endpoint}`);
      return createRateLimitResponse(rateLimitResult);
    }
  }

  // Permitir rutas públicas (pero ya pasaron el rate limit)
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Obtener token de sesión de las cookies
  const sessionToken = request.cookies.get('condominio_session')?.value;

  // Si no hay token y es una ruta protegida
  if (!sessionToken) {
    // Si es API, retornar 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'No autenticado', authenticated: false },
        { status: 401 }
      );
    }

    // Si es página, redirigir a login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verificar sesión en la base de datos (solo para rutas críticas)
  if (isProtectedApiRoute(pathname)) {
    try {
      // Hacer una petición interna para verificar la sesión
      const verifyResponse = await fetch(new URL('/api/auth/session', request.url), {
        headers: {
          Cookie: `condominio_session=${sessionToken}`,
        },
      });

      if (!verifyResponse.ok) {
        // Sesión inválida
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { error: 'Sesión expirada', authenticated: false },
            { status: 401 }
          );
        }

        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }
    } catch (error) {
      console.error('Error verificando sesión:', error);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
