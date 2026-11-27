/**
 * GET /api/solicitudes-compra/exportar-pdfs
 *
 * Exporta los PDF de las solicitudes de compra (los mismos documentos que se
 * generan como respaldo y se adjuntan al correo) en un archivo ZIP descargable.
 *
 * - Los PDF se generan on-the-fly con el mismo generador que usa el email
 *   (generateSolicitudCompraPdfBuffer), incluyendo las fotos del proyecto
 *   de origen (máx. 3 "antes" + 3 "después"), links de cotizaciones y links
 *   de compra, tal como el adjunto del correo.
 * - La respuesta se transmite en streaming (bypass del límite de 4.5 MB de
 *   respuestas bufferizadas en serverless) para soportar ZIPs grandes.
 * - Respeta los mismos filtros del listado: search, estado, prioridad,
 *   fechaDesde, fechaHasta. Parámetro opcional `fotos=0` para excluir fotos.
 * - Mismas reglas de permisos que el listado: admin/supervisor/auditor ven
 *   todas; el resto solo las que creó.
 */
import { NextRequest, NextResponse } from 'next/server'
import { Readable } from 'stream'
import archiver from 'archiver'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError, handlePrismaError } from '@/lib/api-helpers'
import { generateSolicitudCompraPdfBuffer } from '@/lib/pdf-solicitud-compra'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

const CONDOMINIO_LAGUNA_NORTE = 'cmo9f3x7j0000ktyeb0rzhwt9'

// ─── Parse helpers (misma lógica que el listado y la ruta de PDF individual) ───

