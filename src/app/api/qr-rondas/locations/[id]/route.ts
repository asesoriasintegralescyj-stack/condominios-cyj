/**
 * API para gestión individual de UBICACIONES QR
 * Sistema de Gestión de Condominios (escritorio) — condominios-cyj
 *
 * Comparte la tabla MovilQrLocation con la app móvil.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET — Obtener una ubicación QR por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    const location = await withRetry(() =>
      db.movilQrLocation.findUnique({ where: { id } }),
    )

    if (!location) {
      return NextResponse.json(
        { error: 'Ubicación no encontrada' },
        { status: 404 },
      )
    }

    return NextResponse.json(location)
  } catch (error) {
    console.error('Error fetching QR location:', error)
    return NextResponse.json(
      { error: 'Error al obtener ubicación QR' },
      { status: 500 },
    )
  }
}

// PUT — Actualizar ubicación QR
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, description, location, code, active } = body

    // Verificar existencia
    const existing = await withRetry(() =>
      db.movilQrLocation.findUnique({ where: { id } }),
    )
    if (!existing) {
      return NextResponse.json(
        { error: 'Ubicación no encontrada' },
        { status: 404 },
      )
    }

    // Si se cambia el código, verificar unicidad
    if (typeof code === 'string' && code.trim() && code !== existing.code) {
      const newCode = code.trim().toUpperCase()
      const conflict = await withRetry(() =>
        db.movilQrLocation.findUnique({ where: { code: newCode } }),
      )
      if (conflict && conflict.id !== id) {
        return NextResponse.json(
          { error: `Ya existe una ubicación con el código ${newCode}` },
          { status: 409 },
        )
      }
    }

    const data: any = {}
    if (typeof name === 'string' && name.trim()) data.name = name.trim()
    if (typeof description === 'string') data.description = description
    if (typeof location === 'string') data.location = location
    if (typeof code === 'string' && code.trim())
      data.code = code.trim().toUpperCase()
    if (typeof active === 'boolean') data.active = active

    const updated = await withRetry(() =>
      db.movilQrLocation.update({ where: { id }, data }),
    )

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating QR location:', error)
    return NextResponse.json(
      { error: 'Error al actualizar ubicación QR' },
      { status: 500 },
    )
  }
}

// DELETE — Eliminar ubicación QR (soft delete: marcar como inactiva)
// Se hace soft delete para no perder el historial de escaneos asociados.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    // Verificar existencia
    const existing = await withRetry(() =>
      db.movilQrLocation.findUnique({ where: { id } }),
    )
    if (!existing) {
      return NextResponse.json(
        { error: 'Ubicación no encontrada' },
        { status: 404 },
      )
    }

    // Soft delete: marcar como inactiva
    await withRetry(() =>
      db.movilQrLocation.update({ where: { id }, data: { active: false } }),
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting QR location:', error)
    return NextResponse.json(
      { error: 'Error al eliminar ubicación QR' },
      { status: 500 },
    )
  }
}
