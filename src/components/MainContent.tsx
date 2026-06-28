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
import { CatalogosModule } from './catalogos/CatalogosModule'
import { MaterialesModule } from './materiales/MaterialesModule'
import { TareasModule } from './tareas/TareasModule'
import { ReportesModule } from './reportes/ReportesModule'
import { UsuariosModule } from './usuarios/UsuariosModule'
import { InventarioModule } from './inventario/InventarioModule'
import { HerramientasModule } from './herramientas/HerramientasModule'
import { AprobacionesModule } from './aprobaciones/AprobacionesModule'
import { AprobacionesOTModule } from './aprobaciones-ot/AprobacionesOTModule'
import { NotificacionesModule } from './notificaciones/NotificacionesModule'
import { BackupsModule } from './backups/BackupsModule'
import { CumplimientoModule } from './cumplimiento/CumplimientoModule'
import { RondasModule } from './rondas/RondasModule'

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
  catalogos: 'Catálogos',
  materiales: 'Materiales',
  tareas: 'Tareas',
  reportes: 'Reportes',
  usuarios: 'Gestión de Usuarios',
  inventario: 'Inventario',
  herramientas: 'Herramientas',
  aprobaciones: 'Seguimiento de Aprobaciones',
  aprobacionesot: 'Aprobaciones de Órdenes de Trabajo',
  notificaciones: 'Notificaciones',
  backups: 'Respaldos de Base de Datos',
  cumplimiento: 'Cumplimiento Legal',
  rondas: 'Control de Rondas',
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
      case 'catalogos':
        return <CatalogosModule />
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
      case 'aprobaciones':
        return <AprobacionesModule />
      case 'aprobacionesot':
        return <AprobacionesOTModule />
      case 'notificaciones':
        return <NotificacionesModule />
      case 'backups':
        return <BackupsModule />
      case 'cumplimiento':
        return <CumplimientoModule />
      case 'rondas':
        return <RondasModule />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="h-14 bg-white border-b border-slate-200 flex items-center px-5 shrink-0">
        <h1 className="text-base font-bold text-[#0f2040]">
          {moduleTitles[currentModule] || 'Dashboard'}
        </h1>
      </header>
      <main className="flex-1 overflow-auto p-5">
        {renderModule()}
      </main>
    </div>
  )
}
