import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'
import { apiError, handlePrismaError } from '@/lib/api-helpers'

// Tipos para los recursos relacionados
type MaterialInput = { descripcion: string; cantidad: number; unidad: string; precioUnit: number; total: number; linkCompra?: string }
type HerramientaInput = { nombre: string; cantidad: number }
type TareaInput = { descripcion: string; cantidad: number; estado: string }
type PersonalInput = { nombre: string; tipo: string; cantidad: number; precioUnit: number; total: number }
type DocumentoInput = { nombre: string; tipo: string; descripcion: string; archivo: string; fechaDoc: string }

// Serializa arrays/objetos a JSON string si no lo están
function serializeJSON(value: any): string | null {
  if (value === undefined || value === null) return null
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return null
  }
}

// GET - Get proyecto by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'proyectos.ver')) {
    return apiError('Sin permisos', 403)
  }
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
      },
    })

    if (!proyecto) {
      return apiError('Proyecto no encontrado', 404)
    }

    // Para la vista detalle, devolvemos TODOS los campos incluyendo fotos y cotizaciones en base64
    return NextResponse.json(proyecto)
  } catch (error) {
    console.error('Error fetching proyecto:', error)
    return handlePrismaError(error)
  }
}

// PUT - Update proyecto
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'proyectos.editar')) {
    return apiError('Sin permisos', 403)
  }
  try {
    const { id } = await params
    const data = await request.json()

    // Capturar estado anterior para detectar cambios de etapa
    const proyectoAnterior = await db.proyecto.findUnique({
      where: { id },
      select: { estadoAprobacion: true, codigo: true, nombre: true, prioridad: true },
    })

    if (!proyectoAnterior) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    // Extract resources from data
    const {
      materiales,
      herramientas,
      tareas,
      personal,
      documentos,
      ...proyectoData
    } = data

    // Update proyecto basic data + nuevos campos
    // Usar patrón: solo actualizar si el campo viene en el request (undefined = no tocar)
    await db.proyecto.update({
      where: { id },
      data: {
        codigo: proyectoData.codigo === undefined ? undefined : (proyectoData.codigo || null),
        nombre: proyectoData.nombre === undefined ? undefined : proyectoData.nombre,
        categoria: proyectoData.categoria === undefined ? undefined : proyectoData.categoria,
        estado: proyectoData.estado === undefined ? undefined : proyectoData.estado,
        ubicacion: proyectoData.ubicacion === undefined ? undefined : (proyectoData.ubicacion || null),
        fechaInicio: proyectoData.fechaInicio === undefined ? undefined : (proyectoData.fechaInicio || null),
        fechaFin: proyectoData.fechaFin === undefined ? undefined : (proyectoData.fechaFin || null),
        presProg: proyectoData.presProg === undefined ? undefined : (parseFloat(proyectoData.presProg) || 0),
        presUsado: proyectoData.presUsado === undefined ? undefined : (parseFloat(proyectoData.presUsado) || 0),
        avance: proyectoData.avance === undefined ? undefined : (parseInt(proyectoData.avance) || 0),
        descripcion: proyectoData.descripcion === undefined ? undefined : (proyectoData.descripcion || null),
        notas: proyectoData.notas === undefined ? undefined : (proyectoData.notas || null),

        // Nuevos campos
        sector: proyectoData.sector === undefined ? undefined : (proyectoData.sector || null),
        tipoReparacion: proyectoData.tipoReparacion === undefined ? undefined : (proyectoData.tipoReparacion || null),
        tipoTrabajo: proyectoData.tipoTrabajo === undefined ? undefined : (proyectoData.tipoTrabajo || null),
        prioridad: proyectoData.prioridad === undefined ? undefined : (proyectoData.prioridad || null),
        estadoAprobacion: proyectoData.estadoAprobacion === undefined ? undefined : (proyectoData.estadoAprobacion || null),
        responsable: proyectoData.responsable === undefined ? undefined : (proyectoData.responsable || null),
        responsableExterno: proyectoData.responsableExterno === undefined ? undefined : (proyectoData.responsableExterno || null),
        tiempoEstimado: proyectoData.tiempoEstimado === undefined ? undefined : (proyectoData.tiempoEstimado || null),
        monto: proyectoData.monto === undefined ? undefined : (parseFloat(proyectoData.monto) || 0),
        fechaInicioReal: proyectoData.fechaInicioReal === undefined ? undefined : (proyectoData.fechaInicioReal || null),
        fechaFinReal: proyectoData.fechaFinReal === undefined ? undefined : (proyectoData.fechaFinReal || null),
        comentarios: proyectoData.comentarios === undefined ? undefined : (proyectoData.comentarios || null),
        centroCostoId: proyectoData.centroCostoId === undefined ? undefined : (proyectoData.centroCostoId || null),

        fotosAntes: proyectoData.fotosAntes === undefined ? undefined : serializeJSON(proyectoData.fotosAntes),
        fotosDespues: proyectoData.fotosDespues === undefined ? undefined : serializeJSON(proyectoData.fotosDespues),
        cotizaciones: proyectoData.cotizaciones === undefined ? undefined : serializeJSON(proyectoData.cotizaciones),
      },
    })

    // Update materials if provided
    if (materiales !== undefined) {
      await db.proyectoMaterial.deleteMany({ where: { proyectoId: id } })
      if (materiales.length > 0) {
        await db.proyectoMaterial.createMany({
          data: materiales.map((m: MaterialInput) => ({
            proyectoId: id,
            descripcion: m.descripcion,
            cantidad: parseFloat(String(m.cantidad)) || 1,
            unidad: m.unidad || 'unidad',
            precioUnit: parseFloat(String(m.precioUnit)) || 0,
            total: parseFloat(String(m.total)) || 0,
            linkCompra: m.linkCompra || null,
            materialId: (m as any).materialId || null,
            mejorPrecio: (m as any).mejorPrecio || null,
            mejorTienda: (m as any).mejorTienda || null,
            mejorUrl: (m as any).mejorUrl || null,
          })),
        })
      }
    }

    // Update herramientas if provided
    if (herramientas !== undefined) {
      await db.proyectoHerramienta.deleteMany({ where: { proyectoId: id } })
      if (herramientas.length > 0) {
        await db.proyectoHerramienta.createMany({
          data: herramientas.map((h: HerramientaInput) => ({
            proyectoId: id,
            nombre: h.nombre,
            cantidad: parseInt(String(h.cantidad)) || 1,
          })),
        })
      }
    }

    // Update tareas if provided
    if (tareas !== undefined) {
      await db.proyectoTarea.deleteMany({ where: { proyectoId: id } })
      if (tareas.length > 0) {
        await db.proyectoTarea.createMany({
          data: tareas.map((t: TareaInput) => ({
            proyectoId: id,
            descripcion: t.descripcion,
            cantidad: parseInt(String(t.cantidad)) || 1,
            estado: t.estado || 'Pendiente',
          })),
        })
      }
    }

    // Update personal if provided
    if (personal !== undefined) {
      await db.proyectoPersonal.deleteMany({ where: { proyectoId: id } })
      if (personal.length > 0) {
        await db.proyectoPersonal.createMany({
          data: personal.map((p: PersonalInput) => ({
            proyectoId: id,
            nombre: p.nombre,
            tipo: p.tipo || 'Interno',
            cantidad: parseInt(String(p.cantidad)) || 1,
            precioUnit: parseFloat(String(p.precioUnit)) || 0,
            total: parseFloat(String(p.total)) || 0,
          })),
        })
      }
    }

    // Update documentos if provided
    if (documentos !== undefined) {
      await db.proyectoDocumento.deleteMany({ where: { proyectoId: id } })
      if (documentos.length > 0) {
        await db.proyectoDocumento.createMany({
          data: documentos.map((d: DocumentoInput) => ({
            proyectoId: id,
            nombre: d.nombre,
            tipo: d.tipo || 'cotizacion',
            descripcion: d.descripcion || null,
            archivo: d.archivo,
            fechaDoc: d.fechaDoc || null,
          })),
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
      },
    })

    // ===== Generar Solicitud de Compra automática cuando la etapa del proyecto
    // pasa a "Completado" y tiene materiales vinculados =====
    const etapaAnterior = proyectoAnterior?.estadoAprobacion
    const nuevaEtapa = proyectoData.estadoAprobacion

    if (
      nuevaEtapa === 'Completado' &&
      etapaAnterior !== 'Completado' &&
      updatedProyecto &&
      updatedProyecto.materiales.length > 0
    ) {
      try {
        // Verificar si ya existe una SC para este proyecto
        const scExistente = await db.solicitudCompra.findFirst({
          where: {
            origenTipo: 'Proyecto',
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
          const materialesJSON = updatedProyecto.materiales.map(m => ({
            nombre: m.descripcion,
            cantidad: m.cantidad,
            unidad: m.unidad,
            precioEstimado: m.precioUnit,
            total: m.total,
            mejorPrecio: m.mejorPrecio,
            mejorTienda: m.mejorTienda,
            mejorUrl: m.mejorUrl,
            linkCompra: m.linkCompra,
          }))

          const totalEstimado = updatedProyecto.materiales.reduce(
            (sum, m) => sum + (m.total || 0),
            0
          )

          await db.solicitudCompra.create({
            data: {
              codigo: nuevoCodigo,
              titulo: `Materiales para ${updatedProyecto.nombre || 'Proyecto ' + (updatedProyecto.codigo || '')}`,
              descripcion: `Solicitud generada automáticamente desde el Proyecto ${updatedProyecto.codigo || ''} al completar su etapa de presupuesto.`,
              estado: 'Solicitado',
              prioridad: updatedProyecto.prioridad || 'Media',
              origenTipo: 'Proyecto',
              origenId: id,
              origenCodigo: updatedProyecto.codigo || '',
              materiales: JSON.stringify(materialesJSON),
              totalEstimado,
              solicitadoPor: session.user.nombre + ' ' + (session.user.apellido || ''),
              solicitadoPorId: session.user.id,
              etapaAprobacion: 'Pendiente Supervisor',
            },
          })

          console.log(`SC automática creada: ${nuevoCodigo} para Proyecto ${updatedProyecto.codigo}`)
        }
      } catch (scError) {
        console.error('Error creando SC automática desde proyecto (no crítico):', scError)
      }
    }

    return NextResponse.json(updatedProyecto)
  } catch (error) {
    console.error('Error updating proyecto:', error)
    return handlePrismaError(error)
  }
}

// DELETE - Delete proyecto
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'proyectos.eliminar')) {
    return apiError('Sin permisos', 403)
  }
  try {
    const { id } = await params

    await db.proyectoMaterial.deleteMany({ where: { proyectoId: id } })
    await db.proyectoHerramienta.deleteMany({ where: { proyectoId: id } })
    await db.proyectoTarea.deleteMany({ where: { proyectoId: id } })
    await db.proyectoPersonal.deleteMany({ where: { proyectoId: id } })
    await db.proyectoDocumento.deleteMany({ where: { proyectoId: id } })

    await db.proyecto.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting proyecto:', error)
    return handlePrismaError(error)
  }
}
