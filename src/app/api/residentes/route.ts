import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - List all residentes
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const etapa = searchParams.get('etapa') || ''
    
    const residentes = await db.residente.findMany({
      where: {
        AND: [
          search ? {
            OR: [
              { nombre: { contains: search } },
              { apellido: { contains: search } },
              { rut: { contains: search } },
              { unidad: { contains: search } },
              { etapa: { contains: search } },
            ]
          } : {},
          etapa ? { etapa: { equals: etapa } } : {},
        ]
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(residentes)
  } catch (error) {
    console.error('Error fetching residentes:', error)
    return NextResponse.json({ error: 'Error fetching residentes' }, { status: 500 })
  }
}

// POST - Create new residente
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const residente = await db.residente.create({
      data: {
        nombre: data.nombre,
        apellido: data.apellido || null,
        rut: data.rut || null,
        unidad: data.unidad || null,
        etapa: data.etapa || null,
        tipo: data.tipo || 'Residente',
        telefono: data.telefono || null,
        email: data.email || null,
        fechaIngreso: data.fechaIngreso || null,
        estado: data.estado || 'Activo',
        vehiculos: data.vehiculos || null,
        notas: data.notas || null,
        propiedadId: data.propiedadId || null,
      }
    })
    
    return NextResponse.json(residente)
  } catch (error) {
    console.error('Error creating residente:', error)
    return NextResponse.json({ error: 'Error creating residente' }, { status: 500 })
  }
}
