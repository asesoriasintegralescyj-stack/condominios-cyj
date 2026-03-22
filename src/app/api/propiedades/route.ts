import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - List all propiedades
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    
    const propiedades = await db.propiedad.findMany({
      where: search ? {
        OR: [
          { nombre: { contains: search } },
          { estado: { contains: search } },
          { tipo: { contains: search } },
        ]
      } : undefined,
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(propiedades)
  } catch (error) {
    console.error('Error fetching propiedades:', error)
    return NextResponse.json({ error: 'Error fetching propiedades' }, { status: 500 })
  }
}

// POST - Create new propiedad
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const propiedad = await db.propiedad.create({
      data: {
        nombre: data.nombre,
        tipo: data.tipo || 'Casa',
        estado: data.estado || 'Disponible',
        direccion: data.direccion || '',
        habitaciones: parseInt(data.habitaciones) || 0,
        banos: parseInt(data.banos) || 0,
        mts2: parseFloat(data.mts2) || 0,
        precio: parseFloat(data.precio) || 0,
        contacto: data.contacto || '',
        telefono: data.telefono || '',
        email: data.email || '',
        fotos: data.fotos ? JSON.stringify(data.fotos) : null,
        notas: data.notas || '',
      }
    })
    
    return NextResponse.json(propiedad)
  } catch (error) {
    console.error('Error creating propiedad:', error)
    return NextResponse.json({ error: 'Error creating propiedad' }, { status: 500 })
  }
}
