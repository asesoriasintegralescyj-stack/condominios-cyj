import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { apiSuccess, apiError, handlePrismaError } from '@/lib/api-helpers'

// ============================================================
// GET /api/rendicion-gastos — Listar rendiciones
// ============================================================
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return apiError('No autenticado', 401)

    const { searchParams } = new URL(request.url)
    const estado = searchParams.get('estado') || undefined
    const categoria = searchParams.get('categoria') || undefined
    const desde = searchParams.get('desde') || undefined
    const hasta = searchParams.get('hasta') || undefined
    const busqueda = searchParams.get('busqueda') || undefined
    const pagina = parseInt(searchParams.get('pagina') || '1')
    const porPagina = parseInt(searchParams.get('porPagina') || '20')

    const where: any = {}

    // Solo admin/supervisor ven todas; el resto ve solo las suyas
    if (user.rol !== 'admin' && user.rol !== 'supervisor') {
      where.userId = user.id
    }

    if (estado) where.estado = estado
    if (categoria) {
      where.items = { some: { categoria } }
    }
    if (desde || hasta) {
      where.createdAt = {}
      if (desde) where.createdAt.gte = new Date(desde)
      if (hasta) where.createdAt.lte = new Date(hasta + 'T23:59:59.999Z')
    }
    if (busqueda) {
      where.OR = [
        { titulo: { contains: busqueda, mode: 'insensitive' } },
        { numeroRendicion: { contains: busqueda, mode: 'insensitive' } },
      ]
    }

    const skip = (pagina - 1) * porPagina

    const [rendiciones, total] = await Promise.all([
      db.rendicionGasto.findMany({
        where,
        include: {
          user: { select: { id: true, nombre: true, apellido: true, email: true } },
          centroCosto: { select: { id: true, codigo: true, nombre: true } },
          items: {
            select: { id: true, descripcion: true, montoRendir: true, categoria: true, fechaGasto: true },
            orderBy: { fechaGasto: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: porPagina,
      }),
      db.rendicionGasto.count({ where }),
    ])

    // Recalcular montoTotal desde items
    const rendicionesConTotal = rendiciones.map(r => ({
      ...r,
      montoTotal: r.items.reduce((sum, item) => sum + item.montoRendir, 0),
    }))

    return apiSuccess({
      data: rendicionesConTotal,
      pagination: {
        pagina,
        porPagina,
        total,
        totalPaginas: Math.ceil(total / porPagina),
      },
    })
  } catch (error) {
    return handlePrismaError(error)
  }
}

// ============================================================
// POST /api/rendicion-gastos — Crear rendición
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return apiError('No autenticado', 401)

    const body = await request.json()
    const { titulo, descripcion, items, estado = 'BORRADOR', centroCostoId } = body

    if (!titulo || typeof titulo !== 'string' || titulo.trim().length === 0) {
      return apiError('El título es obligatorio')
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return apiError('Debe incluir al menos un gasto')
    }

    // Validar cada item
    for (const item of items) {
      if (!item.descripcion || !item.numeroBoleta || !item.montoRendir || !item.categoria || !item.fechaGasto) {
        return apiError('Cada gasto debe tener descripción, N° boleta, monto, categoría y fecha')
      }
      if (item.montoRendir <= 0) {
        return apiError('El monto a rendir debe ser mayor a 0')
      }
    }

    // Generar correlativo
    const ultimaRendicion = await db.rendicionGasto.findFirst({
      orderBy: { numeroRendicion: 'desc' },
      select: { numeroRendicion: true },
    })
    const ultimoNum = ultimaRendicion
      ? parseInt(ultimaRendicion.numeroRendicion.replace('RG-', '')) || 0
      : 0
    const numeroRendicion = `RG-${String(ultimoNum + 1).padStart(4, '0')}`

    // Calcular monto total
    const montoTotal = items.reduce((sum: number, item: any) => sum + (item.montoRendir || 0), 0)

    const rendicion = await db.rendicionGasto.create({
      data: {
        numeroRendicion,
        titulo: titulo.trim(),
        descripcion: descripcion?.trim() || null,
        estado: estado === 'ENVIADO' ? 'ENVIADO' : 'BORRADOR',
        montoTotal,
        userId: user.id,
        centroCostoId: centroCostoId || null,
        enviadoAt: estado === 'ENVIADO' ? new Date() : null,
        items: {
          create: items.map((item: any) => ({
            descripcion: item.descripcion.trim(),
            numeroBoleta: item.numeroBoleta.trim(),
            montoRendir: item.montoRendir,
            categoria: item.categoria,
            fechaGasto: new Date(item.fechaGasto),
            fotoBoletaUrl: item.fotoBoletaUrl || null,
            fotoCompraUrl: item.fotoCompraUrl || null,
          })),
        },
      },
      include: {
        user: { select: { id: true, nombre: true, apellido: true, email: true } },
        centroCosto: { select: { id: true, codigo: true, nombre: true } },
        items: true,
      },
    })

    // Crear notificación
    if (rendicion.estado === 'ENVIADO') {
      await db.notificacion.create({
        data: {
          titulo: 'Rendición Enviada',
          mensaje: `${user.nombre} ${user.apellido || ''} envió la rendición ${numeroRendicion} por ${new Intl.NumberFormat('es-CL').format(Math.round(montoTotal))} CLP`,
          tipo: 'INFO',
          categoria: 'rendicion',
          leido: false,
        },
      })
    }

    return apiSuccess(rendicion, 201)
  } catch (error) {
    return handlePrismaError(error)
  }
}
