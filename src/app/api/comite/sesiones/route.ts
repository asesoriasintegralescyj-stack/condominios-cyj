import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - List all sesiones de comite
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const tipo = searchParams.get('tipo') || ''
    const estado = searchParams.get('estado') || ''
    const condominioId = searchParams.get('condominioId') || ''
    
    const sesiones = await db.sesionComite.findMany({
      where: {
        AND: [
          search ? {
            OR: [
              { titulo: { contains: search } },
              { lugar: { contains: search } },
            ]
          } : {},
          tipo ? { tipo: { equals: tipo } } : {},
          estado ? { estado: { equals: estado } } : {},
          condominioId ? { condominioId: { equals: condominioId } } : {},
        ]
      },
      orderBy: [
        { fecha: 'desc' }
      ]
    })
    
    return NextResponse.json(sesiones)
  } catch (error) {
    console.error('Error fetching sesiones:', error)
    return NextResponse.json({ error: 'Error fetching sesiones' }, { status: 500 })
  }
}

// POST - Create new sesion de comite
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const sesion = await db.sesionComite.create({
      data: {
        titulo: data.titulo,
        tipo: data.tipo || 'Ordinaria',
        fecha: data.fecha,
        hora: data.hora || null,
        lugar: data.lugar || null,
        estado: data.estado || 'Programada',
        ordenDia: data.ordenDia || null,
        acuerdos: data.acuerdos || null,
        asistentes: data.asistentes || null,
        acta: data.acta || null,
        quorum: data.quorum || 0,
        notas: data.notas || null,
        condominioId: data.condominioId || null,
      }
    })
    
    return NextResponse.json(sesion)
  } catch (error) {
    console.error('Error creating sesion:', error)
    return NextResponse.json({ error: 'Error creating sesion' }, { status: 500 })
  }
}
