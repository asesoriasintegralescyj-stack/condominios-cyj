import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

// GET - Registros por fecha (y opcionalmente por lvId)
// ?fecha=YYYY-MM-DD → devuelve registros de ese día
// ?lvId=xxx&fecha=YYYY-MM-DD → registros de esa LV en esa fecha
export async function GET(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  try {
    const searchParams = request.nextUrl.searchParams
    const fecha = searchParams.get('fecha') || ''
    const lvId = searchParams.get('lvId') || ''
    const estado = searchParams.get('estado') || ''

    const where: any = {}
    if (fecha) where.fecha = fecha
    if (lvId) where.lvId = lvId
    if (estado) where.estado = estado

    const registros = await db.registroLV.findMany({
      where,
      include: { lv: true },
      orderBy: { createdAt: 'desc' },
    })

    const parsed = registros.map(r => ({
      ...r,
      itemsCompletados: r.itemsCompletados ? JSON.parse(r.itemsCompletados) : [],
    }))

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Error fetching registros LV:', error)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

// POST - Crear un registro de ejecución de LV
export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  try {
    const data = await request.json()

    if (!data.lvId || !data.fecha) {
      return apiError('lvId y fecha son requeridos', 400)
    }

    const itemsCompletados = typeof data.itemsCompletados === 'string'
      ? data.itemsCompletados
      : JSON.stringify(data.itemsCompletados || [])

    const registro = await db.registroLV.create({
      data: {
        lvId: data.lvId,
        fecha: data.fecha,
        hora: data.hora || null,
        responsableEjecucion: data.responsableEjecucion || session.user.nombre,
        estado: data.estado || 'Completado',
        observaciones: data.observaciones || null,
        itemsCompletados,
        firmaUrl: data.firmaUrl || null,
        fotoUrl: data.fotoUrl || null,
      },
      include: { lv: true },
    })

    return NextResponse.json({
      ...registro,
      itemsCompletados: registro.itemsCompletados ? JSON.parse(registro.itemsCompletados) : [],
    })
  } catch (error) {
    console.error('Error creating registro LV:', error)
    return NextResponse.json({ error: 'Error creating registro' }, { status: 500 })
  }
}
