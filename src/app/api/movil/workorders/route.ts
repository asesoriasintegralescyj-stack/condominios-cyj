import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'

/**
 * API ADAPTADORA para la app móvil.
 * Lee/escribe en la MISMA tabla OrdenTrabajo de Aiven que el sistema de escritorio.
 * Devuelve los datos en formato WorkOrder que entiende LagunaNorteApp.tsx.
 */

// GET - Listar OTs
export async function GET() {
  try {
    const ots = await withRetry(() =>
      db.ordenTrabajo.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
      })
    )

    const workOrders = ots.map(ot => ({
      id: ot.id,
      otId: ot.otNum,
      activities: ot.titulo ? ot.titulo.split(', ').filter(Boolean) : [],
      collaborators: ot.asignadoId ? [ot.asignadoId] : [],
      zoneName: ot.ubicacion || '',
      description: ot.descripcion || ot.titulo || '',
      status: mapearEstadoMovil(ot.estado),
      plannedDate: ot.fechaInicio || null,
      photosBefore: ot.fotosAntes ? safeParseArray(ot.fotosAntes) : [],
      photosAfter: ot.fotosDespues ? safeParseArray(ot.fotosDespues) : [],
      recurringId: null,
      startedAt: ot.fechaInicioReal || null,
      completedAt: ot.fechaFinReal || null,
      createdAt: ot.createdAt.toISOString(),
      updatedAt: ot.updatedAt.toISOString(),
      prioridad: ot.prioridad,
      tipo: ot.tipo,
    }))

    return NextResponse.json(workOrders)
  } catch (error) {
    console.error('Error fetching OTs móviles:', error)
    return NextResponse.json([])
  }
}

// POST - Crear nueva OT (compartida con sistema escritorio)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Generar número de OT usando Secuencia (compartido)
    const secuencia = await withRetry(() =>
      db.secuencia.upsert({
        where: { tabla: 'OrdenTrabajo' },
        update: { ultimoNum: { increment: 1 } },
        create: { tabla: 'OrdenTrabajo', prefijo: 'OT', ultimoNum: 1, padding: 4 },
      })
    )

    const otNum = `OT-${String(secuencia.ultimoNum).padStart(4, '0')}`
    const activities = body.activities || []
    const titulo = activities.length > 0 ? activities.join(', ') : (body.description || 'OT Móvil')
    const estado = mapearEstadoSistema(body.status || 'Pendiente')

    const nuevaOT = await withRetry(() =>
      db.ordenTrabajo.create({
        data: {
          otNum,
          titulo,
          tipo: body.tipo || 'Correctivo',
          prioridad: body.prioridad || 'Media',
          estado,
          ubicacion: body.zoneName || null,
          descripcion: body.description || null,
          fechaInicio: body.plannedDate || null,
          fechaInicioReal: body.startedAt || null,
          fechaFinReal: body.completedAt || null,
          fotosAntes: body.photosBefore?.length > 0 ? JSON.stringify(body.photosBefore) : null,
          fotosDespues: body.photosAfter?.length > 0 ? JSON.stringify(body.photosAfter) : null,
          progreso: body.status === 'Terminada' ? 100 : (body.status === 'En Proceso' ? 50 : 0),
          asignadoId: body.collaborators?.[0] || null,
          estadoAprobacion: 'Pendiente',
        },
      })
    )

    return NextResponse.json({
      id: nuevaOT.id,
      otId: nuevaOT.otNum,
      activities,
      collaborators: body.collaborators || [],
      zoneName: body.zoneName || '',
      description: body.description || '',
      status: mapearEstadoMovil(nuevaOT.estado),
      plannedDate: body.plannedDate || null,
      photosBefore: body.photosBefore || [],
      photosAfter: body.photosAfter || [],
      startedAt: body.startedAt || null,
      completedAt: body.completedAt || null,
      createdAt: nuevaOT.createdAt.toISOString(),
      updatedAt: nuevaOT.updatedAt.toISOString(),
      prioridad: nuevaOT.prioridad,
      tipo: nuevaOT.tipo,
    })
  } catch (error) {
    console.error('Error creando OT móvil:', error)
    return NextResponse.json({ error: 'Error creando OT' }, { status: 500 })
  }
}

function mapearEstadoMovil(estadoSistema: string): string {
  const mapeo: Record<string, string> = {
    'Pendiente': 'Pendiente',
    'En Progreso': 'En Proceso',
    'Completado': 'Terminada',
    'Cancelado': 'Pendiente',
  }
  return mapeo[estadoSistema] || 'Pendiente'
}

function mapearEstadoSistema(estadoMovil: string): string {
  const mapeo: Record<string, string> = {
    'Pendiente': 'Pendiente',
    'En Proceso': 'En Progreso',
    'Terminada': 'Completado',
  }
  return mapeo[estadoMovil] || 'Pendiente'
}

function safeParseArray(str: string): string[] {
  try {
    const parsed = JSON.parse(str)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
