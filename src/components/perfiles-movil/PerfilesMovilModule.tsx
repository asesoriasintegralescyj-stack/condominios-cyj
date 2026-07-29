'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useSession } from '@/hooks/use-session'
import { TableroIndicadores } from '@/components/ui/tablero-indicadores'
import { toast } from 'sonner'
import {
  Plus, Pencil, Trash2, Search, RefreshCw, Smartphone, Shield, User, Eye,
  Users, CheckCircle, XCircle, Star, Archive,
} from 'lucide-react'
import { apiFetch } from '@/lib/api-client'

// ─── Interfaces ───
interface PersonalItem {
  id: string
  nombre: string
  cargo: string
  estado: string
}

interface PerfilMovil {
  id: string
  name: string
  password: string
  accessCode: string
  color: string
  icon: string
  workAreaIds: string[]
  permissions: string[]
  personalId: string | null
  personal: PersonalItem | null
  createdAt: string
  updatedAt: string
}

interface FormData {
  name: string
  accessCode: string
  password: string
  color: string
  icon: string
  permissions: string[]
  personalId: string
}

const EMPTY_FORM: FormData = {
  name: '',
  accessCode: '',
  password: '',
  color: 'bg-blue-600',
  icon: 'User',
  permissions: ['view'],
  personalId: '',
}

const COLOR_OPTIONS = [
  { value: 'bg-blue-600', label: 'Azul' },
  { value: 'bg-red-600', label: 'Rojo' },
  { value: 'bg-emerald-600', label: 'Verde' },
  { value: 'bg-amber-500', label: 'Amarillo' },
  { value: 'bg-purple-600', label: 'Morado' },
  { value: 'bg-teal-600', label: 'Teal' },
  { value: 'bg-pink-600', label: 'Rosa' },
  { value: 'bg-indigo-600', label: 'Índigo' },
  { value: 'bg-orange-600', label: 'Naranja' },
  { value: 'bg-slate-600', label: 'Gris' },
]

const ICON_OPTIONS = [
  { value: 'User', label: 'Usuario' },
  { value: 'Shield', label: 'Guardia' },
  { value: 'Star', label: 'Administrador' },
  { value: 'Eye', label: 'Supervisor' },
  { value: 'Archive', label: 'Conserje' },
]

const ALL_PERMISSIONS = [
  { id: 'view', label: 'Ver OTs', descripcion: 'Puede ver las órdenes de trabajo' },
  { id: 'create', label: 'Crear OTs', descripcion: 'Puede crear nuevas órdenes' },
  { id: 'edit', label: 'Editar OTs', descripcion: 'Puede modificar órdenes existentes' },
  { id: 'delete', label: 'Eliminar OTs', descripcion: 'Puede eliminar órdenes' },
  { id: 'supervisor', label: 'Supervisor', descripcion: 'Acceso a todas las OTs y reportes' },
  { id: 'guardia', label: 'Guardia', descripcion: 'Acceso a módulo de guardias y rondas' },
  { id: 'rondas', label: 'Rondas', descripcion: 'Puede registrar rondas' },
  { id: 'admin', label: 'Admin', descripcion: 'Acceso total al sistema' },
]

// ─── Helper: mapear icono a componente Lucide ───
function getIconComponent(iconName: string, className = 'w-4 h-4') {
  switch (iconName) {
    case 'Shield': return <Shield className={className} />
    case 'Star': return <Star className={className} />
    case 'Eye': return <Eye className={className} />
    case 'Archive': return <Archive className={className} />
    default: return <User className={className} />
  }
}

function getIconLabel(iconName: string) {
  return ICON_OPTIONS.find(o => o.value === iconName)?.label || iconName
}

function getColorLabel(color: string) {
  return COLOR_OPTIONS.find(o => o.value === color)?.label || color
}

