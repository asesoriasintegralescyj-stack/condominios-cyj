import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - List all compliance documents with categories
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const condominioId = searchParams.get('condominioId') || ''
    const categoriaId = searchParams.get('categoriaId') || ''
    const estado = searchParams.get('estado') || ''
    const tipo = searchParams.get('tipo') || ''
    const search = searchParams.get('search') || ''

    // Get categories with their documents
    const categorias = await db.categoriaCumplimiento.findMany({
      where: {
        AND: [
          condominioId ? { condominioId: { equals: condominioId } } : {},
          tipo ? { tipo: { equals: tipo } } : {},
          { activo: true }
        ]
      },
      include: {
        documentos: {
          where: {
            AND: [
              condominioId ? { condominioId: { equals: condominioId } } : {},
              estado ? { estado: { equals: estado } } : {},
              search ? { titulo: { contains: search } } : {}
            ]
          },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { orden: 'asc' }
    })

    // Get all documents without category filter
    const documentos = await db.documentoCumplimiento.findMany({
      where: {
        AND: [
          condominioId ? { condominioId: { equals: condominioId } } : {},
          categoriaId ? { categoriaId: { equals: categoriaId } } : {},
          estado ? { estado: { equals: estado } } : {},
          search ? { titulo: { contains: search } } : {}
        ]
      },
      include: {
        categoria: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calculate compliance percentage
    const totalDocumentos = documentos.length
    const documentosCumplidos = documentos.filter(d => d.cumple && d.estado === 'Aprobado').length
    const porcentajeGeneral = totalDocumentos > 0 ? Math.round((documentosCumplidos / totalDocumentos) * 100) : 0

    // Calculate by category type
    const porcentajePorTipo = {
      Legal: calcularPorcentajePorTipo(documentos, 'Legal'),
      Reglamentario: calcularPorcentajePorTipo(documentos, 'Reglamentario'),
      Interno: calcularPorcentajePorTipo(documentos, 'Interno'),
      Seguridad: calcularPorcentajePorTipo(documentos, 'Seguridad')
    }

    return NextResponse.json({
      categorias,
      documentos,
      resumen: {
        total: totalDocumentos,
        cumplidos: documentosCumplidos,
        pendientes: documentos.filter(d => d.estado === 'Pendiente').length,
        vencidos: documentos.filter(d => d.estado === 'Vencido').length,
        porcentajeGeneral,
        porcentajePorTipo
      }
    })
  } catch (error) {
    console.error('Error fetching cumplimiento:', error)
    return NextResponse.json({ error: 'Error fetching cumplimiento' }, { status: 500 })
  }
}

function calcularPorcentajePorTipo(documentos: any[], tipo: string): number {
  const docsTipo = documentos.filter(d => d.categoria?.tipo === tipo)
  if (docsTipo.length === 0) return 0
  const cumplidos = docsTipo.filter(d => d.cumple && d.estado === 'Aprobado').length
  return Math.round((cumplidos / docsTipo.length) * 100)
}

// POST - Create new compliance document
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()

    // Calculate compliance percentage based on file upload
    const tieneArchivo = !!(data.archivoBase64 || data.archivoUrl)
    const porcentajeCumplimiento = tieneArchivo ? 100 : 0

    const documento = await db.documentoCumplimiento.create({
      data: {
        titulo: data.titulo,
        descripcion: data.descripcion || null,
        archivoNombre: data.archivoNombre || null,
        archivoTipo: data.archivoTipo || null,
        archivoBase64: data.archivoBase64 || null,
        archivoUrl: data.archivoUrl || null,
        fechaDocumento: data.fechaDocumento || null,
        fechaVencimiento: data.fechaVencimiento || null,
        fechaAprobacion: data.fechaAprobacion || null,
        estado: data.estado || 'Pendiente',
        cumple: tieneArchivo,
        porcentajeCumplimiento,
        verificadoPor: data.verificadoPor || null,
        fechaVerificacion: data.fechaVerificacion || null,
        observaciones: data.observaciones || null,
        categoriaId: data.categoriaId || null,
        condominioId: data.condominioId || null,
        creadoPor: data.creadoPor || null,
        creadoPorNombre: data.creadoPorNombre || null,
      },
      include: {
        categoria: true
      }
    })

    // Create history record
    await db.historialCumplimiento.create({
      data: {
        documentoId: documento.id,
        accion: 'Creación',
        descripcion: `Documento "${data.titulo}" creado`,
        estadoNuevo: data.estado || 'Pendiente',
        usuarioId: data.creadoPor || null,
        usuarioNombre: data.creadoPorNombre || null
      }
    })

    // Update summary if condominioId exists
    if (data.condominioId) {
      await actualizarResumen(data.condominioId)
    }

    return NextResponse.json(documento)
  } catch (error) {
    console.error('Error creating compliance document:', error)
    return NextResponse.json({ error: 'Error creating compliance document' }, { status: 500 })
  }
}

// PUT - Update compliance document
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()

    if (!data.id) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 })
    }

    // Get previous state
    const documentoAnterior = await db.documentoCumplimiento.findUnique({
      where: { id: data.id }
    })

    if (!documentoAnterior) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Calculate compliance percentage based on file upload
    const tieneArchivo = !!(data.archivoBase64 || data.archivoUrl)
    const porcentajeCumplimiento = tieneArchivo ? 100 : 0

    const documento = await db.documentoCumplimiento.update({
      where: { id: data.id },
      data: {
        titulo: data.titulo,
        descripcion: data.descripcion || null,
        archivoNombre: data.archivoNombre || null,
        archivoTipo: data.archivoTipo || null,
        archivoBase64: data.archivoBase64 || null,
        archivoUrl: data.archivoUrl || null,
        fechaDocumento: data.fechaDocumento || null,
        fechaVencimiento: data.fechaVencimiento || null,
        fechaAprobacion: data.fechaAprobacion || null,
        estado: data.estado,
        cumple: tieneArchivo && data.estado === 'Aprobado',
        porcentajeCumplimiento,
        verificadoPor: data.verificadoPor || null,
        fechaVerificacion: data.fechaVerificacion ? new Date(data.fechaVerificacion) : null,
        observaciones: data.observaciones || null,
        categoriaId: data.categoriaId || null,
      },
      include: {
        categoria: true
      }
    })

    // Create history record
    await db.historialCumplimiento.create({
      data: {
        documentoId: documento.id,
        accion: 'Actualización',
        descripcion: `Documento "${data.titulo}" actualizado`,
        estadoAnterior: documentoAnterior.estado,
        estadoNuevo: data.estado,
        usuarioId: data.usuarioId || null,
        usuarioNombre: data.usuarioNombre || null
      }
    })

    // Update summary
    if (documento.condominioId) {
      await actualizarResumen(documento.condominioId)
    }

    return NextResponse.json(documento)
  } catch (error) {
    console.error('Error updating compliance document:', error)
    return NextResponse.json({ error: 'Error updating compliance document' }, { status: 500 })
  }
}

