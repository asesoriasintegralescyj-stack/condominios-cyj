import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// GET - List all inspecciones
export async function GET(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'inspecciones.ver', session.userPermisos)) {
    return apiError('Sin permisos', 403)
  }
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
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'inspecciones.crear', session.userPermisos)) {
    return apiError('Sin permisos', 403)
  }
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
        fotos: data.fotos ? JSON.stringify(data.fotos) : null,
      }
    })
    
    return NextResponse.json(inspeccion)
  } catch (error) {
    console.error('Error creating inspeccion:', error)
    return NextResponse.json({ error: 'Error creating inspeccion' }, { status: 500 })
  }
}
