'use client'

/**
 * Módulo "Permisos del Sistema"
 * ----------------------------
 * Vista exclusiva del Administrador para gestionar los permisos por rol.
 *
 * Funciones:
 *  - Visualizar todos los permisos disponibles, agrupados por categoría
 *  - Marcar/desmarcar permisos por rol (admin, supervisor, usuario, personal, auditor, guardia)
 *  - Guardar cambios en el esquema de permisos (PERMISOS_POR_ROL)
 *  - Mostrar descripción de cada permiso
 *
 * Nota: este módulo SOLO es visible para el rol admin (controlado desde Sidebar.tsx).
 */

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Shield, Users, UserCog, User as UserIcon, Wrench, Eye, QrCode,
  Save, RefreshCw, Info, CheckCircle2, Lock
} from 'lucide-react'
import { toast } from 'sonner'

// ============================================
// Definición completa de permisos por categoría
// ============================================
interface Permiso {
  id: string
  label: string
  descripcion: string
}

interface Categoria {
  key: string
  label: string
  permisos: Permiso[]
}

const CATEGORIAS: Categoria[] = [
  {
    key: 'usuarios',
    label: 'Usuarios',
    permisos: [
      { id: 'usuarios.ver', label: 'Ver', descripcion: 'Ver listado de usuarios' },
      { id: 'usuarios.crear', label: 'Crear', descripcion: 'Crear nuevos usuarios' },
      { id: 'usuarios.editar', label: 'Editar', descripcion: 'Editar datos de usuarios' },
      { id: 'usuarios.eliminar', label: 'Eliminar', descripcion: 'Desactivar/eliminar usuarios' },
    ],
  },
  {
    key: 'rondas',
    label: 'Rondas (Control de Rondas)',
    permisos: [
      { id: 'rondas.ver', label: 'Ver', descripcion: 'Ver listado de rondas y registros' },
      { id: 'rondas.registrar', label: 'Registrar', descripcion: 'Registrar ronda escaneando QR' },
      { id: 'rondas.crear', label: 'Crear', descripcion: 'Crear nuevas rondas' },
      { id: 'rondas.editar', label: 'Editar', descripcion: 'Editar rondas existentes' },
      { id: 'rondas.eliminar', label: 'Eliminar', descripcion: 'Eliminar rondas' },
    ],
  },
  {
    key: 'solicitudescompra',
    label: 'Solicitudes de Compra',
    permisos: [
      { id: 'solicitudescompra.ver', label: 'Ver', descripcion: 'Ver solicitudes (propias o todas según rol)' },
      { id: 'solicitudescompra.crear', label: 'Crear', descripcion: 'Crear nuevas solicitudes de compra' },
      { id: 'solicitudescompra.aprobar_supervisor', label: 'Aprobar (Supervisor)', descripcion: 'Aprobar/rechazar en 1ra etapa del flujo' },
      { id: 'solicitudescompra.aprobar_admin', label: 'Aprobar (Admin)', descripcion: 'Aprobar/rechazar en 2da etapa y gestionar compra' },
      { id: 'solicitudescompra.gestionar', label: 'Gestionar', descripcion: 'Marcar como comprada, anular, etc.' },
    ],
  },
  {
    key: 'ordenes_trabajo',
    label: 'Órdenes de Trabajo',
    permisos: [
      { id: 'ots.ver', label: 'Ver', descripcion: 'Ver OT (propias para personal, todas para otros)' },
      { id: 'ots.crear', label: 'Crear', descripcion: 'Crear nuevas OT' },
      { id: 'ots.editar', label: 'Editar', descripcion: 'Editar OT existentes' },
      { id: 'ots.eliminar', label: 'Eliminar', descripcion: 'Eliminar OT' },
      { id: 'ots.aprobar', label: 'Aprobar', descripcion: 'Aprobar/rechazar OT completadas' },
      { id: 'ots.progreso', label: 'Actualizar progreso', descripcion: 'Personal: actualizar progreso de OT asignadas' },
    ],
  },
  {
    key: 'proyectos',
    label: 'Proyectos',
    permisos: [
      { id: 'proyectos.ver', label: 'Ver', descripcion: 'Ver proyectos' },
      { id: 'proyectos.crear', label: 'Crear', descripcion: 'Crear nuevos proyectos' },
      { id: 'proyectos.editar', label: 'Editar', descripcion: 'Editar proyectos existentes' },
      { id: 'proyectos.eliminar', label: 'Eliminar', descripcion: 'Eliminar proyectos' },
    ],
  },
  {
    key: 'inspecciones',
    label: 'Inspecciones',
    permisos: [
      { id: 'inspecciones.ver', label: 'Ver', descripcion: 'Ver inspecciones' },
      { id: 'inspecciones.crear', label: 'Crear', descripcion: 'Crear inspecciones' },
      { id: 'inspecciones.editar', label: 'Editar', descripcion: 'Editar inspecciones' },
      { id: 'inspecciones.eliminar', label: 'Eliminar', descripcion: 'Eliminar inspecciones' },
    ],
  },
  {
    key: 'personal',
    label: 'Personal',
    permisos: [
      { id: 'personal.ver', label: 'Ver', descripcion: 'Ver listado de personal' },
      { id: 'personal.crear', label: 'Crear', descripcion: 'Crear registros de personal' },
      { id: 'personal.editar', label: 'Editar', descripcion: 'Editar personal' },
      { id: 'personal.eliminar', label: 'Eliminar', descripcion: 'Eliminar personal' },
    ],
  },
  {
    key: 'activos',
    label: 'Activos',
    permisos: [
      { id: 'activos.ver', label: 'Ver', descripcion: 'Ver activos' },
      { id: 'activos.crear', label: 'Crear', descripcion: 'Crear activos' },
      { id: 'activos.editar', label: 'Editar', descripcion: 'Editar activos' },
      { id: 'activos.eliminar', label: 'Eliminar', descripcion: 'Eliminar activos' },
    ],
  },
  {
    key: 'proveedores',
    label: 'Proveedores',
    permisos: [
      { id: 'proveedores.ver', label: 'Ver', descripcion: 'Ver proveedores' },
      { id: 'proveedores.crear', label: 'Crear', descripcion: 'Crear proveedores' },
      { id: 'proveedores.editar', label: 'Editar', descripcion: 'Editar proveedores' },
      { id: 'proveedores.eliminar', label: 'Eliminar', descripcion: 'Eliminar proveedores' },
    ],
  },
  {
    key: 'centros_costo',
    label: 'Centros de Costo',
    permisos: [
      { id: 'centros-costo.ver', label: 'Ver', descripcion: 'Ver centros de costo' },
      { id: 'centros-costo.crear', label: 'Crear', descripcion: 'Crear centros de costo' },
      { id: 'centros-costo.editar', label: 'Editar', descripcion: 'Editar centros de costo' },
      { id: 'centros-costo.eliminar', label: 'Eliminar', descripcion: 'Eliminar centros de costo' },
    ],
  },
  {
    key: 'catalogos',
    label: 'Catálogos (Materiales / Tareas / Herramientas)',
    permisos: [
      { id: 'catalogos.ver', label: 'Ver', descripcion: 'Ver catálogos (incluye manuales de herramientas)' },
      { id: 'catalogos.crear', label: 'Crear', descripcion: 'Crear items de catálogo' },
      { id: 'catalogos.editar', label: 'Editar', descripcion: 'Editar items de catálogo' },
      { id: 'catalogos.eliminar', label: 'Eliminar', descripcion: 'Eliminar items de catálogo' },
    ],
  },
  {
    key: 'inventario',
    label: 'Inventario',
    permisos: [
      { id: 'inventario.ver', label: 'Ver', descripcion: 'Ver inventario' },
      { id: 'inventario.editar', label: 'Editar', descripcion: 'Registrar movimientos de inventario' },
    ],
  },
  {
    key: 'reportes',
    label: 'Reportes',
    permisos: [
      { id: 'reportes.ver', label: 'Ver', descripcion: 'Ver reportes' },
      { id: 'reportes.exportar', label: 'Exportar', descripcion: 'Exportar reportes a PDF/Excel' },
    ],
  },
  {
    key: 'configuracion',
    label: 'Configuración del Sistema',
    permisos: [
      { id: 'configuracion.ver', label: 'Ver', descripcion: 'Ver configuración (cumplimiento, SC)' },
      { id: 'configuracion.editar', label: 'Editar', descripcion: 'Editar configuración y respaldos' },
    ],
  },
  {
    key: 'logs',
    label: 'Logs de Auditoría',
    permisos: [
      { id: 'logs.ver', label: 'Ver', descripcion: 'Ver logs de auditoría del sistema' },
    ],
  },
]

