import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Get single compliance document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const tieneArchivo = !!(data.archivoBase64 || data.archivoUrl || documentoAnterior.archivoBase64 || documentoAnterior.archivoUrl)
    const porcentajeCumplimiento = tieneArchivo && data.estado === 'Aprobado' ? 100 : tieneArchivo ? 50 : 0

    const documento = await db.documentoCumplimiento.update({
      where: { id },
      data: {
        titulo: data.titulo ?? documentoAnterior.titulo,
        descripcion: data.descripcion ?? documentoAnterior.descripcion,
        archivoNombre: data.archivoNombre ?? documentoAnterior.archivoNombre,
        archivoTipo: data.archivoTipo ?? documentoAnterior.archivoTipo,
        archivoBase64: data.archivoBase64 ?? documentoAnterior.archivoBase64,
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
