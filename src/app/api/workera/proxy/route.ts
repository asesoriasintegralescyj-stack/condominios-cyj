/**
 * Vercel Edge Function - Workera Proxy v4.0
 * =========================================
 * Se ejecuta en el edge de Vercel mas cercano al usuario (Chile=SCL).
 * Autentica con Keycloak (workera.com/auth/realms/UBootProjekt/)
 * y reenvia peticiones a workera.com/api/tr/
 *
 * Credenciales desde environment variables con fallback.
 * Retry con exponential backoff (3 intentos).
 * Timeout de 15s en cada fetch a Workera.
 */

import { NextRequest, NextResponse } from 'next/server';

// ── Configuracion desde env vars (con fallback) ──
const WORKERA_BASE = process.env.WORKERA_BASE_URL || 'https://workera.com/api/tr';
const KEYCLOAK_TOKEN_URL = process.env.WORKERA_KEYCLOAK_URL || 'https://workera.com/auth/realms/UBootProjekt/protocol/openid-connect/token';
const DEFAULT_COMPANY = process.env.WORKERA_COMPANY || 'lagunanorte';
const DEFAULT_IP = process.env.WORKERA_IP || '181.43.202.93';
const WORKERA_USER = process.env.WORKERA_USER || 'administracionlagunanorte@gmail.com';
const WORKERA_PASSWORD = process.env.WORKERA_PASSWORD || 'Jai.1985';

const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1000;
const FETCH_TIMEOUT_MS = 15000;

// Cache de tokens en memoria (Edge runtime)
let tokenCache: {
  accessToken: string;
  refreshToken: string;
  clientId: string;
  expires: number;
  jsessionid: string;
} | null = null;

// ============================================================
// HELPERS
// ============================================================
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { ...options, signal: controller.signal });
    return resp;
  } finally {
    clearTimeout(timer);
  }
}

function isHtmlResponse(contentType: string, text: string): boolean {
  return contentType.includes('html') || text.trim().startsWith('<') || text.trim().startsWith('<!DOCTYPE');
}

function generateSessionId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let r = '';
  for (let i = 0; i < 30; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return r;
}

function buildCookies(tokens: { accessToken: string; refreshToken: string; jsessionid: string }, company: string): string {
  return `SID=${tokens.accessToken}; HSID=${tokens.refreshToken}; JSESSIONID=${tokens.jsessionid}; company=${company}`;
}

function decodeJwt(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return { error: 'Not a JWT' };
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return {
      sub: payload.sub,
      email: payload.email,
      realm_access: payload.realm_access,
      resource_access: payload.resource_access,
      roles: payload.realm_access?.roles || [],
      azp: payload.azp,
      aud: payload.aud,
    };
  } catch {
    return { error: 'decode failed' };
  }
}

// ============================================================
// KEYCLOAK AUTH: Multi-client password grant con retry
// ============================================================
async function authenticateWithRetry(): Promise<{
  accessToken: string;
  refreshToken: string;
  clientId: string;
  jsessionid: string;
  expires: number;
}> {
  // Return cached if valid (con margen de 60s)
  if (tokenCache && tokenCache.expires > Date.now() + 60000) return tokenCache;

  // Try refresh first
  if (tokenCache?.refreshToken) {
    try {
      const resp = await fetchWithTimeout(KEYCLOAK_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: tokenCache.clientId,
          refresh_token: tokenCache.refreshToken,
        }).toString(),
      });

      const text = await resp.text();

      if (isHtmlResponse(resp.headers.get('content-type') || '', text)) {
        tokenCache = null;
      } else {
        const data = JSON.parse(text);
        if (data.access_token) {
          tokenCache = {
            accessToken: data.access_token,
            refreshToken: data.refresh_token || tokenCache.refreshToken,
            clientId: tokenCache.clientId,
            jsessionid: tokenCache.jsessionid,
            expires: Date.now() + ((data.expires_in || 300) * 1000) - 60000,
          };
          return tokenCache;
        }
      }
    } catch {
      tokenCache = null;
    }
  }

  // Password grant - try multiple clients with retries
  const clients = [
    'employed-portal-client',
    'workera-frontend',
    'admin-cli',
  ];

  for (const clientId of clients) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const resp = await fetchWithTimeout(KEYCLOAK_TOKEN_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
          },
          body: new URLSearchParams({
            grant_type: 'password',
            client_id: clientId,
            username: WORKERA_USER,
            password: WORKERA_PASSWORD,
            scope: 'openid email profile',
          }).toString(),
        });

        const contentType = resp.headers.get('content-type') || '';
        const text = await resp.text();

        if (isHtmlResponse(contentType, text)) {
          if (attempt < MAX_RETRIES) {
            await delay(BASE_RETRY_DELAY_MS * attempt);
            continue;
          }
          break;
        }

        const data = JSON.parse(text);
        if (data.access_token) {
          tokenCache = {
            accessToken: data.access_token,
            refreshToken: data.refresh_token || '',
            clientId,
            jsessionid: generateSessionId(),
            expires: Date.now() + ((data.expires_in || 300) * 1000) - 60000,
          };
          return tokenCache;
        }

        if (data.error === 'invalid_grant' || data.error === 'unauthorized_client') {
          break;
        }

        if (attempt < MAX_RETRIES) {
          await delay(BASE_RETRY_DELAY_MS * attempt);
        }
      } catch (err: any) {
        if (err.name === 'AbortError' && attempt < MAX_RETRIES) {
          await delay(BASE_RETRY_DELAY_MS * attempt);
          continue;
        }
        break;
      }
    }
  }

  throw new Error('Autenticacion con Keycloak fallo para todos los clientes despues de reintentos');
}