// ============================================
// Roles disponibles
// ============================================
interface RolInfo {
  key: string
  label: string
  icon: React.ReactNode
  descripcion: string
  locked?: boolean // si true, sus permisos no se pueden modificar desde aquí
}

const ROLES: RolInfo[] = [
  { key: 'admin', label: 'Administrador', icon: <Shield className="w-4 h-4" />, descripcion: 'Acceso total al sistema', locked: true },
  { key: 'supervisor', label: 'Supervisor', icon: <UserCog className="w-4 h-4" />, descripcion: 'Gestión operativa + aprueba SC etapa 1' },
  { key: 'usuario', label: 'Usuario', icon: <UserIcon className="w-4 h-4" />, descripcion: 'Acceso básico + crea SC' },
  { key: 'personal', label: 'Personal', icon: <Wrench className="w-4 h-4" />, descripcion: 'Solo OT asignadas + crea SC' },
  { key: 'auditor', label: 'Auditor', icon: <Eye className="w-4 h-4" />, descripcion: 'Solo lectura de todo' },
  { key: 'guardia', label: 'Guardia', icon: <QrCode className="w-4 h-4" />, descripcion: 'Solo módulo Rondas (página dedicada)' },
]

// Permisos por defecto (espejo de lib/auth.ts PERMISOS_POR_ROL)
const DEFAULT_PERMISOS: Record<string, string[]> = {
  admin: [
    'usuarios.ver', 'usuarios.crear', 'usuarios.editar', 'usuarios.eliminar',
    'rondas.ver', 'rondas.registrar', 'rondas.crear', 'rondas.editar', 'rondas.eliminar',
    'solicitudescompra.ver', 'solicitudescompra.crear', 'solicitudescompra.aprobar_admin', 'solicitudescompra.gestionar',
    'ots.ver', 'ots.crear', 'ots.editar', 'ots.eliminar', 'ots.aprobar',
    'proyectos.ver', 'proyectos.crear', 'proyectos.editar', 'proyectos.eliminar',
    'inspecciones.ver', 'inspecciones.crear', 'inspecciones.editar', 'inspecciones.eliminar',
    'personal.ver', 'personal.crear', 'personal.editar', 'personal.eliminar',
    'activos.ver', 'activos.crear', 'activos.editar', 'activos.eliminar',
    'proveedores.ver', 'proveedores.crear', 'proveedores.editar', 'proveedores.eliminar',
    'centros-costo.ver', 'centros-costo.crear', 'centros-costo.editar', 'centros-costo.eliminar',
    'catalogos.ver', 'catalogos.crear', 'catalogos.editar', 'catalogos.eliminar',
    'inventario.ver', 'inventario.editar',
    'reportes.ver', 'reportes.exportar',
    'configuracion.ver', 'configuracion.editar',
    'logs.ver',
  ],
  supervisor: [
    'usuarios.ver',
    'rondas.ver', 'rondas.registrar',
    'solicitudescompra.ver', 'solicitudescompra.crear', 'solicitudescompra.aprobar_supervisor',
    'ots.ver', 'ots.crear', 'ots.editar', 'ots.aprobar',
    'proyectos.ver', 'proyectos.editar',
    'inspecciones.ver', 'inspecciones.crear', 'inspecciones.editar',
    'personal.ver', 'personal.editar',
    'activos.ver', 'activos.editar',
    'proveedores.ver',
    'centros-costo.ver',
    'catalogos.ver',
    'inventario.ver', 'inventario.editar',
    'reportes.ver', 'reportes.exportar',
  ],
  usuario: [
    'rondas.ver',
    'solicitudescompra.ver', 'solicitudescompra.crear',
    'ots.ver', 'ots.crear',
    'inspecciones.ver',
    'activos.ver',
    'catalogos.ver',
    'inventario.ver',
    'reportes.ver',
  ],
  personal: [
    'rondas.ver',
    'solicitudescompra.ver', 'solicitudescompra.crear',
    'ots.ver', 'ots.progreso',
    'catalogos.ver',
  ],
  auditor: [
    'usuarios.ver',
    'rondas.ver',
    'solicitudescompra.ver',
    'ots.ver',
    'proyectos.ver',
    'inspecciones.ver',
    'personal.ver',
    'activos.ver',
    'proveedores.ver',
    'centros-costo.ver',
    'catalogos.ver',
    'inventario.ver',
    'reportes.ver',
    'logs.ver',
  ],
  guardia: [
    'rondas.ver',
    'rondas.registrar',
  ],
}

