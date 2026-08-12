/**
 * Vercel Edge Function - Workera Proxy v7.0
 * =========================================
 * Usa API_USER + API_KEY headers para autenticar con Workera API
 * (no Keycloak password grant, que requiere geo-bloque para Keycloak).
 *
 * La API de Workera (api.workera.com/apiClient/v1/) acepta API_USER y API_KEY
 * headers directamente, sin necesidad de token Bearer.
 *
 * Flujo: Browser -> /api/workera/proxy -> api.workera.com/apiClient/v1/
 *
 * IMPORTANTE: Esta funcion corre como Edge en Vercel. Para usuarios chilenos,
 * se ejecuta desde SCL (Santiago). Para otros, puede ser geo-bloqueado.
 * Si es geo-bloqueado, el Cloudflare Worker (workers.dev) actua como fallback.
 */

import { NextRequest, NextResponse } from 'next/server';

const WORKERA_API_BASE = process.env.WORKERA_API_BASE || 'https://api.workera.com/apiClient/v1';

// API credentials (requeridas)
const API_USER = process.env.WORKERA_API_USER || '';
const API_KEY = process.env.WORKERA_API_KEY || '';

// Fallback credentials (deben configurarse en Vercel env vars)
const FALLBACK_API_USER = process.env.WORKERA_FALLBACK_USER || '';
const FALLBACK_API_KEY = process.env.WORKERA_FALLBACK_KEY || '';

// Cloudflare Worker fallback URL
const CF_WORKER_URL = process.env.WORKERA_WORKER_URL || 'https://workera-proxy.asesoriasintegralescyj.workers.dev';

// Company and IP headers
const DEFAULT_COMPANY = process.env.WORKERA_COMPANY || 'lagunanorte';
const DEFAULT_IP = process.env.WORKERA_IP || '181.43.202.93';

const FETCH_TIMEOUT_MS = 20000;

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// ── Helpers ──
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

function getCreds(): { user: string; key: string } | null {
  if (API_USER && API_KEY) return { user: API_USER, key: API_KEY };
  if (FALLBACK_API_USER && FALLBACK_API_KEY) return { user: FALLBACK_API_USER, key: FALLBACK_API_KEY };
  return null;
}

// ============================================================
// PROXY: Forward request a Workera API
// ============================================================
async function proxyToWorkera(
  endpoint: string,
  queryParams: string,
  httpMethod: string,
  requestBody: string | null,
): Promise<{ ok: boolean; status: number; contentType: string; text: string; geoBlocked?: boolean }> {
  const creds = getCreds();
  if (!creds) {
    return {
      ok: false,
      status: 500,
      contentType: 'application/json',
      text: JSON.stringify({ error: 'Credenciales WORKERA_API_USER/WORKERA_API_KEY no configuradas en Vercel' }),
    };
  }

  const separator = endpoint.includes('?') ? '&' : '?';
  const workeraUrl = `${WORKERA_API_BASE}/${endpoint}${queryParams ? separator + queryParams : ''}`;

  const headers: Record<string, string> = {
    'API_USER': creds.user,
    'API_KEY': creds.key,
    'Accept': 'application/json',
    'company': DEFAULT_COMPANY,
    'Origin': 'https://workera.com',
    'Referer': 'https://workera.com/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept-Language': 'es-CL,es;q=0.9',
  };

  if (DEFAULT_IP) {
    headers['ip_client'] = DEFAULT_IP;
  }

  if (requestBody) {
    headers['Content-Type'] = 'application/json';
  }

  const fetchOptions: RequestInit = { method: httpMethod, headers };
  if (requestBody && (httpMethod === 'POST' || httpMethod === 'PUT' || httpMethod === 'PATCH')) {
    fetchOptions.body = requestBody;
  }

  try {
    const resp = await fetchWithTimeout(workeraUrl, fetchOptions);
    const responseText = await resp.text();
    const responseContentType = resp.headers.get('content-type') || '';

    const geoBlocked = isHtmlResponse(responseContentType, responseText);
    return { ok: resp.ok && !geoBlocked, status: resp.status, contentType: responseContentType, text: responseText, geoBlocked };
  } catch (err: any) {
    return { ok: false, status: 0, contentType: 'text/plain', text: err.message };
  }
}

// ============================================================
// FALLBACK: Try Cloudflare Worker
// ============================================================
async function cfWorkerFallback(
  endpoint: string,
  queryParams: string,
  httpMethod: string,
  requestBody: string | null,
): Promise<{ ok: boolean; status: number; contentType: string; text: string; fromCf: boolean }> {
  try {
    // CF Worker uses query params format: /?endpoint=branchOffice&page=1
    const workerParams = new URLSearchParams();
    workerParams.set('endpoint', endpoint);
    if (queryParams) {
      queryParams.split('&').forEach(pair => {
        const [k, v] = pair.split('=');
        if (k && v) workerParams.set(k, decodeURIComponent(v));
      });
    }
    const workerUrl = `${CF_WORKER_URL}/?${workerParams.toString()}`;

    const resp = await fetchWithTimeout(workerUrl, {
      method: httpMethod,
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: requestBody,
    });
    const text = await resp.text();
    const ct = resp.headers.get('content-type') || 'application/json';
    return { ok: resp.ok, status: resp.status, contentType: ct, text, fromCf: true };
  } catch (err: any) {
    return { ok: false, status: 502, contentType: 'application/json', text: JSON.stringify({ error: `CF Worker fallback fallo: ${err.message}` }), fromCf: true };
  }
}

