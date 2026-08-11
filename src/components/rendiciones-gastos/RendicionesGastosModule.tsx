'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch, apiPost } from '@/lib/api-client'
import { useSession } from '@/hooks/use-session'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ChevronsUpDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  CheckCircle,
  XCircle,
  Send,
  Eye,
  Image,
  Paperclip,
  Receipt,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

// ============================================
// Types
// ============================================
interface Boleta {
  id?: string
  descripcion: string
  monto: number
  fecha: string
  nDocumento: string
  proveedor: string
  notas: string
  comprobante: string | null
  documento: string | null
  centroCostoId: string
  categoriaId: string
  centroCosto?: { id: string; nombre: string; codigo: string }
  categoria?: { id: string; nombre: string; color: string }
}

interface Rendicion {
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
  aprobadoPor: string | null
  aprobadoPorNombre: string | null
  observaciones: string | null
  motivoRechazo: string | null
  responsableId: string | null
  responsableNombre: string | null
  emailEnviado: boolean
  responsable?: { id: string; nombre: string; cargo: string; email: string }
  boletas: Boleta[]
  createdAt: string
}

interface Categoria {
  id: string
  nombre: string
  descripcion: string | null
  color: string
  activa: boolean
}

interface PersonalItem {
  id: string
  nombre: string
  cargo: string | null
}

interface MontoAsignado {
  id: string
  personalId: string | null
  monto: number
  periodo: string
  estado: string
  notas: string | null
  personal?: { id: string; nombre: string; cargo: string } | null
}

interface CentroCosto {
  id: string
  nombre: string
  codigo: string
}

const emptyBoleta = (): Boleta => ({
  descripcion: '',
  monto: 0,
  fecha: '',
  nDocumento: '',
  proveedor: '',
  notas: '',
  comprobante: null,
  documento: null,
  centroCostoId: '',
  categoriaId: '',
})

const ESTADOS = ['Borrador', 'En Revisión', 'Aprobada', 'Rechazada']

const estadoBadge = (estado: string) => {
  switch (estado) {
    case 'Borrador':
      return <Badge variant="secondary">Borrador</Badge>
    case 'En Revisión':
      return (
        <Badge className="bg-amber-500 text-white hover:bg-amber-600">En Revisión</Badge>
      )
    case 'Aprobada':
      return (
        <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">Aprobada</Badge>
      )
    case 'Rechazada':
      return <Badge className="bg-red-600 text-white hover:bg-red-700">Rechazada</Badge>
    default:
      return <Badge variant="outline">{estado}</Badge>
  }
}

