/**
 * API Dashboard - Sistema CYJ Condominios
 *
 * Dashboard simplificado: muestra solo métricas de los módulos activos.
 * Módulos eliminados (residentes, gastos, gastos-comunes, morosidad,
 * contabilidad, comite, reservas) no se muestran en el dashboard.
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
    const [
      totalPropiedades,
      totalPersonal,
      totalActivos,
      valorActivosAgg,
      caja,
      totalCentros,
      otGroupByEstado,
      otGroupByAprobacion,
      otCompletadasAprobacion,
      recentOT,
      documentosCumplimiento,
      resumenCumplimiento,
    ] = await Promise.all([
      db.propiedad.count(),
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
      // Documentos de cumplimiento
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

    const countByEstado = (estado: string): number =>
      otGroupByEstado.find(g => g.estado === estado)?._count ?? 0;

    const countByAprobacion = (estado: string): number =>
      otGroupByAprobacion.find(g => g.estadoAprobacion === estado)?._count ?? 0;

    // Stats (sin métricas de residentes/gastos que fueron eliminados)
    const stats = {
      totalPropiedades,
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
    };

    // Estado de propiedades
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

    // Centros de costo (sin gastos, que fueron eliminados)
    const centros = await db.centroCostoMaster.findMany();
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
      estadoPropiedades,
      recentOT,
      centrosConGasto,
      cumplimientoStats,
    });
  } catch (error) {
    return handlePrismaError(error);
  }
}
