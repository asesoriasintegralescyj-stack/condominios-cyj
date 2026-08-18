/**
 * Auto-Sincronizar: vincula perfiles móviles con usuarios de escritorio
 * Busca coincidencias por email del Personal vinculado → email del User
 * También intenta coincidencia por nombre/apellido.
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

    // 1. Obtener todos los perfiles SIN userId pero CON personalId
    const perfiles = await db.$queryRawUnsafe(`
      SELECT mp.id, mp.name, mp."personalId", mp."userId",
             p.nombre as "personalNombre", p.email as "personalEmail"
      FROM "MovilProfile" mp
      JOIN "Personal" p ON mp."personalId" = p.id
      WHERE mp."userId" IS NULL AND mp."personalId" IS NOT NULL
    `) as any[]

    // 2. Obtener todos los usuarios activos
    const users = await db.$queryRawUnsafe(`
      SELECT id, nombre, apellido, email FROM "User" WHERE "activo" = true
    `) as any[]

    // 3. Crear mapa de email → userId
    const emailMap = new Map<string, string>()
    for (const u of users) {
      if (u.email) emailMap.set(u.email.toLowerCase().trim(), u.id)
    }

    // 4. Vincular por email del personal
    let linked = 0
    for (const perfil of perfiles) {
      const personalEmail = (perfil.personalEmail || '').toLowerCase().trim()
      if (!personalEmail) continue

      const userId = emailMap.get(personalEmail)
      if (userId) {
        await db.$executeRawUnsafe(
          `UPDATE "MovilProfile" SET "userId" = $1 WHERE id = $2 AND "userId" IS NULL`,
          userId, perfil.id
        )
        linked++
      }
    }

    // 5. Intentar vincular los restantes por nombre (primera parte del nombre personal → nombre user)
    const remaining = await db.$queryRawUnsafe(`
      SELECT mp.id, mp.name, mp."personalId",
             p.nombre as "personalNombre", p.email as "personalEmail"
      FROM "MovilProfile" mp
      JOIN "Personal" p ON mp."personalId" = p.id
      WHERE mp."userId" IS NULL AND mp."personalId" IS NOT NULL
    `) as any[]

    for (const perfil of remaining) {
      const personalName = (perfil.personalNombre || '').trim().toLowerCase()
      if (!personalName) continue

      // Tomar primera palabra del nombre del personal
      const firstName = personalName.split(' ')[0]
      const personalEmail = (perfil.personalEmail || '').toLowerCase().trim()

      // Buscar usuario cuyo nombre empiece igual Y que no tenga email conflictivo
      const match = users.find(u => {
        const uName = (u.nombre || '').toLowerCase().trim()
        const uEmail = (u.email || '').toLowerCase().trim()
        return (
          uName.startsWith(firstName) &&
          uEmail !== personalEmail // evitar coincidencia falsa si es el mismo email
        )
      })

      if (match) {
        await db.$executeRawUnsafe(
          `UPDATE "MovilProfile" SET "userId" = $1 WHERE id = $2 AND "userId" IS NULL`,
          match.id, perfil.id
        )
        linked++
      }
    }

    return NextResponse.json({
      success: true,
      linked,
      total: perfiles.length,
      message: `Se vincularon ${linked} de ${perfiles.length} perfiles con usuarios de escritorio`,
    })
  } catch (error: any) {
    console.error('Error auto-sincronizando perfiles:', error)
    return NextResponse.json({ error: error.message || 'Error al sincronizar' }, { status: 500 })
  }
}
