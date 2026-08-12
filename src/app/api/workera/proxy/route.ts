/**
 * Vercel Edge Function - Workera Proxy v9.0
 * =========================================
 * v9: admin-cli Keycloak works. Discover correct API base URL.
 *     Tests multiple bases, forwards to whichever works.
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const KEYCLOAK_URL = 'https://workera.com/auth/realms/UBootProjekt/protocol/openid-connect/token';
const CF_WORKER_URL = 'https://workera-proxy.asesoriasintegralescyj.workers.dev';
const COMPANY = process.env.WORKERA_COMPANY || 'lagunanorte';
const USER = process.env.WORKERA_USER || 'administracionlagunanorte@gmail.com';
const PASS = process.env.WORKERA_PASSWORD || 'Jai.1985';
const API_USER = process.env.WORKERA_API_USER || '';
const API_KEY = process.env.WORKERA_API_KEY || '';

const TO = 20000;
let cached: { t: string; exp: number } | null = null;

const BASES = [
  'https://api.workera.com/apiClient/v1',
  'https://api.workera.com/api/v1',
  'https://api.workera.com/v1',
  'https://api.workera.com/api/tr',
  'https://workera.com/api/v1',
  'https://workera.com/apiClient/v1',
  'https://app.workera.com/api/v1',
  'https://app.workera.com/apiClient/v1',
];

async function fto(u: string, o: RequestInit, ms = TO) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
  try { return await fetch(u, { ...o, signal: c.signal }); } finally { clearTimeout(t); }
}
function isH(t: string) { return t.trim().startsWith('<'); }

async function getToken(): Promise<string | null> {
  if (cached && cached.exp > Date.now() + 30000) return cached.t;
  try {
    const r = await fto(KEYCLOAK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
      body: new URLSearchParams({ grant_type: 'password', client_id: 'admin-cli', username: USER, password: PASS }).toString(),
    });
    const t = await r.text();
    if (isH(t)) return null;
    const d = JSON.parse(t);
    if (d.access_token) { cached = { t: d.access_token, exp: Date.now() + (d.expires_in || 300) * 1000 - 30000 }; return cached.t; }
  } catch {}
  return null;
}

async function tryBase(base: string, endpoint: string, qp: string, method: string, body: string | null, token: string): Promise<{ ok: boolean; status: number; ct: string; text: string }> {
  const sep = endpoint.includes('?') ? '&' : '?';
  const url = `${base}/${endpoint}${qp ? sep + qp : ''}`;
  const h: Record<string, string> = { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json', 'Content-Type': 'application/json', 'company': COMPANY };
  const o: RequestInit = { method, headers: h };
  if (body && ['POST', 'PUT', 'PATCH'].includes(method)) o.body = body;
  try {
    const r = await fto(url, o);
    const t = await r.text();
    return { ok: r.ok && !isH(t), status: r.status, ct: r.headers.get('content-type') || '', text: t };
  } catch (e: any) { return { ok: false, status: 0, ct: '', text: e.message }; }
}

async function workeraFetch(endpoint: string, qp: string, method: string, body: string | null): Promise<{ ok: boolean; status: number; ct: string; text: string; via: string }> {
  const token = await getToken();

  // Try each base with Bearer token
  if (token) {
    for (const base of BASES) {
      const r = await tryBase(base, endpoint, qp, method, body, token);
      if (r.ok) return { ...r, via: `bearer:${base}` };
      if (r.status !== 404) return { ...r, via: `bearer:${base}` };
    }
  }

  // Try API_USER/API_KEY
  if (API_USER && API_KEY) {
    for (const base of BASES) {
      const sep = endpoint.includes('?') ? '&' : '?';
      const url = `${base}/${endpoint}${qp ? sep + qp : ''}`;
      try {
        const r = await fto(url, {
          method,
          headers: { 'API_USER': API_USER, 'API_KEY': API_KEY, 'Accept': 'application/json', 'Content-Type': 'application/json', 'company': COMPANY },
        });
        const t = await r.text();
        if (r.ok && !isH(t)) return { ok: true, status: r.status, ct: r.headers.get('content-type') || '', text: t, via: `apikeys:${base}` };
        if (r.status !== 404) return { ok: false, status: r.status, ct: r.headers.get('content-type') || '', text: t, via: `apikeys:${base}` };
      } catch {}
    }
  }

  // CF Worker fallback
  try {
    const wp = new URLSearchParams();
    wp.set('endpoint', endpoint);
    if (qp) qp.split('&').forEach(p => { const [k, v] = p.split('='); if (k && v) wp.set(k, decodeURIComponent(v)); });
    const h: Record<string, string> = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
    if (API_USER && API_KEY) { h['X-Api-User'] = API_USER; h['X-Api-Key'] = API_KEY; h['X-Company'] = COMPANY; }
    const o: RequestInit = { method, headers: h };
    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) o.body = body;
    const r = await fto(`${CF_WORKER_URL}/?${wp.toString()}`, o);
    const t = await r.text();
    return { ok: r.ok && !isH(t), status: r.status, ct: r.headers.get('content-type') || '', text: t, via: 'cf-worker' };
  } catch (e: any) {
    return { ok: false, status: 502, ct: '', text: e.message, via: 'cf-error' };
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  if (action === 'diag') {
    const token = await getToken();
    const kc: { client: string; status: number; body: string }[] = [];
    for (const cid of ['admin-cli', 'employed-portal-client', 'workera-frontend']) {
      try {
        const r = await fto(KEYCLOAK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
          body: new URLSearchParams({ grant_type: 'password', client_id: cid, username: USER, password: PASS }).toString(),
        });
        const t = await r.text();
        kc.push({ client: cid, status: r.status, body: t.substring(0, 100) });
      } catch (e: any) { kc.push({ client: cid, status: 0, body: e.message }); }
    }

    const urlTests: { url: string; status: number; body: string }[] = [];
    if (token) {
      for (const base of BASES) {
        const r = await tryBase(base, 'branchOffice', 'page=1', 'GET', null, token);
        urlTests.push({ url: `${base}/branchOffice`, status: r.status, body: r.body.substring(0, 150) });
      }
    }

    return NextResponse.json({ mode: 'v9-url-discovery', tokenOk: !!token, keycloak: kc, urlTests });
  }

  if (action === 'creds') return NextResponse.json({ hasApiKeys: !!(API_USER && API_KEY), apiUser: API_USER ? API_USER.substring(0, 4) + '***' : 'NONE', company: COMPANY });

  const endpoint = searchParams.get('endpoint') || '';
  if (!endpoint) return NextResponse.json({ error: 'Falta "endpoint"' }, { status: 400 });

  const fp: string[] = [];
  searchParams.forEach((v, k) => { if (k !== 'endpoint' && k !== 'action') fp.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`); });

  const r = await workeraFetch(endpoint, fp.join('&'), 'GET', null);
  if (r.ok) return new NextResponse(r.text, { status: 200, headers: { 'Content-Type': r.ct || 'application/json' } });
  return NextResponse.json({ error: `Workera ${r.status} (via ${r.via})`, body: r.text.substring(0, 300) }, { status: r.status >= 500 ? 502 : r.status });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint, body: apiBody, method } = body;
    if (!endpoint) return NextResponse.json({ error: 'Falta "endpoint"' }, { status: 400 });
    const hm = (method || 'POST').toUpperCase();
    const rb = typeof apiBody === 'string' ? apiBody : JSON.stringify(apiBody || {});
    const r = await workeraFetch(endpoint, '', hm, rb);
    if (r.ok) return new NextResponse(r.text, { status: 200, headers: { 'Content-Type': r.ct || 'application/json' } });
    return NextResponse.json({ error: `Workera ${r.status} (via ${r.via})`, body: r.text.substring(0, 300) }, { status: r.status >= 500 ? 502 : r.status });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
}
