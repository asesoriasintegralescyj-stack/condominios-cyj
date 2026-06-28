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
 * - Portal de residentes
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
  '/portal',
  '/api/portal/auth',
];

// Rutas del portal de residentes (autenticación con token de portal)
const PORTAL_ROUTES = [
  '/portal/',
  '/api/portal/',
];

// Rutas de API que requieren autenticación admin
const PROTECTED_API_ROUTES = [
  '/api/residentes',
  '/api/propiedades',
  '/api/personal',
  '/api/proveedores',
  '/api/ordenes-trabajo',
  '/api/proyectos',
  '/api/gastos',
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
  '/api/gastos-comunes',
  '/api/morosidad',
  '/api/comite',
  '/api/auditoria',
  '/api/backups',
  '/api/inventario',
];

// Verificar si una ruta es pública
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => {
    if (route.includes('[...')) {
      const baseRoute = route.replace('[...nextauth]', '');
      return pathname.startsWith(baseRoute);
    }
    return pathname === route || pathname.startsWith(route + '/');
  });
}

// Verificar si es una ruta del portal de residentes
function isPortalRoute(pathname: string): boolean {
  return PORTAL_ROUTES.some(route => pathname.startsWith(route));
}

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

  // === PORTAL DE RESIDENTES ===
  if (isPortalRoute(pathname)) {
    // Para API del portal, verificar token de portal
    if (pathname.startsWith('/api/portal/')) {
      const portalToken = request.cookies.get('portal_token')?.value;

      if (!portalToken) {
        return NextResponse.json(
          { error: 'No autenticado en portal', authenticated: false },
          { status: 401 }
        );
      }

      return NextResponse.next();
    }

    // Para páginas del portal, verificar cookie de portal
    const portalToken = request.cookies.get('portal_token')?.value;

    if (!portalToken) {
      const loginUrl = new URL('/portal', request.url);
      return NextResponse.redirect(loginUrl);
    }

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
