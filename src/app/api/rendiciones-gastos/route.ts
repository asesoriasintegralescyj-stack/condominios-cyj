/**
 * API Rendiciones de Gastos - CRUD principal
 * 
 * GET  - Listar rendiciones (con filtros)
 * POST - Crear rendición con boletas
 */
import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError, handlePrismaError } from '@/lib/api-helpers'

const CONDOMINIO_LAGUNA_NORTE = 'cmo9f3x7j0000ktyeb0rzhwt9'

// GET - Listar rendiciones
export async function GET(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const estado = searchParams.get('estado') || ''
    const periodo = searchParams.get('periodo') || ''
    const responsableId = searchParams.get('responsableId') || ''

    const where: any = { condominioId: CONDOMINIO_LAGUNA_NORTE }

    // Filtro por rol:
    // - admin, supervisor: ven todas
    // - usuario, personal: solo las que crearon ellos
    if (session.user.rol !== 'admin' && session.user.rol !== 'supervisor') {
      where.responsableId = session.userId
    }

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

    const rendiciones = await withRetry(() =>
      db.rendicionGasto.findMany({
        where,
        orderBy: { createdAt: 'desc' },
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

    return NextResponse.json(rendiciones)
  } catch (error) {
    return handlePrismaError(error)
  }
}

// POST - Crear rendición con boletas
export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  try {
    const body = await request.json()
    const {
      periodo,
      concepto,
      descripcion,
      responsableId,
      responsableNombre,
      montoAsignado,
      observaciones,
      boletas,
    } = body

    if (!periodo || !concepto) {
      return apiError('Periodo y concepto son obligatorios', 400)
    }

    if (!boletas || !Array.isArray(boletas) || boletas.length === 0) {
      return apiError('Debe incluir al menos una boleta', 400)
    }

    // Verificar monto asignado si se especificó
    if (responsableId && montoAsignado && montoAsignado > 0) {
      const montoTotalBoletas = boletas.reduce((sum: number, b: any) => sum + (b.monto || 0), 0)
      if (montoTotalBoletas > montoAsignado) {
        return apiError(
          `El monto total de boletas ($${Math.round(montoTotalBoletas)}) excede el monto asignado ($${Math.round(montoAsignado)})`,
          400
        )
      }
    }

    // Generar correlativo
    const { generarCorrelativoDB } = await import('@/lib/utils')
    const codigo = await generarCorrelativoDB(db, 'RendicionGasto', 'RG', 4)

    // Calcular monto total
    const montoTotal = boletas.reduce((sum: number, b: any) => sum + (b.monto || 0), 0)

    // Crear rendición con boletas en transacción
    const rendicion = await withRetry(() =>
      db.rendicionGasto.create({
        data: {
          codigo,
          periodo,
          concepto,
          descripcion: descripcion || null,
          estado: 'Borrador',
          montoTotal,
          montoAsignado: montoAsignado || 0,
          responsableId: responsableId || null,
          responsableNombre: responsableNombre || null,
          observaciones: observaciones || null,
          condominioId: CONDOMINIO_LAGUNA_NORTE,
          boletas: {
            create: boletas.map((b: any) => ({
              descripcion: b.descripcion || '',
              monto: b.monto || 0,
              fecha: b.fecha || null,
              nDocumento: b.nDocumento || null,
              proveedor: b.proveedor || null,
              notas: b.notas || null,
              comprobante: b.comprobante || null,
              documento: b.documento || null,
              centroCostoId: b.centroCostoId || null,
              categoriaId: b.categoriaId || null,
            })),
          },
        },
        include: {
          responsable: { select: { id: true, nombre: true, cargo: true } },
          boletas: {
            include: {
              centroCosto: { select: { id: true, codigo: true, nombre: true } },
              categoria: { select: { id: true, nombre: true, color: true } },
            },
          },
        },
      })
    )

    return NextResponse.json(rendicion, { status: 201 })
  } catch (error) {
    return handlePrismaError(error)
  }
}
