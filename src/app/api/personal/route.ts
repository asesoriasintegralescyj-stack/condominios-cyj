import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// GET - List all personal
export async function GET(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'personal.ver')) {
    return apiError('Sin permisos', 403)
  }
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 200)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0)

    const whereClause = search ? {
      OR: [
        { nombre: { contains: search } },
        { rut: { contains: search } },
        { cargo: { contains: search } },
        { estado: { contains: search } },
      ]
    } : undefined

    const [personal, total] = await Promise.all([
      withRetry(() => db.personal.findMany({
        where: whereClause,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' }
      })),
      db.personal.count({ where: whereClause }),
    ])
    
    return NextResponse.json({ items: personal, total })
  } catch (error) {
    console.error('Error fetching personal:', error)
    return NextResponse.json({ error: 'Error fetching personal' }, { status: 500 })
  }
}

// POST - Create new personal
export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'personal.crear')) {
    return apiError('Sin permisos', 403)
  }
  try {
    const data = await request.json()
    
    const personal = await db.personal.create({
      data: {
        nombre: data.nombre,
        rut: data.rut || '',
        cargo: data.cargo || '',
        contrato: data.contrato || 'Indefinido',
        afp: data.afp || 'ProVida',
        salud: data.salud || 'Fonasa',
        mutual: data.mutual || 'IST',
        ccaf: data.ccaf || '',
        fechaIngreso: data.fechaIngreso || new Date().toISOString().split('T')[0],
        sueldoBase: parseFloat(data.sueldoBase) || 0,
        movilizacion: parseFloat(data.movilizacion) || 0,
        colacion: parseFloat(data.colacion) || 0,
        viatico: parseFloat(data.viatico) || 0,
        asigFamiliar: parseFloat(data.asigFamiliar) || 0,
        estado: data.estado || 'Activo',
        email: data.email || '',
        telefono: data.telefono || '',
        foto: data.foto || null,
        notas: data.notas || '',
      }
    })
    
    return NextResponse.json(personal)
  } catch (error) {
    console.error('Error creating personal:', error)
    return NextResponse.json({ error: 'Error creating personal' }, { status: 500 })
  }
}
