/**
 * Vincular manualmente un MovilProfile con un User
 * 
 * Uso: POST /api/migrate/vincular-perfil?token=MIGRATE_2026_ALFREDO
 * Body: { profileId: "xxx", userId: "yyy" } o { profileName: "Alfredo", userEmail: "alfredo@xxx.cl" }
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const MIGRATE_TOKEN = 'MIGRATE_2026_ALFREDO'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  
  if (token !== MIGRATE_TOKEN) {
    return NextResponse.json({ error: 'Token de migración inválido' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { profileId, userId, profileName, userEmail } = body

    if (profileId && userId) {
      // Vinculación directa por IDs
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
        message: `Vinculado: ${perfil[0]?.name || profileId} → ${user[0]?.nombre || userId} (${user[0]?.email || ''})`
      })
    }

    if (profileName && userEmail) {
      // Vinculación por nombre y email
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
        message: `Vinculado: ${profiles[0].name} → ${users[0].nombre} (${users[0].email})`
      })
    }

    // Si solo viene profileName, listar candidatos de User
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

    return NextResponse.json({ error: 'Especifique profileId+userId o profileName+userEmail' }, { status: 400 })
  } catch (error: any) {
    console.error('Error vinculando perfil:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET: Listar todos los perfiles y usuarios disponibles para vincular
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  
  if (token !== MIGRATE_TOKEN) {
    return NextResponse.json({ error: 'Token de migración inválido' }, { status: 403 })
  }

  try {
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
