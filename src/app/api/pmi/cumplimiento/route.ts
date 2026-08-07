/**
 * API: /api/pmi/cumplimiento
 *
 * Calcula el estado de cumplimiento del PMI para una fecha específica:
 *   - LVs programadas para esa fecha (según frecuencia: Diaria/Semanal/Quincenal/etc)
 *   - Registros existentes (de la tabla RegistroLV) para esa fecha
 *   - Lista de LVs FALTANTES (programadas pero sin registro)
 *
 * GET /api/pmi/cumplimiento                  → usa fecha de HOY (America/Santiago)
 * GET /api/pmi/cumplimiento?fecha=YYYY-MM-DD → usa fecha indicada (UTC-4 Santiago)
 *
 * Respuesta:
 *   {
 *     fecha: "2026-07-26",
 *     totalProgramadas: 7,
 *     totalCompletadas: 4,
 *     totalFaltantes: 3,
 *     porcentaje: 57,
 *     lvs: [
 *       { codigo, nombre, sector, frecuencia, responsable, estado: "Completado"|"Pendiente", hora: "08:12"|null }
 *     ]
 *   }
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'
import { leCorrespondeALaFecha } from '@/lib/pmi/lv-data'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/** Convierte un Date a "YYYY-MM-DD" en zona America/Santiago (UTC-4). */
function fechaSantiagoISO(d: Date): string {
  // America/Santiago = UTC-4 (horario estándar). Consideramos -4 fijo
  // (el DST de Chile está desactivado desde 2015 para la zona continental).
  const tzOffset = -4 * 60 // minutos
  const local = new Date(d.getTime() + tzOffset * 60 * 1000)
  return local.toISOString().slice(0, 10)
}

export async function GET(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  try {
    const searchParams = request.nextUrl.searchParams
    const fechaParam = searchParams.get('fecha') || ''

    let fechaISO: string
    let fechaDate: Date
    if (fechaParam && /^\d{4}-\d{2}-\d{2}$/.test(fechaParam)) {
      fechaISO = fechaParam
      // Construir Date al mediodía UTC para evitar problemas de zona
      const [a, m, d] = fechaParam.split('-').map(Number)
      fechaDate = new Date(Date.UTC(a, m - 1, d, 12, 0, 0))
    } else {
      fechaISO = fechaSantiagoISO(new Date())
      const [a, m, d] = fechaISO.split('-').map(Number)
      fechaDate = new Date(Date.UTC(a, m - 1, d, 12, 0, 0))
    }

    // Cargar todas las LVs activas
    const lvs = await db.listaVerificacion.findMany({
      where: { activa: true },
      orderBy: [{ codigo: 'asc' }],
    })

    // Filtrar las que le corresponden a la fecha según su frecuencia
    const lvsProgramadas = lvs.filter(lv =>
      leCorrespondeALaFecha(lv.frecuencia, fechaDate),
    )

    // Cargar registros existentes para esa fecha
    const registros = await db.registroLV.findMany({
      where: { fecha: fechaISO },
      select: {
        id: true,
        lvId: true,
        hora: true,
        estado: true,
        responsableEjecucion: true,
        createdAt: true,
      },
    })

    // Indexar registros por lvId (tomar el más reciente si hay varios)
    const registroPorLv: Record<string, typeof registros[number]> = {}
    for (const r of registros) {
      const existing = registroPorLv[r.lvId]
      if (!existing || (r.createdAt > existing.createdAt)) {
        registroPorLv[r.lvId] = r
      }
    }

    // Construir respuesta
    const lvsEstado = lvsProgramadas.map(lv => {
      const reg = registroPorLv[lv.id]
      const completado = !!reg && reg.estado !== 'Pendiente'
      return {
        id: lv.id,
        codigo: lv.codigo,
        nombre: lv.nombre,
        sector: lv.sector,
        frecuencia: lv.frecuencia,
        responsable: lv.responsable,
        estado: completado ? 'Completado' : 'Pendiente',
        hora: reg?.hora || (reg ? new Date(reg.createdAt).toISOString().slice(11, 16) : null),
        responsableEjecucion: reg?.responsableEjecucion || null,
        registroId: reg?.id || null,
      }
    })

    const totalProgramadas = lvsEstado.length
    const totalCompletadas = lvsEstado.filter(l => l.estado === 'Completado').length
    const totalFaltantes = totalProgramadas - totalCompletadas
    const porcentaje = totalProgramadas === 0 ? 100 : Math.round((totalCompletadas / totalProgramadas) * 100)

    return NextResponse.json({
      fecha: fechaISO,
      totalProgramadas,
      totalCompletadas,
      totalFaltantes,
      porcentaje,
      lvs: lvsEstado,
    })
  } catch (error) {
    console.error('Error calculando cumplimiento PMI:', error)
    return NextResponse.json({ error: 'Error calculando cumplimiento' }, { status: 500 })
  }
}
