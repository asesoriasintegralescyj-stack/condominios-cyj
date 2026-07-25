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
          db.proveedor.findMany({ orderBy: { nombre: 'asc' }, take }),
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
