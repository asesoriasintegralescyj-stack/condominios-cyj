import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'

/**
 * ENDPOINT TEMPORAL DE MIGRACIÓN.
 *
 * Convierte los valores antiguos de `estadoAprobacion` (Estado de Aprobación)
 * en los nuevos valores de `etapa` del flujo de proyecto.
 *
 * Mapeo:
 *   - "Aprobado"               -> "Completado"
 *   - "En espera"              -> "Sin etapa"
 *   - "Aprobado por Supervisor"-> "Preparación de Compra"
 *   - "Pendiente"              -> "Sin etapa"
 *   - "Rechazado"              -> "Sin etapa"
 *   - NULL o vacío             -> "Sin etapa"
 *
 * Permisos: solo admin.
 */
export async function POST() {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  if (session.user.rol !== 'admin') {
    return NextResponse.json({ error: 'Solo admin' }, { status: 403 })
  }

  const mapeo: Record<string, string> = {
    'Aprobado': 'Completado',
    'En espera': 'Sin etapa',
    'Aprobado por Supervisor': 'Preparación de Compra',
    'Pendiente': 'Sin etapa',
    'Rechazado': 'Sin etapa',
  }

  const resultados: Record<string, number> = {}

  try {
    // Migrar cada valor antiguo al nuevo
    for (const [viejo, nuevo] of Object.entries(mapeo)) {
      const r = await db.$executeRawUnsafe(
        `UPDATE "Proyecto" SET "estadoAprobacion" = $1 WHERE "estadoAprobacion" = $2`,
        nuevo, viejo
      )
      resultados[`${viejo} -> ${nuevo}`] = r
    }

    // Asegurar que NULL o vacío queden como "Sin etapa"
    const rNull = await db.$executeRawUnsafe(
      `UPDATE "Proyecto" SET "estadoAprobacion" = 'Sin etapa' WHERE "estadoAprobacion" IS NULL OR "estadoAprobacion" = ''`
    )
    resultados['NULL/vacío -> Sin etapa'] = rNull

    // Reporte final
    const proyectos = await db.proyecto.findMany({
      select: { estadoAprobacion: true },
    })
    const counter: Record<string, number> = {}
    for (const p of proyectos) {
      const v = p.estadoAprobacion || '(vacío)'
      counter[v] = (counter[v] || 0) + 1
    }

    return NextResponse.json({
      success: true,
      cambios: resultados,
      total_proyectos: proyectos.length,
      etapas_finales: counter,
    })
  } catch (error) {
    console.error('Error en migración de etapas:', error)
    return NextResponse.json(
      { error: 'Error en migración', detalle: String(error) },
      { status: 500 }
    )
  }
}
