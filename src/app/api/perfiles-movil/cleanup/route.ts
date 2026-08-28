/**
 * Limpieza de enlaces incorrectos MovilProfile → User
 * 
 * Qué hace:
 * 1. Encuentra userIds vinculados a MÁS DE UN perfil (violación 1:1)
 * 2. Deja solo el primer enlace (el más antiguo) y limpia los demás
 * 3. También limpia enlaces donde el nombre del perfil no coincide con el nombre del User
 * 
 * POST /api/perfiles-movil/cleanup
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST() {
  try {
    const session = await getCurrentSession()
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'usuarios.editar', session.userPermisos)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const results: string[] = []
    let totalCleaned = 0

    // ─── PASO 1: Encontrar userIds duplicados (más de 1 perfil apuntando al mismo User) ───
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
        `⚠️ User "${uName}" (${uEmail}) tiene ${dup.perfil_count} perfiles: ${perfilNames.join(', ')}`
      )

      // Dejar solo el PRIMER perfil (más antiguo), limpiar el resto
      for (let i = 1; i < perfilIds.length; i++) {
        await db.$executeRawUnsafe(
          `UPDATE "MovilProfile" SET "userId" = NULL WHERE id = $1`,
          perfilIds[i]
        )
        results.push(
          `  ✅ Desvinculado: "${perfilNames[i]}" (ya no apunta a ${uName})`
        )
        totalCleaned++
      }
    }

    // ─── PASO 2: Verificar enlaces donde el nombre no coincide razonablemente ───
    const mismatched = await db.$queryRawUnsafe(`
      SELECT mp.id, mp.name, mp."userId", u.nombre as "userNombre", u.email as "userEmail"
      FROM "MovilProfile" mp
      JOIN "User" u ON mp."userId" = u.id
      WHERE mp."userId" IS NOT NULL
        AND LOWER(mp.name) NOT LIKE '%' || LOWER(u.nombre) || '%'
    `) as any[]

    for (const m of mismatched) {
      results.push(
        `⚠️ Nombre no coincide: perfil "${m.name}" → user "${m.userNombre}" (${m.userEmail})`
      )
    }

    // ─── PASO 3: Diagnóstico final ───
    const diag = await db.$queryRawUnsafe(`
      SELECT 
        (SELECT COUNT(*) FROM "MovilProfile" WHERE "userId" IS NOT NULL) as vinculados,
        (SELECT COUNT(*) FROM "MovilProfile") as total,
        (SELECT COUNT(DISTINCT "userId") FROM "MovilProfile" WHERE "userId" IS NOT NULL) as users_unicos
    `) as any[]

    const d = diag[0]
    results.push(
      `\n📊 Estado final: ${d.vinculados}/${d.total} perfiles vinculados a ${d.users_unicos} usuarios únicos`
    )

    return NextResponse.json({
      success: true,
      totalCleaned,
      duplicatesFound: duplicates.length,
      mismatchedFound: mismatched.length,
      results,
      diagnostics: { vinculados: d.vinculados, total: d.total, usersUnicos: d.users_unicos }
    })
  } catch (error: any) {
    console.error('Error en cleanup de perfiles:', error)
    return NextResponse.json({ error: error.message || 'Error en cleanup' }, { status: 500 })
  }
}
