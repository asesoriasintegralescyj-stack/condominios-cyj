import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// GET - Listar todas las LVs (con items parseados)
export async function GET(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  try {
    const searchParams = request.nextUrl.searchParams
    const frecuencia = searchParams.get('frecuencia') || ''
    const soloActivas = searchParams.get('activas') !== 'false'

    const where: any = {}
    if (frecuencia) where.frecuencia = frecuencia
    if (soloActivas) where.activa = true

    const lvs = await withRetry(() => db.listaVerificacion.findMany({
      where,
      orderBy: [{ codigo: 'asc' }],
      include: {
        registros: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    }))

    const parsed = lvs.map(lv => ({
      ...lv,
      items: lv.items ? JSON.parse(lv.items) : [],
      registros: lv.registros.map(r => ({
        ...r,
        itemsCompletados: r.itemsCompletados ? JSON.parse(r.itemsCompletados) : [],
      })),
    }))

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Error fetching LVs:', error)
    return NextResponse.json({ error: 'Error fetching LVs' }, { status: 500 })
  }
}

// POST - Crear una nueva LV
export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'configuracion.editar', session.userPermisos)) {
    return apiError('Sin permisos', 403)
  }
  try {
    const data = await request.json()

    const items = typeof data.items === 'string' ? data.items : JSON.stringify(data.items || [])

    const lv = await db.listaVerificacion.create({
      data: {
        codigo: data.codigo,
        nombre: data.nombre,
        sector: data.sector || '',
        frecuencia: data.frecuencia || 'Diaria',
        responsable: data.responsable || '',
        personalRequerido: data.personalRequerido || null,
        descripcion: data.descripcion || null,
        items,
        activa: data.activa !== false,
      },
    })

    return NextResponse.json({
      ...lv,
      items: JSON.parse(lv.items),
    })
  } catch (error) {
    console.error('Error creating LV:', error)
    return NextResponse.json({ error: 'Error creating LV' }, { status: 500 })
  }
}
