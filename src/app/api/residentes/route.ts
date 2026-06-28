import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

// GET - List residentes (con paginación opcional)
export async function GET(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'residentes.ver')) {
    return apiError('Sin permisos', 403)
  }
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const etapa = searchParams.get('etapa') || ''

    // Paginación opcional: si se pasa ?page=X&limit=Y, se pagina;
    // si no, se devuelven todos (compatibilidad hacia atrás)
    const pageParam = searchParams.get('page')
    const limitParam = searchParams.get('limit')
    const usePagination = pageParam !== null || limitParam !== null
    const page = Math.max(1, parseInt(pageParam || '1'))
    const limit = Math.min(500, Math.max(1, parseInt(limitParam || '50')))

    const where = {
      AND: [
        search ? {
          OR: [
            { nombre: { contains: search } },
            { apellido: { contains: search } },
            { rut: { contains: search } },
            { unidad: { contains: search } },
            { etapa: { contains: search } },
          ]
        } : {},
        etapa ? { etapa: { equals: etapa } } : {},
      ]
    }

    if (usePagination) {
      const [residentes, total] = await Promise.all([
        db.residente.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true, nombre: true, apellido: true, rut: true, unidad: true,
            etapa: true, tipo: true, telefono: true, email: true,
            fechaIngreso: true, estado: true, createdAt: true, updatedAt: true,
            // Excluir vehiculos y notas (datos sensibles voluminosos) en listados
          },
        }),
        db.residente.count({ where }),
      ])

      return NextResponse.json({
        data: residentes,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      })
    }

    // Sin paginación: mantener formato original para compatibilidad
    const residentes = await db.residente.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, nombre: true, apellido: true, rut: true, unidad: true,
        etapa: true, tipo: true, telefono: true, email: true,
        fechaIngreso: true, estado: true, vehiculos: true, notas: true,
        propiedadId: true, createdAt: true, updatedAt: true,
      },
    })

    return NextResponse.json(residentes)
  } catch (error) {
    console.error('Error fetching residentes:', error)
    return NextResponse.json({ error: 'Error fetching residentes' }, { status: 500 })
  }
}

// POST - Create new residente
export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'residentes.crear')) {
    return apiError('Sin permisos', 403)
  }
  try {
    const data = await request.json()
    
    const residente = await db.residente.create({
      data: {
        nombre: data.nombre,
        apellido: data.apellido || null,
        rut: data.rut || null,
        unidad: data.unidad || null,
        etapa: data.etapa || null,
        tipo: data.tipo || 'Residente',
        telefono: data.telefono || null,
        email: data.email || null,
        fechaIngreso: data.fechaIngreso || null,
        estado: data.estado || 'Activo',
        vehiculos: data.vehiculos || null,
        notas: data.notas || null,
        propiedadId: data.propiedadId || null,
      }
    })
    
    return NextResponse.json(residente)
  } catch (error) {
    console.error('Error creating residente:', error)
    return NextResponse.json({ error: 'Error creating residente' }, { status: 500 })
  }
}
