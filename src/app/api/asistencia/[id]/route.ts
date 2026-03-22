import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Get single asistencia
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const asistencia = await db.asistencia.findUnique({
      where: { id },
      include: {
        personal: true
      }
    })
    
    if (!asistencia) {
      return NextResponse.json({ error: 'Asistencia no encontrada' }, { status: 404 })
    }
    
    return NextResponse.json(asistencia)
  } catch (error) {
    console.error('Error fetching asistencia:', error)
    return NextResponse.json({ error: 'Error al obtener asistencia' }, { status: 500 })
  }
}

// PUT - Update asistencia
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()
    
    const asistencia = await db.asistencia.update({
      where: { id },
      data: {
        fecha: data.fecha,
        horaEntrada: data.horaEntrada || null,
        horaSalida: data.horaSalida || null,
        estado: data.estado,
        observaciones: data.observaciones || null,
      },
      include: {
        personal: true
      }
    })
    
    return NextResponse.json(asistencia)
  } catch (error) {
    console.error('Error updating asistencia:', error)
    return NextResponse.json({ error: 'Error al actualizar asistencia' }, { status: 500 })
  }
}

// DELETE - Delete asistencia
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    await db.asistencia.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting asistencia:', error)
    return NextResponse.json({ error: 'Error al eliminar asistencia' }, { status: 500 })
  }
}
