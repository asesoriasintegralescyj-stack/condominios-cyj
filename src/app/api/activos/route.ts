import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - List all activos
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    
    const activos = await db.activo.findMany({
      where: search ? {
        OR: [
          { nombre: { contains: search } },
          { categoria: { contains: search } },
          { estado: { contains: search } },
        ]
      } : undefined,
      include: {
        asignado: true
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(activos)
  } catch (error) {
    console.error('Error fetching activos:', error)
    return NextResponse.json({ error: 'Error fetching activos' }, { status: 500 })
  }
}

// POST - Create new activo
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const activo = await db.activo.create({
      data: {
        nombre: data.nombre,
        categoria: data.categoria || 'Equipo',
        estado: data.estado || 'Activo',
        ubicacion: data.ubicacion || '',
        serie: data.serie || '',
        fechaCompra: data.fechaCompra || '',
        costoCompra: parseFloat(data.costoCompra) || 0,
        valorActual: parseFloat(data.valorActual) || 0,
        descripcion: data.descripcion || '',
        asignadoId: data.asignadoId || null,
      }
    })
    
    return NextResponse.json(activo)
  } catch (error) {
    console.error('Error creating activo:', error)
    return NextResponse.json({ error: 'Error creating activo' }, { status: 500 })
  }
}
