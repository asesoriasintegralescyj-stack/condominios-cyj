import { NextRequest } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { generateRendicionGastoPdfBuffer, type BoletaPdfRow } from '@/lib/pdf-rendicion-gasto'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession()
    if (!session) return new Response('No autenticado', { status: 401 })

    const { id } = await params

    const rendicion = await withRetry(() =>
      db.rendicionGasto.findUnique({
        where: { id },
        include: {
          responsable: { select: { id: true, nombre: true, cargo: true, email: true } },
          boletas: {
            include: {
              centroCosto: { select: { nombre: true } },
              categoria: { select: { nombre: true } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      })
    )

    if (!rendicion) return new Response('Rendicion no encontrada', { status: 404 })

    const boletasPdf: BoletaPdfRow[] = rendicion.boletas.map((b) => ({
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
      codigo: rendicion.codigo,
      periodo: rendicion.periodo,
      concepto: rendicion.concepto,
      descripcion: rendicion.descripcion,
      estado: rendicion.estado,
      montoTotal: rendicion.montoTotal,
      montoAsignado: rendicion.montoAsignado,
      fechaRendicion: rendicion.fechaRendicion ? String(rendicion.fechaRendicion) : null,
      fechaAprobacion: rendicion.fechaAprobacion ? String(rendicion.fechaAprobacion) : null,
      aprobadoPorNombre: rendicion.aprobadoPorNombre,
      responsableNombre: rendicion.responsableNombre,
      responsableCargo: rendicion.responsable?.cargo || null,
      observaciones: rendicion.observaciones,
      motivoRechazo: rendicion.motivoRechazo,
      boletas: boletasPdf,
    })

    const filename = `Rendicion_${rendicion.codigo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('[Rendiciones PDF] Error:', error)
    return new Response('Error generando PDF', { status: 500 })
  }
}
