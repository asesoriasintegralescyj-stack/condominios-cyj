import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - List all proveedores
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    
    const proveedores = await db.proveedor.findMany({
      where: search ? {
        OR: [
          { razonSocial: { contains: search } },
          { rut: { contains: search } },
          { giro: { contains: search } },
        ]
      } : undefined,
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(proveedores)
  } catch (error) {
    console.error('Error fetching proveedores:', error)
    return NextResponse.json({ error: 'Error fetching proveedores' }, { status: 500 })
  }
}

// POST - Create new proveedor
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const proveedor = await db.proveedor.create({
      data: {
        razonSocial: data.razonSocial,
        rut: data.rut || '',
        giro: data.giro || '',
        direccion: data.direccion || '',
        comuna: data.comuna || '',
        telCorp: data.telCorp || '',
        emailCorp: data.emailCorp || '',
        web: data.web || '',
        contacto: data.contacto || '',
        cargo: data.cargo || '',
        telDirecto: data.telDirecto || '',
        emailContacto: data.emailContacto || '',
        celular: data.celular || '',
        estado: data.estado || 'Activo',
        notas: data.notas || '',
      }
    })
    
    return NextResponse.json(proveedor)
  } catch (error) {
    console.error('Error creating proveedor:', error)
    return NextResponse.json({ error: 'Error creating proveedor' }, { status: 500 })
  }
}
