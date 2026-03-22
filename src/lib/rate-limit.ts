/**
 * Rate Limiting Utility
 * Sistema de Gestión de Condominios v3
 * Asesorías Integrales CyJ SpA
 * 
 * Implements in-memory rate limiting (Edge Runtime compatible)
 */

import { NextResponse } from 'next/server';

// Rate limit configuration per endpoint type
export const RATE_LIMIT_CONFIG = {
  // Authentication endpoints: 5 requests per minute
  auth: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 5 * 60 * 1000, // 5 minutes block
  },
  // API read operations: 60 requests per minute
  read: {
    maxRequests: 60,
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 5 * 60 * 1000,
  },
  // API write operations: 30 requests per minute
  write: {
    maxRequests: 30,
    windowMs: 60 * 1000,
    blockDurationMs: 5 * 60 * 1000,
  },
  // PDF generation: 10 requests per minute
  pdf: {
    maxRequests: 10,
    windowMs: 60 * 1000,
    blockDurationMs: 5 * 60 * 1000,
  },
  // Bulk operations: 5 requests per minute
  bulk: {
    maxRequests: 5,
    windowMs: 60 * 1000,
    blockDurationMs: 5 * 60 * 1000,
  },
} as const;

export type RateLimitType = keyof typeof RATE_LIMIT_CONFIG;

// In-memory rate limit store (Edge Runtime compatible)
interface RateLimitEntry {
  count: number;
  windowStart: number;
  blockedUntil: number | null;
}

// Use a Map for in-memory storage
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup interval
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
let lastCleanup = Date.now();

/**
 * Clean up expired entries
 */
function cleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  
  lastCleanup = now;
  
  for (const [key, entry] of rateLimitStore.entries()) {
    // Remove entries where block has expired and window is old
    if (entry.blockedUntil && entry.blockedUntil < now) {
      rateLimitStore.delete(key);
    } else if (!entry.blockedUntil && now - entry.windowStart > 5 * 60 * 1000) {
      rateLimitStore.delete(key);
    }
  }
}

/**
 * Get endpoint type based on path and method
 */
export function getEndpointTypeWithMethod(pathname: string, method: string): RateLimitType {
  // Auth endpoints - always use auth limits
  if (pathname.startsWith('/api/auth/')) {
    return 'auth';
  }
  
  // PDF generation - always use pdf limits
  if (pathname.startsWith('/api/pdf/')) {
    return 'pdf';
  }
  
  // Bulk operations - always use bulk limits
  if (pathname.includes('/bulk')) {
    return 'bulk';
  }
  
  // Import operations are bulk-like
  if (pathname.includes('/import/')) {
    return 'bulk';
  }
  
  // Seed endpoints are bulk-like
  if (pathname.includes('/seed')) {
    return 'bulk';
  }
  
  // Write operations
  const writeMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
  if (writeMethods.includes(method.toUpperCase())) {
    return 'write';
  }
  
  // Default to read limits
  return 'read';
}

/**
 * Extract IP address from request
 */
export function getClientIp(request: Request): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }
  
  // Fallback to a default
  return 'unknown';
}

/**
 * Rate limit result interface
 */
export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
  blocked: boolean;
}

/**
 * Check rate limit for a request (in-memory, Edge Runtime compatible)
 */
export async function checkRateLimit(
  ip: string,
  endpoint: string,
  type: RateLimitType
): Promise<RateLimitResult> {
  const config = RATE_LIMIT_CONFIG[type];
  const now = Date.now();
  const key = `${ip}:${endpoint}`;
  
  // Run cleanup periodically
  cleanup();
  
  // Get existing entry
  const entry = rateLimitStore.get(key);
  
  // Check if currently blocked
  if (entry?.blockedUntil && entry.blockedUntil > now) {
    const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: 0,
      reset: new Date(entry.blockedUntil),
      retryAfter,
      blocked: true,
    };
  }
  
  // Check if window has expired or no entry exists
  if (!entry || now - entry.windowStart > config.windowMs) {
    // Create new entry
    rateLimitStore.set(key, {
      count: 1,
      windowStart: now,
      blockedUntil: null,
    });
    
    return {
      allowed: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      reset: new Date(now + config.windowMs),
      blocked: false,
    };
  }
  
  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    // Block the IP
    const blockedUntil = now + config.blockDurationMs;
    entry.blockedUntil = blockedUntil;
    rateLimitStore.set(key, entry);
    
    const retryAfter = Math.ceil(config.blockDurationMs / 1000);
    return {
      allowed: false,
      limit: config.maxRequests,
      remaining: 0,
      reset: new Date(blockedUntil),
      retryAfter,
      blocked: true,
    };
  }
  
  // Increment counter
  entry.count++;
  rateLimitStore.set(key, entry);
  
  return {
    allowed: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - entry.count,
    reset: new Date(entry.windowStart + config.windowMs),
    blocked: false,
  };
}

/**
 * Create a rate limit exceeded response
 */
export function createRateLimitResponse(result: RateLimitResult): NextResponse {
  const response = {
    error: 'Demasiadas solicitudes',
    message: `Has excedido el límite de solicitudes. Intenta nuevamente en ${result.retryAfter} segundos.`,
    retryAfter: result.retryAfter || 300,
  };
  
  return NextResponse.json(response, {
    status: 429,
    headers: {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(result.reset.getTime() / 1000).toString(),
      'Retry-After': (result.retryAfter || 300).toString(),
    },
  });
}

/**
 * Get a simplified endpoint path for rate limiting
 */
export function getRateLimitEndpoint(pathname: string): string {
  // Remove dynamic segments for grouping
  const patterns: Array<{ pattern: RegExp; replacement: string }> = [
    // UUID-like IDs
    { pattern: /\/[a-z0-9]{25,}$/i, replacement: '/:id' },
    // Numeric IDs
    { pattern: /\/\d+$/, replacement: '/:id' },
    // CUIDs
    { pattern: /\/cl[a-z0-9]{20,}$/i, replacement: '/:id' },
  ];
  
  let endpoint = pathname;
  for (const { pattern, replacement } of patterns) {
    endpoint = endpoint.replace(pattern, replacement);
  }
  
  return endpoint;
}

/**
 * Check if path should be rate limited
 */
export function shouldRateLimit(pathname: string): boolean {
  // Only rate limit API routes
  if (!pathname.startsWith('/api/')) {
    return false;
  }
  
  // Exclude certain public routes from rate limiting
  const excludedRoutes = [
    '/api/auth/session',
    '/api/auth/init-admin',
  ];
  
  for (const route of excludedRoutes) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      return false;
    }
  }
  
  return true;
}
