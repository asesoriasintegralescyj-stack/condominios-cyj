/**
 * Migración perfiles: vincular, listar, y limpiar enlaces
 * 
 * GET  ?token=MIGRATE_2026_ALFREDO                          → Ejecutar cleanup
 * GET  ?token=MIGRATE_2026_ALFREDO&action=cleanup             → Limpiar enlaces + resincronizar
 * GET  ?token=MIGRATE_2026_ALFREDO&action=fix-counter         → Reparar contadores Secuencia
 * GET  ?token=MIGRATE_2026_ALFREDO&action=list                → Listar estado sin ejecutar
 * POST ?token=MIGRATE_2026_ALFREDO                           → Vincular manualmente
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const MIGRATE_TOKEN = 'MIGRATE_2026_ALFREDO'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// ─── LIMPIEZA COMPLETA ───
async function runCleanup() {
  const results: string[] = []
  let totalCleaned = 0

  // PASO 1: Encontrar userIds duplicados
  const duplicates = await db.$queryRawUnsafe(`
    SELECT "userId", COUNT(*)::int as perfil_count, 
           ARRAY_AGG(id ORDER BY "createdAt") as perfil_ids,
           ARRAY_AGG(name ORDER BY "createdAt") as perfil_names
    FROM "MovilProfile"
    WHERE "userId" IS NOT NULL
    GROUP BY "userId"
    HAVING COUNT(*) > 1
  `) as any[]

  for (const dup of duplicates) {
    const perfilIds = dup.perfil_ids
    const perfilNames = dup.perfil_names
    const userName = await db.$queryRawUnsafe(
      `SELECT nombre, email FROM "User" WHERE id = $1`,
      dup.userId
    ) as any[]
    const uName = userName[0]?.nombre || '?'
    const uEmail = userName[0]?.email || '?'

    results.push(`User "${uName}" (${uEmail}) tiene ${dup.perfil_count} perfiles: ${perfilNames.join(', ')}`)

    for (let i = 0; i < perfilIds.length; i++) {
      await db.$executeRawUnsafe(
        `UPDATE "MovilProfile" SET "userId" = NULL WHERE id = $1`,
        perfilIds[i]
      )
      results.push(`  Desvinculado: "${perfilNames[i]}"`)
      totalCleaned++
    }
  }

  // PASO 2: Limpiar donde nombre no coincide (excluir perfiles de rol)
  const ROLE_PROFILES = ['ADMINISTRADOR', 'SUPERVISOR', 'CONSERJE', 'Conserje', 'Administrador', 'Supervisor']
  const mismatched = await db.$queryRawUnsafe(`
    SELECT mp.id, mp.name, mp."userId", u.nombre as "userNombre", u.email as "userEmail"
    FROM "MovilProfile" mp
    JOIN "User" u ON mp."userId" = u.id
    WHERE mp."userId" IS NOT NULL
      AND LOWER(mp.name) NOT LIKE '%' || LOWER(u.nombre) || '%'
  `) as any[]

  for (const m of mismatched) {
    // Skip role-based profiles (ADMINISTRADOR, SUPERVISOR, Conserje)
    if (ROLE_PROFILES.includes(m.name)) {
      results.push(`Nombre no coincide pero es perfil de rol - MANTENIENDO: "${m.name}" -> "${m.userNombre}" (${m.userEmail})`)
      continue
    }
    await db.$executeRawUnsafe(
      `UPDATE "MovilProfile" SET "userId" = NULL WHERE id = $1`,
      m.id
    )
    results.push(`Nombre no coincide - desvinculado: "${m.name}" de "${m.userNombre}" (${m.userEmail})`)
    totalCleaned++
  }

  // PASO 3: Re-sincronizar por email exacto (1:1)
  const users = await db.$queryRawUnsafe(`
    SELECT id, nombre, apellido, email FROM "User" WHERE "activo" = true
  `) as any[]

  const emailMap = new Map<string, string>()
  for (const u of users) {
    if (u.email) emailMap.set(u.email.toLowerCase().trim(), u.id)
  }

  const toLink = await db.$queryRawUnsafe(`
    SELECT mp.id, mp.name, p.email as "personalEmail"
    FROM "MovilProfile" mp
    JOIN "Personal" p ON mp."personalId" = p.id
    WHERE mp."userId" IS NULL 
      AND mp."personalId" IS NOT NULL
      AND p.email IS NOT NULL 
      AND p.email != ''
  `) as any[]

  const alreadyUsed = new Set<string>()
  const existingLinks = await db.$queryRawUnsafe(`
    SELECT "userId" FROM "MovilProfile" WHERE "userId" IS NOT NULL
  `) as any[]
  for (const link of existingLinks) alreadyUsed.add(link.userId)

  let reLinked = 0
  for (const perfil of toLink) {
    const pEmail = (perfil.personalEmail || '').toLowerCase().trim()
    const userId = emailMap.get(pEmail)
    if (!userId || alreadyUsed.has(userId)) continue

    const user = users.find(u => u.id === userId)
    if (!user) continue

    const perfilName = perfil.name.toLowerCase().trim()
    const userName = user.nombre.toLowerCase().trim()
    const userFullName = `${user.nombre} ${user.apellido || ''}`.toLowerCase().trim()
    const nameMatch = perfilName.includes(userName.split(' ')[0]) || userFullName.includes(perfilName.split(' ')[0])
    if (!nameMatch) {
      results.push(`Sin vincular (nombre no coincide): "${perfil.name}"`)
      continue
    }

    await db.$executeRawUnsafe(
      `UPDATE "MovilProfile" SET "userId" = $1 WHERE id = $2`,
      userId, perfil.id
    )
    alreadyUsed.add(userId)
    results.push(`Vinculado: "${perfil.name}" -> "${user.nombre} ${user.apellido || ''}" (${user.email})`)
    reLinked++
  }

  // PASO 4: Actualizar OTs con perfilMovilId pero sin creadoPor
  let otsUpdated = 0
  try {
    const res = await db.$executeRawUnsafe(`
      UPDATE "OrdenTrabajo" ot
      SET "creadoPor" = mp."userId",
          "creadoPorNombre" = mp.name
      FROM "MovilProfile" mp
      WHERE ot."perfilMovilId" = mp.id
        AND mp."userId" IS NOT NULL
        AND (ot."creadoPor" IS NULL OR ot."creadoPor" = '')
    `)
    otsUpdated = Number(res) || 0
    if (otsUpdated > 0) {
      results.push(`OTs actualizadas con creadoPor desde perfilMovilId: ${otsUpdated}`)
    }
  } catch (e: any) {
    results.push(`Error actualizando OTs: ${e.message}`)
  }

  // PASO 5: Diagnostico final
  const diag = await db.$queryRawUnsafe(`
    SELECT 
      (SELECT COUNT(*)::int FROM "MovilProfile" WHERE "userId" IS NOT NULL) as vinculados,
      (SELECT COUNT(*)::int FROM "MovilProfile") as total,
      (SELECT COUNT(DISTINCT "userId")::int FROM "MovilProfile" WHERE "userId" IS NOT NULL) as users_unicos
  `) as any[]

  const d = diag[0]
  results.push(`ESTADO FINAL: ${d.vinculados}/${d.total} perfiles vinculados a ${d.users_unicos} usuarios unicos`)

  return {
    success: true,
    totalCleaned: Number(totalCleaned),
    reLinked: Number(reLinked),
    duplicatesFound: Number(duplicates.length),
    mismatchedFound: Number(mismatched.length),
    results,
    diagnostics: { 
      vinculados: Number(d.vinculados), 
      total: Number(d.total), 
      usersUnicos: Number(d.users_unicos) 
    }
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  
  if (token !== MIGRATE_TOKEN) {
    return NextResponse.json({ error: 'Token de migración inválido' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { action } = body

    // Si se pide cleanup por POST
    if (action === 'cleanup') {
      const result = await runCleanup()
      return NextResponse.json(result)
    }

    const { profileId, userId, profileName, userEmail } = body

    if (profileId && userId) {
      await db.$executeRawUnsafe(
        `UPDATE "MovilProfile" SET "userId" = $1 WHERE id = $2`,
        userId, profileId
      )
      const perfil = await db.$queryRawUnsafe(
        `SELECT name FROM "MovilProfile" WHERE id = $1`,
        profileId
      ) as any[]
      const user = await db.$queryRawUnsafe(
        `SELECT nombre, email FROM "User" WHERE id = $1`,
        userId
      ) as any[]
      return NextResponse.json({
        success: true,
        message: `Vinculado: ${perfil[0]?.name || profileId} -> ${user[0]?.nombre || userId} (${user[0]?.email || ''})`
      })
    }

    if (profileName && userEmail) {
      const users = await db.$queryRawUnsafe(
        `SELECT id, nombre, email FROM "User" WHERE email ILIKE $1 LIMIT 1`,
        userEmail
      ) as any[]
      if (users.length === 0) {
        return NextResponse.json({ error: `No se encontró usuario con email: ${userEmail}` }, { status: 404 })
      }
      const profiles = await db.$queryRawUnsafe(
        `SELECT id, name FROM "MovilProfile" WHERE name ILIKE $1 LIMIT 1`,
        profileName
      ) as any[]
      if (profiles.length === 0) {
        return NextResponse.json({ error: `No se encontró perfil con nombre: ${profileName}` }, { status: 404 })
      }
      await db.$executeRawUnsafe(
        `UPDATE "MovilProfile" SET "userId" = $1 WHERE id = $2`,
        users[0].id, profiles[0].id
      )
      return NextResponse.json({
        success: true,
        message: `Vinculado: ${profiles[0].name} -> ${users[0].nombre} (${users[0].email})`
      })
    }

    if (profileName && !userEmail) {
      const profiles = await db.$queryRawUnsafe(
        `SELECT id, name, "userId", "personalId" FROM "MovilProfile" WHERE name ILIKE $1`,
        `%${profileName}%`
      ) as any[]
      if (profiles.length === 0) {
        return NextResponse.json({ error: `No se encontró perfil con nombre: ${profileName}` }, { status: 404 })
      }
      const users = await db.$queryRawUnsafe(
        `SELECT id, nombre, apellido, email, "activo" FROM "User" WHERE "activo" = true ORDER BY nombre`
      ) as any[]
      return NextResponse.json({
        success: true,
        profile: profiles[0],
        availableUsers: users
      })
    }

    return NextResponse.json({ error: 'Especifique profileId+userId, profileName+userEmail, o action=cleanup' }, { status: 400 })
  } catch (error: any) {
    console.error('Error en migrate vincular-perfil:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ─── FIX COUNTER: Reparar contadores de Secuencia ───
async function runFixCounter() {
  const results: string[] = []

  // ─── Reparar contador de OrdenTrabajo ───
  const maxOT = await db.$queryRawUnsafe(`
    SELECT COALESCE(MAX(CAST(SUBSTRING("otNum" FROM 4) AS INT)), 0)::int as max_num
    FROM "OrdenTrabajo"
  `) as any[]

  const maxOTNum = maxOT[0]?.max_num || 0

  const secOT = await db.$queryRawUnsafe(`
    SELECT "ultimoNum"::int as num FROM "Secuencia" WHERE "tabla" = 'OrdenTrabajo'
  `) as any[]

  const currentSec = secOT[0]?.num || 0

  results.push(`OrdenTrabajo: MAX(otNum)=${maxOTNum}, Secuencia.ultimoNum=${currentSec}`)

  if (currentSec < maxOTNum) {
    await db.$executeRawUnsafe(`
      INSERT INTO "Secuencia" ("id", "tabla", "prefijo", "ultimoNum", "padding", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), 'OrdenTrabajo', 'OT', $1, 4, NOW(), NOW())
      ON CONFLICT ("tabla") DO UPDATE SET "ultimoNum" = $1, "updatedAt" = NOW()
    `, maxOTNum)
    results.push(`  CORREGIDO: Secuencia actualizada de ${currentSec} a ${maxOTNum}`)
  } else {
    results.push(`  OK: Secuencia ya está correcta (${currentSec} >= ${maxOTNum})`)
  }

  // ─── Reparar contador de Proyecto ───
  const maxProy = await db.$queryRawUnsafe(`
    SELECT COALESCE(MAX(CAST(SUBSTRING("codigo" FROM 6) AS INT)), 0)::int as max_num
    FROM "Proyecto"
  `) as any[]

  const maxProyNum = maxProy[0]?.max_num || 0

  const secProy = await db.$queryRawUnsafe(`
    SELECT "ultimoNum"::int as num FROM "Secuencia" WHERE "tabla" = 'Proyecto'
  `) as any[]

  const currentProySec = secProy[0]?.num || 0

  results.push(`Proyecto: MAX(codigo)=${maxProyNum}, Secuencia.ultimoNum=${currentProySec}`)

  if (currentProySec < maxProyNum) {
    await db.$executeRawUnsafe(`
      INSERT INTO "Secuencia" ("id", "tabla", "prefijo", "ultimoNum", "padding", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), 'Proyecto', 'PROY', $1, 3, NOW(), NOW())
      ON CONFLICT ("tabla") DO UPDATE SET "ultimoNum" = $1, "updatedAt" = NOW()
    `, maxProyNum)
    results.push(`  CORREGIDO: Proyecto actualizado de ${currentProySec} a ${maxProyNum}`)
  }

  // ─── Reparar contador de SolicitudCompra ───
  const maxSC = await db.$queryRawUnsafe(`
    SELECT COALESCE(MAX(CAST(SUBSTRING("codigo" FROM 4) AS INT)), 0)::int as max_num
    FROM "SolicitudCompra"
  `) as any[]

  const maxSCNum = maxSC[0]?.max_num || 0

  const secSC = await db.$queryRawUnsafe(`
    SELECT "ultimoNum"::int as num FROM "Secuencia" WHERE "tabla" = 'SolicitudCompra'
  `) as any[]

  const currentSCSec = secSC[0]?.num || 0

  results.push(`SolicitudCompra: MAX(codigo)=${maxSCNum}, Secuencia.ultimoNum=${currentSCSec}`)

  if (currentSCSec < maxSCNum) {
    await db.$executeRawUnsafe(`
      INSERT INTO "Secuencia" ("id", "tabla", "prefijo", "ultimoNum", "padding", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), 'SolicitudCompra', 'SC', $1, 3, NOW(), NOW())
      ON CONFLICT ("tabla") DO UPDATE SET "ultimoNum" = $1, "updatedAt" = NOW()
    `, maxSCNum)
    results.push(`  CORREGIDO: SolicitudCompra actualizado de ${currentSCSec} a ${maxSCNum}`)
  }

  // ─── Diagnóstico final: mostrar todos los contadores ───
  const allSec = await db.$queryRawUnsafe(`
    SELECT "tabla", "prefijo", "ultimoNum"::int as "ultimoNum", "padding" 
    FROM "Secuencia" ORDER BY "tabla"
  `) as any[]

  results.push(`\nTodos los contadores:`)
  for (const s of allSec) {
    results.push(`  ${s.prefijo} (${s.tabla}): ultimoNum=${s.ultimoNum}, padding=${s.padding}`)
  }

  return {
    success: true,
    results,
    otFixed: currentSec < maxOTNum,
    otOldValue: currentSec,
    otNewValue: maxOTNum,
  }
}

// GET: Ejecuta acción según parámetro
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const action = searchParams.get('action') || 'cleanup'
  
  if (token !== MIGRATE_TOKEN) {
    return NextResponse.json({ error: 'Token de migración inválido' }, { status: 403 })
  }

  try {
    if (action === 'fix-counter') {
      const result = await runFixCounter()
      return NextResponse.json(result)
    }

    if (action === 'list') {
      // Solo listar, no ejecutar cambios
      const profiles = await db.movilProfile.findMany({ orderBy: { name: 'asc' } })
      const users = await db.user.findMany({ orderBy: { nombre: 'asc' } })
      return NextResponse.json({ profiles, users })
    }

    // Default: cleanup
    const result = await runCleanup()
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