function getPermisosBadges(permissions: string[] | undefined | null) {
  if (!Array.isArray(permissions)) return []
  const permMap: Record<string, { label: string; color: string }> = {
    view: { label: 'Ver', color: 'bg-slate-100 text-slate-700' },
    create: { label: 'Crear', color: 'bg-blue-100 text-blue-700' },
    edit: { label: 'Editar', color: 'bg-amber-100 text-amber-700' },
    delete: { label: 'Eliminar', color: 'bg-red-100 text-red-700' },
    supervisor: { label: 'Supervisor', color: 'bg-purple-100 text-purple-700' },
    guardia: { label: 'Guardia', color: 'bg-teal-100 text-teal-700' },
    rondas: { label: 'Rondas', color: 'bg-emerald-100 text-emerald-700' },
    admin: { label: 'Admin', color: 'bg-red-100 text-red-800' },
  }
  return permissions.map(p => permMap[p] || { label: p, color: 'bg-slate-100 text-slate-600' })
}

// ─── Componente principal ───
export function PerfilesMovilModule() {
  const { user } = useSession()
  const [perfiles, setPerfiles] = useState<PerfilMovil[]>([])
  const [personal, setPersonal] = useState<PersonalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create')
  const [selected, setSelected] = useState<PerfilMovil | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<PerfilMovil | null>(null)

  // Fetch perfiles
  const fetchPerfiles = async () => {
    setLoading(true)
    try {
      const data = await apiFetch<PerfilMovil[]>('/api/perfiles-movil', [])
      setPerfiles(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching perfiles:', error)
      toast.error('Error al cargar perfiles')
    }
    setLoading(false)
  }

  // Fetch personal para el selector
  const fetchPersonal = async () => {
    try {
      const res = await fetch('/api/personal')
      const data = await res.json()
      setPersonal(Array.isArray(data) ? data : [])
    } catch {
      // Si falla, intentar desde los perfiles mismos
    }
  }

  useEffect(() => {
    fetchPerfiles()
    fetchPersonal()
  }, [])

  // Refresh
  const handleRefresh = async () => {
    await fetchPerfiles()
    toast.success('Perfiles actualizados')
  }

  // Crear
  const handleOpenCreate = () => {
    setForm(EMPTY_FORM)
    setDialogMode('create')
    setSelected(null)
    setDialogOpen(true)
  }

  // Editar
  const handleOpenEdit = (perfil: PerfilMovil) => {
    setForm({
      name: perfil.name,
      accessCode: perfil.accessCode,
      password: perfil.password || '',
      color: perfil.color,
      icon: perfil.icon,
      permissions: perfil.permissions || [],
      personalId: perfil.personalId || '',
    })
    setDialogMode('edit')
    setSelected(perfil)
    setDialogOpen(true)
  }

  // Guardar (crear o editar)
  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }
    if (!form.accessCode.trim()) {
      toast.error('El código de acceso es obligatorio')
      return
    }

    setSaving(true)
    try {
      if (dialogMode === 'create') {
        const res = await fetch('/api/perfiles-movil', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            personalId: form.personalId || null,
          }),
        })
        const data = await res.json()
        if (res.ok) {
          toast.success(`Perfil "${data.name}" creado con código ${data.accessCode}`)
          setDialogOpen(false)
          fetchPerfiles()
        } else {
          toast.error(data.error || 'Error al crear perfil')
        }
      } else {
        const res = await fetch(`/api/perfiles-movil/${selected!.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...form,
            personalId: form.personalId || null,
          }),
        })
        const data = await res.json()
        if (res.ok) {
          toast.success(`Perfil "${data.name}" actualizado`)
          setDialogOpen(false)
          fetchPerfiles()
        } else {
          toast.error(data.error || 'Error al actualizar perfil')
        }
      }
    } catch (error) {
      toast.error('Error de conexión')
    }
    setSaving(false)
  }

  // Eliminar
  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      const res = await fetch(`/api/perfiles-movil/${deleteConfirm.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success(`Perfil "${deleteConfirm.name}" eliminado`)
        setDeleteConfirm(null)
        fetchPerfiles()
      } else {
        toast.error('Error al eliminar perfil')
      }
    } catch {
      toast.error('Error de conexión')
    }
  }

  // Toggle permiso
  const togglePermiso = (permId: string) => {
    setForm(prev => {
      const perms = prev.permissions.includes(permId)
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId]
      return { ...prev, permissions: perms }
    })
  }

  // Filtrado
  const filtered = useMemo(() => {
    if (!Array.isArray(perfiles)) return []
    if (!search.trim()) return perfiles
    const s = search.toLowerCase()
    return perfiles.filter(p =>
      (p.name || '').toLowerCase().includes(s) ||
      (p.accessCode || '').toLowerCase().includes(s) ||
      p.personal?.nombre?.toLowerCase().includes(s)
    )
  }, [perfiles, search])

  // Stats
  const stats = useMemo(() => ({
    total: Array.isArray(perfiles) ? perfiles.length : 0,
    conPersonal: perfiles.filter(p => p.personalId).length,
    supervisor: perfiles.filter(p => Array.isArray(p.permissions) && (p.permissions.includes('supervisor') || p.permissions.includes('admin'))).length,
    guardia: perfiles.filter(p => Array.isArray(p.permissions) && p.permissions.includes('guardia')).length,
  }), [perfiles])

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-xl">
            <Smartphone className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Perfiles App Móvil</h1>
            <p className="text-sm text-slate-500">Gestiona los usuarios de la aplicación móvil Laguna Norte</p>
          </div>
        </div>
        <Button onClick={handleRefresh} variant="outline" disabled={loading} className="flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Stats */}
      <TableroIndicadores
        items={[
          { titulo: 'Total Perfiles', numero: stats.total, icon: <Users className="w-5 h-5" />, color: 'primary' },
          { titulo: 'Vinculados a Personal', numero: stats.conPersonal, icon: <CheckCircle className="w-5 h-5" />, color: 'verde' },
          { titulo: 'Supervisores/Admin', numero: stats.supervisor, icon: <Star className="w-5 h-5" />, color: 'azul' },
          { titulo: 'Guardias', numero: stats.guardia, icon: <Shield className="w-5 h-5" />, color: 'purpura' },
        ]}
      />

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Buscar perfil..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="w-4 h-4 mr-1" /> Nuevo Perfil
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-3 text-xs font-bold text-slate-500 uppercase">Perfil</th>
                  <th className="text-left p-3 text-xs font-bold text-slate-500 uppercase">Código Acceso</th>
                  <th className="text-left p-3 text-xs font-bold text-slate-500 uppercase">Personal</th>
                  <th className="text-left p-3 text-xs font-bold text-slate-500 uppercase">Icono</th>
                  <th className="text-left p-3 text-xs font-bold text-slate-500 uppercase">Color</th>
                  <th className="text-left p-3 text-xs font-bold text-slate-500 uppercase">Permisos</th>
                  <th className="text-center p-3 text-xs font-bold text-slate-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                      Cargando perfiles...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      No se encontraron perfiles
                    </td>
                  </tr>
                ) : (
                  filtered.map((perfil) => (
                    <tr key={perfil.id} className="border-b hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${perfil.color}`}>
                            {getIconComponent(perfil.icon, 'w-4 h-4')}
                          </div>
                          <span className="font-medium text-sm text-slate-800">{perfil.name}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <code className="px-2 py-1 bg-slate-100 rounded text-xs font-mono font-bold text-slate-700">
                          {perfil.accessCode}
                        </code>
                      </td>
                      <td className="p-3 text-sm text-slate-600">
                        {perfil.personal ? (
                          <div>
                            <p className="font-medium">{perfil.personal.nombre}</p>
                            <p className="text-xs text-slate-400">{perfil.personal.cargo}</p>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="text-xs text-slate-600">{getIconLabel(perfil.icon)}</span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-3 h-3 rounded-full ${perfil.color}`} />
                          <span className="text-xs text-slate-600">{getColorLabel(perfil.color)}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {getPermisosBadges(perfil.permissions).map((p, i) => (
                            <Badge key={i} variant="secondary" className={`text-[10px] px-1.5 py-0 ${p.color}`}>
                              {p.label}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleOpenEdit(perfil)} title="Editar">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(perfil)} title="Eliminar" className="text-red-500 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog: Crear / Editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' ? 'Nuevo Perfil Móvil' : 'Editar Perfil Móvil'}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === 'create'
                ? 'Complete los datos para crear un nuevo perfil en la app móvil'
                : 'Modifique los datos del perfil móvil'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="perfil-name">Nombre completo *</Label>
              <Input
                id="perfil-name"
                placeholder="Ej: Juan Pérez"
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            {/* Código de acceso */}
            <div className="space-y-2">
              <Label htmlFor="perfil-code">Código de acceso *</Label>
              <div className="flex gap-2">
                <Input
                  id="perfil-code"
                  placeholder="Ej: 1234"
                  value={form.accessCode}
                  onChange={e => setForm(prev => ({ ...prev, accessCode: e.target.value }))}
                  className="flex-1"
                />
                {dialogMode === 'create' && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setForm(prev => ({
                      ...prev,
                      accessCode: String(Math.floor(1000 + Math.random() * 9000)),
                    }))}
                  >
                    Aleatorio
                  </Button>
                )}
              </div>
            </div>

            {/* Contraseña */}
            <div className="space-y-2">
              <Label htmlFor="perfil-password">Contraseña</Label>
              <Input
                id="perfil-password"
                placeholder="Dejar vacío para sin contraseña"
                value={form.password}
                onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
              />
              <p className="text-xs text-slate-400">Opcional. Código numérico para acceso directo.</p>
            </div>

            {/* Personal vinculado */}
            <div className="space-y-2">
              <Label htmlFor="perfil-personal">Personal vinculado</Label>
              <Select
                value={form.personalId}
                onValueChange={v => setForm(prev => ({ ...prev, personalId: v }))}
              >
                <SelectTrigger id="perfil-personal">
                  <SelectValue placeholder="Sin vincular" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin vincular</SelectItem>
                  {personal
                    .filter(p => p.estado === 'Activo')
                    .map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nombre} — {p.cargo}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Icono y Color en fila */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Icono</Label>
                <Select
                  value={form.icon}
                  onValueChange={v => setForm(prev => ({ ...prev, icon: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Select
                  value={form.color}
                  onValueChange={v => setForm(prev => ({ ...prev, color: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${o.value}`} />
                          {o.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Permisos */}
            <div className="space-y-2">
              <Label>Permisos</Label>
              <div className="border rounded-lg p-3 space-y-2">
                {ALL_PERMISSIONS.map(perm => (
                  <label key={perm.id} className="flex items-center gap-3 py-1 cursor-pointer hover:bg-slate-50 rounded px-1">
                    <Checkbox
                      checked={form.permissions.includes(perm.id)}
                      onCheckedChange={() => togglePermiso(perm.id)}
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-slate-700">{perm.label}</span>
                      <p className="text-xs text-slate-400">{perm.descripcion}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.name.trim() || !form.accessCode.trim()}>
              {saving ? <><RefreshCw className="w-4 h-4 animate-spin mr-1" /> Guardando...</> : dialogMode === 'create' ? 'Crear Perfil' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar eliminación */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar Perfil</DialogTitle>
            <DialogDescription>
              ¿Está seguro de que desea eliminar el perfil <strong>"{deleteConfirm?.name}"</strong>?
              Esta acción no se puede deshacer. El perfil será eliminado de la aplicación móvil.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-1" /> Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
