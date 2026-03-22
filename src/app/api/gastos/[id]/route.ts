import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Get gasto by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const gasto = await db.gasto.findUnique({
      where: { id },
      include: { proveedor: true }
    })
    
    if (!gasto) {
      return NextResponse.json({ error: 'Gasto not found' }, { status: 404 })
    }
    
    return NextResponse.json(gasto)
  } catch (error) {
    console.error('Error fetching gasto:', error)
    return NextResponse.json({ error: 'Error fetching gasto' }, { status: 500 })
  }
}

// PUT - Update gasto
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()
    
    // Get old gasto to compare estado
    const oldGasto = await db.gasto.findUnique({ where: { id } })
    
    const gasto = await db.gasto.update({
      where: { id },
      data: {
        descripcion: data.descripcion,
        categoria: data.categoria,
        estado: data.estado,
        monto: parseFloat(data.monto) || 0,
        fecha: data.fecha,
        propiedad: data.propiedad,
        proveedorId: data.proveedorId || null,
        nDoc: data.nDoc,
        centroCosto: data.centroCosto,
        notas: data.notas,
        comprobante: data.comprobante,
      }
    })
    
    // Update caja chica if estado changed to Pagado
    if (oldGasto && oldGasto.estado !== 'Pagado' && data.estado === 'Pagado') {
      const caja = await db.cajaChica.findFirst()
      if (caja) {
        await db.cajaChica.update({
          where: { id: caja.id },
          data: { saldo: caja.saldo - (parseFloat(data.monto) || 0) }
        })
      }
    }
    
    return NextResponse.json(gasto)
  } catch (error) {
    console.error('Error updating gasto:', error)
    return NextResponse.json({ error: 'Error updating gasto' }, { status: 500 })
  }
}

// DELETE - Delete gasto
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Get gasto to check if we need to restore caja chica
    const gasto = await db.gasto.findUnique({ where: { id } })
    
    if (gasto && gasto.estado === 'Pagado') {
      const caja = await db.cajaChica.findFirst()
      if (caja) {
        await db.cajaChica.update({
          where: { id: caja.id },
          data: { saldo: caja.saldo + gasto.monto }
        })
      }
    }
    
    await db.gasto.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting gasto:', error)
    return NextResponse.json({ error: 'Error deleting gasto' }, { status: 500 })
  }
}
