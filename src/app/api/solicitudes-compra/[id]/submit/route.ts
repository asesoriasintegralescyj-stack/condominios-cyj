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

// POST - Enviar solicitud a revisión (Borrador → Solicitado)
export async function POST(request: NextRequest, { params }: Context) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  try {
    const { id } = await params
    const existing = await db.solicitudCompra.findUnique({ where: { id } })
    if (!existing) return apiError('Solicitud no encontrada', 404)

    // Solo el creador o admin puede enviar a revisión
    const isOwner = existing.solicitadoPorId === session.userId
    if (!isOwner && session.user.rol !== 'admin') {
      return apiError('Solo el solicitante o un administrador puede enviar a revisión', 403)
    }

    // Solo se puede enviar desde Borrador
    if (existing.estado !== 'Borrador') {
      return apiError(`Solo se puede enviar a revisión desde estado "Borrador". Estado actual: "${existing.estado}"`, 400)
    }

    // === VALIDACIONES DE VALORIZACIÓN ===
    const materiales = safeParseMateriales(existing.materiales)
    const cleanItems = materiales.filter((m) => m.nombre && m.nombre.trim() !== '')

    if (cleanItems.length === 0) {
      return apiError('Debe agregar al menos un material con nombre para enviar a revisión', 400)
    }

    const errors: string[] = []
    let totalCalc = 0
    for (const item of cleanItems) {
      if (!item.cantidad || item.cantidad <= 0) {
        errors.push(`Cantidad inválida en "${item.nombre}". Debe ser mayor a 0.`)
      }
      if (!item.precioEstimado || item.precioEstimado <= 0) {
        errors.push(`Precio unitario inválido en "${item.nombre}". Debe ser mayor a 0.`)
      }
      totalCalc += (item.cantidad || 0) * (item.precioEstimado || 0)
    }

    if (totalCalc <= 0) {
      errors.push('La valorización total debe ser mayor a 0')
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validación de valorización fallida', details: errors }, { status: 400 })
    }

    // Actualizar estado y registrar envío
    const updated = await db.solicitudCompra.update({
      where: { id },
      data: {
        estado: 'Solicitado',
        submittedAt: new Date(),
        etapaAprobacion: 'Pendiente Supervisor',
      },
    })

    // Registrar en historial de aprobación
    await db.historialAprobacionSC.create({
      data: {
        solicitudId: id,
        etapaAnterior: 'Borrador',
        etapaNueva: 'Solicitado',
        accion: 'submit',
        observaciones: 'Solicitud enviada a revisión',
        aprobadorId: session.userId,
        aprobadorNombre: `${session.user.nombre}${session.user.apellido ? ' ' + session.user.apellido : ''}`.trim(),
      },
    })

    // Enviar email de notificación (igual que al crear desde OT/Proyecto)
    const linksRaw = existing.links
    let scLinks: string[] = []
    if (linksRaw) {
      try {
        const parsed = JSON.parse(linksRaw)
        if (Array.isArray(parsed)) scLinks = parsed.filter((x): x is string => typeof x === 'string')
      } catch { /* ignore */ }
    }

    try {
      const emailResult = await sendSolicitudCompraEmail({
        codigo: updated.codigo,
        titulo: updated.titulo,
        descripcion: updated.descripcion,
        prioridad: updated.prioridad,
        estado: updated.estado,
        materiales: cleanItems,
        totalEstimado: totalCalc,
        solicitadoPor: updated.solicitadoPor,
        fechaSolicitud: updated.fechaSolicitud ? updated.fechaSolicitud.toISOString() : null,
        fechaEspera: updated.fechaEspera,
        proveedorSugerido: updated.proveedorSugerido,
        observaciones: updated.observaciones,
        origenCodigo: updated.origenCodigo,
        origenTipo: updated.origenTipo,
        links: scLinks,
      })

      if (emailResult.ok) {
        await db.solicitudCompra.update({
          where: { id },
          data: {
            emailEnviado: true,
            emailEnviadoA: 'administracionlagunanorte@gmail.com',
            emailFechaEnvio: new Date(),
          },
        })
      }
    } catch (emailErr) {
      console.error(`[SC ${updated.codigo}] Error enviando email al submit:`, emailErr)
    }

    return NextResponse.json({
      ...updated,
      materiales: cleanItems,
      links: scLinks,
      message: `Solicitud ${updated.codigo} enviada a revisión correctamente`,
    })
  } catch (error) {
    console.error('Error submitting solicitud de compra:', error)
    return handlePrismaError(error)
  }
}
