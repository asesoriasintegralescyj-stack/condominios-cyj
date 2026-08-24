import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'
import { backupOTToDrive } from '@/lib/backup-helpers'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// GET - Get orden de trabajo by ID
// Query params:
//   ?fotos=true  → incluye fotosAntes/fotosDespues (puede ser MUY grande, ~1MB+)
//   sin ?fotos   → devuelve solo conteo de fotos (fotosAntesCount, fotosDespuesCount)
// Esto evita colapsar el navegador al abrir OTs con muchas fotos
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'ots.ver', session.userPermisos)) {
    return apiError('Sin permisos', 403)
  }
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const incluirFotos = searchParams.get('fotos') === 'true'

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

    // Helper para parsear fotos de forma segura (maneja JSON malformado)
    const safeParseFotos = (str: string | null): string[] => {
      if (!str) return []
      try {
        const parsed = JSON.parse(str)
        if (Array.isArray(parsed)) return parsed
        if (parsed && typeof parsed === 'object') return Object.values(parsed) as string[]
        return []
      } catch {
        // Si JSON.parse falla, intentar extraer URLs data:image/... con regex
        const matches = str.match(/"?(data:image\/[^"]+)"?/g)
        if (matches) return matches.map(m => m.replace(/^"|"$/g, ''))
        return []
      }
    }

    if (incluirFotos) {
      // Devolver fotos completas (para vista de detalle con fotos)
      const ordenWithPhotos = {
        ...orden,
        fotosAntes: safeParseFotos(orden.fotosAntes),
        fotosDespues: safeParseFotos(orden.fotosDespues),
      }
      return NextResponse.json(ordenWithPhotos)
    } else {
      // NO devolver fotos — solo conteo (evita payloads de varios MB)
      const fotosAntes = safeParseFotos(orden.fotosAntes)
      const fotosDespues = safeParseFotos(orden.fotosDespues)
      const { fotosAntes: _fa, fotosDespues: _fd, ...ordenSinFotos } = orden
      const ordenLight = {
        ...ordenSinFotos,
        fotosAntesCount: fotosAntes.length,
        fotosDespuesCount: fotosDespues.length,
        // Mantener arrays vacíos para compatibilidad con el frontend
        fotosAntes: [] as string[],
        fotosDespues: [] as string[],
      }
      return NextResponse.json(ordenLight)
    }
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
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'ots.editar', session.userPermisos)) {
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
    // IMPORTANTE: Las fotos se manejan así:
    // - Si el frontend envía fotosAntes/fotosDespues NO vacíos → se actualizan
    // - Si el frontend envía arrays vacíos → NO se tocan (se preservan las existentes)
    //   (porque el frontend las carga bajo demanda con ?fotos=true)
    // - Si el frontend envía null explícito → se borran
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
    }

    // Solo actualizar fotos si el frontend las envía con contenido
    // (no vacías) o si explícitamente las quiere borrar (null)
    if (data.fotosAntes !== undefined) {
      if (Array.isArray(data.fotosAntes) && data.fotosAntes.length > 0) {
        updateData.fotosAntes = JSON.stringify(data.fotosAntes)
      } else if (data.fotosAntes === null) {
        updateData.fotosAntes = null
      }
      // Si data.fotosAntes es [] (array vacío), NO se incluye en updateData
      // → se preservan las fotos existentes
    }
    if (data.fotosDespues !== undefined) {
      if (Array.isArray(data.fotosDespues) && data.fotosDespues.length > 0) {
        updateData.fotosDespues = JSON.stringify(data.fotosDespues)
      } else if (data.fotosDespues === null) {
        updateData.fotosDespues = null
      }
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
    // Aumentar timeout a 30s porque la transacción incluye update + deleteMany + createMany
    // para materiales, herramientas, tareas y personalOT. El default de 5s es insuficiente.
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
    }, {
      timeout: 30000,  // 30 segundos (default es 5s)
      maxWait: 35000,  // esperar hasta 35s para conseguir una conexión
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

    // ─── Backup actualización OT a Google Drive (fire-and-forget) ───
    void backupOTToDrive(id)

    return NextResponse.json(orden)
  } catch (error: any) {
    console.error('Error updating orden:', error)
    // Devolver el error real para debugging
    const errMsg = error?.message || 'Error al actualizar OT'
    const errCode = error?.code || ''
    const errDetail = error?.meta ? JSON.stringify(error.meta) : ''
    return NextResponse.json(
      { error: errMsg, code: errCode, detail: errDetail },
      { status: 500 }
    )
  }
}

// DELETE - Delete orden de trabajo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'ots.eliminar', session.userPermisos)) {
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

