/**
 * API de Seguimiento de Aprobaciones OT
 * Usa el modelo HistorialAprobacionOT
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const otId = searchParams.get('otId')
  const userId = searchParams.get('userId')
  const fechaDesde = searchParams.get('fechaDesde')
  const fechaHasta = searchParams.get('fechaHasta')
  
  try {
    // Construir filtros
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}
    
    if (otId) {
      where.otId = otId
    }
    
    if (fechaDesde || fechaHasta) {
      where.createdAt = {}
      if (fechaDesde) {
        where.createdAt.gte = new Date(fechaDesde)
      }
      if (fechaHasta) {
        where.createdAt.lte = new Date(fechaHasta + 'T23:59:59')
      }
    }
    
    // Obtener historial de aprobaciones con relaciones
    const aprobaciones = await db.historialAprobacionOT.findMany({
      where,
      include: {
        ordenTrabajo: {
          select: {
            id: true,
            otNum: true,
            titulo: true,
            prioridad: true,
            estado: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    
    // Calcular estadísticas
    const todasAprobaciones = await db.historialAprobacionOT.findMany()
    
    // Estadísticas por estado nuevo
    const porEstado: Record<string, number> = {}
    todasAprobaciones.forEach(a => {
      porEstado[a.estadoNuevo] = (porEstado[a.estadoNuevo] || 0) + 1
    })
    
    // Contar pendientes y completadas (basado en estado de OT)
    const ots = await db.ordenTrabajo.findMany({
      select: { estado: true }
    })
    
    const pendientes = ots.filter(o => o.estado === 'Pendiente').length
    const completadas = ots.filter(o => o.estado === 'Completado').length
    const enProgreso = ots.filter(o => o.estado === 'En Progreso').length
    
    return NextResponse.json({
      aprobaciones,
      stats: {
        total: todasAprobaciones.length,
        porEstado,
        pendientes,
        completadas,
        enProgreso,
      }
    })
    
  } catch (error) {
    console.error('Error fetching aprobaciones:', error)
    return NextResponse.json({ error: 'Error al obtener aprobaciones' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const { otId, estadoAnterior, estadoNuevo, observaciones, aprobadoPor, nombreAprobador } = data
    
    // Crear registro en el historial
    const aprobacion = await db.historialAprobacionOT.create({
      data: {
        otId,
        estadoAnterior,
        estadoNuevo,
        observaciones,
        aprobadoPor,
        nombreAprobador,
        fechaAccion: new Date().toISOString(),
      },
      include: {
        ordenTrabajo: {
          select: { id: true, otNum: true, titulo: true, prioridad: true, estado: true }
        }
      }
    })
    
    return NextResponse.json(aprobacion)
    
  } catch (error) {
    console.error('Error creating aprobacion:', error)
    return NextResponse.json({ error: 'Error al crear aprobación' }, { status: 500 })
  }
}
