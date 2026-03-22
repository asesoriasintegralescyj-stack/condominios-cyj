import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Listar gastos comunes
export async function GET() {
  try {
    const gastos = await db.gastoComun.findMany({
      include: {
        detalles: true,
        pagos: {
          include: {
            residente: {
              select: { nombre: true, unidad: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calcular estadísticas
    let totalCobrado = 0
    let totalPendiente = 0
    let totalVencido = 0

    gastos.forEach(g => {
      const cobrado = g.pagos?.reduce((sum, p) => sum + p.monto, 0) || 0
      if (g.estado === 'Pagado') {
        totalCobrado += cobrado
      } else if (g.estado === 'Vencido') {
        totalVencido += g.totalCobrar - cobrado
      } else {
        totalPendiente += g.totalCobrar - cobrado
      }
    })

    return NextResponse.json({
      gastos,
      stats: {
        totalPeriodos: gastos.length,
        totalCobrado,
        totalPendiente,
        totalVencido
      }
    })
  } catch (error) {
    console.error('Error fetching gastos comunes:', error)
    return NextResponse.json({ error: 'Error al obtener gastos comunes' }, { status: 500 })
  }
}

// POST - Crear gasto común
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { detalles, ...gastoData } = data

    const gastoComun = await db.gastoComun.create({
      data: {
        periodo: gastoData.periodo,
        fechaEmision: gastoData.fechaEmision,
        fechaVencimiento: gastoData.fechaVencimiento,
        totalGastos: gastoData.totalGastos || 0,
        totalCobrar: gastoData.totalCobrar || 0,
        montoPorUnidad: gastoData.montoPorUnidad || 0,
        notas: gastoData.notas,
        estado: 'Pendiente'
      }
    })

    // Crear detalles si existen
    if (detalles && detalles.length > 0) {
      await db.detalleGastoComun.createMany({
        data: detalles.map((d: { concepto: string; categoria: string; monto: number; centroCosto?: string; notas?: string }) => ({
          concepto: d.concepto,
          categoria: d.categoria,
          monto: d.monto,
          centroCosto: d.centroCosto,
          notas: d.notas,
          gastoComunId: gastoComun.id
        }))
      })
    }

    return NextResponse.json(gastoComun)
  } catch (error) {
    console.error('Error creating gasto común:', error)
    return NextResponse.json({ error: 'Error al crear gasto común' }, { status: 500 })
  }
}
