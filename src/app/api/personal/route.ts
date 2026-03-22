import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - List all personal
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    
    const personal = await db.personal.findMany({
      where: search ? {
        OR: [
          { nombre: { contains: search } },
          { rut: { contains: search } },
          { cargo: { contains: search } },
          { estado: { contains: search } },
        ]
      } : undefined,
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(personal)
  } catch (error) {
    console.error('Error fetching personal:', error)
    return NextResponse.json({ error: 'Error fetching personal' }, { status: 500 })
  }
}

// POST - Create new personal
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const personal = await db.personal.create({
      data: {
        nombre: data.nombre,
        rut: data.rut || '',
        cargo: data.cargo || '',
        contrato: data.contrato || 'Indefinido',
        afp: data.afp || 'ProVida',
        salud: data.salud || 'Fonasa',
        mutual: data.mutual || 'IST',
        ccaf: data.ccaf || '',
        fechaIngreso: data.fechaIngreso || new Date().toISOString().split('T')[0],
        sueldoBase: parseFloat(data.sueldoBase) || 0,
        movilizacion: parseFloat(data.movilizacion) || 0,
        colacion: parseFloat(data.colacion) || 0,
        viatico: parseFloat(data.viatico) || 0,
        asigFamiliar: parseFloat(data.asigFamiliar) || 0,
        estado: data.estado || 'Activo',
        email: data.email || '',
        telefono: data.telefono || '',
        foto: data.foto || null,
        notas: data.notas || '',
      }
    })
    
    return NextResponse.json(personal)
  } catch (error) {
    console.error('Error creating personal:', error)
    return NextResponse.json({ error: 'Error creating personal' }, { status: 500 })
  }
}
