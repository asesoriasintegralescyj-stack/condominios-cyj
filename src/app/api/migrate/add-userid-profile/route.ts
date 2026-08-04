/**
 * Migración: Agregar columnas a OrdenTrabajo y MovilProfile
 * 
 * Este endpoint ejecuta:
 * 1. ALTER TABLE para agregar creadoPor, creadoPorNombre, perfilMovilId a OrdenTrabajo
 * 2. ALTER TABLE para agregar userId a MovilProfile
 * 3. Crear índices
 * 4. Vincular perfiles móviles con usuarios del escritorio
 * 5. Actualizar OTs existentes con creadoPor correcto
 * 
 * Uso: GET /api/migrate/add-userid-profile?token=MIGRATE_2026_ALFREDO
 * Requiere: sesión de admin O token de migración válido
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'

const MIGRATE_TOKEN = 'MIGRATE_2026_ALFREDO'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  // Autenticación: sesión admin O token de migración
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  
  // Si tiene token válido, permitir acceso sin sesión
  if (token === MIGRATE_TOKEN) {
    // Token válido, continuar con la migración
  } else {
    // Sin token, verificar sesión admin
    const session = await getCurrentSession()
    if (!session?.user || session.user.rol !== 'admin') {
      return NextResponse.json({ error: 'Solo admin o token de migración válido' }, { status: 403 })
    }
  }

  const results: string[] = []

  try {
    // ─── PASO 1: Agregar columnas con IF NOT EXISTS (PostgreSQL) ───
    // Usar una sola transacción para las ALTER TABLE
    try {
      await db.$executeRawUnsafe(`
        DO $$
        BEGIN
          -- Agregar columnas a MovilProfile
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'MovilProfile' AND column_name = 'userId') THEN
            ALTER TABLE "MovilProfile" ADD COLUMN "userId" TEXT;
          END IF;

          -- Agregar columnas a OrdenTrabajo
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OrdenTrabajo' AND column_name = 'creadoPor') THEN
            ALTER TABLE "OrdenTrabajo" ADD COLUMN "creadoPor" TEXT;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OrdenTrabajo' AND column_name = 'creadoPorNombre') THEN
            ALTER TABLE "OrdenTrabajo" ADD COLUMN "creadoPorNombre" TEXT;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'OrdenTrabajo' AND column_name = 'perfilMovilId') THEN
            ALTER TABLE "OrdenTrabajo" ADD COLUMN "perfilMovilId" TEXT;
          END IF;
        END $$;
      `)
      results.push('✅ Columnas verificadas/agregadas (userId, creadoPor, creadoPorNombre, perfilMovilId)')
    } catch (e: any) {
      results.push(`⚠️ Error en ALTER TABLE: ${e.message}`)
    }

    // ─── PASO 2: Crear índices con IF NOT EXISTS ───
    try {
      await db.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "MovilProfile_userId_idx" ON "MovilProfile" ("userId");
        CREATE INDEX IF NOT EXISTS "OrdenTrabajo_creadoPor_idx" ON "OrdenTrabajo" ("creadoPor");
        CREATE INDEX IF NOT EXISTS "OrdenTrabajo_perfilMovilId_idx" ON "OrdenTrabajo" ("perfilMovilId");
      `)
      results.push('✅ Índices verificados/creados')
    } catch (e: any) {
      results.push(`⚠️ Error en índices: ${e.message}`)
    }

    // ─── PASO 3: Vincular perfiles móviles con usuarios del escritorio ───
    // Usar UPDATE directo con JOIN en vez de bucle
    let vinculadosEmail = 0
    try {
      const resEmail = await db.$executeRawUnsafe(`
        UPDATE "MovilProfile" mp
        SET "userId" = u.id
        FROM "Personal" p
        JOIN "User" u ON p.email ILIKE u.email
        WHERE mp."personalId" = p.id
          AND mp."userId" IS NULL
          AND p.email IS NOT NULL
          AND p.email != ''
      `)
      vinculadosEmail = (resEmail as any).rowCount || 0
      results.push(`✅ Vinculados por email Personal→User: ${vinculadosEmail}`)
    } catch (e: any) {
      results.push(`⚠️ Error vinculando por email: ${e.message}`)
    }

    // Vincular por nombre si no se vinculó por email
    let vinculadosNombre = 0
    try {
      const resNombre = await db.$executeRawUnsafe(`
        UPDATE "MovilProfile" mp
        SET "userId" = u.id
        FROM "User" u
        WHERE mp."userId" IS NULL
          AND (u.nombre ILIKE mp.name OR (u.nombre || ' ' || u."apellido") ILIKE mp.name)
          AND u."activo" = true
      `)
      vinculadosNombre = (resNombre as any).rowCount || 0
      results.push(`✅ Vinculados por nombre: ${vinculadosNombre}`)
    } catch (e: any) {
      results.push(`⚠️ Error vinculando por nombre: ${e.message}`)
    }

    // ─── PASO 4: Actualizar OTs existentes con creadoPor = "Perfil: xxx" → userId ───
    let otsActualizadas = 0
    try {
      const resOTs = await db.$executeRawUnsafe(`
        UPDATE "OrdenTrabajo" ot
        SET "creadoPor" = mp."userId",
            "creadoPorNombre" = mp.name
        FROM "MovilProfile" mp
        WHERE ot."creadoPor" ILIKE '%' || mp.name || '%'
          AND mp."userId" IS NOT NULL
          AND ot."creadoPor" NOT IN (SELECT id FROM "User")
      `)
      otsActualizadas = (resOTs as any).rowCount || 0
      results.push(`✅ OTs actualizadas con userId correcto: ${otsActualizadas}`)
    } catch (e: any) {
      results.push(`⚠️ Error actualizando OTs: ${e.message}`)
    }

    // ─── PASO 5: Diagnóstico final ───
    try {
      const diag = await db.$queryRawUnsafe(`
        SELECT 
          (SELECT COUNT(*) FROM "MovilProfile" WHERE "userId" IS NOT NULL) as perfiles_vinculados,
          (SELECT COUNT(*) FROM "MovilProfile") as perfiles_total,
          (SELECT COUNT(*) FROM "OrdenTrabajo" WHERE "creadoPor" IS NOT NULL) as ots_con_creador,
          (SELECT COUNT(*) FROM "OrdenTrabajo") as ots_total
      `) as any[]
      
      if (diag.length > 0) {
        const d = diag[0]
        results.push(`📊 Diagnóstico: ${d.perfiles_vinculados}/${d.perfiles_total} perfiles vinculados, ${d.ots_con_creador}/${d.ots_total} OTs con creador`)
      }
    } catch (e: any) {
      results.push(`⚠️ Error en diagnóstico: ${e.message}`)
    }

    // Listar perfiles para ver estado
    try {
      const perfiles = await db.$queryRawUnsafe(`
        SELECT mp.id, mp.name, mp."userId", u.nombre as "userNombre", u.email as "userEmail"
        FROM "MovilProfile" mp
        LEFT JOIN "User" u ON mp."userId" = u.id
        ORDER BY mp.name
      `) as any[]
      
      for (const p of perfiles) {
        if (p.userId) {
          results.push(`🔗 ${p.name} → ${p.userNombre || '?'} (${p.userEmail || '?'})`)
        } else {
          results.push(`❌ ${p.name} → SIN vincular`)
        }
      }
    } catch (e: any) {
      results.push(`⚠️ Error listando perfiles: ${e.message}`)
    }

    return NextResponse.json({
      success: true,
      results,
      summary: {
        profilesLinkedByEmail: vinculadosEmail,
        profilesLinkedByName: vinculadosNombre,
        otsUpdated: otsActualizadas,
      }
    })
  } catch (error: any) {
    console.error('Error en migración:', error)
    return NextResponse.json({ 
      error: 'Error en migración', 
      details: error.message,
      results 
    }, { status: 500 })
  }
}
