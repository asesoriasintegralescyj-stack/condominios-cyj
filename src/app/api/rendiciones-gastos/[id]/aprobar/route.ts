/**
 * API Aprobación de Rendición de Gastos
 * 
 * Al aprobar, envía email desde asesoriasintegralescyj@gmail.com
 * a administracionlagunanorte@gmail.com con el detalle de la rendición.
 */
import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError, handlePrismaError } from '@/lib/api-helpers'
import { sendEmail, escapeHtml } from '@/lib/email'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  // Solo admin puede aprobar/rechazar rendiciones
  if (session.user.rol !== 'admin' && session.user.rol !== 'supervisor') {
    return apiError('Sin permisos para aprobar rendiciones', 403)
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { accion, observaciones } = body // accion: 'aprobar' | 'rechazar' | 'enviar_revision'

    if (!accion || !['aprobar', 'rechazar', 'enviar_revision'].includes(accion)) {
      return apiError('Acción inválida. Debe ser: aprobar, rechazar o enviar_revision', 400)
    }

    // Obtener rendición con boletas
    const rendicion = await withRetry(() =>
      db.rendicionGasto.findUnique({
        where: { id },
        include: {
          responsable: { select: { id: true, nombre: true, cargo: true } },
          boletas: {
            include: {
              centroCosto: { select: { id: true, codigo: true, nombre: true } },
              categoria: { select: { id: true, nombre: true, color: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      })
    )

    if (!rendicion) return apiError('Rendición no encontrada', 404)

    // Validar transiciones de estado
    if (accion === 'enviar_revision') {
      if (rendicion.estado !== 'Borrador') {
        return apiError('Solo se puede enviar a revisión desde estado Borrador', 400)
      }
    }
    if (accion === 'aprobar' || accion === 'rechazar') {
      if (rendicion.estado !== 'En Revisión') {
        return apiError('Solo se puede aprobar/rechazar desde estado En Revisión', 400)
      }
    }

    // Actualizar estado
    const nuevoEstado = accion === 'aprobar' ? 'Aprobada' : accion === 'rechazar' ? 'Rechazada' : 'En Revisión'
    const updated = await withRetry(() =>
      db.rendicionGasto.update({
        where: { id },
        data: {
          estado: nuevoEstado,
          ...(accion === 'aprobar' ? {
            fechaAprobacion: new Date(),
            aprobadoPor: session.userId,
            aprobadoPorNombre: `${session.user.nombre} ${session.user.apellido || ''}`.trim(),
          } : {}),
          ...(accion === 'rechazar' ? { motivoRechazo: observaciones || 'Rechazada sin motivo especificado' } : {}),
          ...(observaciones ? { observaciones } : {}),
        },
        include: {
          responsable: { select: { id: true, nombre: true, cargo: true } },
          boletas: {
            include: {
              centroCosto: { select: { id: true, codigo: true, nombre: true } },
              categoria: { select: { id: true, nombre: true, color: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      })
    )

    // Si se aprobó, enviar email a administración
    if (accion === 'aprobar') {
      try {
        await enviarEmailRendicionAprobada(updated)
        // Marcar email como enviado
        await withRetry(() =>
          db.rendicionGasto.update({
            where: { id },
            data: {
              emailEnviado: true,
              emailEnviadoA: 'administracionlagunanorte@gmail.com',
              emailFechaEnvio: new Date(),
            },
          })
        )
      } catch (emailError) {
        console.error('Error enviando email de rendición aprobada:', emailError)
        // No fallar la aprobación si el email falla
      }
    }

    return NextResponse.json(updated)
  } catch (error) {
    return handlePrismaError(error)
  }
}

async function enviarEmailRendicionAprobada(rendicion: any) {
  const formatCLP = (n: number) =>
    '$' + new Intl.NumberFormat('es-CL').format(Math.round(n || 0))

  // Tabla de boletas
  const boletasHtml = rendicion.boletas.map((b: any, i: number) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 8px 12px; font-size: 13px;">${i + 1}</td>
      <td style="padding: 8px 12px; font-size: 13px;">${escapeHtml(b.descripcion)}</td>
      <td style="padding: 8px 12px; font-size: 13px;">${escapeHtml(b.proveedor || '-')}</td>
      <td style="padding: 8px 12px; font-size: 13px;">${b.centroCosto ? escapeHtml(b.centroCosto.nombre) : '-'}</td>
      <td style="padding: 8px 12px; font-size: 13px;">${b.categoria ? escapeHtml(b.categoria.nombre) : '-'}</td>
      <td style="padding: 8px 12px; font-size: 13px; text-align: right; font-weight: 600;">${formatCLP(b.monto)}</td>
    </tr>
  `).join('')

  const bodyHtml = `
    <div style="padding: 16px 0;">
      <p style="margin: 0 0 12px; font-size: 14px; color: #334155;">
        Se informa que la siguiente <strong>rendición de gastos</strong> ha sido aprobada:
      </p>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 13px;">
        <tr>
          <td style="padding: 6px 12px; background: #f8fafc; font-weight: 600; width: 160px;">Código</td>
          <td style="padding: 6px 12px;">${escapeHtml(rendicion.codigo)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 12px; background: #f8fafc; font-weight: 600;">Período</td>
          <td style="padding: 6px 12px;">${escapeHtml(rendicion.periodo)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 12px; background: #f8fafc; font-weight: 600;">Concepto</td>
          <td style="padding: 6px 12px;">${escapeHtml(rendicion.concepto)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 12px; background: #f8fafc; font-weight: 600;">Responsable</td>
          <td style="padding: 6px 12px;">${escapeHtml(rendicion.responsableNombre || '-')}</td>
        </tr>
        <tr>
          <td style="padding: 6px 12px; background: #f8fafc; font-weight: 600;">Monto Asignado</td>
          <td style="padding: 6px 12px;">${formatCLP(rendicion.montoAsignado)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 12px; background: #f8fafc; font-weight: 600;">Monto Total Rendido</td>
          <td style="padding: 6px 12px; color: ${rendicion.montoTotal > rendicion.montoAsignado ? '#dc2626' : '#059669'}; font-weight: 700;">
            ${formatCLP(rendicion.montoTotal)}
          </td>
        </tr>
      </table>

      <h3 style="margin: 16px 0 8px; font-size: 15px; color: #0f2044;">Detalle de Boletas</h3>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0;">
        <thead>
          <tr style="background: #0f2044; color: white;">
            <th style="padding: 8px 12px; text-align: left; font-size: 12px;">#</th>
            <th style="padding: 8px 12px; text-align: left; font-size: 12px;">Descripción</th>
            <th style="padding: 8px 12px; text-align: left; font-size: 12px;">Proveedor</th>
            <th style="padding: 8px 12px; text-align: left; font-size: 12px;">Centro Costo</th>
            <th style="padding: 8px 12px; text-align: left; font-size: 12px;">Categoría</th>
            <th style="padding: 8px 12px; text-align: right; font-size: 12px;">Monto</th>
          </tr>
        </thead>
        <tbody>
          ${boletasHtml}
        </tbody>
        <tfoot>
          <tr style="background: #f0f9ff; font-weight: 700;">
            <td colspan="5" style="padding: 10px 12px; font-size: 14px;">TOTAL</td>
            <td style="padding: 10px 12px; font-size: 14px; text-align: right; color: #0f2044;">${formatCLP(rendicion.montoTotal)}</td>
          </tr>
        </tfoot>
      </table>

      ${rendicion.observaciones ? `
        <p style="margin: 12px 0 0; font-size: 13px; color: #64748b;">
          <strong>Observaciones:</strong> ${escapeHtml(rendicion.observaciones)}
        </p>
      ` : ''}
    </div>
  `

  const { emailWrap } = await import('@/lib/email')

  await sendEmail({
    to: 'administracionlagunanorte@gmail.com',
    subject: `Rendición de Gastos Aprobada - ${rendicion.codigo} - ${rendicion.concepto}`,
    html: emailWrap(
      `Rendición de Gastos Aprobada`,
      `${rendicion.codigo} · Período ${rendicion.periodo}`,
      bodyHtml
    ),
  })
}
