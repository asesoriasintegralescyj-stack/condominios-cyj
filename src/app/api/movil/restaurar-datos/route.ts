import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'

/**
 * ENDPOINT TEMPORAL: Restaura fotos y datos de OT desde el respaldo SQLite.
 * Solo admin.
 */
export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (session.user.rol !== 'admin') return NextResponse.json({ error: 'Solo admin' }, { status: 403 })

  try {
    const body = await request.json()
    const { otNum, titulo, zona, descripcion, estado, fotosAntes, fotosDespues, asignadoNombre } = body

    // Buscar la OT
    const ot = await withRetry(() => db.ordenTrabajo.findFirst({ where: { otNum } }))
    if (!ot) return NextResponse.json({ error: `OT ${otNum} no encontrada` }, { status: 404 })

    // Buscar personal por nombre
    let asignadoId: string | null = null
    if (asignadoNombre) {
      const persona = await withRetry(() => db.personal.findFirst({
        where: { nombre: { contains: asignadoNombre } }
      }))
      asignadoId = persona?.id || null
    }

    // Mapear estado
    const estadoSistema = estado === 'En Proceso' ? 'En Progreso' :
                          estado === 'Terminada' ? 'Completado' : 'Pendiente'

    // Actualizar con fotos
    const actualizada = await withRetry(() =>
      db.ordenTrabajo.update({
        where: { id: ot.id },
        data: {
          titulo: titulo || ot.titulo,
          ubicacion: zona || ot.ubicacion,
          descripcion: descripcion || ot.descripcion,
          estado: estadoSistema,
          fotosAntes: fotosAntes ? JSON.stringify(fotosAntes) : ot.fotosAntes,
          fotosDespues: fotosDespues ? JSON.stringify(fotosDespues) : ot.fotosDespues,
          asignadoId: asignadoId || ot.asignadoId,
        },
      })
    )

    // Contar fotos
    let fotosA = 0, fotosD = 0
    try { fotosA = JSON.parse(actualizada.fotosAntes || '[]').length } catch {}
    try { fotosD = JSON.parse(actualizada.fotosDespues || '[]').length } catch {}

    return NextResponse.json({
      success: true,
      otNum: actualizada.otNum,
      titulo: actualizada.titulo,
      estado: actualizada.estado,
      ubicacion: actualizada.ubicacion,
      fotosAntes: fotosA,
      fotosDespues: fotosD,
      asignadoId: actualizada.asignadoId,
    })
  } catch (error) {
    console.error('Error restaurando datos:', error)
    return NextResponse.json({ error: 'Error', detalle: String(error) }, { status: 500 })
  }
}
