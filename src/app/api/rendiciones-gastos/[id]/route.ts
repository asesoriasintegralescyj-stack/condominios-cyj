import { NextRequest } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError, apiSuccess, handlePrismaError } from '@/lib/api-helpers'
import { sendEmail, emailWrap, escapeHtml } from '@/lib/email'
import { generateRendicionGastoPdfBuffer, type BoletaPdfRow } from '@/lib/pdf-rendicion-gasto'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// GET: obtener una rendición por ID
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession()
    if (!session) return apiError('No autenticado', 401)

    const { id } = await params

    const rendicion = await withRetry(() =>
      db.rendicionGasto.findUnique({
        where: { id },
        include: {
          responsable: { select: { id: true, nombre: true, cargo: true, email: true } },
          boletas: {
            include: {
              centroCosto: { select: { id: true, nombre: true, codigo: true } },
              categoria: { select: { id: true, nombre: true, color: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      })
    )

    if (!rendicion) return apiError('Rendición no encontrada', 404)
    return apiSuccess(rendicion)
  } catch (error) {
    return handlePrismaError(error)
  }
}

// PUT: actualizar rendición (solo Borrador/En Revisión)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession()
    if (!session) return apiError('No autenticado', 401)

    const { id } = await params
    const body = await req.json()
    const { periodo, concepto, descripcion, responsableId, responsableNombre, observaciones, boletas } = body

    const existing = await withRetry(() =>
      db.rendicionGasto.findUnique({ where: { id } })
    )
    if (!existing) return apiError('Rendición no encontrada', 404)
    const isAdmin = session.user.rol === 'admin'
    const wasFinalized = !['Borrador', 'En Revisión'].includes(existing.estado)

    if (!isAdmin && wasFinalized) {
      return apiError('Solo se pueden editar rendiciones en estado Borrador o En Revisión')
    }
    if (isAdmin && existing.estado === 'Anulada') {
      return apiError('No se puede editar una rendición anulada')
    }

    const montoTotal = (boletas || []).reduce((sum: number, b: any) => sum + (Number(b.monto) || 0), 0)

    // Obtener monto asignado del responsable
    let montoAsignado = 0
    if (responsableId) {
      const asignacion = await withRetry(() =>
        db.montoAsignadoPersonal.findFirst({
          where: { personalId: responsableId, estado: 'Activo' },
        })
      )
      montoAsignado = asignacion?.monto || 0
    }

    const updated = await withRetry(() =>
      db.$transaction(async (tx) => {
        // Eliminar boletas existentes
        await tx.boletaRendicion.deleteMany({ where: { rendicionId: id } })

        // Actualizar rendición y crear nuevas boletas
        // Si el admin edita una rendición finalizada, volver a "En Revisión"
        const updateData: any = {
            periodo: periodo?.trim() || existing.periodo,
            concepto: concepto?.trim() || existing.concepto,
            descripcion: descripcion?.trim() || null,
            montoTotal,
            montoAsignado,
            responsableId: responsableId || null,
            responsableNombre: responsableNombre || null,
            observaciones: observaciones?.trim() || null,
          }
        if (isAdmin && wasFinalized) {
          updateData.estado = 'En Revisión'
          updateData.fechaAprobacion = null
          updateData.aprobadoPor = null
          updateData.aprobadoPorNombre = null
          updateData.motivoRechazo = null
          updateData.emailEnviado = false
          updateData.emailEnviadoA = null
          updateData.emailFechaEnvio = null
        }

        return tx.rendicionGasto.update({
          where: { id },
          data: {
            ...updateData,
            boletas: {
              create: (boletas || []).map((b: any) => ({
                descripcion: b.descripcion?.trim() || '',
                monto: Number(b.monto) || 0,
                fecha: b.fecha || null,
                nDocumento: b.nDocumento?.trim() || null,
                proveedor: b.proveedor?.trim() || null,
                notas: b.notas?.trim() || null,
                comprobante: b.comprobante || null,
                documento: b.documento || null,
                centroCostoId: b.centroCostoId || null,
                categoriaId: b.categoriaId || null,
              })),
            },
          },
          include: {
            boletas: {
              include: {
                centroCosto: { select: { id: true, nombre: true, codigo: true } },
                categoria: { select: { id: true, nombre: true, color: true } },
              },
            },
          },
        })
      })
    )

    // Si el admin editó una rendición finalizada, enviar correo con datos actualizados
    if (isAdmin && wasFinalized) {
      try {
        const full = await withRetry(() =>
          db.rendicionGasto.findUnique({
            where: { id },
            include: {
              responsable: { select: { id: true, nombre: true, cargo: true, email: true } },
              boletas: { include: { centroCosto: { select: { nombre: true } }, categoria: { select: { nombre: true } } } },
            },
          })
        )
        if (full) {
          const boletasPdf: BoletaPdfRow[] = full.boletas.map((b) => ({
            descripcion: b.descripcion, monto: b.monto, fecha: b.fecha,
            nDocumento: b.nDocumento, proveedor: b.proveedor,
            centroCosto: b.centroCosto?.nombre || null, categoria: b.categoria?.nombre || null,
            notas: b.notas, tieneComprobante: !!b.comprobante, tieneDocumento: !!b.documento,
          }))
          const pdfBuffer = generateRendicionGastoPdfBuffer({
            codigo: updated.codigo, periodo: updated.periodo, concepto: updated.concepto,
            descripcion: updated.descripcion, estado: updated.estado,
            montoTotal: updated.montoTotal, montoAsignado: updated.montoAsignado,
            fechaRendicion: updated.fechaRendicion ? String(updated.fechaRendicion) : null,
            fechaAprobacion: null, aprobadoPorNombre: null,
            responsableNombre: updated.responsableNombre, responsableCargo: full.responsable?.cargo || null,
            observaciones: updated.observaciones, motivoRechazo: null, boletas: boletasPdf,
          })
          const attachments: Array<{ filename: string; content: Buffer; contentType: string }> = [{
            filename: `Rendicion_${updated.codigo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
            content: pdfBuffer, contentType: 'application/pdf',
          }]
          for (let i = 0; i < full.boletas.length; i++) {
            const b = full.boletas[i]
            const label = b.descripcion ? b.descripcion.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_') : `boleta_${i + 1}`
            if (b.comprobante) {
              try {
                let b64 = b.comprobante; if (b64.startsWith('data:')) b64 = b64.substring(b64.indexOf(',') + 1)
                const ext = b.comprobante.startsWith('data:image/png') ? 'png' : 'jpg'
                attachments.push({ filename: `${label}_comprobante.${ext}`, content: Buffer.from(b64, 'base64'), contentType: ext === 'png' ? 'image/png' : 'image/jpeg' })
              } catch {}
            }
            if (b.documento) {
              try {
                let b64 = b.documento; if (b64.startsWith('data:')) b64 = b64.substring(b64.indexOf(',') + 1)
                const mime = b.documento.substring(5, b.documento.indexOf(';') || b.documento.indexOf(','))
                const extMap: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'application/pdf': 'pdf', 'application/msword': 'doc', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx', 'application/vnd.ms-excel': 'xls', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx' }
                const ext = extMap[mime] || 'bin'
                const mimeMap: Record<string, string> = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
                attachments.push({ filename: `${label}_documento.${ext}`, content: Buffer.from(b64, 'base64'), contentType: mimeMap[ext] || 'application/octet-stream' })
              } catch {}
            }
          }
          const boletasHtml = full.boletas.length > 0
            ? `<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:12px;"><tr style="background:#0f2040;color:#fff;"><th style="padding:6px;border:1px solid #e2e8f0;text-align:left;">#</th><th style="padding:6px;border:1px solid #e2e8f0;text-align:left;">Descripcion</th><th style="padding:6px;border:1px solid #e2e8f0;text-align:left;">Proveedor</th><th style="padding:6px;border:1px solid #e2e8f0;text-align:right;">Monto</th></tr>${full.boletas.map((b, i) => `<tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'};"><td style="padding:4px 6px;border:1px solid #e2e8f0;">${i + 1}</td><td style="padding:4px 6px;border:1px solid #e2e8f0;">${escapeHtml(b.descripcion || '-')}</td><td style="padding:4px 6px;border:1px solid #e2e8f0;">${escapeHtml(b.proveedor || '-')}</td><td style="padding:4px 6px;border:1px solid #e2e8f0;text-align:right;font-weight:bold;">$${Number(b.monto).toLocaleString('es-CL')}</td></tr>`).join('')}<tr style="background:#e2e8f0;font-weight:bold;"><td colspan="3" style="padding:6px;border:1px solid #e2e8f0;text-align:right;">TOTAL:</td><td style="padding:6px;border:1px solid #e2e8f0;text-align:right;">$${Number(updated.montoTotal).toLocaleString('es-CL')}</td></tr></table>`
            : '<p style="color:#64748b;">Sin boletas registradas.</p>'
          const bodyHtml = `
            <p>El administrador <strong>${escapeHtml(session.user.nombre + ' ' + (session.user.apellido || ''))}</strong> ha <strong style="color:#d97706;">modificado</strong> la siguiente rendicion y fue devuelta a revision:</p>
            <table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:13px;">
              <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;background:#f8fafc;width:35%;">Codigo</td><td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(updated.codigo)}</td></tr>
              <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;background:#f8fafc;">Concepto</td><td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(updated.concepto)}</td></tr>
              <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;background:#f8fafc;">Estado anterior</td><td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(existing.estado)}</td></tr>
              <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;background:#f8fafc;">Estado actual</td><td style="padding:8px;border:1px solid #e2e8f0;"><strong style="color:#d97706;">En Revision</strong></td></tr>
              <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;background:#f8fafc;">Monto Total</td><td style="padding:8px;border:1px solid #e2e8f0;"><strong>$${Number(updated.montoTotal).toLocaleString('es-CL')}</strong></td></tr>
              <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;background:#f8fafc;">Responsable</td><td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(updated.responsableNombre || '-')}</td></tr>
            </table>
            <p style="margin-top:16px;font-weight:bold;color:#0f2040;">Detalle de Boletas:</p>
            ${boletasHtml}
            <p style="color:#64748b;font-size:11px;margin-top:16px;">Este correo fue generado automaticamente por el Sistema de Condominios CyJ.</p>
          `
          const emailResult = await sendEmail({
            to: 'administracionlagunanorte@gmail.com',
            subject: `Rendicion Modificada (Devuelta a Revision) - ${updated.codigo} - ${updated.concepto}`,
            html: emailWrap('Rendicion de Gastos Modificada', 'Condominio Laguna Norte', bodyHtml),
            attachments,
          })
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
        }
      } catch (emailError) {
        console.error('[Rendiciones] Error enviando email tras edicion admin:', emailError)
      }
    }

    return apiSuccess(updated)
  } catch (error) {
    return handlePrismaError(error)
  }
}

// DELETE: eliminar rendición (solo Borrador, admin/supervisor)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession()
    if (!session) return apiError('No autenticado', 401)
    if (session.user.rol !== 'admin' && session.user.rol !== 'supervisor') {
      return apiError('Solo administradores o supervisores', 403)
    }

    const { id } = await params

    const existing = await withRetry(() =>
      db.rendicionGasto.findUnique({ where: { id } })
    )
    if (!existing) return apiError('Rendición no encontrada', 404)
    if (existing.estado !== 'Borrador') {
      return apiError('Solo se pueden eliminar rendiciones en estado Borrador')
    }

    await withRetry(() =>
      db.rendicionGasto.delete({ where: { id } })
    )

    return apiSuccess({ deleted: true })
  } catch (error) {
    return handlePrismaError(error)
  }
}
