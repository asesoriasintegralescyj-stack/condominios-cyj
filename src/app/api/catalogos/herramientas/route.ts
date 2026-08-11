import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'
import { generarCorrelativo } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// GET - List all cat herramientas
export async function GET(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'catalogos.ver')) {
    return apiError('Sin permisos', 403)
  }
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 200)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0)

    // Excluir manualBase64 de la lista para no inflar el payload
    const [herramientas, total] = await Promise.all([
      db.catHerramienta.findMany({
        take: limit,
        skip: offset,
        orderBy: { nombre: 'asc' },
        include: {
          centroCosto: true,
        },
      }),
      db.catHerramienta.count(),
    ])
    // Ocultar manualBase64 e informeMantencionBase64 en la lista (puede ser muy pesado); solo enviar metadatos
    const result = herramientas.map(
      ({
        manualBase64: _manualBase64,
        informeMantencionBase64: _informeMantencionBase64,
        ...rest
      }) => ({
        ...rest,
        tieneManual: Boolean(rest.manualNombre),
        tieneInformeMantencion: Boolean(rest.informeMantencionNombre),
      })
    )
    
    return NextResponse.json({ items: result, total })
  } catch (error) {
    console.error('Error fetching herramientas:', error)
    return NextResponse.json({ error: 'Error fetching herramientas' }, { status: 500 })
  }
}

// POST - Create new cat herramienta
export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'catalogos.crear')) {
    return apiError('Sin permisos', 403)
  }
  try {
    const data = await request.json()

    // Generar código automático si no se proporciona usando tabla de secuencias
    let codigo = data.codigo || null
    if (!codigo) {
      const { generarCorrelativoDB } = await import('@/lib/utils')
      codigo = await generarCorrelativoDB(db, 'CatHerramienta', 'HERR', 3)
    }

    const herramienta = await db.catHerramienta.create({
      data: {
        codigo,
        nombre: data.nombre,
        marca: data.marca || null,
        modelo: data.modelo || null,
        cantidad: parseInt(data.cantidad) || 1,
        ubicacion: data.ubicacion || null,
        estado: data.estado || 'Bueno',
        valorReposicion: parseFloat(data.valorReposicion) || 0,
        fechaAdquisicion: data.fechaAdquisicion || null,
        descripcion: data.descripcion || null,
        manualBase64: data.manualBase64 || null,
        manualNombre: data.manualNombre || null,
        manualTipo: data.manualTipo || null,
        fechaUltimoMantencion: data.fechaUltimoMantencion || null,
        informeMantencionBase64: data.informeMantencionBase64 || null,
        informeMantencionNombre: data.informeMantencionNombre || null,
        informeMantencionTipo: data.informeMantencionTipo || null,
      }
    })
    
    return NextResponse.json(herramienta)
  } catch (error) {
    console.error('Error creating herramienta:', error)
    return NextResponse.json({ error: 'Error creating herramienta' }, { status: 500 })
  }
}
