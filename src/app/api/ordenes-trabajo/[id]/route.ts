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
    
    // Get current OT to check state change (include fields needed for time tracking)
    const currentOT = await db.ordenTrabajo.findUnique({
      where: { id },
      select: {
        estado: true,
        estadoAprobacion: true,
        fechaInicioReal: true,
        fechaInicio: true,
        progreso: true,
      }
    })

    if (!currentOT) {
      return apiError('OT no encontrada', 404)
    }
    
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

    // ===== Automatic time tracking =====
    const ahora = new Date()
    const ahoraStr = ahora.toISOString()

    // Si el estado cambia a "En Progreso" y no tiene fechaInicioReal, setearla
    if (data.estado === 'En Progreso' && !currentOT.fechaInicioReal && !data.fechaInicioReal) {
      updateData.fechaInicioReal = ahoraStr
    }

    // Si el estado cambia a "Completado", setear fechaFinReal y calcular tiempoReal
    if (data.estado === 'Completado' && currentOT.estado !== 'Completado') {
      updateData.fechaFinReal = ahoraStr
      // Calcular tiempo real en minutos
      const inicio = currentOT.fechaInicioReal
        ? new Date(currentOT.fechaInicioReal)
        : (currentOT.fechaInicio ? new Date(currentOT.fechaInicio) : null)
      if (inicio) {
        const diffMs = ahora.getTime() - inicio.getTime()
        updateData.tiempoReal = Math.round(diffMs / (1000 * 60)) // minutos
      }
      updateData.progreso = 100
    }

    // Si se setea progreso manualmente y llega a 100, marcar como Completado
    if (
      data.progreso === 100 &&
      currentOT.progreso < 100 &&
      data.estado !== 'Completado'
    ) {
      updateData.estado = 'Completado'
      updateData.fechaFinReal = ahoraStr
      const inicio = currentOT.fechaInicioReal
        ? new Date(currentOT.fechaInicioReal)
        : (currentOT.fechaInicio ? new Date(currentOT.fechaInicio) : null)
      if (inicio) {
        const diffMs = ahora.getTime() - inicio.getTime()
        updateData.tiempoReal = Math.round(diffMs / (1000 * 60))
      }
    }
    // ===== End automatic time tracking =====
    
    // Si el estado cambia a Completado y no tiene estadoAprobacion, establecerlo como Pendiente
    if (data.estado === 'Completado' && currentOT?.estado !== 'Completado') {
      if (!currentOT?.estadoAprobacion || currentOT.estadoAprobacion === 'Pendiente') {
        updateData.estadoAprobacion = 'Pendiente'
        updateData.fechaSolicitudAprob = new Date().toISOString()
      }
    }
    
    // Update main OT and all related records in a single transaction
    const orden = await db.$transaction(async (tx) => {
      const updated = await tx.ordenTrabajo.update({
        where: { id },
        data: updateData
      })

      // Update materials if provided
      if (data.materiales !== undefined) {
        await tx.oTMaterial.deleteMany({ where: { otId: id } })
        if (data.materiales.length > 0) {
          await tx.oTMaterial.createMany({
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
        await tx.oTHerramienta.deleteMany({ where: { otId: id } })
        if (data.herramientas.length > 0) {
          await tx.oTHerramienta.createMany({
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
        await tx.oTTarea.deleteMany({ where: { otId: id } })
        if (data.tareas.length > 0) {
          await tx.oTTarea.createMany({
            data: data.tareas.map((t: any) => ({
              descripcion: t.descripcion,
              cantidad: parseInt(t.cantidad) || 1,
              estado: t.estado || 'Pendiente',
              // Checklist de verificación (LV del PMI): OK / NO OK / N/A
              ok: t.ok === true,
              noOk: t.noOk === true,
              na: t.na === true,
              otId: id
            }))
          })
        }
      }

      // Update personal if provided
      if (data.personalOT !== undefined) {
        await tx.oTPersonal.deleteMany({ where: { otId: id } })
        if (data.personalOT.length > 0) {
          await tx.oTPersonal.createMany({
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

      // Devolver la OT actualizada con todas sus relaciones
      const updatedWithRelations = await tx.ordenTrabajo.findUnique({
        where: { id },
        include: {
          propiedad: true,
          asignado: true,
          materiales: true,
          herramientas: true,
          tareas: true,
          personalOT: true,
        }
      })
      return updatedWithRelations
    })

    // ===== Generar Solicitud de Compra automática al aprobar la OT =====
    // Si el estadoAprobacion pasó a "Aprobada" y la OT tiene materiales,
    // crear una SC con origen "OT" y los materiales de la OT.
    const estadoAprobacionAnterior = currentOT?.estadoAprobacion
    const nuevoEstadoAprobacion = updateData.estadoAprobacion

    if (
      nuevoEstadoAprobacion === 'Aprobada' &&
      estadoAprobacionAnterior !== 'Aprobada' &&
      (session.user.rol === 'admin' || session.user.rol === 'supervisor')
    ) {
      try {
        // Obtener la OT actualizada con sus materiales
        const otConMateriales = await db.ordenTrabajo.findUnique({
          where: { id },
          include: { materiales: true },
        })

        if (otConMateriales && otConMateriales.materiales.length > 0) {
          // Verificar si ya existe una SC para esta OT
          const scExistente = await db.solicitudCompra.findFirst({
            where: {
              origenTipo: 'OT',
              origenId: id,
            },
          })

          if (!scExistente) {
            // Generar código SC-XXXX
            const ultimaSC = await db.solicitudCompra.findFirst({
              orderBy: { createdAt: 'desc' },
            })
            let nuevoNum = 1
            if (ultimaSC?.codigo) {
              const match = ultimaSC.codigo.match(/SC-(\d+)/)
              if (match) nuevoNum = parseInt(match[1]) + 1
            }
            const nuevoCodigo = `SC-${String(nuevoNum).padStart(4, '0')}`

            // Construir array de materiales para la SC
            const materialesJSON = otConMateriales.materiales.map(m => ({
              nombre: m.descripcion,
              cantidad: m.cantidad,
              unidad: m.unidad,
              precioEstimado: m.precioUnit,
              total: m.total,
              mejorPrecio: m.mejorPrecio,
              mejorTienda: m.mejorTienda,
              mejorUrl: m.mejorUrl,
            }))

            const totalEstimado = otConMateriales.materiales.reduce(
              (sum, m) => sum + (m.total || 0),
              0
            )

            await db.solicitudCompra.create({
              data: {
                codigo: nuevoCodigo,
                titulo: `Materiales para ${otConMateriales.titulo || 'OT ' + otConMateriales.otNum}`,
                descripcion: `Solicitud generada automáticamente desde la OT ${otConMateriales.otNum} al ser aprobada.`,
                estado: 'Solicitado',
                prioridad: otConMateriales.prioridad || 'Media',
                origenTipo: 'OT',
                origenId: id,
                origenCodigo: otConMateriales.otNum,
                materiales: JSON.stringify(materialesJSON),
                totalEstimado,
                solicitadoPor: session.user.nombre + ' ' + (session.user.apellido || ''),
                solicitadoPorId: session.user.id,
                etapaAprobacion: 'Pendiente Supervisor',
              },
            })

            console.log(`SC automática creada: ${nuevoCodigo} para OT ${otConMateriales.otNum}`)
          }
        }
      } catch (scError) {
        // Si falla la creación de la SC, no afectar la actualización de la OT
        console.error('Error creando SC automática (no crítico):', scError)
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
