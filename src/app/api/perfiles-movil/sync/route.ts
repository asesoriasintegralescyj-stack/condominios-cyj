/**
 * Auto-Sincronizar: vincula perfiles móviles con usuarios de escritorio
 * 
 * REGLAS ESTRICTAS (v2):
 * 1. Solo vincula por email EXACTO: Personal.email = User.email
 * 2. Un User solo puede estar vinculado a UN MovilProfile (relación 1:1)
 * 3. Ya NO se vincula por nombre (era demasiado permisivo y causaba enlaces incorrectos)
 * 4. Perfiles sin User correspondiente quedan con userId = NULL (correcto para guardias solo-móvil)
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
      WHERE mp."personalId" IS NOT NULL
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

    // 4. Conjunto de userIds ya vinculados (para garantizar 1:1)
    const alreadyLinked = new Set<string>()
    const existingLinks = await db.$queryRawUnsafe(`
      SELECT "userId" FROM "MovilProfile" WHERE "userId" IS NOT NULL
    `) as any[]
    for (const link of existingLinks) {
      alreadyLinked.add(link.userId)
    }

    // 5. Vincular SOLO por email EXACTO del Personal → User
    let linked = 0
    let skippedAlreadyLinked = 0
    let skippedNoEmail = 0
    let skippedNoMatch = 0

    for (const perfil of perfiles) {
      // Si ya tiene userId asignado, verificar que sea 1:1
      if (perfil.userId) {
        // Este perfil ya está vinculado, lo contamos pero no tocamos
        continue
      }

      const personalEmail = (perfil.personalEmail || '').toLowerCase().trim()
      if (!personalEmail) {
        skippedNoEmail++
        continue
      }

      const userId = emailMap.get(personalEmail)
      if (!userId) {
        skippedNoMatch++
        continue
      }

      // Verificar que este userId no esté ya vinculado a OTRO perfil (1:1)
      if (alreadyLinked.has(userId)) {
        skippedAlreadyLinked++
        continue
      }

      await db.$executeRawUnsafe(
        `UPDATE "MovilProfile" SET "userId" = $1 WHERE id = $2 AND "userId" IS NULL`,
        userId, perfil.id
      )
      alreadyLinked.add(userId)
      linked++
    }

    // 6. Diagnóstico final
    const diag = await db.$queryRawUnsafe(`
      SELECT 
        (SELECT COUNT(*) FROM "MovilProfile" WHERE "userId" IS NOT NULL) as vinculados,
        (SELECT COUNT(*) FROM "MovilProfile") as total
    `) as any[]

    return NextResponse.json({
      success: true,
      linked,
      total: perfiles.length,
      vinculados: diag[0]?.vinculados || 0,
      totalPerfiles: diag[0]?.total || 0,
      skipped: {
        noEmail: skippedNoEmail,
        noMatch: skippedNoMatch,
        alreadyLinked: skippedAlreadyLinked,
      },
      message: `Se vincularon ${linked} perfiles por email exacto. ${skippedAlreadyLinked} omitidos (userId ya usado), ${skippedNoEmail} sin email de personal, ${skippedNoMatch} sin coincidencia.`,
    })
  } catch (error: any) {
    console.error('Error auto-sincronizando perfiles:', error)
    return NextResponse.json({ error: error.message || 'Error al sincronizar' }, { status: 500 })
  }
}
