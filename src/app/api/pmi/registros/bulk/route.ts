import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// POST - Operación masiva sobre registros de un día
// Body: { fecha: 'YYYY-MM-DD', lvIds?: string[], accion: 'completar' | 'desmarcar' | 'eliminar' }
export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  try {
    const { fecha, lvIds, accion } = await request.json()

    if (!fecha || !accion) {
      return apiError('fecha y accion son requeridos', 400)
    }

    // Buscar registros existentes para esa fecha
    const where: any = { fecha }
    if (lvIds && Array.isArray(lvIds) && lvIds.length > 0) {
      where.lvId = { in: lvIds }
    }

    const registrosExistentes = await db.registroLV.findMany({ where })

    let afectados = 0

    if (accion === 'completar') {
      // Para cada LV del día que NO tenga registro, crear uno con estado Completado
      // Para cada LV del día que SÍ tenga registro pero estado != Completado, actualizarlo
      const existingMap = new Map(registrosExistentes.map(r => [r.lvId, r]))

      // Obtener las LVs programadas para esa fecha
      // Calcular qué LVs tocan ese día
      const [y, m, d] = fecha.split('-').map(Number)
      const date = new Date(y, m - 1, d)
      const dayOfWeek = date.getDay() // 0=Dom, 1=Lun, ..., 6=Sab
      const dayOfMonth = d
      const month = m
      const allLvs = await db.listaVerificacion.findMany({ where: { activa: true } })

      const lvsDelDia = allLvs.filter(lv => {
        const f = lv.frecuencia
        if (f === 'Diaria') return true
        if (f === 'Semanal') return dayOfWeek === 1 // Lunes
        if (f === 'Quincenal') return dayOfMonth === 1 || dayOfMonth === 15
        if (f === 'Mensual') return dayOfMonth === 1
        if (f === 'Trimestral') return dayOfMonth === 1 && [1, 4, 7, 10].includes(month)
        if (f === 'Semestral') return dayOfMonth === 1 && [1, 7].includes(month)
        if (f === 'Anual') return dayOfMonth === 1 && month === 1
        return false
      })

      // Filtrar por lvIds si se especificó
      const lvsAProcesar = lvIds && lvIds.length > 0
        ? lvsDelDia.filter(lv => lvIds.includes(lv.id))
        : lvsDelDia

      for (const lv of lvsAProcesar) {
        const existente = existingMap.get(lv.id)
        if (existente) {
          if (existente.estado !== 'Completado') {
            await db.registroLV.update({
              where: { id: existente.id },
              data: {
                estado: 'Completado',
                responsableEjecucion: session.user.nombre,
                hora: new Date().toTimeString().substring(0, 5),
              },
            })
            afectados++
          }
        } else {
          await db.registroLV.create({
            data: {
              lvId: lv.id,
              fecha,
              hora: new Date().toTimeString().substring(0, 5),
              responsableEjecucion: session.user.nombre,
              estado: 'Completado',
              itemsCompletados: JSON.stringify([]),
            },
          })
          afectados++
        }
      }
    } else if (accion === 'desmarcar') {
      // Cambiar todos los registros Completados de esa fecha a Pendiente
      const result = await db.registroLV.updateMany({
        where: { ...where, estado: 'Completado' },
        data: { estado: 'Pendiente' },
      })
      afectados = result.count
    } else if (accion === 'eliminar') {
      // Eliminar todos los registros de esa fecha
      const result = await db.registroLV.deleteMany({ where })
      afectados = result.count
    } else {
      return apiError('accion inválida. Use: completar | desmarcar | eliminar', 400)
    }

    return NextResponse.json({
      success: true,
      accion,
      fecha,
      afectados,
    })
  } catch (error) {
    console.error('Error bulk registros LV:', error)
    return NextResponse.json({ error: 'Error bulk operation' }, { status: 500 })
  }
}
