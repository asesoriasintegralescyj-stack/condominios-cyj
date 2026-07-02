/**
 * API para gestión de una ronda específica
 * Sistema de Gestión de Condominios
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET - Obtener ronda por ID con registros
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    const ronda = await db.ronda.findUnique({
      where: { id },
      include: {
        registros: {
          orderBy: { createdAt: 'desc' },
          take: 50
        }
      }
    })

    if (!ronda) {
      return NextResponse.json({ error: 'Ronda no encontrada' }, { status: 404 })
    }

    return NextResponse.json(ronda)
  } catch (error) {
    console.error('Error fetching ronda:', error)
    return NextResponse.json({ error: 'Error al obtener ronda' }, { status: 500 })
  }
}

// PUT - Actualizar ronda
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { nombre, ubicacion, descripcion, activo } = body

    const ronda = await db.ronda.update({
      where: { id },
      data: {
        nombre,
        ubicacion,
        descripcion,
        activo
      }
    })

    return NextResponse.json(ronda)
  } catch (error) {
    console.error('Error updating ronda:', error)
    return NextResponse.json({ error: 'Error al actualizar ronda' }, { status: 500 })
  }
}

// DELETE - Eliminar ronda
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    // Eliminar registros primero
    await db.registroRonda.deleteMany({
      where: { rondaId: id }
    })

    // Eliminar ronda
    await db.ronda.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting ronda:', error)
    return NextResponse.json({ error: 'Error al eliminar ronda' }, { status: 500 })
  }
}
