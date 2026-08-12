/**
 * Workera Proxy v10 — Follows Manual API Workera v1.4 exactly
 * ==========================================================
 * Base URL: https://workera.com/apiClient/v1/{endpoint}
 * Auth: API_USER + API_KEY headers (NOT Bearer)
 * Fallback: Cloudflare Worker (for geo-blocked requests)
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// Manual v1.4: all endpoints use this base
const BASE_URL = 'https://workera.com/apiClient/v1';
const CF_WORKER_URL = 'https://workera-proxy.asesoriasintegralescyj.workers.dev';

const COMPANY = process.env.WORKERA_COMPANY || 'lagunanorte';
const API_USER = process.env.WORKERA_API_USER || '';
const API_KEY = process.env.WORKERA_API_KEY || '';

const TIMEOUT = 20000;

async function fetchWithTimeout(url: string, options: RequestInit, ms = TIMEOUT) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function isHtml(text: string): boolean {
  return text.trim().startsWith('<') || text.trim().startsWith('<!DOCTYPE');
}

/**
 * Primary: Call Workera API directly with API_USER/API_KEY headers
 * Per Manual v1.4 section "Instrucciones para la utilización de API's"
 */
async function callWorkeraDirect(
  endpoint: string,
  queryParams: string,
  method: string,
  body: string | null
): Promise<{ ok: boolean; status: number; ct: string; text: string }> {
  if (!API_USER || !API_KEY) {
    return { ok: false, status: 401, ct: 'application/json', text: JSON.stringify({ error: 'No API_USER/API_KEY configured' }) };
  }

  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${BASE_URL}/${endpoint}${queryParams ? separator + queryParams : ''}`;

  const headers: Record<string, string> = {
    'API_USER': API_USER,
    'API_KEY': API_KEY,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  const fetchOptions: RequestInit = { method, headers };
  if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
    fetchOptions.body = body;
  }

  try {
    const response = await fetchWithTimeout(url, fetchOptions);
    const text = await response.text();
    return {
      ok: response.ok && !isHtml(text),
      status: response.status,
      ct: response.headers.get('content-type') || '',
      text,
    };
  } catch (e: any) {
    return { ok: false, status: 0, ct: '', text: e.message };
  }
}

/**
 * Fallback: Route through CF Worker when direct call fails (e.g. geo-block)
 */
async function callViaCFWorker(
  endpoint: string,
  queryParams: string,
  method: string,
  body: string | null
): Promise<{ ok: boolean; status: number; ct: string; text: string }> {
  try {
    const params = new URLSearchParams();
    params.set('endpoint', endpoint);
    if (queryParams) {
      queryParams.split('&').forEach(p => {
        const [k, v] = p.split('=');
        if (k && v) params.set(k, decodeURIComponent(v));
      });
    }

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    if (API_USER && API_KEY) {
      headers['X-Api-User'] = API_USER;
      headers['X-Api-Key'] = API_KEY;
      headers['X-Company'] = COMPANY;
    }

    const fetchOptions: RequestInit = { method, headers };
    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      fetchOptions.body = body;
    }

    const response = await fetchWithTimeout(`${CF_WORKER_URL}/?${params.toString()}`, fetchOptions);
    const text = await response.text();
    return {
      ok: response.ok && !isHtml(text),
      status: response.status,
      ct: response.headers.get('content-type') || '',
      text,
    };
  } catch (e: any) {
    return { ok: false, status: 502, ct: '', text: e.message };
  }
}

/**
 * Main fetch: try direct first, then CF Worker fallback
 */
async function workeraFetch(
  endpoint: string,
  queryParams: string,
  method: string,
  body: string | null
): Promise<{ ok: boolean; status: number; ct: string; text: string; via: string }> {
  // 1. Direct call per Manual v1.4
  const direct = await callWorkeraDirect(endpoint, queryParams, method, body);
  if (direct.ok) return { ...direct, via: 'direct' };
  // If we get a real API error (not network/timeout), return it
  if (direct.status >= 400 && direct.status < 500) return { ...direct, via: 'direct' };

  // 2. CF Worker fallback (for geo-block, network issues, etc.)
  const cf = await callViaCFWorker(endpoint, queryParams, method, body);
  return { ...cf, via: 'cf-worker' };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  // Diagnostic endpoint
  if (action === 'diag') {
    const hasKeys = !!(API_USER && API_KEY);
    
    // Test the correct base URL per manual v1.4
    const testResult = await callWorkeraDirect('branchOffice', 'page=1', 'GET', null);
    
    return NextResponse.json({
      mode: 'v10-manual-v1.4',
      baseUrl: BASE_URL,
      hasApiKeys: hasKeys,
      apiUser: API_USER ? API_USER.substring(0, 4) + '***' : 'NONE',
      company: COMPANY,
      branchOfficeTest: {
        status: testResult.status,
        ok: testResult.ok,
        contentType: testResult.ct,
        bodyPreview: testResult.text.substring(0, 200),
      },
    });
  }

  if (action === 'creds') {
    return NextResponse.json({
      hasApiKeys: !!(API_USER && API_KEY),
      apiUser: API_USER ? API_USER.substring(0, 4) + '***' : 'NONE',
      company: COMPANY,
      baseUrl: BASE_URL,
    });
  }

  const endpoint = searchParams.get('endpoint') || '';
  if (!endpoint) {
    return NextResponse.json({ error: 'Falta "endpoint"', baseUrl: BASE_URL }, { status: 400 });
  }

  // Build query params (exclude our own params)
  const queryParams: string[] = [];
  searchParams.forEach((v, k) => {
    if (k !== 'endpoint' && k !== 'action') {
      queryParams.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
    }
  });

  const result = await workeraFetch(endpoint, queryParams.join('&'), 'GET', null);

  if (result.ok) {
    return new NextResponse(result.text, {
      status: 200,
      headers: { 'Content-Type': result.ct || 'application/json' },
    });
  }

  return NextResponse.json(
    { error: `Workera API ${result.status} (via ${result.via})`, body: result.text.substring(0, 300) },
    { status: result.status >= 500 ? 502 : result.status }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint, body: apiBody, method } = body;

    if (!endpoint) {
      return NextResponse.json({ error: 'Falta "endpoint"' }, { status: 400 });
    }

    const httpMethod = (method || 'POST').toUpperCase();
    const requestBody = typeof apiBody === 'string' ? apiBody : JSON.stringify(apiBody || {});

    const result = await workeraFetch(endpoint, '', httpMethod, requestBody);

    if (result.ok) {
      return new NextResponse(result.text, {
        status: 200,
        headers: { 'Content-Type': result.ct || 'application/json' },
      });
    }

    return NextResponse.json(
      { error: `Workera API ${result.status} (via ${result.via})`, body: result.text.substring(0, 300) },
      { status: result.status >= 500 ? 502 : result.status }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
