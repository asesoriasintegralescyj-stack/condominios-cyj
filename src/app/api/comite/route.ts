import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - List all comite members
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const cargo = searchParams.get('cargo') || ''
    const estado = searchParams.get('estado') || ''
    const condominioId = searchParams.get('condominioId') || ''
    
    const comite = await db.comite.findMany({
      where: {
        AND: [
          search ? {
            OR: [
              { nombre: { contains: search } },
              { rut: { contains: search } },
              { unidad: { contains: search } },
            ]
          } : {},
          cargo ? { cargo: { equals: cargo } } : {},
          estado ? { estado: { equals: estado } } : {},
          condominioId ? { condominioId: { equals: condominioId } } : {},
        ]
      },
      orderBy: [
        { cargo: 'asc' },
        { createdAt: 'desc' }
      ]
    })
    
    return NextResponse.json(comite)
  } catch (error) {
    console.error('Error fetching comite:', error)
    return NextResponse.json({ error: 'Error fetching comite' }, { status: 500 })
  }
}

// POST - Create new comite member
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const comite = await db.comite.create({
      data: {
        nombre: data.nombre,
        cargo: data.cargo || 'Vocal',
        unidad: data.unidad || null,
        rut: data.rut || null,
        telefono: data.telefono || null,
        email: data.email || null,
        foto: data.foto || null,
        fechaInicio: data.fechaInicio || null,
        fechaFin: data.fechaFin || null,
        estado: data.estado || 'Activo',
        notas: data.notas || null,
        condominioId: data.condominioId || null,
      }
    })
    
    return NextResponse.json(comite)
  } catch (error) {
    console.error('Error creating comite member:', error)
    return NextResponse.json({ error: 'Error creating comite member' }, { status: 500 })
  }
}
