import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Listar notificaciones
export async function GET() {
  try {
    const notificaciones = await db.notificacion.findMany({
      orderBy: { createdAt: 'desc' }
    })

    // Calcular estadísticas
    const total = notificaciones.length
    const noLeidas = notificaciones.filter(n => !n.leido).length
    const urgentes = notificaciones.filter(n => n.tipo === 'Urgente').length
    const enviadas = notificaciones.filter(n => n.fechaEnvio).length

    return NextResponse.json({
      notificaciones,
      stats: {
        total,
        noLeidas,
        urgentes,
        enviadas
      }
    })
  } catch (error) {
    console.error('Error fetching notificaciones:', error)
    return NextResponse.json({ error: 'Error al obtener notificaciones' }, { status: 500 })
  }
}

// POST - Crear notificación
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const notificacion = await db.notificacion.create({
      data: {
        titulo: data.titulo,
        mensaje: data.mensaje,
        tipo: data.tipo || 'Info',
        categoria: data.categoria || 'General',
        destino: data.destino || 'Todos',
        destinoId: data.destinoId,
        leido: false,
        fechaEnvio: new Date().toISOString().split('T')[0]
      }
    })

    return NextResponse.json(notificacion)
  } catch (error) {
    console.error('Error creating notificación:', error)
    return NextResponse.json({ error: 'Error al crear notificación' }, { status: 500 })
  }
}
