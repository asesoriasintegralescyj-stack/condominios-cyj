import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ============================================
// POST - Calcular intereses para todas las deudas
// ============================================
export async function POST(request: NextRequest) {
  try {
    // Obtener configuración de morosidad
    let config = await db.configMorosidad.findFirst({
      where: { activo: true }
    })

    if (!config) {
      // Crear configuración por defecto
      config = await db.configMorosidad.create({
        data: {
          tasaInteresMensual: 1.5,
          tasaInteresDiario: 0.05,
          diasGracia: 10,
          maxDiasMora: 90,
          activo: true
        }
      })
    }

    // Obtener todas las deudas pendientes o parciales
    const deudas = await db.deuda.findMany({
      where: {
        estado: { in: ['Pendiente', 'Parcial'] }
      }
    })

    const hoy = new Date()
    let actualizadas = 0

    for (const deuda of deudas) {
      // Calcular días de mora
      let diasMora = 0
      if (deuda.fechaVencimiento) {
        const vencimiento = new Date(deuda.fechaVencimiento)
        const diff = hoy.getTime() - vencimiento.getTime()
        diasMora = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
      }

      // Calcular interés
      let montoInteres = 0
      if (diasMora > config.diasGracia) {
        const diasCobro = diasMora - config.diasGracia
        montoInteres = deuda.montoOriginal * (config.tasaInteresDiario / 100) * diasCobro
      }

      const montoTotal = deuda.montoOriginal + montoInteres

      // Actualizar deuda
      await db.deuda.update({
        where: { id: deuda.id },
        data: {
          diasMora,
          montoInteres,
          montoTotal
        }
      })

      actualizadas++
    }

    return NextResponse.json({ 
      message: `Se actualizaron ${actualizadas} deudas`,
      actualizadas,
      config: {
        tasaInteresMensual: config.tasaInteresMensual,
        tasaInteresDiario: config.tasaInteresDiario,
        diasGracia: config.diasGracia
      }
    })
  } catch (error) {
    console.error('Error calculating interests:', error)
    return NextResponse.json({ error: 'Error al calcular intereses' }, { status: 500 })
  }
}
