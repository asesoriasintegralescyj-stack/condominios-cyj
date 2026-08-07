import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// GET - List all proveedores
export async function GET(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'proveedores.ver')) {
    return apiError('Sin permisos', 403)
  }
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    
    const proveedores = await withRetry(() => db.proveedor.findMany({
      where: search ? {
        OR: [
          { razonSocial: { contains: search } },
          { rut: { contains: search } },
          { giro: { contains: search } },
        ]
      } : undefined,
      orderBy: { createdAt: 'desc' }
    }))
    
    return NextResponse.json(proveedores)
  } catch (error) {
    console.error('Error fetching proveedores:', error)
    return NextResponse.json({ error: 'Error fetching proveedores' }, { status: 500 })
  }
}

// POST - Create new proveedor
export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'proveedores.crear')) {
    return apiError('Sin permisos', 403)
  }
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
