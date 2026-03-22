/**
 * API de Auditoría del Sistema
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

export async function GET(request: NextRequest) {
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
    const total = await db.auditoriaSistema.count({ where })
    
    // Obtener registros
    const registros = await db.auditoriaSistema.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })
    
    // Calcular estadísticas
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const accionesHoy = await db.auditoriaSistema.count({
      where: { createdAt: { gte: hoy } }
    })
    
    const semanaAtras = new Date()
    semanaAtras.setDate(semanaAtras.getDate() - 7)
    const accionesSemana = await db.auditoriaSistema.count({
      where: { createdAt: { gte: semanaAtras } }
    })
    
    const erroresRecientes = await db.auditoriaSistema.count({
      where: { 
        resultado: 'Fallido',
        createdAt: { gte: semanaAtras }
      }
    })
    
    // Acciones por módulo (top 10)
    const todosRegistros = await db.auditoriaSistema.findMany({
      select: { modulo: true }
    })
    
    const accionesPorModulo: Record<string, number> = {}
    todosRegistros.forEach(r => {
      accionesPorModulo[r.modulo] = (accionesPorModulo[r.modulo] || 0) + 1
    })
    
    // Obtener módulos únicos y usuarios únicos para filtros
    const modulosUnicos = [...new Set(todosRegistros.map(r => r.modulo))].sort()
    
    const usuarios = await db.auditoriaSistema.findMany({
      select: { usuarioNombre: true },
      distinct: ['usuarioNombre']
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
  try {
    const data = await request.json()
    
    const registro = await db.auditoriaSistema.create({
      data: {
        tipoAccion: data.tipoAccion || 'Acceso',
        modulo: data.modulo || 'Sistema',
        descripcion: data.descripcion || '',
        entidad: data.entidad || null,
        entidadId: data.entidadId || null,
        datosAntes: data.datosAntes ? JSON.stringify(data.datosAntes) : null,
        datosDespues: data.datosDespues ? JSON.stringify(data.datosDespues) : null,
        usuarioId: data.usuarioId || null,
        usuarioNombre: data.usuarioNombre || null,
        ip: data.ip || null,
        userAgent: data.userAgent || null,
        resultado: data.resultado || 'Exitoso',
        mensajeError: data.mensajeError || null,
      }
    })
    
    return NextResponse.json(registro)
    
  } catch (error) {
    console.error('Error creating auditoria:', error)
    return NextResponse.json({ error: 'Error al crear registro de auditoría' }, { status: 500 })
  }
}
