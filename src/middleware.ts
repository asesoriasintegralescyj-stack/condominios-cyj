import { NextRequest, NextResponse } from 'next/server'

// ============================================================
// Rate Limiting por IP + Security Headers
// P8: Protección contra password spraying, brute force PINs,
//     spam de recuperación, y abuso de endpoints públicos
// ============================================================

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory rate limit store (resets on cold start — acceptable for serverless)
const rateLimits = new Map<string, RateLimitEntry>()

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = rateLimits.get(key)

  if (!entry || now > entry.resetTime) {
    rateLimits.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }

  entry.count++
  if (entry.count > limit) {
    return false
  }
  return true
}

// Rate limit configurations
const RATE_LIMITS: Array<{
  pattern: RegExp
  limit: number
  windowMs: number
  name: string
}> = [
  // Login: 20 requests per minute
  { pattern: /^\/api\/auth\/login/, limit: 20, windowMs: 60_000, name: 'login' },
  // Recuperar password: 5 requests per 5 minutes
  { pattern: /^\/api\/auth\/recuperar-password/, limit: 5, windowMs: 300_000, name: 'recuperar' },
  // Reset password: 10 requests per 15 minutes
  { pattern: /^\/api\/auth\/reset-password/, limit: 10, windowMs: 900_000, name: 'reset' },
  // Cambiar password: 10 per 15 min
  { pattern: /^\/api\/auth\/cambiar-password/, limit: 10, windowMs: 900_000, name: 'cambiar' },
  // Verify PIN code: 10 per 5 min
  { pattern: /^\/api\/profiles\/verify-code/, limit: 10, windowMs: 300_000, name: 'verify-code' },
  // Patentes OCR: 10 per min
  { pattern: /^\/api\/patentes\/ocr/, limit: 10, windowMs: 60_000, name: 'ocr' },
  // QR rondas generate: 10 per min
  { pattern: /^\/api\/qr-rondas\/generate/, limit: 10, windowMs: 60_000, name: 'qr-generate' },
  // QR scans sync: 10 per min
  { pattern: /^\/api\/qr-scans\/sync/, limit: 10, windowMs: 60_000, name: 'qr-sync' },
  // Automatizaciones ejecutar: 5 per min
  { pattern: /^\/api\/automatizaciones\/ejecutar/, limit: 5, windowMs: 60_000, name: 'auto-ejec' },
  // Backups: 3 per 5 min
  { pattern: /^\/api\/backups/, limit: 3, windowMs: 300_000, name: 'backups' },
  // Migrate endpoints: 5 per hour (should be removed but limit just in case)
  { pattern: /^\/api\/migrate/, limit: 5, windowMs: 3_600_000, name: 'migrate' },
]

const GENERAL_LIMIT = 300 // 300 requests per minute general
const GENERAL_WINDOW = 60_000

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const ip = getClientIP(request)
  const pathname = request.nextUrl.pathname

  // ============================================
  // Security Headers
  // ============================================
  response.headers.set('X-DNS-Prefetch-Control', 'on')
  response.headers.set('X-Content-Type-Options', 'nosniff')

  // ============================================
  // Rate Limiting
  // ============================================
  if (pathname.startsWith('/api/')) {
    // Check specific route limits first
    let rateLimited = false
    for (const config of RATE_LIMITS) {
      if (config.pattern.test(pathname)) {
        const key = `${config.name}:${ip}`
        if (!checkRateLimit(key, config.limit, config.windowMs)) {
          return NextResponse.json(
            { error: 'Demasiadas solicitudes. Intente nuevamente más tarde.' },
            { status: 429, headers: { 'Retry-After': String(Math.ceil(config.windowMs / 1000)) } }
          )
        }
        rateLimited = true
        break
      }
    }

    // General API rate limit
    if (!rateLimited) {
      const key = `general:${ip}`
      if (!checkRateLimit(key, GENERAL_LIMIT, GENERAL_WINDOW)) {
        return NextResponse.json(
          { error: 'Demasiadas solicitudes. Intente nuevamente más tarde.' },
          { status: 429, headers: { 'Retry-After': '60' } }
        )
      }
    }
  }

  // ============================================
  // CORS — strict allowlist for API routes
  // ============================================
  response.headers.delete('Access-Control-Allow-Origin')
  if (pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin')
    const allowedOrigins = [
      'https://condominios-cyj.vercel.app',
      'http://localhost:3000',
    ]
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      response.headers.set('Access-Control-Max-Age', '86400')
    }
  }

  // Handle OPTIONS preflight
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: response.headers })
  }

  return response
}

export const config = {
  matcher: [
    '/api/:path*',
  ],
}
