import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError, handlePrismaError } from '@/lib/api-helpers'
import {
  sendSolicitudCompraEmail,
  type MaterialSolicitud,
} from '@/lib/email-solicitud-compra'

interface Context {
  params: Promise<{ id: string }>
}

function safeParseMateriales(raw: string | null): MaterialSolicitud[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
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

// POST - Reenviar email de una solicitud de compra
export async function POST(_request: NextRequest, { params }: Context) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  try {
    const { id } = await params
    const solicitud = await db.solicitudCompra.findUnique({ where: { id } })
    if (!solicitud) return apiError('Solicitud no encontrada', 404)

    const materiales = safeParseMateriales(solicitud.materiales)
    const scLinks = safeParseLinks(solicitud.links)

    // If the SC originated from a Proyecto, fetch the project's materiales
    // to extract their linkCompra URLs.
    let materialesLinks: string[] = []
    if (solicitud.origenTipo === 'Proyecto' && solicitud.origenId) {
      try {
        const proyectoOrigen = await db.proyecto.findUnique({
          where: { id: solicitud.origenId },
          select: { materiales: { select: { linkCompra: true } } },
        })
        if (proyectoOrigen) {
          materialesLinks = proyectoOrigen.materiales
            .map((m) => (m.linkCompra || '').trim())
            .filter((l) => l !== '')
        }
      } catch (e) {
        console.warn('[Reenviar email] No se pudo obtener materiales del proyecto origen:', e)
      }
    }
    // Also include any linkCompra present in the SC's own materiales
    const linksFromMateriales = materiales
      .map((m: any) => (m.linkCompra || '').trim())
      .filter((l: string) => l !== '')
    if (linksFromMateriales.length > 0) {
      materialesLinks = Array.from(new Set([...materialesLinks, ...linksFromMateriales]))
    }

    const emailResult = await sendSolicitudCompraEmail({
      codigo: solicitud.codigo,
      titulo: solicitud.titulo,
      descripcion: solicitud.descripcion,
      prioridad: solicitud.prioridad,
      estado: solicitud.estado,
      materiales,
      totalEstimado: solicitud.totalEstimado,
      solicitadoPor: solicitud.solicitadoPor,
      fechaEspera: solicitud.fechaEspera,
      proveedorSugerido: solicitud.proveedorSugerido,
      observaciones: solicitud.observaciones,
      origenCodigo: solicitud.origenCodigo,
      origenTipo: solicitud.origenTipo,
      links: scLinks,
      materialesLinks,
    })

    if (emailResult.skipped) {
      return NextResponse.json({
        success: false,
        skipped: true,
        message: 'SMTP no configurado. El email no se pudo enviar.',
      })
    }

    if (!emailResult.ok) {
      return apiError(
        `No se pudo enviar el email: ${emailResult.error || 'error desconocido'}`,
        500
      )
    }

    const updated = await db.solicitudCompra.update({
      where: { id },
      data: {
        emailEnviado: true,
        emailEnviadoA: 'administracionlagunanorte@gmail.com',
        emailFechaEnvio: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      solicitud: { ...updated, materiales },
    })
  } catch (error) {
    console.error('Error reenviando email de solicitud:', error)
    return handlePrismaError(error)
  }
}
