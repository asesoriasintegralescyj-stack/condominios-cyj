/**
 * Helpers de autenticación para API Routes de Next.js 16
 *
 * Uso:
 *   export const GET = withAuth(async (req, ctx) => { ... }, { permiso: 'residentes.ver' });
 *   export const POST = withAuth(async (req, ctx) => { ... }, { permiso: 'residentes.crear' });
 *
 *   // Solo admin:
 *   export const DELETE = withAuth(async (req, ctx) => { ... }, { rol: 'admin' });
 *
 *   // Cualquier autenticado:
 *   export const GET = withAuth(async (req, ctx) => { ... });
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentSession, hasPermission, SafeUser } from '@/lib/auth';

type HandlerContext = {
  params: { [key: string]: string | string[] };
  user: SafeUser;
  userId: string;
};

type RouteHandler<T> = (req: NextRequest, ctx: { params: Promise<{ [key: string]: string | string[] }> } & { user: SafeUser; userId: string }) => Promise<T> | T;

type WithAuthOptions = {
  /** Permiso requerido (ej: 'residentes.ver'). Si no se especifica, solo requiere auth. */
  permiso?: string;
  /** Rol requerido (ej: 'admin'). Sobrescribe permiso. */
  rol?: string;
};

/**
 * Obtiene los params de la ruta (compatible con Next.js 15/16 sync y async params)
 */
async function extractParams(req: NextRequest): Promise<{ [key: string]: string | string[] }> {
  // En Next.js 16, params es una Promise en el segundo argumento del handler.
  // Pero como withAuth no recibe ese argumento, usamos req.nextUrlSearchParams
  // como fallback. La mayoría de las rutas dinámicas usan [id] que se pasa como ctx.params.
  // Retornamos un objeto vacío si no hay forma de extraerlos; el handler real
  // recibirá params a través del closure original.
  return {};
}

/**
 * Wrapper que exige autenticación (y opcionalmente permiso/rol) antes de ejecutar el handler.
 */
export function withAuth<T>(
  handler: (req: NextRequest, ctx: HandlerContext) => Promise<T> | T,
  options: WithAuthOptions = {}
) {
  return async (
    req: NextRequest,
    ctx: { params: Promise<{ [key: string]: string | string[] }> } | { params: { [key: string]: string | string[] } } | undefined
  ): Promise<T | NextResponse> => {
    // 1. Verificar autenticación
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json(
        { error: 'No autenticado', authenticated: false },
        { status: 401 }
      );
    }

    // 2. Verificar rol si se especifica
    if (options.rol && session.user.rol !== options.rol) {
      return NextResponse.json(
        { error: 'No tiene permisos suficientes para esta acción' },
        { status: 403 }
      );
    }

    // 3. Verificar permiso si se especifica
    if (options.permiso && !hasPermission(session.user.rol, options.permiso)) {
      return NextResponse.json(
        { error: 'No tiene el permiso requerido: ' + options.permiso },
        { status: 403 }
      );
    }

    // 4. Resolver params (pueden ser Promise en Next 15+)
    let params: { [key: string]: string | string[] } = {};
    if (ctx?.params) {
      if (ctx.params instanceof Promise) {
        params = await ctx.params;
      } else {
        params = ctx.params as { [key: string]: string | string[] };
      }
    }

    // 5. Ejecutar handler
    try {
      return await handler(req, { params, user: session.user, userId: session.userId });
    } catch (error) {
      console.error('[withAuth] Error en handler:', error);
      return NextResponse.json(
        { error: 'Error interno del servidor' },
        { status: 500 }
      );
    }
  };
}

/**
 * Versión simplificada que solo requiere auth (sin permisos).
 * Útil para rutas donde el handler ya hace verificación interna de permisos.
 */
export function withAuthSimple<T>(
  handler: (req: NextRequest, ctx: HandlerContext) => Promise<T> | T
) {
  return withAuth(handler, {});
}
