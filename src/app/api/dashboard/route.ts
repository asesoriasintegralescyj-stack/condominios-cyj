/**
 * API Dashboard - Sistema CYJ Condominios
 *
 * OPTIMIZADO: Usa count/aggregate/groupBy en vez de findMany con todos los datos.
 * Reduce significativamente el tiempo de respuesta y uso de memoria.
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError, handlePrismaError } from '@/lib/api-helpers'

// GET - Dashboard stats (requiere auth)
export async function GET() {
  const session = await getCurrentSession();
  if (!session) return apiError('No autenticado', 401);

  try {
    // 1. Conteos y agregaciones en paralelo (sin traer todas las filas)
    const [
      totalPropiedades,
      totalResidentes,
      morosos,
      totalPersonal,
      totalActivos,
      valorActivosAgg,
      caja,
      totalCentros,
      otGroupByEstado,
      otGroupByAprobacion,
      otCompletadasAprobacion,
      gastosAgg,
      gastosDelMesAgg,
      recentOT,
      centrosConGastoAgg,
      documentosCumplimiento,
      resumenCumplimiento,
    ] = await Promise.all([
      db.propiedad.count(),
      db.residente.count(),
      db.residente.count({ where: { estado: 'Moroso' } }),
      db.personal.count(),
      db.activo.count(),
      db.activo.aggregate({ _sum: { valorActual: true } }),
      db.cajaChica.findFirst(),
      db.centroCostoMaster.count(),
      // OT por estado
      db.ordenTrabajo.groupBy({
        by: ['estado'],
        _count: true,
      }),
      // OT completadas por estadoAprobacion
      db.ordenTrabajo.groupBy({
        by: ['estadoAprobacion'],
        where: { estado: 'Completado' },
        _count: true,
      }),
      // OT completadas (count total)
      db.ordenTrabajo.count({ where: { estado: 'Completado' } }),
      // Total gastado (todos los gastos)
      db.gasto.aggregate({ _sum: { monto: true } }),
      // Gastos del mes actual
      db.gasto.aggregate({
        _sum: { monto: true },
        where: {
          fecha: { startsWith: new Date().toISOString().slice(0, 7) }
        },
      }),
      // Últimas 6 órdenes (con relaciones necesarias para la UI)
      db.ordenTrabajo.findMany({
        include: {
          propiedad: { select: { id: true, nombre: true } },
          asignado: { select: { id: true, nombre: true, cargo: true } },
          centroCosto: { select: { id: true, codigo: true, nombre: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
      // Gastos agrupados por centro de costo
      db.gasto.groupBy({
        by: ['centroCostoId'],
        _sum: { monto: true },
      }),
      // Documentos de cumplimiento (necesitamos sus detalles para UI)
      db.documentoCumplimiento.findMany({
        select: {
          id: true,
          titulo: true,
          estado: true,
          cumple: true,
          fechaVencimiento: true,
          categoriaId: true,
        },
      }),
      db.resumenCumplimiento.findFirst(),
    ]);

    // Helpers para leer resultados de groupBy
    const countByEstado = (estado: string): number =>
      otGroupByEstado.find(g => g.estado === estado)?._count ?? 0;

    const countByAprobacion = (estado: string): number =>
      otGroupByAprobacion.find(g => g.estadoAprobacion === estado)?._count ?? 0;

    // 2. Construir stats
    const stats = {
      totalPropiedades,
      totalResidentes,
      otPendientes: countByEstado('Pendiente'),
      otEnProgreso: countByEstado('En Progreso'),
      otCompletadas: otCompletadasAprobacion,
      otPendientesAprobacion: countByAprobacion('Pendiente') + countByAprobacion('') + countByAprobacion(null as unknown as string),
      otAprobadas: countByAprobacion('Aprobada'),
      otRechazadas: countByAprobacion('Rechazada'),
      morosos,
      totalPersonal,
      totalActivos,
      valorActivos: valorActivosAgg._sum.valorActual ?? 0,
      saldoCaja: caja?.saldo || 0,
      saldoInicialCaja: caja?.saldoInicial || 0,
      totalGastado: gastosAgg._sum.monto ?? 0,
      gastosDelMes: gastosDelMesAgg._sum.monto ?? 0,
    };

    // 3. Estado de propiedades (count en vez de findMany)
    const [ocupado, disponible, arriendo, venta, mantenimiento] = await Promise.all([
      db.propiedad.count({ where: { estado: 'Ocupado' } }),
      db.propiedad.count({ where: { estado: 'Disponible' } }),
      db.propiedad.count({ where: { estado: 'Arriendo' } }),
      db.propiedad.count({ where: { estado: 'Venta' } }),
      db.propiedad.count({ where: { estado: 'Mantenimiento' } }),
    ]);

    const estadoPropiedades = {
      Ocupado: ocupado,
      Disponible: disponible,
      Arriendo: arriendo,
      Venta: venta,
      Mantenimiento: mantenimiento,
    };

    // 4. Centro de costo con gasto (necesitamos los centros + suma de gastos)
    const centros = await db.centroCostoMaster.findMany();
    const gastosPorCentroMap = new Map(
      centrosConGastoAgg
        .filter(g => g.centroCostoId)
        .map(g => [g.centroCostoId, g._sum.monto ?? 0])
    );

    const centrosConGasto = centros.map(cc => {
      const gastado = gastosPorCentroMap.get(cc.id) ?? 0;
      return {
        ...cc,
        gastado,
        disponible: (cc.presupuestoMens || 0) - gastado,
        porcentaje: (cc.presupuestoMens || 0) > 0 ? Math.round((gastado / cc.presupuestoMens) * 100) : 0,
      };
    });

    // 5. Cumplimiento Legal
    const hoy = new Date();
    const en30Dias = new Date();
    en30Dias.setDate(en30Dias.getDate() + 30);

    const docsVencidos = documentosCumplimiento.filter(c =>
      c.estado !== 'Aprobado' &&
      c.fechaVencimiento &&
      new Date(c.fechaVencimiento) < hoy
    );

    const docsPorVencer = documentosCumplimiento.filter(c => {
      if (c.estado === 'Aprobado' || !c.fechaVencimiento) return false;
      const fechaVen = new Date(c.fechaVencimiento);
      return fechaVen >= hoy && fechaVen <= en30Dias;
    });

    const cumplimientoStats = {
      total: resumenCumplimiento?.totalRequisitos ?? documentosCumplimiento.length,
      completados: resumenCumplimiento?.requisitosCumplidos ??
        documentosCumplimiento.filter(c => c.estado === 'Aprobado' || c.cumple).length,
      pendientes: resumenCumplimiento?.requisitosPendientes ??
        documentosCumplimiento.filter(c => c.estado === 'Pendiente' || c.estado === 'En Revisión').length,
      enProceso: documentosCumplimiento.filter(c => c.estado === 'En Revisión').length,
      vencidos: resumenCumplimiento?.requisitosVencidos ?? docsVencidos.length,
      porVencer: docsPorVencer.length,
      obligatorios: documentosCumplimiento.length,
      opcionales: 0,
      porcentajeGeneral: resumenCumplimiento?.porcentajeGeneral ??
        (documentosCumplimiento.length > 0
          ? Math.round(documentosCumplimiento.filter(c => c.cumple || c.estado === 'Aprobado').length / documentosCumplimiento.length * 100)
          : 0),
      porcentajeLegal: resumenCumplimiento?.porcentajeLegal ?? 0,
      porcentajeReglamentario: resumenCumplimiento?.porcentajeReglamentario ?? 0,
      porcentajeInterno: resumenCumplimiento?.porcentajeInterno ?? 0,
      porcentajeSeguridad: resumenCumplimiento?.porcentajeSeguridad ?? 0,
      alertasActivas: resumenCumplimiento?.alertasActivas ?? 0,
      proximosVencer: docsPorVencer
        .map(c => ({
          id: c.id,
          titulo: c.titulo,
          fechaVencimiento: c.fechaVencimiento,
          categoria: c.categoriaId || 'General',
          estado: c.estado,
        }))
        .sort((a, b) => new Date(a.fechaVencimiento!).getTime() - new Date(b.fechaVencimiento!).getTime())
        .slice(0, 5),
      itemsVencidos: docsVencidos
        .map(c => ({
          id: c.id,
          titulo: c.titulo,
          fechaVencimiento: c.fechaVencimiento,
          categoria: c.categoriaId || 'General',
          estado: c.estado,
        }))
        .sort((a, b) => new Date(b.fechaVencimiento!).getTime() - new Date(a.fechaVencimiento!).getTime())
        .slice(0, 5),
    };

    return NextResponse.json({
      stats,
      estadoPropiedades,
      recentOT,
      centrosConGasto,
      cumplimientoStats,
    });
  } catch (error) {
    return handlePrismaError(error);
  }
}
