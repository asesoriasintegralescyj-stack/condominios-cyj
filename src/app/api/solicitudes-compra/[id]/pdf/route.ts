import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'
import { generateSolicitudCompraPdfBuffer } from '@/lib/pdf-solicitud-compra'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

interface Context {
  params: Promise<{ id: string }>
}

function safeParseMateriales(raw: string | null) {
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return [] }
}

function safeParseLinks(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch { return [] }
  }
}

export async function GET(_request: NextRequest, { params }: Context) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  const { id } = await params
  const solicitud = await db.solicitudCompra.findUnique({ where: { id } })
  if (!solicitud) return apiError('Solicitud no encontrada', 404)

  try {
    const buffer = await generateSolicitudCompraPdfBuffer({
      codigo: solicitud.codigo,
      titulo: solicitud.titulo,
      descripcion: solicitud.descripcion || '',
      estado: solicitud.estado,
      prioridad: solicitud.prioridad,
      solicitadoPor: solicitud.solicitadoPor || '',
      origenTipo: solicitud.origenTipo || undefined,
      origenId: solicitud.origenId || undefined,
      fechaEspera: solicitud.fechaEspera || undefined,
      proveedorSugerido: solicitud.proveedorSugerido || undefined,
      observaciones: solicitud.observaciones || undefined,
      materiales: safeParseMateriales(solicitud.materiales),
      links: safeParseLinks(solicitud.links),
      fechaSolicitud: solicitud.fechaSolicitud,
      totalEstimado: solicitud.totalEstimado,
    })

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Solicitud_${solicitud.codigo}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generando PDF:', error)
    return apiError('Error al generar PDF', 500)
  }
}
