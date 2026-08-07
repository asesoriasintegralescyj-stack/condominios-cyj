import { NextRequest } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError, apiSuccess, handlePrismaError } from '@/lib/api-helpers'
import { sendEmail, emailWrap, escapeHtml } from '@/lib/email'
import { generateRendicionGastoPdfBuffer, type BoletaPdfRow } from '@/lib/pdf-rendicion-gasto'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// POST: aprobar / rechazar / enviar a revision
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
      return apiError('Accion invalida')
    }

    const existing = await withRetry(() =>
      db.rendicionGasto.findUnique({
        where: { id },
        include: {
          responsable: { select: { id: true, nombre: true, cargo: true, email: true } },
          boletas: {
            include: {
              centroCosto: { select: { nombre: true } },
              categoria: { select: { nombre: true } },
            },
          },
        },
      })
    )
    if (!existing) return apiError('Rendicion no encontrada', 404)

    // Validar transiciones de estado
    if (accion === 'aprobar' && !['Borrador', 'En Revisión'].includes(existing.estado)) {
      return apiError('Solo se pueden aprobar rendiciones en estado Borrador o En Revision')
    }
    if (accion === 'rechazar' && existing.estado === 'Aprobada') {
      return apiError('No se puede rechazar una rendicion ya aprobada')
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

    // Enviar email con PDF + imagenes al aprobar
    if (accion === 'aprobar') {
      try {
        // 1. Generar PDF de la rendicion
        const boletasPdf: BoletaPdfRow[] = existing.boletas.map((b) => ({
          descripcion: b.descripcion,
          monto: b.monto,
          fecha: b.fecha,
          nDocumento: b.nDocumento,
          proveedor: b.proveedor,
          centroCosto: b.centroCosto?.nombre || null,
          categoria: b.categoria?.nombre || null,
          notas: b.notas,
          tieneComprobante: !!b.comprobante,
          tieneDocumento: !!b.documento,
        }))

        const pdfBuffer = generateRendicionGastoPdfBuffer({
          codigo: updated.codigo,
          periodo: updated.periodo,
          concepto: updated.concepto,
          descripcion: updated.descripcion,
          estado: updated.estado,
          montoTotal: updated.montoTotal,
          montoAsignado: updated.montoAsignado,
          fechaRendicion: updated.fechaRendicion ? String(updated.fechaRendicion) : null,
          fechaAprobacion: updated.fechaAprobacion ? String(updated.fechaAprobacion) : null,
          aprobadoPorNombre: updated.aprobadoPorNombre,
          responsableNombre: updated.responsableNombre,
          responsableCargo: existing.responsable?.cargo || null,
          observaciones: updated.observaciones,
          motivoRechazo: updated.motivoRechazo,
          boletas: boletasPdf,
        })

        // 2. Preparar attachments: PDF + imagenes de comprobantes y documentos
        const attachments: Array<{ filename: string; content: Buffer; contentType: string }> = []

        // Adjuntar PDF principal
        attachments.push({
          filename: `Rendicion_${updated.codigo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        })

        // Adjuntar imagenes de comprobantes y documentos
        for (let i = 0; i < existing.boletas.length; i++) {
          const b = existing.boletas[i]
          const boletaLabel = b.descripcion ? b.descripcion.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_') : `boleta_${i + 1}`

          // Imagen de comprobante/boleta
          if (b.comprobante) {
            try {
              const imgBuffer = base64ToBuffer(b.comprobante)
              const ext = guessExtension(b.comprobante)
              attachments.push({
                filename: `${boletaLabel}_comprobante.${ext}`,
                content: imgBuffer,
                contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
              })
            } catch (imgErr) {
              console.error(`[Rendiciones] Error procesando comprobante de boleta ${i + 1}:`, imgErr)
            }
          }

          // Documento adjunto (PDF, Word, Excel, imagen)
          if (b.documento) {
            try {
              const docBuffer = base64ToBuffer(b.documento)
              const ext = guessExtension(b.documento)
              const mimeMap: Record<string, string> = {
                pdf: 'application/pdf',
                png: 'image/png',
                jpg: 'image/jpeg',
                jpeg: 'image/jpeg',
                doc: 'application/msword',
                docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                xls: 'application/vnd.ms-excel',
                xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              }
              attachments.push({
                filename: `${boletaLabel}_documento.${ext}`,
                content: docBuffer,
                contentType: mimeMap[ext] || 'application/octet-stream',
              })
            } catch (docErr) {
              console.error(`[Rendiciones] Error procesando documento de boleta ${i + 1}:`, docErr)
            }
          }
        }

        // 3. Generar HTML del email con tabla de boletas
        const boletasHtml = existing.boletas.length > 0
          ? `<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:12px;">
              <tr style="background:#0f2040;color:#fff;">
                <th style="padding:6px;border:1px solid #e2e8f0;text-align:left;">#</th>
                <th style="padding:6px;border:1px solid #e2e8f0;text-align:left;">Descripcion</th>
                <th style="padding:6px;border:1px solid #e2e8f0;text-align:left;">Proveedor</th>
                <th style="padding:6px;border:1px solid #e2e8f0;text-align:right;">Monto</th>
                <th style="padding:6px;border:1px solid #e2e8f0;text-align:center;">Compr.</th>
                <th style="padding:6px;border:1px solid #e2e8f0;text-align:center;">Doc.</th>
              </tr>
              ${existing.boletas.map((b, i) => `
                <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'};">
                  <td style="padding:4px 6px;border:1px solid #e2e8f0;">${i + 1}</td>
                  <td style="padding:4px 6px;border:1px solid #e2e8f0;">${escapeHtml(b.descripcion || '-')}</td>
                  <td style="padding:4px 6px;border:1px solid #e2e8f0;">${escapeHtml(b.proveedor || '-')}</td>
                  <td style="padding:4px 6px;border:1px solid #e2e8f0;text-align:right;font-weight:bold;">$${Number(b.monto).toLocaleString('es-CL')}</td>
                  <td style="padding:4px 6px;border:1px solid #e2e8f0;text-align:center;">${b.comprobante ? '&#10004;' : '&#10008;'}</td>
                  <td style="padding:4px 6px;border:1px solid #e2e8f0;text-align:center;">${b.documento ? '&#10004;' : '&#10008;'}</td>
                </tr>
              `).join('')}
              <tr style="background:#e2e8f0;font-weight:bold;">
                <td colspan="3" style="padding:6px;border:1px solid #e2e8f0;text-align:right;">TOTAL:</td>
                <td style="padding:6px;border:1px solid #e2e8f0;text-align:right;">$${Number(updated.montoTotal).toLocaleString('es-CL')}</td>
                <td colspan="2" style="padding:6px;border:1px solid #e2e8f0;"></td>
              </tr>
            </table>`
          : '<p style="color:#64748b;">Sin boletas registradas.</p>'

        const totalArchivos = attachments.length - 1 // -1 porque el PDF siempre va
        const bodyHtml = `
          <p>Se ha <strong>aprobado</strong> la siguiente rendicion de gastos:</p>
          <table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px;">
            <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;background:#f8fafc;width:35%;">Codigo</td><td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(updated.codigo)}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;background:#f8fafc;">Concepto</td><td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(updated.concepto)}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;background:#f8fafc;">Periodo</td><td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(updated.periodo)}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;background:#f8fafc;">Responsable</td><td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(updated.responsableNombre || '-')}</td></tr>
            <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;background:#f8fafc;">Monto Total</td><td style="padding:8px;border:1px solid #e2e8f0;"><strong>$${Number(updated.montoTotal).toLocaleString('es-CL')}</strong></td></tr>
            <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;background:#f8fafc;">Aprobado por</td><td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(updated.aprobadoPorNombre || '-')}</td></tr>
          </table>
          <p style="margin-top:16px;font-weight:bold;color:#0f2040;">Detalle de Boletas:</p>
          ${boletasHtml}
          ${totalArchivos > 0 ? `<p style="margin-top:12px;color:#64748b;font-size:12px;">Se adjuntan ${totalArchivos} archivo(s) (comprobantes y documentos) + el PDF de la rendicion.</p>` : ''}
          <p style="color:#64748b;font-size:11px;margin-top:16px;">Este correo fue generado automaticamente por el Sistema de Condominios CyJ.</p>
        `

        // 4. Enviar email con PDF + attachments
        const emailResult = await sendEmail({
          to: 'administracionlagunanorte@gmail.com',
          subject: `Rendicion Aprobada - ${updated.codigo} - ${updated.concepto}`,
          html: emailWrap('Rendicion de Gastos Aprobada', 'Condominio Laguna Norte', bodyHtml),
          attachments,
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

// --- Helpers ---

function base64ToBuffer(base64Str: string): Buffer {
  // Handle data URLs like "data:image/png;base64,iVBOR..."
  let base64 = base64Str
  if (base64Str.startsWith('data:')) {
    const commaIdx = base64Str.indexOf(',')
    if (commaIdx !== -1) {
      base64 = base64Str.substring(commaIdx + 1)
    }
  }
  return Buffer.from(base64, 'base64')
}

function guessExtension(base64Str: string): string {
  if (base64Str.startsWith('data:')) {
    const mime = base64Str.substring(5, base64Str.indexOf(';') || base64Str.indexOf(','))
    const extMap: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.ms-excel': 'xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    }
    return extMap[mime] || 'bin'
  }
  // Default to jpg for raw base64 images
  return 'jpg'
}
