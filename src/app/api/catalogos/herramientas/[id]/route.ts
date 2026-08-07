import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// GET - Get herramienta by ID
// Si el header X-Incluir-Manual viene en 'true', se incluye el manualBase64
// (para no inflar el payload por defecto)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'catalogos.ver')) {
    return apiError('Sin permisos', 403)
  }
  try {
    const { id } = await params
    const incluirManual = request.headers.get('x-incluir-manual') === 'true'
    const herramienta = await db.catHerramienta.findUnique({
      where: { id },
      include: {
        centroCosto: true,
      },
    })
    
    if (!herramienta) {
      return NextResponse.json({ error: 'Herramienta not found' }, { status: 404 })
    }

    if (!incluirManual) {
      const {
        manualBase64: _manualBase64,
        informeMantencionBase64: _informeMantencionBase64,
        ...rest
      } = herramienta
      return NextResponse.json({
        ...rest,
        tieneManual: Boolean(rest.manualNombre),
        tieneInformeMantencion: Boolean(rest.informeMantencionNombre),
      })
    }
    
    return NextResponse.json({
      ...herramienta,
      tieneManual: Boolean(herramienta.manualNombre),
      tieneInformeMantencion: Boolean(herramienta.informeMantencionNombre),
    })
  } catch (error) {
    console.error('Error fetching herramienta:', error)
    return NextResponse.json({ error: 'Error fetching herramienta' }, { status: 500 })
  }
}

// PUT - Update herramienta
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'catalogos.editar')) {
    return apiError('Sin permisos', 403)
  }
  try {
    const { id } = await params
    const data = await request.json()

    // Si viene la bandera eliminarManual, se limpian los campos del manual
    const eliminarManual = data.eliminarManual === true
    const dataManual = eliminarManual
      ? { manualBase64: null, manualNombre: null, manualTipo: null }
      : {
          manualBase64: data.manualBase64 ?? undefined,
          manualNombre: data.manualNombre ?? undefined,
          manualTipo: data.manualTipo ?? undefined,
        }

    // Si viene la bandera eliminarInformeMantencion, se limpian los campos del informe
    const eliminarInformeMantencion = data.eliminarInformeMantencion === true
    const dataInformeMantencion = eliminarInformeMantencion
      ? {
          informeMantencionBase64: null,
          informeMantencionNombre: null,
          informeMantencionTipo: null,
        }
      : {
          informeMantencionBase64: data.informeMantencionBase64 ?? undefined,
          informeMantencionNombre: data.informeMantencionNombre ?? undefined,
          informeMantencionTipo: data.informeMantencionTipo ?? undefined,
        }
    
    const herramienta = await db.catHerramienta.update({
      where: { id },
      data: {
        codigo: data.codigo || null,
        nombre: data.nombre,
        marca: data.marca || null,
        modelo: data.modelo || null,
        cantidad: parseInt(data.cantidad) || 1,
        ubicacion: data.ubicacion || null,
        estado: data.estado || 'Bueno',
        valorReposicion: parseFloat(data.valorReposicion) || 0,
        fechaAdquisicion: data.fechaAdquisicion || null,
        descripcion: data.descripcion || null,
        fechaUltimoMantencion: data.fechaUltimoMantencion || null,
        ...dataManual,
        ...dataInformeMantencion,
      }
    })
    
    return NextResponse.json(herramienta)
  } catch (error) {
    console.error('Error updating herramienta:', error)
    return NextResponse.json({ error: 'Error updating herramienta' }, { status: 500 })
  }
}

// DELETE - Delete herramienta
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'catalogos.editar')) {
    return apiError('Sin permisos', 403)
  }
  try {
    const { id } = await params
    await db.catHerramienta.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting herramienta:', error)
    return NextResponse.json({ error: 'Error deleting herramienta' }, { status: 500 })
  }
}
