/**
 * API: /api/automatizaciones/seed
 * POST - Inicializar/sincronizar automatizaciones en la BD
 */

import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const AUTOMATIZACIONES_DEFAULT = [
  {
    codigo: 'ALERTA_RONDA_NOCHE',
    nombre: 'Alerta Rondas Noche',
    descripcion: 'Verifica que todas las rondas nocturnas se completaron correctamente y envía alertas si hay incidencias',
    categoria: 'alertas',
    endpoint: '/api/alertas/rondas-diario?shift=noche',
    metodo: 'GET',
    activa: true,
    modoManual: false,
    cronSchedule: '0 10 * * *',
    cronDescription: 'Todos los días a las 10:00',
    requiereAuth: true,
    icono: 'Moon',
    color: 'purple',
    orden: 1,
  },
  {
    codigo: 'ALERTA_RONDA_DIA',
    nombre: 'Alerta Rondas Día',
    descripcion: 'Verifica rondas diurnas y genera reporte de cumplimiento',
    categoria: 'alertas',
    endpoint: '/api/alertas/rondas-diario?shift=dia',
    metodo: 'GET',
    activa: true,
    modoManual: false,
    cronSchedule: '0 10 * * *',
    cronDescription: 'Todos los días a las 10:00',
    requiereAuth: true,
    icono: 'Sun',
    color: 'amber',
    orden: 2,
  },
  {
    codigo: 'BACKUP_AUTO_MENSUAL',
    nombre: 'Respaldo Automático Mensual',
    descripcion: 'Genera un respaldo completo de la base de datos el primer día de cada mes',
    categoria: 'backups',
    endpoint: '/api/backups/auto-mensual',
    metodo: 'POST',
    activa: true,
    modoManual: false,
    cronSchedule: '0 6 1 * *',
    cronDescription: 'Día 1 de cada mes a las 06:00',
    requiereAuth: true,
    icono: 'Database',
    color: 'blue',
    orden: 10,
  },
  {
    codigo: 'REPORTE_SEMANAL',
    nombre: 'Generación Informe Semanal',
    descripcion: 'Genera el informe semanal de actividades y cumplimiento automáticamente',
    categoria: 'reportes',
    endpoint: '/api/reportes/semanal',
    metodo: 'POST',
    activa: false,
    modoManual: true,
    cronSchedule: null,
    cronDescription: null,
    requiereAuth: true,
    icono: 'FileText',
    color: 'green',
    orden: 20,
  },
  {
    codigo: 'CHECKLIST_RONDAS',
    nombre: 'Checklist Rondas QR',
    descripcion: 'Envía notificación de checklist pendiente a guardias al inicio de cada turno',
    categoria: 'rondas',
    endpoint: '/api/alertas/rondas-diario',
    metodo: 'GET',
    activa: false,
    modoManual: true,
    cronSchedule: null,
    cronDescription: null,
    requiereAuth: true,
    icono: 'ClipboardCheck',
    color: 'indigo',
    orden: 30,
  },
  {
    codigo: 'NOTIFICACION_VENCIMIENTO',
    nombre: 'Notificación Vencimientos',
    descripcion: 'Detecta OTs y documentos próximos a vencer y envía alertas al supervisor',
    categoria: 'alertas',
    endpoint: '/api/notificaciones',
    metodo: 'GET',
    activa: true,
    modoManual: false,
    cronSchedule: '0 9 * * 1',
    cronDescription: 'Lunes a las 09:00',
    requiereAuth: true,
    icono: 'Bell',
    color: 'amber',
    orden: 3,
  },
  {
    codigo: 'BACKUP_VERIFICACION',
    nombre: 'Verificación de Respaldos',
    descripcion: 'Verifica que el último respaldo fue exitoso y no es antiguo',
    categoria: 'backups',
    endpoint: '/api/backups',
    metodo: 'GET',
    activa: true,
    modoManual: true,
    cronSchedule: null,
    cronDescription: null,
    requiereAuth: true,
    icono: 'CheckCircle',
    color: 'slate',
    orden: 11,
  },
]

