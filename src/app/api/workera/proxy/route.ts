/**
 * Vercel Edge Function - Workera Proxy v5.0
 * =========================================
 * Se ejecuta en el edge de Vercel mas cercano al usuario (Chile=SCL).
 * Autentica con Keycloak (workera.com/auth/realms/UBootProjekt/)
 * y reenvia peticiones a api.workera.com/apiClient/v1/
 *
 * v5.0: API base actualizada a api.workera.com/apiClient/v1/
 *       Token Bearer en Authorization header.
 *       Soporta GET y POST forwarding.
 *       Credenciales desde environment variables con fallback.
 *       Retry con exponential backoff (3 intentos).
 *       Timeout de 15s.
 */

import { NextRequest, NextResponse } from 'next/server';

// ── Configuracion desde env vars (con fallback) ──
const WORKERA_API_BASE = process.env.WORKERA_API_BASE || 'https://api.workera.com/apiClient/v1';
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
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function isHtmlResponse(contentType: string, text: string): boolean {
  return contentType.includes('html') || text.trim().startsWith('<') || text.trim().startsWith('<!DOCTYPE');
}

// ============================================================
// KEYCLOAK AUTH: Multi-client password grant con retry
// ============================================================
async function authenticateWithRetry(): Promise<{
  accessToken: string;
  refreshToken: string;
  clientId: string;
  expires: number;
}> {
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
      if (!isHtmlResponse(resp.headers.get('content-type') || '', text)) {
        const data = JSON.parse(text);
        if (data.access_token) {
          tokenCache = {
            accessToken: data.access_token,
            refreshToken: data.refresh_token || tokenCache.refreshToken,
            clientId: tokenCache.clientId,
            expires: Date.now() + ((data.expires_in || 300) * 1000) - 60000,
          };
          return tokenCache;
        }
      }
    } catch {
      tokenCache = null;
    }
  }

  const clients = ['employed-portal-client', 'workera-frontend', 'admin-cli'];

  for (const clientId of clients) {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const resp = await fetchWithTimeout(KEYCLOAK_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
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
          if (attempt < MAX_RETRIES) { await delay(BASE_RETRY_DELAY_MS * attempt); continue; }
          break;
        }

        const data = JSON.parse(text);
        if (data.access_token) {
          tokenCache = {
            accessToken: data.access_token,
            refreshToken: data.refresh_token || '',
            clientId,
            expires: Date.now() + ((data.expires_in || 300) * 1000) - 60000,
          };
          return tokenCache;
        }

        if (data.error === 'invalid_grant' || data.error === 'unauthorized_client') break;
        if (attempt < MAX_RETRIES) await delay(BASE_RETRY_DELAY_MS * attempt);
      } catch (err: any) {
        if (err.name === 'AbortError' && attempt < MAX_RETRIES) { await delay(BASE_RETRY_DELAY_MS * attempt); continue; }
        break;
      }
    }
  }

  throw new Error('Autenticacion con Keycloak fallo para todos los clientes');
}

// ============================================================
// PROXY: Forward request a Workera API con retry
// ============================================================
async function proxyToWorkera(
  endpoint: string,
  queryParams: string,
  httpMethod: string,
  requestBody: string | null,
  accessToken: string,
): Promise<{ ok: boolean; status: number; contentType: string; text: string }> {
  const separator = endpoint.includes('?') ? '&' : '?';
  const workeraUrl = `${WORKERA_API_BASE}/${endpoint}${queryParams ? separator + queryParams : ''}`;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Authorization': `Bearer ${accessToken}`,
    'Origin': 'https://workera.com',
    'Referer': 'https://workera.com/',
    'ip_client': DEFAULT_IP,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept-Language': 'es-CL,es;q=0.9',
    'company': DEFAULT_COMPANY,
  };

  if (requestBody) {
    headers['Content-Type'] = 'application/json';
  }

  const fetchOptions: RequestInit = { method: httpMethod, headers };
  if (requestBody && (httpMethod === 'POST' || httpMethod === 'PUT' || httpMethod === 'PATCH')) {
    fetchOptions.body = requestBody;
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
            return proxyToWorkera(endpoint, queryParams, httpMethod, requestBody, newTokens.accessToken);
          } catch {
            await delay(BASE_RETRY_DELAY_MS * attempt);
            continue;
          }
        }
        return { ok: false, status: 502, contentType: 'text/html', text: responseText };
      }

      return { ok: resp.ok, status: resp.status, contentType: responseContentType, text: responseText };
    } catch (err: any) {
      if (err.name === 'AbortError' && attempt < MAX_RETRIES) { await delay(BASE_RETRY_DELAY_MS * attempt); continue; }
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

  // Diagnostico: ?action=diag
  if (action === 'diag') {
    try {
      const tokens = await authenticateWithRetry();
      return NextResponse.json({
        success: true,
        mode: 'vercel-edge',
        authClient: tokens.clientId,
        expiresAt: new Date(tokens.expires).toISOString(),
        cacheExpiresIn: Math.round((tokens.expires - Date.now()) / 1000),
        apiBase: WORKERA_API_BASE,
      });
    } catch (err: any) {
      return NextResponse.json({ success: false, mode: 'vercel-edge', error: err.message }, { status: 500 });
    }
  }

  // Limpiar cache: ?action=clearcache
  if (action === 'clearcache') {
    tokenCache = null;
    return NextResponse.json({ message: 'Cache limpiado' });
  }

  // Forward GET a Workera API
  const endpoint = searchParams.get('endpoint') || '';
  if (!endpoint) {
    return NextResponse.json({ error: 'Falta "endpoint"' }, { status: 400 });
  }

  try {
    const tokens = await authenticateWithRetry();
    // Pasar todos los query params excepto "endpoint" y "action"
    const forwardParams: string[] = [];
    searchParams.forEach((value, key) => {
      if (key !== 'endpoint' && key !== 'action') {
        forwardParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
      }
    });

    const result = await proxyToWorkera(endpoint, forwardParams.join('&'), 'GET', null, tokens.accessToken);

    if (result.ok) {
      return new NextResponse(result.text, {
        status: 200,
        headers: { 'Content-Type': result.contentType || 'application/json' },
      });
    }

    return NextResponse.json({
      error: `Workera API ${result.status}`,
      body: result.text.substring(0, 500),
    }, { status: result.status >= 500 ? 502 : result.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, body: apiBody, method } = body;

    if (!endpoint) {
      return NextResponse.json({ error: 'Falta "endpoint"' }, { status: 400 });
    }

    const tokens = await authenticateWithRetry();
    const httpMethod = (method || 'POST').toUpperCase();
    const requestBody = typeof apiBody === 'string' ? apiBody : JSON.stringify(apiBody || {});

    const result = await proxyToWorkera(endpoint, '', httpMethod, requestBody, tokens.accessToken);

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
      }, { status: 502 });
    }

    return NextResponse.json({
      error: `Workera API ${result.status}`,
      body: result.text.substring(0, 500),
    }, { status: result.status >= 500 ? 502 : result.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
