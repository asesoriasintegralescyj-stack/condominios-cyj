import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'
import { apiError, handlePrismaError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * API de Condominios - Sistema CYJ
 *
 * ⚠️ IMPORTANTE: Este sistema gestiona UN SOLO CONDOMINIO llamado "LAGUNA NORTE".
 * Las "etapas" (ALBATROS, BANDURRIAS, etc.) son subdivisiones internas del
 * condominio, NO condominios separados.
 *
 * Por lo tanto:
 * - GET devuelve el condominio único (o array con un solo elemento para
 *   compatibilidad con código existente).
 * - POST permite ACTUALIZAR el condominio existente, pero NO crear uno nuevo.
 * - DELETE está bloqueado.
 */

const CONDOMINIO_ID = 'cmo9f3x7j0000ktyeb0rzhwt9' // LAGUNA NORTE

// GET - Obtener el condominio único (LAGUNA NORTE)
// Cualquier usuario autenticado puede ver el condominio (es necesario para todos los módulos)
export async function GET() {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  try {
    const condominio = await db.condominio.findFirst({
      orderBy: { createdAt: 'asc' },
    })

    if (!condominio) {
      return NextResponse.json([])
    }

    // Devolver como array para compatibilidad con el frontend
    return NextResponse.json([condominio])
  } catch (error) {
    return handlePrismaError(error)
  }
}

// POST - Actualizar el condominio único (NO crea uno nuevo)
export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'configuracion.editar', session.userPermisos)) {
    return apiError('Sin permisos', 403)
  }
  try {
    const data = await request.json()

    // Verificar si ya existe un condominio
    const existente = await db.condominio.findFirst({ orderBy: { createdAt: 'asc' } })

    if (existente) {
      // ACTUALIZAR el condominio existente (no crear uno nuevo)
      const etapasStr = Array.isArray(data.etapas)
        ? JSON.stringify(data.etapas)
        : (data.etapas || existente.etapas)

      const actualizado = await db.condominio.update({
        where: { id: existente.id },
        data: {
          nombre: data.nombre?.trim() || existente.nombre,
          direccion: data.direccion !== undefined ? data.direccion : existente.direccion,
          comuna: data.comuna !== undefined ? data.comuna : existente.comuna,
          ciudad: data.ciudad !== undefined ? data.ciudad : existente.ciudad,
          rut: data.rut !== undefined ? data.rut : existente.rut,
          telefono: data.telefono !== undefined ? data.telefono : existente.telefono,
          email: data.email !== undefined ? data.email : existente.email,
          etapas: etapasStr,
          estado: data.estado || existente.estado,
          fechaInicio: data.fechaInicio !== undefined ? data.fechaInicio : existente.fechaInicio,
          notas: data.notas !== undefined ? data.notas : existente.notas,
          logo: data.logo !== undefined ? data.logo : existente.logo,
        },
      })

      return NextResponse.json(actualizado)
    }

    // Solo si NO existe ningún condominio (caso de setup inicial), crear LAGUNA NORTE
    if (!data.nombre || !data.nombre.trim()) {
      return apiError('El nombre del condominio es obligatorio', 400)
    }

    const etapasStr = Array.isArray(data.etapas)
      ? JSON.stringify(data.etapas)
      : (data.etapas || null)

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

// PUT - Actualizar el condominio único (alias de POST)
export async function PUT(request: NextRequest) {
  return POST(request)
}

// DELETE - BLOQUEADO: el sistema requiere el condominio único
export async function DELETE() {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  return apiError(
    'No se puede eliminar el condominio. El sistema requiere exactamente un condominio configurado.',
    403
  )
}
