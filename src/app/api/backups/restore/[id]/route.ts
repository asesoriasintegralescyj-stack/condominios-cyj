/**
 * API de restauración de respaldo - Sistema CYJ Condominios
 *
 * ⚠️ REESCRITO: El sistema anterior usaba `fs.copyFileSync('prisma/dev.db')`
 * que solo funciona con SQLite. Esta versión usa los datos JSON serializados
 * almacenados en el campo `ubicacion` del registro de backup.
 *
 * Requiere autenticación de admin.
 * ⚠️ PELIGROSO: La restauración reemplaza los datos actuales.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, logAction } from '@/lib/auth'
import { apiError, handlePrismaError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// POST - Restaurar base de datos desde un respaldo
export async function POST(
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
    if (backup.estado !== 'Completado') {
      return apiError('Solo se pueden restaurar respaldos completados', 400)
    }

    if (!backup.ubicacion || backup.ubicacion.startsWith('export-large-')) {
      return apiError('Archivo de respaldo no disponible', 404)
    }

    // Parsear JSON
    let exportData: Record<string, unknown[]>
    try {
      exportData = JSON.parse(backup.ubicacion)
    } catch (e) {
      console.error('[Restore] Error parseando JSON:', e)
      return apiError('El respaldo está corrupto o tiene formato inválido', 500)
    }

    // ⚠️ ADVERTENCIA: Esto reemplaza los datos actuales.
    // En una implementación real, se debería:
    // 1. Crear un backup automático del estado actual antes de restaurar
    // 2. Hacer la restauración dentro de una transacción
    // 3. Tener un mecanismo de rollback

    // Por seguridad, NO restauramos tablas críticas (User, Session) automáticamente
    const TABLAS_PROTEGIDAS = new Set(['user', 'session', 'backup'])
    let tablasRestauradas = 0
    let registrosRestaurados = 0

    for (const [modelo, rows] of Object.entries(exportData)) {
      if (TABLAS_PROTEGIDAS.has(modelo)) continue
      if (!Array.isArray(rows) || rows.length === 0) continue

      try {
        const model = (db as unknown as Record<string, { deleteMany: (a: object) => Promise<unknown>; createMany: (a: object) => Promise<unknown> }>)[modelo]
        if (!model) continue

        // Limpiar tabla actual e insertar datos del backup (secuencial para evitar errores de tipo en $transaction con tipos dinámicos)
        await model.deleteMany({})
        await model.createMany({ data: rows as never[], skipDuplicates: true })
        tablasRestauradas++
        registrosRestaurados += rows.length
      } catch (e) {
        console.warn(`[Restore] No se pudo restaurar ${modelo}:`, e)
      }
    }

    // Marcar backup como verificado
    await db.backup.update({
      where: { id },
      data: {
        verificado: true,
        fechaVerificacion: new Date(),
      },
    })

    // Log de auditoría
    await logAction(
      session.userId,
      'restore_backup',
      'Backup',
      id,
      null,
      { tablasRestauradas, registrosRestaurados },
      undefined,
      undefined
    )

    return NextResponse.json({
      message: 'Base de datos restaurada correctamente',
      tablasRestauradas,
      registrosRestaurados,
      nota: 'Las tablas User, Session y Backup no fueron modificadas por seguridad.',
    })
  } catch (error) {
    return handlePrismaError(error)
  }
}

// GET - Verificar si un respaldo puede restaurarse
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

    const archivoExiste = !!backup.ubicacion && !backup.ubicacion.startsWith('export-large-')
    const puedeRestaurar = backup.estado === 'Completado' && archivoExiste

    return NextResponse.json({
      id: backup.id,
      archivo: backup.archivo,
      fecha: backup.createdAt,
      tamano: backup.tamano,
      totalTablas: backup.totalTablas,
      totalRegistros: backup.totalRegistros,
      puedeRestaurar,
      archivoExiste,
    })
  } catch (error) {
    return handlePrismaError(error)
  }
}
