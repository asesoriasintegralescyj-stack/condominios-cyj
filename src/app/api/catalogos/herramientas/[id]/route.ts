import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Get herramienta by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const herramienta = await db.catHerramienta.findUnique({
      where: { id }
    })
    
    if (!herramienta) {
      return NextResponse.json({ error: 'Herramienta not found' }, { status: 404 })
    }
    
    return NextResponse.json(herramienta)
  } catch (error) {
    console.error('Error fetching herramienta:', error)
    return NextResponse.json({ error: 'Error fetching herramienta' }, { status: 500 })
  }
}

// PUT - Update herramienta
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()
    
    const herramienta = await db.catHerramienta.update({
      where: { id },
      data: {
        codigo: data.codigo || null,
        nombre: data.nombre,
        marca: data.marca || null,
        modelo: data.modelo || null,
        cantidad: parseInt(data.cantidad) || 1,
        ubicacion: data.ubicacion || null,
        estado: data.estado || 'Bueno',
        valorReposicion: parseFloat(data.valorReposicion) || 0,
        fechaAdquisicion: data.fechaAdquisicion || null,
        descripcion: data.descripcion || null,
      }
    })
    
    return NextResponse.json(herramienta)
  } catch (error) {
    console.error('Error updating herramienta:', error)
    return NextResponse.json({ error: 'Error updating herramienta' }, { status: 500 })
  }
}

// DELETE - Delete herramienta
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.catHerramienta.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting herramienta:', error)
    return NextResponse.json({ error: 'Error deleting herramienta' }, { status: 500 })
  }
}
