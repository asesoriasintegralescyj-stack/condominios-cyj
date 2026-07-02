/**
 * Proxy de Protección de Rutas (Next.js 16)
 * Reemplaza middleware.ts deprecado
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Rutas que no requieren autenticación
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/session',
  '/api/auth/init-admin',
  '/api/auth/reset-admin',
  '/api/seed',
  '/api/seed-catalogos',
]

// Verificar si una ruta es pública
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => {
    return pathname === route || pathname.startsWith(route + '/')
  })
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Permitir archivos estáticos
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }
  
  // Permitir rutas públicas sin verificación
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }
  
  // Obtener token de sesión de las cookies
  const sessionToken = request.cookies.get('condominio_session')?.value
  
  // Si no hay token y es una ruta protegida
  if (!sessionToken) {
    // Si es API, retornar 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'No autenticado', authenticated: false },
        { status: 401 }
      )
    }
    
    // Si es página, redirigir a login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
