import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - List all cat herramientas
export async function GET() {
  try {
    const herramientas = await db.catHerramienta.findMany({
      orderBy: { nombre: 'asc' }
    })
    
    return NextResponse.json(herramientas)
  } catch (error) {
    console.error('Error fetching herramientas:', error)
    return NextResponse.json({ error: 'Error fetching herramientas' }, { status: 500 })
  }
}

// POST - Create new cat herramienta
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const herramienta = await db.catHerramienta.create({
      data: {
        codigo: data.codigo || null,
        nombre: data.nombre,
        marca: data.marca || null,
        modelo: data.modelo || null,
        cantidad: parseInt(data.cantidad) || 1,
        ubicacion: data.ubicacion || null,
        estado: data.estado || 'Bueno',
        valorReposicion: parseFloat(data.valorReposicion) || 0,
        fechaAdquisicion: data.fechaAdquisicion || null,
        descripcion: data.descripcion || null,
      }
    })
    
    return NextResponse.json(herramienta)
  } catch (error) {
    console.error('Error creating herramienta:', error)
    return NextResponse.json({ error: 'Error creating herramienta' }, { status: 500 })
  }
}
