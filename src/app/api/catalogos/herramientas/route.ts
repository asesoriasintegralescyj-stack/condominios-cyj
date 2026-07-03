import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'
import { generarCorrelativo } from '@/lib/utils'

// GET - List all cat herramientas
export async function GET() {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'catalogos.ver')) {
    return apiError('Sin permisos', 403)
  }
  try {
    // Excluir manualBase64 de la lista para no inflar el payload
    const herramientas = await db.catHerramienta.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        centroCosto: true,
      },
    })
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
    
    return NextResponse.json(result)
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

    // Generar código automático si no se proporciona (HERR-001, HERR-002, ...)
    let codigo = data.codigo || null
    if (!codigo) {
      const existentes = await db.catHerramienta.findMany({ select: { codigo: true } })
      codigo = generarCorrelativo(existentes.map(e => e.codigo), 'HERR', 3)
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
