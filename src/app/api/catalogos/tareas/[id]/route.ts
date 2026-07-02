import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Get tarea by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tarea = await db.catTarea.findUnique({
      where: { id }
    })
    
    if (!tarea) {
      return NextResponse.json({ error: 'Tarea not found' }, { status: 404 })
    }
    
    return NextResponse.json(tarea)
  } catch (error) {
    console.error('Error fetching tarea:', error)
    return NextResponse.json({ error: 'Error fetching tarea' }, { status: 500 })
  }
}

// PUT - Update tarea
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()
    
    const tarea = await db.catTarea.update({
      where: { id },
      data: {
        nombre: data.nombre,
        categoria: data.categoria,
      }
    })
    
    return NextResponse.json(tarea)
  } catch (error) {
    console.error('Error updating tarea:', error)
    return NextResponse.json({ error: 'Error updating tarea' }, { status: 500 })
  }
}

// DELETE - Delete tarea
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.catTarea.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting tarea:', error)
    return NextResponse.json({ error: 'Error deleting tarea' }, { status: 500 })
  }
}
