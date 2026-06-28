import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'
import { apiError, handlePrismaError } from '@/lib/api-helpers'

// GET - Listar todos los condominios
export async function GET() {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'configuracion.ver')) {
    return apiError('Sin permisos', 403)
  }
  try {
    const condominios = await db.condominio.findMany({
      where: { estado: 'Activo' },
      orderBy: { nombre: 'asc' },
      select: {
        id: true,
        nombre: true,
        direccion: true,
        comuna: true,
        ciudad: true,
        rut: true,
        telefono: true,
        email: true,
        logo: true,
        etapas: true,
        estado: true,
        fechaInicio: true,
        notas: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json(condominios)
  } catch (error) {
    return handlePrismaError(error)
  }
}

// POST - Crear nuevo condominio
export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'configuracion.editar')) {
    return apiError('Sin permisos', 403)
  }
  try {
    const data = await request.json()

    if (!data.nombre || !data.nombre.trim()) {
      return apiError('El nombre del condominio es obligatorio', 400)
    }

    const etapasStr = Array.isArray(data.etapas) ? JSON.stringify(data.etapas) : (data.etapas || null)

    const condominio = await db.condominio.create({
      data: {
        nombre: data.nombre,
        direccion: data.direccion || null,
        comuna: data.comuna || null,
        ciudad: data.ciudad || null,
        rut: data.rut || null,
        telefono: data.telefono || null,
        email: data.email || null,
        etapas: etapasStr,
        estado: data.estado || 'Activo',
        fechaInicio: data.fechaInicio || null,
        notas: data.notas || null,
      },
    })

    return NextResponse.json(condominio)
  } catch (error) {
    return handlePrismaError(error)
  }
}
