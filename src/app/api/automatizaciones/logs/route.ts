/**
 * API: /api/automatizaciones/logs
 * GET - Listar logs de ejecución de automatizaciones
 *
 * Query params:
 *   codigo?  - Filtrar por código de automatización
 *   limite?  - Número máximo de logs (default 50, max 200)
 */

import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Crear tabla de logs si no existe
let tablesEnsured = false

async function ensureTables() {
  if (tablesEnsured) return
  try {
    await withRetry(() => db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AutomatizacionLog" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
        "automatizacionCodigo" TEXT NOT NULL,
        "tipo" TEXT NOT NULL,
        "resultado" TEXT NOT NULL,
        "mensaje" TEXT,
        "error" TEXT,
        "duracionMs" INTEGER,
        "ejecutadoPor" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "AutomatizacionLog_pkey" PRIMARY KEY ("id")
      );
    `))
    // Índice para búsqueda por código
    await withRetry(() => db.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "AutomatizacionLog_automatizacionCodigo_idx" ON "AutomatizacionLog"("automatizacionCodigo")`
    )).catch(() => {})
    // Índice para ordenar por fecha
    await withRetry(() => db.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "AutomatizacionLog_createdAt_idx" ON "AutomatizacionLog"("createdAt")`
    )).catch(() => {})
    tablesEnsured = true
  } catch (err) {
    console.error('ensureTables error (non-fatal):', err)
    tablesEnsured = true
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession()
    if (!session?.user || (session.user.rol !== 'admin' && session.user.rol !== 'supervisor')) {
      return NextResponse.json({ error: 'Solo admin/supervisor' }, { status: 403 })
    }

    await ensureTables()

    const searchParams = request.nextUrl.searchParams
    const codigo = searchParams.get('codigo') || ''
    const limite = Math.min(parseInt(searchParams.get('limite') || '50', 10) || 50, 200)

    let logs: any[]
    if (codigo) {
      logs = await withRetry(() => db.$queryRawUnsafe(`
        SELECT * FROM "AutomatizacionLog"
        WHERE "automatizacionCodigo" = $1
        ORDER BY "createdAt" DESC
        LIMIT $2
      `, codigo, limite)) as any[]
    } else {
      logs = await withRetry(() => db.$queryRawUnsafe(`
        SELECT * FROM "AutomatizacionLog"
        ORDER BY "createdAt" DESC
        LIMIT $1
      `, limite)) as any[]
    }

    return NextResponse.json({ logs })
  } catch (error: any) {
    console.error('Error GET /api/automatizaciones/logs:', error)
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}
