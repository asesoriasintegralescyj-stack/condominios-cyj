'use client'

import React, { Suspense } from 'react'
import { useAppStore } from '@/lib/store'

// P1: React.lazy + Suspense — modules load only when navigated to
// This removes ~1.96 MB of JS from the initial bundle

const Dashboard = React.lazy(() => import('./Dashboard').then(m => ({ default: m.Dashboard })))
const PersonalModule = React.lazy(() => import('./personal/PersonalModule').then(m => ({ default: m.PersonalModule })))
const AsistenciaModule = React.lazy(() => import('./asistencia/AsistenciaModule').then(m => ({ default: m.AsistenciaModule })))
const ActivosModule = React.lazy(() => import('./activos/ActivosModule').then(m => ({ default: m.ActivosModule })))
const ProveedoresModule = React.lazy(() => import('./proveedores/ProveedoresModule').then(m => ({ default: m.ProveedoresModule })))
const OrdenesTrabajoModule = React.lazy(() => import('./ordenes-trabajo/OrdenesTrabajoModule').then(m => ({ default: m.OrdenesTrabajoModule })))
const CentroCostoModule = React.lazy(() => import('./centros-costo/CentroCostoModule').then(m => ({ default: m.CentroCostoModule })))
const ProyectosModule = React.lazy(() => import('./proyectos/ProyectosModule').then(m => ({ default: m.ProyectosModule })))
const InspeccionesModule = React.lazy(() => import('./inspecciones/InspeccionesModule').then(m => ({ default: m.InspeccionesModule })))
const MaterialesModule = React.lazy(() => import('./materiales/MaterialesModule').then(m => ({ default: m.MaterialesModule })))
const TareasModule = React.lazy(() => import('./tareas/TareasModule').then(m => ({ default: m.TareasModule })))
const ReportesModule = React.lazy(() => import('./reportes/ReportesModule').then(m => ({ default: m.ReportesModule })))
const UsuariosModule = React.lazy(() => import('./usuarios/UsuariosModule').then(m => ({ default: m.UsuariosModule })))
const InventarioModule = React.lazy(() => import('./inventario/InventarioModule').then(m => ({ default: m.InventarioModule })))
const HerramientasModule = React.lazy(() => import('./herramientas/HerramientasModule').then(m => ({ default: m.HerramientasModule })))
const AprobacionesOTModule = React.lazy(() => import('./aprobaciones-ot/AprobacionesOTModule').then(m => ({ default: m.AprobacionesOTModule })))
const NotificacionesModule = React.lazy(() => import('./notificaciones/NotificacionesModule').then(m => ({ default: m.NotificacionesModule })))
const BackupsModule = React.lazy(() => import('./backups/BackupsModule').then(m => ({ default: m.BackupsModule })))
const CumplimientoModule = React.lazy(() => import('./cumplimiento/CumplimientoModule').then(m => ({ default: m.CumplimientoModule })))
const QrRondasModule = React.lazy(() => import('./qr-rondas/QrRondasModule').then(m => ({ default: m.QrRondasModule })))
const SolicitudesComprasModule = React.lazy(() => import('./solicitudes-compra/SolicitudesComprasModule').then(m => ({ default: m.SolicitudesComprasModule })))
const PermisosModule = React.lazy(() => import('./permisos/PermisosModule').then(m => ({ default: m.PermisosModule })))
const ManualesModule = React.lazy(() => import('./manuales/ManualesModule').then(m => ({ default: m.ManualesModule })))
const AuditorModule = React.lazy(() => import('./auditor/AuditorModule').then(m => ({ default: m.AuditorModule })))
const PMIModule = React.lazy(() => import('./pmi/PMIModule').then(m => ({ default: m.PMIModule })))
const RendicionesGastosModule = React.lazy(() => import('./rendiciones-gastos/RendicionesGastosModule').then(m => ({ default: m.RendicionesGastosModule })))
const PlanificacionModule = React.lazy(() => import('./planificacion/PlanificacionModule').then(m => ({ default: m.PlanificacionModule })))
const PerfilesMovilModule = React.lazy(() => import('./perfiles-movil/PerfilesMovilModule').then(m => ({ default: m.PerfilesMovilModule })))
const InformeSemanalModule = React.lazy(() => import('./informe-semanal/InformeSemanalModule').then(m => ({ default: m.InformeSemanalModule })))

