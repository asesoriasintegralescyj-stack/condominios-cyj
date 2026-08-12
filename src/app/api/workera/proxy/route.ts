/**
 * Workera Proxy v11 — Credentials from request headers + env vars
 * ===============================================================
 * Per Manual API Workera v1.4:
 *   Base URL: https://workera.com/apiClient/v1/{endpoint}
 *   Auth: API_USER + API_KEY headers
 *
 * Credentials priority:
 *   1. X-Api-User / X-Api-Key from request (sent by frontend from localStorage)
 *   2. WORKERA_API_USER / WORKERA_API_KEY env vars (Vercel)
 *   3. Fallback to CF Worker
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const BASE_URL = 'https://workera.com/apiClient/v1';
const CF_WORKER_URL = 'https://workera-proxy.asesoriasintegralescyj.workers.dev';
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
 * Call Workera API directly with API_USER/API_KEY headers
 */
async function callWorkera(
  endpoint: string,
  queryParams: string,
  method: string,
  body: string | null,
  apiUser: string,
  apiKey: string
): Promise<{ ok: boolean; status: number; ct: string; text: string }> {
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${BASE_URL}/${endpoint}${queryParams ? separator + queryParams : ''}`;

  const headers: Record<string, string> = {
    'API_USER': apiUser,
    'API_KEY': apiKey,
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  // Extract credentials: request headers > env vars
  const apiUser = searchParams.get('X-Api-User') || req.headers.get('X-Api-User') || process.env.WORKERA_API_USER || '';
  const apiKey = searchParams.get('X-Api-Key') || req.headers.get('X-Api-Key') || process.env.WORKERA_API_KEY || '';

  // Diagnostic endpoint
  if (action === 'diag') {
    const hasCreds = !!(apiUser && apiKey);
    let testResult: { status: number; ok: boolean; ct: string; body: string } | null = null;
    if (hasCreds) {
      testResult = await callWorkera('branchOffice', 'page=1', 'GET', null, apiUser, apiKey);
    }
    return NextResponse.json({
      mode: 'v11-creds-from-request',
      baseUrl: BASE_URL,
      hasCreds,
      credsSource: searchParams.get('X-Api-User') ? 'request-params' : req.headers.get('X-Api-User') ? 'request-headers' : process.env.WORKERA_API_USER ? 'env-vars' : 'none',
      apiUserPreview: apiUser ? apiUser.substring(0, 4) + '***' : 'NONE',
      branchOfficeTest: testResult ? {
        status: testResult.status,
        ok: testResult.ok,
        contentType: testResult.ct,
        bodyPreview: testResult.text.substring(0, 200),
      } : null,
    });
  }

  if (action === 'creds') {
    return NextResponse.json({
      hasCreds: !!(apiUser && apiKey),
      credsSource: searchParams.get('X-Api-User') ? 'request-params' : req.headers.get('X-Api-User') ? 'request-headers' : process.env.WORKERA_API_USER ? 'env-vars' : 'none',
      apiUserPreview: apiUser ? apiUser.substring(0, 4) + '***' : 'NONE',
    });
  }

  const endpoint = searchParams.get('endpoint') || '';
  if (!endpoint) {
    return NextResponse.json({ error: 'Falta "endpoint"', baseUrl: BASE_URL }, { status: 400 });
  }

  if (!apiUser || !apiKey) {
    return NextResponse.json(
      { error: 'Credenciales no configuradas. Ingresa API_USER y API_KEY en la sección de Workera.' },
      { status: 401 }
    );
  }

  // Build query params (exclude our credential params and action)
  const queryParams: string[] = [];
  searchParams.forEach((v, k) => {
    if (k !== 'endpoint' && k !== 'action' && k !== 'X-Api-User' && k !== 'X-Api-Key') {
      queryParams.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
    }
  });

  // Call Workera directly
  const result = await callWorkera(endpoint, queryParams.join('&'), 'GET', null, apiUser, apiKey);

  if (result.ok) {
    return new NextResponse(result.text, {
      status: 200,
      headers: { 'Content-Type': result.ct || 'application/json' },
    });
  }

  return NextResponse.json(
    { error: `Workera API ${result.status}`, body: result.text.substring(0, 300) },
    { status: result.status >= 500 ? 502 : result.status }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint, body: apiBody, method } = body;

    // Extract credentials: request headers > env vars
    const apiUser = req.headers.get('X-Api-User') || process.env.WORKERA_API_USER || '';
    const apiKey = req.headers.get('X-Api-Key') || process.env.WORKERA_API_KEY || '';

    if (!endpoint) {
      return NextResponse.json({ error: 'Falta "endpoint"' }, { status: 400 });
    }

    if (!apiUser || !apiKey) {
      return NextResponse.json(
        { error: 'Credenciales no configuradas. Ingresa API_USER y API_KEY en la sección de Workera.' },
        { status: 401 }
      );
    }

    const httpMethod = (method || 'POST').toUpperCase();
    const requestBody = typeof apiBody === 'string' ? apiBody : JSON.stringify(apiBody || {});

    const result = await callWorkera(endpoint, '', httpMethod, requestBody, apiUser, apiKey);

    if (result.ok) {
      return new NextResponse(result.text, {
        status: 200,
        headers: { 'Content-Type': result.ct || 'application/json' },
      });
    }

    return NextResponse.json(
      { error: `Workera API ${result.status}`, body: result.text.substring(0, 300) },
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-User, X-Api-Key',
    },
  });
}
