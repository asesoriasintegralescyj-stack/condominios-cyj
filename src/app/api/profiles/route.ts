import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/profiles
 * Lista perfiles moviles (sin password ni accessCode por seguridad).
 */
export async function GET() {
  try {
    const session = await getCurrentSession()
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const profiles = await withRetry(() =>
      db.movilProfile.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true, name: true, color: true, icon: true,
          workAreaIds: true, permissions: true, personalId: true,
          userId: true, createdAt: true, updatedAt: true,
        },
      }),
    )
    return NextResponse.json(profiles)
  } catch (err) {
    console.error('GET /api/profiles error:', err)
    return NextResponse.json([])
  }
}

/**
 * POST /api/profiles
 * Crea un perfil movil (solo admin/supervisor).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession()
    if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    if (session.user.rol !== 'admin' && session.user.rol !== 'supervisor') {
      return NextResponse.json({ error: 'Solo administradores o supervisores' }, { status: 403 })
    }

    const body = await request.json()
    const name = body.name?.trim()
    if (!name) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

    const profile = await withRetry(() =>
      db.movilProfile.create({
        data: {
          name,
          password: body.password || '',
          accessCode: body.accessCode || String(Math.floor(1000 + Math.random() * 9000)),
          color: body.color || 'bg-blue-600',
          icon: body.icon || 'User',
          workAreaIds: body.workAreaIds || [],
          permissions: body.permissions || ['view'],
          personalId: body.personalId || null,
          userId: body.userId || null,
        },
      }),
    )

    return NextResponse.json(profile, { status: 201 })
  } catch (err) {
    console.error('POST /api/profiles error:', err)
    const msg = err instanceof Error ? err.message : 'Error al crear perfil'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
