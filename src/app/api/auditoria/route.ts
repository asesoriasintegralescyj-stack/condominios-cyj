/**
 * API de Auditoría del Sistema
 *
 * Usa el modelo LogAuditoria (único modelo de logs disponible en el schema).
 * Mapea los campos del frontend a los campos de LogAuditoria:
 *   - tipoAccion  -> accion (login, logout, create, update, delete)
 *   - modulo      -> entidad
 *   - usuarioNombre -> (no existe; usamos user.email via relación)
 *   - resultado   -> (no existe; no se filtra)
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
    const tipoAccion = searchParams.get('tipoAccion') || searchParams.get('accion')
    const modulo = searchParams.get('modulo') || searchParams.get('entidad')
    const fechaDesde = searchParams.get('fechaDesde')
    const fechaHasta = searchParams.get('fechaHasta')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Construir filtros para LogAuditoria
    const where: Prisma.LogAuditoriaWhereInput = {}

    if (tipoAccion) {
      where.accion = tipoAccion
    }

    if (modulo) {
      where.entidad = modulo
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
        { accion: { contains: search } },
        { entidad: { contains: search } },
        { entidadId: { contains: search } },
      ]
    }

    // Obtener total
    const total = await withRetry(() => db.logAuditoria.count({ where }))

    // Obtener registros (con user para mostrar quién hizo la acción)
    const registrosRaw = await withRetry(() => db.logAuditoria.findMany({
      where,
      include: {
        user: {
          select: { id: true, email: true, nombre: true, apellido: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }))

    // Adaptar campos al formato que espera el frontend
    const registros = registrosRaw.map(r => ({
      id: r.id,
      tipoAccion: r.accion,
      modulo: r.entidad,
      entidad: r.entidad,
      entidadId: r.entidadId,
      descripcion: `${r.accion} en ${r.entidad}${r.entidadId ? ` (${r.entidadId})` : ''}`,
      usuarioNombre: r.user ? `${r.user.nombre} ${r.user.apellido || ''}`.trim() : 'Sistema',
      usuarioEmail: r.user?.email || null,
      ip: r.ip,
      resultado: 'Exitoso', // LogAuditoria no tiene campo resultado; asumimos exitoso
      createdAt: r.createdAt,
    }))

    // Calcular estadísticas
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const accionesHoy = await withRetry(() => db.logAuditoria.count({
      where: { createdAt: { gte: hoy } }
    }))

    const semanaAtras = new Date()
    semanaAtras.setDate(semanaAtras.getDate() - 7)
    const accionesSemana = await withRetry(() => db.logAuditoria.count({
      where: { createdAt: { gte: semanaAtras } }
    }))

    // LogAuditoria no tiene campo resultado, así que erroresRecientes = 0
    const erroresRecientes = 0

    // Acciones por módulo (entidad) - top 10
    const modulosGroup = await withRetry(() => db.logAuditoria.groupBy({
      by: ['entidad'],
      _count: true,
      orderBy: { _count: { entidad: 'desc' } },
      take: 10,
    }))
    const accionesPorModulo: Record<string, number> = {}
    modulosGroup.forEach(g => {
      accionesPorModulo[g.entidad] = g._count
    })

    // Módulos únicos para filtros
    const modulosUnicos = modulosGroup.map(g => g.entidad).sort()

    // Acciones únicas para filtros
    const accionesGroup = await withRetry(() => db.logAuditoria.groupBy({
      by: ['accion'],
      _count: true,
    }))
    const accionesUnicas = accionesGroup.map(g => g.accion).sort()

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
        tiposAccion: accionesUnicas,
        usuarios: [], // LogAuditoria no tiene campo usuario directo
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
