import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Module = 
  | 'dashboard' 
  | 'ot' 
  | 'proyectos' 
  | 'inspecciones' 
  | 'personal' 
  | 'asistencia'
  | 'activos' 
  | 'proveedores' 
  | 'centrocostos' 
  | 'materiales'
  | 'tareas'
  | 'herramientas'
  | 'reportes'
  | 'usuarios'
  | 'inventario'
  | 'catalogos'
  | 'aprobaciones'
  | 'aprobacionesot'
  | 'notificaciones'
  | 'auditoria'
  | 'backups'
  | 'cumplimiento'
  | 'rondas'
  | 'qrrondas'
  | 'solicitudescompra'
  | 'permisos'
  | 'manuales'
  | 'pmi'

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
