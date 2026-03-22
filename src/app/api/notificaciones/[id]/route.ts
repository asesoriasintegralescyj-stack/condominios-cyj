import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Obtener notificación por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const notificacion = await db.notificacion.findUnique({
      where: { id }
    })

    if (!notificacion) {
      return NextResponse.json({ error: 'Notificación no encontrada' }, { status: 404 })
    }

    return NextResponse.json(notificacion)
  } catch (error) {
    console.error('Error fetching notificación:', error)
    return NextResponse.json({ error: 'Error al obtener notificación' }, { status: 500 })
  }
}

// PUT - Actualizar notificación
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()

    const updateData: {
      leido?: boolean
      fechaLeido?: string
    } = {}

    if (data.leido !== undefined) {
      updateData.leido = data.leido
      updateData.fechaLeido = data.leido ? new Date().toISOString() : undefined
    }

    const notificacion = await db.notificacion.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(notificacion)
  } catch (error) {
    console.error('Error updating notificación:', error)
    return NextResponse.json({ error: 'Error al actualizar notificación' }, { status: 500 })
  }
}

// DELETE - Eliminar notificación
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.notificacion.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting notificación:', error)
    return NextResponse.json({ error: 'Error al eliminar notificación' }, { status: 500 })
  }
}
