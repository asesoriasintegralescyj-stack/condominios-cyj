import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Get propiedad by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const propiedad = await db.propiedad.findUnique({
      where: { id }
    })
    
    if (!propiedad) {
      return NextResponse.json({ error: 'Propiedad not found' }, { status: 404 })
    }
    
    return NextResponse.json(propiedad)
  } catch (error) {
    console.error('Error fetching propiedad:', error)
    return NextResponse.json({ error: 'Error fetching propiedad' }, { status: 500 })
  }
}

// PUT - Update propiedad
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()
    
    const propiedad = await db.propiedad.update({
      where: { id },
      data: {
        nombre: data.nombre,
        tipo: data.tipo,
        estado: data.estado,
        direccion: data.direccion,
        habitaciones: parseInt(data.habitaciones) || 0,
        banos: parseInt(data.banos) || 0,
        mts2: parseFloat(data.mts2) || 0,
        precio: parseFloat(data.precio) || 0,
        contacto: data.contacto,
        telefono: data.telefono,
        email: data.email,
        fotos: data.fotos ? JSON.stringify(data.fotos) : null,
        notas: data.notas,
      }
    })
    
    return NextResponse.json(propiedad)
  } catch (error) {
    console.error('Error updating propiedad:', error)
    return NextResponse.json({ error: 'Error updating propiedad' }, { status: 500 })
  }
}

// DELETE - Delete propiedad
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.propiedad.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting propiedad:', error)
    return NextResponse.json({ error: 'Error deleting propiedad' }, { status: 500 })
  }
}
