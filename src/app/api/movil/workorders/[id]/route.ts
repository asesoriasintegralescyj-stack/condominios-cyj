import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'

// PUT - Actualizar OT desde móvil
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const otActual = await withRetry(() => db.ordenTrabajo.findUnique({ where: { id } }))
    if (!otActual) {
      return NextResponse.json({ error: 'OT not found' }, { status: 404 })
    }

    const estadoSistema = body.status ? mapearEstadoSistema(body.status) : undefined
    let fechaInicioReal = body.startedAt || otActual.fechaInicioReal
    let fechaFinReal = body.completedAt || otActual.fechaFinReal

    if (estadoSistema === 'En Progreso' && !fechaInicioReal) {
      fechaInicioReal = new Date().toISOString()
    }
    if (estadoSistema === 'Completado' && !fechaFinReal) {
      fechaFinReal = new Date().toISOString()
    }

    const ot = await withRetry(() =>
      db.ordenTrabajo.update({
        where: { id },
        data: {
          titulo: body.activities ? body.activities.join(', ') : undefined,
          estado: estadoSistema,
          ubicacion: body.zoneName !== undefined ? body.zoneName : undefined,
          descripcion: body.description !== undefined ? body.description : undefined,
          fechaInicioReal: fechaInicioReal !== undefined ? fechaInicioReal : undefined,
          fechaFinReal: fechaFinReal !== undefined ? fechaFinReal : undefined,
          fotosAntes: body.photosBefore ? JSON.stringify(body.photosBefore) : undefined,
          fotosDespues: body.photosAfter ? JSON.stringify(body.photosAfter) : undefined,
          progreso: body.status === 'Terminada' ? 100 : (body.status === 'En Proceso' ? 50 : undefined),
          asignadoId: body.collaborators?.[0] || undefined,
        },
      })
    )

    return NextResponse.json({
      id: ot.id,
      otId: ot.otNum,
      activities: ot.titulo ? ot.titulo.split(', ').filter(Boolean) : [],
      collaborators: ot.asignadoId ? [ot.asignadoId] : [],
      zoneName: ot.ubicacion || '',
      description: ot.descripcion || ot.titulo || '',
      status: mapearEstadoMovil(ot.estado),
      startedAt: ot.fechaInicioReal,
      completedAt: ot.fechaFinReal,
      createdAt: ot.createdAt.toISOString(),
      updatedAt: ot.updatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Error updating OT móvil:', error)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await withRetry(() => db.ordenTrabajo.delete({ where: { id } }))
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

function mapearEstadoMovil(estadoSistema: string): string {
  const mapeo: Record<string, string> = {
    'Pendiente': 'Pendiente', 'En Progreso': 'En Proceso',
    'Completado': 'Terminada', 'Cancelado': 'Pendiente',
  }
  return mapeo[estadoSistema] || 'Pendiente'
}

function mapearEstadoSistema(estadoMovil: string): string {
  const mapeo: Record<string, string> = {
    'Pendiente': 'Pendiente', 'En Proceso': 'En Progreso', 'Terminada': 'Completado',
  }
  return mapeo[estadoMovil] || 'Pendiente'
}
