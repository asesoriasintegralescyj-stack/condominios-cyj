/**
 * API para registrar una ronda escaneada
 * Sistema de Gestión de Condominios
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { codigo, ubicacion, latitud, longitud, observaciones } = body

    if (!codigo) {
      return NextResponse.json({ error: 'Código requerido' }, { status: 400 })
    }

    // Buscar la ronda por código
    const ronda = await db.ronda.findUnique({
      where: { codigo }
    })

    if (!ronda) {
      return NextResponse.json({ error: 'Código de ronda no válido' }, { status: 404 })
    }

    if (!ronda.activo) {
      return NextResponse.json({ error: 'Esta ronda está inactiva' }, { status: 400 })
    }

    // Registrar la ronda
    const now = new Date()
    const fecha = now.toISOString().split('T')[0]
    const hora = now.toTimeString().split(' ')[0].substring(0, 5)

    const registro = await db.registroRonda.create({
      data: {
        rondaId: ronda.id,
        usuarioId: user.id,
        usuarioNombre: `${user.nombre} ${user.apellido || ''}`.trim(),
        fecha,
        hora,
        ubicacion: ubicacion || ronda.ubicacion,
        latitud: latitud ? parseFloat(latitud) : null,
        longitud: longitud ? parseFloat(longitud) : null,
        observaciones
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Ronda registrada exitosamente',
      registro,
      ronda: {
        id: ronda.id,
        nombre: ronda.nombre,
        ubicacion: ronda.ubicacion
      }
    })
  } catch (error) {
    console.error('Error registrando ronda:', error)
    return NextResponse.json({ error: 'Error al registrar ronda' }, { status: 500 })
  }
}
