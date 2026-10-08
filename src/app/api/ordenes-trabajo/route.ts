import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, hasPermission, decrypt } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'
import { backupOTToDrive } from '@/lib/backup-helpers'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * Auto-migra la tabla OrdenTrabajo agregando columnas faltantes.
 */
async function ensureColumns() {
  const cols: { name: string; type: string }[] = [
    { name: 'driveFolderId', type: 'TEXT' },
    { name: 'origenTipo', type: 'TEXT' },
    { name: 'origenId', type: 'TEXT' },
    { name: 'origenCodigo', type: 'TEXT' },
  ]
  for (const col of cols) {
    try {
      const r = await db.$queryRawUnsafe<[{ exists: boolean }]>(
        `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='OrdenTrabajo' AND column_name='${col.name}')`
      )
      if (!r[0]?.exists) {
        await db.$executeRawUnsafe(
          `ALTER TABLE "OrdenTrabajo" ADD COLUMN "${col.name}" ${col.type}`
        )
        console.log(`[ensureColumns] Columna ${col.name} agregada a OrdenTrabajo`)
      }
    } catch (e) {
      console.warn(`[ensureColumns] Error con ${col.name}:`, e)
    }
  }
  // Índices
  try {
    const r = await db.$queryRawUnsafe<[{ exists: boolean }]>(
      `SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='OrdenTrabajo_driveFolderId_idx')`
    )
    if (!r[0]?.exists) {
      await db.$executeRawUnsafe(`CREATE INDEX "OrdenTrabajo_driveFolderId_idx" ON "OrdenTrabajo"("driveFolderId")`)
      console.log(`[ensureColumns] Índice OrdenTrabajo_driveFolderId_idx creado`)
    }
  } catch (e) {
    console.warn(`[ensureColumns] Error con índice driveFolderId:`, e)
  }
  try {
    const r = await db.$queryRawUnsafe<[{ exists: boolean }]>(
      `SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='OrdenTrabajo_origen_idx')`
    )
    if (!r[0]?.exists) {
      await db.$executeRawUnsafe(`CREATE INDEX "OrdenTrabajo_origen_idx" ON "OrdenTrabajo"("origenTipo","origenId")`)
      console.log(`[ensureColumns] Índice OrdenTrabajo_origen_idx creado`)
    }
  } catch (e) {
    console.warn(`[ensureColumns] Error con índice origen:`, e)
  }
}

/**
 * Valida que un ID de FK exista en la tabla correspondiente.
 * Si no existe, devuelve null (graceful fallback).
 * Esto evita errores de FK constraint cuando se crean OTs desde proyectos
 * que tienen IDs huérfanos (centroCosto eliminado, etc.)
 */
async function validateFK(table: string, id: string | null | undefined): Promise<string | null> {
  if (!id || id === 'none' || id === 'null' || id === 'undefined') return null
  try {
    const result = await db.$queryRawUnsafe<[{ exists: boolean }]>(
      `SELECT EXISTS (SELECT 1 FROM "${table}" WHERE "id" = $1)`,
      id
    )
    return result[0]?.exists ? id : null
  } catch (e) {
    console.warn(`[validateFK] Error validando FK ${table}/${id}:`, e)
    return null // Graceful fallback
  }
}

