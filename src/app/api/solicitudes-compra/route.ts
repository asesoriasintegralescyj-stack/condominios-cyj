import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError, handlePrismaError } from '@/lib/api-helpers'
import {
  sendSolicitudCompraEmail,
  type MaterialSolicitud,
} from '@/lib/email-solicitud-compra'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const CONDOMINIO_LAGUNA_NORTE = 'cmo9f3x7j0000ktyeb0rzhwt9'

/**
 * Auto-migra la tabla SolicitudCompra agregando columnas faltantes.
 * Esto es necesario cuando el Prisma schema se actualiza pero la BD no.
 * Se ejecuta una sola vez (las columnas se verifican antes de agregar).
 */
async function ensureColumns() {
  const cols: { name: string; type: string; default?: string }[] = [
    { name: 'moneda', type: 'TEXT', default: "'CLP'" },
    { name: 'proyectoId', type: 'TEXT' },
    { name: 'proyectoNombre', type: 'TEXT' },
    { name: 'otId', type: 'TEXT' },
    { name: 'otCodigo', type: 'TEXT' },
    { name: 'centroCostoId', type: 'TEXT' },
    { name: 'submittedAt', type: 'TIMESTAMPTZ' },
  ]
  for (const col of cols) {
    try {
      const r = await db.$queryRawUnsafe<[{ exists: boolean }]>(
        `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='SolicitudCompra' AND column_name='${col.name}')`
      )
      if (!r[0]?.exists) {
        const def = col.default ? ` DEFAULT ${col.default}` : ''
        await db.$executeRawUnsafe(
          `ALTER TABLE "SolicitudCompra" ADD COLUMN "${col.name}" ${col.type}${def}`
        )
        console.log(`[ensureColumns] Columna ${col.name} agregada`)
      }
    } catch (e) {
      console.warn(`[ensureColumns] Error con ${col.name}:`, e)
    }
  }
  // Índices
  const idxs = [
    { name: 'SolicitudCompra_proyectoId_idx', on: '"SolicitudCompra"("proyectoId")' },
    { name: 'SolicitudCompra_otId_idx', on: '"SolicitudCompra"("otId")' },
    { name: 'SolicitudCompra_centroCostoId_idx', on: '"SolicitudCompra"("centroCostoId")' },
  ]
  for (const idx of idxs) {
    try {
      const r = await db.$queryRawUnsafe<[{ exists: boolean }]>(
        `SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='${idx.name}')`
      )
      if (!r[0]?.exists) {
        await db.$executeRawUnsafe(`CREATE INDEX "${idx.name}" ON ${idx.on}`)
        console.log(`[ensureColumns] Índice ${idx.name} creado`)
      }
    } catch (e) {
      console.warn(`[ensureColumns] Error con índice ${idx.name}:`, e)
    }
  }
}

// GET - Listar solicitudes de compra con filtros
// Para roles no-admin: solo ven las que ellos crearon (solicitadoPorId = session.userId)
// Excepción: supervisor y auditor ven todas (necesitan para aprobar/auditar)
export async function GET(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  try {
    // Auto-migrar columnas faltantes (idempotente)
    await ensureColumns()

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const estado = searchParams.get('estado') || ''
    const prioridad = searchParams.get('prioridad') || ''
    const origenTipo = searchParams.get('origenTipo') || ''
    const proyectoId = searchParams.get('proyectoId') || ''
    const otId = searchParams.get('otId') || ''
    const centroCostoId = searchParams.get('centroCostoId') || ''
    const fechaDesde = searchParams.get('fechaDesde') || ''
    const fechaHasta = searchParams.get('fechaHasta') || ''

    const where: any = {
      condominioId: CONDOMINIO_LAGUNA_NORTE,
    }

    // Filtro por rol:
    // - admin, supervisor, auditor: ven todas
    // - usuario, personal: solo las que crearon ellos
    if (session.user.rol !== 'admin' && session.user.rol !== 'supervisor' && session.user.rol !== 'auditor') {
      where.solicitadoPorId = session.userId
    }

    if (estado) where.estado = estado
    if (prioridad) where.prioridad = prioridad
    if (origenTipo) where.origenTipo = origenTipo
    if (proyectoId) where.proyectoId = proyectoId
    if (otId) where.otId = otId
    if (centroCostoId) where.centroCostoId = centroCostoId

    // Filtro por rango de fechas
    if (fechaDesde || fechaHasta) {
      where.fechaSolicitud = {}
      if (fechaDesde) where.fechaSolicitud.gte = new Date(fechaDesde)
      if (fechaHasta) where.fechaSolicitud.lte = new Date(fechaHasta + 'T23:59:59.999Z')
    }

    if (search) {
      where.OR = [
        { codigo: { contains: search, mode: 'insensitive' } },
        { titulo: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } },
        { solicitadoPor: { contains: search, mode: 'insensitive' } },
        { proyectoNombre: { contains: search, mode: 'insensitive' } },
        { otCodigo: { contains: search, mode: 'insensitive' } },
      ]
    }

    const solicitudes = await db.solicitudCompra.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    // Parse materiales JSON for client convenience
    const parsed = solicitudes.map((s) => ({
      ...s,
      materiales: s.materiales ? safeParseMateriales(s.materiales) : [],
      links: safeParseLinks(s.links),
    }))

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Error fetching solicitudes de compra:', error)
    return handlePrismaError(error)
  }
}

