import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'
import { leCorrespondeALaFecha } from '@/lib/pmi/lv-data'

// GET - Calendario mensual de LVs programadas
// ?mes=YYYY-MM → devuelve { "YYYY-MM-DD": [lvs programadas] } para todo el mes
// Si no se pasa mes, se usa el mes actual.
export async function GET(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  try {
    const searchParams = request.nextUrl.searchParams
    const mesParam = searchParams.get('mes') || ''

    let anio: number
    let mes: number // 0-indexed
    if (mesParam && /^\d{4}-\d{2}$/.test(mesParam)) {
      const [a, m] = mesParam.split('-').map(Number)
      anio = a
      mes = m - 1
    } else {
      const ahora = new Date()
      anio = ahora.getFullYear()
      mes = ahora.getMonth()
    }

    // Cargar todas las LVs activas
    const lvs = await db.listaVerificacion.findMany({
      where: { activa: true },
      orderBy: [{ codigo: 'asc' }],
    })

    // Construir calendario: para cada día del mes, filtrar las LVs que corresponden
    const calendario: Record<string, any[]> = {}
    const diasEnMes = new Date(anio, mes + 1, 0).getDate()

    for (let dia = 1; dia <= diasEnMes; dia++) {
      const fecha = new Date(anio, mes, dia)
      const fechaStr = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`

      const lvsDelDia = lvs
        .filter(lv => leCorrespondeALaFecha(lv.frecuencia, fecha))
        .map(lv => ({
          id: lv.id,
          codigo: lv.codigo,
          nombre: lv.nombre,
          sector: lv.sector,
          frecuencia: lv.frecuencia,
          responsable: lv.responsable,
        }))

      if (lvsDelDia.length > 0) {
        calendario[fechaStr] = lvsDelDia
      }
    }

    // Adjuntar registros ya existentes para el mes (para marcar días completados)
    const fechaInicio = `${anio}-${String(mes + 1).padStart(2, '0')}-01`
    const fechaFin = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(diasEnMes).padStart(2, '0')}`

    const registros = await db.registroLV.findMany({
      where: {
        fecha: { gte: fechaInicio, lte: fechaFin },
      },
      select: {
        id: true,
        lvId: true,
        fecha: true,
        estado: true,
        responsableEjecucion: true,
      },
    })

    // Indexar registros por fecha
    const registrosPorFecha: Record<string, any[]> = {}
    for (const r of registros) {
      if (!registrosPorFecha[r.fecha]) registrosPorFecha[r.fecha] = []
      registrosPorFecha[r.fecha].push(r)
    }

    return NextResponse.json({
      mes: `${anio}-${String(mes + 1).padStart(2, '0')}`,
      calendario,
      registros: registrosPorFecha,
      totalLvs: lvs.length,
      totalDiasConLVs: Object.keys(calendario).length,
    })
  } catch (error) {
    console.error('Error generando calendario PMI:', error)
    return NextResponse.json({ error: 'Error generando calendario' }, { status: 500 })
  }
}
