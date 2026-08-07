import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'
import { generarCorrelativo } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// GET - List all cat tareas
export async function GET() {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'catalogos.ver')) {
    return apiError('Sin permisos', 403)
  }
  try {
    const tareas = await withRetry(() => db.catTarea.findMany({
      orderBy: { nombre: 'asc' }
    }))
    
    return NextResponse.json(tareas)
  } catch (error) {
    console.error('Error fetching tareas:', error)
    return NextResponse.json({ error: 'Error fetching tareas' }, { status: 500 })
  }
}

// POST - Create new cat tarea
export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'catalogos.crear')) {
    return apiError('Sin permisos', 403)
  }
  try {
    const data = await request.json()

    // Generar código automático si no se proporciona usando tabla de secuencias
    let codigo = data.codigo || null
    if (!codigo) {
      const { generarCorrelativoDB } = await import('@/lib/utils')
      codigo = await generarCorrelativoDB(db, 'CatTarea', 'TAR', 3)
    }

    const tarea = await db.catTarea.create({
      data: {
        codigo,
        nombre: data.nombre,
        categoria: data.categoria || 'General',
        sistema: data.sistema || null,
        tipoMantencion: data.tipoMantencion || 'Preventivo',
        frecuencia: data.frecuencia || null,
        responsable: data.responsable || null,
        tiempoEstimado: parseInt(data.tiempoEstimado) || 0,
        descripcion: data.descripcion || null,
      }
    })
    
    return NextResponse.json(tarea)
  } catch (error) {
    console.error('Error creating tarea:', error)
    return NextResponse.json({ error: 'Error creating tarea' }, { status: 500 })
  }
}