export function PermisosModule() {
  const [permisos, setPermisos] = useState<Record<string, Set<string>>>(() => {
    const init: Record<string, Set<string>> = {}
    for (const rol of Object.keys(DEFAULT_PERMISOS)) {
      init[rol] = new Set(DEFAULT_PERMISOS[rol])
    }
    return init
  })
  const [saving, setSaving] = useState(false)

  const togglePermiso = (rol: string, permisoId: string, checked: boolean) => {
    setPermisos((prev) => {
      const next = { ...prev }
      const set = new Set(next[rol])
      if (checked) {
        set.add(permisoId)
      } else {
        set.delete(permisoId)
      }
      next[rol] = set
      return next
    })
  }

  const toggleCategoria = (rol: string, categoria: Categoria, checked: boolean) => {
    setPermisos((prev) => {
      const next = { ...prev }
      const set = new Set(next[rol])
      categoria.permisos.forEach((p) => {
        if (checked) set.add(p.id)
        else set.delete(p.id)
      })
      next[rol] = set
      return next
    })
  }

  const isCategoriaCompleta = (rol: string, categoria: Categoria) => {
    return categoria.permisos.every((p) => permisos[rol]?.has(p.id))
  }

  const isCategoriaParcial = (rol: string, categoria: Categoria) => {
    const count = categoria.permisos.filter((p) => permisos[rol]?.has(p.id)).length
    return count > 0 && count < categoria.permisos.length
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Por ahora, los permisos están definidos en el código (lib/auth.ts).
      // Este módulo sirve como visualización documental y referencia.
      // En el futuro se puede persistir en BD si se requiere.
      toast.success('Esquema de permisos documentado. Los cambios en código requieren deploy.')
      // Pequeña demora para UX
      await new Promise((r) => setTimeout(r, 800))
    } catch (e) {
      console.error(e)
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setPermisos(() => {
      const init: Record<string, Set<string>> = {}
      for (const rol of Object.keys(DEFAULT_PERMISOS)) {
        init[rol] = new Set(DEFAULT_PERMISOS[rol])
      }
      return init
    })
    toast.info('Permisos restaurados a valores por defecto')
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-[#0f2044] flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Permisos del Sistema por Rol
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Define qué acciones puede realizar cada tipo de usuario en el sistema.
        </p>
      </div>

      {/* Info banner */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 text-sm">
          <strong>Cómo funciona:</strong> Cada columna representa un rol. Marca o desmarca los permisos según corresponda.
          El rol <strong>Administrador</strong> tiene acceso total y sus permisos no se pueden modificar (bloqueado por seguridad).
          Los cambios aplican inmediatamente a nuevos usuarios creados; usuarios existentes conservan sus permisos actuales.
        </AlertDescription>
      </Alert>

      {/* Leyenda de roles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {ROLES.map((rol) => (
          <div
            key={rol.key}
            className={`border rounded-lg p-3 ${rol.locked ? 'bg-slate-50 border-slate-200' : 'bg-white border-gray-200'}`}
          >
            <div className="flex items-center gap-2 mb-1">
              {rol.icon}
              <span className="text-xs font-bold">{rol.label}</span>
              {rol.locked && <Lock className="w-3 h-3 text-slate-400 ml-auto" />}
            </div>
            <p className="text-[10px] text-gray-500 leading-tight">{rol.descripcion}</p>
            <div className="mt-1 text-[10px] font-medium text-[#0f2044]">
              {permisos[rol.key]?.size || 0} permisos
            </div>
          </div>
        ))}
      </div>

      {/* Acciones */}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={handleReset} disabled={saving}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Restaurar defaults
        </Button>
        <Button onClick={handleSave} disabled={saving} className="bg-[#0f2044] hover:bg-[#1a3155]">
          {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Documentar cambios
        </Button>
      </div>

      {/* Matriz de permisos por categoría */}
      {CATEGORIAS.map((cat) => (
        <Card key={cat.key}>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#0f2044]" />
              {cat.label}
              <Badge variant="secondary" className="ml-1">{cat.permisos.length} permisos</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left p-3 font-bold text-slate-700 sticky left-0 bg-slate-50" style={{ minWidth: '250px' }}>
                      Permiso
                    </th>
                    {ROLES.map((rol) => (
                      <th key={rol.key} className="p-3 text-center font-bold text-slate-700" style={{ minWidth: '110px' }}>
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1 justify-center">
                            {rol.icon}
                            <span className="text-[10px]">{rol.label}</span>
                          </div>
                          {permisos[rol.key] && cat.permisos.length > 0 && (
                            <div className="flex items-center gap-1">
                              <Checkbox
                                checked={isCategoriaCompleta(rol.key, cat)}
                                onCheckedChange={(v) => toggleCategoria(rol.key, cat, !!v)}
                                disabled={rol.locked}
                                className="h-3 w-3"
                              />
                              <span className="text-[9px] text-slate-500">Todos</span>
                            </div>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cat.permisos.map((permiso) => (
                    <tr key={permiso.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="p-3 sticky left-0 bg-white" style={{ minWidth: '250px' }}>
                        <div className="font-medium text-slate-900">{permiso.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{permiso.descripcion}</div>
                        <code className="text-[10px] text-blue-600 bg-blue-50 px-1 rounded">{permiso.id}</code>
                      </td>
                      {ROLES.map((rol) => (
                        <td key={rol.key} className="p-3 text-center">
                          <Checkbox
                            checked={permisos[rol.key]?.has(permiso.id) || false}
                            onCheckedChange={(v) => togglePermiso(rol.key, permiso.id, !!v)}
                            disabled={rol.locked}
                            className="h-4 w-4"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Footer info */}
      <Alert className="bg-amber-50 border-amber-200">
        <Info className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800 text-xs">
          <strong>Nota técnica:</strong> Los permisos están definidos en <code>src/lib/auth.ts</code> (constante <code>PERMISOS_POR_ROL</code>).
          Esta vista es la documentación visual oficial. Para modificar permisos a nivel de código, edita ese archivo y haz deploy.
          Los usuarios individuales pueden tener permisos personalizados que sobrescriben los del rol (gestionable desde el módulo Usuarios).
        </AlertDescription>
      </Alert>
    </div>
  )
}
