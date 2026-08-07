import { NextRequest } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError, apiSuccess, handlePrismaError } from '@/lib/api-helpers'
import { generarCorrelativoDB } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const CONDOMINIO_LAGUNA_NORTE = 'cmo9f3x7j0000ktyeb0rzhwt9'

// GET: listar rendiciones con filtros
export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession()
    if (!session) return apiError('No autenticado', 401)

    const { searchParams } = new URL(req.url)
    const estado = searchParams.get('estado') || undefined
    const periodo = searchParams.get('periodo') || undefined
    const search = searchParams.get('search') || undefined
    const responsableId = searchParams.get('responsableId') || undefined

    const where: any = { condominioId: CONDOMINIO_LAGUNA_NORTE }

    if (estado) where.estado = estado
    if (periodo) where.periodo = periodo
    if (responsableId) where.responsableId = responsableId
    if (search) {
      where.OR = [
        { codigo: { contains: search, mode: 'insensitive' } },
        { concepto: { contains: search, mode: 'insensitive' } },
        { responsableNombre: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Solo admin/supervisor ven todas; otros solo las suyas
    const isAdminOrSup = session.user.rol === 'admin' || session.user.rol === 'supervisor'
    if (!isAdminOrSup) {
      where.responsableId = session.user.id
    }

    const rendiciones = await withRetry(() =>
      db.rendicionGasto.findMany({
        where,
        include: {
          responsable: { select: { id: true, nombre: true, cargo: true } },
          boletas: { include: { centroCosto: { select: { id: true, nombre: true, codigo: true } }, categoria: { select: { id: true, nombre: true, color: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      })
    )
    return apiSuccess(rendiciones)
  } catch (error) {
    return handlePrismaError(error)
  }
}

// POST: crear rendición con boletas
export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession()
    if (!session) return apiError('No autenticado', 401)

    const body = await req.json()
    const { periodo, concepto, descripcion, responsableId, responsableNombre, observaciones, boletas } = body

    if (!periodo?.trim()) return apiError('El período es obligatorio')
    if (!concepto?.trim()) return apiError('El concepto es obligatorio')

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

    const codigo = await generarCorrelativoDB(db, 'RendicionGasto', 'RG', 4)

    const rendicion = await withRetry(() =>
      db.rendicionGasto.create({
        data: {
          codigo,
          periodo: periodo.trim(),
          concepto: concepto.trim(),
          descripcion: descripcion?.trim() || null,
          montoTotal,
          montoAsignado,
          responsableId: responsableId || null,
          responsableNombre: responsableNombre || null,
          observaciones: observaciones?.trim() || null,
          condominioId: CONDOMINIO_LAGUNA_NORTE,
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
          boletas: { include: { centroCosto: { select: { id: true, nombre: true, codigo: true } }, categoria: { select: { id: true, nombre: true, color: true } } } },
        },
      })
    )
    return apiSuccess(rendicion, 201)
  } catch (error) {
    return handlePrismaError(error)
  }
}
