/**
 * API para gestión de UBICACIONES QR (rondas de guardia)
 * Sistema de Gestión de Condominios (escritorio) — condominios-cyj
 *
 * Esta API usa la MISMA tabla MovilQrLocation que la app móvil
 * (laguna-norte-gestion), ya que ambos sistemas comparten la BD Aiven.
 * Por lo tanto, los QR creados aquí aparecen instantáneamente en la app
 * móvil y viceversa.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// Forzar renderizado dinámico — sin caché
export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET — Listar todas las ubicaciones QR (activas e inactivas)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const onlyActive = searchParams.get('active') === 'true'

    const where = onlyActive ? { active: true } : {}

    const locations = await withRetry(() =>
      db.movilQrLocation.findMany({
        where,
        orderBy: { createdAt: 'asc' },
      }),
    )

    // OPTIMIZACIÓN: Un solo groupBy query en vez de N count() individuales
    const scanCountsRaw = await withRetry(() =>
      db.movilQrScan.groupBy({
        by: ['qrLocationId'],
        _count: { id: true },
      }),
    )
    const countMap = new Map<string, number>()
    for (const row of scanCountsRaw) {
      countMap.set(row.qrLocationId, row._count.id)
    }

    const locationsWithCounts = locations.map((loc) => ({
      ...loc,
      scanCount: countMap.get(loc.id) || 0,
    }))

    return NextResponse.json(locationsWithCounts)
  } catch (error) {
    console.error('Error fetching QR locations:', error)
    return NextResponse.json(
      { error: 'Error al obtener ubicaciones QR' },
      { status: 500 },
    )
  }
}

// POST — Crear nueva ubicación QR
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, location, code, active } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'El nombre es obligatorio' },
        { status: 400 },
      )
    }

    // Generar código único si no se provee
    const finalCode =
      typeof code === 'string' && code.trim()
        ? code.trim().toUpperCase()
        : `QR-${Date.now().toString(36).toUpperCase()}`

    // Verificar que el código no exista
    const existing = await withRetry(() =>
      db.movilQrLocation.findUnique({ where: { code: finalCode } }),
    )
    if (existing) {
      return NextResponse.json(
        { error: `Ya existe una ubicación con el código ${finalCode}` },
        { status: 409 },
      )
    }

    const newLocation = await withRetry(() =>
      db.movilQrLocation.create({
        data: {
          name: name.trim(),
          description: typeof description === 'string' ? description : '',
          location: typeof location === 'string' ? location : '',
          code: finalCode,
          active: typeof active === 'boolean' ? active : true,
          createdBy: user.email || user.id,
        },
      }),
    )

    return NextResponse.json(newLocation, { status: 201 })
  } catch (error) {
    console.error('Error creating QR location:', error)
    return NextResponse.json(
      { error: 'Error al crear ubicación QR' },
      { status: 500 },
    )
  }
}
