/**
 * API para gestión de Rondas
 * Sistema de Gestión de Condominios
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET - Listar todas las rondas
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const condominioId = searchParams.get('condominioId')

    const where: any = {}
    if (condominioId) {
      where.condominioId = condominioId
    }

    const rondas = await db.ronda.findMany({
      where,
      include: {
        _count: {
          select: { registros: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(rondas)
  } catch (error) {
    console.error('Error fetching rondas:', error)
    return NextResponse.json({ error: 'Error al obtener rondas' }, { status: 500 })
  }
}

// POST - Crear nueva ronda
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { nombre, ubicacion, descripcion, condominioId } = body

    // Generar código único para QR
    const crypto = await import('crypto')
    const codigo = `RONDA-${crypto.randomBytes(8).toString('hex').toUpperCase()}`

    const ronda = await db.ronda.create({
      data: {
        nombre,
        codigo,
        ubicacion,
        descripcion,
        condominioId,
        creadoPor: user.id,
        creadoPorNombre: `${user.nombre} ${user.apellido || ''}`.trim()
      }
    })

    return NextResponse.json(ronda)
  } catch (error) {
    console.error('Error creating ronda:', error)
    return NextResponse.json({ error: 'Error al crear ronda' }, { status: 500 })
  }
}
