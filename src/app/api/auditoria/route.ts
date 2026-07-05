/**
 * API de Auditoría del Sistema
 */

import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { getCurrentSession, hasPermission } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

export async function GET(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return apiError('No autenticado', 401);
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'logs.ver')) {
    return apiError('Sin permisos', 403);
  }
  try {
    const searchParams = request.nextUrl.searchParams
    const tipoAccion = searchParams.get('tipoAccion')
    const modulo = searchParams.get('modulo')
    const usuario = searchParams.get('usuario')
    const resultado = searchParams.get('resultado')
    const fechaDesde = searchParams.get('fechaDesde')
    const fechaHasta = searchParams.get('fechaHasta')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    // Construir filtros
    const where: Prisma.AuditoriaSistemaWhereInput = {}
    
    if (tipoAccion) {
      where.tipoAccion = tipoAccion
    }
    
    if (modulo) {
      where.modulo = modulo
    }
    
    if (usuario) {
      where.usuarioNombre = { contains: usuario }
    }
    
    if (resultado) {
      where.resultado = resultado
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
    
    if (search) {
      where.OR = [
        { descripcion: { contains: search } },
        { modulo: { contains: search } },
        { usuarioNombre: { contains: search } },
        { entidad: { contains: search } },
      ]
    }
    
    // Obtener total
    const total = await withRetry(() => db.auditoriaSistema.count({ where }))
    
    // Obtener registros
    const registros = await withRetry(() => db.auditoriaSistema.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }))
    
    // Calcular estadísticas
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const accionesHoy = await withRetry(() => db.auditoriaSistema.count({
      where: { createdAt: { gte: hoy } }
    }))
    
    const semanaAtras = new Date()
    semanaAtras.setDate(semanaAtras.getDate() - 7)
    const accionesSemana = await withRetry(() => db.auditoriaSistema.count({
      where: { createdAt: { gte: semanaAtras } }
    }))
    
    const erroresRecientes = await withRetry(() => db.auditoriaSistema.count({
      where: { 
        resultado: 'Fallido',
        createdAt: { gte: semanaAtras }
      }
    }))
    
    // Acciones por módulo (top 10) - usar groupBy en vez de findMany completo
    const modulosGroup = await db.auditoriaSistema.groupBy({
      by: ['modulo'],
      _count: true,
      orderBy: { _count: { modulo: 'desc' } },
      take: 10,
    })
    const accionesPorModulo: Record<string, number> = {}
    modulosGroup.forEach(g => {
      accionesPorModulo[g.modulo] = g._count
    })

    // Obtener módulos únicos para filtros (usar distinct en findMany)
    const modulosUnicos = modulosGroup.map(g => g.modulo).sort()

    // Usuarios únicos para filtros (usar distinct en findMany con select mínimo)
    const usuarios = await db.auditoriaSistema.findMany({
      select: { usuarioNombre: true },
      distinct: ['usuarioNombre'],
      where: { usuarioNombre: { not: null } },
      take: 100,  // Limitar para evitar cargar toda la tabla
    })
    const usuariosUnicos = usuarios.map(u => u.usuarioNombre).filter(Boolean).sort()
    
    return NextResponse.json({
      registros,
      total,
      page,
      limit,
      stats: {
        accionesHoy,
        accionesSemana,
        erroresRecientes,
        accionesPorModulo,
      },
      filtros: {
        modulos: modulosUnicos,
        usuarios: usuariosUnicos,
      }
    })
    
  } catch (error) {
    console.error('Error fetching auditoria:', error)
    return NextResponse.json({ error: 'Error al obtener auditoría' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  return apiError('No se permite crear entradas de auditoría manualmente', 403);
}
