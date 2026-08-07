import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import ZAI from 'z-ai-web-dev-sdk'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * Endpoint que devuelve el mejor precio (más bajo) de un producto entre
 * las 5 tiendas: Sodimac, Easy, Imperial, Construplaza y MercadoLibre.
 *
 * Funciona en 2 modos:
 *   1. GET /api/mejor-precio?materialId=xxx
 *   2. GET /api/mejor-precio?herramientaId=xxx
 *
 * Flujo:
 *   1. Lee el producto de la BD (CatMaterial o CatHerramienta)
 *   2. Si ya tiene cotizaciones recientes (<24h), las devuelve
 *   3. Si no, busca en web el producto en las 5 tiendas y guarda cotizaciones
 *   4. Devuelve:
 *      - mejor_precio (más bajo)
 *      - mejor_tienda
 *      - todas las cotizaciones encontradas
 *      - URL del producto en cada tienda
 *
 * Permisos: cualquier usuario autenticado.
 */
export async function GET(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const materialId = searchParams.get('materialId')
  const herramientaId = searchParams.get('herramientaId')
  const forzar = searchParams.get('forzar') === 'true'

  if (!materialId && !herramientaId) {
    return NextResponse.json({ error: 'Se requiere materialId o herramientaId' }, { status: 400 })
  }

  try {
    // 1. Obtener el producto
    let producto: { id: string; nombre: string; precioUnit?: number; valorReposicion?: number; fuente?: string | null } | null = null
    let tipo: 'material' | 'herramienta' = 'material'

    if (materialId) {
      producto = await withRetry(() => db.catMaterial.findUnique({ where: { id: materialId } }))
      tipo = 'material'
    } else if (herramientaId) {
      producto = await withRetry(() => db.catHerramienta.findUnique({ where: { id: herramientaId! } }))
      tipo = 'herramienta'
    }

    if (!producto) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    // 2. Verificar cotizaciones recientes (menos de 24h)
    if (!forzar) {
      const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const cotizacionesRecientes = await withRetry(() =>
        db.cotizacionMercado.findMany({
          where: {
            OR: [
              tipo === 'material' ? { materialId: producto!.id } : { herramientaId: producto!.id },
            ].filter(Boolean) as any,
            fechaConsulta: { gte: hace24h },
            disponible: true,
          },
          orderBy: { precio: 'asc' },
        })
      )

      if (cotizacionesRecientes.length > 0) {
        const mejor = cotizacionesRecientes[0]
        return NextResponse.json({
          success: true,
          cache: true,
          producto: { id: producto.id, nombre: producto.nombre },
          mejor_precio: mejor.precio,
          mejor_tienda: mejor.tienda,
          mejor_url: mejor.url,
          cotizaciones: cotizacionesRecientes.map(c => ({
            tienda: c.tienda,
            precio: c.precio,
            url: c.url,
            disponible: c.disponible,
            fecha: c.fechaConsulta,
          })),
        })
      }
    }

    // 3. Buscar precios en la web usando ZAI web_search
    // Si ZAI no está configurado (producción), usar fallback con precios del catálogo
    let cotizacionesNuevas: Array<{
      tienda: string
      precio: number
      url: string | null
      disponible: boolean
    }> = []

    try {
      const zai = await ZAI.create()
      const nombreProducto = producto.nombre
      const tiendas = ['Sodimac', 'Easy', 'Imperial', 'Construplaza', 'MercadoLibre Chile']

      const promesas = tiendas.map(async (tienda) => {
        try {
          const query = tienda === 'MercadoLibre Chile'
            ? `site:mercadolibre.cl ${nombreProducto} precio`
            : `site:${tienda.toLowerCase().replace(/\s/g, '')}.cl ${nombreProducto} precio`
          const results = await zai.functions.invoke('web_search', { query, num: 5 })

          if (!Array.isArray(results) || results.length === 0) return null

          // Buscar el primer resultado que tenga un precio en el snippet
          for (const r of results) {
            const snippet = r.snippet || ''
            const name = r.name || ''
            const fullText = `${name} ${snippet}`

            // Buscar patrones de precio chileno: $12.345 o $ 12.345 o CLP 12.345
            const precioMatch = fullText.match(/\$\s*([\d.]{4,})/i) || fullText.match(/CLP\s*([\d.]{4,})/i)
            if (precioMatch) {
              const precioStr = precioMatch[1].replace(/\./g, '')
              const precio = parseInt(precioStr, 10)
              if (precio > 100) { // filtrar precios inválidos
                return {
                  tienda,
                  precio,
                  url: r.url || null,
                  disponible: true,
                }
              }
            }
          }
          return null
        } catch (e) {
          console.warn(`Error buscando en ${tienda}:`, e)
          return null
        }
      })

      const resultados = await Promise.all(promesas)
      for (const r of resultados) {
        if (r) cotizacionesNuevas.push(r)
      }
    } catch (zaiError) {
      console.warn('ZAI SDK no configurado en este entorno, usando fallback con catálogo:', zaiError)
    }

    // 4. Si no se encontraron precios en web, usar el precio del catálogo como fallback
    if (cotizacionesNuevas.length === 0) {
      const precioCatalogo = (producto as any).precioUnit || (producto as any).valorReposicion || 0
      const fuenteCatalogo = producto.fuente || 'Catálogo interno'
      if (precioCatalogo > 0) {
        cotizacionesNuevas.push({
          tienda: fuenteCatalogo,
          precio: precioCatalogo,
          url: null,
          disponible: true,
        })
      }
    }

    // 5. Guardar cotizaciones en BD
    if (cotizacionesNuevas.length > 0) {
      // Borrar cotizaciones viejas para este producto
      await withRetry(() =>
        db.cotizacionMercado.deleteMany({
          where: tipo === 'material'
            ? { materialId: producto!.id }
            : { herramientaId: producto!.id },
        })
      )
      // Insertar nuevas
      for (const c of cotizacionesNuevas) {
        await withRetry(() =>
          db.cotizacionMercado.create({
            data: {
              ...(tipo === 'material' ? { materialId: producto!.id } : { herramientaId: producto!.id }),
              tienda: c.tienda,
              url: c.url,
              precio: c.precio,
              disponible: c.disponible,
            },
          })
        )
      }
    }

    // 6. Ordenar por precio ascendente (mejor primero)
    cotizacionesNuevas.sort((a, b) => a.precio - b.precio)
    const mejor = cotizacionesNuevas[0]

    if (!mejor) {
      return NextResponse.json({
        success: false,
        mensaje: 'No se encontraron precios para este producto en ninguna tienda',
        producto: { id: producto.id, nombre: producto.nombre },
      })
    }

    return NextResponse.json({
      success: true,
      cache: false,
      producto: { id: producto.id, nombre: producto.nombre },
      mejor_precio: mejor.precio,
      mejor_tienda: mejor.tienda,
      mejor_url: mejor.url,
      cotizaciones: cotizacionesNuevas.map(c => ({
        tienda: c.tienda,
        precio: c.precio,
        url: c.url,
        disponible: c.disponible,
        fecha: new Date().toISOString(),
      })),
    })
  } catch (error) {
    console.error('Error obteniendo mejor precio:', error)
    return NextResponse.json(
      { error: 'Error obteniendo mejor precio', detalle: String(error) },
      { status: 500 }
    )
  }
}