// ============================================
// Component
// ============================================
export function RendicionesGastosModule() {
  const { isAdmin, isSupervisor } = useSession()
  const canAdmin = isAdmin() || isSupervisor()

  // State
  const [loading, setLoading] = useState(true)
  const [rendiciones, setRendiciones] = useState<Rendicion[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [personal, setPersonal] = useState<PersonalItem[]>([])
  const [centrosCosto, setCentrosCosto] = useState<CentroCosto[]>([])
  const [montos, setMontos] = useState<MontoAsignado[]>([])
  const [filtroEstado, setFiltroEstado] = useState<string>('')
  const [search, setSearch] = useState('')

  // Dialogs
  const [showCreate, setShowCreate] = useState(false)
  const [editingRendicion, setEditingRendicion] = useState<Rendicion | null>(null)
  const [detailRendicion, setDetailRendicion] = useState<Rendicion | null>(null)
  const [actionDialog, setActionDialog] = useState<{ id: string; accion: string; rendicion: Rendicion } | null>(null)
  const [showMontoDialog, setShowMontoDialog] = useState(false)
  const [montoEdit, setMontoEdit] = useState<MontoAsignado | null>(null)
  const [montoPersonalId, setMontoPersonalId] = useState('')
  const [montoValor, setMontoValor] = useState('')
  const [accionObs, setAccionObs] = useState('')
  const [accionMotivo, setAccionMotivo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('rendiciones')

  // Form state
  const [formPeriodo, setFormPeriodo] = useState('')
  const [formConcepto, setFormConcepto] = useState('')
  const [formDescripcion, setFormDescripcion] = useState('')
  const [formResponsableId, setFormResponsableId] = useState('')
  const [formResponsableNombre, setFormResponsableNombre] = useState('')
  const [respOpen, setRespOpen] = useState(false)
  const [montoOpen, setMontoOpen] = useState(false)
  const [formObservaciones, setFormObservaciones] = useState('')
  const [formBoletas, setFormBoletas] = useState<Boleta[]>([emptyBoleta()])

  // Catálogo dialog
  const [showCatDialog, setShowCatDialog] = useState(false)
  const [catEdit, setCatEdit] = useState<Categoria | null>(null)
  const [catNombre, setCatNombre] = useState('')
  const [catDesc, setCatDesc] = useState('')
  const [catColor, setCatColor] = useState('#0f2044')

  const resetForm = useCallback(() => {
    setFormPeriodo('')
    setFormConcepto('')
    setFormDescripcion('')
    setFormResponsableId('')
    setFormResponsableNombre('')
    setRespOpen(false)
    setFormObservaciones('')
    setFormBoletas([emptyBoleta()])
  }, [])

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [rends, cats, pers, ccs, monts] = await Promise.all([
        apiFetch<Rendicion[]>(`/api/rendiciones-gastos${filtroEstado ? `?estado=${filtroEstado}` : ''}`, []),
        apiFetch<Categoria[]>('/api/rendiciones-gastos/categorias', []),
        apiFetch<PersonalItem[]>('/api/personal?estado=Activo', []),
        apiFetch<CentroCosto[]>('/api/centros-costo', []),
        apiFetch<MontoAsignado[]>('/api/rendiciones-gastos/montos-asignados', []),
      ])
      setRendiciones(rends)
      setCategorias(cats)
      setPersonal(pers)
      setCentrosCosto(ccs)
      setMontos(monts)
    } finally {
      setLoading(false)
    }
  }, [filtroEstado])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  // KPIs
  const totalRendiciones = rendiciones.length
  const enRevision = rendiciones.filter((r) => r.estado === 'En Revisión').length
  const aprobadas = rendiciones.filter((r) => r.estado === 'Aprobada').length
  const totalMonto = rendiciones.reduce((s, r) => s + r.montoTotal, 0)

  const filteredRendiciones = rendiciones.filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.codigo.toLowerCase().includes(q) ||
      r.concepto.toLowerCase().includes(q) ||
      (r.responsableNombre || '').toLowerCase().includes(q)
    )
  })

  // ============================================
  // Form handlers
  // ============================================
  const handleSaveRendicion = async () => {
    if (!formPeriodo.trim() || !formConcepto.trim()) {
      toast.error('Período y concepto son obligatorios')
      return
    }
    const validBoletas = formBoletas.filter((b) => b.descripcion.trim() && b.monto > 0)
    if (validBoletas.length === 0) {
      toast.error('Agregue al menos una boleta con descripción y monto')
      return
    }

    setSubmitting(true)
    const body = {
      periodo: formPeriodo,
      concepto: formConcepto,
      descripcion: formDescripcion,
      responsableId: formResponsableId || null,
      responsableNombre: formResponsableNombre || null,
      observaciones: formObservaciones,
      boletas: validBoletas,
    }

    if (editingRendicion) {
      const res = await apiPost<Rendicion>(`/api/rendiciones-gastos/${editingRendicion.id}`, body, { method: 'PUT' })
      if (res.ok) {
        toast.success('Rendición actualizada')
        setShowCreate(false)
        setEditingRendicion(null)
        resetForm()
        loadAll()
      } else {
        toast.error(res.error || 'Error al actualizar')
      }
    } else {
      const res = await apiPost<Rendicion>('/api/rendiciones-gastos', body)
      if (res.ok) {
        toast.success('Rendición creada')
        setShowCreate(false)
        resetForm()
        loadAll()
      } else {
        toast.error(res.error || 'Error al crear')
      }
    }
    setSubmitting(false)
  }

  const openEdit = async (r: Rendicion) => {
    // OPTIMIZACIÓN: Al editar, fetch el detalle completo (con base64) individual.
    // El listado excluye comprobante/documento para reducir payload.
    const res = await apiFetch<Rendicion>(`/api/rendiciones-gastos/${r.id}`)
    if (res && res.id) {
      setEditingRendicion(res)
      setFormPeriodo(res.periodo)
      setFormConcepto(res.concepto)
      setFormDescripcion(res.descripcion || '')
      setFormResponsableId(res.responsableId || '')
      setFormResponsableNombre(res.responsableNombre || '')
      setFormObservaciones(res.observaciones || '')
      setFormBoletas(res.boletas.length > 0 ? res.boletas.map((b) => ({ ...b })) : [emptyBoleta()])
    } else {
      toast.error('Error al cargar detalle de la rendición')
    }
    setShowCreate(true)
  }

  const openCreate = () => {
    setEditingRendicion(null)
    resetForm()
    setShowCreate(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta rendición?')) return
    const res = await apiPost(`/api/rendiciones-gastos/${id}`, {}, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Rendición eliminada')
      loadAll()
    } else {
      toast.error(res.error || 'Error al eliminar')
    }
  }

  const handleAccion = async () => {
    if (!actionDialog) return
    if (actionDialog.accion === 'rechazar' && !accionMotivo.trim()) {
      toast.error('El motivo de rechazo es obligatorio')
      return
    }
    setSubmitting(true)
    const res = await apiPost(`/api/rendiciones-gastos/${actionDialog.id}/aprobar`, {
      accion: actionDialog.accion,
      observaciones: accionObs,
      motivoRechazo: accionMotivo,
    })
    if (res.ok) {
      toast.success(`Rendición ${actionDialog.accion === 'aprobar' ? 'aprobada' : actionDialog.accion === 'rechazar' ? 'rechazada' : 'enviada a revisión'}`)
      setActionDialog(null)
      setAccionObs('')
      setAccionMotivo('')
      loadAll()
    } else {
      toast.error(res.error || 'Error al procesar')
    }
    setSubmitting(false)
  }

  // Boleta handlers
  const updateBoleta = (idx: number, field: string, value: any) => {
    setFormBoletas((prev) => prev.map((b, i) => (i === idx ? { ...b, [field]: value } : b)))
  }

  const addBoleta = () => setFormBoletas((prev) => [...prev, emptyBoleta()])
  const removeBoleta = (idx: number) => {
    if (formBoletas.length <= 1) return
    setFormBoletas((prev) => prev.filter((_, i) => i !== idx))
  }

  const fileUpload = (idx: number, field: 'comprobante' | 'documento', accept: string) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = (e: any) => {
      const file = e.target.files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = () => updateBoleta(idx, field, reader.result as string)
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }

  const formTotal = formBoletas.reduce((s, b) => s + (Number(b.monto) || 0), 0)

  // Monto asignado del responsable seleccionado
  const montoAsignadoSelected = montos.find((m) => m.personalId === formResponsableId)?.monto || 0
  const montoProgress = montoAsignadoSelected > 0 ? Math.min((formTotal / montoAsignadoSelected) * 100, 100) : 0

  // Categoría handlers
  const handleSaveCategoria = async () => {
    if (!catNombre.trim()) {
      toast.error('Nombre obligatorio')
      return
    }
    setSubmitting(true)
    if (catEdit) {
      const res = await apiPost('/api/rendiciones-gastos/categorias', { id: catEdit.id, nombre: catNombre, descripcion: catDesc, color: catColor }, { method: 'PUT' })
      if (res.ok) {
        toast.success('Categoría actualizada')
        setShowCatDialog(false)
        setCatEdit(null)
        loadAll()
      } else {
        toast.error(res.error || 'Error')
      }
    } else {
      const res = await apiPost('/api/rendiciones-gastos/categorias', { nombre: catNombre, descripcion: catDesc, color: catColor })
      if (res.ok) {
        toast.success('Categoría creada')
        setShowCatDialog(false)
        loadAll()
      } else {
        toast.error(res.error || 'Error')
      }
    }
    setSubmitting(false)
  }

  const handleDeleteCategoria = async (id: string) => {
    if (!confirm('¿Desactivar esta categoría?')) return
    const res = await apiPost(`/api/rendiciones-gastos/categorias?id=${id}`, {}, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Categoría desactivada')
      loadAll()
    } else {
      toast.error(res.error || 'Error')
    }
  }

  const handleSeedCategorias = async () => {
    const res = await apiPost('/api/rendiciones-gastos/seed-categorias', {})
    if (res.ok) {
      toast.success('Categorías por defecto creadas')
      loadAll()
    } else {
      toast.error(res.error || 'Error')
    }
  }

  // Monto asignado handlers
  const handleSaveMonto = async () => {
    if (!montoPersonalId || !montoValor || Number(montoValor) < 0) {
      toast.error('Complete todos los campos')
      return
    }
    setSubmitting(true)
    const res = await apiPost('/api/rendiciones-gastos/montos-asignados', {
      personalId: montoPersonalId,
      monto: Number(montoValor),
      periodo: 'Mensual',
    })
    if (res.ok) {
      toast.success('Monto asignado guardado')
      setShowMontoDialog(false)
      setMontoEdit(null)
      setMontoValor('')
      setMontoPersonalId('')
      loadAll()
    } else {
      toast.error(res.error || 'Error')
    }
    setSubmitting(false)
  }

  // ============================================
  // Preview modal
  // ============================================
  const [previewImg, setPreviewImg] = useState<{ url: string; title: string } | null>(null)

  // ============================================
  // Render
  // ============================================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#0f2044]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="rendiciones">
            <Receipt className="w-4 h-4 mr-1" />
            Rendiciones
          </TabsTrigger>
          {canAdmin && (
            <TabsTrigger value="categorias">Categorías</TabsTrigger>
          )}
          {canAdmin && (
            <TabsTrigger value="montos">Montos Asignados</TabsTrigger>
          )}
        </TabsList>

        {/* ============================================ */}
        {/* TAB: RENDICIONES */}
        {/* ============================================ */}
        <TabsContent value="rendiciones" className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-4">
              <div className="text-2xl font-bold text-[#0f2044]">{totalRendiciones}</div>
              <div className="text-xs text-muted-foreground">Total Rendiciones</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-amber-600">{enRevision}</div>
              <div className="text-xs text-muted-foreground">En Revisión</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-emerald-600">{aprobadas}</div>
              <div className="text-xs text-muted-foreground">Aprobadas</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-[#0f2044]">
                ${totalMonto.toLocaleString('es-CL')}
              </div>
              <div className="text-xs text-muted-foreground">Total Monto</div>
            </Card>
          </div>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por código, concepto o responsable..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filtroEstado} onValueChange={setFiltroEstado}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filtrar estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los estados</SelectItem>
                {ESTADOS.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={openCreate} className="bg-[#0f2044] hover:bg-[#1a3155]">
              <Plus className="w-4 h-4 mr-1" />
              Nueva Rendición
            </Button>
          </div>

          {/* Lista */}
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredRendiciones.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No hay rendiciones</p>
              </div>
            )}
            {filteredRendiciones.map((r) => (
              <Card key={r.id} className="overflow-hidden">
                <div
                  className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-muted-foreground">{r.codigo}</span>
                        {estadoBadge(r.estado)}
                      </div>
                      <h3 className="font-semibold text-sm mt-1 truncate">{r.concepto}</h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span>{r.periodo}</span>
                        {r.responsableNombre && <span>· {r.responsableNombre}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="font-bold text-sm">${r.montoTotal.toLocaleString('es-CL')}</div>
                        <div className="text-xs text-muted-foreground">{r.boletas.length} boleta(s)</div>
                      </div>
                      {expandedId === r.id ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded: boletas + actions */}
                {expandedId === r.id && (
                  <div className="border-t bg-slate-50/50">
                    <div className="p-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Descripción</TableHead>
                            <TableHead className="text-xs">Monto</TableHead>
                            <TableHead className="text-xs">Fecha</TableHead>
                            <TableHead className="text-xs">N° Doc.</TableHead>
                            <TableHead className="text-xs">Proveedor</TableHead>
                            <TableHead className="text-xs">C.Costo</TableHead>
                            <TableHead className="text-xs">Categoría</TableHead>
                            <TableHead className="text-xs">Adj.</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {r.boletas.map((b) => (
                            <TableRow key={b.id}>
                              <TableCell className="text-xs max-w-48 truncate">{b.descripcion}</TableCell>
                              <TableCell className="text-xs font-mono">${Number(b.monto).toLocaleString('es-CL')}</TableCell>
                              <TableCell className="text-xs">{b.fecha || '-'}</TableCell>
                              <TableCell className="text-xs">{b.nDocumento || '-'}</TableCell>
                              <TableCell className="text-xs">{b.proveedor || '-'}</TableCell>
                              <TableCell className="text-xs">{b.centroCosto?.nombre || '-'}</TableCell>
                              <TableCell className="text-xs">{b.categoria?.nombre || '-'}</TableCell>
                              <TableCell className="text-xs">
                                <div className="flex gap-1">
                                  {b.comprobante && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setPreviewImg({ url: b.comprobante!, title: `Comprobante - ${b.descripcion}` })
                                      }}
                                      className="p-1 hover:bg-slate-200 rounded"
                                      title="Ver comprobante"
                                    >
                                      <Image className="w-4 h-4 text-blue-600" />
                                    </button>
                                  )}
                                  {b.documento && (
                                    <a
                                      href={b.documento}
                                      download
                                      onClick={(e) => e.stopPropagation()}
                                      className="p-1 hover:bg-slate-200 rounded"
                                      title="Descargar documento"
                                    >
                                      <Paperclip className="w-4 h-4 text-slate-600" />
                                    </a>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {r.motivoRechazo && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                          <strong>Motivo de rechazo:</strong> {r.motivoRechazo}
                        </div>
                      )}
                      {r.emailEnviado && (
                        <div className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Email enviado a administracionlagunanorte@gmail.com
                        </div>
                      )}
                    </div>
                    <div className="px-4 pb-3 flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => setDetailRendicion(r)}>
                        <Eye className="w-3 h-3 mr-1" /> Ver Detalle
                      </Button>
                      {(r.estado === 'Borrador' || r.estado === 'En Revisión') && (
                        <Button variant="outline" size="sm" onClick={() => openEdit(r)}>
                          <Pencil className="w-3 h-3 mr-1" /> Editar
                        </Button>
                      )}
                      {canAdmin && r.estado === 'Borrador' && (
                        <Button variant="outline" size="sm" onClick={() => setActionDialog({ id: r.id, accion: 'enviar_revision', rendicion: r })}>
                          <Send className="w-3 h-3 mr-1" /> Enviar a Revisión
                        </Button>
                      )}
                      {canAdmin && (r.estado === 'Borrador' || r.estado === 'En Revisión') && (
                        <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-300 hover:bg-emerald-50" onClick={() => setActionDialog({ id: r.id, accion: 'aprobar', rendicion: r })}>
                          <CheckCircle className="w-3 h-3 mr-1" /> Aprobar
                        </Button>
                      )}
                      {canAdmin && r.estado !== 'Aprobada' && r.estado !== 'Rechazada' && (
                        <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => setActionDialog({ id: r.id, accion: 'rechazar', rendicion: r })}>
                          <XCircle className="w-3 h-3 mr-1" /> Rechazar
                        </Button>
                      )}
                      {canAdmin && r.estado === 'Borrador' && (
                        <Button variant="outline" size="sm" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => handleDelete(r.id)}>
                          <Trash2 className="w-3 h-3 mr-1" /> Eliminar
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ============================================ */}
        {/* TAB: CATEGORÍAS */}
        {/* ============================================ */}
        {canAdmin && (
          <TabsContent value="categorias" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Categorías de Gastos</h3>
              <div className="flex gap-2">
                {categorias.length === 0 && (
                  <Button variant="outline" size="sm" onClick={handleSeedCategorias}>
                    Crear Categorías por Defecto
                  </Button>
                )}
                <Button size="sm" className="bg-[#0f2044] hover:bg-[#1a3155]" onClick={() => {
                  setCatEdit(null)
                  setCatNombre('')
                  setCatDesc('')
                  setCatColor('#0f2044')
                  setShowCatDialog(true)
                }}>
                  <Plus className="w-4 h-4 mr-1" /> Nueva Categoría
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categorias.map((c) => (
                <Card key={c.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="font-semibold text-sm">{c.nombre}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => {
                        setCatEdit(c)
                        setCatNombre(c.nombre)
                        setCatDesc(c.descripcion || '')
                        setCatColor(c.color)
                        setShowCatDialog(true)
                      }}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600" onClick={() => handleDeleteCategoria(c.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  {c.descripcion && <p className="text-xs text-muted-foreground mt-1">{c.descripcion}</p>}
                </Card>
              ))}
              {categorias.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No hay categorías creadas</p>
                </div>
              )}
            </div>
          </TabsContent>
        )}

        {/* ============================================ */}
        {/* TAB: MONTOS ASIGNADOS */}
        {/* ============================================ */}
        {canAdmin && (
          <TabsContent value="montos" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Montos Asignados por Personal</h3>
              <Button size="sm" className="bg-[#0f2044] hover:bg-[#1a3155]" onClick={() => {
                setMontoEdit(null)
                setMontoPersonalId('')
                setMontoValor('')
                setShowMontoDialog(true)
              }}>
                <Plus className="w-4 h-4 mr-1" /> Asignar Monto
              </Button>
            </div>
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Personal</TableHead>
                    <TableHead className="text-xs">Cargo</TableHead>
                    <TableHead className="text-xs">Monto Asignado</TableHead>
                    <TableHead className="text-xs">Período</TableHead>
                    <TableHead className="text-xs">Estado</TableHead>
                    <TableHead className="text-xs">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {montos.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm">{m.personal?.nombre || 'Sin asignar'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{m.personal?.cargo || '-'}</TableCell>
                      <TableCell className="text-sm font-mono font-bold">${m.monto.toLocaleString('es-CL')}</TableCell>
                      <TableCell className="text-xs">{m.periodo}</TableCell>
                      <TableCell>
                        <Badge variant={m.estado === 'Activo' ? 'default' : 'secondary'} className="text-xs">
                          {m.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="h-7" onClick={() => {
                          setMontoEdit(m)
                          setMontoPersonalId(m.personalId || '')
                          setMontoValor(String(m.monto))
                          setShowMontoDialog(true)
                        }}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {montos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No hay montos asignados
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* ============================================ */}
      {/* DIALOG: Crear/Editar Rendición */}
      {/* ============================================ */}
      <Dialog open={showCreate} onOpenChange={(open) => {
        if (!open) { setShowCreate(false); setEditingRendicion(null); resetForm() }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRendicion ? 'Editar Rendición' : 'Nueva Rendición de Gastos'}</DialogTitle>
            <DialogDescription>Complete los datos y agregue las boletas</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Período *</Label>
                <Input
                  placeholder="Ej: Enero 2025"
                  value={formPeriodo}
                  onChange={(e) => setFormPeriodo(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Concepto *</Label>
                <Input
                  placeholder="Concepto general"
                  value={formConcepto}
                  onChange={(e) => setFormConcepto(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Descripción</Label>
              <Textarea
                placeholder="Descripción opcional"
                value={formDescripcion}
                onChange={(e) => setFormDescripcion(e.target.value)}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Responsable</Label>
                <Popover open={respOpen} onOpenChange={setRespOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={respOpen}
                      className="w-full justify-between text-sm h-9 font-normal"
                    >
                      {formResponsableId
                        ? (() => {
                            const p = personal.find((x) => x.id === formResponsableId)
                            return p ? `${p.nombre}${p.cargo ? ` (${p.cargo})` : ''}` : 'Seleccionar personal'
                          })()
                        : 'Seleccionar personal'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command shouldFilter={true}>
                      <CommandInput placeholder="Buscar personal..." className="h-9" />
                      <CommandList className="max-h-64">
                        <CommandEmpty>No se encontró personal.</CommandEmpty>
                        <CommandGroup>
                          {personal.map((p) => (
                            <CommandItem
                              key={p.id}
                              value={`${p.nombre} ${p.cargo || ''}`}
                              onSelect={() => {
                                setFormResponsableId(p.id)
                                setFormResponsableNombre(p.nombre)
                                setRespOpen(false)
                              }}
                              className="text-sm"
                            >
                              <Check className={cn("mr-2 h-4 w-4", formResponsableId === p.id ? "opacity-100" : "opacity-0")} />
                              {p.nombre} {p.cargo ? `(${p.cargo})` : ''}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Observaciones</Label>
                <Input
                  placeholder="Observaciones"
                  value={formObservaciones}
                  onChange={(e) => setFormObservaciones(e.target.value)}
                />
              </div>
            </div>

            {/* Monto asignado bar */}
            {formResponsableId && montoAsignadoSelected > 0 && (
              <div className="p-3 bg-slate-50 rounded-lg border space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Monto Asignado: <strong>${montoAsignadoSelected.toLocaleString('es-CL')}</strong></span>
                  <span>Total Boletas: <strong>${formTotal.toLocaleString('es-CL')}</strong></span>
                </div>
                <Progress value={montoProgress} className="h-2" />
                <div className="text-xs text-right text-muted-foreground">
                  {montoProgress.toFixed(0)}% utilizado
                </div>
              </div>
            )}

            {/* Boletas */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Boletas</Label>
                <Button variant="outline" size="sm" onClick={addBoleta}>
                  <Plus className="w-3 h-3 mr-1" /> Agregar Boleta
                </Button>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {formBoletas.map((boleta, idx) => (
                  <Card key={idx} className="p-3 relative">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-semibold text-muted-foreground">Boleta {idx + 1}</span>
                      {formBoletas.length > 1 && (
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" onClick={() => removeBoleta(idx)}>
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px]">Descripción *</Label>
                        <Input
                          placeholder="Descripción del gasto"
                          value={boleta.descripcion}
                          onChange={(e) => updateBoleta(idx, 'descripcion', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Monto *</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={boleta.monto || ''}
                          onChange={(e) => updateBoleta(idx, 'monto', Number(e.target.value) || 0)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Fecha</Label>
                        <Input
                          type="date"
                          value={boleta.fecha}
                          onChange={(e) => updateBoleta(idx, 'fecha', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">N° Documento</Label>
                        <Input
                          placeholder="N° documento"
                          value={boleta.nDocumento}
                          onChange={(e) => updateBoleta(idx, 'nDocumento', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Proveedor</Label>
                        <Input
                          placeholder="Proveedor"
                          value={boleta.proveedor}
                          onChange={(e) => updateBoleta(idx, 'proveedor', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Centro de Costo</Label>
                        <Select value={boleta.centroCostoId} onValueChange={(val) => updateBoleta(idx, 'centroCostoId', val)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {centrosCosto.map((cc) => (
                              <SelectItem key={cc.id} value={cc.id}>
                                {cc.codigo} - {cc.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Categoría</Label>
                        <Select value={boleta.categoriaId} onValueChange={(val) => updateBoleta(idx, 'categoriaId', val)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            {categorias.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                                  {c.nombre}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Notas</Label>
                        <Input
                          placeholder="Notas opcionales"
                          value={boleta.notas}
                          onChange={(e) => updateBoleta(idx, 'notas', e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                    {/* File uploads */}
                    <div className="flex gap-2 mt-2">
                      <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => fileUpload(idx, 'comprobante', 'image/*')}>
                        <Image className="w-3 h-3 mr-1" />
                        {boleta.comprobante ? 'Cambiar Comprobante' : 'Subir Comprobante'}
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => fileUpload(idx, 'documento', '*')}>
                        <Paperclip className="w-3 h-3 mr-1" />
                        {boleta.documento ? 'Cambiar Documento' : 'Adjuntar Documento'}
                      </Button>
                      {boleta.comprobante && (
                        <Button variant="ghost" size="sm" className="text-xs h-7 text-blue-600" onClick={() => setPreviewImg({ url: boleta.comprobante!, title: 'Comprobante' })}>
                          Ver imagen
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              <div className="p-3 bg-[#0f2044] text-white rounded-lg flex justify-between items-center">
                <span className="text-sm">Total Rendición</span>
                <span className="text-xl font-bold">${formTotal.toLocaleString('es-CL')}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditingRendicion(null); resetForm() }}>
              Cancelar
            </Button>
            <Button className="bg-[#0f2044] hover:bg-[#1a3155]" onClick={handleSaveRendicion} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {editingRendicion ? 'Guardar Cambios' : 'Crear Rendición'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* DIALOG: Detalle */}
      {/* ============================================ */}
      <Dialog open={!!detailRendicion} onOpenChange={() => setDetailRendicion(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {detailRendicion && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">{detailRendicion.codigo}</span>
                  {estadoBadge(detailRendicion.estado)}
                </DialogTitle>
                <DialogDescription>{detailRendicion.concepto}</DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div><span className="text-muted-foreground text-xs">Período</span><div className="font-semibold">{detailRendicion.periodo}</div></div>
                <div><span className="text-muted-foreground text-xs">Responsable</span><div className="font-semibold">{detailRendicion.responsableNombre || '-'}</div></div>
                <div><span className="text-muted-foreground text-xs">Monto Total</span><div className="font-bold text-[#0f2044]">${detailRendicion.montoTotal.toLocaleString('es-CL')}</div></div>
                <div><span className="text-muted-foreground text-xs">N° Boletas</span><div className="font-semibold">{detailRendicion.boletas.length}</div></div>
                {detailRendicion.fechaAprobacion && (
                  <div><span className="text-muted-foreground text-xs">Fecha Aprobación</span><div className="font-semibold">{new Date(detailRendicion.fechaAprobacion).toLocaleDateString('es-CL')}</div></div>
                )}
                {detailRendicion.aprobadoPorNombre && (
                  <div><span className="text-muted-foreground text-xs">Aprobado por</span><div className="font-semibold">{detailRendicion.aprobadoPorNombre}</div></div>
                )}
              </div>

              {detailRendicion.descripcion && (
                <div className="text-sm"><span className="text-muted-foreground text-xs">Descripción</span><p>{detailRendicion.descripcion}</p></div>
              )}
              {detailRendicion.observaciones && (
                <div className="text-sm"><span className="text-muted-foreground text-xs">Observaciones</span><p>{detailRendicion.observaciones}</p></div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">#</TableHead>
                    <TableHead className="text-xs">Descripción</TableHead>
                    <TableHead className="text-xs">Monto</TableHead>
                    <TableHead className="text-xs">Fecha</TableHead>
                    <TableHead className="text-xs">N° Doc.</TableHead>
                    <TableHead className="text-xs">Proveedor</TableHead>
                    <TableHead className="text-xs">C.Costo</TableHead>
                    <TableHead className="text-xs">Categoría</TableHead>
                    <TableHead className="text-xs">Adjuntos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailRendicion.boletas.map((b, idx) => (
                    <TableRow key={b.id || idx}>
                      <TableCell className="text-xs">{idx + 1}</TableCell>
                      <TableCell className="text-xs">{b.descripcion}</TableCell>
                      <TableCell className="text-xs font-mono">${Number(b.monto).toLocaleString('es-CL')}</TableCell>
                      <TableCell className="text-xs">{b.fecha || '-'}</TableCell>
                      <TableCell className="text-xs">{b.nDocumento || '-'}</TableCell>
                      <TableCell className="text-xs">{b.proveedor || '-'}</TableCell>
                      <TableCell className="text-xs">{b.centroCosto?.nombre || '-'}</TableCell>
                      <TableCell className="text-xs">{b.categoria?.nombre || '-'}</TableCell>
                      <TableCell className="text-xs">
                        <div className="flex gap-1">
                          {b.comprobante && (
                            <button className="p-1 hover:bg-slate-200 rounded" onClick={() => setPreviewImg({ url: b.comprobante!, title: `Comprobante - ${b.descripcion}` })}>
                              <Image className="w-4 h-4 text-blue-600" />
                            </button>
                          )}
                          {b.documento && (
                            <a href={b.documento} download className="p-1 hover:bg-slate-200 rounded">
                              <Paperclip className="w-4 h-4 text-slate-600" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="p-3 bg-[#0f2044] text-white rounded-lg flex justify-between items-center">
                <span className="text-sm">Total</span>
                <span className="text-xl font-bold">${detailRendicion.montoTotal.toLocaleString('es-CL')}</span>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* DIALOG: Acción (Aprobar/Rechazar/Enviar Revisión) */}
      {/* ============================================ */}
      <Dialog open={!!actionDialog} onOpenChange={() => { setActionDialog(null); setAccionObs(''); setAccionMotivo('') }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.accion === 'aprobar' && 'Aprobar Rendición'}
              {actionDialog?.accion === 'rechazar' && 'Rechazar Rendición'}
              {actionDialog?.accion === 'enviar_revision' && 'Enviar a Revisión'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog?.accion === 'aprobar' && 'Se enviará un email a administracionlagunanorte@gmail.com'}
              {actionDialog?.accion === 'rechazar' && 'Indique el motivo del rechazo'}
              {actionDialog?.accion === 'enviar_revision' && 'La rendición pasará a estado En Revisión'}
            </DialogDescription>
          </DialogHeader>

          {actionDialog && (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded text-sm">
                <div className="font-mono text-xs text-muted-foreground">{actionDialog.rendicion.codigo}</div>
                <div className="font-semibold">{actionDialog.rendicion.concepto}</div>
                <div className="text-muted-foreground text-xs">${actionDialog.rendicion.montoTotal.toLocaleString('es-CL')} · {actionDialog.rendicion.boletas.length} boleta(s)</div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Observaciones</Label>
                <Textarea
                  placeholder="Observaciones opcionales"
                  value={accionObs}
                  onChange={(e) => setAccionObs(e.target.value)}
                  rows={3}
                />
              </div>

              {actionDialog.accion === 'rechazar' && (
                <div className="space-y-1">
                  <Label className="text-xs text-red-600 font-semibold">Motivo de Rechazo *</Label>
                  <Textarea
                    placeholder="Indique el motivo del rechazo"
                    value={accionMotivo}
                    onChange={(e) => setAccionMotivo(e.target.value)}
                    rows={3}
                    className="border-red-300 focus:ring-red-300"
                  />
                </div>
              )}

              {actionDialog.accion === 'aprobar' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <strong>Información:</strong> Al aprobar, se enviará un email de notificación a <strong>administracionlagunanorte@gmail.com</strong> con el detalle de esta rendición.
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionDialog(null); setAccionObs(''); setAccionMotivo('') }}>
              Cancelar
            </Button>
            <Button
              className={actionDialog?.accion === 'aprobar' ? 'bg-emerald-600 hover:bg-emerald-700' : actionDialog?.accion === 'rechazar' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600 text-white'}
              onClick={handleAccion}
              disabled={submitting}
            >
              {submitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {actionDialog?.accion === 'aprobar' && 'Confirmar Aprobación'}
              {actionDialog?.accion === 'rechazar' && 'Confirmar Rechazo'}
              {actionDialog?.accion === 'enviar_revision' && 'Enviar a Revisión'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* DIALOG: Categoría */}
      {/* ============================================ */}
      <Dialog open={showCatDialog} onOpenChange={() => setShowCatDialog(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{catEdit ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Nombre *</Label>
              <Input value={catNombre} onChange={(e) => setCatNombre(e.target.value)} placeholder="Nombre de la categoría" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descripción</Label>
              <Input value={catDesc} onChange={(e) => setCatDesc(e.target.value)} placeholder="Descripción opcional" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Color</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={catColor} onChange={(e) => setCatColor(e.target.value)} className="w-10 h-8 rounded cursor-pointer border" />
                <Input value={catColor} onChange={(e) => setCatColor(e.target.value)} className="flex-1 font-mono text-xs" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCatDialog(false)}>Cancelar</Button>
            <Button className="bg-[#0f2044] hover:bg-[#1a3155]" onClick={handleSaveCategoria} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {catEdit ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* DIALOG: Monto Asignado */}
      {/* ============================================ */}
      <Dialog open={showMontoDialog} onOpenChange={() => setShowMontoDialog(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{montoEdit ? 'Editar Monto Asignado' : 'Asignar Monto'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Personal *</Label>
              <Popover open={montoOpen} onOpenChange={setMontoOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={montoOpen}
                    className="w-full justify-between text-sm h-9 font-normal"
                  >
                    {montoPersonalId
                      ? (() => {
                          const p = personal.find((x) => x.id === montoPersonalId)
                          return p ? `${p.nombre}${p.cargo ? ` (${p.cargo})` : ''}` : 'Seleccionar personal'
                        })()
                      : 'Seleccionar personal'}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command shouldFilter={true}>
                    <CommandInput placeholder="Buscar personal..." className="h-9" />
                    <CommandList className="max-h-64">
                      <CommandEmpty>No se encontró personal.</CommandEmpty>
                      <CommandGroup>
                        {personal.map((p) => (
                          <CommandItem
                            key={p.id}
                            value={`${p.nombre} ${p.cargo || ''}`}
                            onSelect={() => {
                              setMontoPersonalId(p.id)
                              setMontoOpen(false)
                            }}
                            className="text-sm"
                          >
                            <Check className={cn("mr-2 h-4 w-4", montoPersonalId === p.id ? "opacity-100" : "opacity-0")} />
                            {p.nombre} {p.cargo ? `(${p.cargo})` : ''}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Monto Mensual *</Label>
              <Input
                type="number"
                placeholder="0"
                value={montoValor}
                onChange={(e) => setMontoValor(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMontoDialog(false)}>Cancelar</Button>
            <Button className="bg-[#0f2044] hover:bg-[#1a3155]" onClick={handleSaveMonto} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              {montoEdit ? 'Guardar' : 'Asignar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* DIALOG: Preview Imagen */}
      {/* ============================================ */}
      <Dialog open={!!previewImg} onOpenChange={() => setPreviewImg(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-sm">{previewImg?.title}</DialogTitle>
          </DialogHeader>
          {previewImg && (
            <div className="flex justify-center">
              <img src={previewImg.url} alt={previewImg.title} className="max-w-full max-h-[70vh] object-contain rounded" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
