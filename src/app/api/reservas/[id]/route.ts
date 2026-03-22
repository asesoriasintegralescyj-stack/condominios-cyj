import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Obtener una reserva por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const reserva = await db.reserva.findUnique({
      where: { id },
      include: {
        residenteRel: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            unidad: true,
            telefono: true,
            email: true,
          }
        }
      }
    })
    
    if (!reserva) {
      return NextResponse.json({ error: 'Reserva no encontrada' }, { status: 404 })
    }
    
    return NextResponse.json(reserva)
  } catch (error) {
    console.error('Error fetching reserva:', error)
    return NextResponse.json({ error: 'Error al obtener reserva' }, { status: 500 })
  }
}

// PUT - Actualizar una reserva
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()
    
    const reserva = await db.reserva.update({
      where: { id },
      data: {
        titulo: data.titulo,
        espacio: data.espacio,
        fecha: data.fecha,
        horaInicio: data.horaInicio,
        horaFin: data.horaFin,
        residente: data.residente,
        unidad: data.unidad || null,
        telefono: data.telefono || null,
        email: data.email || null,
        numPersonas: parseInt(data.numPersonas) || 1,
        estado: data.estado,
        monto: parseFloat(data.monto) || 0,
        pagado: data.pagado || false,
        comprobante: data.comprobante,
        notas: data.notas || null,
        residenteId: data.residenteId || null,
      }
    })
    
    return NextResponse.json(reserva)
  } catch (error) {
    console.error('Error updating reserva:', error)
    return NextResponse.json({ error: 'Error al actualizar reserva' }, { status: 500 })
  }
}

// DELETE - Eliminar una reserva
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.reserva.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting reserva:', error)
    return NextResponse.json({ error: 'Error al eliminar reserva' }, { status: 500 })
  }
}
