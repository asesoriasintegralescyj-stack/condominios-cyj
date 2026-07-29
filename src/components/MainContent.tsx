'use client'

import { useAppStore } from '@/lib/store'
import { Dashboard } from './Dashboard'
import { PersonalModule } from './personal/PersonalModule'
import { AsistenciaModule } from './asistencia/AsistenciaModule'
import { ActivosModule } from './activos/ActivosModule'
import { ProveedoresModule } from './proveedores/ProveedoresModule'
import { OrdenesTrabajoModule } from './ordenes-trabajo/OrdenesTrabajoModule'
import { CentroCostoModule } from './centros-costo/CentroCostoModule'
import { ProyectosModule } from './proyectos/ProyectosModule'
import { InspeccionesModule } from './inspecciones/InspeccionesModule'
import { MaterialesModule } from './materiales/MaterialesModule'
import { TareasModule } from './tareas/TareasModule'
import { ReportesModule } from './reportes/ReportesModule'
import { UsuariosModule } from './usuarios/UsuariosModule'
import { InventarioModule } from './inventario/InventarioModule'
import { HerramientasModule } from './herramientas/HerramientasModule'
import { AprobacionesOTModule } from './aprobaciones-ot/AprobacionesOTModule'
import { NotificacionesModule } from './notificaciones/NotificacionesModule'
import { BackupsModule } from './backups/BackupsModule'
import { CumplimientoModule } from './cumplimiento/CumplimientoModule'
import { QrRondasModule } from './qr-rondas/QrRondasModule'
import { SolicitudesComprasModule } from './solicitudes-compra/SolicitudesComprasModule'
import { PermisosModule } from './permisos/PermisosModule'
import { ManualesModule } from './manuales/ManualesModule'
import { AuditorModule } from './auditor/AuditorModule'
import { PMIModule } from './pmi/PMIModule'
import { RendicionGastosModule } from './rendicion-gastos/RendicionGastosModule'

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
  usuarios: 'Usuarios',
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
  rendiciongastos: 'Rendición de Gastos',
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
      case 'rendiciongastos':
        return <RendicionGastosModule />
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
        {renderModule()}
      </main>
    </div>
  )
}