// DELETE - Delete compliance document
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 })
    }

    const documento = await db.documentoCumplimiento.findUnique({
      where: { id }
    })

    if (!documento) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Delete history records first
    await db.historialCumplimiento.deleteMany({
      where: { documentoId: id }
    })

    // Delete document
    await db.documentoCumplimiento.delete({
      where: { id }
    })

    // Update summary
    if (documento.condominioId) {
      await actualizarResumen(documento.condominioId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting compliance document:', error)
    return NextResponse.json({ error: 'Error deleting compliance document' }, { status: 500 })
  }
}

// Helper function to update compliance summary
async function actualizarResumen(condominioId: string) {
  try {
    const documentos = await db.documentoCumplimiento.findMany({
      where: { condominioId },
      include: { categoria: true }
    })

    const totalRequisitos = documentos.length
    const requisitosCumplidos = documentos.filter(d => d.cumple && d.estado === 'Aprobado').length
    const requisitosPendientes = documentos.filter(d => d.estado === 'Pendiente').length
    const requisitosVencidos = documentos.filter(d => d.estado === 'Vencido').length
    const porcentajeGeneral = totalRequisitos > 0 ? Math.round((requisitosCumplidos / totalRequisitos) * 100) : 0

    // Calculate by type
    const calcularPorcentaje = (tipo: string) => {
      const docsTipo = documentos.filter(d => d.categoria?.tipo === tipo)
      if (docsTipo.length === 0) return 0
      const cumplidos = docsTipo.filter(d => d.cumple && d.estado === 'Aprobado').length
      return Math.round((cumplidos / docsTipo.length) * 100)
    }

    // Count alerts (documents expiring soon or vencidos)
    const hoy = new Date()
    const alertasActivas = documentos.filter(d => {
      if (!d.fechaVencimiento) return false
      const vencimiento = new Date(d.fechaVencimiento)
      const diasParaVencer = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
      return diasParaVencer <= 30 || d.estado === 'Vencido'
    }).length

    // Upsert summary
    await db.resumenCumplimiento.upsert({
      where: { condominioId },
      update: {
        totalRequisitos,
        requisitosCumplidos,
        requisitosPendientes,
        requisitosVencidos,
        porcentajeGeneral,
        porcentajeLegal: calcularPorcentaje('Legal'),
        porcentajeReglamentario: calcularPorcentaje('Reglamentario'),
        porcentajeInterno: calcularPorcentaje('Interno'),
        porcentajeSeguridad: calcularPorcentaje('Seguridad'),
        alertasActivas,
        ultimaActualizacion: new Date()
      },
      create: {
        condominioId,
        totalRequisitos,
        requisitosCumplidos,
        requisitosPendientes,
        requisitosVencidos,
        porcentajeGeneral,
        porcentajeLegal: calcularPorcentaje('Legal'),
        porcentajeReglamentario: calcularPorcentaje('Reglamentario'),
        porcentajeInterno: calcularPorcentaje('Interno'),
        porcentajeSeguridad: calcularPorcentaje('Seguridad'),
        alertasActivas
      }
    })
  } catch (error) {
    console.error('Error updating compliance summary:', error)
  }
}
