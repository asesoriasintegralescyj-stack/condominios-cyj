import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Get inspeccion by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const inspeccion = await db.inspeccion.findUnique({
      where: { id }
    })
    
    if (!inspeccion) {
      return NextResponse.json({ error: 'Inspeccion not found' }, { status: 404 })
    }
    
    return NextResponse.json(inspeccion)
  } catch (error) {
    console.error('Error fetching inspeccion:', error)
    return NextResponse.json({ error: 'Error fetching inspeccion' }, { status: 500 })
  }
}

// PUT - Update inspeccion
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()
    
    const inspeccion = await db.inspeccion.update({
      where: { id },
      data: {
        titulo: data.titulo,
        tipo: data.tipo,
        estado: data.estado,
        fecha: data.fecha,
        hora: data.hora,
        ubicacion: data.ubicacion,
        asignado: data.asignado,
        descripcion: data.descripcion,
        recurrente: data.recurrente,
        notas: data.notas,
        fotosAntes: data.fotosAntes ? JSON.stringify(data.fotosAntes) : null,
        fotosDurante: data.fotosDurante ? JSON.stringify(data.fotosDurante) : null,
        fotosDespues: data.fotosDespues ? JSON.stringify(data.fotosDespues) : null,
      }
    })
    
    return NextResponse.json(inspeccion)
  } catch (error) {
    console.error('Error updating inspeccion:', error)
    return NextResponse.json({ error: 'Error updating inspeccion' }, { status: 500 })
  }
}

// DELETE - Delete inspeccion
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.inspeccion.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting inspeccion:', error)
    return NextResponse.json({ error: 'Error deleting inspeccion' }, { status: 500 })
  }
}
