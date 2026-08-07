'use client'

/**
 * Modulo Permisos del Sistema v2
 * ---------------------------------
 * El admin puede gestionar permisos por USUARIO, no solo por rol.
 * 
 * Logica:
 *   - Cada usuario tiene permisos base segun su rol
 *   - El admin puede AGREGAR permisos extra a un usuario
 *   - El admin puede QUITAR permisos del rol base a un usuario
 *   - Los permisos efectivos = base del rol + agregar - quitar
 * 
 * Los cambios se guardan en el campo `permisos` de cada User en la DB.
 */

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Shield, Users, Eye, EyeOff, Plus, Minus, Save, RefreshCw, Info,
  CheckCircle2, Lock, UserCog, ArrowRight, Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api-client'

// ============================================
// Definicion de permisos por categoria
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
      { id: 'solicitudescompra.ver', label: 'Ver', descripcion: 'Ver solicitudes' },
      { id: 'solicitudescompra.crear', label: 'Crear', descripcion: 'Crear solicitudes' },
      { id: 'solicitudescompra.aprobar_supervisor', label: 'Aprobar (Sup)', descripcion: 'Aprobar en 1ra etapa' },
      { id: 'solicitudescompra.aprobar_admin', label: 'Aprobar (Admin)', descripcion: 'Aprobar en 2da etapa' },
      { id: 'solicitudescompra.gestionar', label: 'Gestionar', descripcion: 'Gestionar compra' },
    ],
  },
  {
    key: 'ordenes_trabajo',
    label: 'Ordenes de Trabajo',
    permisos: [
      { id: 'ots.ver', label: 'Ver', descripcion: 'Ver ordenes de trabajo' },
      { id: 'ots.crear', label: 'Crear', descripcion: 'Crear nuevas OT' },
      { id: 'ots.editar', label: 'Editar', descripcion: 'Editar OT existentes' },
      { id: 'ots.eliminar', label: 'Eliminar', descripcion: 'Eliminar OT' },
      { id: 'ots.aprobar', label: 'Aprobar', descripcion: 'Aprobar/rechazar OT' },
      { id: 'ots.progreso', label: 'Progreso', descripcion: 'Actualizar progreso de OT' },
    ],
  },
  {
    key: 'proyectos',
    label: 'Proyectos',
    permisos: [
      { id: 'proyectos.ver', label: 'Ver', descripcion: 'Ver proyectos' },
      { id: 'proyectos.crear', label: 'Crear', descripcion: 'Crear proyectos' },
      { id: 'proyectos.editar', label: 'Editar', descripcion: 'Editar proyectos' },
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
      { id: 'personal.ver', label: 'Ver', descripcion: 'Ver personal' },
      { id: 'personal.crear', label: 'Crear', descripcion: 'Crear personal' },
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
      { id: 'centros-costo.crear', label: 'Crear', descripcion: 'Crear centros' },
      { id: 'centros-costo.editar', label: 'Editar', descripcion: 'Editar centros' },
      { id: 'centros-costo.eliminar', label: 'Eliminar', descripcion: 'Eliminar centros' },
    ],
  },
  {
    key: 'catalogos',
    label: 'Catalogos',
    permisos: [
      { id: 'catalogos.ver', label: 'Ver', descripcion: 'Ver catalogos' },
      { id: 'catalogos.crear', label: 'Crear', descripcion: 'Crear items' },
      { id: 'catalogos.editar', label: 'Editar', descripcion: 'Editar items' },
      { id: 'catalogos.eliminar', label: 'Eliminar', descripcion: 'Eliminar items' },
    ],
  },
  {
    key: 'inventario',
    label: 'Inventario',
    permisos: [
      { id: 'inventario.ver', label: 'Ver', descripcion: 'Ver inventario' },
      { id: 'inventario.editar', label: 'Editar', descripcion: 'Movimientos de inventario' },
    ],
  },
  {
    key: 'reportes',
    label: 'Reportes',
    permisos: [
      { id: 'reportes.ver', label: 'Ver', descripcion: 'Ver reportes' },
      { id: 'reportes.exportar', label: 'Exportar', descripcion: 'Exportar reportes' },
    ],
  },
  {
    key: 'configuracion',
    label: 'Configuracion',
    permisos: [
      { id: 'configuracion.ver', label: 'Ver', descripcion: 'Ver configuracion' },
      { id: 'configuracion.editar', label: 'Editar', descripcion: 'Editar configuracion y respaldos' },
    ],
  },
  {
    key: 'logs',
    label: 'Auditoria',
    permisos: [
      { id: 'logs.ver', label: 'Ver', descripcion: 'Ver logs de auditoria' },
    ],
  },
  {
    key: 'rendiciongastos',
    label: 'Rendicion de Gastos',
    permisos: [
      { id: 'rendiciongastos.ver', label: 'Ver', descripcion: 'Ver rendiciones' },
      { id: 'rendiciongastos.crear', label: 'Crear', descripcion: 'Crear rendiciones' },
      { id: 'rendiciongastos.editar', label: 'Editar', descripcion: 'Editar rendiciones' },
      { id: 'rendiciongastos.revisar', label: 'Revisar', descripcion: 'Revisar rendiciones' },
      { id: 'rendiciongastos.eliminar', label: 'Eliminar', descripcion: 'Eliminar rendiciones' },
    ],
  },
]

