import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// GET - Get activo by ID
// Si el header X-Incluir-Manual viene en 'true', se incluyen manualBase64
// e informeMantencionBase64 (para no inflar el payload por defecto)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'activos.ver', session.userPermisos)) {
    return apiError('Sin permisos', 403)
  }
  try {
    const { id } = await params
    const incluirManual = request.headers.get('x-incluir-manual') === 'true'
    const activo = await db.activo.findUnique({
      where: { id },
      include: { asignado: true }
    })

    if (!activo) {
      return NextResponse.json({ error: 'Activo not found' }, { status: 404 })
    }

    if (!incluirManual) {
      const {
        manualBase64: _manualBase64,
        informeMantencionBase64: _informeMantencionBase64,
        ...rest
      } = activo
      return NextResponse.json({
        ...rest,
        tieneManual: Boolean(rest.manualNombre),
        tieneInformeMantencion: Boolean(rest.informeMantencionNombre),
      })
    }

    return NextResponse.json({
      ...activo,
      tieneManual: Boolean(activo.manualNombre),
      tieneInformeMantencion: Boolean(activo.informeMantencionNombre),
    })
  } catch (error) {
    console.error('Error fetching activo:', error)
    return NextResponse.json({ error: 'Error fetching activo' }, { status: 500 })
  }
}

// PUT - Update activo
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'activos.editar', session.userPermisos)) {
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

    const activo = await db.activo.update({
      where: { id },
      data: {
        nombre: data.nombre,
        categoria: data.categoria,
        estado: data.estado,
        ubicacion: data.ubicacion,
        serie: data.serie,
        fechaCompra: data.fechaCompra,
        costoCompra: parseFloat(data.costoCompra) || 0,
        valorActual: parseFloat(data.valorActual) || 0,
        descripcion: data.descripcion,
        asignadoId: data.asignadoId || null,
        fechaUltimoMantencion: data.fechaUltimoMantencion || null,
        ...dataManual,
        ...dataInformeMantencion,
      }
    })

    return NextResponse.json(activo)
  } catch (error) {
    console.error('Error updating activo:', error)
    return NextResponse.json({ error: 'Error updating activo' }, { status: 500 })
  }
}

// DELETE - Delete activo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'activos.eliminar', session.userPermisos)) {
    return apiError('Sin permisos', 403)
  }
  try {
    const { id } = await params
    await db.activo.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting activo:', error)
    return NextResponse.json({ error: 'Error deleting activo' }, { status: 500 })
  }
}
