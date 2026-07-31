'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Receipt,
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  Send,
  DollarSign,
  FileText,
  Tag,
  Users,
  Eye,
  Download,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Camera,
  Paperclip,
  X,
  Image as ImageIcon,
} from 'lucide-react'
import { apiFetch, apiPost } from '@/lib/api-client'
import { useSession } from '@/hooks/use-session'

// ============================================================
// Types
// ============================================================
interface CategoriaGasto {
  id: string
  nombre: string
  descripcion: string | null
  color: string
  activa: boolean
}

interface CentroCosto {
  id: string
  codigo: string
  nombre: string
}

interface PersonalItem {
  personalId: string
  nombre: string
  cargo: string | null
  montoAsignado: number
  periodo: string
  montoId: string | null
  notas: string | null
}

interface BoletaRendicion {
  id?: string
  descripcion: string
  monto: number
  fecha: string | null
  nDocumento: string | null
  proveedor: string | null
  notas: string | null
  comprobante: string | null
  documento: string | null
  centroCostoId: string | null
  categoriaId: string | null
  centroCosto?: { id: string; codigo: string; nombre: string } | null
  categoria?: { id: string; nombre: string; color: string } | null
}

interface RendicionGasto {
  id: string
  codigo: string
  periodo: string
  concepto: string
  descripcion: string | null
  estado: string
  montoTotal: number
  montoAsignado: number
  fechaRendicion: string
  fechaAprobacion: string | null
  aprobadoPorNombre: string | null
  observaciones: string | null
  motivoRechazo: string | null
  responsableId: string | null
  responsableNombre: string | null
  responsable?: { id: string; nombre: string; cargo: string | null } | null
  emailEnviado: boolean
  emailEnviadoA: string | null
  emailFechaEnvio: string | null
  boletas: BoletaRendicion[]
  createdAt: string
}

// ============================================================
// Helpers
// ============================================================
const formatCLP = (n: number) =>
  '$' + new Intl.NumberFormat('es-CL').format(Math.round(n || 0))

const estadoColors: Record<string, string> = {
  Borrador: 'bg-slate-100 text-slate-700',
  'En Revisión': 'bg-amber-100 text-amber-700',
  Aprobada: 'bg-green-100 text-green-700',
  Rechazada: 'bg-red-100 text-red-700',
  Anulada: 'bg-gray-100 text-gray-500',
}

const estadoBadge: Record<string, { icon: React.ReactNode; color: string }> = {
  Borrador: { icon: <FileText className="w-3.5 h-3.5" />, color: 'bg-slate-100 text-slate-700' },
  'En Revisión': { icon: <Eye className="w-3.5 h-3.5" />, color: 'bg-amber-100 text-amber-700' },
  Aprobada: { icon: <CheckCircle className="w-3.5 h-3.5" />, color: 'bg-green-100 text-green-700' },
  Rechazada: { icon: <XCircle className="w-3.5 h-3.5" />, color: 'bg-red-100 text-red-700' },
  Anulada: { icon: <XCircle className="w-3.5 h-3.5" />, color: 'bg-gray-100 text-gray-500' },
}

const emptyBoleta: BoletaRendicion = {
  descripcion: '',
  monto: 0,
  fecha: new Date().toISOString().split('T')[0],
  nDocumento: '',
  proveedor: '',
  notas: '',
  comprobante: null,
  documento: null,
  centroCostoId: null,
  categoriaId: null,
}

