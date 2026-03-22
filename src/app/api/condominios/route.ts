import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Use $queryRaw as a fallback if condominio model is not available
    // This can happen during hot reload when Prisma client is stale
    const condominios = await db.$queryRaw<Array<{
      id: string
      nombre: string
      direccion: string | null
      comuna: string | null
      ciudad: string | null
      rut: string | null
      telefono: string | null
      email: string | null
      logo: string | null
      etapas: string | null
      estado: string
      fechaInicio: string | null
      notas: string | null
      createdAt: Date
      updatedAt: Date
    }>>`SELECT * FROM Condominio WHERE estado = 'Activo' ORDER BY nombre ASC`
    
    return NextResponse.json(condominios)
  } catch (error) {
    console.error('Error fetching condominios:', error)
    return NextResponse.json({ error: 'Error al obtener condominios' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    
    // Use raw insert to avoid Prisma client caching issues
    const id = `cm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const now = new Date().toISOString()
    const etapasStr = data.etapas ? JSON.stringify(data.etapas) : null
    
    await db.$executeRaw`
      INSERT INTO Condominio (id, nombre, direccion, comuna, ciudad, rut, telefono, email, etapas, estado, notas, createdAt, updatedAt)
      VALUES (${id}, ${data.nombre}, ${data.direccion || null}, ${data.comuna || null}, ${data.ciudad || null}, 
              ${data.rut || null}, ${data.telefono || null}, ${data.email || null}, 
              ${etapasStr}, ${data.estado || 'Activo'}, ${data.notas || null},
              ${now}, ${now})
    `
    
    const condominios = await db.$queryRaw<Array<{
      id: string
      nombre: string
      direccion: string | null
      comuna: string | null
      ciudad: string | null
      rut: string | null
      telefono: string | null
      email: string | null
      logo: string | null
      etapas: string | null
      estado: string
      fechaInicio: string | null
      notas: string | null
      createdAt: Date
      updatedAt: Date
    }>>`SELECT * FROM Condominio WHERE id = ${id}`
    
    return NextResponse.json(condominios[0])
  } catch (error) {
    console.error('Error creating condominio:', error)
    return NextResponse.json({ error: 'Error al crear condominio' }, { status: 500 })
  }
}