// ============================================================
// GET
// ============================================================
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  // Diagnostic: ?action=diag
  if (action === 'diag') {
    const creds = getCreds();
    const result = await proxyToWorkera('branchOffice', 'page=1', 'GET', null);
    return NextResponse.json({
      mode: 'vercel-edge-v7',
      apiBase: WORKERA_API_BASE,
      hasCreds: !!creds,
      credUser: creds ? creds.user.substring(0, 4) + '***' : 'NONE',
      company: DEFAULT_COMPANY,
      testResult: {
        ok: result.ok,
        status: result.status,
        geoBlocked: result.geoBlocked,
        bodyPreview: result.text.substring(0, 200),
      },
    });
  }

  // Test geo: ?action=testgeo
  if (action === 'testgeo') {
    const result = await proxyToWorkera('branchOffice', 'page=1', 'GET', null);
    return NextResponse.json({
      geoBlocked: result.geoBlocked,
      status: result.status,
      bodyPreview: result.text.substring(0, 500),
    });
  }

  // Creds: ?action=creds
  if (action === 'creds') {
    const creds = getCreds();
    return NextResponse.json({
      apiBase: WORKERA_API_BASE,
      hasCreds: !!creds,
      credUser: creds ? creds.user.substring(0, 4) + '***' : 'NONE',
      company: DEFAULT_COMPANY,
      cfWorkerUrl: CF_WORKER_URL,
    });
  }

  // Clear cache: ?action=clearcache
  if (action === 'clearcache') {
    return NextResponse.json({ message: 'No hay cache en v7 (sin tokens)' });
  }

  // Forward GET to Workera API
  const endpoint = searchParams.get('endpoint') || '';
  if (!endpoint) {
    return NextResponse.json({ error: 'Falta "endpoint"' }, { status: 400 });
  }

  // Build forward params
  const forwardParams: string[] = [];
  searchParams.forEach((value, key) => {
    if (key !== 'endpoint' && key !== 'action') {
      forwardParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  });
  const qp = forwardParams.join('&');

  // Try direct first
  const result = await proxyToWorkera(endpoint, qp, 'GET', null);

  if (result.ok) {
    return new NextResponse(result.text, {
      status: 200,
      headers: { 'Content-Type': result.contentType || 'application/json' },
    });
  }

  // If geo-blocked, try CF Worker fallback
  if (result.geoBlocked) {
    const cfResult = await cfWorkerFallback(endpoint, qp, 'GET', null);
    if (cfResult.ok) {
      return new NextResponse(cfResult.text, {
        status: 200,
        headers: { 'Content-Type': cfResult.contentType || 'application/json' },
      });
    }
    return NextResponse.json({
      error: `Geo-bloqueado en Vercel Edge y CF Worker fallback fallo`,
      vercelStatus: result.status,
      cfStatus: cfResult.status,
      cfError: cfResult.text.substring(0, 200),
    }, { status: 502 });
  }

  return NextResponse.json({
    error: `Workera API ${result.status}`,
    body: result.text.substring(0, 500),
  }, { status: result.status >= 500 ? 502 : result.status });
}

// ============================================================
// POST
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, body: apiBody, method } = body;

    if (!endpoint) {
      return NextResponse.json({ error: 'Falta "endpoint"' }, { status: 400 });
    }

    const httpMethod = (method || 'POST').toUpperCase();
    const requestBody = typeof apiBody === 'string' ? apiBody : JSON.stringify(apiBody || {});

    // Try direct
    const result = await proxyToWorkera(endpoint, '', httpMethod, requestBody);

    if (result.ok) {
      return new NextResponse(result.text, {
        status: 200,
        headers: { 'Content-Type': result.contentType || 'application/json' },
      });
    }

    // If geo-blocked, try CF Worker fallback
    if (result.geoBlocked) {
      const cfResult = await cfWorkerFallback(endpoint, '', httpMethod, requestBody);
      if (cfResult.ok) {
        return new NextResponse(cfResult.text, {
          status: 200,
          headers: { 'Content-Type': cfResult.contentType || 'application/json' },
        });
      }
      return NextResponse.json({
        error: `Geo-bloqueado y CF Worker fallback fallo`,
        cfError: cfResult.text.substring(0, 200),
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

// ============================================================
// OPTIONS: CORS preflight
// ============================================================
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
