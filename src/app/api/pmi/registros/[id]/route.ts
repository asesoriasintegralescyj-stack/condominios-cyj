import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

// PUT - Actualizar un registro de LV (cambiar estado, observaciones, items)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  try {
    const { id } = await params
    const data = await request.json()

    const itemsCompletados = typeof data.itemsCompletados === 'string'
      ? data.itemsCompletados
      : JSON.stringify(data.itemsCompletados || [])

    const registro = await db.registroLV.update({
      where: { id },
      data: {
        estado: data.estado || undefined,
        observaciones: data.observaciones !== undefined ? data.observaciones : undefined,
        itemsCompletados,
        responsableEjecucion: data.responsableEjecucion || undefined,
        hora: data.hora || undefined,
        firmaUrl: data.firmaUrl || undefined,
        fotoUrl: data.fotoUrl || undefined,
      },
      include: { lv: true },
    })

    return NextResponse.json({
      ...registro,
      itemsCompletados: registro.itemsCompletados ? JSON.parse(registro.itemsCompletados) : [],
    })
  } catch (error) {
    console.error('Error updating registro LV:', error)
    return NextResponse.json({ error: 'Error updating registro' }, { status: 500 })
  }
}

// DELETE - Eliminar un registro de LV
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  try {
    const { id } = await params
    await db.registroLV.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting registro LV:', error)
    return NextResponse.json({ error: 'Error deleting registro' }, { status: 500 })
  }
}
