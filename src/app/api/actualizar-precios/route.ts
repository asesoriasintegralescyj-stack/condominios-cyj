import { NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'

/**
 * Endpoint para marcar la fecha de última actualización de precios.
 *
 * En una implementación completa, esto haría scraping de los productos
 * en Sodimac/Easy/Imperial/Construplaza para obtener precios reales.
 * Por ahora, solo actualiza el campo ultimaActPrecio de todos los productos.
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

  try {
    const ahora = new Date()

    // Actualizar fecha de última actualización en todos los materiales
    const materialesActualizados = await withRetry(() =>
      db.catMaterial.updateMany({
        where: {},
        data: { ultimaActPrecio: ahora },
      })
    )

    // Actualizar fecha de última actualización en todas las herramientas
    const herramientasActualizadas = await withRetry(() =>
      db.catHerramienta.updateMany({
        where: {},
        data: { ultimaActPrecio: ahora },
      })
    )

    // Contar totales
    const totalMateriales = await withRetry(() => db.catMaterial.count())
    const totalHerramientas = await withRetry(() => db.catHerramienta.count())

    return NextResponse.json({
      success: true,
      mensaje: 'Fecha de actualización marcada en todos los productos',
      materiales_actualizados: materialesActualizados.count,
      herramientas_actualizadas: herramientasActualizadas.count,
      total_materiales: totalMateriales,
      total_herramientas: totalHerramientas,
      fecha_actualizacion: ahora.toISOString(),
      nota: 'Los precios deben verificarse manualmente contra Sodimac, Easy, Imperial y Construplaza. Esta función marca la fecha de última revisión.',
    })
  } catch (error) {
    console.error('Error actualizando fechas:', error)
    return NextResponse.json(
      { error: 'Error actualizando fechas', detalle: String(error) },
      { status: 500 }
    )
  }
}
