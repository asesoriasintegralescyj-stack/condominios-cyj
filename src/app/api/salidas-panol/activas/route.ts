import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

// GET - Listar salidas activas (pendientes) o todas
export async function GET(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  try {
    const searchParams = request.nextUrl.searchParams
    const soloPendientes = searchParams.get('pendientes') === 'true'
    const limit = parseInt(searchParams.get('limit') || '100')

    const where = soloPendientes ? { estado: 'Pendiente' } : {}
    const salidas = await db.salidaPañol.findMany({
      where,
      include: { herramienta: true },
      orderBy: { fechaSalida: 'desc' },
      take: limit,
    })

    const parsed = salidas.map(s => ({
      ...s,
      lvAntesItems: s.lvAntesItems ? JSON.parse(s.lvAntesItems) : [],
      lvDespuesItems: s.lvDespuesItems ? JSON.parse(s.lvDespuesItems) : [],
    }))

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Error fetching salidas activas:', error)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
