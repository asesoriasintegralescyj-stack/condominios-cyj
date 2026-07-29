import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, hasPermission, apiError } from '@/lib/auth'

// GET - Listar todos los perfiles móviles
export async function GET() {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'usuarios.ver')) {
    return apiError('Sin permisos', 403)
  }
  try {
    const perfiles = await db.movilProfile.findMany({
      orderBy: { name: 'asc' },
      include: {
        personal: { select: { id: true, nombre: true, cargo: true, estado: true } },
      },
    })
    return NextResponse.json(perfiles)
  } catch (error) {
    console.error('Error fetching perfiles móviles:', error)
    return NextResponse.json({ error: 'Error al obtener perfiles' }, { status: 500 })
  }
}

// POST - Crear perfil móvil
export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'usuarios.crear')) {
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
      },
      include: { personal: { select: { id: true, nombre: true, cargo: true, estado: true } } },
    })
    return NextResponse.json(perfil, { status: 201 })
  } catch (error) {
    console.error('Error creating perfil móvil:', error)
    return NextResponse.json({ error: 'Error al crear perfil' }, { status: 500 })
  }
}
