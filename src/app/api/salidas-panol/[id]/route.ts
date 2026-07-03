import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

// PUT - Registrar ingreso (devolución) de herramienta + LV después de uso
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  try {
    const { id } = await params
    const data = await request.json()

    const salida = await db.salidaPañol.findUnique({ where: { id } })
    if (!salida) return apiError('Salida no encontrada', 404)
    if (salida.estado === 'Devuelta') return apiError('Esta herramienta ya fue devuelta', 400)

    const lvDespuesItems = typeof data.lvDespuesItems === 'string'
      ? data.lvDespuesItems
      : JSON.stringify(data.lvDespuesItems || [])

    const ahora = new Date()
    const actualizada = await db.salidaPañol.update({
      where: { id },
      data: {
        fechaIngreso: data.fechaIngreso ? new Date(data.fechaIngreso) : ahora,
        horaIngreso: data.horaIngreso || ahora.toTimeString().substring(0, 5),
        estadoDevolucion: data.estadoDevolucion || null,
        comentarios: data.comentarios || null,
        lvDespuesCompletada: data.lvDespuesCompletada || false,
        lvDespuesItems,
        lvDespuesFirma: data.lvDespuesFirma || null,
        estado: 'Devuelta',
      },
    })

    // Si el estado de devolución indica un problema, actualizar el estado de la herramienta
    if (data.estadoDevolucion && data.estadoDevolucion !== 'Operativo' && data.estadoDevolucion !== 'Bueno') {
      await db.catHerramienta.update({
        where: { id: salida.herramientaId },
        data: { estado: data.estadoDevolucion },
      })
    }

    return NextResponse.json({
      ...actualizada,
      lvAntesItems: actualizada.lvAntesItems ? JSON.parse(actualizada.lvAntesItems) : [],
      lvDespuesItems: actualizada.lvDespuesItems ? JSON.parse(actualizada.lvDespuesItems) : [],
    })
  } catch (error) {
    console.error('Error updating salida:', error)
    return NextResponse.json({ error: 'Error updating salida' }, { status: 500 })
  }
}

// GET - Obtener una salida específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  try {
    const { id } = await params
    const salida = await db.salidaPañol.findUnique({
      where: { id },
      include: { herramienta: true },
    })
    if (!salida) return apiError('Salida no encontrada', 404)
    return NextResponse.json({
      ...salida,
      lvAntesItems: salida.lvAntesItems ? JSON.parse(salida.lvAntesItems) : [],
      lvDespuesItems: salida.lvDespuesItems ? JSON.parse(salida.lvDespuesItems) : [],
    })
  } catch (error) {
    console.error('Error fetching salida:', error)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

// DELETE - Eliminar una salida
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin') return apiError('Sin permisos', 403)
  try {
    const { id } = await params
    await db.salidaPañol.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting salida:', error)
    return NextResponse.json({ error: 'Error deleting' }, { status: 500 })
  }
}