// ============================================================
// PROXY: Request a Workera API con retry
// ============================================================
async function proxyToWorkera(
  endpoint: string,
  apiBody: Record<string, any> | string | undefined,
  httpMethod: string,
  tokens: { accessToken: string; refreshToken: string; jsessionid: string },
  company: string,
): Promise<{ ok: boolean; status: number; contentType: string; text: string }> {
  const workeraUrl = `${WORKERA_BASE}/${endpoint}`;
  const cookies = buildCookies(tokens, company);

  const headers: Record<string, string> = {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'Cookie': cookies,
    'Origin': 'https://workera.com',
    'Referer': `https://workera.com/app/${company}/people/employees`,
    'ip_client': DEFAULT_IP,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'es-CL,es;q=0.9,en;q=0.8',
  };

  const fetchOptions: RequestInit = { method: httpMethod, headers };

  if (httpMethod === 'POST' || httpMethod === 'PUT' || httpMethod === 'PATCH') {
    fetchOptions.body = typeof apiBody === 'string' ? apiBody : JSON.stringify(apiBody || {});
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const resp = await fetchWithTimeout(workeraUrl, fetchOptions);
      const responseText = await resp.text();
      const responseContentType = resp.headers.get('content-type') || '';

      if (isHtmlResponse(responseContentType, responseText)) {
        if (attempt < MAX_RETRIES) {
          tokenCache = null;
          try {
            const newTokens = await authenticateWithRetry();
            return proxyToWorkera(endpoint, apiBody, httpMethod, newTokens, company);
          } catch {
            await delay(BASE_RETRY_DELAY_MS * attempt);
            continue;
          }
        }
        return { ok: false, status: 502, contentType: 'text/html', text: responseText };
      }

      return { ok: resp.ok, status: resp.status, contentType: responseContentType, text: responseText };
    } catch (err: any) {
      if (err.name === 'AbortError' && attempt < MAX_RETRIES) {
        await delay(BASE_RETRY_DELAY_MS * attempt);
        continue;
      }
      throw err;
    }
  }

  throw new Error('Todos los reintentos fallaron');
}

// ============================================================
// EDGE RUNTIME
// ============================================================
export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'diag') {
    try {
      const tokens = await authenticateWithRetry();
      const tokenInfo = decodeJwt(tokens.accessToken);
      const roles = tokenInfo.realm_access?.roles || [];

      return NextResponse.json({
        success: true,
        mode: 'vercel-edge',
        authClient: tokens.clientId,
        hasRoles: roles.length > 0,
        roles,
        tokenAzp: tokenInfo.azp,
        tokenAud: tokenInfo.aud,
        expiresAt: new Date(tokens.expires).toISOString(),
        cacheExpiresIn: Math.round((tokens.expires - Date.now()) / 1000),
      });
    } catch (err: any) {
      return NextResponse.json({
        success: false,
        mode: 'vercel-edge',
        error: err.message,
      }, { status: 500 });
    }
  }

  if (action === 'clearcache') {
    tokenCache = null;
    return NextResponse.json({ message: 'Cache limpiado' });
  }

  if (action === 'testgeo') {
    const results: Array<{ client: string; status: number; blocked: boolean; preview?: string }> = [];
    const testClients = ['employed-portal-client', 'workera-frontend', 'admin-cli'];

    for (const clientId of testClients) {
      try {
        const resp = await fetchWithTimeout(KEYCLOAK_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': '*/*' },
          body: new URLSearchParams({
            grant_type: 'password',
            client_id: clientId,
            username: WORKERA_USER,
            password: WORKERA_PASSWORD,
          }).toString(),
        });
        const contentType = resp.headers.get('content-type') || '';
        const text = await resp.text();
        const isHtml = isHtmlResponse(contentType, text);

        results.push({
          client: clientId,
          status: resp.status,
          blocked: isHtml || resp.status === 406,
          preview: text.substring(0, 200),
        });
      } catch (err: any) {
        results.push({
          client: clientId,
          status: 0,
          blocked: true,
          preview: err.message,
        });
      }
    }

    const anyReachable = results.some(r => !r.blocked);

    return NextResponse.json({
      reachable: anyReachable,
      edgeHint: anyReachable
        ? 'Edge funciona desde esta ubicacion'
        : 'Ningun cliente reachable - posible geo-bloque en el Edge location',
      results,
    });
  }

  return NextResponse.json({
    error: 'Accion no reconocida. Usar ?action=diag, ?action=clearcache, o ?action=testgeo'
  }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, body: apiBody, method } = body;
    const company = DEFAULT_COMPANY;

    if (!endpoint) {
      return NextResponse.json({ error: 'Falta "endpoint" en el body' }, { status: 400 });
    }

    const tokens = await authenticateWithRetry();
    const httpMethod = (method || 'POST').toUpperCase();
    const result = await proxyToWorkera(endpoint, apiBody, httpMethod, tokens, company);

    if (result.ok) {
      return new NextResponse(result.text, {
        status: 200,
        headers: { 'Content-Type': result.contentType || 'application/json' },
      });
    }

    if (isHtmlResponse(result.contentType, result.text)) {
      return NextResponse.json({
        error: 'Workera devolvio HTML (posible geo-bloque)',
        status: result.status,
        htmlPreview: result.text.substring(0, 300),
        suggestion: 'La Edge Function puede estar ejecutandose desde fuera de Chile.',
      }, { status: 502 });
    }

    return NextResponse.json({
      error: `Workera API ${result.status}`,
      authClient: tokens.clientId,
      body: result.text.substring(0, 500),
    }, { status: result.status >= 500 ? 502 : result.status });

  } catch (err: any) {
    return NextResponse.json({
      error: err.message,
    }, { status: 500 });
  }
}
