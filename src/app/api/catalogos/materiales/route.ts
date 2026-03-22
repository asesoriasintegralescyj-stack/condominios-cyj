import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - List all cat materiales
export async function GET() {
  try {
    const materiales = await db.catMaterial.findMany({
      orderBy: { nombre: 'asc' }
    })
    
    return NextResponse.json(materiales)
  } catch (error) {
    console.error('Error fetching materiales:', error)
    return NextResponse.json({ error: 'Error fetching materiales' }, { status: 500 })
  }
}

// POST - Create new cat material
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const material = await db.catMaterial.create({
      data: {
        codigo: data.codigo || null,
        nombre: data.nombre,
        unidad: data.unidad || 'unidad',
        precioUnit: parseFloat(data.precioUnit) || 0,
        categoria: data.categoria || 'General',
        stockMinimo: parseInt(data.stockMinimo) || 0,
        stockActual: parseInt(data.stockActual) || 0,
        ubicacion: data.ubicacion || null,
        descripcion: data.descripcion || null,
        centroCostoId: data.centroCostoId || null,
      }
    })
    
    return NextResponse.json(material)
  } catch (error) {
    console.error('Error creating material:', error)
    return NextResponse.json({ error: 'Error creating material' }, { status: 500 })
  }
}
