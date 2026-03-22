import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Get proyecto by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const proyecto = await db.proyecto.findUnique({
      where: { id },
      include: {
        materiales: true,
        herramientas: true,
        tareas: true,
        personal: true,
        documentos: true,
      }
    })
    
    if (!proyecto) {
      return NextResponse.json({ error: 'Proyecto not found' }, { status: 404 })
    }
    
    return NextResponse.json(proyecto)
  } catch (error) {
    console.error('Error fetching proyecto:', error)
    return NextResponse.json({ error: 'Error fetching proyecto' }, { status: 500 })
  }
}

// PUT - Update proyecto
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()
    
    // Extract resources from data
    const { materiales, herramientas, tareas, personal, documentos, ...proyectoData } = data
    
    // Update proyecto basic data
    const proyecto = await db.proyecto.update({
      where: { id },
      data: {
        nombre: proyectoData.nombre,
        categoria: proyectoData.categoria,
        estado: proyectoData.estado,
        ubicacion: proyectoData.ubicacion || null,
        fechaInicio: proyectoData.fechaInicio || null,
        fechaFin: proyectoData.fechaFin || null,
        presProg: parseFloat(proyectoData.presProg) || 0,
        presUsado: parseFloat(proyectoData.presUsado) || 0,
        avance: parseInt(proyectoData.avance) || 0,
        descripcion: proyectoData.descripcion || null,
        notas: proyectoData.notas || null,
      }
    })
    
    // Update materials if provided
    if (materiales !== undefined) {
      await db.proyectoMaterial.deleteMany({ where: { proyectoId: id } })
      if (materiales.length > 0) {
        await db.proyectoMaterial.createMany({
          data: materiales.map((m: { descripcion: string; cantidad: number; unidad: string; precioUnit: number; total: number }) => ({
            proyectoId: id,
            descripcion: m.descripcion,
            cantidad: parseFloat(String(m.cantidad)) || 1,
            unidad: m.unidad || 'unidad',
            precioUnit: parseFloat(String(m.precioUnit)) || 0,
            total: parseFloat(String(m.total)) || 0,
          }))
        })
      }
    }
    
    // Update herramientas if provided
    if (herramientas !== undefined) {
      await db.proyectoHerramienta.deleteMany({ where: { proyectoId: id } })
      if (herramientas.length > 0) {
        await db.proyectoHerramienta.createMany({
          data: herramientas.map((h: { nombre: string; cantidad: number }) => ({
            proyectoId: id,
            nombre: h.nombre,
            cantidad: parseInt(String(h.cantidad)) || 1,
          }))
        })
      }
    }
    
    // Update tareas if provided
    if (tareas !== undefined) {
      await db.proyectoTarea.deleteMany({ where: { proyectoId: id } })
      if (tareas.length > 0) {
        await db.proyectoTarea.createMany({
          data: tareas.map((t: { descripcion: string; cantidad: number; estado: string }) => ({
            proyectoId: id,
            descripcion: t.descripcion,
            cantidad: parseInt(String(t.cantidad)) || 1,
            estado: t.estado || 'Pendiente',
          }))
        })
      }
    }
    
    // Update personal if provided
    if (personal !== undefined) {
      await db.proyectoPersonal.deleteMany({ where: { proyectoId: id } })
      if (personal.length > 0) {
        await db.proyectoPersonal.createMany({
          data: personal.map((p: { nombre: string; tipo: string; cantidad: number; precioUnit: number; total: number }) => ({
            proyectoId: id,
            nombre: p.nombre,
            tipo: p.tipo || 'Interno',
            cantidad: parseInt(String(p.cantidad)) || 1,
            precioUnit: parseFloat(String(p.precioUnit)) || 0,
            total: parseFloat(String(p.total)) || 0,
          }))
        })
      }
    }
    
    // Update documentos if provided
    if (documentos !== undefined) {
      await db.proyectoDocumento.deleteMany({ where: { proyectoId: id } })
      if (documentos.length > 0) {
        await db.proyectoDocumento.createMany({
          data: documentos.map((d: { nombre: string; tipo: string; descripcion: string; archivo: string; fechaDoc: string }) => ({
            proyectoId: id,
            nombre: d.nombre,
            tipo: d.tipo || 'cotizacion',
            descripcion: d.descripcion || null,
            archivo: d.archivo,
            fechaDoc: d.fechaDoc || null,
          }))
        })
      }
    }
    
    // Return updated proyecto with all relations
    const updatedProyecto = await db.proyecto.findUnique({
      where: { id },
      include: {
        materiales: true,
        herramientas: true,
        tareas: true,
        personal: true,
        documentos: true,
      }
    })
    
    return NextResponse.json(updatedProyecto)
  } catch (error) {
    console.error('Error updating proyecto:', error)
    return NextResponse.json({ error: 'Error updating proyecto' }, { status: 500 })
  }
}

// DELETE - Delete proyecto
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    await db.proyectoMaterial.deleteMany({ where: { proyectoId: id } })
    await db.proyectoHerramienta.deleteMany({ where: { proyectoId: id } })
    await db.proyectoTarea.deleteMany({ where: { proyectoId: id } })
    await db.proyectoPersonal.deleteMany({ where: { proyectoId: id } })
    await db.proyectoDocumento.deleteMany({ where: { proyectoId: id } })
    
    await db.proyecto.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting proyecto:', error)
    return NextResponse.json({ error: 'Error deleting proyecto' }, { status: 500 })
  }
}
