import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, hasPermission, decrypt } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'
import { backupOTToDrive } from '@/lib/backup-helpers'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * Auto-migra la tabla OrdenTrabajo agregando columnas faltantes.
 * Incluye: driveFolderId, origenTipo, origenId, origenCodigo, proyectoId,
 * y columnas de aprobación de supervisor (etapaAprobacionSupervisor, etc.)
 */
async function ensureColumns() {
  const cols: { name: string; type: string }[] = [
    { name: 'driveFolderId', type: 'TEXT' },
    { name: 'origenTipo', type: 'TEXT' },
    { name: 'origenId', type: 'TEXT' },
    { name: 'origenCodigo', type: 'TEXT' },
    { name: 'proyectoId', type: 'TEXT' },
    { name: 'etapaAprobacionSupervisor', type: 'TEXT' },
    { name: 'supervisorAprobadorId', type: 'TEXT' },
    { name: 'supervisorAprobadorNombre', type: 'TEXT' },
    { name: 'supervisorFechaAprobacion', type: 'TEXT' },
    { name: 'supervisorObservaciones', type: 'TEXT' },
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
    }
  } catch (e) { /* ignore */ }
  try {
    const r = await db.$queryRawUnsafe<[{ exists: boolean }]>(
      `SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='OrdenTrabajo_origen_idx')`
    )
    if (!r[0]?.exists) {
      await db.$executeRawUnsafe(`CREATE INDEX "OrdenTrabajo_origen_idx" ON "OrdenTrabajo"("origenTipo","origenId")`)
    }
  } catch (e) { /* ignore */ }
  try {
    const fkExists = await db.$queryRawUnsafe<[{ exists: boolean }]>(
      `SELECT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='OrdenTrabajo_proyectoId_fkey' AND table_name='OrdenTrabajo')`
    )
    if (!fkExists[0]?.exists) {
      await db.$executeRawUnsafe(
        `ALTER TABLE "OrdenTrabajo" ADD CONSTRAINT "OrdenTrabajo_proyectoId_fkey" FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") ON DELETE SET NULL`
      )
      console.log(`[ensureColumns] FK OrdenTrabajo_proyectoId_fkey creada`)
    }
  } catch (e) { /* ignore - FK may already exist or proyectoId may not exist yet */ }
  try {
    const idxExists = await db.$queryRawUnsafe<[{ exists: boolean }]>(
      `SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='OrdenTrabajo_proyectoId_idx')`
    )
    if (!idxExists[0]?.exists) {
      await db.$executeRawUnsafe(`CREATE INDEX "OrdenTrabajo_proyectoId_idx" ON "OrdenTrabajo"("proyectoId")`)
    }
  } catch (e) { /* ignore */ }
  // Backfill
  try {
    await db.$executeRawUnsafe(
      `UPDATE "OrdenTrabajo" SET "proyectoId" = "origenId" WHERE "origenTipo" = 'Proyecto' AND "origenId" IS NOT NULL AND "proyectoId" IS NULL`
    )
  } catch (e) { /* ignore */ }
}

/**
 * Valida que un ID de FK exista en la tabla correspondiente.
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
    return null
  }
}

/**
 * Detecta qué columnas opcionales existen realmente en la tabla OrdenTrabajo.
 * Esto permite construir queries SQL dinámicos que no fallen si faltan columnas.
 */
