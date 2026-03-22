import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Get personal by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const personal = await db.personal.findUnique({
      where: { id }
    })
    
    if (!personal) {
      return NextResponse.json({ error: 'Personal not found' }, { status: 404 })
    }
    
    return NextResponse.json(personal)
  } catch (error) {
    console.error('Error fetching personal:', error)
    return NextResponse.json({ error: 'Error fetching personal' }, { status: 500 })
  }
}

// PUT - Update personal
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()
    
    const personal = await db.personal.update({
      where: { id },
      data: {
        nombre: data.nombre,
        rut: data.rut,
        cargo: data.cargo,
        contrato: data.contrato,
        afp: data.afp,
        salud: data.salud,
        mutual: data.mutual,
        ccaf: data.ccaf,
        fechaIngreso: data.fechaIngreso,
        sueldoBase: parseFloat(data.sueldoBase) || 0,
        movilizacion: parseFloat(data.movilizacion) || 0,
        colacion: parseFloat(data.colacion) || 0,
        viatico: parseFloat(data.viatico) || 0,
        asigFamiliar: parseFloat(data.asigFamiliar) || 0,
        estado: data.estado,
        email: data.email,
        telefono: data.telefono,
        foto: data.foto,
        notas: data.notas,
      }
    })
    
    return NextResponse.json(personal)
  } catch (error) {
    console.error('Error updating personal:', error)
    return NextResponse.json({ error: 'Error updating personal' }, { status: 500 })
  }
}

// DELETE - Delete personal
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.personal.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting personal:', error)
    return NextResponse.json({ error: 'Error deleting personal' }, { status: 500 })
  }
}
