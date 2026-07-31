<<<<<<< HEAD
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

=======
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
>>>>>>> 4585c06d3f055df9c7b5541ddeae5adb8114b7b5
    const updated = await withRetry(() =>
      db.rendicionGasto.update({
        where: { id },
        data: {
          estado: nuevoEstado,
<<<<<<< HEAD
          fechaAprobacion,
          aprobadoPor: session.user.id,
          aprobadoPorNombre: `${session.user.nombre} ${session.user.apellido || ''}`.trim(),
          observaciones: observaciones?.trim() || existing.observaciones,
          motivoRechazo: motivoRechazo?.trim() || null,
=======
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
>>>>>>> 4585c06d3f055df9c7b5541ddeae5adb8114b7b5
        },
      })
    )

<<<<<<< HEAD
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
=======
    // Si se aprobó, enviar email a administración
    if (accion === 'aprobar') {
      try {
        await enviarEmailRendicionAprobada(updated)
        // Marcar email como enviado
>>>>>>> 4585c06d3f055df9c7b5541ddeae5adb8114b7b5
        await withRetry(() =>
          db.rendicionGasto.update({
            where: { id },
            data: {
<<<<<<< HEAD
              emailEnviado: emailResult.ok,
=======
              emailEnviado: true,
>>>>>>> 4585c06d3f055df9c7b5541ddeae5adb8114b7b5
              emailEnviadoA: 'administracionlagunanorte@gmail.com',
              emailFechaEnvio: new Date(),
            },
          })
        )
      } catch (emailError) {
<<<<<<< HEAD
        console.error('[Rendiciones] Error enviando email:', emailError)
      }
    }

    return apiSuccess(updated)
=======
        console.error('Error enviando email de rendición aprobada:', emailError)
        // No fallar la aprobación si el email falla
      }
    }

    return NextResponse.json(updated)
>>>>>>> 4585c06d3f055df9c7b5541ddeae5adb8114b7b5
  } catch (error) {
    return handlePrismaError(error)
  }
}
<<<<<<< HEAD
=======

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
>>>>>>> 4585c06d3f055df9c7b5541ddeae5adb8114b7b5
