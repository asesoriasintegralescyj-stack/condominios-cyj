import { NextRequest } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError, apiSuccess, handlePrismaError } from '@/lib/api-helpers'
import { sendEmail, emailWrap, escapeHtml } from '@/lib/email'

// POST: aprobar / rechazar / enviar a revisión
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession()
    if (!session) return apiError('No autenticado', 401)
    if (session.user.rol !== 'admin' && session.user.rol !== 'supervisor') {
      return apiError('Solo administradores o supervisores', 403)
    }

    const { id } = await params
    const body = await req.json()
    const { accion, observaciones, motivoRechazo } = body // accion: 'aprobar' | 'rechazar' | 'enviar_revision'

    if (!['aprobar', 'rechazar', 'enviar_revision'].includes(accion)) {
      return apiError('Acción inválida')
    }

    const existing = await withRetry(() =>
      db.rendicionGasto.findUnique({
        where: { id },
        include: {
          responsable: { select: { id: true, nombre: true, cargo: true, email: true } },
          boletas: true,
        },
      })
    )
    if (!existing) return apiError('Rendición no encontrada', 404)

    // Validar transiciones de estado
    if (accion === 'aprobar' && !['Borrador', 'En Revisión'].includes(existing.estado)) {
      return apiError('Solo se pueden aprobar rendiciones en estado Borrador o En Revisión')
    }
    if (accion === 'rechazar' && existing.estado === 'Aprobada') {
      return apiError('No se puede rechazar una rendición ya aprobada')
    }

    let nuevoEstado: string
    let fechaAprobacion: Date | null = null

    switch (accion) {
      case 'aprobar':
        nuevoEstado = 'Aprobada'
        fechaAprobacion = new Date()
        break
      case 'rechazar':
        nuevoEstado = 'Rechazada'
        if (!motivoRechazo?.trim()) return apiError('El motivo de rechazo es obligatorio')
        break
      case 'enviar_revision':
        nuevoEstado = 'En Revisión'
        break
    }

    const updated = await withRetry(() =>
      db.rendicionGasto.update({
        where: { id },
        data: {
          estado: nuevoEstado,
          fechaAprobacion,
          aprobadoPor: session.user.id,
          aprobadoPorNombre: `${session.user.nombre} ${session.user.apellido || ''}`.trim(),
          observaciones: observaciones?.trim() || existing.observaciones,
          motivoRechazo: motivoRechazo?.trim() || null,
        },
      })
    )

    // Enviar email al aprobar
    if (accion === 'aprobar') {
      try {
        const totalBoletas = existing.boletas.length
        const bodyHtml = `
          <p>Se ha <strong>aprobado</strong> la siguiente rendición de gastos:</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">Código</td><td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(updated.codigo)}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">Concepto</td><td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(updated.concepto)}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">Período</td><td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(updated.periodo)}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">Responsable</td><td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(updated.responsableNombre || '-')}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">Monto Total</td><td style="padding:8px;border:1px solid #e2e8f0;"><strong>$${Number(updated.montoTotal).toLocaleString('es-CL')}</strong></td></tr>
            <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">N° Boletas</td><td style="padding:8px;border:1px solid #e2e8f0;">${totalBoletas}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">Aprobado por</td><td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(updated.aprobadoPorNombre || '-')}</td></tr>
          </table>
          <p style="color:#64748b;font-size:12px;">Este correo fue generado automáticamente por el Sistema de Condominios CyJ.</p>
        `

        const emailResult = await sendEmail({
          to: 'administracionlagunanorte@gmail.com',
          subject: `Rendición Aprobada - ${updated.codigo} - ${updated.concepto}`,
          html: emailWrap('Rendición de Gastos Aprobada', `Condominio Laguna Norte`, bodyHtml),
        })

        // Actualizar estado del email
        await withRetry(() =>
          db.rendicionGasto.update({
            where: { id },
            data: {
              emailEnviado: emailResult.ok,
              emailEnviadoA: 'administracionlagunanorte@gmail.com',
              emailFechaEnvio: new Date(),
            },
          })
        )
      } catch (emailError) {
        console.error('[Rendiciones] Error enviando email:', emailError)
      }
    }

    return apiSuccess(updated)
  } catch (error) {
    return handlePrismaError(error)
  }
}
