import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Module = 
  | 'dashboard' 
  | 'residentes' 
  | 'ot' 
  | 'proyectos' 
  | 'inspecciones' 
  | 'personal' 
  | 'asistencia'
  | 'activos' 
  | 'proveedores' 
  | 'gastos' 
  | 'centrocostos' 
  | 'materiales'
  | 'tareas'
  | 'herramientas'
  | 'reportes'
  | 'usuarios'
  | 'inventario'
  | 'catalogos'
  | 'reservas'
  | 'aprobaciones'
  | 'aprobacionesot'
  | 'gastoscomunes'
  | 'morosidad'
  | 'notificaciones'
  | 'contabilidad'
  | 'auditoria'
  | 'comite'
  | 'backups'
  | 'cumplimiento'
  | 'rondas'

interface CondominioInfo {
  id: string
  nombre: string
}

interface AppState {
  currentModule: Module
  setCurrentModule: (module: Module) => void
  currentCondominio: CondominioInfo | null
  setCurrentCondominio: (condominio: CondominioInfo | null) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentModule: 'dashboard',
      setCurrentModule: (module) => set({ currentModule: module }),
      currentCondominio: null,
      setCurrentCondominio: (condominio) => set({ currentCondominio: condominio }),
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        currentCondominio: state.currentCondominio
      }),
    }
  )
)
