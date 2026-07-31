/**
 * API Montos Asignados por Personal para Rendiciones de Gastos
 * 
 * GET  - Listar montos asignados (de todo el personal activo)
 * POST - Crear/actualizar monto asignado para un empleado
 * DELETE - Eliminar monto asignado
 */
import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError, handlePrismaError } from '@/lib/api-helpers'

// GET - Listar todos los montos asignados con info del personal
export async function GET() {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  try {
    // Obtener personal activo
    const personal = await withRetry(() =>
      db.personal.findMany({
        where: { estado: 'Activo' },
        select: {
          id: true,
          nombre: true,
          cargo: true,
          estado: true,
        },
        orderBy: { nombre: 'asc' },
      })
    )

    // Obtener montos asignados
    const montos = await withRetry(() =>
      db.montoAsignadoPersonal.findMany({
        where: { estado: 'Activo' },
        include: {
          personal: { select: { id: true, nombre: true, cargo: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
    )

    // Combinar: para cada personal, buscar si tiene monto asignado
    const resultado = personal.map(p => {
      const montoAsignado = montos.find(m => m.personalId === p.id)
      return {
        personalId: p.id,
        nombre: p.nombre,
        cargo: p.cargo,
        montoAsignado: montoAsignado?.monto || 0,
        periodo: montoAsignado?.periodo || 'Mensual',
        montoId: montoAsignado?.id || null,
        notas: montoAsignado?.notas || null,
      }
    })

    return NextResponse.json(resultado)
  } catch (error) {
    return handlePrismaError(error)
  }
}

// POST - Crear o actualizar monto asignado
export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  if (session.user.rol !== 'admin' && session.user.rol !== 'supervisor') {
    return apiError('Sin permisos para asignar montos', 403)
  }

  try {
    const body = await request.json()
    const { personalId, monto, periodo, notas } = body

    if (!personalId) return apiError('personalId es obligatorio', 400)
    if (!monto || monto <= 0) return apiError('El monto debe ser mayor a 0', 400)

    // Verificar que el personal existe
    const personalExist = await withRetry(() =>
      db.personal.findUnique({ where: { id: personalId } })
    )
    if (!personalExist) return apiError('Personal no encontrado', 404)

    // Upsert: actualizar existente o crear nuevo
    const existente = await withRetry(() =>
      db.montoAsignadoPersonal.findFirst({
        where: { personalId, estado: 'Activo' },
      })
    )

    let resultado
    if (existente) {
      resultado = await withRetry(() =>
        db.montoAsignadoPersonal.update({
          where: { id: existente.id },
          data: {
            monto,
            periodo: periodo || 'Mensual',
            notas: notas || null,
          },
        })
      )
    } else {
      resultado = await withRetry(() =>
        db.montoAsignadoPersonal.create({
          data: {
            personalId,
            monto,
            periodo: periodo || 'Mensual',
            notas: notas || null,
          },
        })
      )
    }

    return NextResponse.json(resultado)
  } catch (error) {
    return handlePrismaError(error)
  }
}

// DELETE - Desactivar monto asignado
export async function DELETE(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  if (session.user.rol !== 'admin' && session.user.rol !== 'supervisor') {
    return apiError('Sin permisos para eliminar montos asignados', 403)
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return apiError('ID es obligatorio', 400)

    await withRetry(() =>
      db.montoAsignadoPersonal.update({
        where: { id },
        data: { estado: 'Inactivo' },
      })
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handlePrismaError(error)
  }
}
