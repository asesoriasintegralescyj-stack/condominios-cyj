/**
 * Vercel Edge Function - Workera Proxy v8.0
 * =========================================
 * Se ejecuta en el Edge de Vercel desde Chile (SCL).
 * 
 * Estrategia de autenticación (en orden):
 * 1. Keycloak password grant → Bearer token → Workera API
 * 2. Si Keycloak falla, intenta API_USER/API_KEY headers directos
 * 3. Si todo falla desde Edge, fallback a Cloudflare Worker
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const KEYCLOAK_TOKEN_URL = 'https://workera.com/auth/realms/UBootProjekt/protocol/openid-connect/token';
const WORKERA_API_BASE = 'https://api.workera.com/apiClient/v1';
const CF_WORKER_URL = 'https://workera-proxy.asesoriasintegralescyj.workers.dev';
const DEFAULT_COMPANY = 'lagunanorte';
const WORKERA_USER = process.env.WORKERA_USER || 'administracionlagunanorte@gmail.com';
const WORKERA_PASSWORD = process.env.WORKERA_PASSWORD || 'Jai.1985';
const API_USER = process.env.WORKERA_API_USER || '';
const API_KEY = process.env.WORKERA_API_KEY || '';

const FETCH_TIMEOUT_MS = 20000;

let tokenCache: { accessToken: string; clientId: string; expires: number } | null = null;

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

function isHtml(text: string): boolean {
  return text.trim().startsWith('<') || text.trim().startsWith('<!DOCTYPE');
}

async function getBearerToken(): Promise<string | null> {
  if (tokenCache && tokenCache.expires > Date.now() + 30000) return tokenCache.accessToken;

  const clients = ['employed-portal-client', 'workera-frontend', 'admin-cli', 'workera-app'];

  for (const clientId of clients) {
    try {
      const resp = await fetchWithTimeout(KEYCLOAK_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
        body: new URLSearchParams({
          grant_type: 'password', client_id: clientId,
          username: WORKERA_USER, password: WORKERA_PASSWORD,
          scope: 'openid email profile',
        }).toString(),
      });
      const text = await resp.text();
      if (isHtml(text)) continue;
      const data = JSON.parse(text);
      if (data.access_token) {
        tokenCache = { accessToken: data.access_token, clientId, expires: Date.now() + ((data.expires_in || 300) * 1000) - 30000 };
        return tokenCache.accessToken;
      }
    } catch { continue; }
  }
  return null;
}

async function fetchWorkera(endpoint: string, queryParams: string, method: string, body: string | null, authMode: 'bearer' | 'apikeys'): Promise<{ ok: boolean; status: number; contentType: string; text: string; auth: string }> {
  const sep = endpoint.includes('?') ? '&' : '?';
  const url = `${WORKERA_API_BASE}/${endpoint}${queryParams ? sep + queryParams : ''}`;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'company': DEFAULT_COMPANY,
  };

  if (authMode === 'bearer') {
    const token = await getBearerToken();
    if (!token) return { ok: false, status: 401, contentType: 'json', text: 'No Bearer token available', auth: 'bearer-failed' };
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    if (!API_USER || !API_KEY) return { ok: false, status: 500, contentType: 'json', text: 'No API_USER/API_KEY configured', auth: 'apikeys-missing' };
    headers['API_USER'] = API_USER;
    headers['API_KEY'] = API_KEY;
  }

  const opts: RequestInit = { method, headers };
  if (body && ['POST', 'PUT', 'PATCH'].includes(method)) opts.body = body;

  try {
    const resp = await fetchWithTimeout(url, opts);
    const text = await resp.text();
    const ct = resp.headers.get('content-type') || '';
    return { ok: resp.ok && !isHtml(text), status: resp.status, contentType: ct, text, auth: authMode };
  } catch (e: any) {
    return { ok: false, status: 0, contentType: 'text', text: e.message, auth: `${authMode}-error` };
  }
}

async function cfFallback(endpoint: string, queryParams: string, method: string, body: string | null): Promise<{ ok: boolean; status: number; contentType: string; text: string; auth: string }> {
  try {
    const wp = new URLSearchParams();
    wp.set('endpoint', endpoint);
    if (queryParams) queryParams.split('&').forEach(p => { const [k, v] = p.split('='); if (k && v) wp.set(k, decodeURIComponent(v)); });
    const url = `${CF_WORKER_URL}/?${wp.toString()}`;
    const hdrs: Record<string, string> = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
    if (API_USER && API_KEY) { hdrs['X-Api-User'] = API_USER; hdrs['X-Api-Key'] = API_KEY; hdrs['X-Company'] = DEFAULT_COMPANY; }
    const opts: RequestInit = { method, headers: hdrs };
    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) opts.body = body;
    const resp = await fetchWithTimeout(url, opts);
    const text = await resp.text();
    return { ok: resp.ok && !isHtml(text), status: resp.status, contentType: resp.headers.get('content-type') || '', text, auth: 'cf-worker' };
  } catch (e: any) {
    return { ok: false, status: 502, contentType: 'json', text: e.message, auth: 'cf-error' };
  }
}

async function workeraFetch(endpoint: string, queryParams: string, method: string, body: string | null): Promise<{ ok: boolean; status: number; contentType: string; text: string; auth: string }> {
  // 1. Bearer (Keycloak)
  const bearer = await fetchWorkera(endpoint, queryParams, method, body, 'bearer');
  if (bearer.ok) return bearer;
  // 2. API keys
  const apikeys = await fetchWorkera(endpoint, queryParams, method, body, 'apikeys');
  if (apikeys.ok) return apikeys;
  // 3. CF Worker
  return cfFallback(endpoint, queryParams, method, body);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'diag') {
    // Test Keycloak auth for each client
    const kcResults: { client: string; status: number; body: string }[] = [];
    for (const cid of ['employed-portal-client', 'workera-frontend', 'admin-cli', 'workera-app']) {
      try {
        const resp = await fetchWithTimeout(KEYCLOAK_TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
          body: new URLSearchParams({ grant_type: 'password', client_id: cid, username: WORKERA_USER, password: WORKERA_PASSWORD }).toString(),
        });
        const text = await resp.text();
        kcResults.push({ client: cid, status: resp.status, body: text.substring(0, 250) });
      } catch (e: any) {
        kcResults.push({ client: cid, status: 0, body: e.message });
      }
    }

    // Test Bearer + API call
    let bearerApi = null;
    const token = await getBearerToken();
    if (token) {
      const r = await fetchWorkera('branchOffice', 'page=1', 'GET', null, 'bearer');
      bearerApi = { status: r.status, body: r.text.substring(0, 200), auth: r.auth };
    }

    // Test API keys
    let apiKeysApi = null;
    if (API_USER && API_KEY) {
      const r = await fetchWorkera('branchOffice', 'page=1', 'GET', null, 'apikeys');
      apiKeysApi = { status: r.status, body: r.text.substring(0, 200), auth: r.auth };
    }

    // Test base URL
    let baseTest = null;
    try {
      const resp = await fetchWithTimeout(WORKERA_API_BASE, { method: 'GET', headers: { 'Accept': 'application/json' } });
      baseTest = { status: resp.status, body: (await resp.text()).substring(0, 150), ct: resp.headers.get('content-type') };
    } catch (e: any) {
      baseTest = { status: 0, body: e.message, ct: '' };
    }

    return NextResponse.json({
      mode: 'v8-multi-auth',
      keycloak: kcResults,
      bearerApi,
      apiKeysApi,
      baseTest,
      hasApiKeys: !!(API_USER && API_KEY),
      apiUser: API_USER ? API_USER.substring(0, 4) + '***' : 'NONE',
      company: DEFAULT_COMPANY,
    });
  }

  if (action === 'creds') {
    return NextResponse.json({ hasApiKeys: !!(API_USER && API_KEY), apiUser: API_USER ? API_USER.substring(0, 4) + '***' : 'NONE', company: DEFAULT_COMPANY });
  }

  const endpoint = searchParams.get('endpoint') || '';
  if (!endpoint) return NextResponse.json({ error: 'Falta "endpoint"' }, { status: 400 });

  const forwardParams: string[] = [];
  searchParams.forEach((v, k) => { if (k !== 'endpoint' && k !== 'action') forwardParams.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`); });

  const result = await workeraFetch(endpoint, forwardParams.join('&'), 'GET', null);

  if (result.ok) {
    return new NextResponse(result.text, { status: 200, headers: { 'Content-Type': result.contentType || 'application/json' } });
  }
  return NextResponse.json({ error: `Workera ${result.status} (via ${result.auth})`, body: result.text.substring(0, 300), auth: result.auth }, { status: result.status >= 500 ? 502 : result.status });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, body: apiBody, method } = body;
    if (!endpoint) return NextResponse.json({ error: 'Falta "endpoint"' }, { status: 400 });
    const httpMethod = (method || 'POST').toUpperCase();
    const requestBody = typeof apiBody === 'string' ? apiBody : JSON.stringify(apiBody || {});
    const result = await workeraFetch(endpoint, '', httpMethod, requestBody);
    if (result.ok) return new NextResponse(result.text, { status: 200, headers: { 'Content-Type': result.contentType || 'application/json' } });
    return NextResponse.json({ error: `Workera ${result.status} (via ${result.auth})`, body: result.text.substring(0, 300) }, { status: result.status >= 500 ? 502 : result.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Max-Age': '86400' } });
}
