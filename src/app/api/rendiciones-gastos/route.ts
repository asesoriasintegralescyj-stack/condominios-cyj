<<<<<<< HEAD
import { NextRequest } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError, apiSuccess, handlePrismaError } from '@/lib/api-helpers'
import { generarCorrelativoDB } from '@/lib/utils'

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
=======
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

>>>>>>> 4585c06d3f055df9c7b5541ddeae5adb8114b7b5
    if (search) {
      where.OR = [
        { codigo: { contains: search, mode: 'insensitive' } },
        { concepto: { contains: search, mode: 'insensitive' } },
        { responsableNombre: { contains: search, mode: 'insensitive' } },
      ]
    }

<<<<<<< HEAD
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
=======
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
>>>>>>> 4585c06d3f055df9c7b5541ddeae5adb8114b7b5
  } catch (error) {
    return handlePrismaError(error)
  }
}

<<<<<<< HEAD
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

=======
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
>>>>>>> 4585c06d3f055df9c7b5541ddeae5adb8114b7b5
    const rendicion = await withRetry(() =>
      db.rendicionGasto.create({
        data: {
          codigo,
<<<<<<< HEAD
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
=======
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
>>>>>>> 4585c06d3f055df9c7b5541ddeae5adb8114b7b5
              comprobante: b.comprobante || null,
              documento: b.documento || null,
              centroCostoId: b.centroCostoId || null,
              categoriaId: b.categoriaId || null,
            })),
          },
        },
        include: {
<<<<<<< HEAD
          boletas: { include: { centroCosto: { select: { id: true, nombre: true, codigo: true } }, categoria: { select: { id: true, nombre: true, color: true } } } },
        },
      })
    )
    return apiSuccess(rendicion, 201)
=======
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
>>>>>>> 4585c06d3f055df9c7b5541ddeae5adb8114b7b5
  } catch (error) {
    return handlePrismaError(error)
  }
}
