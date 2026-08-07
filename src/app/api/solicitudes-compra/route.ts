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

// GET - Listar solicitudes de compra con filtros
// Para roles no-admin: solo ven las que ellos crearon (solicitadoPorId = session.userId)
// Excepción: supervisor y auditor ven todas (necesitan para aprobar/auditar)
export async function GET(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const estado = searchParams.get('estado') || ''
    const prioridad = searchParams.get('prioridad') || ''
    const origenTipo = searchParams.get('origenTipo') || ''

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

    if (search) {
      where.OR = [
        { codigo: { contains: search, mode: 'insensitive' } },
        { titulo: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } },
        { solicitadoPor: { contains: search, mode: 'insensitive' } },
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

    const data = {
      codigo,
      titulo: String(body.titulo || '').trim(),
      descripcion: body.descripcion ? String(body.descripcion) : null,
      estado: 'Solicitado',
      prioridad: body.prioridad || 'Media',
      origenTipo: body.origenTipo || null,
      origenId: body.origenId || null,
      origenCodigo: body.origenCodigo || null,
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
    }

    if (!data.titulo) {
      return apiError('El título es obligatorio', 400)
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
