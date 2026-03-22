import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Obtener gasto común por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const gasto = await db.gastoComun.findUnique({
      where: { id },
      include: {
        detalles: true,
        pagos: {
          include: {
            residente: {
              select: { nombre: true, unidad: true }
            }
          }
        }
      }
    })

    if (!gasto) {
      return NextResponse.json({ error: 'Gasto común no encontrado' }, { status: 404 })
    }

    return NextResponse.json(gasto)
  } catch (error) {
    console.error('Error fetching gasto común:', error)
    return NextResponse.json({ error: 'Error al obtener gasto común' }, { status: 500 })
  }
}

// PUT - Actualizar gasto común
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await request.json()
    const { detalles, ...gastoData } = data

    // Actualizar gasto común
    const gasto = await db.gastoComun.update({
      where: { id },
      data: {
        periodo: gastoData.periodo,
        fechaEmision: gastoData.fechaEmision,
        fechaVencimiento: gastoData.fechaVencimiento,
        totalGastos: gastoData.totalGastos,
        totalCobrar: gastoData.totalCobrar,
        montoPorUnidad: gastoData.montoPorUnidad,
        notas: gastoData.notas
      }
    })

    // Actualizar detalles
    if (detalles) {
      // Eliminar detalles existentes
      await db.detalleGastoComun.deleteMany({
        where: { gastoComunId: id }
      })
      
      // Crear nuevos detalles
      await db.detalleGastoComun.createMany({
        data: detalles.map((d: { concepto: string; categoria: string; monto: number; centroCosto?: string; notas?: string }) => ({
          concepto: d.concepto,
          categoria: d.categoria,
          monto: d.monto,
          centroCosto: d.centroCosto,
          notas: d.notas,
          gastoComunId: id
        }))
      })
    }

    return NextResponse.json(gasto)
  } catch (error) {
    console.error('Error updating gasto común:', error)
    return NextResponse.json({ error: 'Error al actualizar gasto común' }, { status: 500 })
  }
}

// DELETE - Eliminar gasto común
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Eliminar detalles primero
    await db.detalleGastoComun.deleteMany({
      where: { gastoComunId: id }
    })
    
    // Eliminar pagos
    await db.pagoGastoComun.deleteMany({
      where: { gastoComunId: id }
    })
    
    // Eliminar gasto común
    await db.gastoComun.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting gasto común:', error)
    return NextResponse.json({ error: 'Error al eliminar gasto común' }, { status: 500 })
  }
}