// GET - List all ordenes de trabajo
// Para rol 'personal': solo devuelve las OT asignadas al trabajador (vía email → Personal.id)
export async function GET(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'ots.ver', session.userPermisos)) {
    return apiError('Sin permisos', 403)
  }
  try {
    // Auto-migrar columnas faltantes (idempotente)
    await ensureColumns()

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const proyectoId = searchParams.get('proyectoId') || ''

    // Para rol personal, buscar el registro de Personal por email y filtrar OT
    let personalFilter: any = undefined
    if (session.user.rol === 'personal') {
      const allPersonal = await db.personal.findMany({ select: { id: true, email: true, nombre: true } })
      const userEmail = session.user.email.toLowerCase()
      const matched = allPersonal.find((p) => {
        if (!p.email) return false
        const dec = decrypt(p.email).toLowerCase()
        return dec === userEmail
      })

      if (matched) {
        personalFilter = {
          OR: [
            { asignadoId: matched.id },
            { personalOT: { some: { nombre: { contains: matched.nombre } } } },
          ],
        }
      } else {
        return NextResponse.json([])
      }
    }

    const where: any = {}
    if (search) {
      where.OR = [
        { otNum: { contains: search } },
        { titulo: { contains: search } },
        { estado: { contains: search } },
      ]
    }
    if (proyectoId) {
      where.proyectoId = proyectoId
    }
    if (personalFilter) {
      if (search) {
        where.AND = [personalFilter]
      } else {
        Object.assign(where, personalFilter)
      }
    }

    const ordenes = await db.ordenTrabajo.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      select: {
        id: true, otNum: true, titulo: true, tipo: true, prioridad: true,
        estado: true, ubicacion: true, fechaInicio: true, fechaLimite: true,
        fechaInicioReal: true, fechaFinReal: true, costoEstimado: true,
        costoReal: true, progreso: true, descripcion: true, tiempoEst: true,
        tiempoReal: true, estadoAprobacion: true, formaPago: true, createdAt: true,
        creadoPorNombre: true,
        propiedad: { select: { id: true, nombre: true } },
        asignado: { select: { id: true, nombre: true, cargo: true } },
        centroCosto: { select: { id: true, codigo: true, nombre: true } },
        _count: {
          select: { materiales: true, herramientas: true, tareas: true, personalOT: true, documentos: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const ordenesWithCC = ordenes.map(ot => ({
      ...ot,
      fotosAntes: [],
      fotosDespues: [],
    }))

    return NextResponse.json(ordenesWithCC)
  } catch (error) {
    console.error('Error fetching ordenes:', error)
    return NextResponse.json({ error: 'Error fetching ordenes' }, { status: 500 })
  }
}

// POST - Create new orden de trabajo (con proteccion contra duplicados)
export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'ots.crear', session.userPermisos)) {
    return apiError('Sin permisos', 403)
  }
  try {
    console.log('[OT POST] Inicio creación de OT')

    // Auto-migrar columnas faltantes (idempotente)
    await ensureColumns()
    console.log('[OT POST] ensureColumns OK')

    const data = await request.json()
    const clientIdempotency = data._clientIdempotency || null
    console.log(`[OT POST] Datos recibidos - titulo: "${(data.titulo || '').substring(0, 50)}", centroCostoId: ${data.centroCostoId || 'null'}`)

    // ─── PROTECCION CONTRA DUPLICADOS (1): Token de idempotencia del cliente ───
    if (clientIdempotency) {
      const existing = await db.ordenTrabajo.findFirst({
        where: { notas: { contains: clientIdempotency } },
        select: { id: true, otNum: true, titulo: true },
      })
      if (existing) {
        console.log(`[OT Dedup] Solicitud duplicada (${clientIdempotency}), retornando: ${existing.otNum}`)
        return NextResponse.json({ ...existing, _duplicate: true, _message: 'OT ya creada previamente' })
      }
    }

    // ─── PROTECCION CONTRA DUPLICADOS (2): Mismo titulo + mismo usuario en 60 seg ───
    const titulo = (data.titulo || '').trim()
    if (titulo) {
      const sixtySecondsAgo = new Date(Date.now() - 60_000)
      const recentDuplicate = await db.ordenTrabajo.findFirst({
        where: {
          titulo,
          creadoPor: session.user.id,
          createdAt: { gte: sixtySecondsAgo },
        },
        select: { id: true, otNum: true, titulo: true, createdAt: true },
      })
      if (recentDuplicate) {
        console.log(`[OT Dedup] Duplicado temporal (titulo="${titulo}" por ${session.user.id}), retornando: ${recentDuplicate.otNum}`)
        return NextResponse.json({ ...recentDuplicate, _duplicate: true, _message: 'OT ya creada en los ultimos segundos' })
      }
    }

    // ─── CORRELATIVO SEGURO (con retry contra race conditions) ───
    const { generarCorrelativoDB } = await import('@/lib/utils')
    let nextNum: string | undefined
    let retries = 0
    const maxRetries = 3
    while (retries < maxRetries) {
      try {
        nextNum = await generarCorrelativoDB(db, 'OrdenTrabajo', 'OT', 4)
        const exists = await db.ordenTrabajo.findFirst({ where: { otNum: nextNum }, select: { id: true } })
        if (!exists) break
        console.log(`[OT] Correlativo ${nextNum} ya existe, reintentando (${retries + 1}/${maxRetries})`)
        retries++
      } catch (err) {
        console.error(`[OT] Error generando correlativo (intento ${retries + 1}):`, err)
        retries++
      }
    }
    if (!nextNum) {
      return apiError('Error al generar numero de OT despues de varios intentos', 500)
    }
    console.log(`[OT POST] Correlativo generado: ${nextNum}`)

    // Extract resources from data
    const { materiales, herramientas, tareas, personalOT, centroCostoId, origenTipo, origenId, origenCodigo, _clientIdempotency: _idem, ...otData } = data

    // ─── VALIDAR FKs: Asegurar que los IDs referenciados existan en la BD ───
    // Si un ID no existe (ej: centroCostoMaster eliminado), se setea a null en vez de fallar
    const validatedCentroCostoId = await validateFK('CentroCostoMaster', centroCostoId)
    const validatedPropiedadId = await validateFK('Propiedad', otData.propiedadId)
    const validatedAsignadoId = await validateFK('Personal', otData.asignadoId)
    const validatedActivoId = await validateFK('Activo', otData.activoId)

    if (centroCostoId && !validatedCentroCostoId) {
      console.warn(`[OT POST] centroCostoId "${centroCostoId}" no existe en CentroCostoMaster, seteando a null`)
    }
    if (otData.propiedadId && !validatedPropiedadId) {
      console.warn(`[OT POST] propiedadId "${otData.propiedadId}" no existe en Propiedad, seteando a null`)
    }
    if (otData.asignadoId && !validatedAsignadoId) {
      console.warn(`[OT POST] asignadoId "${otData.asignadoId}" no existe en Personal, seteando a null`)
    }
    if (otData.activoId && !validatedActivoId) {
      console.warn(`[OT POST] activoId "${otData.activoId}" no existe en Activo, seteando a null`)
    }
    console.log('[OT POST] FKs validados OK')

    // Notas con token de idempotencia (invisible al usuario)
    const notasBase = otData.notas || ''
    const notasFinal = clientIdempotency
      ? `[IDEM:${clientIdempotency}]${notasBase ? ' ' + notasBase : ''}`
      : notasBase || null

    // Build create data with validated FKs
    const createData = {
      otNum: nextNum,
      titulo: titulo || 'Sin título',
      tipo: otData.tipo || 'Correctivo',
      prioridad: otData.prioridad || 'Media',
      estado: otData.estado || 'Pendiente',
      ubicacion: otData.ubicacion || null,
      fechaInicio: otData.fechaInicio || null,
      fechaLimite: otData.fechaLimite || null,
      fechaInicioReal: otData.fechaInicioReal || null,
      fechaFinReal: otData.fechaFinReal || null,
      costoEstimado: parseFloat(otData.costoEstimado) || 0,
      costoReal: parseFloat(otData.costoReal) || 0,
      progreso: parseInt(otData.progreso) || 0,
      descripcion: otData.descripcion || null,
      tiempoEst: parseInt(otData.tiempoEst) || 0,
      tiempoReal: parseInt(otData.tiempoReal) || 0,
      valorHora: parseFloat(otData.valorHora) || 0,
      notas: notasFinal,
      propiedadId: validatedPropiedadId,
      asignadoId: validatedAsignadoId,
      activoId: validatedActivoId,
      centroCostoId: validatedCentroCostoId,
      esRecurrente: otData.esRecurrente || false,
      formaPago: otData.formaPago || null,
      creadoPor: session.user.id,
      creadoPorNombre: session.user.nombre || session.user.email,
      fotosAntes: otData.fotosAntes && otData.fotosAntes.length > 0 ? JSON.stringify(otData.fotosAntes) : null,
      fotosDespues: otData.fotosDespues && otData.fotosDespues.length > 0 ? JSON.stringify(otData.fotosDespues) : null,
      materiales: materiales && materiales.length > 0 ? {
        create: materiales.map((m: any) => ({
          descripcion: m.descripcion || 'Sin descripción',
          cantidad: parseFloat(m.cantidad) || 1,
          unidad: m.unidad || 'unidad',
          precioUnit: parseFloat(m.precioUnit) || 0,
          total: parseFloat(m.total) || 0,
        }))
      } : undefined,
      herramientas: herramientas && herramientas.length > 0 ? {
        create: herramientas.map((h: any) => ({
          nombre: h.nombre || 'Sin nombre',
          cantidad: parseInt(h.cantidad) || 1,
        }))
      } : undefined,
      tareas: tareas && tareas.length > 0 ? {
        create: tareas.map((t: any) => ({
          descripcion: t.descripcion || 'Sin descripción',
          cantidad: parseInt(t.cantidad) || 1,
          estado: t.estado || 'Pendiente',
          ok: t.ok === true,
          noOk: t.noOk === true,
          na: t.na === true,
        }))
      } : undefined,
      personalOT: personalOT && personalOT.length > 0 ? {
        create: personalOT.map((p: any) => ({
          nombre: p.nombre || 'Sin nombre',
          tipo: p.tipo || 'Interno',
          cantidad: parseInt(p.cantidad) || 1,
          precioUnit: parseFloat(p.precioUnit) || 0,
          horasTrabajadas: parseFloat(p.horasTrabajadas) || 0,
          total: parseFloat(p.total) || 0,
          cumple: p.cumple || null,
          observaciones: p.observaciones || null,
        }))
      } : undefined,
    }

    console.log(`[OT POST] Creando OT ${nextNum} con centroCostoId=${validatedCentroCostoId}, propiedadId=${validatedPropiedadId}, asignadoId=${validatedAsignadoId}`)

    const orden = await db.ordenTrabajo.create({
      data: createData,
      include: {
        propiedad: true, asignado: true, centroCosto: true,
        materiales: true, herramientas: true, tareas: true, personalOT: true,
      }
    })

    console.log(`[OT POST] OT ${orden.otNum} creada exitosamente (id: ${orden.id})`)

    // After successful creation, try to set origen fields via UPDATE (graceful migration)
    if (origenTipo || origenId || origenCodigo) {
      try {
        await db.$executeRawUnsafe(
          `UPDATE "OrdenTrabajo" SET "origenTipo" = $1, "origenId" = $2, "origenCodigo" = $3 WHERE "id" = $4`,
          origenTipo || null, origenId || null, origenCodigo || null, orden.id
        )
        console.log(`[OT POST] Campos de origen seteados: tipo=${origenTipo}, id=${origenId}, codigo=${origenCodigo}`)
      } catch (origenErr: any) {
        // Column might not exist yet — ensureColumns should have added it,
        // but if not, this is non-critical and the OT was already created
        console.warn(`[OT POST] No se pudieron setear campos de origen: ${origenErr?.message || origenErr}`)
      }
    }

    // ─── Actualizar proyecto con la OT vinculada ───
    if (origenTipo === 'Proyecto' && origenId) {
      try {
        const proyecto = await db.proyecto.findUnique({
          where: { id: origenId },
          select: { otsVinculadas: true },
        })
        if (proyecto) {
          const existing: any[] = proyecto.otsVinculadas ? JSON.parse(proyecto.otsVinculadas) : []
          // Evitar duplicados
          if (!existing.find((o: any) => o.id === orden.id)) {
            existing.push({
              id: orden.id,
              otNum: orden.otNum,
              titulo: orden.titulo,
              estado: orden.estado,
              createdAt: new Date().toISOString(),
            })
            await db.$executeRawUnsafe(
              `UPDATE "Proyecto" SET "otsVinculadas" = $1 WHERE "id" = $2`,
              JSON.stringify(existing), origenId
            )
            console.log(`[OT POST] Proyecto ${origenCodigo} actualizado con OT ${orden.otNum}`)
          }
        }
      } catch (proyErr: any) {
        // Non-critical: la OT ya fue creada, esto es solo vinculación
        console.warn(`[OT POST] No se pudo actualizar proyecto con OT vinculada: ${proyErr?.message || proyErr}`)
      }
    }

    console.log(`[OT] Creada ${orden.otNum} por ${session.user.email} (${orden.id})`)

    // ─── Backup a Google Drive (fire-and-forget) ───
    void backupOTToDrive(orden.id)

    return NextResponse.json(orden)
  } catch (error: any) {
    console.error('[OT POST] Error creating orden:', error)
    // Build a comprehensive error message
    const errMsg = error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : (error?.message || error?.meta?.message || JSON.stringify(error, Object.getOwnPropertyNames(error), 2))

    // Detect specific error types for user-friendly messages
    if (errMsg.includes('Unique') && errMsg.includes('otNum')) {
      return NextResponse.json({
        error: 'Error de concurrencia: numero de OT duplicado. Intente nuevamente.',
        details: errMsg
      }, { status: 409 })
    }

    // FK constraint violation
    if (errMsg.includes('foreign key') || errMsg.includes('ForeignKeyConstraint') || errMsg.includes('violates foreign key constraint')) {
      const match = errMsg.match(/Key \((\w+)\)=\(([^)]+)\)/)
      const field = match ? match[1] : 'desconocido'
      const value = match ? match[2] : '?'
      return NextResponse.json({
        error: `Error de referencia: el campo "${field}" con valor "${value}" no existe en la base de datos.`,
        details: errMsg
      }, { status: 400 })
    }

    // Prisma validation error
    if (errMsg.includes('PrismaClientValidationError') || errMsg.includes('Unknown arg')) {
      return NextResponse.json({
        error: 'Error de validación en los datos enviados. Verifique los campos.',
        details: errMsg
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Error creating orden',
      details: errMsg,
      errorType: error?.constructor?.name || typeof error,
    }, { status: 500 })
  }
}
