import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// GET - Listar todos los perfiles móviles
export async function GET() {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'usuarios.ver', session.userPermisos)) {
    return apiError('Sin permisos', 403)
  }
  try {
    const perfiles = await db.movilProfile.findMany({
      orderBy: { name: 'asc' },
    })

    // Lookup personal vinculado manualmente (sin @relation en schema)
    const personalIds = perfiles
      .map(p => p.personalId)
      .filter((id): id is string => !!id)

    let personalMap: Record<string, { id: string; nombre: string; cargo: string; estado: string }> = {}
    if (personalIds.length > 0) {
      const personalRecords = await db.personal.findMany({
        where: { id: { in: personalIds } },
        select: { id: true, nombre: true, cargo: true, estado: true },
      })
      for (const p of personalRecords) {
        personalMap[p.id] = p
      }
    }

    const result = perfiles.map(p => ({
      ...p,
      password: undefined,
      personal: p.personalId ? (personalMap[p.personalId] || null) : null,
    }))

    // Lookup usuarios vinculados
    const userIds = perfiles.map(p => p.userId).filter((id): id is string => !!id)
    if (userIds.length > 0) {
      const users = await db.$queryRawUnsafe(
        `SELECT id, email, nombre, apellido FROM "User" WHERE id = ANY($1)`,
        userIds
      ) as any[]
      const userMap: Record<string, any> = {}
      for (const u of users) { userMap[u.id] = u }
      for (const r of result) {
        if (r.userId) (r as any).user = userMap[r.userId] || null
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching perfiles móviles:', error)
    return NextResponse.json({ error: 'Error al obtener perfiles' }, { status: 500 })
  }
}

// POST - Crear perfil móvil
export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'usuarios.crear', session.userPermisos)) {
    return apiError('Sin permisos', 403)
  }
  try {
    const data = await request.json()
    const perfil = await db.movilProfile.create({
      data: {
        name: data.name,
        password: data.password || '',
        accessCode: data.accessCode || String(Math.floor(1000 + Math.random() * 9000)),
        color: data.color || 'bg-blue-600',
        icon: data.icon || 'User',
        workAreaIds: data.workAreaIds || [],
        permissions: data.permissions || ['view'],
        personalId: data.personalId || null,
        userId: data.userId || null,
      },
    })

    // Lookup personal vinculado
    let personal = null
    if (perfil.personalId) {
      personal = await db.personal.findUnique({
        where: { id: perfil.personalId },
        select: { id: true, nombre: true, cargo: true, estado: true },
      })
    }

    // Lookup usuario vinculado
    let user = null
    if (perfil.userId) {
      const users = await db.$queryRawUnsafe(
        `SELECT id, nombre, apellido, email, rol, activo FROM "User" WHERE id = $1`,
        perfil.userId
      ) as any[]
      user = users[0] || null
    }

    return NextResponse.json({ ...perfil, password: undefined, personal, user }, { status: 201 })
  } catch (error) {
    console.error('Error creating perfil móvil:', error)
    return NextResponse.json({ error: 'Error al crear perfil' }, { status: 500 })
  }
}
