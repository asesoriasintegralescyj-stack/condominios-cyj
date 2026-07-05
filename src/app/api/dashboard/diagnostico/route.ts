import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'

/**
 * Diagnóstico: ejecuta cada query del dashboard por separado
 * para identificar cuál falla. Solo admin.
 */
export async function GET() {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  if (session.user.rol !== 'admin') {
    return NextResponse.json({ error: 'Solo admin' }, { status: 403 })
  }

  const results: Record<string, any> = {}

  const tests: Array<[string, () => Promise<any>]> = [
    ['personal.count', () => db.personal.count()],
    ['activo.count', () => db.activo.count()],
    ['activo.aggregate', () => db.activo.aggregate({ _sum: { valorActual: true } })],
    ['cajaChica.findFirst', () => db.cajaChica.findFirst()],
    ['centroCostoMaster.count', () => db.centroCostoMaster.count()],
    ['ordenTrabajo.groupBy_estado', () => db.ordenTrabajo.groupBy({ by: ['estado'], _count: true })],
    ['ordenTrabajo.groupBy_aprobacion', () => db.ordenTrabajo.groupBy({ by: ['estadoAprobacion'], where: { estado: 'Completado' }, _count: true })],
    ['ordenTrabajo.count_completadas', () => db.ordenTrabajo.count({ where: { estado: 'Completado' } })],
    ['ordenTrabajo.findMany_recent', () => db.ordenTrabajo.findMany({
      include: {
        propiedad: { select: { id: true, nombre: true } },
        asignado: { select: { id: true, nombre: true, cargo: true } },
        centroCosto: { select: { id: true, codigo: true, nombre: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    })],
    ['documentoCumplimiento.findMany', () => db.documentoCumplimiento.findMany({
      select: { id: true, titulo: true, estado: true, cumple: true, fechaVencimiento: true, categoriaId: true },
    })],
    ['resumenCumplimiento.findFirst', () => db.resumenCumplimiento.findFirst()],
    ['solicitudCompra.groupBy', () => db.solicitudCompra.groupBy({ by: ['estado'], _count: true })],
    ['solicitudCompra.count', () => db.solicitudCompra.count()],
    ['solicitudCompra.aggregate', () => db.solicitudCompra.aggregate({ _sum: { totalEstimado: true } })],
    ['solicitudCompra.findMany', () => db.solicitudCompra.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, codigo: true, titulo: true, estado: true, prioridad: true, totalEstimado: true, emailEnviado: true, createdAt: true, origenCodigo: true },
    })],
    ['centroCostoMaster.findMany', () => db.centroCostoMaster.findMany()],
  ]

  for (const [name, fn] of tests) {
    try {
      const start = Date.now()
      const result = await fn()
      const elapsed = Date.now() - start
      results[name] = {
        ok: true,
        elapsed_ms: elapsed,
        type: Array.isArray(result) ? `array[${result.length}]` : (result && typeof result === 'object' ? 'object' : typeof result),
      }
    } catch (e: any) {
      results[name] = {
        ok: false,
        error: e?.message || String(e),
        code: e?.code,
        name: e?.name,
      }
    }
  }

  return NextResponse.json(results)
}
