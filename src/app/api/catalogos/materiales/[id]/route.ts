import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Get material by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const material = await db.catMaterial.findUnique({
      where: { id }
    })
    
    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    }
    
    return NextResponse.json(material)
  } catch (error) {
    console.error('Error fetching material:', error)
    return NextResponse.json({ error: 'Error fetching material' }, { status: 500 })
  }
}

// PUT - Update material
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()
    
    // Get current material to check for stock changes
    const currentMaterial = await db.catMaterial.findUnique({
      where: { id }
    })
    
    if (!currentMaterial) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    }
    
    // Update material
    const material = await db.catMaterial.update({
      where: { id },
      data: {
        nombre: data.nombre,
        unidad: data.unidad,
        precioUnit: parseFloat(data.precioUnit) || 0,
        categoria: data.categoria,
        stockActual: data.stockActual !== undefined ? parseInt(data.stockActual) || 0 : undefined,
        stockMinimo: data.stockMinimo !== undefined ? parseInt(data.stockMinimo) || 0 : undefined,
        ubicacion: data.ubicacion,
        codigo: data.codigo,
        descripcion: data.descripcion,
        centroCostoId: data.centroCostoId || null,
      }
    })
    
    // Check if stock changed and create movement record
    if (data.stockActual !== undefined && data.stockActual !== currentMaterial.stockActual) {
      const stockAnterior = currentMaterial.stockActual
      const stockNuevo = parseInt(data.stockActual) || 0
      const diferencia = stockNuevo - stockAnterior
      
      // Determine movement type
      let tipo: string
      if (diferencia > 0) {
        tipo = 'Entrada'
      } else if (diferencia < 0) {
        tipo = 'Salida'
      } else {
        tipo = 'Ajuste'
      }
      
      // Create movement record
      await db.movimientoInventario.create({
        data: {
          tipo: data.movimientoTipo || tipo,
          materialId: id,
          materialCodigo: material.codigo,
          materialNombre: material.nombre,
          cantidad: Math.abs(diferencia),
          stockAnterior: stockAnterior,
          stockNuevo: stockNuevo,
          motivo: data.movimientoMotivo || `Ajuste de inventario`,
          referencia: data.movimientoReferencia,
          referenciaId: data.movimientoReferenciaId,
          observaciones: data.movimientoObservaciones,
          usuarioId: data.usuarioId,
          usuarioNombre: data.usuarioNombre,
          condominioId: material.condominioId,
        }
      })
    }
    
    return NextResponse.json(material)
  } catch (error) {
    console.error('Error updating material:', error)
    return NextResponse.json({ error: 'Error updating material' }, { status: 500 })
  }
}

// DELETE - Delete material
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.catMaterial.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting material:', error)
    return NextResponse.json({ error: 'Error deleting material' }, { status: 500 })
  }
}
