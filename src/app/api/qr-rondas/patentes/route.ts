/**
 * API para visualización de PATENTES VEHICULARES
 * Sistema de Gestión de Condominios (escritorio) — condominios-cyj
 *
 * Comparte la tabla MovilPatente con la app móvil.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET — Listar patentes con filtros
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const ubicacion = searchParams.get('ubicacion') || undefined
    const soloAbiertas = searchParams.get('soloAbiertas') === 'true'
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const limit = Math.min(parseInt(searchParams.get('limit') || '500', 10) || 500, 1000)

    const where: any = {}
    if (ubicacion) where.ubicacion = ubicacion
    if (soloAbiertas) where.salidaAt = null
    if (from || to) {
      where.entradaAt = {}
      if (from) where.entradaAt.gte = new Date(Number(from))
      if (to) where.entradaAt.lte = new Date(Number(to))
    }

    const patentes = await withRetry(() =>
      db.movilPatente.findMany({
        where,
        orderBy: { entradaAt: 'desc' },
        take: limit,
      }),
    )
    const total = await withRetry(() => db.movilPatente.count({ where }))

    return NextResponse.json({ patentes, total })
  } catch (error) {
    console.error('Error fetching patentes:', error)
    return NextResponse.json({ patentes: [], total: 0 })
  }
}