function safeParseMateriales(raw: string | null): any[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function safeParseLinks(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function parseStringArray(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

/** Extrae URLs http(s) de las cotizaciones de un Proyecto (JSON o texto libre). */
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
          if (/^https?:\/\//i.test(item.archivo)) links.push(item.archivo)
        }
      }
      return links
    }
  } catch {
    // no es JSON — continuar con texto libre
  }
  if (typeof raw === 'string') {
    return raw.match(/https?:\/\/[^\s"',)]+/gi) || []
  }
  return []
}

/** Sanitiza un texto para usarlo como nombre de archivo dentro del ZIP. */
function sanitizeFilename(text: string, maxLen = 80): string {
  const clean = (text || '')
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return clean.slice(0, maxLen).trim() || 'Sin titulo'
}

export async function GET(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const estado = searchParams.get('estado') || ''
    const prioridad = searchParams.get('prioridad') || ''
    const fechaDesde = searchParams.get('fechaDesde') || ''
    const fechaHasta = searchParams.get('fechaHasta') || ''
    // fotos=0 → genera los PDF sin fotos del proyecto de origen (más rápido/liviano)
    const incluirFotos = searchParams.get('fotos') !== '0'

    const where: any = { condominioId: CONDOMINIO_LAGUNA_NORTE }

    // Mismas reglas de rol que el listado
    if (
      session.user.rol !== 'admin' &&
      session.user.rol !== 'supervisor' &&
      session.user.rol !== 'auditor'
    ) {
      where.solicitadoPorId = session.userId
    }

    if (estado) where.estado = estado
    if (prioridad) where.prioridad = prioridad
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
      orderBy: { codigo: 'asc' },
    })

    if (solicitudes.length === 0) {
      return apiError('No hay solicitudes de compra que exportar con esos filtros', 404)
    }

    // ─── Preparar el stream del ZIP ───
    const archive = archiver('zip', { zlib: { level: 9 } })

    // La generación de PDFs corre en paralelo al streaming de la respuesta:
    // cada PDF se agrega al ZIP apenas queda listo.
    const generarZip = async () => {
      const errores: string[] = []

      // Cache de proyectos de origen para no consultar el mismo proyecto 2 veces
      const proyectosCache = new Map<
        string,
        {
          fotosAntes: string[]
          fotosDespues: string[]
          cotizacionesLinks: string[]
          materialesLinks: string[]
        } | null
      >()

      for (const sc of solicitudes) {
        try {
          let fotosAntes: string[] = []
          let fotosDespues: string[] = []
          let cotizacionesLinks: string[] = []
          let materialesLinks: string[] = []

          // Mismo enriquecimiento que hace el email cuando la SC viene de un Proyecto
          if (incluirFotos && sc.origenTipo === 'Proyecto' && sc.origenId) {
            if (!proyectosCache.has(sc.origenId)) {
              try {
                const proy = await db.proyecto.findUnique({
                  where: { id: sc.origenId },
                  select: {
                    fotosAntes: true,
                    fotosDespues: true,
                    cotizaciones: true,
                    materiales: { select: { linkCompra: true } },
                  },
                })
                proyectosCache.set(
                  sc.origenId,
                  proy
                    ? {
                        fotosAntes: parseStringArray(proy.fotosAntes).slice(0, 3),
                        fotosDespues: parseStringArray(proy.fotosDespues).slice(0, 3),
                        cotizacionesLinks: extractCotizacionLinks(proy.cotizaciones),
                        materialesLinks: proy.materiales
                          .map((m) => (m.linkCompra || '').trim())
                          .filter((l) => l !== ''),
                      }
                    : null
                )
              } catch (e) {
                console.warn('[ExportarPDFs] Error leyendo proyecto origen:', e)
                proyectosCache.set(sc.origenId, null)
              }
            }
            const proyData = proyectosCache.get(sc.origenId)
            if (proyData) {
              fotosAntes = proyData.fotosAntes
              fotosDespues = proyData.fotosDespues
              cotizacionesLinks = proyData.cotizacionesLinks
              materialesLinks = proyData.materialesLinks
            }
          }

          const pdfBuffer = await generateSolicitudCompraPdfBuffer({
            codigo: sc.codigo,
            titulo: sc.titulo,
            descripcion: sc.descripcion || '',
            estado: sc.estado,
            prioridad: sc.prioridad,
            solicitadoPor: sc.solicitadoPor || '',
            origenTipo: sc.origenTipo || undefined,
            origenCodigo: sc.origenCodigo || undefined,
            fechaEspera: sc.fechaEspera || undefined,
            proveedorSugerido: sc.proveedorSugerido || undefined,
            observaciones: sc.observaciones || undefined,
            materiales: safeParseMateriales(sc.materiales),
            links: safeParseLinks(sc.links),
            fechaSolicitud: sc.fechaSolicitud ? sc.fechaSolicitud.toISOString() : null,
            totalEstimado: sc.totalEstimado,
            fotosAntes,
            fotosDespues,
            cotizacionesLinks,
            materialesLinks,
          })

          archive.append(pdfBuffer, {
            name: `${sc.codigo} - ${sanitizeFilename(sc.titulo)}.pdf`,
          })
        } catch (e: any) {
          console.error(`[ExportarPDFs] Error generando PDF ${sc.codigo}:`, e)
          errores.push(
            `${sc.codigo} - ${sc.titulo}: ${e?.message || 'error desconocido'}`
          )
        }
      }

      if (errores.length > 0) {
        archive.append(
          'No se pudieron generar los siguientes PDFs:\n\n' + errores.join('\n') + '\n',
          { name: '_errores_generacion.txt' }
        )
      }

      await archive.finalize()
    }

    // Arranca la generación sin esperar (el stream fluye mientras genera)
    generarZip().catch((e) => {
      console.error('[ExportarPDFs] Error fatal generando ZIP:', e)
      archive.abort()
    })

    const fecha = new Date().toISOString().split('T')[0]
    const zipStream = Readable.toWeb(archive) as unknown as ReadableStream<Uint8Array>

    return new NextResponse(zipStream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="Solicitudes_Compra_PDFs_${fecha}.zip"`,
        'X-Solicitudes-Exportadas': String(solicitudes.length),
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[ExportarPDFs] Error:', error)
    return handlePrismaError(error)
  }
}