// POST - Crear solicitud de compra y enviar email
export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  try {
    // Auto-migrar columnas faltantes (idempotente)
    await ensureColumns()

    const body = await request.json()

    // Generar codigo SC-XXXX usando tabla de secuencias
    const { generarCorrelativoDB } = await import('@/lib/utils')
    const codigo = await generarCorrelativoDB(db, 'SolicitudCompra', 'SC', 4)

    // Normalize materiales
    const materialesRaw: MaterialSolicitud[] = Array.isArray(body.materiales)
      ? body.materiales.map((m: any) => ({
          nombre: String(m.nombre ?? m.descripcion ?? '').trim(),
          cantidad: Number(m.cantidad) || 0,
          unidad: String(m.unidad ?? 'unidad').trim(),
          precioEstimado: Number(m.precioEstimado ?? m.precioUnit ?? 0) || 0,
          total: Number(m.total ?? (Number(m.cantidad) || 0) * (Number(m.precioEstimado ?? m.precioUnit ?? 0) || 0)) || 0,
        }))
      : []

    const totalEstimado =
      body.totalEstimado != null
        ? Number(body.totalEstimado)
        : materialesRaw.reduce((acc, m) => acc + (m.total || 0), 0)

    const solicitadoPor =
      body.solicitadoPor ??
      (session.user
        ? `${session.user.nombre}${session.user.apellido ? ' ' + session.user.apellido : ''}`.trim()
        : null)

    // Si viene de OT/Proyecto con origenTipo, se crea directo en "Solicitado" (comportamiento original).
    // Si es creación manual sin origen, se crea en "Borrador".
    const isFromOrigen = body.origenTipo && body.origenId
    const initialEstado = isFromOrigen ? 'Solicitado' : (body.estado || 'Borrador')

    const data = {
      codigo,
      titulo: String(body.titulo || '').trim(),
      descripcion: body.descripcion ? String(body.descripcion) : null,
      estado: initialEstado,
      prioridad: body.prioridad || 'Media',
      moneda: body.moneda || 'CLP',
      origenTipo: body.origenTipo || null,
      origenId: body.origenId || null,
      origenCodigo: body.origenCodigo || null,
      // Asociación a Proyecto/OT
      proyectoId: body.proyectoId || null,
      proyectoNombre: body.proyectoNombre || null,
      otId: body.otId || null,
      otCodigo: body.otCodigo || null,
      // Centro de costos
      centroCostoId: body.centroCostoId || null,
      // Materiales
      materiales: materialesRaw.length > 0 ? JSON.stringify(materialesRaw) : null,
      totalEstimado,
      solicitadoPor,
      solicitadoPorId: body.solicitadoPorId || session.user.id,
      fechaEspera: body.fechaEspera ? String(body.fechaEspera) : null,
      proveedorSugerido: body.proveedorSugerido ? String(body.proveedorSugerido) : null,
      observaciones: body.observaciones ? String(body.observaciones) : null,
      links: Array.isArray(body.links) && body.links.length > 0
        ? JSON.stringify(body.links.map((l: any) => String(l || '').trim()).filter((l: string) => l !== ''))
        : null,
      emailEnviado: false,
      condominioId: CONDOMINIO_LAGUNA_NORTE,
      // Si viene de origen, ya se envió a revisión
      submittedAt: isFromOrigen ? new Date() : null,
      // Si viene de origen, arrancar en etapa de aprobación
      etapaAprobacion: isFromOrigen ? 'Pendiente Supervisor' : 'Sin etapa',
    }

    if (!data.titulo) {
      return apiError('El título es obligatorio', 400)
    }

    // Si no es de origen y el estado es Solicitado (envío a revisión), validar valorización
    if (!isFromOrigen && initialEstado === 'Solicitado') {
      const cleanItems = materialesRaw.filter((m) => m.nombre && m.nombre.trim() !== '')
      if (cleanItems.length === 0) {
        return apiError('Debe agregar al menos un material con nombre para enviar a revisión', 400)
      }
      for (const item of cleanItems) {
        if (!item.cantidad || item.cantidad <= 0) {
          return apiError(`Cantidad inválida en ítem "${item.nombre}". Debe ser mayor a 0.`, 400)
        }
        if (!item.precioEstimado || item.precioEstimado <= 0) {
          return apiError(`Precio unitario inválido en ítem "${item.nombre}". Debe ser mayor a 0.`, 400)
        }
      }
      if (!totalEstimado || totalEstimado <= 0) {
        return apiError('La valorización total debe ser mayor a 0', 400)
      }
    }

    const solicitud = await db.solicitudCompra.create({ data })

    // If the solicitud originated from a Proyecto, fetch the project's
    // fotosAntes / fotosDespues and cotizaciones links so they can be
    // embedded into the PDF attachment that goes with the email.
    let fotosAntes: string[] = []
    let fotosDespues: string[] = []
    let cotizacionesLinks: string[] = []
    let materialesLinks: string[] = []
    if (solicitud.origenTipo === 'Proyecto' && solicitud.origenId) {
      try {
        const proyectoOrigen = await db.proyecto.findUnique({
          where: { id: solicitud.origenId },
          select: {
            fotosAntes: true,
            fotosDespues: true,
            cotizaciones: true,
            materiales: { select: { linkCompra: true } },
          },
        })
        if (proyectoOrigen) {
          // Limit to a maximum of 3 photos per type to keep the PDF / email
          // attachment from growing too large.
          fotosAntes = parseStringArray(proyectoOrigen.fotosAntes).slice(0, 3)
          fotosDespues = parseStringArray(proyectoOrigen.fotosDespues).slice(0, 3)
          cotizacionesLinks = extractCotizacionLinks(proyectoOrigen.cotizaciones)
          materialesLinks = proyectoOrigen.materiales
            .map((m) => (m.linkCompra || '').trim())
            .filter((l) => l !== '')
        }
      } catch (e) {
        console.warn(
          `[SolicitudCompra ${codigo}] No se pudo obtener fotos/cotizaciones del proyecto origen:`,
          e
        )
      }
    }

    // Also include any linkCompra provided in the materiales payload itself
    const linksFromMateriales = materialesRaw
      .map((m: any) => (m.linkCompra || '').trim())
      .filter((l: string) => l !== '')
    if (linksFromMateriales.length > 0) {
      materialesLinks = Array.from(new Set([...materialesLinks, ...linksFromMateriales]))
    }

    // Parsear links persistidos en la SC
    const scLinks = parseStringArray(solicitud.links)

    // Intentar enviar email (no falla si SMTP no está configurado)
    const emailResult = await sendSolicitudCompraEmail({
      codigo: solicitud.codigo,
      titulo: solicitud.titulo,
      descripcion: solicitud.descripcion,
      prioridad: solicitud.prioridad,
      estado: solicitud.estado,
      materiales: materialesRaw,
      totalEstimado: solicitud.totalEstimado,
      solicitadoPor: solicitud.solicitadoPor,
      fechaSolicitud: solicitud.fechaSolicitud
        ? solicitud.fechaSolicitud.toISOString()
        : null,
      fechaEspera: solicitud.fechaEspera,
      proveedorSugerido: solicitud.proveedorSugerido,
      observaciones: solicitud.observaciones,
      origenCodigo: solicitud.origenCodigo,
      origenTipo: solicitud.origenTipo,
      fotosAntes,
      fotosDespues,
      cotizacionesLinks,
      links: scLinks,
      materialesLinks,
    })

    let updated = solicitud
    if (emailResult.ok) {
      updated = await db.solicitudCompra.update({
        where: { id: solicitud.id },
        data: {
          emailEnviado: true,
          emailEnviadoA: 'administracionlagunanorte@gmail.com',
          emailFechaEnvio: new Date(),
        },
      })
    } else if (emailResult.skipped) {
      console.warn(
        `[SolicitudCompra ${codigo}] Email omitido: ${emailResult.error || 'SMTP no configurado'}`
      )
    } else {
      console.error(
        `[SolicitudCompra ${codigo}] Error enviando email: ${emailResult.error}`
      )
    }

    // Respaldo automático a Google Drive (fire-and-forget)
    void backupSolicitudToDrive(updated, materialesRaw)

    return NextResponse.json(
      {
        ...updated,
        materiales: materialesRaw,
        links: scLinks,
        emailEnviado: updated.emailEnviado,
        emailSkipped: emailResult.skipped === true,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating solicitud de compra:', error)
    return handlePrismaError(error)
  }
}

/**
 * Respalda una solicitud de compra a Google Drive (fire-and-forget).
 */
async function backupSolicitudToDrive(solicitud: any, materiales: MaterialSolicitud[]) {
  try {
    if (!process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT) return

    // Buscar carpeta de solicitudes del proyecto
    let scFolderId: string | null = null
    let proyCodigo = ''

    if (solicitud.proyectoId) {
      const proy = await db.proyecto.findUnique({ where: { id: solicitud.proyectoId }, select: { codigo: true, driveData: true } })
      if (proy?.driveData) {
        const folders = JSON.parse(proy.driveData)
        scFolderId = folders.solicitudesFolder?.id || null
      }
      proyCodigo = solicitud.proyectoNombre || proy?.codigo || ''
    }
    if (!scFolderId && solicitud.origenTipo === 'Proyecto' && solicitud.origenId) {
      const proy = await db.proyecto.findUnique({ where: { id: solicitud.origenId }, select: { codigo: true, driveData: true } })
      if (proy?.driveData) {
        const folders = JSON.parse(proy.driveData)
        scFolderId = folders.solicitudesFolder?.id || null
      }
      proyCodigo = solicitud.origenCodigo || proy?.codigo || ''
    }
    if (!scFolderId) return

    const { uploadFile } = await import('@/lib/google-drive')

    let content = `SOLICITUD DE COMPRA: ${solicitud.codigo}\n`
    content += `Fecha: ${new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })}\n`
    content += `${'='.repeat(60)}\n\n`
    content += `Titulo: ${solicitud.titulo}\n`
    if (solicitud.descripcion) content += `Descripcion: ${solicitud.descripcion}\n`
    content += `Estado: ${solicitud.estado}\n`
    content += `Prioridad: ${solicitud.prioridad}\n`
    if (solicitud.solicitadoPor) content += `Solicitado por: ${solicitud.solicitadoPor}\n`
    if (solicitud.fechaEspera) content += `Fecha esperada: ${solicitud.fechaEspera}\n`
    if (solicitud.proveedorSugerido) content += `Proveedor sugerido: ${solicitud.proveedorSugerido}\n`
    if (solicitud.observaciones) content += `Observaciones: ${solicitud.observaciones}\n`
    content += `Total estimado: $${Number(solicitud.totalEstimado || 0).toLocaleString('es-CL')}\n`
    if (proyCodigo) content += `Proyecto: ${proyCodigo}\n`

    if (materiales.length > 0) {
      content += `\n${'-'.repeat(60)}\nMATERIALES:\n`
      for (const m of materiales) {
        content += `  * ${m.nombre || 'Sin nombre'} - ${m.cantidad} ${m.unidad || ''} - $${Number(m.total || 0).toLocaleString('es-CL')}\n`
      }
    }

    content += `\n${'='.repeat(60)}\nRespaldo automatico - Sistema Condominios CYJ\n`

    const safeName = `${solicitud.codigo} - ${solicitud.titulo}`.replace(/[/\\?%*:|"<>]/g, '-')
    await uploadFile(Buffer.from(content, 'utf-8'), `${safeName}.txt`, scFolderId, 'text/plain')
    console.log(`[Drive] SC ${solicitud.codigo} respaldada OK`)
  } catch (error) {
    console.error(`[Drive] Error respaldando SC ${solicitud.codigo}:`, error)
  }
}

function safeParseMateriales(raw: string): MaterialSolicitud[] {
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
    return []
  } catch {
    return []
  }
}

function safeParseLinks(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === 'string')
    }
    return []
  } catch {
    return []
  }
}

