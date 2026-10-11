/**
 * API para diagnosticar y reparar permisos del usuario administrador.
 *
 * GET  — Retorna diagnóstico: lista de usuarios admin, su rol, permisos field, y permisos efectivos.
 * POST — Repara: asegura rol='admin' y limpia permisos override (null) para que
 *        el admin obtenga todos los permisos del PERMISOS_POR_ROL.
 *
 * Requiere token secreto MIGRATE_2026_ALFREDO para seguridad.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getPermissions, PERMISOS_POR_ROL } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const REQUIRED_TOKEN = 'MIGRATE_2026_ALFREDO'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (token !== REQUIRED_TOKEN) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  try {
    // Buscar TODOS los usuarios con rol admin (o variaciones)
    const allUsers = await db.$queryRawUnsafe(`
      SELECT id, email, nombre, apellido, rol, permisos, activo
      FROM "User"
      ORDER BY "createdAt" ASC
    `) as any[]

    const admins = allUsers.filter((u: any) =>
      u.rol === 'admin' || u.rol === 'Admin' || u.rol === 'ADMIN' || u.rol === 'Administrador' || u.rol === 'ADMINISTRADOR'
    )

    const diagnostic = admins.map((a: any) => {
      let permisosEfectivos: string[] = []
      let permisosOverrideParsed: any = null
      let overrideFormat = 'null'

      if (a.permisos) {
        try {
          permisosOverrideParsed = JSON.parse(a.permisos)
          if (Array.isArray(permisosOverrideParsed)) {
            overrideFormat = 'array'
          } else if (permisosOverrideParsed.agregar || permisosOverrideParsed.quitar) {
            overrideFormat = 'agregar/quitar'
          } else {
            overrideFormat = 'boolean-object'
          }
        } catch {
          overrideFormat = 'invalid-json'
        }
      }

      // Calcular permisos efectivos usando el sistema actual
      try {
        permisosEfectivos = getPermissions(a.rol, a.permisos)
      } catch {
        permisosEfectivos = []
      }

      const scPerms = permisosEfectivos.filter((p: string) => p.startsWith('solicitudescompra.'))
      const hasAllScPermisis = PERMISOS_POR_ROL.admin
        .filter(p => p.startsWith('solicitudescompra.'))
        .every(p => permisosEfectivos.includes(p))

      return {
        id: a.id,
        email: a.email,
        nombre: `${a.nombre} ${a.apellido || ''}`.trim(),
        rol: a.rol,
        activo: a.activo,
        overrideFormat,
        permisosOverridePreview: a.permisos ? (a.permisos.length > 200 ? a.permisos.substring(0, 200) + '...' : a.permisos) : null,
        solicitudescompraPerms: scPerms,
        hasAllScPermissions: hasAllScPermisis,
        totalEffectivePerms: permisosEfectivos.length,
        needsFix: a.rol !== 'admin' || a.permisos !== null || !hasAllScPermisis,
      }
    })

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      totalUsers: allUsers.length,
      adminUsers: diagnostic,
      expectedAdminPerms: {
        solicitudescompra: PERMISOS_POR_ROL.admin.filter(p => p.startsWith('solicitudescompra.')),
      },
      summary: {
        needsFix: diagnostic.filter((d: any) => d.needsFix).length,
        allOk: diagnostic.every((d: any) => !d.needsFix),
      },
    })
  } catch (error) {
    console.error('Error en fix-permissions GET:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (token !== REQUIRED_TOKEN) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const targetEmail = body.email // optional: specific admin email to fix

    // Find admin users to fix
    const admins = await db.$queryRawUnsafe(`
      SELECT id, email, nombre, apellido, rol, permisos
      FROM "User"
      WHERE rol ILIKE 'admin%' OR rol ILIKE 'administrador%'
    `) as any[]

    if (admins.length === 0) {
      return NextResponse.json({ error: 'No se encontraron usuarios administrador' }, { status: 404 })
    }

    const fixes: any[] = []

    for (const admin of admins) {
      // If specific email was provided, only fix that one
      if (targetEmail && admin.email !== targetEmail) continue

      const changes: string[] = []

      // Fix 1: Ensure rol is exactly 'admin' (lowercase)
      if (admin.rol !== 'admin') {
        await db.$executeRawUnsafe(`
          UPDATE "User" SET rol = 'admin', "updatedAt" = NOW() WHERE id = $1
        `, admin.id)
        changes.push(`rol: '${admin.rol}' → 'admin'`)
      }

      // Fix 2: Clear permisos override (set to null) so admin gets full PERMISOS_POR_ROL
      if (admin.permisos !== null) {
        await db.$executeRawUnsafe(`
          UPDATE "User" SET permisos = NULL, "updatedAt" = NOW() WHERE id = $1
        `, admin.id)
        changes.push(`permisos: override cleared (was ${admin.permisos ? admin.permisos.length + ' chars' : 'null'})`)
      }

      // Verify fix
      const fixedUser = await db.$queryRawUnsafe(`
        SELECT rol, permisos FROM "User" WHERE id = $1
      `, admin.id) as any[]

      const effectivePerms = getPermissions(fixedUser[0].rol, fixedUser[0].permisos)
      const scPerms = effectivePerms.filter((p: string) => p.startsWith('solicitudescompra.'))

      fixes.push({
        email: admin.email,
        nombre: `${admin.nombre} ${admin.apellido || ''}`.trim(),
        changes,
        fixedRol: fixedUser[0].rol,
        fixedPermisosOverride: fixedUser[0].permisos,
        effectiveSolicitudescompraPerms: scPerms,
        totalEffectivePerms: effectivePerms.length,
      })
    }

    // Also invalidate all sessions for fixed admin users so they get fresh permissions on next login
    for (const fix of fixes) {
      if (fix.changes.length > 0) {
        try {
          const adminUser = admins.find((a: any) => a.email === fix.email)
          if (adminUser) {
            await db.$executeRawUnsafe(`
              DELETE FROM "Session" WHERE "userId" = $1
            `, adminUser.id)
            fix.sessionsCleared = true
          }
        } catch (e) {
          fix.sessionsCleared = false
          fix.sessionsError = String(e)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Se repararon ${fixes.length} usuario(s) administrador`,
      fixes,
    })
  } catch (error) {
    console.error('Error en fix-permissions POST:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