// Loading skeleton — shown while module chunk is being fetched
function ModuleSkeleton() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
        <span className="text-sm text-slate-400">Cargando módulo...</span>
      </div>
    </div>
  )
}

const moduleTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  ot: 'Órdenes de Trabajo',
  proyectos: 'Proyectos',
  inspecciones: 'Inspecciones',
  personal: 'Personal',
  asistencia: 'Control de Asistencia',
  activos: 'Activos',
  proveedores: 'Proveedores',
  centrocostos: 'Centro de Costos',
  materiales: 'Materiales',
  tareas: 'Tareas',
  reportes: 'Reportes',
  usuarios: 'Gestión de Usuarios',
  inventario: 'Inventario',
  herramientas: 'Herramientas',
  aprobacionesot: 'Aprobaciones de Órdenes de Trabajo',
  notificaciones: 'Notificaciones',
  backups: 'Respaldos de Base de Datos',
  cumplimiento: 'Cumplimiento Legal',
  qrrondas: 'Rondas QR de Guardias',
  solicitudescompra: 'Solicitud de Compras',
  permisos: 'Permisos del Sistema',
  manuales: 'Manuales y Capacitaciones',
  auditoria: 'Auditoría',
  pmi: 'Plan de Mantenimiento Integral (PMI)',
  rendicionesgastos: 'Rendiciones de Gastos',
  planificacion: 'Planificación de Tareas',
  perfilesmoviles: 'Claves App Móvil',
  informesemanal: 'Informe Semanal',
  automatizaciones: 'Centro de Automatizaciones',
}

export function MainContent() {
  const { currentModule } = useAppStore()

  const renderModule = () => {
    switch (currentModule) {
      case 'dashboard':
        return <Dashboard />
      case 'personal':
        return <PersonalModule />
      case 'asistencia':
        return <AsistenciaModule />
      case 'activos':
        return <ActivosModule />
      case 'proveedores':
        return <ProveedoresModule />
      case 'ot':
        return <OrdenesTrabajoModule />
      case 'centrocostos':
        return <CentroCostoModule />
      case 'proyectos':
        return <ProyectosModule />
      case 'inspecciones':
        return <InspeccionesModule />
      case 'materiales':
        return <MaterialesModule />
      case 'tareas':
        return <TareasModule />
      case 'reportes':
        return <ReportesModule />
      case 'usuarios':
        return <UsuariosModule />
      case 'inventario':
        return <InventarioModule />
      case 'herramientas':
        return <HerramientasModule />
      case 'aprobacionesot':
        return <AprobacionesOTModule />
      case 'notificaciones':
        return <NotificacionesModule />
      case 'backups':
        return <BackupsModule />
      case 'cumplimiento':
        return <CumplimientoModule />
      case 'qrrondas':
        return <QrRondasModule />
      case 'solicitudescompra':
        return <SolicitudesComprasModule />
      case 'permisos':
        return <PermisosModule />
      case 'manuales':
        return <ManualesModule />
      case 'auditoria':
        return <AuditorModule />
      case 'pmi':
        return <PMIModule />
      case 'rendicionesgastos':
        return <RendicionesGastosModule />
      case 'planificacion':
        return <PlanificacionModule />
      case 'perfilesmoviles':
        return <PerfilesMovilModule />
      case 'informesemanal':
        return <InformeSemanalModule />
      case 'automatizaciones':
        return <AutomatizacionesModule />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      <header className="h-14 bg-white border-b border-slate-200 flex items-center px-3 md:px-5 shrink-0 min-w-0">
        <h1 className="text-sm md:text-base font-bold text-[#0f2044] truncate">
          {moduleTitles[currentModule] || 'Dashboard'}
        </h1>
      </header>
      <main className="flex-1 overflow-auto p-3 md:p-5 min-w-0">
        <Suspense fallback={<ModuleSkeleton />}>
          {renderModule()}
        </Suspense>
      </main>
    </div>
  )
}
