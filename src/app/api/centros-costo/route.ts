import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - List all centros de costo
export async function GET() {
  try {
    const centros = await db.centroCostoMaster.findMany({
      orderBy: { codigo: 'asc' }
    })
    
    return NextResponse.json(centros)
  } catch (error) {
    console.error('Error fetching centros:', error)
    return NextResponse.json({ error: 'Error fetching centros' }, { status: 500 })
  }
}

// POST - Create new centro de costo
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const centro = await db.centroCostoMaster.create({
      data: {
        codigo: data.codigo,
        nombre: data.nombre,
        descripcion: data.descripcion || '',
        responsable: data.responsable || null,
        tipoGasto: data.tipoGasto || 'Variable',
        presupuestoMens: parseFloat(data.presupuestoMens) || 0,
        presupuestoAnual: parseFloat(data.presupuestoAnual) || 0,
        estado: data.estado || 'Activo',
      }
    })
    
    return NextResponse.json(centro)
  } catch (error) {
    console.error('Error creating centro:', error)
    return NextResponse.json({ error: 'Error creating centro' }, { status: 500 })
  }
}
