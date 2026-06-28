import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

// GET - Get orden de trabajo by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'ots.ver')) {
    return apiError('Sin permisos', 403)
  }
  try {
    const { id } = await params
    const orden = await db.ordenTrabajo.findUnique({
      where: { id },
      include: {
        propiedad: true,
        asignado: true,
        activo: true,
        centroCosto: true,
        materiales: true,
        herramientas: true,
        tareas: true,
        personalOT: true,
        documentos: true,
      }
    })
    
    if (!orden) {
      return NextResponse.json({ error: 'Orden not found' }, { status: 404 })
    }
    
    // Parse photos from JSON strings to arrays
    const ordenWithPhotos = {
      ...orden,
      fotosAntes: orden.fotosAntes ? JSON.parse(orden.fotosAntes) : [],
      fotosDespues: orden.fotosDespues ? JSON.parse(orden.fotosDespues) : [],
    }
    
    return NextResponse.json(ordenWithPhotos)
  } catch (error) {
    console.error('Error fetching orden:', error)
    return NextResponse.json({ error: 'Error fetching orden' }, { status: 500 })
  }
}

// PUT - Update orden de trabajo
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'ots.editar')) {
    return apiError('Sin permisos', 403)
  }
  try {
    const { id } = await params
    const data = await request.json()
    
    // Get current OT to check state change
    const currentOT = await db.ordenTrabajo.findUnique({
      where: { id },
      select: { estado: true, estadoAprobacion: true }
    })
    
    // Prepare update data
    const updateData: any = {
      titulo: data.titulo,
      tipo: data.tipo,
      prioridad: data.prioridad,
      estado: data.estado,
      ubicacion: data.ubicacion || null,
      fechaInicio: data.fechaInicio || null,
      fechaLimite: data.fechaLimite || null,
      fechaInicioReal: data.fechaInicioReal || null,
      fechaFinReal: data.fechaFinReal || null,
      costoEstimado: parseFloat(data.costoEstimado) || 0,
      costoReal: parseFloat(data.costoReal) || 0,
      progreso: parseInt(data.progreso) || 0,
      descripcion: data.descripcion || null,
      tiempoEst: parseInt(data.tiempoEst) || 0,
      tiempoReal: parseInt(data.tiempoReal) || 0,
      valorHora: parseFloat(data.valorHora) || 0,
      notas: data.notas || null,
      propiedadId: data.propiedadId || null,
      asignadoId: data.asignadoId || null,
      activoId: data.activoId || null,
      centroCostoId: data.centroCostoId || null,
      esRecurrente: data.esRecurrente || false,
      formaPago: data.formaPago || null,
      fotosAntes: data.fotosAntes && data.fotosAntes.length > 0 ? JSON.stringify(data.fotosAntes) : null,
      fotosDespues: data.fotosDespues && data.fotosDespues.length > 0 ? JSON.stringify(data.fotosDespues) : null,
    }
    
    // Si el estado cambia a Completado y no tiene estadoAprobacion, establecerlo como Pendiente
    if (data.estado === 'Completado' && currentOT?.estado !== 'Completado') {
      if (!currentOT?.estadoAprobacion || currentOT.estadoAprobacion === 'Pendiente') {
        updateData.estadoAprobacion = 'Pendiente'
        updateData.fechaSolicitudAprob = new Date().toISOString()
      }
    }
    
    // Update main OT
    const orden = await db.ordenTrabajo.update({
      where: { id },
      data: updateData
    })
    
    // Update materials if provided
    if (data.materiales !== undefined) {
      await db.oTMaterial.deleteMany({ where: { otId: id } })
      if (data.materiales.length > 0) {
        await db.oTMaterial.createMany({
          data: data.materiales.map((m: any) => ({
            descripcion: m.descripcion,
            cantidad: parseFloat(m.cantidad) || 1,
            unidad: m.unidad || 'unidad',
            precioUnit: parseFloat(m.precioUnit) || 0,
            total: parseFloat(m.total) || 0,
            otId: id
          }))
        })
      }
    }
    
    // Update herramientas if provided
    if (data.herramientas !== undefined) {
      await db.oTHerramienta.deleteMany({ where: { otId: id } })
      if (data.herramientas.length > 0) {
        await db.oTHerramienta.createMany({
          data: data.herramientas.map((h: any) => ({
            nombre: h.nombre,
            cantidad: parseInt(h.cantidad) || 1,
            otId: id
          }))
        })
      }
    }
    
    // Update tareas if provided
    if (data.tareas !== undefined) {
      await db.oTTarea.deleteMany({ where: { otId: id } })
      if (data.tareas.length > 0) {
        await db.oTTarea.createMany({
          data: data.tareas.map((t: any) => ({
            descripcion: t.descripcion,
            cantidad: parseInt(t.cantidad) || 1,
            estado: t.estado || 'Pendiente',
            otId: id
          }))
        })
      }
    }
    
    // Update personal if provided
    if (data.personalOT !== undefined) {
      await db.oTPersonal.deleteMany({ where: { otId: id } })
      if (data.personalOT.length > 0) {
        await db.oTPersonal.createMany({
          data: data.personalOT.map((p: any) => ({
            nombre: p.nombre,
            tipo: p.tipo || 'Interno',
            cantidad: parseInt(p.cantidad) || 1,
            precioUnit: parseFloat(p.precioUnit) || 0,
            horasTrabajadas: parseFloat(p.horasTrabajadas) || 0,
            total: parseFloat(p.total) || 0,
            cumple: p.cumple || null,
            observaciones: p.observaciones || null,
            otId: id
          }))
        })
      }
    }
    
    return NextResponse.json(orden)
  } catch (error) {
    console.error('Error updating orden:', error)
    return NextResponse.json({ error: 'Error updating orden' }, { status: 500 })
  }
}

// DELETE - Delete orden de trabajo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'ots.eliminar')) {
    return apiError('Sin permisos', 403)
  }
  try {
    const { id } = await params
    
    // Delete related records first
    await db.oTMaterial.deleteMany({ where: { otId: id } })
    await db.oTHerramienta.deleteMany({ where: { otId: id } })
    await db.oTTarea.deleteMany({ where: { otId: id } })
    await db.oTPersonal.deleteMany({ where: { otId: id } })
    await db.oTDocumento.deleteMany({ where: { otId: id } })
    
    await db.ordenTrabajo.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting orden:', error)
    return NextResponse.json({ error: 'Error deleting orden' }, { status: 500 })
  }
}