async function detectExistingColumns(): Promise<Set<string>> {
  try {
    const rows = await db.$queryRawUnsafe<{ column_name: string }[]>(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'OrdenTrabajo'`
    )
    return new Set(rows.map(r => r.column_name))
  } catch (e) {
    console.warn('[detectExistingColumns] Error:', e)
    // Fallback: asumir columnas base del schema original
    return new Set([
      'id', 'otNum', 'titulo', 'tipo', 'prioridad', 'estado', 'ubicacion',
      'fechaInicio', 'fechaLimite', 'fechaInicioReal', 'fechaFinReal',
      'costoEstimado', 'costoReal', 'progreso', 'descripcion', 'tiempoEst',
      'tiempoReal', 'valorHora', 'notas', 'esRecurrente', 'tareaOrigenId',
      'proximaEjecucion', 'formaPago', 'estadoAprobacion', 'fechaSolicitudAprob',
      'fechaAprobacion', 'aprobadoPor', 'observacionesAprob', 'creadoPor',
      'creadoPorNombre', 'perfilMovilId', 'fotosAntes', 'fotosDespues',
      'condominioId', 'propiedadId', 'asignadoId', 'activoId', 'centroCostoId',
      'createdAt', 'updatedAt',
    ])
  }
}

// GET - List all ordenes de trabajo
// Usa raw SQL como método principal para ser 100% resiliente a schema drift.
export async function GET(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'ots.ver', session.userPermisos)) {
    return apiError('Sin permisos', 403)
  }
  try {
    // Auto-migrar columnas faltantes (idempotente, errores ignorados)
    await ensureColumns()

    // Detectar qué columnas existen realmente en la BD
    const existingCols = await detectExistingColumns()

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const filterProyectoId = searchParams.get('proyectoId') || ''
    const filterOrigenTipo = searchParams.get('origenTipo') || ''
    const filterOrigenId = searchParams.get('origenId') || ''

    // Para rol personal, buscar el registro de Personal por email y filtrar OT
    let personalId: string | null = null
    let personalNombre: string | null = null
    if (session.user.rol === 'personal') {
      const allPersonal = await db.personal.findMany({ select: { id: true, email: true, nombre: true } })
      const userEmail = session.user.email.toLowerCase()
      const matched = allPersonal.find((p) => {
        if (!p.email) return false
        try {
          const dec = decrypt(p.email).toLowerCase()
          return dec === userEmail
        } catch { return false }
      })
      if (!matched) return NextResponse.json([])
      personalId = matched.id
      personalNombre = matched.nombre
    }

    // Construir WHERE dinámico con parámetros posicionales (previene SQL injection)
    const conditions: string[] = []
    const params: any[] = []
    let paramIdx = 1

    if (search) {
      const likeVal = `%${search}%`
      conditions.push(`("ot"."otNum" ILIKE $${paramIdx} OR "ot"."titulo" ILIKE $${paramIdx} OR "ot"."estado" ILIKE $${paramIdx})`)
      params.push(likeVal)
      paramIdx++
    }
    if (filterProyectoId && existingCols.has('proyectoId')) {
      conditions.push(`"ot"."proyectoId" = $${paramIdx}`)
      params.push(filterProyectoId)
      paramIdx++
    }
    if (filterOrigenTipo && existingCols.has('origenTipo')) {
      conditions.push(`"ot"."origenTipo" = $${paramIdx}`)
      params.push(filterOrigenTipo)
      paramIdx++
    }
    if (filterOrigenId && existingCols.has('origenId')) {
      conditions.push(`"ot"."origenId" = $${paramIdx}`)
      params.push(filterOrigenId)
      paramIdx++
    }
    if (personalId) {
      conditions.push(`("ot"."asignadoId" = $${paramIdx} OR EXISTS (SELECT 1 FROM "OTPersonal" "op" WHERE "op"."ordenId" = "ot"."id" AND "op"."nombre" ILIKE $${paramIdx + 1}))`)
      params.push(personalId)
      params.push(`%${personalNombre}%`)
      paramIdx += 2
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Construir SELECT dinámico - solo columnas que existen
    const selectCols: string[] = [
      '"ot"."id"', '"ot"."otNum"', '"ot"."titulo"', '"ot"."tipo"', '"ot"."prioridad"',
      '"ot"."estado"', '"ot"."ubicacion"', '"ot"."fechaInicio"', '"ot"."fechaLimite"',
      '"ot"."fechaInicioReal"', '"ot"."fechaFinReal"', '"ot"."costoEstimado"',
      '"ot"."costoReal"', '"ot"."progreso"', '"ot"."descripcion"', '"ot"."tiempoEst"',
      '"ot"."tiempoReal"', '"ot"."estadoAprobacion"', '"ot"."formaPago"', '"ot"."createdAt"',
      '"ot"."creadoPorNombre"',
    ]
    if (existingCols.has('origenTipo')) selectCols.push('"ot"."origenTipo"')
    if (existingCols.has('origenId')) selectCols.push('"ot"."origenId"')
    if (existingCols.has('origenCodigo')) selectCols.push('"ot"."origenCodigo"')
    if (existingCols.has('proyectoId')) selectCols.push('"ot"."proyectoId"')

    // JOINs opcionales
    const propJoin = `LEFT JOIN "Propiedad" "prop" ON "ot"."propiedadId" = "prop"."id"`
    const asigJoin = `LEFT JOIN "Personal" "asig" ON "ot"."asignadoId" = "asig"."id"`
    const ccJoin = `LEFT JOIN "CentroCostoMaster" "cc" ON "ot"."centroCostoId" = "cc"."id"`
    const proyJoin = existingCols.has('proyectoId')
      ? `LEFT JOIN "Proyecto" "proy" ON "ot"."proyectoId" = "proy"."id"`
      : ''

    // Subqueries para _count
    const matCount = `(SELECT COUNT(*) FROM "OTMaterial" "m" WHERE "m"."ordenId" = "ot"."id")::int AS "materialesCount"`
    const herrCount = `(SELECT COUNT(*) FROM "OTHerramienta" "h" WHERE "h"."ordenId" = "ot"."id")::int AS "herramientasCount"`
    const tarCount = `(SELECT COUNT(*) FROM "OTTarea" "t" WHERE "t"."ordenId" = "ot"."id")::int AS "tareasCount"`
    const perCount = `(SELECT COUNT(*) FROM "OTPersonal" "p" WHERE "p"."ordenId" = "ot"."id")::int AS "personalOTCount"`
    const docCount = `(SELECT COUNT(*) FROM "OTDocumento" "d" WHERE "d"."ordenId" = "ot"."id")::int AS "documentosCount"`

    const sql = `
      SELECT
        ${selectCols.join(', ')},
        ${matCount}, ${herrCount}, ${tarCount}, ${perCount}, ${docCount},
        "prop"."id" AS "propiedad_id", "prop"."nombre" AS "propiedad_nombre",
        "asig"."id" AS "asignado_id", "asig"."nombre" AS "asignado_nombre", "asig"."cargo" AS "asignado_cargo",
        "cc"."id" AS "centroCosto_id", "cc"."codigo" AS "centroCosto_codigo", "cc"."nombre" AS "centroCosto_nombre"
        ${existingCols.has('proyectoId') ? ', "proy"."id" AS "proyecto_id", "proy"."codigo" AS "proyecto_codigo", "proy"."nombre" AS "proyecto_nombre"' : ''}
      FROM "OrdenTrabajo" "ot"
      ${propJoin}
      ${asigJoin}
      ${ccJoin}
      ${proyJoin}
      ${whereClause}
      ORDER BY "ot"."createdAt" DESC
    `

    console.log('[OT GET] Ejecutando query raw SQL con params:', params.length)
    const rows = await db.$queryRawUnsafe<any[]>(sql, ...params)

    // Mapear resultados al formato esperado por el frontend
    const ordenes = rows.map((r: any) => {
      const ot: any = {
        id: r.id,
        otNum: r.otNum,
        titulo: r.titulo,
        tipo: r.tipo,
        prioridad: r.prioridad,
        estado: r.estado,
        ubicacion: r.ubicacion,
        fechaInicio: r.fechaInicio,
        fechaLimite: r.fechaLimite,
        fechaInicioReal: r.fechaInicioReal,
        fechaFinReal: r.fechaFinReal,
        costoEstimado: Number(r.costoEstimado) || 0,
        costoReal: Number(r.costoReal) || 0,
        progreso: Number(r.progreso) || 0,
        descripcion: r.descripcion,
        tiempoEst: Number(r.tiempoEst) || 0,
        tiempoReal: Number(r.tiempoReal) || 0,
        estadoAprobacion: r.estadoAprobacion,
        formaPago: r.formaPago,
        createdAt: r.createdAt,
        creadoPorNombre: r.creadoPorNombre,
        origenTipo: r.origenTipo || null,
        origenId: r.origenId || null,
        origenCodigo: r.origenCodigo || null,
        proyectoId: r.proyectoId || null,
        propiedad: r.propiedad_id ? { id: r.propiedad_id, nombre: r.propiedad_nombre } : null,
        asignado: r.asignado_id ? { id: r.asignado_id, nombre: r.asignado_nombre, cargo: r.asignado_cargo } : null,
        centroCosto: r.centroCosto_id ? { id: r.centroCosto_id, codigo: r.centroCosto_codigo, nombre: r.centroCosto_nombre } : null,
        proyecto: r.proyecto_id ? { id: r.proyecto_id, codigo: r.proyecto_codigo, nombre: r.proyecto_nombre } : null,
        _count: {
          materiales: Number(r.materialesCount) || 0,
          herramientas: Number(r.herramientasCount) || 0,
          tareas: Number(r.tareasCount) || 0,
          personalOT: Number(r.personalOTCount) || 0,
          documentos: Number(r.documentosCount) || 0,
        },
        fotosAntes: [],
        fotosDespues: [],
      }
      return ot
    })

    console.log(`[OT GET] ${ordenes.length} OTs cargadas exitosamente`)
    return NextResponse.json(ordenes)
  } catch (error: any) {
    console.error('[OT GET] Error fetching ordenes:', error)
    const errMsg = error?.message || error?.meta?.message || String(error)

    // Último recurso: intentar query mínima con solo columnas base
    try {
      console.log('[OT GET] Intentando query mínima de emergencia...')
      const rows = await db.$queryRawUnsafe<any[]>(
        `SELECT "id", "otNum", "titulo", "tipo", "prioridad", "estado", "ubicacion", "fechaInicio", "fechaLimite", "costoEstimado", "costoReal", "progreso", "createdAt" FROM "OrdenTrabajo" ORDER BY "createdAt" DESC LIMIT 500`
      )
      const ordenes = rows.map((r: any) => ({
        id: r.id,
        otNum: r.otNum,
        titulo: r.titulo,
        tipo: r.tipo || 'Correctivo',
        prioridad: r.prioridad || 'Media',
        estado: r.estado || 'Pendiente',
        ubicacion: r.ubicacion,
        fechaInicio: r.fechaInicio,
        fechaLimite: r.fechaLimite,
        fechaInicioReal: null,
        fechaFinReal: null,
        costoEstimado: Number(r.costoEstimado) || 0,
        costoReal: Number(r.costoReal) || 0,
        progreso: Number(r.progreso) || 0,
        descripcion: null,
        tiempoEst: 0,
        tiempoReal: 0,
        estadoAprobacion: 'Pendiente',
        formaPago: null,
        createdAt: r.createdAt,
        creadoPorNombre: null,
        origenTipo: null,
        origenId: null,
        origenCodigo: null,
        proyectoId: null,
        propiedad: null,
        asignado: null,
        centroCosto: null,
        proyecto: null,
        _count: { materiales: 0, herramientas: 0, tareas: 0, personalOT: 0, documentos: 0 },
        fotosAntes: [],
        fotosDespues: [],
      }))
      console.log(`[OT GET] Query de emergencia: ${ordenes.length} OTs`)
      return NextResponse.json(ordenes)
    } catch (emergencyErr) {
      console.error('[OT GET] Query de emergencia también falló:', emergencyErr)
      return NextResponse.json({ error: 'Error fetching ordenes', details: errMsg }, { status: 500 })
    }
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
    const { materiales, herramientas, tareas, personalOT, centroCostoId, proyectoId, origenTipo, origenId, origenCodigo, _clientIdempotency: _idem, ...otData } = data

    // ─── VALIDAR FKs: Asegurar que los IDs referenciados existan en la BD ───
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
      proyectoId: proyectoId || null,
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
        console.warn(`[OT POST] No se pudieron setear campos de origen: ${origenErr?.message || origenErr}`)
      }
    }

    // ─── Actualizar proyecto con la OT vinculada ───
    const proyectoIdForLink = (origenTipo === 'Proyecto' && origenId) ? origenId : (proyectoId || null)
    if (proyectoIdForLink) {
      try {
        const [proyectoRow] = await db.$queryRawUnsafe<{ otsVinculadas: string | null }[]>(
          `SELECT "otsVinculadas" FROM "Proyecto" WHERE "id" = $1`,
          proyectoIdForLink
        )
        if (proyectoRow) {
          const existing: any[] = proyectoRow.otsVinculadas ? JSON.parse(proyectoRow.otsVinculadas) : []
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
              JSON.stringify(existing), proyectoIdForLink
            )
            console.log(`[OT POST] Proyecto actualizado con OT ${orden.otNum}`)
          }
        }
      } catch (proyErr: any) {
        console.warn(`[OT POST] No se pudo actualizar proyecto con OT vinculada: ${proyErr?.message || proyErr}`)
      }
    }

    console.log(`[OT] Creada ${orden.otNum} por ${session.user.email} (${orden.id})`)

    // ─── Backup a Google Drive (fire-and-forget) ───
    void backupOTToDrive(orden.id)

    return NextResponse.json(orden)
  } catch (error: any) {
    console.error('[OT POST] Error creating orden:', error)
    const errMsg = error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : (error?.message || error?.meta?.message || JSON.stringify(error, Object.getOwnPropertyNames(error), 2))

    if (errMsg.includes('Unique') && errMsg.includes('otNum')) {
      return NextResponse.json({
        error: 'Error de concurrencia: numero de OT duplicado. Intente nuevamente.',
        details: errMsg
      }, { status: 409 })
    }

    if (errMsg.includes('foreign key') || errMsg.includes('ForeignKeyConstraint') || errMsg.includes('violates foreign key constraint')) {
      const match = errMsg.match(/Key \((\w+)\)=\(([^)]+)\)/)
      const field = match ? match[1] : 'desconocido'
      const value = match ? match[2] : '?'
      return NextResponse.json({
        error: `Error de referencia: el campo "${field}" con valor "${value}" no existe en la base de datos.`,
        details: errMsg
      }, { status: 400 })
    }

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
