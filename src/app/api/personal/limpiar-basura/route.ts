import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'

/**
 * ENDPOINT TEMPORAL DE LIMPIEZA.
 *
 * Elimina registros de Personal que son basura: nombre de una sola letra,
 * sin cargo, sin RUT, sin sueldo. Estos registros probablemente se crearon
 * por pruebas accidentales o inputs sin validación.
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
    // Buscar todos los registros de personal
    const todos = await db.personal.findMany()

    // Filtrar los que son basura:
    // - nombre de 1-2 caracteres (letras sueltas como "M", "A", "L")
    // - sin cargo (null o vacío)
    // - sin RUT (null o vacío)
    // - sin sueldo (0)
    const basura = todos.filter(p => {
      const nombre = (p.nombre || '').trim()
      const esNombreCorto = nombre.length <= 2
      const sinCargo = !p.cargo || p.cargo.trim() === ''
      const sinRut = !p.rut || p.rut.trim() === ''
      const sinSueldo = !p.sueldoBase || p.sueldoBase === 0
      return esNombreCorto && sinCargo && sinRut && sinSueldo
    })

    const eliminados = []
    let errores = 0

    for (const p of basura) {
      try {
        await db.personal.delete({ where: { id: p.id } })
        eliminados.push({ id: p.id, nombre: p.nombre })
      } catch (e) {
        // Puede tener relaciones (OT, asistencias, etc.) que impidan borrar
        console.error(`No se pudo eliminar ${p.id} (${p.nombre}):`, e)
        errores++
      }
    }

    const restantes = await db.personal.count()

    return NextResponse.json({
      success: true,
      total_eliminados: eliminados.length,
      total_errores: errores,
      eliminados,
      total_restantes: restantes,
    })
  } catch (error) {
    console.error('Error en limpieza:', error)
    return NextResponse.json(
      { error: 'Error en limpieza', detalle: String(error) },
      { status: 500 }
    )
  }
}
