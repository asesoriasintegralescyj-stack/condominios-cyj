/**
 * API de Estado de Cuenta del Portal de Residentes
 * Permite a los residentes ver su propio estado de cuenta
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';

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
        },
      },
    },
  });

  if (!acceso || (acceso.fechaExpiracion && acceso.fechaExpiracion < new Date())) {
    return null;
  }

  return acceso;
}

// GET - Obtener estado de cuenta del residente
export async function GET(request: NextRequest) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const residenteId = session.residenteId;
    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get('periodo');

    // Obtener estado de cuenta
    const whereClause: { residenteId: string; periodo?: string } = { residenteId };
    if (periodo) whereClause.periodo = periodo;

    const estadosCuenta = await db.estadoCuenta.findMany({
      where: whereClause,
      include: {
        detalles: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { fechaGeneracion: 'desc' },
      take: 12, // Últimos 12 meses
    });

    // Obtener deudas pendientes
    const deudas = await db.deuda.findMany({
      where: {
        residenteId,
        estado: { in: ['Pendiente', 'Parcial'] },
      },
      orderBy: { fechaVencimiento: 'asc' },
    });

    // Calcular totales
    const totalDeuda = deudas.reduce((sum, d) => sum + d.montoTotal, 0);
    const totalIntereses = deudas.reduce((sum, d) => sum + d.montoInteres, 0);
    const deudasVencidas = deudas.filter(d => d.diasMora > 0);

    // Obtener últimos pagos
    const ultimosPagos = await db.pagoGastoComun.findMany({
      where: { residenteId },
      include: {
        gastoComun: {
          select: { periodo: true },
        },
      },
      orderBy: { fechaPago: 'desc' },
      take: 6,
    });

    return NextResponse.json({
      residente: session.residente,
      estadosCuenta,
      deudas,
      resumen: {
        totalDeuda,
        totalIntereses,
        cantidadDeudas: deudas.length,
        deudasVencidas: deudasVencidas.length,
      },
      ultimosPagos,
    });
  } catch (error) {
    console.error('Error obteniendo estado de cuenta:', error);
    return NextResponse.json(
      { error: 'Error al obtener estado de cuenta' },
      { status: 500 }
    );
  }
}
