/**
 * API de detalle de respaldo - Sistema CYJ Condominios
 *
 * Requiere autenticación de admin.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError, handlePrismaError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// GET - Obtener detalle de un respaldo
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin') return apiError('Requiere rol admin', 403)

  try {
    const { id } = await params

    const backup = await db.backup.findUnique({ where: { id } })
    if (!backup) return apiError('Respaldo no encontrado', 404)

    // El archivo existe si el campo ubicacion contiene JSON serializado
    const archivoExiste = !!backup.ubicacion && !backup.ubicacion.startsWith('export-large-')

    return NextResponse.json({
      ...backup,
      archivoExiste,
    })
  } catch (error) {
    return handlePrismaError(error)
  }
}

// DELETE - Eliminar un respaldo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin') return apiError('Requiere rol admin', 403)

  try {
    const { id } = await params

    const backup = await db.backup.findUnique({ where: { id } })
    if (!backup) return apiError('Respaldo no encontrado', 404)

    await db.backup.delete({ where: { id } })

    return NextResponse.json({ message: 'Respaldo eliminado correctamente' })
  } catch (error) {
    return handlePrismaError(error)
  }
}

// PATCH - Descargar respaldo
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin') return apiError('Requiere rol admin', 403)

  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const { action } = body

    if (action === 'download') {
      const backup = await db.backup.findUnique({ where: { id } })
      if (!backup) return apiError('Respaldo no encontrado', 404)

      if (!backup.ubicacion || backup.ubicacion.startsWith('export-large-')) {
        return apiError('Archivo de respaldo no disponible o demasiado grande para descarga', 404)
      }

      // El contenido está en backup.ubicacion (JSON serializado)
      const base64 = Buffer.from(backup.ubicacion, 'utf-8').toString('base64')

      return NextResponse.json({
        archivo: backup.archivo,
        base64,
        tamano: backup.tamano,
      })
    }

    return apiError('Acción no válida', 400)
  } catch (error) {
    return handlePrismaError(error)
  }
}
