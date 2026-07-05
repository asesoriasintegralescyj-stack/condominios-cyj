import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

// GET - Get single compliance document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  try {
    const { id } = await params

    const documento = await db.documentoCumplimiento.findUnique({
      where: { id },
      include: {
        categoria: true
      }
    })

    if (!documento) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Get history for this document
    const historial = await db.historialCumplimiento.findMany({
      where: { documentoId: id },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({ ...documento, historial })
  } catch (error) {
    console.error('Error fetching compliance document:', error)
    return NextResponse.json({ error: 'Error fetching compliance document' }, { status: 500 })
  }
}

// PUT - Update compliance document status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'configuracion.editar')) {
    return apiError('Sin permisos', 403)
  }
  try {
    const { id } = await params
    const data = await request.json()

    const documentoAnterior = await db.documentoCumplimiento.findUnique({
      where: { id }
    })

    if (!documentoAnterior) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Calculate compliance percentage
    // IMPORTANTE: distinguir 3 casos para el archivo:
    //   1. data.archivoRemoved === true  → usuario quiere BORRAR el archivo
    //   2. data.archivoBase64 empieza con 'data:' → usuario seleccionó archivo NUEVO
    //   3. data.archivoBase64 no viene o viene vacío → PRESERVAR el archivo existente
    let archivoBase64Final: string | null
    let archivoNombreFinal: string | null
    let archivoTipoFinal: string | null

    if (data.archivoRemoved === true) {
      // Caso 1: Borrar
      archivoBase64Final = null
      archivoNombreFinal = null
      archivoTipoFinal = null
    } else if (data.archivoBase64 && data.archivoBase64.startsWith('data:')) {
      // Caso 2: Reemplazar con archivo nuevo
      archivoBase64Final = data.archivoBase64
      archivoNombreFinal = data.archivoNombre ?? null
      archivoTipoFinal = data.archivoTipo ?? null
    } else {
      // Caso 3: Preservar el existente (no enviar campos o enviar vacíos)
      archivoBase64Final = documentoAnterior.archivoBase64
      archivoNombreFinal = documentoAnterior.archivoNombre
      archivoTipoFinal = documentoAnterior.archivoTipo
    }

    const tieneArchivo = !!(archivoBase64Final || data.archivoUrl || documentoAnterior.archivoUrl)
    const porcentajeCumplimiento = tieneArchivo && data.estado === 'Aprobado' ? 100 : tieneArchivo ? 50 : 0

    const documento = await db.documentoCumplimiento.update({
      where: { id },
      data: {
        titulo: data.titulo ?? documentoAnterior.titulo,
        descripcion: data.descripcion ?? documentoAnterior.descripcion,
        archivoNombre: archivoNombreFinal,
        archivoTipo: archivoTipoFinal,
        archivoBase64: archivoBase64Final,
        archivoUrl: data.archivoUrl ?? documentoAnterior.archivoUrl,
        fechaDocumento: data.fechaDocumento ?? documentoAnterior.fechaDocumento,
        fechaVencimiento: data.fechaVencimiento ?? documentoAnterior.fechaVencimiento,
        fechaAprobacion: data.fechaAprobacion ?? documentoAnterior.fechaAprobacion,
        estado: data.estado ?? documentoAnterior.estado,
        cumple: porcentajeCumplimiento === 100,
        porcentajeCumplimiento,
        verificadoPor: data.verificadoPor ?? documentoAnterior.verificadoPor,
        fechaVerificacion: data.fechaVerificacion ? new Date(data.fechaVerificacion) : documentoAnterior.fechaVerificacion,
        observaciones: data.observaciones ?? documentoAnterior.observaciones,
        categoriaId: data.categoriaId ?? documentoAnterior.categoriaId,
      },
      include: {
        categoria: true
      }
    })

    // Create history record
    await db.historialCumplimiento.create({
      data: {
        documentoId: id,
        accion: data.estado !== documentoAnterior.estado ? 'Cambio de Estado' : 'Actualización',
        descripcion: data.observaciones || `Documento actualizado`,
        estadoAnterior: documentoAnterior.estado,
        estadoNuevo: data.estado || documentoAnterior.estado,
        usuarioId: data.usuarioId || null,
        usuarioNombre: data.usuarioNombre || null
      }
    })

    return NextResponse.json(documento)
  } catch (error) {
    console.error('Error updating compliance document:', error)
    return NextResponse.json({ error: 'Error updating compliance document' }, { status: 500 })
  }
}

// DELETE - Delete compliance document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'configuracion.editar')) {
    return apiError('Sin permisos', 403)
  }
  try {
    const { id } = await params

    const documento = await db.documentoCumplimiento.findUnique({
      where: { id }
    })

    if (!documento) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Delete history records
    await db.historialCumplimiento.deleteMany({
      where: { documentoId: id }
    })

    // Delete document
    await db.documentoCumplimiento.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting compliance document:', error)
    return NextResponse.json({ error: 'Error deleting compliance document' }, { status: 500 })
  }
}
