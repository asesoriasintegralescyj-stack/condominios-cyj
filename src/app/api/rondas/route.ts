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
    const { nombre, ubicacion, descripcion, condominioId, qrCodigo, activo } = body

    // Validación mínima
    if (!nombre || !ubicacion) {
      return NextResponse.json(
        { error: 'Nombre y ubicación son obligatorios' },
        { status: 400 }
      )
    }

    // Generar código único para QR
    const crypto = await import('crypto')
    const codigo = `RONDA-${crypto.randomBytes(8).toString('hex').toUpperCase()}`

    // qrCodigo: si viene en el body se usa; si no, se codifica el código generado
    // (la API /api/rondas/registrar acepta el campo `codigo` para registrar la ronda).
    const finalQrCodigo = qrCodigo && String(qrCodigo).trim()
      ? String(qrCodigo).trim()
      : codigo

    const ronda = await db.ronda.create({
      data: {
        nombre,
        codigo,
        ubicacion,
        descripcion,
        qrCodigo: finalQrCodigo,
        activo: typeof activo === 'boolean' ? activo : true,
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
