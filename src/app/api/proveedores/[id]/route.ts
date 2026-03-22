import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Get proveedor by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const proveedor = await db.proveedor.findUnique({
      where: { id }
    })
    
    if (!proveedor) {
      return NextResponse.json({ error: 'Proveedor not found' }, { status: 404 })
    }
    
    return NextResponse.json(proveedor)
  } catch (error) {
    console.error('Error fetching proveedor:', error)
    return NextResponse.json({ error: 'Error fetching proveedor' }, { status: 500 })
  }
}

// PUT - Update proveedor
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()
    
    const proveedor = await db.proveedor.update({
      where: { id },
      data: {
        razonSocial: data.razonSocial,
        rut: data.rut,
        giro: data.giro,
        direccion: data.direccion,
        comuna: data.comuna,
        telCorp: data.telCorp,
        emailCorp: data.emailCorp,
        web: data.web,
        contacto: data.contacto,
        cargo: data.cargo,
        telDirecto: data.telDirecto,
        emailContacto: data.emailContacto,
        celular: data.celular,
        estado: data.estado,
        notas: data.notas,
      }
    })
    
    return NextResponse.json(proveedor)
  } catch (error) {
    console.error('Error updating proveedor:', error)
    return NextResponse.json({ error: 'Error updating proveedor' }, { status: 500 })
  }
}

// DELETE - Delete proveedor
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.proveedor.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting proveedor:', error)
    return NextResponse.json({ error: 'Error deleting proveedor' }, { status: 500 })
  }
}
