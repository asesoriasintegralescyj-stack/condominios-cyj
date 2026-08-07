import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// GET - Obtener una LV por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  try {
    const { id } = await params
    const lv = await db.listaVerificacion.findUnique({
      where: { id },
      include: {
        registros: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!lv) return apiError('LV no encontrada', 404)

    return NextResponse.json({
      ...lv,
      items: lv.items ? JSON.parse(lv.items) : [],
      registros: lv.registros.map(r => ({
        ...r,
        itemsCompletados: r.itemsCompletados ? JSON.parse(r.itemsCompletados) : [],
      })),
    })
  } catch (error) {
    console.error('Error fetching LV:', error)
    return NextResponse.json({ error: 'Error fetching LV' }, { status: 500 })
  }
}

// PUT - Actualizar una LV
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'configuracion.editar')) {
    return apiError('Sin permisos', 403)
  }
  try {
    const { id } = await params
    const data = await request.json()

    const items = typeof data.items === 'string' ? data.items : JSON.stringify(data.items || [])

    const lv = await db.listaVerificacion.update({
      where: { id },
      data: {
        codigo: data.codigo,
        nombre: data.nombre,
        sector: data.sector,
        frecuencia: data.frecuencia,
        responsable: data.responsable,
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
    console.error('Error updating LV:', error)
    return NextResponse.json({ error: 'Error updating LV' }, { status: 500 })
  }
}

// DELETE - Eliminar una LV
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'configuracion.editar')) {
    return apiError('Sin permisos', 403)
  }
  try {
    const { id } = await params
    await db.listaVerificacion.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting LV:', error)
    return NextResponse.json({ error: 'Error deleting LV' }, { status: 500 })
  }
}