/**
 * Parses a JSON-encoded string array (used for fotosAntes / fotosDespues
 * in Proyecto) and returns a clean string[].
 */
function parseStringArray(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === 'string')
    }
    return []
  } catch {
    return []
  }
}

/**
 * The cotizaciones field of a Proyecto can be either:
 *  - A JSON array of { nombre, archivo, tipo } objects (base64 data URLs),
 *    in which case we don't extract any "links" (the archive would be too
 *    large to embed in the email PDF).
 *  - A JSON array of plain URL strings.
 *  - A free-text string containing URLs.
 *
 * We try to extract any http(s) URLs found and return them so they can be
 * listed in the PDF attachment as references.
 */
function extractCotizacionLinks(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      const links: string[] = []
      for (const item of parsed) {
        if (typeof item === 'string' && /^https?:\/\//i.test(item)) {
          links.push(item)
        } else if (item && typeof item === 'object' && typeof item.archivo === 'string') {
          if (/^https?:\/\//i.test(item.archivo)) {
            links.push(item.archivo)
          } else if (typeof item.nombre === 'string') {
            // Not a link (likely a base64 data URL) — record its name only
            links.push(item.nombre)
          }
        }
      }
      return links
    }
    if (typeof parsed === 'string') {
      const matches = parsed.match(/https?:\/\/[^\s"',)]+/gi)
      return matches || []
    }
  } catch {
    // not JSON, treat as plain text
  }
  if (typeof raw === 'string') {
    const matches = raw.match(/https?:\/\/[^\s"',)]+/gi)
    return matches || []
  }
  return []
}

/**
 * Respalda una solicitud de compra a Google Drive.
 * Solo se ejecuta si la SC tiene un proyecto origen con carpetas en Drive.
 */
async function backupSolicitudToDrive(solicitud: any, materiales: MaterialSolicitud[]) {
  try {
    if (!process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT) return
    if (!solicitud.origenTipo || !solicitud.origenId) return

    const { uploadFile } = await import('@/lib/google-drive')

    const proyecto = await db.proyecto.findUnique({
      where: { id: solicitud.origenId },
      select: { codigo: true, nombre: true, driveData: true },
    })
    if (!proyecto?.driveData) return

    const folders = JSON.parse(proyecto.driveData)
    const scFolderId = folders.solicitudesFolder?.id
    if (!scFolderId) return

    const fecha = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })
    let content = `SOLICITUD DE COMPRA: ${solicitud.codigo}\n`
    content += `Fecha: ${fecha}\n`
    content += `Estado: ${solicitud.estado}\n`
    content += `Prioridad: ${solicitud.prioridad}\n`
    content += `${'='.repeat(50)}\n\n`
    content += `Título: ${solicitud.titulo}\n`
    if (solicitud.descripcion) content += `Descripción: ${solicitud.descripcion}\n`
    if (solicitud.solicitadoPor) content += `Solicitado por: ${solicitud.solicitadoPor}\n`
    if (solicitud.fechaEspera) content += `Fecha esperada: ${solicitud.fechaEspera}\n`
    if (solicitud.proveedorSugerido) content += `Proveedor sugerido: ${solicitud.proveedorSugerido}\n`
    if (solicitud.observaciones) content += `Observaciones: ${solicitud.observaciones}\n`
    content += `Total estimado: $${Number(solicitud.totalEstimado || 0).toLocaleString('es-CL')}\n`
    content += `\n${'-'.repeat(50)}\nMATERIALES:\n`

    for (const m of materiales) {
      content += `\n  • ${m.nombre || 'Sin nombre'}`
      content += `\n    Cantidad: ${m.cantidad} ${m.unidad || ''}`
      if (m.precioEstimado) content += ` | Precio: $${Number(m.precioEstimado).toLocaleString('es-CL')}`
      if (m.total) content += ` | Total: $${Number(m.total).toLocaleString('es-CL')}`
    }

    content += `\n\n${'='.repeat(50)}\n`
    content += `Proyecto: ${proyecto.codigo} - ${proyecto.nombre}\n`
    content += `Respaldo automático del sistema\n`

    const fileName = `${solicitud.codigo} - ${solicitud.titulo}.txt`.replace(/[/\\?%*:|"<>]/g, '-')
    await uploadFile(Buffer.from(content, 'utf-8'), fileName, scFolderId, 'text/plain')
    console.log(`[Drive Backup] SC ${solicitud.codigo} respaldada`)
  } catch (error) {
    console.error('[Drive Backup] Error respaldando SC:', error)
  }
}
