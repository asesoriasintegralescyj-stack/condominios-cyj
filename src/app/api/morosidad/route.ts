import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ============================================
// HELPER FUNCTIONS
// ============================================
function formatCLP(n: number) {
  return '$' + new Intl.NumberFormat('es-CL').format(Math.round(n || 0))
}

function calcularDiasMora(fechaVencimiento: string | null): number {
  if (!fechaVencimiento) return 0
  const hoy = new Date()
  const vencimiento = new Date(fechaVencimiento)
  const diff = hoy.getTime() - vencimiento.getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

// ============================================
// GET - Listar deudas con estadísticas
// ============================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const residenteId = searchParams.get('residenteId')
    const estado = searchParams.get('estado')
    const periodo = searchParams.get('periodo')

    // Build where clause
    const where: Record<string, unknown> = {}
    if (residenteId) where.residenteId = residenteId
    if (estado && estado !== 'todos') where.estado = estado
    if (periodo && periodo !== 'todos') where.periodo = periodo

    // Obtener deudas de la tabla Deuda
    const deudas = await db.deuda.findMany({
      where,
      include: {
        residente: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            unidad: true,
            etapa: true,
            telefono: true,
            email: true
          }
        }
      },
      orderBy: [
        { diasMora: 'desc' },
        { periodo: 'desc' }
      ]
    })

    // Calcular estadísticas
    const deudasPendientes = deudas.filter(d => d.estado === 'Pendiente' || d.estado === 'Parcial')
    const totalMorosidad = deudasPendientes.reduce((sum, d) => sum + d.montoTotal, 0)
    const residentesMorosos = new Set(deudasPendientes.map(d => d.residenteId).filter(Boolean)).size
    
    // Intereses generados este mes
    const mesActual = new Date().toISOString().slice(0, 7)
    const interesesMes = deudas
      .filter(d => d.periodo === mesActual)
      .reduce((sum, d) => sum + d.montoInteres, 0)

    // Rangos de días de mora
    const rango130 = deudasPendientes.filter(d => d.diasMora > 0 && d.diasMora <= 30).length
    const rango3160 = deudasPendientes.filter(d => d.diasMora > 30 && d.diasMora <= 60).length
    const rango60mas = deudasPendientes.filter(d => d.diasMora > 60).length

    // Formatear respuesta
    const deudasFormatted = deudas.map(d => ({
      id: d.id,
      tipo: d.tipo,
      periodo: d.periodo,
      concepto: d.concepto,
      montoOriginal: d.montoOriginal,
      montoInteres: d.montoInteres,
      montoTotal: d.montoTotal,
      diasMora: d.diasMora,
      estado: d.estado,
      fechaVencimiento: d.fechaVencimiento,
      notas: d.notas,
      residenteId: d.residenteId,
      residente: d.residente,
      createdAt: d.createdAt.toISOString()
    }))

    return NextResponse.json({
      deudas: deudasFormatted,
      stats: {
        totalMorosidad,
        deudasPendientes: deudasPendientes.length,
        residentesMorosos,
        interesesMes,
        rango130,
        rango3160,
        rango60mas
      }
    })
  } catch (error) {
    console.error('Error fetching morosidad:', error)
    return NextResponse.json({ error: 'Error al obtener morosidad' }, { status: 500 })
  }
}

// ============================================
// POST - Crear nueva deuda
// ============================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tipo, periodo, concepto, montoOriginal, residenteId, fechaVencimiento, notas } = body

    // Validaciones básicas
    if (!periodo || !concepto || montoOriginal <= 0) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    // Obtener configuración de morosidad
    let config = await db.configMorosidad.findFirst({
      where: { activo: true }
    })

    if (!config) {
      // Crear configuración por defecto si no existe
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

    // Calcular días de mora
    const diasMora = calcularDiasMora(fechaVencimiento)

    // Calcular interés
    let montoInteres = 0
    if (diasMora > config.diasGracia) {
      const diasCobro = diasMora - config.diasGracia
      montoInteres = montoOriginal * (config.tasaInteresDiario / 100) * diasCobro
    }

    const montoTotal = montoOriginal + montoInteres

    // Crear deuda
    const deuda = await db.deuda.create({
      data: {
        tipo: tipo || 'GastoComun',
        periodo,
        concepto,
        montoOriginal,
        montoInteres,
        montoTotal,
        diasMora,
        estado: 'Pendiente',
        fechaVencimiento: fechaVencimiento || null,
        notas: notas || null,
        residenteId: residenteId || null
      },
      include: {
        residente: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            unidad: true,
            etapa: true,
            telefono: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({ deuda })
  } catch (error) {
    console.error('Error creating deuda:', error)
    return NextResponse.json({ error: 'Error al crear deuda' }, { status: 500 })
  }
}

// ============================================
// PUT - Actualizar deuda
// ============================================
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, tipo, periodo, concepto, montoOriginal, residenteId, fechaVencimiento, notas, estado } = body

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    // Obtener configuración
    const config = await db.configMorosidad.findFirst({
      where: { activo: true }
    })

    // Calcular días de mora
    const diasMora = calcularDiasMora(fechaVencimiento)

    // Calcular interés
    let montoInteres = 0
    if (config && diasMora > config.diasGracia && montoOriginal) {
      const diasCobro = diasMora - config.diasGracia
      montoInteres = montoOriginal * (config.tasaInteresDiario / 100) * diasCobro
    }

    const montoTotal = (montoOriginal || 0) + montoInteres

    // Actualizar deuda
    const deuda = await db.deuda.update({
      where: { id },
      data: {
        tipo,
        periodo,
        concepto,
        montoOriginal,
        montoInteres,
        montoTotal,
        diasMora,
        estado: estado || 'Pendiente',
        fechaVencimiento: fechaVencimiento || null,
        notas: notas || null,
        residenteId: residenteId || null
      },
      include: {
        residente: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            unidad: true,
            etapa: true,
            telefono: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({ deuda })
  } catch (error) {
    console.error('Error updating deuda:', error)
    return NextResponse.json({ error: 'Error al actualizar deuda' }, { status: 500 })
  }
}

// ============================================
// DELETE - Eliminar deuda
// ============================================
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    await db.deuda.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting deuda:', error)
    return NextResponse.json({ error: 'Error al eliminar deuda' }, { status: 500 })
  }
}
