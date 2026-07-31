/**
 * API para eliminar ESCANEOS QR
 * Sistema de Gestión de Condominios (escritorio) — condominios-cyj
 *
 * Solo admin puede eliminar escaneos. Útil para limpiar registros
 * de prueba o incorrectos.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// DELETE — Eliminar un escaneo por ID (solo admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Solo admin puede eliminar escaneos
    if (user.rol !== 'admin') {
      return NextResponse.json(
        { error: 'Solo el administrador puede eliminar lecturas' },
        { status: 403 },
      )
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'ID es obligatorio' }, { status: 400 })
    }

    // Verificar que exista antes de eliminar
    const existing = await withRetry(() =>
      db.movilQrScan.findUnique({ where: { id } }),
    )
    if (!existing) {
      return NextResponse.json(
        { error: 'Lectura no encontrada' },
        { status: 404 },
      )
    }

    await withRetry(() => db.movilQrScan.delete({ where: { id } }))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting QR scan:', error)
    return NextResponse.json(
      { error: 'Error al eliminar lectura' },
      { status: 500 },
    )
  }
}
