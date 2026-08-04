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
    // 1. Verificar si la columna userId ya existe en MovilProfile
    const colCheck = await db.$queryRawUnsafe(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'MovilProfile' AND column_name = 'userId'
    `) as any[]

    if (colCheck.length === 0) {
      await db.$executeRawUnsafe(`ALTER TABLE "MovilProfile" ADD COLUMN "userId" TEXT`)
      results.push('Columna userId agregada a MovilProfile')
    } else {
      results.push('Columna userId ya existe en MovilProfile')
    }

    // 1b. Verificar si la columna perfilMovilId ya existe en OrdenTrabajo
    const colCheckPM = await db.$queryRawUnsafe(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'OrdenTrabajo' AND column_name = 'perfilMovilId'
    `) as any[]

    if (colCheckPM.length === 0) {
      await db.$executeRawUnsafe(`ALTER TABLE "OrdenTrabajo" ADD COLUMN "perfilMovilId" TEXT`)
      results.push('Columna perfilMovilId agregada a OrdenTrabajo')
    } else {
      results.push('Columna perfilMovilId ya existe en OrdenTrabajo')
    }

    // 1c. Verificar si la columna creadoPor ya existe en OrdenTrabajo
    const colCheckCP = await db.$queryRawUnsafe(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'OrdenTrabajo' AND column_name = 'creadoPor'
    `) as any[]

    if (colCheckCP.length === 0) {
      await db.$executeRawUnsafe(`ALTER TABLE "OrdenTrabajo" ADD COLUMN "creadoPor" TEXT`)
      results.push('Columna creadoPor agregada a OrdenTrabajo')
    } else {
      results.push('Columna creadoPor ya existe en OrdenTrabajo')
    }

    // 1d. Verificar si la columna creadoPorNombre ya existe en OrdenTrabajo
    const colCheckCPN = await db.$queryRawUnsafe(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'OrdenTrabajo' AND column_name = 'creadoPorNombre'
    `) as any[]

    if (colCheckCPN.length === 0) {
      await db.$executeRawUnsafe(`ALTER TABLE "OrdenTrabajo" ADD COLUMN "creadoPorNombre" TEXT`)
      results.push('Columna creadoPorNombre agregada a OrdenTrabajo')
    } else {
      results.push('Columna creadoPorNombre ya existe en OrdenTrabajo')
    }

    // 2. Crear índices si no existen
    const idxCheck = await db.$queryRawUnsafe(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'MovilProfile' AND indexname = 'MovilProfile_userId_idx'
    `) as any[]

    if (idxCheck.length === 0) {
      await db.$executeRawUnsafe(`CREATE INDEX "MovilProfile_userId_idx" ON "MovilProfile" ("userId")`)
      results.push('Índice userId creado')
    } else {
      results.push('Índice userId ya existe')
    }

    // 2b. Índice perfilMovilId en OrdenTrabajo
    const idxCheckPM = await db.$queryRawUnsafe(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'OrdenTrabajo' AND indexname = 'OrdenTrabajo_perfilMovilId_idx'
    `) as any[]

    if (idxCheckPM.length === 0) {
      await db.$executeRawUnsafe(`CREATE INDEX "OrdenTrabajo_perfilMovilId_idx" ON "OrdenTrabajo" ("perfilMovilId")`)
      results.push('Índice perfilMovilId creado en OrdenTrabajo')
    } else {
      results.push('Índice perfilMovilId ya existe')
    }

    // 2c. Índice creadoPor en OrdenTrabajo
    const idxCheckCP = await db.$queryRawUnsafe(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'OrdenTrabajo' AND indexname = 'OrdenTrabajo_creadoPor_idx'
    `) as any[]

    if (idxCheckCP.length === 0) {
      await db.$executeRawUnsafe(`CREATE INDEX "OrdenTrabajo_creadoPor_idx" ON "OrdenTrabajo" ("creadoPor")`)
      results.push('Índice creadoPor creado en OrdenTrabajo')
    } else {
      results.push('Índice creadoPor ya existe')
    }

    // 3. Auto-vincular perfiles que tienen personalId → User por email
    const perfilesSinUser = await db.$queryRawUnsafe(`
      SELECT mp.id, mp.name, mp."personalId", p.email, p.nombre as "personalNombre"
      FROM "MovilProfile" mp
      LEFT JOIN "Personal" p ON mp."personalId" = p.id
      WHERE mp."userId" IS NULL AND mp."personalId" IS NOT NULL AND p.email IS NOT NULL AND p.email != ''
    `) as any[]

    let vinculadosEmail = 0
    for (const perfil of perfilesSinUser) {
      try {
        const users = await db.$queryRawUnsafe(`
          SELECT id, email, nombre, apellido FROM "User" WHERE email ILIKE $1 LIMIT 1
        `, perfil.email) as any[]
        
        if (users.length > 0) {
          await db.$executeRawUnsafe(`UPDATE "MovilProfile" SET "userId" = $1 WHERE id = $2`, users[0].id, perfil.id)
          results.push(`Vinculado: ${perfil.name} → ${users[0].nombre} ${users[0].apellido || ''} (${users[0].email})`)
          vinculadosEmail++
        }
      } catch (err: any) {
        results.push(`Error vinculando ${perfil.name}: ${err.message}`)
      }
    }

    // 4. Vincular por nombre si no se encontró por email
    const perfilesSinUser2 = await db.$queryRawUnsafe(`
      SELECT mp.id, mp.name FROM "MovilProfile" mp WHERE mp."userId" IS NULL
    `) as any[]

    let vinculadosNombre = 0
    for (const perfil of perfilesSinUser2) {
      try {
        const users = await db.$queryRawUnsafe(`
          SELECT id, email, nombre, apellido FROM "User" 
          WHERE (nombre ILIKE $1 OR nombre || ' ' || "apellido" ILIKE $1)
          AND "activo" = true LIMIT 1
        `, perfil.name) as any[]
        
        if (users.length > 0) {
          await db.$executeRawUnsafe(`UPDATE "MovilProfile" SET "userId" = $1 WHERE id = $2`, users[0].id, perfil.id)
          results.push(`Vinculado por nombre: ${perfil.name} → ${users[0].nombre} ${users[0].apellido || ''} (${users[0].email})`)
          vinculadosNombre++
        }
      } catch (err: any) {
        results.push(`Error vinculando por nombre ${perfil.name}: ${err.message}`)
      }
    }

    results.push(`Vinculados por email: ${vinculadosEmail}, por nombre: ${vinculadosNombre}`)

    // 5. Actualizar OTs existentes con creadoPor = "Perfil: xxx" → userId
    const otsParaActualizar = await db.$queryRawUnsafe(`
      SELECT ot.id, mp."userId", mp.name
      FROM "OrdenTrabajo" ot
      JOIN "MovilProfile" mp ON ot."creadoPor" ILIKE '%' || mp.name || '%'
      WHERE ot."creadoPor" NOT IN (SELECT id FROM "User") AND mp."userId" IS NOT NULL
    `) as any[]

    let otsActualizadas = 0
    for (const ot of otsParaActualizar) {
      try {
        await db.$executeRawUnsafe(`UPDATE "OrdenTrabajo" SET "creadoPor" = $1 WHERE id = $2`, ot.userId, ot.id)
        otsActualizadas++
      } catch (err: any) {
        results.push(`Error actualizando OT ${ot.id}: ${err.message}`)
      }
    }
    results.push(`OTs actualizadas con userId correcto: ${otsActualizadas}`)

    return NextResponse.json({
      success: true,
      results,
      summary: {
        columnAdded: colCheck.length === 0,
        indexAdded: idxCheck.length === 0,
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
