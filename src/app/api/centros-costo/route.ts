import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// GET - List all centros de costo
export async function GET(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'centros-costo.ver')) {
    return apiError('Sin permisos', 403)
  }
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 200)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0)

    const [centros, total] = await Promise.all([
      withRetry(() => db.centroCostoMaster.findMany({
        take: limit,
        skip: offset,
        orderBy: { codigo: 'asc' }
      })),
      db.centroCostoMaster.count(),
    ])
    
    return NextResponse.json({ items: centros, total })
  } catch (error) {
    console.error('Error fetching centros:', error)
    return NextResponse.json({ error: 'Error fetching centros' }, { status: 500 })
  }
}

// POST - Create new centro de costo
export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'centros-costo.crear')) {
    return apiError('Sin permisos', 403)
  }
  try {
    const data = await request.json()
    
    const centro = await db.centroCostoMaster.create({
      data: {
        codigo: data.codigo,
        nombre: data.nombre,
        descripcion: data.descripcion || '',
        responsable: data.responsable || null,
        tipoGasto: data.tipoGasto || 'Variable',
        presupuestoMens: parseFloat(data.presupuestoMens) || 0,
        presupuestoAnual: parseFloat(data.presupuestoAnual) || 0,
        estado: data.estado || 'Activo',
      }
    })
    
    return NextResponse.json(centro)
  } catch (error) {
    console.error('Error creating centro:', error)
    return NextResponse.json({ error: 'Error creating centro' }, { status: 500 })
  }
}
