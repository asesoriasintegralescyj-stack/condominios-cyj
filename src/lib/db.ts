import { PrismaClient } from '@prisma/client'

// Force reload after database reset - v2
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Singleton correcto: reutilizar la instancia en desarrollo para evitar
// quedarse sin conexiones durante hot-reload de Next.js.
//
// OPTIMIZADO: En producción (Vercel Pro + Aiven) usamos connection_limit=3
// y pool_timeout=30s. Con el plan Pro hay más capacidad de servidorless
// functions, permitiendo mayor paralelismo sin saturar el pool de Aiven.
//
// Antes: connection_limit=1 (free tier)
// Ahora: connection_limit=3 (plan Pro)
const databaseUrl = process.env.DATABASE_URL || ''
const connectionLimit = 1
const poolTimeout = 60

const connectionString = databaseUrl.includes('?')
  ? databaseUrl + (
      databaseUrl.includes('connection_limit')
        ? ''
        : `&connection_limit=${connectionLimit}&pool_timeout=${poolTimeout}`
    )
  : databaseUrl + `?connection_limit=${connectionLimit}&pool_timeout=${poolTimeout}`

export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: connectionString,
    },
  },
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

/**
 * Ejecuta una función Prisma con reintentos automáticos.
 *
 * En Aiven, las conexiones pueden fallar intermitentemente por:
 *  - Pool de conexiones agotado
 *  - Timeouts de red entre Vercel y Aiven
 *  - Reinicios del servicio gratuito
 *  - "Too many database connections opened"
 *
 * Esta función reintenta la operación hasta 3 veces (reducido de 5) con
 * backoff exponencial antes de propagar el error. Reducimos de 5 a 3
 * reintentos para no bloquear serverless functions por más de ~10s.
 *
 * Uso:
 *   const personal = await withRetry(() => db.personal.findMany())
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 500
): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: unknown) {
      lastError = error

      const err = error as { code?: string; message?: string }

      // Errores de Prisma reintentables
      const isPrismaRetryable =
        err?.code === 'P1001' || // Connection refused
        err?.code === 'P1002' || // Connection terminated
        err?.code === 'P1017' || // Server closed the connection
        err?.code === 'P2024' || // Timed out fetching connection from pool
        err?.code === 'P5010'    // Connection timeout

      // Errores de PostgreSQL reintentables
      const isPgRetryable =
        err?.message && (
          err.message.includes('Connection refused') ||
          err.message.includes('Connection terminated') ||
          err.message.includes('Timed out') ||
          err.message.includes('timeout') ||
          err.message.includes('ECONNRESET') ||
          err.message.includes('ETIMEDOUT') ||
          err.message.includes("Can't reach database server") ||
          err.message.includes('Too many database connections') ||
          err.message.includes('remaining connection slots') ||
          err.message.includes('too many clients already') ||
          err.message.includes('connection slot') ||
          err.message.includes('no more connections') ||
          err.message.includes('could not establish a connection')
        )

      const isRetryable = isPrismaRetryable || isPgRetryable

      if (!isRetryable || attempt === maxRetries) {
        throw error
      }

      // Backoff exponencial: 500ms, 1000ms, 2000ms
      const delay = baseDelayMs * Math.pow(2, attempt - 1)
      console.warn(
        `[withRetry] Intento ${attempt}/${maxRetries} falló (${err?.code || 'unknown'}), ` +
        `reintentando en ${delay}ms...`
      )
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}
