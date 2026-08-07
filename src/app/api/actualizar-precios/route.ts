import { NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * Endpoint para refrescar los valores del sistema de inventario.
 *
 * Marca la fecha de última actualización en todos los materiales y herramientas.
 * El frontend lo usa con el botón "Refrescar valores" en el módulo Inventario.
 *
 * En una implementación completa, esto también dispararía la búsqueda de
 * cotizaciones en Sodimac/Easy/Imperial/Construplaza/MercadoLibre para cada
 * producto. Por ahora, solo marca la fecha y devuelve estadísticas.
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

    // Contar cotizaciones existentes
    const totalCotizaciones = await withRetry(() => db.cotizacionMercado.count())

    // Calcular valor total del inventario
    const materiales = await withRetry(() =>
      db.catMaterial.findMany({ select: { precioUnit: true, stockActual: true } })
    )
    const valorConsumibles = materiales.reduce(
      (sum, m) => sum + (m.precioUnit || 0) * (m.stockActual || 0),
      0
    )

    const herramientas = await withRetry(() =>
      db.catHerramienta.findMany({ select: { valorReposicion: true, cantidad: true } })
    )
    const valorHerramientas = herramientas.reduce(
      (sum, h) => sum + (h.valorReposicion || 0) * (h.cantidad || 1),
      0
    )

    return NextResponse.json({
      success: true,
      mensaje: 'Valores del inventario actualizados',
      fecha_actualizacion: ahora.toISOString(),
      estadisticas: {
        materiales_total: totalMateriales,
        herramientas_total: totalHerramientas,
        cotizaciones_guardadas: totalCotizaciones,
        valor_consumibles: valorConsumibles,
        valor_herramientas: valorHerramientas,
        valor_total_inventario: valorConsumibles + valorHerramientas,
      },
      tiendas_disponibles: ['Sodimac', 'Easy', 'Imperial', 'Construplaza', 'MercadoLibre'],
      nota: 'Para obtener el mejor precio de un producto específico, usa el endpoint /api/mejor-precio con el materialId o herramientaId.',
    })
  } catch (error) {
    console.error('Error actualizando valores:', error)
    return NextResponse.json(
      { error: 'Error actualizando valores', detalle: String(error) },
      { status: 500 }
    )
  }
}
