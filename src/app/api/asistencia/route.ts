import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Obtener asistencia por fecha y condominio
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fecha = searchParams.get('fecha')
    const condominioId = searchParams.get('condominioId')

    if (!fecha) {
      return NextResponse.json({ error: 'Fecha requerida' }, { status: 400 })
    }

    // Obtener personal del condominio (solo activo)
    const whereClause: Record<string, unknown> = { estado: 'Activo' }
    if (condominioId && condominioId !== 'all') {
      whereClause.condominioId = condominioId
    }

    const personal = await db.personal.findMany({
      where: whereClause,
      orderBy: { nombre: 'asc' }
    })

    // Obtener asistencias existentes para la fecha
    const asistencias = await db.asistencia.findMany({
      where: { fecha },
      include: { personal: true }
    })

    // Combinar personal con sus asistencias
    const registros = personal.map(p => {
      const asistencia = asistencias.find(a => a.personalId === p.id)
      return {
        id: asistencia?.id || p.id,
        personalId: p.id,
        nombre: p.nombre,
        cargo: p.cargo,
        fecha,
        horaEntrada: asistencia?.horaEntrada || null,
        horaSalida: asistencia?.horaSalida || null,
        estado: asistencia?.estado || 'Pendiente',
        observaciones: asistencia?.observaciones || null,
        isNew: !asistencia
      }
    })

    return NextResponse.json(registros)
  } catch (error) {
    console.error('Error fetching asistencia:', error)
    return NextResponse.json({ error: 'Error al obtener asistencia' }, { status: 500 })
  }
}

// POST - Registrar entrada, salida o cambiar estado
export async function POST(request: Request) {
  try {
    const data = await request.json()
    const { personalId, fecha, horaEntrada, horaSalida, estado, observaciones } = data

    if (!personalId || !fecha) {
      return NextResponse.json({ error: 'personalId y fecha son requeridos' }, { status: 400 })
    }

    // Verificar si ya existe un registro para este personal en esta fecha
    const existente = await db.asistencia.findUnique({
      where: {
        personalId_fecha: { personalId, fecha }
      }
    })

    let asistencia

    if (existente) {
      // Construir objeto de actualización preservando valores existentes
      const updateData: Record<string, unknown> = {}
      
      // Solo actualizar horaEntrada si se proporciona explícitamente
      if (horaEntrada !== undefined) {
        updateData.horaEntrada = horaEntrada
      }
      
      // Solo actualizar horaSalida si se proporciona explícitamente
      if (horaSalida !== undefined) {
        updateData.horaSalida = horaSalida
      }
      
      // Solo actualizar estado si se proporciona
      if (estado !== undefined) {
        updateData.estado = estado
      }
      
      // Solo actualizar observaciones si se proporciona
      if (observaciones !== undefined) {
        updateData.observaciones = observaciones
      }

      asistencia = await db.asistencia.update({
        where: { id: existente.id },
        data: updateData
      })
    } else {
      // Crear nuevo registro
      asistencia = await db.asistencia.create({
        data: {
          personalId,
          fecha,
          horaEntrada: horaEntrada || null,
          horaSalida: horaSalida || null,
          estado: estado || 'Pendiente',
          observaciones: observaciones || null,
        }
      })
    }

    return NextResponse.json(asistencia)
  } catch (error) {
    console.error('Error saving asistencia:', error)
    return NextResponse.json({ error: 'Error al guardar asistencia' }, { status: 500 })
  }
}
