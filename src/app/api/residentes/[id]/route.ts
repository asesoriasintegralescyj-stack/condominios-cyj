import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Get residente by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const residente = await db.residente.findUnique({
      where: { id }
    })
    
    if (!residente) {
      return NextResponse.json({ error: 'Residente not found' }, { status: 404 })
    }
    
    return NextResponse.json(residente)
  } catch (error) {
    console.error('Error fetching residente:', error)
    return NextResponse.json({ error: 'Error fetching residente' }, { status: 500 })
  }
}

// PUT - Update residente
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()
    
    const residente = await db.residente.update({
      where: { id },
      data: {
        nombre: data.nombre,
        apellido: data.apellido || null,
        rut: data.rut || null,
        unidad: data.unidad || null,
        etapa: data.etapa || null,
        tipo: data.tipo,
        telefono: data.telefono || null,
        email: data.email || null,
        fechaIngreso: data.fechaIngreso || null,
        estado: data.estado,
        vehiculos: data.vehiculos || null,
        notas: data.notas || null,
        propiedadId: data.propiedadId || null,
      }
    })
    
    return NextResponse.json(residente)
  } catch (error) {
    console.error('Error updating residente:', error)
    return NextResponse.json({ error: 'Error updating residente' }, { status: 500 })
  }
}

// DELETE - Delete residente
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.residente.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting residente:', error)
    return NextResponse.json({ error: 'Error deleting residente' }, { status: 500 })
  }
}
