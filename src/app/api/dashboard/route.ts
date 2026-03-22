import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Dashboard stats
export async function GET() {
  try {
    const [
      propiedades,
      residentes,
      todasOrdenes,
      recentOT,
      personal,
      activos,
      gastos,
      caja,
      centros,
      documentosCumplimiento,
      resumenCumplimiento,
    ] = await Promise.all([
      db.propiedad.findMany(),
      db.residente.findMany(),
      // Obtener TODAS las órdenes para contar estados correctamente
      db.ordenTrabajo.findMany({
        select: { estado: true, estadoAprobacion: true }
      }),
      // Separar consulta para últimas 6 órdenes recientes
      db.ordenTrabajo.findMany({
        include: { propiedad: true, asignado: true, centroCosto: true },
        orderBy: { createdAt: 'desc' },
        take: 6
      }),
      db.personal.findMany(),
      db.activo.findMany(),
      db.gasto.findMany({ include: { centroCosto: true } }),
      db.cajaChica.findFirst(),
      db.centroCostoMaster.findMany(),
      db.documentoCumplimiento.findMany(),
      db.resumenCumplimiento.findFirst(),
    ])

    // Calculate stats - usando todasOrdenes para conteo correcto
    // Obtener OTs completadas con estado de aprobación
    const otCompletadasList = todasOrdenes.filter(o => o.estado === 'Completado')
    const otPendientesAprobacion = otCompletadasList.filter(o => 
      o.estadoAprobacion === 'Pendiente' || !o.estadoAprobacion
    ).length
    const otAprobadas = otCompletadasList.filter(o => o.estadoAprobacion === 'Aprobada').length
    const otRechazadas = otCompletadasList.filter(o => o.estadoAprobacion === 'Rechazada').length

    const stats = {
      totalPropiedades: propiedades.length,
      totalResidentes: residentes.length,
      otPendientes: todasOrdenes.filter(o => o.estado === 'Pendiente').length,
      otEnProgreso: todasOrdenes.filter(o => o.estado === 'En Progreso').length,
      otCompletadas: otCompletadasList.length,
      otPendientesAprobacion,
      otAprobadas,
      otRechazadas,
      morosos: residentes.filter(r => r.estado === 'Moroso').length,
      totalPersonal: personal.length,
      totalActivos: activos.length,
      valorActivos: activos.reduce((sum, a) => sum + (a.valorActual || 0), 0),
      saldoCaja: caja?.saldo || 0,
      saldoInicialCaja: caja?.saldoInicial || 0,
      totalGastado: gastos.reduce((sum, g) => sum + (g.monto || 0), 0),
      gastosDelMes: gastos
        .filter(g => g.fecha && g.fecha.startsWith(new Date().toISOString().slice(0, 7)))
        .reduce((sum, g) => sum + (g.monto || 0), 0),
    }
    
    // Estado de propiedades
    const estadoPropiedades = {
      Ocupado: propiedades.filter(p => p.estado === 'Ocupado').length,
      Disponible: propiedades.filter(p => p.estado === 'Disponible').length,
      Arriendo: propiedades.filter(p => p.estado === 'Arriendo').length,
      Venta: propiedades.filter(p => p.estado === 'Venta').length,
      Mantenimiento: propiedades.filter(p => p.estado === 'Mantenimiento').length,
    }
    
    // Centro de costo con gasto
    const centrosConGasto = centros.map(cc => {
      const gastado = gastos
        .filter(g => g.centroCostoId === cc.id || g.centroCosto?.id === cc.id)
        .reduce((sum, g) => sum + (g.monto || 0), 0)
      return {
        ...cc,
        gastado,
        disponible: (cc.presupuestoMens || 0) - gastado,
        porcentaje: (cc.presupuestoMens || 0) > 0 ? Math.round((gastado / cc.presupuestoMens) * 100) : 0
      }
    })

    // Cumplimiento Legal - Estadísticas
    const hoy = new Date()
    
    // Agrupar documentos por categoría
    const documentosPorCategoria = {
      Legal: documentosCumplimiento.filter(c => c.categoriaId ? true : false), // Se puede mejorar con join
      Seguridad: documentosCumplimiento.filter(c => c.titulo?.toLowerCase().includes('seguridad')),
      Reglamentario: documentosCumplimiento.filter(c => c.titulo?.toLowerCase().includes('reglamento') || c.titulo?.toLowerCase().includes('reglamentario')),
      Interno: documentosCumplimiento.filter(c => c.titulo?.toLowerCase().includes('interno')),
      Financiero: documentosCumplimiento.filter(c => c.titulo?.toLowerCase().includes('financiero') || c.titulo?.toLowerCase().includes('finanzas')),
    }
    
    const cumplimientoStats = {
      // Usar resumen si existe, sino calcular
      total: resumenCumplimiento?.totalRequisitos ?? documentosCumplimiento.length,
      completados: resumenCumplimiento?.requisitosCumplidos ?? documentosCumplimiento.filter(c => c.estado === 'Aprobado' || c.cumple).length,
      pendientes: resumenCumplimiento?.requisitosPendientes ?? documentosCumplimiento.filter(c => c.estado === 'Pendiente' || c.estado === 'En Revisión').length,
      enProceso: documentosCumplimiento.filter(c => c.estado === 'En Revisión').length,
      vencidos: resumenCumplimiento?.requisitosVencidos ?? documentosCumplimiento.filter(c => 
        c.estado === 'Vencido' || 
        (c.estado !== 'Aprobado' && 
        c.fechaVencimiento && 
        new Date(c.fechaVencimiento) < hoy)
      ).length,
      porVencer: documentosCumplimiento.filter(c => {
        if (c.estado === 'Aprobado' || !c.fechaVencimiento) return false
        const fechaVen = new Date(c.fechaVencimiento)
        const en30Dias = new Date()
        en30Dias.setDate(en30Dias.getDate() + 30)
        return fechaVen >= hoy && fechaVen <= en30Dias
      }).length,
      obligatorios: documentosCumplimiento.length, // Todos son obligatorios por ahora
      opcionales: 0,
      porcentajeGeneral: resumenCumplimiento?.porcentajeGeneral ?? (documentosCumplimiento.length > 0 
        ? Math.round(documentosCumplimiento.filter(c => c.cumple || c.estado === 'Aprobado').length / documentosCumplimiento.length * 100)
        : 0),
      // Porcentajes por categoría desde resumen
      porcentajeLegal: resumenCumplimiento?.porcentajeLegal ?? 0,
      porcentajeReglamentario: resumenCumplimiento?.porcentajeReglamentario ?? 0,
      porcentajeInterno: resumenCumplimiento?.porcentajeInterno ?? 0,
      porcentajeSeguridad: resumenCumplimiento?.porcentajeSeguridad ?? 0,
      // Alertas activas
      alertasActivas: resumenCumplimiento?.alertasActivas ?? 0,
      // Por categoría - formato que espera el Dashboard
      porCategoria: {
        Legal: documentosPorCategoria.Legal.map(c => ({
          id: c.id,
          titulo: c.titulo,
          fechaVencimiento: c.fechaVencimiento,
          categoria: 'Legal',
          estado: c.estado,
        })),
        Seguridad: documentosPorCategoria.Seguridad.map(c => ({
          id: c.id,
          titulo: c.titulo,
          fechaVencimiento: c.fechaVencimiento,
          categoria: 'Seguridad',
          estado: c.estado,
        })),
        Reglamentario: documentosPorCategoria.Reglamentario.map(c => ({
          id: c.id,
          titulo: c.titulo,
          fechaVencimiento: c.fechaVencimiento,
          categoria: 'Reglamentario',
          estado: c.estado,
        })),
        Interno: documentosPorCategoria.Interno.map(c => ({
          id: c.id,
          titulo: c.titulo,
          fechaVencimiento: c.fechaVencimiento,
          categoria: 'Interno',
          estado: c.estado,
        })),
        Financiero: documentosPorCategoria.Financiero.map(c => ({
          id: c.id,
          titulo: c.titulo,
          fechaVencimiento: c.fechaVencimiento,
          categoria: 'Financiero',
          estado: c.estado,
        })),
      },
      // Items próximos a vencer
      proximosVencer: documentosCumplimiento
        .filter(c => {
          if (c.estado === 'Aprobado' || !c.fechaVencimiento) return false
          const fechaVen = new Date(c.fechaVencimiento)
          const en30Dias = new Date()
          en30Dias.setDate(en30Dias.getDate() + 30)
          return fechaVen >= hoy && fechaVen <= en30Dias
        })
        .map(c => ({
          id: c.id,
          titulo: c.titulo,
          fechaVencimiento: c.fechaVencimiento,
          categoria: c.categoriaId || 'General',
          estado: c.estado,
        }))
        .sort((a, b) => new Date(a.fechaVencimiento!).getTime() - new Date(b.fechaVencimiento!).getTime())
        .slice(0, 5),
      // Items vencidos
      itemsVencidos: documentosCumplimiento
        .filter(c => 
          c.estado !== 'Aprobado' && 
          c.fechaVencimiento && 
          new Date(c.fechaVencimiento) < hoy
        )
        .map(c => ({
          id: c.id,
          titulo: c.titulo,
          fechaVencimiento: c.fechaVencimiento,
          categoria: c.categoriaId || 'General',
          estado: c.estado,
        }))
        .sort((a, b) => new Date(b.fechaVencimiento!).getTime() - new Date(a.fechaVencimiento!).getTime())
        .slice(0, 5),
    }
    
    return NextResponse.json({
      stats,
      estadoPropiedades,
      recentOT,
      centrosConGasto,
      cumplimientoStats,
    })
  } catch (error) {
    console.error('Error fetching dashboard:', error)
    return NextResponse.json({ error: 'Error fetching dashboard' }, { status: 500 })
  }
}
