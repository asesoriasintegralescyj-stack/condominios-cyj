import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Get centro by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const centro = await db.centroCostoMaster.findUnique({
      where: { id },
      include: {
        tareas: true,
        materiales: true,
        herramientas: true,
      }
    })
    
    if (!centro) {
      return NextResponse.json({ error: 'Centro not found' }, { status: 404 })
    }
    
    return NextResponse.json(centro)
  } catch (error) {
    console.error('Error fetching centro:', error)
    return NextResponse.json({ error: 'Error fetching centro' }, { status: 500 })
  }
}

// PUT - Update centro
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()
    
    const centro = await db.centroCostoMaster.update({
      where: { id },
      data: {
        codigo: data.codigo,
        nombre: data.nombre,
        descripcion: data.descripcion,
        responsable: data.responsable,
        tipoGasto: data.tipoGasto,
        presupuestoMens: parseFloat(data.presupuestoMens) || 0,
        presupuestoAnual: parseFloat(data.presupuestoAnual) || 0,
        estado: data.estado,
      }
    })
    
    return NextResponse.json(centro)
  } catch (error) {
    console.error('Error updating centro:', error)
    return NextResponse.json({ error: 'Error updating centro' }, { status: 500 })
  }
}

// DELETE - Delete centro
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.centroCostoMaster.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting centro:', error)
    return NextResponse.json({ error: 'Error deleting centro' }, { status: 500 })
  }
}
