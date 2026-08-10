/**
 * Proxy API Workera - Edge Function
 * ----------------------------------
 * Este endpoint actúa como proxy entre el frontend y la API de Workera.
 * Corre como Edge Function en Vercel (runtime=edge), ejecutándose en el
 * PoP más cercano al usuario. Para usuarios en Chile, esto es Santiago (SCL),
 * evadiendo el bloqueo geográfico de Workera/Cloudflare.
 *
 * Autenticación Workera: Headers API_USER + API_KEY
 * API Base: https://api.workera.com/apiClient/v1/{servicio}
 *
 * GET  /api/workera/proxy?action=diag          - Diagnóstico
 * GET  /api/workera/proxy?action=testgeo       - Test geo-block
 * GET  /api/workera/proxy?action=clearcache     - Limpiar cache
 * POST /api/workera/proxy                       - Proxy request
 *        Body: { "endpoint": "employee", "params": { "page": "1" } }
 */
import { NextRequest, NextResponse } from 'next/server'

const WORKERA_BASE_URL = 'https://api.workera.com/apiClient/v1'
// IP del cliente en Chile — se envía como header para intentar bypass de geo-block
const CHILE_CLIENT_IP = '181.43.202.93'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// Credenciales: prioridad env vars > fallback
function getCredentials(): { apiUser: string; apiKey: string } {
  const envUser = process.env.WORKERA_API_USER
  const envKey = process.env.WORKERA_API_KEY

  // Si hay env vars configuradas, usar esas
  if (envUser && envKey) {
    return { apiUser: envUser, apiKey: envKey }
  }

  // Fallback: credenciales embebidas (mover a env vars en producción)
  return {
    apiUser: 'administracionlagunanorte@gmail.com',
    apiKey: '2aa45c642463dfa30a7d903ee06b08e3',
  }
}

// Endpoints permitidos (whitelist)
const ALLOWED_ENDPOINTS = [
  'employee',
  'attendanceData',
  'workshift/assign',
  'workshift/schedules',
  'permission',
  'permissionTypes',
  'overtimeAuthorization',
  'branchOffice',
  'department',
  'timezone',
]

// Cache simple en memoria (Edge Functions no tienen persistencia entre requests)
const cache = new Map<string, { data: unknown; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

async function workeraFetch(endpoint: string, params: Record<string, string>): Promise<unknown> {
  const { apiUser, apiKey } = getCredentials()

  const url = new URL(`${WORKERA_BASE_URL}/${endpoint}`)
  Object.entries(params).forEach(([k, v]) => {
    if (v) url.searchParams.append(k, v)
  })

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'API_USER': apiUser,
      'API_KEY': apiKey,
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      // Headers clave: intentan hacer que Workera vea la petición como originada desde Chile
      'ip_client': CHILE_CLIENT_IP,
      'X-Forwarded-For': CHILE_CLIENT_IP,
      'X-Real-IP': CHILE_CLIENT_IP,
    },
  })

  // Detectar geo-block: Workera devuelve HTML cuando bloquea por país
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('text/html')) {
    const text = await response.text()
    throw new Error(`Workera bloqueó la petición (geo-block). Edge location: ${text.substring(0, 200)}`)
  }

  if (!response.ok) {
    const text = await response.text().catch(() => 'Error desconocido')
    throw new Error(`Workera API ${response.status}: ${text.substring(0, 300)}`)
  }

  return response.json()
}

// GET handler: diagnósticos y cache management
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  // === DIAG ===
  if (action === 'diag') {
    const creds = getCredentials()
    const isUsingEnv = !!process.env.WORKERA_API_USER && !!process.env.WORKERA_API_KEY
    return NextResponse.json({
      status: 'ok',
      runtime: 'edge',
      timestamp: new Date().toISOString(),
      apiBase: WORKERA_BASE_URL,
      credentials: isUsingEnv ? 'env_vars' : 'fallback_embedded',
      cacheSize: cache.size,
      ipClientHeader: CHILE_CLIENT_IP,
      edgeLocation: {
        country: request.headers.get('x-vercel-ip-country') || 'unknown',
        city: request.headers.get('x-vercel-edge-city') || 'unknown',
      },
    })
  }

  // === CREDS (para modo directo desde browser) ===
  if (action === 'creds') {
    const { apiUser, apiKey } = getCredentials()
    return NextResponse.json({ apiUser, apiKey })
  }

  // === TEST GEO ===
  if (action === 'testgeo') {
    try {
      const data = await workeraFetch('branchOffice', { page: '1' })
      return NextResponse.json({ geoTest: 'OK', data })
    } catch (err: any) {
      return NextResponse.json({
        geoTest: 'FAILED',
        error: err.message,
        edgeLocation: request.headers.get('x-vercel-ip-country') || 'unknown',
      })
    }
  }

  // === CLEAR CACHE ===
  if (action === 'clearcache') {
    cache.clear()
    return NextResponse.json({ status: 'cache_cleared' })
  }

  // === PROXY DIRECTO (legacy: ?endpoint=xxx) ===
  const endpoint = searchParams.get('endpoint')
  if (endpoint) {
    try {
      const endpointBase = endpoint.split('?')[0]
      if (!ALLOWED_ENDPOINTS.includes(endpointBase)) {
        return NextResponse.json({ error: `Endpoint no permitido: ${endpointBase}` }, { status: 400 })
      }

      const params: Record<string, string> = {}
      searchParams.forEach((value, key) => {
        if (key !== 'endpoint' && value) params[key] = value
      })

      const data = await workeraFetch(endpoint, params)
      return NextResponse.json(data)
    } catch (err: any) {
      const isGeo = err.message.includes('geo-block') || err.message.includes('Country')
      return NextResponse.json({ error: err.message, geoBlocked: isGeo }, { status: isGeo ? 502 : 500 })
    }
  }

  return NextResponse.json({ error: 'Acción no reconocida. Usa ?action=diag|testgeo|clearcache o ?endpoint=xxx' }, { status: 400 })
}

// POST handler: proxy requests con body JSON
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { endpoint, params = {} } = body

    if (!endpoint) {
      return NextResponse.json({ error: 'Falta "endpoint" en el body (ej: "employee", "attendanceData")' }, { status: 400 })
    }

    const endpointBase = endpoint.split('?')[0]
    if (!ALLOWED_ENDPOINTS.includes(endpointBase)) {
      return NextResponse.json({ error: `Endpoint no permitido: ${endpointBase}` }, { status: 400 })
    }

    // Verificar cache
    const cacheKey = `${endpoint}:${JSON.stringify(params)}`
    const cached = cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        ...(cached.data as Record<string, unknown>),
        _cached: true,
        _cacheAge: Math.round((Date.now() - cached.timestamp) / 1000),
      })
    }

    const data = await workeraFetch(endpoint, params)

    // Guardar en cache
    cache.set(cacheKey, { data, timestamp: Date.now() })

    return NextResponse.json(data)
  } catch (err: any) {
    const isGeo = err.message.includes('geo-block') || err.message.includes('Country')
    return NextResponse.json({ error: err.message, geoBlocked: isGeo }, { status: isGeo ? 502 : 500 })
  }
}
