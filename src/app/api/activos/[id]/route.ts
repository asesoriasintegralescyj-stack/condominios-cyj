import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Get activo by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const activo = await db.activo.findUnique({
      where: { id },
      include: { asignado: true }
    })
    
    if (!activo) {
      return NextResponse.json({ error: 'Activo not found' }, { status: 404 })
    }
    
    return NextResponse.json(activo)
  } catch (error) {
    console.error('Error fetching activo:', error)
    return NextResponse.json({ error: 'Error fetching activo' }, { status: 500 })
  }
}

// PUT - Update activo
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()
    
    const activo = await db.activo.update({
      where: { id },
      data: {
        nombre: data.nombre,
        categoria: data.categoria,
        estado: data.estado,
        ubicacion: data.ubicacion,
        serie: data.serie,
        fechaCompra: data.fechaCompra,
        costoCompra: parseFloat(data.costoCompra) || 0,
        valorActual: parseFloat(data.valorActual) || 0,
        descripcion: data.descripcion,
        asignadoId: data.asignadoId || null,
      }
    })
    
    return NextResponse.json(activo)
  } catch (error) {
    console.error('Error updating activo:', error)
    return NextResponse.json({ error: 'Error updating activo' }, { status: 500 })
  }
}

// DELETE - Delete activo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.activo.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting activo:', error)
    return NextResponse.json({ error: 'Error deleting activo' }, { status: 500 })
  }
}
