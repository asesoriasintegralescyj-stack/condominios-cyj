import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// GET - Listar notificaciones
export async function GET() {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  try {
    const notificaciones = await withRetry(() => db.notificacion.findMany({
      orderBy: { createdAt: 'desc' }
    }))

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
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'configuracion.editar', session.userPermisos)) {
    return apiError('Sin permisos', 403)
  }
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
