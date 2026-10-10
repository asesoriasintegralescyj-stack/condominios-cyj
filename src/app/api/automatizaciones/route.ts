/**
 * API: /api/automatizaciones
 * GET  - Listar todas las automatizaciones
 * PATCH - Toggle activa/modoManual
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Crear tablas si no existen
async function ensureTables() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Automatizacion" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "codigo" TEXT NOT NULL,
      "nombre" TEXT NOT NULL,
      "descripcion" TEXT,
      "categoria" TEXT NOT NULL,
      "endpoint" TEXT NOT NULL,
      "metodo" TEXT NOT NULL DEFAULT 'GET',
      "activa" BOOLEAN NOT NULL DEFAULT true,
      "modoManual" BOOLEAN NOT NULL DEFAULT false,
      "cronSchedule" TEXT,
      "cronDescription" TEXT,
      "requiereAuth" BOOLEAN NOT NULL DEFAULT true,
      "maxDuration" INTEGER NOT NULL DEFAULT 30000,
      "reintentos" INTEGER NOT NULL DEFAULT 1,
      "timeoutMs" INTEGER NOT NULL DEFAULT 30000,
      "parametros" TEXT,
      "icono" TEXT,
      "color" TEXT,
      "orden" INTEGER NOT NULL DEFAULT 0,
      "ultimaEjecucion" TIMESTAMP(3),
      "ultimoResultado" TEXT,
      "ultimoError" TEXT,
      "proximaEjecucion" TIMESTAMP(3),
      "ejecucionesExitosas" INTEGER NOT NULL DEFAULT 0,
      "ejecucionesFallidas" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Automatizacion_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "Automatizacion_codigo_key" UNIQUE ("codigo")
    );
  `)

  await db.$executeRawUnsafe(`
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
  `)

  // Crear índices si no existen
  const indexes = [
    'CREATE INDEX IF NOT EXISTS "Automatizacion_categoria_idx" ON "Automatizacion"("categoria")',
    'CREATE INDEX IF NOT EXISTS "Automatizacion_activa_idx" ON "Automatizacion"("activa")',
    'CREATE INDEX IF NOT EXISTS "Automatizacion_codigo_idx" ON "Automatizacion"("codigo")',
    'CREATE INDEX IF NOT EXISTS "AutomatizacionLog_automatizacionCodigo_idx" ON "AutomatizacionLog"("automatizacionCodigo")',
    'CREATE INDEX IF NOT EXISTS "AutomatizacionLog_createdAt_idx" ON "AutomatizacionLog"("createdAt")',
  ]
  for (const sql of indexes) {
    await db.$executeRawUnsafe(sql)
  }
}

export async function GET() {
  try {
    const session = await getCurrentSession()
    if (!session?.user || session.user.rol !== 'admin') {
      return NextResponse.json({ error: 'Solo admin' }, { status: 403 })
    }

    await ensureTables()

    const automatizaciones = await db.$queryRawUnsafe(`
      SELECT * FROM "Automatizacion" ORDER BY "orden" ASC, "nombre" ASC
    `) as any[]

    return NextResponse.json(automatizaciones)
  } catch (error: any) {
    console.error('Error GET /api/automatizaciones:', error)
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getCurrentSession()
    if (!session?.user || session.user.rol !== 'admin') {
      return NextResponse.json({ error: 'Solo admin' }, { status: 403 })
    }

    await ensureTables()

    const body = await request.json()
    const { codigo, activa, modoManual } = body

    if (!codigo) {
      return NextResponse.json({ error: 'codigo es requerido' }, { status: 400 })
    }

    const updates: string[] = []
    const values: any[] = []
    let paramIdx = 1

    if (activa !== undefined) {
      updates.push(`"activa" = $${paramIdx}`)
      values.push(activa)
      paramIdx++
    }
    if (modoManual !== undefined) {
      updates.push(`"modoManual" = $${paramIdx}`)
      values.push(modoManual)
      paramIdx++
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    updates.push(`"updatedAt" = CURRENT_TIMESTAMP`)
    values.push(codigo)

    await db.$executeRawUnsafe(`
      UPDATE "Automatizacion" SET ${updates.join(', ')} WHERE "codigo" = $${paramIdx}
    `, ...values)

    // Log
    const tipo = activa !== undefined ? (activa ? 'activar' : 'desactivar') : (modoManual !== undefined ? (modoManual ? 'modo_manual' : 'modo_auto') : 'toggle')
    await db.$executeRawUnsafe(`
      INSERT INTO "AutomatizacionLog" ("automatizacionCodigo", "tipo", "resultado", "ejecutadoPor")
      VALUES ($1, $2, 'exitoso', $3)
    `, codigo, tipo, session.user.id)

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error('Error PATCH /api/automatizaciones:', error)
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}
