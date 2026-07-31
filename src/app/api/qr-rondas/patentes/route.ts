/**
 * API para visualización y registro manual de PATENTES VEHICULARES
 * Sistema de Gestión de Condominios (escritorio) — condominios-cyj
 *
 * Comparte la tabla MovilPatente con la app móvil.
 *
 * Métodos:
 *  - GET:    Listar patentes con filtros (ubicacion, soloAbiertas, from, to, limit)
 *  - POST:   Registrar patente manualmente desde el escritorio (admin/supervisor)
 *  - PATCH:  Registrar salida de una patente (cierre)
 */

import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { isValidUbicacionPatente, UBICACIONES_PATENTES } from '@/lib/qr-rondas/ubicaciones'

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

// POST — Registrar patente manualmente desde el escritorio
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo admin y supervisor pueden registrar manualmente
    if (user.rol !== 'admin' && user.rol !== 'supervisor') {
      return NextResponse.json(
        { error: 'Sin permisos. Solo admin o supervisor pueden registrar patentes manualmente.' },
        { status: 403 },
      )
    }

    const body = await request.json()
    const { patente, ubicacion, scannedBy, notes, foto } = body

    // Validaciones básicas
    if (!patente || typeof patente !== 'string' || patente.trim().length < 4) {
      return NextResponse.json(
        { error: 'La patente es obligatoria (mínimo 4 caracteres)' },
        { status: 400 },
      )
    }
    if (!ubicacion || typeof ubicacion !== 'string' || !ubicacion.trim()) {
      return NextResponse.json(
        { error: 'La ubicación es obligatoria' },
        { status: 400 },
      )
    }
    if (!isValidUbicacionPatente(ubicacion.trim())) {
      return NextResponse.json(
        { error: `Ubicación no válida. Debe ser una de: ${UBICACIONES_PATENTES.join(', ')}` },
        { status: 400 },
      )
    }

    const patenteLimpia = patente.trim().toUpperCase()

    // Si la patente ya está adentro (sin salida) en la misma ubicación, rechazar
    const existente = await withRetry(() =>
      db.movilPatente.findFirst({
        where: {
          patente: patenteLimpia,
          ubicacion: ubicacion.trim(),
          salidaAt: null,
        },
        orderBy: { entradaAt: 'desc' },
      }),
    )
    if (existente) {
      return NextResponse.json(
        {
          error: `La patente ${patenteLimpia} ya tiene un registro abierto en ${ubicacion} (entrada: ${existente.entradaAt.toISOString()})`,
        },
        { status: 409 },
      )
    }

    const nueva = await withRetry(() =>
      db.movilPatente.create({
        data: {
          patente: patenteLimpia,
          ubicacion: ubicacion.trim(),
          entradaQrCode: 'MANUAL-ESCRITORIO',
          entradaAt: new Date(),
          scannedBy: scannedBy || `${user.nombre} ${user.apellido || ''}`.trim() || user.email,
          profileId: user.id,
          notes: typeof notes === 'string' ? notes.slice(0, 500) : '',
          foto: typeof foto === 'string' ? foto : null,
        },
      }),
    )

    return NextResponse.json(nueva, { status: 201 })
  } catch (error) {
    console.error('Error creando patente:', error)
    return NextResponse.json(
      { error: 'Error al registrar patente', detalle: String(error) },
      { status: 500 },
    )
  }
}

// PATCH — Registrar salida de una patente
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (user.rol !== 'admin' && user.rol !== 'supervisor') {
      return NextResponse.json(
        { error: 'Sin permisos para registrar salidas' },
        { status: 403 },
      )
    }

    const body = await request.json()
    const { id } = body

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'ID de patente obligatorio' },
        { status: 400 },
      )
    }

    const existente = await withRetry(() =>
      db.movilPatente.findUnique({ where: { id } }),
    )
    if (!existente) {
      return NextResponse.json(
        { error: 'Patente no encontrada' },
        { status: 404 },
      )
    }
    if (existente.salidaAt) {
      return NextResponse.json(
        { error: 'Esta patente ya tiene salida registrada' },
        { status: 409 },
      )
    }

    const actualizada = await withRetry(() =>
      db.movilPatente.update({
        where: { id },
        data: {
          salidaAt: new Date(),
          salidaQrCode: 'MANUAL-ESCRITORIO',
        },
      }),
    )

    return NextResponse.json(actualizada)
  } catch (error) {
    console.error('Error registrando salida:', error)
    return NextResponse.json(
      { error: 'Error al registrar salida' },
      { status: 500 },
    )
  }
}
