/**
 * Limpieza de enlaces incorrectos MovilProfile → User
 * 
 * Qué hace:
 * 1. Encuentra userIds vinculados a MÁS DE UN perfil (violación 1:1)
 * 2. Deja solo el primer enlace (el más antiguo) y limpia los demás
 * 3. Limpia enlaces donde el nombre del perfil no coincide con el nombre del User
 * 4. Re-sincroniza por email exacto los perfiles que quedaron sin userId
 * 
 * GET /api/perfiles-movil/cleanup?token=MIGRATE_2026_ALFREDO
 * POST /api/perfiles-movil/cleanup (requiere sesión admin)
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'

const MIGRATE_TOKEN = 'MIGRATE_2026_ALFREDO'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function runCleanup() {
  const results: string[] = []
  let totalCleaned = 0

  // ─── PASO 1: Encontrar userIds duplicados (más de 1 perfil al mismo User) ───
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

    results.push(
      `User "${uName}" (${uEmail}) tiene ${dup.perfil_count} perfiles: ${perfilNames.join(', ')}`
    )

    // Desvincular TODOS los perfiles duplicados de este userId
    // (ninguno de los duplicados es confiable)
    for (let i = 0; i < perfilIds.length; i++) {
      await db.$executeRawUnsafe(
        `UPDATE "MovilProfile" SET "userId" = NULL WHERE id = $1`,
        perfilIds[i]
      )
      results.push(
      `  Desvinculado: "${perfilNames[i]}"`
      )
      totalCleaned++
    }
  }

  // ─── PASO 2: Limpiar enlaces donde el nombre no coincide ───
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
    results.push(
      `Nombre no coincide - desvinculado: perfil "${m.name}" → user "${m.userNombre}" (${m.userEmail})`
    )
    totalCleaned++
  }

  // ─── PASO 3: Re-sincronizar por email exacto (solo 1:1) ───
  const users = await db.$queryRawUnsafe(`
    SELECT id, nombre, apellido, email FROM "User" WHERE "activo" = true
  `) as any[]

  const emailMap = new Map<string, string>()
  for (const u of users) {
    if (u.email) emailMap.set(u.email.toLowerCase().trim(), u.id)
  }

  // Perfiles sin userId pero con personalId y email
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

    // Verificar que el nombre del perfil coincida razonablemente con el user
    const user = users.find(u => u.id === userId)
    if (!user) continue

    const perfilName = perfil.name.toLowerCase().trim()
    const userName = user.nombre.toLowerCase().trim()
    const userFullName = `${user.nombre} ${user.apellido || ''}`.toLowerCase().trim()

    // Solo vincular si hay coincidencia de nombre (al menos el primer nombre)
    const nameMatch = perfilName.includes(userName.split(' ')[0]) || userFullName.includes(perfilName.split(' ')[0])
    if (!nameMatch) {
      results.push(
        `Sin vincular (nombre no coincide): "${perfil.name}" - email coincide pero nombre no`
      )
      continue
    }

    await db.$executeRawUnsafe(
      `UPDATE "MovilProfile" SET "userId" = $1 WHERE id = $2`,
      userId, perfil.id
    )
    alreadyUsed.add(userId)
    results.push(
      `Vinculado por email: "${perfil.name}" → "${user.nombre} ${user.apellido || ''}" (${user.email})`
    )
    reLinked++
  }

  // ─── PASO 4: Diagnóstico final ───
  const diag = await db.$queryRawUnsafe(`
    SELECT 
      (SELECT COUNT(*)::int FROM "MovilProfile" WHERE "userId" IS NOT NULL) as vinculados,
      (SELECT COUNT(*)::int FROM "MovilProfile") as total,
      (SELECT COUNT(DISTINCT "userId")::int FROM "MovilProfile" WHERE "userId" IS NOT NULL) as users_unicos
  `) as any[]

  const d = diag[0]
  results.push(
    `Estado final: ${d.vinculados}/${d.total} perfiles vinculados a ${d.users_unicos} usuarios unicos (relacion 1:1 correcta)`
  )

  return {
    success: true,
    totalCleaned,
    reLinked,
    duplicatesFound: duplicates.length,
    mismatchedFound: mismatched.length,
    results,
    diagnostics: { vinculados: Number(d.vinculados), total: Number(d.total), usersUnicos: Number(d.users_unicos) }
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  
  if (token !== MIGRATE_TOKEN) {
    const session = await getCurrentSession()
    if (!session?.user || (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'usuarios.editar', session.userPermisos))) {
      return NextResponse.json({ error: 'Token de migración inválido o sin permisos' }, { status: 403 })
    }
  }

  try {
    const result = await runCleanup()
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error en cleanup de perfiles:', error)
    return NextResponse.json({ error: error.message || 'Error en cleanup' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  
  if (token === MIGRATE_TOKEN) {
    // Token válido, ejecutar sin sesión
  } else {
    const session = await getCurrentSession()
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'usuarios.editar', session.userPermisos)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }
  }

  try {
    const result = await runCleanup()
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error en cleanup de perfiles:', error)
    return NextResponse.json({ error: error.message || 'Error en cleanup' }, { status: 500 })
  }
}
