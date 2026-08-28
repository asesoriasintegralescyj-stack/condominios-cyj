/**
 * Migración perfiles: vincular, listar, y limpiar enlaces
 * 
 * GET  ?token=MIGRATE_2026_ALFREDO                          → Listar estado
 * GET  ?token=MIGRATE_2026_ALFREDO&action=cleanup             → Limpiar enlaces + resincronizar
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
    SELECT "userId", COUNT(*) as perfil_count, 
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

  // PASO 2: Limpiar donde nombre no coincide
  const mismatched = await db.$queryRawUnsafe(`
    SELECT mp.id, mp.name, mp."userId", u.nombre as "userNombre", u.email as "userEmail"
    FROM "MovilProfile" mp
    JOIN "User" u ON mp."userId" = u.id
    WHERE mp."userId" IS NOT NULL
      AND LOWER(mp.name) NOT LIKE '%' || LOWER(u.nombre) || '%'
  `) as any[]

  for (const m of mismatched) {
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

  // PASO 4: Diagnostico final
  const diag = await db.$queryRawUnsafe(`
    SELECT 
      (SELECT COUNT(*) FROM "MovilProfile" WHERE "userId" IS NOT NULL) as vinculados,
      (SELECT COUNT(*) FROM "MovilProfile") as total,
      (SELECT COUNT(DISTINCT "userId") FROM "MovilProfile" WHERE "userId" IS NOT NULL) as users_unicos
  `) as any[]

  const d = diag[0]
  results.push(`ESTADO FINAL: ${d.vinculados}/${d.total} perfiles vinculados a ${d.users_unicos} usuarios unicos`)

  return {
    success: true,
    totalCleaned,
    reLinked,
    duplicatesFound: duplicates.length,
    mismatchedFound: mismatched.length,
    results,
    diagnostics: { vinculados: d.vinculados, total: d.total, usersUnicos: d.users_unicos }
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

// GET: Listar estado o ejecutar cleanup
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const action = searchParams.get('action')
  
  if (token !== MIGRATE_TOKEN) {
    return NextResponse.json({ error: 'Token de migración inválido' }, { status: 403 })
  }

  try {
    // Si se pide cleanup por GET
    if (action === 'cleanup') {
      const result = await runCleanup()
      return NextResponse.json(result)
    }

    // Por defecto: listar estado
    const profiles = await db.$queryRawUnsafe(`
      SELECT mp.id, mp.name, mp."userId", u.nombre as "userNombre", u.email as "userEmail"
      FROM "MovilProfile" mp
      LEFT JOIN "User" u ON mp."userId" = u.id
      ORDER BY mp.name
    `) as any[]

    const users = await db.$queryRawUnsafe(`
      SELECT id, nombre, apellido, email, rol, "activo"
      FROM "User"
      ORDER BY nombre
    `) as any[]

    return NextResponse.json({ profiles, users })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
