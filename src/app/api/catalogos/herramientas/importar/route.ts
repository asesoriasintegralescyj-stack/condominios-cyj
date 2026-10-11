import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

/**
 * IMPORTACIÓN MASIVA DE HERRAMIENTAS DESDE CSV/JSON.
 *
 * Acepta un array de herramientas en JSON con campos:
 *   codigo, nombre, marca, modelo, cantidad, estado, valorReposicion,
 *   ubicacion, imagenUrl, fuente
 *
 * Permite cargar miles de productos en un solo request.
 * Hace upsert por código.
 */
export const maxDuration = 60
export const bodySizeLimit = '8mb'

export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'catalogos.crear', session.userPermisos)) {
    return apiError('Sin permisos', 403)
  }

  try {
    const body = await request.json()
    const { herramientas, fuente } = body as {
      herramientas: Array<{
        codigo?: string
        nombre: string
        marca?: string
        modelo?: string
        cantidad?: number | string
        estado?: string
        valorReposicion?: number | string
        ubicacion?: string
        imagenUrl?: string
        fuente?: string
      }>
      fuente?: string
    }

    if (!Array.isArray(herramientas) || herramientas.length === 0) {
      return NextResponse.json({ error: 'No hay datos para importar' }, { status: 400 })
    }

    const fuenteDefault = fuente || 'Importación manual'
    const resultados = {
      total: herramientas.length,
      creados: 0,
      actualizados: 0,
      errores: [] as string[],
    }

    const LOTES = 50
    for (let i = 0; i < herramientas.length; i += LOTES) {
      const lote = herramientas.slice(i, i + LOTES)

      await Promise.all(lote.map(async (h, idx) => {
        try {
          if (!h.nombre || !h.nombre.trim()) {
            resultados.errores.push(`Fila ${i + idx + 1}: Nombre requerido`)
            return
          }

          const data = {
            nombre: h.nombre.trim(),
            marca: h.marca?.trim() || null,
            modelo: h.modelo?.trim() || null,
            cantidad: parseInt(String(h.cantidad)) || 1,
            estado: h.estado?.trim() || 'Bueno',
            valorReposicion: parseFloat(String(h.valorReposicion)) || 0,
            ubicacion: h.ubicacion?.trim() || null,
            imagenUrl: h.imagenUrl?.trim() || null,
            fuente: (h.fuente || fuenteDefault).trim(),
            ultimaActPrecio: new Date(),
          }

          if (h.codigo && h.codigo.trim()) {
            const codigo = h.codigo.trim()
            const existente = await withRetry(() =>
              db.catHerramienta.findUnique({ where: { codigo } })
            )

            if (existente) {
              await withRetry(() =>
                db.catHerramienta.update({ where: { id: existente.id }, data })
              )
              resultados.actualizados++
            } else {
              await withRetry(() =>
                db.catHerramienta.create({ data: { ...data, codigo } })
              )
              resultados.creados++
            }
          } else {
            await withRetry(() =>
              db.catHerramienta.create({ data })
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
      mensaje: `Importación completada: ${resultados.creados} nuevas, ${resultados.actualizados} actualizadas, ${resultados.errores.length} errores`,
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
