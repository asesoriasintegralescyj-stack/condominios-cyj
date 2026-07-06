import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

/**
 * IMPORTACIÓN MASIVA DE MATERIALES DESDE CSV/JSON.
 *
 * Acepta un array de materiales en JSON con campos:
 *   codigo, nombre, categoria, unidad, precioUnit, stockMinimo,
 *   ubicacion, imagenUrl, fuente
 *
 * Permite cargar miles de productos en un solo request.
 * Hace upsert por código (si existe, actualiza; si no, crea).
 *
 * Permisos: admin o catalogos.crear
 */
export const maxDuration = 60
export const bodySizeLimit = '8mb'

export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'catalogos.crear')) {
    return apiError('Sin permisos', 403)
  }

  try {
    const body = await request.json()
    const { materiales, fuente } = body as {
      materiales: Array<{
        codigo?: string
        nombre: string
        categoria?: string
        unidad?: string
        precioUnit?: number | string
        stockMinimo?: number | string
        ubicacion?: string
        imagenUrl?: string
        fuente?: string
      }>
      fuente?: string
    }

    if (!Array.isArray(materiales) || materiales.length === 0) {
      return NextResponse.json({ error: 'No hay datos para importar' }, { status: 400 })
    }

    const fuenteDefault = fuente || 'Importación manual'
    const resultados = {
      total: materiales.length,
      creados: 0,
      actualizados: 0,
      errores: [] as string[],
    }

    // Procesar en lotes de 50 para no agotar el pool de Aiven
    const LOTES = 50
    for (let i = 0; i < materiales.length; i += LOTES) {
      const lote = materiales.slice(i, i + LOTES)

      await Promise.all(lote.map(async (m, idx) => {
        try {
          if (!m.nombre || !m.nombre.trim()) {
            resultados.errores.push(`Fila ${i + idx + 1}: Nombre requerido`)
            return
          }

          const data = {
            nombre: m.nombre.trim(),
            categoria: (m.categoria || 'General').trim(),
            unidad: (m.unidad || 'unidad').trim(),
            precioUnit: parseFloat(String(m.precioUnit)) || 0,
            stockMinimo: parseInt(String(m.stockMinimo)) || 0,
            ubicacion: m.ubicacion?.trim() || null,
            imagenUrl: m.imagenUrl?.trim() || null,
            fuente: (m.fuente || fuenteDefault).trim(),
            ultimaActPrecio: new Date(),
          }

          // Si tiene código, hacer upsert
          if (m.codigo && m.codigo.trim()) {
            const codigo = m.codigo.trim()
            const existente = await withRetry(() =>
              db.catMaterial.findUnique({ where: { codigo } })
            )

            if (existente) {
              await withRetry(() =>
                db.catMaterial.update({ where: { id: existente.id }, data })
              )
              resultados.actualizados++
            } else {
              await withRetry(() =>
                db.catMaterial.create({ data: { ...data, codigo, stockActual: 0 } })
              )
              resultados.creados++
            }
          } else {
            // Sin código: crear directamente
            await withRetry(() =>
              db.catMaterial.create({ data: { ...data, stockActual: 0 } })
            )
            resultados.creados++
          }
        } catch (e) {
          resultados.errores.push(`Fila ${i + idx + 1}: ${e instanceof Error ? e.message : 'Error'}`)
        }
      }))
    }

    return NextResponse.json({
      success: true,
      mensaje: `Importación completada: ${resultados.creados} nuevos, ${resultados.actualizados} actualizados, ${resultados.errores.length} errores`,
      resultados,
    })
  } catch (error) {
    console.error('Error en importación masiva:', error)
    return NextResponse.json(
      { error: 'Error en importación', detalle: String(error) },
      { status: 500 }
    )
  }
}
