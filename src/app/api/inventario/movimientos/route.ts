import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET - Listar movimientos de inventario
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const [movimientos, total] = await Promise.all([
      db.movimientoInventario.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.movimientoInventario.count(),
    ])

    return NextResponse.json({
      movimientos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching movimientos:', error)
    return NextResponse.json({ error: 'Error al obtener movimientos' }, { status: 500 })
  }
}

// POST - Crear movimiento de inventario
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { tipo, materialId, materialCodigo, materialNombre, cantidad, stockAnterior, stockNuevo, motivo, referencia, referenciaId, observaciones, condominioId } = body

    const movimiento = await db.movimientoInventario.create({
      data: {
        tipo,
        materialId,
        materialCodigo,
        materialNombre,
        cantidad,
        stockAnterior,
        stockNuevo,
        motivo,
        referencia,
        referenciaId,
        observaciones,
        condominioId,
        usuarioId: user.id,
        usuarioNombre: `${user.nombre} ${user.apellido || ''}`.trim(),
      },
    })

    return NextResponse.json(movimiento)
  } catch (error) {
    console.error('Error creating movimiento:', error)
    return NextResponse.json({ error: 'Error al crear movimiento' }, { status: 500 })
  }
}
