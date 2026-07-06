import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'

/**
 * ENDPOINT TEMPORAL DE LIMPIEZA DE INVENTARIO.
 *
 * - Elimina materiales sin imagenUrl (los antiguos que no tienen imagen)
 * - Elimina herramientas sin imagenUrl (las antiguas que se duplicaron con las nuevas)
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
    // Eliminar materiales sin imagenUrl
    const matEliminados = await db.catMaterial.deleteMany({
      where: {
        OR: [
          { imagenUrl: null },
          { imagenUrl: '' },
        ],
      },
    })

    // Eliminar herramientas sin imagenUrl
    const herrEliminados = await db.catHerramienta.deleteMany({
      where: {
        OR: [
          { imagenUrl: null },
          { imagenUrl: '' },
        ],
      },
    })

    // Contar totales restantes
    const totalMat = await db.catMaterial.count()
    const totalHerr = await db.catHerramienta.count()

    return NextResponse.json({
      success: true,
      mensaje: 'Limpieza completada',
      materiales_eliminados: matEliminados.count,
      herramientas_eliminadas: herrEliminados.count,
      materiales_restantes: totalMat,
      herramientas_restantes: totalHerr,
    })
  } catch (error) {
    console.error('Error en limpieza:', error)
    return NextResponse.json(
      { error: 'Error en limpieza', detalle: String(error) },
      { status: 500 }
    )
  }
}
