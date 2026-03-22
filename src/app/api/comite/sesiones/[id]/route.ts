import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Get single sesion
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const sesion = await db.sesionComite.findUnique({
      where: { id }
    })
    
    if (!sesion) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
    }
    
    return NextResponse.json(sesion)
  } catch (error) {
    console.error('Error fetching sesion:', error)
    return NextResponse.json({ error: 'Error fetching sesion' }, { status: 500 })
  }
}

// PUT - Update sesion
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()
    
    const sesion = await db.sesionComite.update({
      where: { id },
      data: {
        titulo: data.titulo,
        tipo: data.tipo,
        fecha: data.fecha,
        hora: data.hora || null,
        lugar: data.lugar || null,
        estado: data.estado,
        ordenDia: data.ordenDia || null,
        acuerdos: data.acuerdos || null,
        asistentes: data.asistentes || null,
        acta: data.acta || null,
        quorum: data.quorum || 0,
        notas: data.notas || null,
        condominioId: data.condominioId || null,
      }
    })
    
    return NextResponse.json(sesion)
  } catch (error) {
    console.error('Error updating sesion:', error)
    return NextResponse.json({ error: 'Error updating sesion' }, { status: 500 })
  }
}

// DELETE - Delete sesion
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    await db.sesionComite.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting sesion:', error)
    return NextResponse.json({ error: 'Error deleting sesion' }, { status: 500 })
  }
}
