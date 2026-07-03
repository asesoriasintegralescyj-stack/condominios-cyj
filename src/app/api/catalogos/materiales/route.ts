import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'
import { generarCorrelativo } from '@/lib/utils'

// GET - List all cat materiales
export async function GET() {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'catalogos.ver')) {
    return apiError('Sin permisos', 403)
  }
  try {
    const materiales = await db.catMaterial.findMany({
      orderBy: { nombre: 'asc' }
    })
    
    return NextResponse.json(materiales)
  } catch (error) {
    console.error('Error fetching materiales:', error)
    return NextResponse.json({ error: 'Error fetching materiales' }, { status: 500 })
  }
}

// POST - Create new cat material
export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'catalogos.crear')) {
    return apiError('Sin permisos', 403)
  }
  try {
    const data = await request.json()

    // Generar código automático si no se proporciona (MAT-001, MAT-002, ...)
    let codigo = data.codigo || null
    if (!codigo) {
      const existentes = await db.catMaterial.findMany({ select: { codigo: true } })
      codigo = generarCorrelativo(existentes.map(e => e.codigo), 'MAT', 3)
    }

    const material = await db.catMaterial.create({
      data: {
        codigo,
        nombre: data.nombre,
        unidad: data.unidad || 'unidad',
        precioUnit: parseFloat(data.precioUnit) || 0,
        categoria: data.categoria || 'General',
        stockMinimo: parseInt(data.stockMinimo) || 0,
        stockActual: parseInt(data.stockActual) || 0,
        ubicacion: data.ubicacion || null,
        descripcion: data.descripcion || null,
        centroCostoId: data.centroCostoId || null,
      }
    })
    
    return NextResponse.json(material)
  } catch (error) {
    console.error('Error creating material:', error)
    return NextResponse.json({ error: 'Error creating material' }, { status: 500 })
  }
}
