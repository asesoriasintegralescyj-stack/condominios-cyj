/**
 * API: /api/automatizaciones
 * GET  - Listar todas las automatizaciones (y crear tablas si no existen)
 * PATCH - Actualizar cualquier campo (activa, modoManual, correos, schedule, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Crear tablas y columnas si no existen
async function ensureTables() {
  // Crear tabla si no existe
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
      "correos" TEXT,
      "fechaInicio" TIMESTAMP(3),
      "fechaFin" TIMESTAMP(3),
      "horaEjecucion" TEXT,
      "diasSemana" TEXT,
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
  `).catch((err) => console.error('CREATE TABLE Automatizacion error:', err))

  // Migración: agregar columnas nuevas si no existen
  const migrations = [
    `ALTER TABLE "Automatizacion" ADD COLUMN IF NOT EXISTS "correos" TEXT`,
    `ALTER TABLE "Automatizacion" ADD COLUMN IF NOT EXISTS "fechaInicio" TIMESTAMP(3)`,
    `ALTER TABLE "Automatizacion" ADD COLUMN IF NOT EXISTS "fechaFin" TIMESTAMP(3)`,
    `ALTER TABLE "Automatizacion" ADD COLUMN IF NOT EXISTS "horaEjecucion" TEXT`,
    `ALTER TABLE "Automatizacion" ADD COLUMN IF NOT EXISTS "diasSemana" TEXT`,
  ]
  for (const sql of migrations) {
    await db.$executeRawUnsafe(sql).catch((err) => console.error('Migration error:', sql, err))
  }

  // Tabla de logs
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
  `).catch((err) => console.error('CREATE TABLE AutomatizacionLog error:', err))

  // Índices
  const indexes = [
    'CREATE INDEX IF NOT EXISTS "Automatizacion_categoria_idx" ON "Automatizacion"("categoria")',
    'CREATE INDEX IF NOT EXISTS "Automatizacion_activa_idx" ON "Automatizacion"("activa")',
    'CREATE INDEX IF NOT EXISTS "Automatizacion_codigo_idx" ON "Automatizacion"("codigo")',
    'CREATE INDEX IF NOT EXISTS "AutomatizacionLog_automatizacionCodigo_idx" ON "AutomatizacionLog"("automatizacionCodigo")',
    'CREATE INDEX IF NOT EXISTS "AutomatizacionLog_createdAt_idx" ON "AutomatizacionLog"("createdAt")',
  ]
  for (const sql of indexes) {
    await db.$executeRawUnsafe(sql).catch(() => {})
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

    // Asegurar que las tablas y columnas existen antes de operar
    await ensureTables()

    const body = await request.json()
    const { codigo } = body

    if (!codigo) {
      return NextResponse.json({ error: 'codigo es requerido' }, { status: 400 })
    }

    // Verificar que la automatización existe
    const existing = await db.$queryRawUnsafe(
      `SELECT "codigo" FROM "Automatizacion" WHERE "codigo" = $1 LIMIT 1`,
      codigo
    ) as any[]

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Automatización no encontrada' }, { status: 404 })
    }

    // Construir SET dinámico con los campos permitidos
    const allowedFields = [
      'activa', 'modoManual', 'correos', 'cronSchedule', 'cronDescription',
      'fechaInicio', 'fechaFin', 'horaEjecucion', 'diasSemana',
      'reintentos', 'timeoutMs', 'maxDuration', 'parametros',
    ]

    const setClauses: string[] = []
    const values: any[] = []
    let paramIdx = 1

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        let value = body[field]

        // Convertir arrays a JSON string
        if (field === 'correos' || field === 'diasSemana' || field === 'parametros') {
          value = Array.isArray(value) ? JSON.stringify(value) : value
        }
        // Convertir fechas a string ISO (para compatibilidad con $executeRawUnsafe)
        else if (field === 'fechaInicio' || field === 'fechaFin') {
          if (value) {
            // Si es "2026-10-11", convertir a timestamp compatible
            value = new Date(value).toISOString()
          } else {
            value = null
          }
        }

        setClauses.push(`"${field}" = $${paramIdx}`)
        values.push(value)
        paramIdx++
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    setClauses.push(`"updatedAt" = CURRENT_TIMESTAMP`)
    values.push(codigo)

    const sql = `UPDATE "Automatizacion" SET ${setClauses.join(', ')} WHERE "codigo" = $${paramIdx}`
    console.log('PATCH SQL:', sql)
    console.log('PATCH values:', JSON.stringify(values))

    await db.$executeRawUnsafe(sql, ...values)

    // Log
    const changedFields = allowedFields.filter(f => body[f] !== undefined)
    try {
      await db.$executeRawUnsafe(`
        INSERT INTO "AutomatizacionLog" ("automatizacionCodigo", "tipo", "resultado", "mensaje", "ejecutadoPor")
        VALUES ($1, 'configuracion', 'exitoso', $2, $3)
      `, codigo, `Campos actualizados: ${changedFields.join(', ')}`, session.user.id)
    } catch (logErr) {
      console.error('Error writing config log (non-critical):', logErr)
    }

    return NextResponse.json({ ok: true, updated: changedFields })
  } catch (error: any) {
    console.error('Error PATCH /api/automatizaciones:', error)
    return NextResponse.json({ error: error.message || 'Error interno', detail: error.code }, { status: 500 })
  }
}