// Todos los IDs de permisos planos
const ALL_PERM_IDS = CATEGORIAS.flatMap(c => c.permisos.map(p => p.id))

// ============================================
// Interfaces
// ============================================
interface UserItem {
  id: string
  email: string
  nombre: string
  apellido?: string | null
  rol: string
}

interface PermisosData {
  permisosBase: string[]
  overrides: { agregar: string[]; quitar: string[] }
  permisosEfectivos: string[]
}

// ============================================
// Componente principal
// ============================================
export function PermisosModule() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [permisosData, setPermisosData] = useState<PermisosData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingUser, setLoadingUser] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Overrides editados localmente
  const [localAgregar, setLocalAgregar] = useState<string[]>([])
  const [localQuitar, setLocalQuitar] = useState<string[]>([])

  // Cargar lista de usuarios
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await apiFetch<UserItem[]>('/api/usuarios', [])
        setUsers(Array.isArray(data) ? data : [])
      } catch {
        toast.error('Error al cargar usuarios')
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [])

  // Cargar permisos del usuario seleccionado
  const loadPermisos = useCallback(async (userId: string) => {
    if (!userId) {
      setPermisosData(null)
      setLocalAgregar([])
      setLocalQuitar([])
      setHasChanges(false)
      return
    }
    setLoadingUser(true)
    try {
      const res = await fetch(`/api/usuarios/${userId}/permisos`)
      if (!res.ok) throw new Error('Error')
      const data = await res.json()
      setPermisosData(data)
      const overrides = data.overrides || { agregar: [], quitar: [] }
      setLocalAgregar(Array.isArray(overrides.agregar) ? overrides.agregar : [])
      setLocalQuitar(Array.isArray(overrides.quitar) ? overrides.quitar : [])
      setHasChanges(false)
    } catch {
      toast.error('Error al cargar permisos del usuario')
    } finally {
      setLoadingUser(false)
    }
  }, [])

  useEffect(() => {
    if (selectedUserId) {
      loadPermisos(selectedUserId)
    }
  }, [selectedUserId, loadPermisos])

  const selectedUser = users.find(u => u.id === selectedUserId)

  // Calcular permisos efectivos con los overrides locales
  const getEfectivos = useCallback((): string[] => {
    if (!permisosData) return []
    const base = new Set(permisosData.permisosBase)
    const quitarSet = new Set(localQuitar)
    localAgregar.forEach(p => base.add(p))
    return Array.from(base).filter(p => !quitarSet.has(p))
  }, [permisosData, localAgregar, localQuitar])

  const efectivos = getEfectivos()
  const hayCambios = JSON.stringify(localAgregar.sort()) !== JSON.stringify((permisosData?.overrides?.agregar || []).sort())
    || JSON.stringify(localQuitar.sort()) !== JSON.stringify((permisosData?.overrides?.quitar || []).sort())

  // Toggle: agregar/quitar un permiso
  const togglePermiso = (permId: string) => {
    const enBase = permisosData?.permisosBase.includes(permId) || false
    const estaAgregado = localAgregar.includes(permId)
    const estaQuitado = localQuitar.includes(permId)
    const estaEfectivo = efectivos.includes(permId)

    if (estaEfectivo) {
      // Quitar el permiso
      if (enBase) {
        // Quitar del base → agregar a quitar
        setLocalQuitar(prev => [...prev, permId])
        setLocalAgregar(prev => prev.filter(p => p !== permId))
      } else {
        // Era agregado extra → quitar de agregar
        setLocalAgregar(prev => prev.filter(p => p !== permId))
      }
    } else {
      // Agregar el permiso
      if (estaQuitado) {
        // Era quitado del base → quitarlo de quitar (restaurar)
        setLocalQuitar(prev => prev.filter(p => p !== permId))
      } else {
        // No estaba en base ni agregado → agregar como extra
        setLocalAgregar(prev => [...prev, permId])
      }
    }
    setHasChanges(true)
  }

  // Toggle toda una categoria
  const toggleCategoria = (cat: Categoria) => {
    const permIds = cat.permisos.map(p => p.id)
    const todosActivos = permIds.every(p => efectivos.includes(p))
    
    if (todosActivos) {
      // Quitar todos
      permIds.forEach(pid => {
        const enBase = permisosData?.permisosBase.includes(pid) || false
        if (enBase) {
          if (!localQuitar.includes(pid)) setLocalQuitar(prev => [...prev, pid])
        } else {
          setLocalAgregar(prev => prev.filter(p => p !== pid))
        }
      })
    } else {
      // Activar todos
      permIds.forEach(pid => {
        const estaQuitado = localQuitar.includes(pid)
        const enBase = permisosData?.permisosBase.includes(pid) || false
        if (estaQuitado) {
          setLocalQuitar(prev => prev.filter(p => p !== pid))
        } else if (!enBase && !localAgregar.includes(pid)) {
          setLocalAgregar(prev => [...prev, pid])
        }
      })
    }
    setHasChanges(true)
  }

  // Guardar
  const handleSave = async () => {
    if (!selectedUserId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/usuarios/${selectedUserId}/permisos`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agregar: localAgregar,
          quitar: localQuitar,
        }),
      })
      if (res.ok) {
        toast.success('Permisos guardados correctamente')
        setHasChanges(false)
        loadPermisos(selectedUserId)
      } else {
        const data = await res.json()
        toast.error(data.error || 'Error al guardar')
      }
    } catch {
      toast.error('Error de conexion')
    } finally {
      setSaving(false)
    }
  }

  // Restaurar a los del rol
  const handleReset = () => {
    setLocalAgregar([])
    setLocalQuitar([])
    setHasChanges(true)
    toast.info('Permisos restaurados al rol base')
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-[#0f2044] flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Permisos del Sistema
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Administra los permisos de visualizacion y edicion de cada trabajador segun su perfil.
        </p>
      </div>

      {/* Info */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 text-sm">
          <strong>Como funciona:</strong> Selecciona un trabajador. Su permisos base vienen de su rol. 
          Puedes <Plus className="w-3 h-3 inline" /> <strong>agregar</strong> permisos extra o 
          <Minus className="w-3 h-3 inline" /> <strong>quitar</strong> permisos del rol base. 
          Los cambios se aplican inmediatamente al guardar.
        </AlertDescription>
      </Alert>

      {/* Selector de usuario */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <Label className="font-semibold text-[#0f2044] flex items-center gap-2 min-w-fit">
              <Users className="w-4 h-4" />
              Seleccionar Trabajador:
            </Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-full max-w-sm">
                <SelectValue placeholder="Seleccione un usuario..." />
              </SelectTrigger>
              <SelectContent>
                {users
                  .filter(u => u.rol !== 'admin') // No mostrar admins (siempre tienen todo)
                  .map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      <span className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-normal">{u.rol.toUpperCase()}</Badge>
                        {u.nombre} {u.apellido || ''} ({u.email})
                      </span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Panel de permisos del usuario seleccionado */}
      {selectedUserId && selectedUser && (
        <>
          {/* Info del usuario y resumen */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-slate-50">
              <CardContent className="p-3 text-center">
                <div className="text-xs text-slate-500">Rol Base</div>
                <Badge className="mt-1">{selectedUser.rol.toUpperCase()}</Badge>
              </CardContent>
            </Card>
            <Card className="bg-blue-50">
              <CardContent className="p-3 text-center">
                <div className="text-xs text-blue-600">Permisos del Rol</div>
                <div className="text-lg font-bold text-blue-800">{permisosData?.permisosBase.length || 0}</div>
              </CardContent>
            </Card>
            <Card className="bg-green-50">
              <CardContent className="p-3 text-center">
                <div className="text-xs text-green-600">Permisos Agregados</div>
                <div className="text-lg font-bold text-green-800">{localAgregar.length}</div>
              </CardContent>
            </Card>
            <Card className="bg-red-50">
              <CardContent className="p-3 text-center">
                <div className="text-xs text-red-600">Permisos Quitados</div>
                <div className="text-lg font-bold text-red-800">{localQuitar.length}</div>
              </CardContent>
            </Card>
          </div>

          {/* Botones de accion */}
          <div className="flex items-center gap-2 justify-between flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Permisos efectivos: <strong>{efectivos.length}</strong> de {ALL_PERM_IDS.length}
              </span>
              {hayCambios && (
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 animate-pulse">
                  Cambios sin guardar
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RefreshCw className="w-3 h-3 mr-1" />
                Restaurar al rol
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || !hayCambios}
                className="bg-[#0f2044] hover:bg-[#1a3155]"
              >
                {saving ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                Guardar
              </Button>
            </div>
          </div>

          {/* Tabla de permisos */}
          {loadingUser ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-[#0f2044]" />
            </div>
          ) : (
            CATEGORIAS.map((cat) => {
              const catPermIds = cat.permisos.map(p => p.id)
              const todosActivos = catPermIds.every(p => efectivos.includes(p))
              const algunosActivos = catPermIds.some(p => efectivos.includes(p)) && !todosActivos
              const noneActivos = catPermIds.every(p => !efectivos.includes(p))

              return (
                <Card key={cat.key} className={noneActivos ? 'opacity-60' : ''}>
                  <CardHeader className="py-2.5 px-4">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Checkbox
                        checked={todosActivos}
                        ref={(el) => {
                          if (el) (el as unknown as { indeterminate: boolean }).indeterminate = algunosActivos
                        }}
                        onCheckedChange={() => toggleCategoria(cat)}
                        className="h-4 w-4"
                      />
                      <CheckCircle2 className="w-4 h-4 text-[#0f2044]" />
                      {cat.label}
                      <Badge variant="secondary" className="ml-1 text-[10px]">
                        {catPermIds.filter(p => efectivos.includes(p)).length}/{catPermIds.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-slate-50/50">
                          <th className="text-left p-2.5 pl-8 font-semibold text-slate-600 w-[180px]">Permiso</th>
                          <th className="text-left p-2.5 text-slate-500">Estado</th>
                          <th className="text-center p-2.5 font-semibold text-slate-600 w-[80px]">
                            <Eye className="w-3.5 h-3.5 inline mr-1" />Ver/Editar
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {cat.permisos.map((perm) => {
                          const enBase = permisosData?.permisosBase.includes(perm.id) || false
                          const estaAgregado = localAgregar.includes(perm.id)
                          const estaQuitado = localQuitar.includes(perm.id)
                          const estaActivo = efectivos.includes(perm.id)

                          return (
                            <tr key={perm.id} className="border-b last:border-0 hover:bg-slate-50/50">
                              <td className="p-2.5 pl-8">
                                <div className="font-medium text-slate-800">{perm.label}</div>
                                <code className="text-[10px] text-slate-400">{perm.id}</code>
                              </td>
                              <td className="p-2.5">
                                {estaActivo ? (
                                  estaAgregado ? (
                                    <Badge className="bg-green-100 text-green-800 text-[10px]">
                                      <Plus className="w-2.5 h-2.5 mr-0.5" /> Agregado
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-blue-100 text-blue-800 text-[10px]">
                                      <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" /> Del rol
                                    </Badge>
                                  )
                                ) : (
                                  estaQuitado ? (
                                    <Badge className="bg-red-100 text-red-800 text-[10px]">
                                      <Minus className="w-2.5 h-2.5 mr-0.5" /> Quitado
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-slate-100 text-slate-500 text-[10px]">
                                      <EyeOff className="w-2.5 h-2.5 mr-0.5" /> Sin acceso
                                    </Badge>
                                  )
                                )}
                              </td>
                              <td className="p-2.5 text-center">
                                <Checkbox
                                  checked={estaActivo}
                                  onCheckedChange={() => togglePermiso(perm.id)}
                                  className="h-4 w-4"
                                />
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )
            })
          )}

          {/* Leyenda */}
          <div className="flex items-center gap-4 flex-wrap text-xs text-slate-600">
            <span className="flex items-center gap-1"><Badge className="bg-blue-100 text-blue-800 text-[10px]">Del rol</Badge> Viene del perfil base</span>
            <span className="flex items-center gap-1"><Badge className="bg-green-100 text-green-800 text-[10px]">Agregado</Badge> Permiso extra otorgado</span>
            <span className="flex items-center gap-1"><Badge className="bg-red-100 text-red-800 text-[10px]">Quitado</Badge> Revocado del perfil base</span>
            <span className="flex items-center gap-1"><Badge className="bg-slate-100 text-slate-500 text-[10px]">Sin acceso</Badge> No tiene este permiso</span>
          </div>
        </>
      )}

      {/* Sin seleccion */}
      {!selectedUserId && !loading && (
        <div className="text-center py-12 text-slate-400">
          <UserCog className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Selecciona un trabajador para administrar sus permisos</p>
        </div>
      )}
    </div>
  )
}
