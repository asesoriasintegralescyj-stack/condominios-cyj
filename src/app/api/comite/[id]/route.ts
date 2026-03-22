import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Get single comite member
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const comite = await db.comite.findUnique({
      where: { id }
    })
    
    if (!comite) {
      return NextResponse.json({ error: 'Miembro no encontrado' }, { status: 404 })
    }
    
    return NextResponse.json(comite)
  } catch (error) {
    console.error('Error fetching comite member:', error)
    return NextResponse.json({ error: 'Error fetching comite member' }, { status: 500 })
  }
}

// PUT - Update comite member
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()
    
    const comite = await db.comite.update({
      where: { id },
      data: {
        nombre: data.nombre,
        cargo: data.cargo,
        unidad: data.unidad || null,
        rut: data.rut || null,
        telefono: data.telefono || null,
        email: data.email || null,
        foto: data.foto,
        fechaInicio: data.fechaInicio || null,
        fechaFin: data.fechaFin || null,
        estado: data.estado,
        notas: data.notas || null,
        condominioId: data.condominioId || null,
      }
    })
    
    return NextResponse.json(comite)
  } catch (error) {
    console.error('Error updating comite member:', error)
    return NextResponse.json({ error: 'Error updating comite member' }, { status: 500 })
  }
}

// DELETE - Delete comite member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    await db.comite.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting comite member:', error)
    return NextResponse.json({ error: 'Error deleting comite member' }, { status: 500 })
  }
}
