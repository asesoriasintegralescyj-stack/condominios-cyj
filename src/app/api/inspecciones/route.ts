import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - List all inspecciones
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    
    const inspecciones = await db.inspeccion.findMany({
      where: search ? {
        OR: [
          { titulo: { contains: search } },
          { estado: { contains: search } },
          { tipo: { contains: search } },
        ]
      } : undefined,
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(inspecciones)
  } catch (error) {
    console.error('Error fetching inspecciones:', error)
    return NextResponse.json({ error: 'Error fetching inspecciones' }, { status: 500 })
  }
}

// POST - Create new inspeccion
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const inspeccion = await db.inspeccion.create({
      data: {
        titulo: data.titulo,
        tipo: data.tipo || 'Mantenimiento',
        estado: data.estado || 'Planificado',
        fecha: data.fecha || new Date().toISOString().split('T')[0],
        hora: data.hora || '',
        ubicacion: data.ubicacion || '',
        asignado: data.asignado || '',
        descripcion: data.descripcion || '',
        recurrente: data.recurrente || false,
        notas: data.notas || '',
        fotosAntes: data.fotosAntes ? JSON.stringify(data.fotosAntes) : null,
        fotosDurante: data.fotosDurante ? JSON.stringify(data.fotosDurante) : null,
        fotosDespues: data.fotosDespues ? JSON.stringify(data.fotosDespues) : null,
      }
    })
    
    return NextResponse.json(inspeccion)
  } catch (error) {
    console.error('Error creating inspeccion:', error)
    return NextResponse.json({ error: 'Error creating inspeccion' }, { status: 500 })
  }
}
