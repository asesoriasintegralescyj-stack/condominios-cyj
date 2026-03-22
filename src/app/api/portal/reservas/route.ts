/**
 * API de Reservas del Portal de Residentes
 * Permite a los residentes gestionar sus propias reservas
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

// Espacios comunes disponibles
const ESPACIOS_COMUNES = [
  'Quincho',
  'Sala de Eventos',
  'Piscina',
  'Estacionamiento Visita',
  'Cancha Deportiva',
  'Gimnasio',
  'Sala de Reuniones',
  'Parrilla',
  'Juegos Infantiles',
];

// Helper para verificar sesión del portal
async function getPortalSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('portal_token')?.value;

  if (!token) return null;

  const acceso = await db.accesoPortal.findUnique({
    where: { token, activo: true },
    include: {
      residente: {
        select: {
          id: true,
          nombre: true,
          apellido: true,
          unidad: true,
          email: true,
          telefono: true,
        },
      },
    },
  });

  if (!acceso || (acceso.fechaExpiracion && acceso.fechaExpiracion < new Date())) {
    return null;
  }

  return acceso;
}

// GET - Obtener reservas del residente y disponibilidad
export async function GET(request: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const espacio = searchParams.get('espacio');
    const fecha = searchParams.get('fecha');

    // Si se solicita disponibilidad
    if (espacio && fecha) {
      const reservasEspacio = await db.reserva.findMany({
        where: {
          espacio,
          fecha,
          estado: { in: ['Pendiente', 'Confirmada'] },
        },
        select: {
          horaInicio: true,
          horaFin: true,
        },
      });

      return NextResponse.json({
        espacio,
        fecha,
        reservasExistentes: reservasEspacio,
        espaciosDisponibles: ESPACIOS_COMUNES,
      });
    }

    // Obtener todas las reservas del residente
    const reservas = await db.reserva.findMany({
      where: { residenteId: session.residenteId },
      orderBy: [{ fecha: 'desc' }, { horaInicio: 'asc' }],
    });

    // Obtener próximas reservas
    const hoy = new Date().toISOString().split('T')[0];
    const proximasReservas = reservas.filter(r => r.fecha >= hoy && r.estado !== 'Cancelada');

    return NextResponse.json({
      residente: session.residente,
      reservas,
      proximasReservas,
      espaciosDisponibles: ESPACIOS_COMUNES,
    });
  } catch (error) {
    console.error('Error obteniendo reservas:', error);
    return NextResponse.json(
      { error: 'Error al obtener reservas' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva reserva
export async function POST(request: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { espacio, fecha, horaInicio, horaFin, titulo, numPersonas, notas } = body;

    // Validaciones
    if (!espacio || !fecha || !horaInicio || !horaFin) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Verificar disponibilidad
    const reservasExistentes = await db.reserva.findMany({
      where: {
        espacio,
        fecha,
        estado: { in: ['Pendiente', 'Confirmada'] },
        OR: [
          {
            horaInicio: { lt: horaFin },
            horaFin: { gt: horaInicio },
          },
        ],
      },
    });

    if (reservasExistentes.length > 0) {
      return NextResponse.json(
        { error: 'El horario seleccionado no está disponible' },
        { status: 400 }
      );
    }

    // Verificar que tenemos datos del residente
    if (!session.residente) {
      return NextResponse.json(
        { error: 'Datos de residente no disponibles' },
        { status: 401 }
      );
    }

    // Crear reserva
    const reserva = await db.reserva.create({
      data: {
        titulo: titulo || `Reserva ${espacio}`,
        espacio,
        fecha,
        horaInicio,
        horaFin,
        residente: `${session.residente.nombre} ${session.residente.apellido || ''}`.trim(),
        unidad: session.residente.unidad || '',
        telefono: session.residente.telefono || null,
        email: session.residente.email || null,
        numPersonas: numPersonas || 1,
        estado: 'Pendiente',
        notas,
        residenteId: session.residenteId,
      },
    });

    return NextResponse.json(reserva);
  } catch (error) {
    console.error('Error creando reserva:', error);
    return NextResponse.json(
      { error: 'Error al crear reserva' },
      { status: 500 }
    );
  }
}

// PUT - Cancelar reserva
export async function PUT(request: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, accion } = body;

    // Verificar que la reserva pertenece al residente
    const reserva = await db.reserva.findFirst({
      where: {
        id,
        residenteId: session.residenteId,
      },
    });

    if (!reserva) {
      return NextResponse.json(
        { error: 'Reserva no encontrada' },
        { status: 404 }
      );
    }

    // Verificar si puede cancelar (mínimo 24 horas antes)
    if (accion === 'cancelar') {
      const fechaReserva = new Date(`${reserva.fecha}T${reserva.horaInicio}`);
      const ahora = new Date();
      const horasDiferencia = (fechaReserva.getTime() - ahora.getTime()) / (1000 * 60 * 60);

      if (horasDiferencia < 24) {
        return NextResponse.json(
          { error: 'No se puede cancelar con menos de 24 horas de anticipación' },
          { status: 400 }
        );
      }

      const updated = await db.reserva.update({
        where: { id },
        data: { estado: 'Cancelada' },
      });

      return NextResponse.json(updated);
    }

    return NextResponse.json(
      { error: 'Acción no válida' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error actualizando reserva:', error);
    return NextResponse.json(
      { error: 'Error al actualizar reserva' },
      { status: 500 }
    );
  }
}