// ============================================================
// Component
// ============================================================
export function RendicionesGastosModule() {
  const { user, hasPermission } = useSession()
  const isAdmin = user?.rol === 'admin' || user?.rol === 'supervisor'

  // State
  const [rendiciones, setRendiciones] = useState<RendicionGasto[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('rendiciones')

  // Filtros
  const [filterEstado, setFilterEstado] = useState('')
  const [filterPeriodo, setFilterPeriodo] = useState('')

  // Categorías
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([])
  // Centros de costo
  const [centrosCosto, setCentrosCosto] = useState<CentroCosto[]>([])
  // Personal
  const [personalList, setPersonalList] = useState<PersonalItem[]>([])

  // Dialogs
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [catDialogOpen, setCatDialogOpen] = useState(false)
  const [montoDialogOpen, setMontoDialogOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<'aprobar' | 'rechazar' | 'enviar_revision'>('aprobar')
  const [actionObservaciones, setActionObservaciones] = useState('')

  // Editing
  const [editingRendicion, setEditingRendicion] = useState<RendicionGasto | null>(null)
  const [selectedRendicion, setSelectedRendicion] = useState<RendicionGasto | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<RendicionGasto | null>(null)

  // Form data
  const [formData, setFormData] = useState({
    periodo: new Date().toISOString().slice(0, 7),
    concepto: '',
    descripcion: '',
    responsableId: '',
    responsableNombre: '',
    montoAsignado: 0,
    observaciones: '',
  })
  const [boletas, setBoletas] = useState<BoletaRendicion[]>([{ ...emptyBoleta }])

  // Monto form
  const [montoForm, setMontoForm] = useState({
    personalId: '',
    monto: 0,
    periodo: 'Mensual',
    notas: '',
  })

  // Cat form
  const [catForm, setCatForm] = useState({
    nombre: '',
    descripcion: '',
    color: '#0f2044',
    editId: null as string | null,
  })

  // ============================================================
  // Data fetching
  // ============================================================
  const fetchRendiciones = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterEstado) params.set('estado', filterEstado)
      if (filterPeriodo) params.set('periodo', filterPeriodo)
      const query = params.toString()
      const data = await apiFetch<RendicionGasto[]>(`/api/rendiciones-gastos${query ? `?${query}` : ''}`, [])
      setRendiciones(data)
    } catch (e) {
      console.error('Error fetching rendiciones:', e)
    }
    setLoading(false)
  }, [filterEstado, filterPeriodo])

  const fetchCatalogos = useCallback(async () => {
    try {
      const [cats, ccs, personal] = await Promise.all([
        apiFetch<CategoriaGasto[]>('/api/rendiciones-gastos/categorias', []),
        apiFetch<CentroCosto[]>('/api/centros-costo', []),
        apiFetch<PersonalItem[]>('/api/rendiciones-gastos/montos-asignados', []),
      ])
      setCategorias(cats)
      setCentrosCosto(ccs)
      setPersonalList(personal)
    } catch (e) {
      console.error('Error fetching catálogos:', e)
    }
  }, [])

  useEffect(() => {
    void fetchRendiciones()
  }, [fetchRendiciones])

  useEffect(() => {
    void fetchCatalogos()
  }, [fetchCatalogos])

  // ============================================================
  // Handlers
  // ============================================================
  const openCreate = () => {
    setEditingRendicion(null)
    setFormData({
      periodo: new Date().toISOString().slice(0, 7),
      concepto: '',
      descripcion: '',
      responsableId: '',
      responsableNombre: '',
      montoAsignado: 0,
      observaciones: '',
    })
    setBoletas([{ ...emptyBoleta }])
    setDialogOpen(true)
  }

  const openEdit = (r: RendicionGasto) => {
    setEditingRendicion(r)
    setFormData({
      periodo: r.periodo,
      concepto: r.concepto,
      descripcion: r.descripcion || '',
      responsableId: r.responsableId || '',
      responsableNombre: r.responsableNombre || '',
      montoAsignado: r.montoAsignado || 0,
      observaciones: r.observaciones || '',
    })
    setBoletas(r.boletas.length > 0 ? r.boletas.map(b => ({ ...b })) : [{ ...emptyBoleta }])
    setDialogOpen(true)
  }

  const openDetail = (r: RendicionGasto) => {
    setSelectedRendicion(r)
    setDetailOpen(true)
  }

  const openAction = (r: RendicionGasto, accion: 'aprobar' | 'rechazar' | 'enviar_revision') => {
    setSelectedRendicion(r)
    setActionType(accion)
    setActionObservaciones('')
    setActionDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      // Si se seleccionó un responsable, buscar su monto asignado
      let montoAsignado = formData.montoAsignado
      if (formData.responsableId && !montoAsignado) {
        const p = personalList.find(p => p.personalId === formData.responsableId)
        if (p) montoAsignado = p.montoAsignado
      }

      // Validar montos
      const totalBoletas = boletas.reduce((s, b) => s + (b.monto || 0), 0)
      if (montoAsignado > 0 && totalBoletas > montoAsignado) {
        alert(`El monto total de boletas (${formatCLP(totalBoletas)}) excede el monto asignado (${formatCLP(montoAsignado)})`)
        return
      }

      const body = {
        ...formData,
        montoAsignado,
        boletas: boletas,
      }

      if (editingRendicion) {
        const res = await apiPost(`/api/rendiciones-gastos/${editingRendicion.id}`, body, { method: 'PUT' })
        if (!res.ok) { alert('Error al guardar: ' + (res.error || 'Error desconocido')); return }
      } else {
        const res = await apiPost('/api/rendiciones-gastos', body)
        if (!res.ok) { alert('Error al crear: ' + (res.error || 'Error desconocido')); return }
      }

      setDialogOpen(false)
      void fetchRendiciones()
    } catch (e) {
      console.error('Error saving rendición:', e)
      alert('Error al guardar la rendición')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await apiPost(`/api/rendiciones-gastos/${deleteTarget.id}`, null, { method: 'DELETE' })
      if (!res.ok) { alert('Error al eliminar: ' + (res.error || 'Error desconocido')); return }
      setConfirmOpen(false)
      setDeleteTarget(null)
      void fetchRendiciones()
    } catch (e) {
      console.error('Error deleting:', e)
    }
  }

  const handleAction = async () => {
    if (!selectedRendicion) return
    try {
      const res = await apiPost(`/api/rendiciones-gastos/${selectedRendicion.id}/aprobar`, {
        accion: actionType,
        observaciones: actionObservaciones,
      })
      if (!res.ok) { alert('Error al ejecutar: ' + (res.error || 'Error desconocido')); return }
      setActionDialogOpen(false)
      void fetchRendiciones()
    } catch (e) {
      console.error('Error executing action:', e)
      alert('Error al ejecutar la acción')
    }
  }

  const handleSaveCategoria = async () => {
    try {
      if (catForm.editId) {
        const res = await apiPost('/api/rendiciones-gastos/categorias', {
          id: catForm.editId,
          nombre: catForm.nombre,
          descripcion: catForm.descripcion,
          color: catForm.color,
        }, { method: 'PUT' })
        if (!res.ok) { alert('Error al guardar: ' + (res.error || 'Error desconocido')); return }
      } else {
        const res = await apiPost('/api/rendiciones-gastos/categorias', {
          nombre: catForm.nombre,
          descripcion: catForm.descripcion,
          color: catForm.color,
        })
        if (!res.ok) { alert('Error al crear: ' + (res.error || 'Error desconocido')); return }
      }
      setCatDialogOpen(false)
      setCatForm({ nombre: '', descripcion: '', color: '#0f2044', editId: null })
      void fetchCatalogos()
    } catch (e) {
      console.error('Error saving categoria:', e)
      alert('Error al guardar la categoría')
    }
  }

  const handleSaveMonto = async () => {
    try {
      const res = await apiPost('/api/rendiciones-gastos/montos-asignados', montoForm)
      if (!res.ok) { alert('Error al asignar monto: ' + (res.error || 'Error desconocido')); return }
      setMontoDialogOpen(false)
      setMontoForm({ personalId: '', monto: 0, periodo: 'Mensual', notas: '' })
      void fetchCatalogos()
    } catch (e) {
      console.error('Error saving monto:', e)
      alert('Error al asignar monto')
    }
  }

  const handleSeedCategorias = async () => {
    try {
      const res = await apiPost('/api/rendiciones-gastos/seed-categorias', {})
      if (!res.ok) { alert('Error al crear categorías: ' + (res.error || 'Error desconocido')); return }
      void fetchCatalogos()
    } catch (e) {
      console.error('Error seeding categorías:', e)
      alert('Error al crear categorías por defecto')
    }
  }

  // Boleta management
  const addBoleta = () => setBoletas([...boletas, { ...emptyBoleta }])
  const removeBoleta = (i: number) => setBoletas(boletas.filter((_, idx) => idx !== i))
  const updateBoleta = (i: number, field: string, value: any) => {
    const updated = [...boletas]
    updated[i] = { ...updated[i], [field]: value }
    setBoletas(updated)
  }

  // Responsable change handler
  const handleResponsableChange = (personalId: string) => {
    const p = personalList.find(p => p.personalId === personalId)
    setFormData({
      ...formData,
      responsableId: personalId,
      responsableNombre: p?.nombre || '',
      montoAsignado: p?.montoAsignado || 0,
    })
  }

  // Calculated values
  const totalBoletas = boletas.reduce((s, b) => s + (b.monto || 0), 0)
  const pctUsado = formData.montoAsignado > 0 ? Math.min(100, (totalBoletas / formData.montoAsignado) * 100) : 0
  const excedeMonto = formData.montoAsignado > 0 && totalBoletas > formData.montoAsignado

  // ============================================================
  // Render
  // ============================================================
  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
              <Receipt className="w-3.5 h-3.5" /> Total Rendiciones
            </div>
            <div className="text-2xl font-bold text-slate-800">{rendiciones.length}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
              <Eye className="w-3.5 h-3.5" /> En Revisión
            </div>
            <div className="text-2xl font-bold text-amber-600">
              {rendiciones.filter(r => r.estado === 'En Revisión').length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
              <CheckCircle className="w-3.5 h-3.5" /> Aprobadas
            </div>
            <div className="text-2xl font-bold text-green-600">
              {rendiciones.filter(r => r.estado === 'Aprobada').length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-indigo-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
              <DollarSign className="w-3.5 h-3.5" /> Total Monto
            </div>
            <div className="text-lg font-bold text-indigo-600">
              {formatCLP(rendiciones.reduce((s, r) => s + (r.montoTotal || 0), 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-slate-100">
          <TabsTrigger value="rendiciones" className="gap-1.5">
            <Receipt className="w-4 h-4" /> Rendiciones
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="categorias" className="gap-1.5">
                <Tag className="w-4 h-4" /> Categorías
              </TabsTrigger>
              <TabsTrigger value="montos" className="gap-1.5">
                <Users className="w-4 h-4" /> Montos Asignados
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* ===== Tab Rendiciones ===== */}
        <TabsContent value="rendiciones">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="w-5 h-5" /> Rendiciones de Gastos
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={filterEstado} onValueChange={v => setFilterEstado(v === '_all' ? '' : v)}>
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all">Todos</SelectItem>
                      <SelectItem value="Borrador">Borrador</SelectItem>
                      <SelectItem value="En Revisión">En Revisión</SelectItem>
                      <SelectItem value="Aprobada">Aprobada</SelectItem>
                      <SelectItem value="Rechazada">Rechazada</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={openCreate} size="sm" className="gap-1.5">
                    <Plus className="w-4 h-4" /> Nueva Rendición
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-10 text-slate-400">Cargando...</div>
              ) : rendiciones.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>No hay rendiciones de gastos</p>
                  <p className="text-xs mt-1">Crea una nueva rendición para comenzar</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {rendiciones.map(r => (
                    <RendicionCard
                      key={r.id}
                      rendicion={r}
                      isAdmin={isAdmin}
                      onView={() => openDetail(r)}
                      onEdit={() => openEdit(r)}
                      onDelete={() => { setDeleteTarget(r); setConfirmOpen(true) }}
                      onAction={(accion) => openAction(r, accion)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Tab Categorías ===== */}
        {isAdmin && (
          <TabsContent value="categorias">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Tag className="w-5 h-5" /> Categorías de Gastos
                  </CardTitle>
                  <div className="flex gap-2">
                    {categorias.length === 0 && (
                      <Button variant="outline" size="sm" onClick={handleSeedCategorias} className="gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5" /> Crear Categorías por Defecto
                      </Button>
                    )}
                    <Button onClick={() => { setCatForm({ nombre: '', descripcion: '', color: '#0f2044', editId: null }); setCatDialogOpen(true) }} size="sm" className="gap-1.5">
                      <Plus className="w-4 h-4" /> Nueva Categoría
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {categorias.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <Tag className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>No hay categorías creadas</p>
                    <p className="text-xs mt-1">Crea categorías para clasificar los gastos en las boletas</p>
                    <Button variant="outline" size="sm" onClick={handleSeedCategorias} className="mt-3 gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5" /> Crear 12 Categorías por Defecto
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {categorias.map(cat => (
                      <div key={cat.id} className="border rounded-lg p-3 flex items-start gap-2.5">
                        <div className="w-3 h-3 rounded-full mt-1 shrink-0" style={{ backgroundColor: cat.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{cat.nombre}</div>
                          {cat.descripcion && (
                            <div className="text-xs text-slate-500 truncate mt-0.5">{cat.descripcion}</div>
                          )}
                        </div>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 shrink-0"
                            onClick={() => {
                              setCatForm({
                                nombre: cat.nombre,
                                descripcion: cat.descripcion || '',
                                color: cat.color,
                                editId: cat.id,
                              })
                              setCatDialogOpen(true)
                            }}
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ===== Tab Montos Asignados ===== */}
        {isAdmin && (
          <TabsContent value="montos">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-5 h-5" /> Montos Asignados por Personal
                  </CardTitle>
                  <Button onClick={() => { setMontoForm({ personalId: '', monto: 0, periodo: 'Mensual', notas: '' }); setMontoDialogOpen(true) }} size="sm" className="gap-1.5">
                    <Plus className="w-4 h-4" /> Asignar Monto
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-slate-500 mb-3">
                  Asigna un monto máximo por persona. Al crear una rendición, el sistema validará que el total no exceda el monto asignado.
                </div>
                {personalList.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>No hay personal activo</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-slate-50">
                          <th className="text-left py-2 px-3 font-medium text-slate-600">Nombre</th>
                          <th className="text-left py-2 px-3 font-medium text-slate-600">Cargo</th>
                          <th className="text-right py-2 px-3 font-medium text-slate-600">Monto Asignado</th>
                          <th className="text-center py-2 px-3 font-medium text-slate-600">Período</th>
                          <th className="text-center py-2 px-3 font-medium text-slate-600">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {personalList.map(p => (
                          <tr key={p.personalId} className="border-b last:border-b-0 hover:bg-slate-50">
                            <td className="py-2 px-3">{p.nombre}</td>
                            <td className="py-2 px-3 text-slate-500">{p.cargo || '-'}</td>
                            <td className="py-2 px-3 text-right font-medium">
                              {p.montoAsignado > 0 ? formatCLP(p.montoAsignado) : <span className="text-slate-400">Sin asignar</span>}
                            </td>
                            <td className="py-2 px-3 text-center text-slate-500">{p.montoAsignado > 0 ? p.periodo : '-'}</td>
                            <td className="py-2 px-3 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs gap-1"
                                onClick={() => {
                                  setMontoForm({
                                    personalId: p.personalId,
                                    monto: p.montoAsignado || 0,
                                    periodo: p.periodo || 'Mensual',
                                    notas: p.notas || '',
                                  })
                                  setMontoDialogOpen(true)
                                }}
                              >
                                <Pencil className="w-3 h-3" /> Asignar
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* ===== Dialog: Crear/Editar Rendición ===== */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              {editingRendicion ? `Editar ${editingRendicion.codigo}` : 'Nueva Rendición de Gastos'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Cabecera */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Período (YYYY-MM) *</Label>
                <Input
                  type="month"
                  value={formData.periodo}
                  onChange={e => setFormData({ ...formData, periodo: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Responsable</Label>
                <Select value={formData.responsableId} onValueChange={handleResponsableChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar responsable" />
                  </SelectTrigger>
                  <SelectContent>
                    {personalList.map(p => (
                      <SelectItem key={p.personalId} value={p.personalId}>
                        {p.nombre} {p.cargo ? `(${p.cargo})` : ''}
                        {p.montoAsignado > 0 ? ` — ${formatCLP(p.montoAsignado)}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs font-medium">Concepto *</Label>
                <Input
                  value={formData.concepto}
                  onChange={e => setFormData({ ...formData, concepto: e.target.value })}
                  placeholder="Ej: Rendición Julio 2026 - Jefe de Operaciones"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs font-medium">Descripción</Label>
                <Textarea
                  value={formData.descripcion}
                  onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Descripción adicional de la rendición"
                  rows={2}
                />
              </div>
              {formData.responsableId && formData.montoAsignado > 0 && (
                <div className="sm:col-span-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-amber-700">
                      Monto Asignado: {formatCLP(formData.montoAsignado)}
                    </span>
                    <span className={`text-xs font-bold ${excedeMonto ? 'text-red-600' : 'text-green-600'}`}>
                      {formatCLP(totalBoletas)} ({Math.round(pctUsado)}%)
                    </span>
                  </div>
                  <Progress
                    value={pctUsado}
                    className={`h-2 ${excedeMonto ? '[&>div]:bg-red-500' : pctUsado > 80 ? '[&>div]:bg-amber-500' : '[&>div]:bg-green-500'}`}
                  />
                  {excedeMonto && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                      <AlertTriangle className="w-3 h-3" /> El monto total excede el asignado
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Boletas */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Receipt className="w-4 h-4" /> Boletas / Comprobantes
                </Label>
                <Button variant="outline" size="sm" onClick={addBoleta} className="gap-1 text-xs">
                  <Plus className="w-3.5 h-3.5" /> Agregar Boleta
                </Button>
              </div>

              <div className="space-y-3">
                {boletas.map((b, i) => (
                  <BoletaRow
                    key={i}
                    index={i}
                    boleta={b}
                    centrosCosto={centrosCosto}
                    categorias={categorias}
                    onUpdate={(field, value) => updateBoleta(i, field, value)}
                    onRemove={() => removeBoleta(i)}
                    canRemove={boletas.length > 1}
                  />
                ))}
              </div>

              <div className="flex justify-end mt-3 p-2 bg-slate-50 rounded-lg">
                <span className="text-sm font-bold">
                  Total: {formatCLP(totalBoletas)}
                </span>
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <Label className="text-xs font-medium">Observaciones</Label>
              <Textarea
                value={formData.observaciones}
                onChange={e => setFormData({ ...formData, observaciones: e.target.value })}
                placeholder="Observaciones generales de la rendición"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!formData.periodo || !formData.concepto || boletas.length === 0} className="gap-1.5">
              <Receipt className="w-4 h-4" /> {editingRendicion ? 'Guardar Cambios' : 'Crear Rendición'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog: Detalle ===== */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              {selectedRendicion?.codigo} — {selectedRendicion?.concepto}
            </DialogTitle>
          </DialogHeader>
          {selectedRendicion && (
            <RendicionDetalle rendicion={selectedRendicion} categorias={categorias} />
          )}
        </DialogContent>
      </Dialog>

      {/* ===== Dialog: Acción (Aprobar/Rechazar/Enviar Revisión) ===== */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'aprobar' && <CheckCircle className="w-5 h-5 text-green-600" />}
              {actionType === 'rechazar' && <XCircle className="w-5 h-5 text-red-600" />}
              {actionType === 'enviar_revision' && <Send className="w-5 h-5 text-amber-600" />}
              {actionType === 'aprobar' && 'Aprobar Rendición'}
              {actionType === 'rechazar' && 'Rechazar Rendición'}
              {actionType === 'enviar_revision' && 'Enviar a Revisión'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {actionType === 'aprobar' && (
              <p className="text-sm text-slate-600">
                Al aprobar, se enviará un email a <strong>administracionlagunanorte@gmail.com</strong> con el detalle de la rendición.
              </p>
            )}
            <div>
              <Label className="text-xs font-medium">Observaciones</Label>
              <Textarea
                value={actionObservaciones}
                onChange={e => setActionObservaciones(e.target.value)}
                placeholder={actionType === 'rechazar' ? 'Motivo del rechazo (obligatorio)' : 'Observaciones adicionales (opcional)'}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>Cancelar</Button>
            <Button
              onClick={handleAction}
              className={
                actionType === 'aprobar' ? 'bg-green-600 hover:bg-green-700 gap-1.5' :
                actionType === 'rechazar' ? 'bg-red-600 hover:bg-red-700 gap-1.5' :
                'bg-amber-600 hover:bg-amber-700 gap-1.5'
              }
            >
              {actionType === 'aprobar' && <><CheckCircle className="w-4 h-4" /> Aprobar</>}
              {actionType === 'rechazar' && <><XCircle className="w-4 h-4" /> Rechazar</>}
              {actionType === 'enviar_revision' && <><Send className="w-4 h-4" /> Enviar a Revisión</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog: Categoría ===== */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{catForm.editId ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium">Nombre *</Label>
              <Input
                value={catForm.nombre}
                onChange={e => setCatForm({ ...catForm, nombre: e.target.value })}
                placeholder="Nombre de la categoría"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Descripción</Label>
              <Textarea
                value={catForm.descripcion}
                onChange={e => setCatForm({ ...catForm, descripcion: e.target.value })}
                placeholder="Descripción de la categoría"
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={catForm.color}
                  onChange={e => setCatForm({ ...catForm, color: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <Input
                  value={catForm.color}
                  onChange={e => setCatForm({ ...catForm, color: e.target.value })}
                  placeholder="#000000"
                  className="w-32"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveCategoria} disabled={!catForm.nombre}>
              {catForm.editId ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog: Monto Asignado ===== */}
      <Dialog open={montoDialogOpen} onOpenChange={setMontoDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar Monto de Rendición</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium">Personal *</Label>
              <Select
                value={montoForm.personalId}
                onValueChange={v => setMontoForm({ ...montoForm, personalId: v })}
                disabled={!!montoForm.personalId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar personal" />
                </SelectTrigger>
                <SelectContent>
                  {personalList.map(p => (
                    <SelectItem key={p.personalId} value={p.personalId}>
                      {p.nombre} {p.cargo ? `(${p.cargo})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium">Monto Asignado ($) *</Label>
              <Input
                type="number"
                value={montoForm.monto}
                onChange={e => setMontoForm({ ...montoForm, monto: parseFloat(e.target.value) || 0 })}
                placeholder="Ej: 500000"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Período</Label>
              <Select value={montoForm.periodo} onValueChange={v => setMontoForm({ ...montoForm, periodo: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Semanal">Semanal</SelectItem>
                  <SelectItem value="Quincenal">Quincenal</SelectItem>
                  <SelectItem value="Mensual">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium">Notas</Label>
              <Textarea
                value={montoForm.notas}
                onChange={e => setMontoForm({ ...montoForm, notas: e.target.value })}
                placeholder="Notas sobre este monto asignado"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMontoDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveMonto} disabled={!montoForm.personalId || montoForm.monto <= 0}>
              <DollarSign className="w-4 h-4 mr-1" /> Asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog: Confirm Delete ===== */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" /> Eliminar Rendición
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            ¿Estás seguro de eliminar la rendición <strong>{deleteTarget?.codigo}</strong>?
            Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// Sub-component: RendicionCard
// ============================================================
function RendicionCard({
  rendicion,
  isAdmin,
  onView,
  onEdit,
  onDelete,
  onAction,
}: {
  rendicion: RendicionGasto
  isAdmin: boolean
  onView: () => void
  onEdit: () => void
  onDelete: () => void
  onAction: (accion: 'aprobar' | 'rechazar' | 'enviar_revision') => void
}) {
  const [expanded, setExpanded] = useState(false)
  const badge = estadoBadge[rendicion.estado] || estadoBadge['Borrador']

  return (
    <div className="border rounded-lg overflow-hidden hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between p-3 bg-white">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="shrink-0">
            <Badge className={`${badge.color} gap-1 text-xs`}>
              {badge.icon} {rendicion.estado}
            </Badge>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-slate-800">{rendicion.codigo}</span>
              <span className="text-sm text-slate-600 truncate">{rendicion.concepto}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
              <span>Período: {rendicion.periodo}</span>
              {rendicion.responsableNombre && <span>Responsable: {rendicion.responsableNombre}</span>}
              <span className="font-medium text-slate-700">{formatCLP(rendicion.montoTotal)}</span>
              {rendicion.montoAsignado > 0 && (
                <span className={rendicion.montoTotal > rendicion.montoAsignado ? 'text-red-600' : 'text-slate-500'}>
                  (asignado: {formatCLP(rendicion.montoAsignado)})
                </span>
              )}
              <span>{rendicion.boletas.length} boleta{rendicion.boletas.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onView} title="Ver detalle">
              <Eye className="w-3.5 h-3.5" />
            </Button>
            {(rendicion.estado === 'Borrador' || rendicion.estado === 'En Revisión') && (
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onEdit} title="Editar">
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            )}
            {isAdmin && rendicion.estado === 'Borrador' && (
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-green-600" onClick={() => onAction('enviar_revision')} title="Enviar a revisión">
                <Send className="w-3.5 h-3.5" />
              </Button>
            )}
            {isAdmin && rendicion.estado === 'En Revisión' && (
              <>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-green-600" onClick={() => onAction('aprobar')} title="Aprobar">
                  <CheckCircle className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600" onClick={() => onAction('rechazar')} title="Rechazar">
                  <XCircle className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
            {isAdmin && rendicion.estado === 'Borrador' && (
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={onDelete} title="Eliminar">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </div>
      {expanded && (
        <div className="border-t bg-slate-50 p-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1 px-2 font-medium text-slate-500">#</th>
                <th className="text-left py-1 px-2 font-medium text-slate-500">Descripción</th>
                <th className="text-left py-1 px-2 font-medium text-slate-500">Proveedor</th>
                <th className="text-left py-1 px-2 font-medium text-slate-500">Centro Costo</th>
                <th className="text-left py-1 px-2 font-medium text-slate-500">Categoría</th>
                <th className="text-right py-1 px-2 font-medium text-slate-500">Monto</th>
                <th className="text-center py-1 px-2 font-medium text-slate-500">Archivos</th>
              </tr>
            </thead>
            <tbody>
              {rendicion.boletas.map((b, i) => (
                <tr key={b.id || i} className="border-b last:border-b-0">
                  <td className="py-1 px-2">{i + 1}</td>
                  <td className="py-1 px-2">{b.descripcion}</td>
                  <td className="py-1 px-2">{b.proveedor || '-'}</td>
                  <td className="py-1 px-2">{b.centroCosto?.nombre || '-'}</td>
                  <td className="py-1 px-2">
                    {b.categoria ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.categoria.color }} />
                        {b.categoria.nombre}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="py-1 px-2 text-right font-medium">{formatCLP(b.monto)}</td>
                  <td className="py-1 px-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {b.comprobante && (
                        <button type="button" className="text-blue-500 hover:text-blue-700" onClick={() => window.open(b.comprobante!.startsWith('data:') ? b.comprobante! : `data:image/jpeg;base64,${b.comprobante}`, '_blank')} title="Ver foto">
                          <ImageIcon className="w-3 h-3" />
                        </button>
                      )}
                      {b.documento && (
                        <button type="button" className="text-green-500 hover:text-green-700" onClick={() => { const a = document.createElement('a'); a.href = b.documento!.startsWith('data:') ? b.documento! : `data:application/pdf;base64,${b.documento}`; a.download = 'documento_boleta.pdf'; a.click() }} title="Descargar documento">
                          <Paperclip className="w-3 h-3" />
                        </button>
                      )}
                      {!b.comprobante && !b.documento && <span className="text-slate-300">—</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td colSpan={6} className="py-1 px-2 text-right">Total:</td>
                <td className="py-1 px-2 text-right">{formatCLP(rendicion.montoTotal)}</td>
              </tr>
            </tfoot>
          </table>
          {rendicion.emailEnviado && (
            <div className="text-xs text-green-600 mt-2 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Email enviado a {rendicion.emailEnviadoA} el {rendicion.emailFechaEnvio ? new Date(rendicion.emailFechaEnvio).toLocaleString('es-CL') : ''}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Sub-component: BoletaRow
// ============================================================
function BoletaRow({
  index,
  boleta,
  centrosCosto,
  categorias,
  onUpdate,
  onRemove,
  canRemove,
}: {
  index: number
  boleta: BoletaRendicion
  centrosCosto: CentroCosto[]
  categorias: CategoriaGasto[]
  onUpdate: (field: string, value: any) => void
  onRemove: () => void
  canRemove: boolean
}) {
  return (
    <div className="border rounded-lg p-3 bg-slate-50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-600">Boleta #{index + 1}</span>
        {canRemove && (
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" onClick={onRemove}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        <div className="sm:col-span-2 lg:col-span-3">
          <Label className="text-xs">Descripción *</Label>
          <Input
            value={boleta.descripcion}
            onChange={e => onUpdate('descripcion', e.target.value)}
            placeholder="Descripción del gasto"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Monto ($) *</Label>
          <Input
            type="number"
            value={boleta.monto || ''}
            onChange={e => onUpdate('monto', parseFloat(e.target.value) || 0)}
            placeholder="0"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Fecha</Label>
          <Input
            type="date"
            value={boleta.fecha || ''}
            onChange={e => onUpdate('fecha', e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">N° Documento</Label>
          <Input
            value={boleta.nDocumento || ''}
            onChange={e => onUpdate('nDocumento', e.target.value)}
            placeholder="N° boleta/factura"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Proveedor</Label>
          <Input
            value={boleta.proveedor || ''}
            onChange={e => onUpdate('proveedor', e.target.value)}
            placeholder="Nombre del proveedor"
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Centro de Costo</Label>
          <Select value={boleta.centroCostoId || '_none'} onValueChange={v => onUpdate('centroCostoId', v === '_none' ? null : v)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Sin centro de costo</SelectItem>
              {centrosCosto.map(cc => (
                <SelectItem key={cc.id} value={cc.id}>{cc.codigo} - {cc.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Categoría</Label>
          <Select value={boleta.categoriaId || '_none'} onValueChange={v => onUpdate('categoriaId', v === '_none' ? null : v)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Sin categoría</SelectItem>
              {categorias.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* Foto del comprobante / boleta */}
        <div className="sm:col-span-2 lg:col-span-3">
          <Label className="text-xs flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5" /> Foto de Comprobante / Boleta
          </Label>
          {boleta.comprobante ? (
            <div className="flex items-center gap-2 mt-1">
              <div className="relative group">
                <img
                  src={boleta.comprobante.startsWith('data:') ? boleta.comprobante : `data:image/jpeg;base64,${boleta.comprobante}`}
                  alt="Comprobante"
                  className="h-16 w-16 object-cover rounded border cursor-pointer"
                  onClick={() => window.open(boleta.comprobante.startsWith('data:') ? boleta.comprobante : `data:image/jpeg;base64,${boleta.comprobante}`, '_blank')}
                />
                <button
                  type="button"
                  className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onUpdate('comprobante', null)}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <span className="text-xs text-green-600">Imagen cargada</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = 'image/*'
                  input.onchange = (e: any) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const reader = new FileReader()
                      reader.onload = () => onUpdate('comprobante', reader.result as string)
                      reader.readAsDataURL(file)
                    }
                  }
                  input.click()
                }}
              >
                <Camera className="w-3 h-3" /> Cambiar
              </Button>
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = 'image/*'
                input.onchange = (e: any) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    const reader = new FileReader()
                    reader.onload = () => onUpdate('comprobante', reader.result as string)
                    reader.readAsDataURL(file)
                  }
                }
                input.click()
              }}
            >
              <Camera className="w-5 h-5 mx-auto text-slate-400 mb-1" />
              <p className="text-xs text-slate-500">Haz clic para subir foto del comprobante</p>
              <p className="text-xs text-slate-400">JPG, PNG (máx. 5MB)</p>
            </div>
          )}
        </div>
        {/* Documento adjunto */}
        <div className="sm:col-span-2 lg:col-span-3">
          <Label className="text-xs flex items-center gap-1.5">
            <Paperclip className="w-3.5 h-3.5" /> Documento Adjunto
          </Label>
          {boleta.documento ? (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1.5 bg-slate-100 rounded px-2 py-1">
                <FileText className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-slate-700 max-w-32 truncate">Documento adjunto</span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => {
                  const a = document.createElement('a')
                  a.href = boleta.documento!.startsWith('data:') ? boleta.documento! : `data:application/pdf;base64,${boleta.documento}`
                  a.download = `documento_boleta_${index + 1}.pdf`
                  a.click()
                }}
              >
                <Download className="w-3 h-3" /> Descargar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => {
                  const input = document.createElement('input')
                  input.type = 'file'
                  input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png'
                  input.onchange = (e: any) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      const reader = new FileReader()
                      reader.onload = () => onUpdate('documento', reader.result as string)
                      reader.readAsDataURL(file)
                    }
                  }
                  input.click()
                }}
              >
                <Pencil className="w-3 h-3" /> Cambiar
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-red-500"
                onClick={() => onUpdate('documento', null)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-slate-300 rounded-lg p-3 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png'
                input.onchange = (e: any) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    const reader = new FileReader()
                    reader.onload = () => onUpdate('documento', reader.result as string)
                    reader.readAsDataURL(file)
                  }
                }
                input.click()
              }}
            >
              <Paperclip className="w-5 h-5 mx-auto text-slate-400 mb-1" />
              <p className="text-xs text-slate-500">Haz clic para subir documento (PDF, Word, Excel, imagen)</p>
              <p className="text-xs text-slate-400">Máx. 10MB</p>
            </div>
          )}
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <Label className="text-xs">Notas</Label>
          <Input
            value={boleta.notas || ''}
            onChange={e => onUpdate('notas', e.target.value)}
            placeholder="Notas adicionales"
            className="h-8 text-sm"
          />
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Sub-component: RendicionDetalle
// ============================================================
function RendicionDetalle({ rendicion, categorias }: { rendicion: RendicionGasto; categorias: CategoriaGasto[] }) {
  const badge = estadoBadge[rendicion.estado] || estadoBadge['Borrador']
  const pctUsado = rendicion.montoAsignado > 0 ? Math.min(100, (rendicion.montoTotal / rendicion.montoAsignado) * 100) : 0
  const excedeMonto = rendicion.montoAsignado > 0 && rendicion.montoTotal > rendicion.montoAsignado

  return (
    <div className="space-y-4">
      {/* Info cabecera */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="space-y-1">
          <div className="text-xs text-slate-500">Estado</div>
          <Badge className={`${badge.color} gap-1`}>{badge.icon} {rendicion.estado}</Badge>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-slate-500">Período</div>
          <div className="font-medium">{rendicion.periodo}</div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-slate-500">Responsable</div>
          <div className="font-medium">{rendicion.responsableNombre || '-'}</div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-slate-500">Fecha Rendición</div>
          <div className="font-medium">{new Date(rendicion.fechaRendicion).toLocaleDateString('es-CL')}</div>
        </div>
        {rendicion.fechaAprobacion && (
          <div className="space-y-1">
            <div className="text-xs text-slate-500">Fecha Aprobación</div>
            <div className="font-medium">{new Date(rendicion.fechaAprobacion).toLocaleDateString('es-CL')}</div>
          </div>
        )}
        {rendicion.aprobadoPorNombre && (
          <div className="space-y-1">
            <div className="text-xs text-slate-500">Aprobado por</div>
            <div className="font-medium">{rendicion.aprobadoPorNombre}</div>
          </div>
        )}
      </div>

      {/* Montos */}
      <div className="p-3 bg-slate-50 rounded-lg border">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-slate-600">Monto Total Rendido</span>
          <span className="text-lg font-bold text-slate-800">{formatCLP(rendicion.montoTotal)}</span>
        </div>
        {rendicion.montoAsignado > 0 && (
          <>
            <div className="flex justify-between items-center text-xs text-slate-500 mb-1">
              <span>Monto Asignado</span>
              <span>{formatCLP(rendicion.montoAsignado)}</span>
            </div>
            <Progress
              value={pctUsado}
              className={`h-2 ${excedeMonto ? '[&>div]:bg-red-500' : pctUsado > 80 ? '[&>div]:bg-amber-500' : '[&>div]:bg-green-500'}`}
            />
            <div className="text-xs mt-1 text-right">{Math.round(pctUsado)}% utilizado</div>
          </>
        )}
      </div>

      {/* Boletas */}
      <div>
        <h4 className="text-sm font-semibold mb-2">Detalle de Boletas ({rendicion.boletas.length})</h4>
        <table className="w-full text-sm border rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-[#0f2044] text-white">
              <th className="text-left py-2 px-3 font-medium">#</th>
              <th className="text-left py-2 px-3 font-medium">Descripción</th>
              <th className="text-left py-2 px-3 font-medium">Proveedor</th>
              <th className="text-left py-2 px-3 font-medium">N° Doc</th>
              <th className="text-left py-2 px-3 font-medium">Centro Costo</th>
              <th className="text-left py-2 px-3 font-medium">Categoría</th>
              <th className="text-right py-2 px-3 font-medium">Monto</th>
              <th className="text-center py-2 px-3 font-medium">Archivos</th>
            </tr>
          </thead>
          <tbody>
            {rendicion.boletas.map((b, i) => (
              <tr key={b.id || i} className="border-b last:border-b-0 hover:bg-slate-50">
                <td className="py-2 px-3">{i + 1}</td>
                <td className="py-2 px-3">{b.descripcion}</td>
                <td className="py-2 px-3 text-slate-500">{b.proveedor || '-'}</td>
                <td className="py-2 px-3 text-slate-500">{b.nDocumento || '-'}</td>
                <td className="py-2 px-3">{b.centroCosto?.nombre || '-'}</td>
                <td className="py-2 px-3">
                  {b.categoria ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.categoria.color }} />
                      {b.categoria.nombre}
                    </span>
                  ) : '-'}
                </td>
                <td className="py-2 px-3 text-right font-medium">{formatCLP(b.monto)}</td>
                <td className="py-2 px-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {b.comprobante && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-800"
                        onClick={() => window.open(b.comprobante!.startsWith('data:') ? b.comprobante! : `data:image/jpeg;base64,${b.comprobante}`, '_blank')}
                        title="Ver foto del comprobante"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {b.documento && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-0.5 text-green-600 hover:text-green-800"
                        onClick={() => {
                          const a = document.createElement('a')
                          a.href = b.documento!.startsWith('data:') ? b.documento! : `data:application/pdf;base64,${b.documento}`
                          a.download = `documento_boleta.pdf`
                          a.click()
                        }}
                        title="Descargar documento adjunto"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {!b.comprobante && !b.documento && <span className="text-slate-300">—</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-bold">
              <td colSpan={7} className="py-2 px-3 text-right">Total:</td>
              <td className="py-2 px-3 text-right">{formatCLP(rendicion.montoTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Observaciones / Motivo rechazo */}
      {rendicion.observaciones && (
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
          <div className="text-xs font-medium text-amber-700 mb-1">Observaciones</div>
          <div className="text-sm text-amber-800">{rendicion.observaciones}</div>
        </div>
      )}
      {rendicion.motivoRechazo && (
        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
          <div className="text-xs font-medium text-red-700 mb-1">Motivo de Rechazo</div>
          <div className="text-sm text-red-800">{rendicion.motivoRechazo}</div>
        </div>
      )}

      {/* Email info */}
      {rendicion.emailEnviado && (
        <div className="flex items-center gap-2 text-xs text-green-600 p-2 bg-green-50 rounded-lg">
          <CheckCircle className="w-4 h-4" />
          Email enviado a {rendicion.emailEnviadoA} el{' '}
          {rendicion.emailFechaEnvio ? new Date(rendicion.emailFechaEnvio).toLocaleString('es-CL') : ''}
        </div>
      )}
    </div>
  )
}