// Crear tablas y columnas si no existen
async function ensureTables() {
  await withRetry(() => db.$executeRawUnsafe(`
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
  `)).catch((err) => console.error('CREATE TABLE Automatizacion error:', err))

  // Migración: agregar columnas nuevas si no existen
  const migrations = [
    `ALTER TABLE "Automatizacion" ADD COLUMN IF NOT EXISTS "correos" TEXT`,
    `ALTER TABLE "Automatizacion" ADD COLUMN IF NOT EXISTS "fechaInicio" TIMESTAMP(3)`,
    `ALTER TABLE "Automatizacion" ADD COLUMN IF NOT EXISTS "fechaFin" TIMESTAMP(3)`,
    `ALTER TABLE "Automatizacion" ADD COLUMN IF NOT EXISTS "horaEjecucion" TEXT`,
    `ALTER TABLE "Automatizacion" ADD COLUMN IF NOT EXISTS "diasSemana" TEXT`,
  ]
  for (const sql of migrations) {
    await withRetry(() => db.$executeRawUnsafe(sql)).catch(() => {})
  }

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
  `)).catch((err) => console.error('CREATE TABLE AutomatizacionLog error:', err))

  const indexes = [
    'CREATE INDEX IF NOT EXISTS "Automatizacion_categoria_idx" ON "Automatizacion"("categoria")',
    'CREATE INDEX IF NOT EXISTS "Automatizacion_activa_idx" ON "Automatizacion"("activa")',
    'CREATE INDEX IF NOT EXISTS "Automatizacion_codigo_idx" ON "Automatizacion"("codigo")',
    'CREATE INDEX IF NOT EXISTS "AutomatizacionLog_automatizacionCodigo_idx" ON "AutomatizacionLog"("automatizacionCodigo")',
    'CREATE INDEX IF NOT EXISTS "AutomatizacionLog_createdAt_idx" ON "AutomatizacionLog"("createdAt")',
  ]
  for (const sql of indexes) {
    await withRetry(() => db.$executeRawUnsafe(sql)).catch(() => {})
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession()
    if (!session?.user || session.user.rol !== 'admin') {
      return NextResponse.json({ error: 'Solo admin' }, { status: 403 })
    }

    await ensureTables()

    let creadas = 0
    let actualizadas = 0

    for (const auto of AUTOMATIZACIONES_DEFAULT) {
      // Verificar si ya existe
      const existing = await withRetry(() => db.$queryRawUnsafe(
        `SELECT "id" FROM "Automatizacion" WHERE "codigo" = $1 LIMIT 1`,
        auto.codigo
      )) as any[]

      if (existing.length > 0) {
        // Actualizar datos estáticos (no sobreescribir activa/modoManual/estadísticas)
        await withRetry(() => db.$executeRawUnsafe(`
          UPDATE "Automatizacion" SET
            "nombre" = $1,
            "descripcion" = $2,
            "categoria" = $3,
            "endpoint" = $4,
            "metodo" = $5,
            "cronSchedule" = $6,
            "cronDescription" = $7,
            "icono" = $8,
            "color" = $9,
            "orden" = $10,
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "codigo" = $11
        `, auto.nombre, auto.descripcion, auto.categoria, auto.endpoint, auto.metodo,
           auto.cronSchedule, auto.cronDescription, auto.icono, auto.color, auto.orden, auto.codigo))
        actualizadas++
      } else {
        // Crear nueva
        await withRetry(() => db.$executeRawUnsafe(`
          INSERT INTO "Automatizacion" (
            "codigo", "nombre", "descripcion", "categoria", "endpoint", "metodo",
            "activa", "modoManual", "cronSchedule", "cronDescription",
            "requiereAuth", "icono", "color", "orden"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `, auto.codigo, auto.nombre, auto.descripcion, auto.categoria, auto.endpoint, auto.metodo,
           auto.activa, auto.modoManual, auto.cronSchedule, auto.cronDescription,
           auto.requiereAuth, auto.icono, auto.color, auto.orden))
        creadas++
      }
    }

    // Log
    try {
      await withRetry(() => db.$executeRawUnsafe(`
        INSERT INTO "AutomatizacionLog" ("automatizacionCodigo", "tipo", "resultado", "mensaje", "ejecutadoPor")
        VALUES ('SYSTEM', 'seed', 'exitoso', $1, $2)
      `, `Seed: ${creadas} creadas, ${actualizadas} actualizadas`, session.user.id))
    } catch (logErr) {
      console.error('Error writing seed log (non-critical):', logErr)
    }

    return NextResponse.json({
      ok: true,
      mensaje: `${creadas} automatizaciones creadas, ${actualizadas} actualizadas`,
    })
  } catch (error: any) {
    console.error('Error POST /api/automatizaciones/seed:', error)
    return NextResponse.json({ ok: false, error: error.message || 'Error interno' }, { status: 500 })
  }
}
