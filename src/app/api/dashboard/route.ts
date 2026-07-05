/**
 * API Dashboard - Sistema CYJ Condominios
 *
 * Dashboard con métricas de los módulos activos:
 * - Personal, Activos, Caja Chica
 * - Órdenes de Trabajo (con estados y aprobaciones)
 * - Solicitudes de Compra (reemplaza a Propiedades/Unidades)
 * - Cumplimiento Legal
 */

import { NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError, handlePrismaError } from '@/lib/api-helpers'

// GET - Dashboard stats (requiere auth)
export async function GET() {
  const session = await getCurrentSession();
  if (!session) return apiError('No autenticado', 401);

  try {
    // Ejecutar queries con withRetry para reintentar automáticamente
    // cuando el pool de Aiven se agota intermitentemente.
    // Se dividen en 2 lotes para no saturar el pool.
    // Lote 1: Counts y aggregates (10 queries, rápidas)
    const [
      totalPersonal,
      totalActivos,
      valorActivosAgg,
      caja,
      totalCentros,
      otCompletadasAprobacion,
      documentosCumplimiento,
      resumenCumplimiento,
      scTotal,
      scMontoAgg,
    ] = await Promise.all([
      withRetry(() => db.personal.count()),
      withRetry(() => db.activo.count()),
      withRetry(() => db.activo.aggregate({ _sum: { valorActual: true } })),
      withRetry(() => db.cajaChica.findFirst()),
      withRetry(() => db.centroCostoMaster.count()),
      withRetry(() => db.ordenTrabajo.count({ where: { estado: 'Completado' } })),
      withRetry(() => db.documentoCumplimiento.findMany({
        select: {
          id: true,
          titulo: true,
          estado: true,
          cumple: true,
          fechaVencimiento: true,
          categoriaId: true,
        },
      })),
      withRetry(() => db.resumenCumplimiento.findFirst()),
      withRetry(() => db.solicitudCompra.count()),
      withRetry(() => db.solicitudCompra.aggregate({ _sum: { totalEstimado: true } })),
    ]);

    // Lote 2: GroupBy y findMany con relaciones (6 queries, más pesadas)
    const [
      otGroupByEstado,
      otGroupByAprobacion,
      recentOT,
      scGroupByEstado,
      scRecent,
      centros,
    ] = await Promise.all([
      withRetry(() => db.ordenTrabajo.groupBy({
        by: ['estado'],
        _count: true,
      })),
      withRetry(() => db.ordenTrabajo.groupBy({
        by: ['estadoAprobacion'],
        where: { estado: 'Completado' },
        _count: true,
      })),
      withRetry(() => db.ordenTrabajo.findMany({
        include: {
          propiedad: { select: { id: true, nombre: true } },
          asignado: { select: { id: true, nombre: true, cargo: true } },
          centroCosto: { select: { id: true, codigo: true, nombre: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
      })),
      withRetry(() => db.solicitudCompra.groupBy({
        by: ['estado'],
        _count: true,
      })),
      withRetry(() => db.solicitudCompra.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          codigo: true,
          titulo: true,
          estado: true,
          prioridad: true,
          totalEstimado: true,
          emailEnviado: true,
          createdAt: true,
          origenCodigo: true,
        },
      })),
      withRetry(() => db.centroCostoMaster.findMany()),
    ]);

    const countByEstado = (estado: string): number =>
      otGroupByEstado.find(g => g.estado === estado)?._count ?? 0;

    const countByAprobacion = (estado: string): number =>
      otGroupByAprobacion.find(g => g.estadoAprobacion === estado)?._count ?? 0;

    // Helper para solicitudes de compra
    const scByEstado = (estado: string): number =>
      scGroupByEstado.find(g => g.estado === estado)?._count ?? 0;

    // Stats principales
    const stats = {
      totalPersonal,
      totalActivos,
      valorActivos: valorActivosAgg._sum.valorActual ?? 0,
      saldoCaja: caja?.saldo || 0,
      saldoInicialCaja: caja?.saldoInicial || 0,
      otPendientes: countByEstado('Pendiente'),
      otEnProgreso: countByEstado('En Progreso'),
      otCompletadas: otCompletadasAprobacion,
      otPendientesAprobacion: countByAprobacion('Pendiente') + countByAprobacion('') + countByAprobacion(null as unknown as string),
      otAprobadas: countByAprobacion('Aprobada'),
      otRechazadas: countByAprobacion('Rechazada'),
      // Solicitudes de Compra (reemplaza a Propiedades/Unidades)
      scTotal,
      scSolicitadas: scByEstado('Solicitado'),
      scEnProceso: scByEstado('En Proceso'),
      scCompradas: scByEstado('Comprado'),
      scRechazadas: scByEstado('Rechazado'),
      scMontoTotal: scMontoAgg._sum.totalEstimado ?? 0,
    };

    // Solicitudes de Compra recientes (reemplaza a "Estado de Propiedades")
    const solicitudesRecientes = scRecent;

    // Centros de costo (sin gastos, que fueron eliminados)
    // (centros ya fue obtenido en el Lote 2 con withRetry)
    const centrosConGasto = centros.map(cc => ({
      ...cc,
      gastado: 0,
      disponible: cc.presupuestoMens || 0,
      porcentaje: 0,
    }));

    // Cumplimiento Legal
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
      porCategoria: {
        Legal: documentosCumplimiento
          .filter(c => c.titulo?.toLowerCase().includes('legal') || c.categoriaId?.toLowerCase().includes('legal'))
          .map(c => ({ id: c.id, titulo: c.titulo, fechaVencimiento: c.fechaVencimiento, categoria: 'Legal', estado: c.estado })),
        Seguridad: documentosCumplimiento
          .filter(c => c.titulo?.toLowerCase().includes('seguridad') || c.categoriaId?.toLowerCase().includes('seguridad'))
          .map(c => ({ id: c.id, titulo: c.titulo, fechaVencimiento: c.fechaVencimiento, categoria: 'Seguridad', estado: c.estado })),
        Reglamentario: documentosCumplimiento
          .filter(c => c.titulo?.toLowerCase().includes('reglamento') || c.titulo?.toLowerCase().includes('reglamentario') || c.categoriaId?.toLowerCase().includes('regla'))
          .map(c => ({ id: c.id, titulo: c.titulo, fechaVencimiento: c.fechaVencimiento, categoria: 'Reglamentario', estado: c.estado })),
        Interno: documentosCumplimiento
          .filter(c => c.titulo?.toLowerCase().includes('interno') || c.categoriaId?.toLowerCase().includes('interno'))
          .map(c => ({ id: c.id, titulo: c.titulo, fechaVencimiento: c.fechaVencimiento, categoria: 'Interno', estado: c.estado })),
        Financiero: documentosCumplimiento
          .filter(c => c.titulo?.toLowerCase().includes('financiero') || c.titulo?.toLowerCase().includes('finanzas') || c.categoriaId?.toLowerCase().includes('financ'))
          .map(c => ({ id: c.id, titulo: c.titulo, fechaVencimiento: c.fechaVencimiento, categoria: 'Financiero', estado: c.estado })),
      },
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
      solicitudesRecientes,
      recentOT,
      centrosConGasto,
      cumplimientoStats,
    });
  } catch (error) {
    return handlePrismaError(error);
  }
}
