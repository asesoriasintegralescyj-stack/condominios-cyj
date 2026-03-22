import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Listar todas las reservas
export async function GET() {
  try {
    const reservas = await db.reserva.findMany({
      include: {
        residenteRel: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            unidad: true,
            telefono: true,
            email: true,
          }
        }
      },
      orderBy: [
        { fecha: 'desc' },
        { horaInicio: 'asc' }
      ]
    })
    return NextResponse.json(reservas)
  } catch (error) {
    console.error('Error fetching reservas:', error)
    return NextResponse.json({ error: 'Error al obtener reservas' }, { status: 500 })
  }
}

// POST - Crear nueva reserva
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const reserva = await db.reserva.create({
      data: {
        titulo: data.titulo,
        espacio: data.espacio,
        fecha: data.fecha,
        horaInicio: data.horaInicio,
        horaFin: data.horaFin,
        residente: data.residente,
        unidad: data.unidad || null,
        telefono: data.telefono || null,
        email: data.email || null,
        numPersonas: parseInt(data.numPersonas) || 1,
        estado: data.estado || 'Pendiente',
        monto: parseFloat(data.monto) || 0,
        pagado: data.pagado || false,
        comprobante: data.comprobante || null,
        notas: data.notas || null,
        residenteId: data.residenteId || null,
      }
    })
    
    return NextResponse.json(reserva)
  } catch (error) {
    console.error('Error creating reserva:', error)
    return NextResponse.json({ error: 'Error al crear reserva' }, { status: 500 })
  }
}
