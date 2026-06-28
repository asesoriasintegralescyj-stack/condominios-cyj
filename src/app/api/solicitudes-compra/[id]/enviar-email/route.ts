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

// POST - Reenviar email de una solicitud de compra
export async function POST(_request: NextRequest, { params }: Context) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  try {
    const { id } = await params
    const solicitud = await db.solicitudCompra.findUnique({ where: { id } })
    if (!solicitud) return apiError('Solicitud no encontrada', 404)

    const materiales = safeParseMateriales(solicitud.materiales)

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
