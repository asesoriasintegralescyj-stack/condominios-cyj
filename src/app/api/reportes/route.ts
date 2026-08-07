import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/reportes?tipo=xxx
 * Retorna datos para generar reportes según el tipo solicitado.
 * Requiere permiso 'reportes.ver'.
 *
 * Tipos soportados:
 *   propiedades, personal, activos, ot, proveedores, centrocostos,
 *   proyectos, inspecciones, rondas, solicitudescompra, asistencia, auditoria
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession()
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo') || ''

    const take = Math.min(parseInt(searchParams.get('limit') || '500', 10) || 500, 1000)

    switch (tipo) {
      case 'propiedades':
        return await queryReport(() =>
          db.propiedad.findMany({ orderBy: { nombre: 'asc' }, take }),
        )

      case 'personal':
        return await queryReport(() =>
          db.personal.findMany({ orderBy: { nombre: 'asc' }, take }),
        )

      case 'activos':
        return await queryReport(() =>
          db.activo.findMany({ orderBy: { nombre: 'asc' }, take }),
        )

      case 'ot':
        return await queryReport(() =>
          db.ordenTrabajo.findMany({ orderBy: { createdAt: 'desc' }, take }),
        )

      case 'proveedores':
        return await queryReport(() =>
          db.proveedor.findMany({ orderBy: { razonSocial: 'asc' }, take }),
        )

      case 'centrocostos':
        return await queryReport(() =>
          db.centroCostoMaster.findMany({ orderBy: { nombre: 'asc' }, take }),
        )

      case 'proyectos':
        return await queryReport(() =>
          db.proyecto.findMany({ orderBy: { createdAt: 'desc' }, take }),
        )

      case 'inspecciones':
        return await queryReport(() =>
          db.inspeccion.findMany({ orderBy: { fecha: 'desc' }, take }),
        )

      case 'rondas':
        return await queryReport(async () => {
          const scans = await withRetry(() =>
            db.movilQrScan.findMany({
              orderBy: { createdAt: 'desc' },
              take,
            }),
          )
          // Hidratar con ubicaciones (sin @relation)
          const locCache = new Map<string, any>()
          const hydrated = await Promise.all(
            scans.map(async (s) => {
              let loc = locCache.get(s.qrLocationId)
              if (!loc) {
                try {
                  loc = await withRetry(() =>
                    db.movilQrLocation.findUnique({
                      where: { id: s.qrLocationId },
                      select: { id: true, name: true, location: true, code: true },
                    }),
                  )
                } catch { loc = null }
                locCache.set(s.qrLocationId, loc)
              }
              return { ...s, location: loc }
            }),
          )
          return hydrated
        })

      case 'solicitudescompra':
        return await queryReport(() =>
          db.solicitudCompra.findMany({ orderBy: { createdAt: 'desc' }, take }),
        )

      case 'asistencia':
        return await queryReport(() =>
          db.asistencia.findMany({ orderBy: { fecha: 'desc' }, take }),
        )

      case 'auditoria':
        return await queryReport(() =>
          db.logAuditoria.findMany({ orderBy: { createdAt: 'desc' }, take }),
        )

      case 'patentes':
        return await queryReport(() =>
          db.movilPatente.findMany({ orderBy: { entradaAt: 'desc' }, take }),
        )

      case 'aprobacionesot':
        return await queryReport(() =>
          db.historialAprobacionOT.findMany({ orderBy: { createdAt: 'desc' }, take }),
        )

      case 'pmi':
        return await queryReport(async () => {
          const lvs = await withRetry(() =>
            db.listaVerificacion.findMany({
              where: { activa: true },
              orderBy: { codigo: 'asc' },
              take,
            }),
          )
          return lvs.map((lv) => {
            let cantidadItems = 0
            try {
              const items = JSON.parse(lv.items || '[]')
              cantidadItems = Array.isArray(items)
                ? items.reduce(
                    (acc: number, s: any) =>
                      acc + (Array.isArray(s?.items) ? s.items.length : 0),
                    0,
                  )
                : 0
            } catch {}
            return {
              id: lv.id,
              codigo: lv.codigo,
              nombre: lv.nombre,
              sector: lv.sector || '',
              categoria: lv.sector || '',
              frecuencia: lv.frecuencia || '',
              responsable: lv.responsable || '',
              personalRequerido: lv.personalRequerido || '',
              descripcion: lv.descripcion || '',
              activa: lv.activa,
              cantidadItems,
              createdAt: lv.createdAt,
            }
          })
        })

      case 'cumplimiento':
        return await queryReport(() =>
          db.documentoCumplimiento.findMany({ orderBy: { createdAt: 'desc' }, take }),
        )

      case 'inventario':
        return await queryReport(() =>
          db.movimientoInventario.findMany({ orderBy: { createdAt: 'desc' }, take }),
        )

      case 'materiales':
        return await queryReport(() =>
          db.catMaterial.findMany({ orderBy: { nombre: 'asc' }, take }),
        )

      case 'tareas':
        return await queryReport(() =>
          db.catTarea.findMany({ orderBy: { nombre: 'asc' }, take }),
        )

      case 'herramientas':
        return await queryReport(() =>
          db.catHerramienta.findMany({ orderBy: { nombre: 'asc' }, take }),
        )

      default:
        return NextResponse.json({ error: 'Tipo de reporte no válido' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error generando reporte:', error)
    return NextResponse.json({ error: 'Error al generar reporte' }, { status: 500 })
  }
}

async function queryReport(fn: () => Promise<any>) {
  try {
    const data = await fn()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error en query de reporte:', error)
    return NextResponse.json([])
  }
}
