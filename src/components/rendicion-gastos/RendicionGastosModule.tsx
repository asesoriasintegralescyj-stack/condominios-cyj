'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { apiFetch, apiPost } from '@/lib/api-client'
import { useSession } from '@/hooks/use-session'
import { formatCLP } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsContent, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Plus,
  Search,
  Trash2,
  Eye,
  Edit3,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileEdit,
  ChevronLeft,
  ChevronRight,
  Download,
  X,
  Image as ImageIcon,
  Camera,
  RotateCcw,
  Receipt,
  DollarSign,
  FileText,
  Clock,
  Filter,
} from 'lucide-react'

// ============================================================
// TYPES
// ============================================================
interface Categoria {
  id: string
  nombre: string
  icon: string
  activo: boolean
}

interface ItemRendicion {
  id?: string
  descripcion: string
  numeroBoleta: string
  montoRendir: number
  categoria: string
  fechaGasto: string
  fotoBoletaUrl?: string | null
  fotoCompraUrl?: string | null
}

interface CentroCosto {
  id: string
  codigo: string
  nombre: string
}

interface RendicionGasto {
  id: string
  numeroRendicion: string
  titulo: string
  descripcion?: string | null
  estado: string
  montoTotal: number
  userId: string
  centroCostoId?: string | null
  notaRevision?: string | null
  revisadoPor?: string | null
  revisadoAt?: string | null
  enviadoAt?: string | null
  createdAt: string
  updatedAt: string
  user: {
    id: string
    nombre: string
    apellido?: string | null
    email: string
  }
  centroCosto?: CentroCosto | null
  items: ItemRendicion[]
}

interface RendicionResponse {
  data: RendicionGasto[]
  pagination: {
    pagina: number
    porPagina: number
    total: number
    totalPaginas: number
  }
}

// ============================================================
// HELPERS
// ============================================================
const getEstadoColor = (estado: string) => {
  const map: Record<string, string> = {
    BORRADOR: 'bg-slate-100 text-slate-700',
    ENVIADO: 'bg-amber-100 text-amber-700',
    APROBADO: 'bg-green-100 text-green-700',
    RECHAZADO: 'bg-red-100 text-red-700',
    MODIFICACION: 'bg-orange-100 text-orange-700',
  }
  return map[estado] || 'bg-slate-100 text-slate-700'
}

const getEstadoLabel = (estado: string) => {
  const map: Record<string, string> = {
    BORRADOR: 'Borrador',
    ENVIADO: 'Enviado',
    APROBADO: 'Aprobado',
    RECHAZADO: 'Rechazado',
    MODIFICACION: 'Modificación',
  }
  return map[estado] || estado
}

const getEstadoIcon = (estado: string) => {
  switch (estado) {
    case 'BORRADOR': return <FileEdit className="w-3 h-3" />
    case 'ENVIADO': return <Clock className="w-3 h-3" />
    case 'APROBADO': return <CheckCircle2 className="w-3 h-3" />
    case 'RECHAZADO': return <XCircle className="w-3 h-3" />
    case 'MODIFICACION': return <AlertTriangle className="w-3 h-3" />
    default: return <FileText className="w-3 h-3" />
  }
}

const compressImage = (file: File, maxWidth = 1200, quality = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width
        let h = img.height
        if (w > maxWidth) {
          h = (maxWidth / w) * h
          w = maxWidth
        }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('No canvas context')); return }
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ============================================================
// EMPTY ITEM TEMPLATE
// ============================================================
const emptyItem = (): ItemRendicion => ({
  descripcion: '',
  numeroBoleta: '',
  montoRendir: 0,
  categoria: '',
  fechaGasto: new Date().toISOString().split('T')[0],
  fotoBoletaUrl: null,
  fotoCompraUrl: null,
})

// ============================================================
// MAIN MODULE COMPONENT
// ============================================================
export function RendicionGastosModule() {
  const { user, isAdmin, isSupervisor } = useSession()

  // Data
  const [rendiciones, setRendiciones] = useState<RendicionGasto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [centrosCosto, setCentrosCosto] = useState<CentroCosto[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ pagina: 1, porPagina: 15, total: 0, totalPaginas: 0 })

  // Filters
  const [filtroEstado, setFiltroEstado] = useState('TODOS')
  const [filtroCategoria, setFiltroCategoria] = useState('TODOS')
  const [busqueda, setBusqueda] = useState('')

  // Views
  const [vistaActual, setVistaActual] = useState<'lista' | 'crear' | 'detalle'>('lista')
  const [rendicionSeleccionada, setRendicionSeleccionada] = useState<RendicionGasto | null>(null)

  // Form
  const [formTitulo, setFormTitulo] = useState('')
  const [formDescripcion, setFormDescripcion] = useState('')
  const [formItems, setFormItems] = useState<ItemRendicion[]>([emptyItem()])
  const [formCentroCosto, setFormCentroCosto] = useState('')
  const [formSaving, setFormSaving] = useState(false)

  // Review
  const [notaRevision, setNotaRevision] = useState('')
  const [revisando, setRevisando] = useState(false)

  // Image viewer
  const [imagenViewer, setImagenViewer] = useState<string | null>(null)

  // Refs
  const boletaInputRefs = useRef<(HTMLInputElement | null)[]>([])
  const compraInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // ============================================================
  // FETCH DATA
  // ============================================================
  const fetchRendiciones = useCallback(async (page = 1) => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('pagina', String(page))
    params.set('porPagina', '15')
    if (filtroEstado !== 'TODOS') params.set('estado', filtroEstado)
    if (filtroCategoria !== 'TODOS') params.set('categoria', filtroCategoria)
    if (busqueda.trim()) params.set('busqueda', busqueda.trim())

    const result = await apiFetch<RendicionResponse>(
      `/api/rendicion-gastos?${params.toString()}`,
      { data: [], pagination: { pagina: 1, porPagina: 15, total: 0, totalPaginas: 0 } }
    )
    setRendiciones(result.data)
    setPagination(result.pagination)
    setLoading(false)
  }, [filtroEstado, filtroCategoria, busqueda])

  const fetchCategorias = async () => {
    const cats = await apiFetch<Categoria[]>('/api/rendicion-gastos/categorias', [])
    setCategorias(cats)
  }

  const fetchCentrosCosto = async () => {
    const ccs = await apiFetch<CentroCosto[]>('/api/centros-costo', [])
    setCentrosCosto(ccs)
  }

  useEffect(() => {
    fetchRendiciones(pagination.pagina)
  }, [fetchRendiciones, pagination.pagina])

  useEffect(() => {
    fetchCategorias()
    fetchCentrosCosto()
  }, [])

  // ============================================================
  // FORM HANDLERS
  // ============================================================
  const resetForm = () => {
    setFormTitulo('')
    setFormDescripcion('')
    setFormItems([emptyItem()])
    setFormCentroCosto('')
  }

  const handleCrear = () => {
    resetForm()
    setVistaActual('crear')
  }

  const handleVerDetalle = (rendicion: RendicionGasto) => {
    setRendicionSeleccionada(rendicion)
    setNotaRevision('')
    setVistaActual('detalle')
  }

  const handleEditar = (rendicion: RendicionGasto) => {
    setRendicionSeleccionada(rendicion)
    setFormTitulo(rendicion.titulo)
    setFormDescripcion(rendicion.descripcion || '')
    setFormItems(rendicion.items.length > 0 ? rendicion.items.map(i => ({ ...i })) : [emptyItem()])
    setFormCentroCosto(rendicion.centroCostoId || '')
    setVistaActual('crear')
  }

  const updateItem = (index: number, field: keyof ItemRendicion, value: any) => {
    setFormItems(prev => {
      const items = [...prev]
      items[index] = { ...items[index], [field]: value }
      return items
    })
  }

  const addItem = () => {
    setFormItems(prev => [...prev, emptyItem()])
  }

  const removeItem = (index: number) => {
    if (formItems.length <= 1) return
    setFormItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleImageUpload = async (
    index: number,
    field: 'fotoBoletaUrl' | 'fotoCompraUrl',
    file: File
  ) => {
    try {
      const base64 = await compressImage(file)
      updateItem(index, field, base64)
    } catch {
      toast.error('Error al procesar la imagen')
    }
  }

  const handleSaveDraft = async () => {
    if (!formTitulo.trim()) { toast.error('El título es obligatorio'); return }
    const validItems = formItems.filter(i => i.descripcion.trim() && i.montoRendir > 0)
    if (validItems.length === 0) { toast.error('Debe agregar al menos un gasto válido'); return }

    setFormSaving(true)
    const body = {
      titulo: formTitulo,
      descripcion: formDescripcion,
      estado: 'BORRADOR',
      centroCostoId: formCentroCosto || null,
      items: validItems,
    }

    if (rendicionSeleccionada) {
      // Editar existente
      const res = await apiPost(`/api/rendicion-gastos/${rendicionSeleccionada.id}`, body, { method: 'PUT' })
      if (res.ok) {
        toast.success('Borrador guardado')
        setRendicionSeleccionada(null)
        setVistaActual('lista')
        fetchRendiciones()
      } else {
        toast.error(res.error || 'Error al guardar')
      }
    } else {
      // Crear nuevo
      const res = await apiPost('/api/rendicion-gastos', body)
      if (res.ok) {
        toast.success('Rendición creada como borrador')
        resetForm()
        setVistaActual('lista')
        fetchRendiciones()
      } else {
        toast.error(res.error || 'Error al crear')
      }
    }
    setFormSaving(false)
  }

  const handleSubmit = async () => {
    if (!formTitulo.trim()) { toast.error('El título es obligatorio'); return }
    const validItems = formItems.filter(i => i.descripcion.trim() && i.montoRendir > 0)
    if (validItems.length === 0) { toast.error('Debe agregar al menos un gasto válido'); return }

    setFormSaving(true)
    const body = {
      titulo: formTitulo,
      descripcion: formDescripcion,
      estado: 'ENVIADO',
      centroCostoId: formCentroCosto || null,
      items: validItems,
    }

    if (rendicionSeleccionada) {
      const res = await apiPost(`/api/rendicion-gastos/${rendicionSeleccionada.id}`, { ...body, enviar: true }, { method: 'PUT' })
      if (res.ok) {
        toast.success('Rendición enviada para revisión')
        setRendicionSeleccionada(null)
        setVistaActual('lista')
        fetchRendiciones()
      } else {
        toast.error(res.error || 'Error al enviar')
      }
    } else {
      const res = await apiPost('/api/rendicion-gastos', body)
      if (res.ok) {
        toast.success('Rendición enviada para revisión')
        resetForm()
        setVistaActual('lista')
        fetchRendiciones()
      } else {
        toast.error(res.error || 'Error al enviar')
      }
    }
    setFormSaving(false)
  }

  // ============================================================
  // REVIEW HANDLERS (admin/supervisor)
  // ============================================================
  const handleRevisar = async (accion: 'APROBADO' | 'RECHAZADO' | 'MODIFICACION') => {
    if (!rendicionSeleccionada) return
    if ((accion === 'RECHAZADO' || accion === 'MODIFICACION') && !notaRevision.trim()) {
      toast.error('Debe incluir una nota de revisión')
      return
    }

    setRevisando(true)
    const res = await apiPost(`/api/rendicion-gastos/${rendicionSeleccionada.id}`, {
      estado: accion,
      notaRevision: notaRevision.trim(),
    }, { method: 'PUT' })

    if (res.ok) {
      const label = accion === 'APROBADO' ? 'aprobada' : accion === 'RECHAZADO' ? 'rechazada' : 'modificación solicitada'
      toast.success(`Rendición ${label}`)
      setRendicionSeleccionada(null)
      setVistaActual('lista')
      fetchRendiciones()
    } else {
      toast.error(res.error || 'Error al revisar')
    }
    setRevisando(false)
  }

  const handleEliminar = async (rendicion: RendicionGasto) => {
    if (!confirm(`¿Eliminar la rendición ${rendicion.numeroRendicion}?`)) return
    const res = await apiPost(`/api/rendicion-gastos/${rendicion.id}`, {}, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Rendición eliminada')
      fetchRendiciones()
    } else {
      toast.error(res.error || 'Error al eliminar')
    }
  }

  const handleVolver = () => {
    setRendicionSeleccionada(null)
    setVistaActual('lista')
  }

  const handleDescargarPDF = async (rendicion: RendicionGasto) => {
    try {
      const res = await fetch(`/api/rendicion-gastos/${rendicion.id}/pdf`)
      if (!res.ok) throw new Error('Error al generar PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${rendicion.numeroRendicion}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('PDF descargado')
    } catch {
      toast.error('Error al descargar PDF')
    }
  }

  // ============================================================
  // KPIs
  // ============================================================
  const totalRendiciones = pagination.total
  const pendientes = rendiciones.filter(r => r.estado === 'ENVIADO').length
  const montoTotalPendiente = rendiciones.filter(r => r.estado === 'ENVIADO').reduce((s, r) => s + r.montoTotal, 0)
  const aprobadas = rendiciones.filter(r => r.estado === 'APROBADO').length

  // ============================================================
  // CALCULATE FORM TOTAL
  // ============================================================
  const formTotal = formItems.reduce((sum, item) => sum + (item.montoRendir || 0), 0)

  // ============================================================
  // RENDER: LIST VIEW
  // ============================================================
  const renderLista = () => (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
                <Receipt className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Total Rendiciones</p>
                <p className="text-lg font-bold text-[#0f2044]">{totalRendiciones}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Pendientes</p>
                <p className="text-lg font-bold text-[#0f2044]">{pendientes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-green-600">
                <DollarSign className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Monto Pendiente</p>
                <p className="text-sm font-bold text-[#0f2044]">{formatCLP(montoTotalPendiente)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Aprobadas</p>
                <p className="text-lg font-bold text-[#0f2044]">{aprobadas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-sm">
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por título o número..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={filtroEstado} onValueChange={v => { setFiltroEstado(v); setPagination(p => ({ ...p, pagina: 1 })) }}>
              <SelectTrigger className="w-full sm:w-40 h-9">
                <Filter className="w-3 h-3 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos los estados</SelectItem>
                <SelectItem value="BORRADOR">Borrador</SelectItem>
                <SelectItem value="ENVIADO">Enviado</SelectItem>
                <SelectItem value="APROBADO">Aprobado</SelectItem>
                <SelectItem value="RECHAZADO">Rechazado</SelectItem>
                <SelectItem value="MODIFICACION">Modificación</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filtroCategoria} onValueChange={v => { setFiltroCategoria(v); setPagination(p => ({ ...p, pagina: 1 })) }}>
              <SelectTrigger className="w-full sm:w-40 h-9">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todas</SelectItem>
                {categorias.map(c => (
                  <SelectItem key={c.id} value={c.nombre}>{c.icon} {c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleCrear} size="sm" className="h-9 bg-[#0f2044] hover:bg-[#0a1628]">
              <Plus className="w-4 h-4 mr-1" /> Nueva
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">
          <Receipt className="w-8 h-8 mx-auto mb-2 animate-pulse" />
          <p className="text-sm">Cargando rendiciones...</p>
        </div>
      ) : rendiciones.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="p-12 text-center">
            <Receipt className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm text-slate-500 mb-1">No hay rendiciones</p>
            <p className="text-xs text-slate-400">Crea tu primera rendición de gastos</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rendiciones.map(rendicion => (
            <Card key={rendicion.id} className="shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleVerDetalle(rendicion)}>
              <CardContent className="p-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Badge variant="outline" className="bg-slate-100 text-slate-600 font-mono text-xs shrink-0">
                      {rendicion.numeroRendicion}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0f2044] truncate">{rendicion.titulo}</p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        {(isAdmin() || isSupervisor()) && (
                          <span>{rendicion.user.nombre} {rendicion.user.apellido || ''}</span>
                        )}
                        <span>{new Date(rendicion.createdAt).toLocaleDateString('es-CL')}</span>
                        <span>{rendicion.items.length} gasto{rendicion.items.length !== 1 ? 's' : ''}</span>
                        {rendicion.centroCosto && (
                          <span className="text-blue-500">{rendicion.centroCosto.codigo}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={getEstadoColor(rendicion.estado)}>
                      <span className="flex items-center gap-1">
                        {getEstadoIcon(rendicion.estado)}
                        {getEstadoLabel(rendicion.estado)}
                      </span>
                    </Badge>
                    <span className="text-sm font-bold text-[#0f2044]">{formatCLP(rendicion.montoTotal)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {pagination.totalPaginas > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.pagina <= 1}
                onClick={() => setPagination(p => ({ ...p, pagina: p.pagina - 1 }))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs text-slate-500">
                Página {pagination.pagina} de {pagination.totalPaginas}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.pagina >= pagination.totalPaginas}
                onClick={() => setPagination(p => ({ ...p, pagina: p.pagina + 1 }))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )

  // ============================================================
  // RENDER: CREATE/EDIT VIEW
  // ============================================================
  const renderCrear = () => (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={handleVolver}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Volver
        </Button>
        <h2 className="text-sm font-bold text-[#0f2044]">
          {rendicionSeleccionada ? `Editar ${rendicionSeleccionada.numeroRendicion}` : 'Nueva Rendición de Gastos'}
        </h2>
      </div>

      {/* Report Info */}
      <Card className="shadow-sm">
        <CardHeader className="p-3 pb-0">
          <CardTitle className="text-sm">Información de la Rendición</CardTitle>
        </CardHeader>
        <CardContent className="p-3 space-y-3">
          <div>
            <Label className="text-xs">Título *</Label>
            <Input
              value={formTitulo}
              onChange={e => setFormTitulo(e.target.value)}
              placeholder="Ej: Gastos mensuales de mantenimiento"
              className="h-9"
              maxLength={200}
            />
          </div>
          <div>
            <Label className="text-xs">Descripción (opcional)</Label>
            <Textarea
              value={formDescripcion}
              onChange={e => setFormDescripcion(e.target.value)}
              placeholder="Descripción general de los gastos..."
              rows={2}
            />
          </div>
          {centrosCosto.length > 0 && (
            <div>
              <Label className="text-xs">Centro de Costo (opcional)</Label>
              <Select value={formCentroCosto} onValueChange={v => setFormCentroCosto(v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Sin centro de costo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin centro de costo</SelectItem>
                  {centrosCosto.map(cc => (
                    <SelectItem key={cc.id} value={cc.id}>
                      {cc.codigo} - {cc.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expense Items */}
      <Card className="shadow-sm">
        <CardHeader className="p-3 pb-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Gastos ({formItems.length})</CardTitle>
            <Button variant="outline" size="sm" onClick={addItem}>
              <Plus className="w-3 h-3 mr-1" /> Agregar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 space-y-4">
          {formItems.map((item, index) => (
            <div key={index} className="border border-slate-200 rounded-lg p-3 space-y-3 relative">
              {/* Item header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Gasto #{index + 1}</span>
                {formItems.length > 1 && (
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-600" onClick={() => removeItem(index)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>

              {/* Row 1: Description + Receipt number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-slate-500">Descripción *</Label>
                  <Input
                    value={item.descripcion}
                    onChange={e => updateItem(index, 'descripcion', e.target.value)}
                    placeholder="Descripción del gasto"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-slate-500">N° Boleta *</Label>
                  <Input
                    value={item.numeroBoleta}
                    onChange={e => updateItem(index, 'numeroBoleta', e.target.value)}
                    placeholder="123456"
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              {/* Row 2: Amount + Category + Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <Label className="text-[10px] text-slate-500">Monto (CLP) *</Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                    <Input
                      type="number"
                      value={item.montoRendir || ''}
                      onChange={e => updateItem(index, 'montoRendir', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="h-8 text-sm pl-6"
                      min={0}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] text-slate-500">Categoría *</Label>
                  <Select value={item.categoria} onValueChange={v => updateItem(index, 'categoria', v)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map(c => (
                        <SelectItem key={c.id} value={c.nombre}>
                          {c.icon} {c.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] text-slate-500">Fecha *</Label>
                  <Input
                    type="date"
                    value={item.fechaGasto ? item.fechaGasto.split('T')[0] : ''}
                    onChange={e => updateItem(index, 'fechaGasto', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              {/* Row 3: Photos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-slate-500">Foto Boleta</Label>
                  <div className="flex items-center gap-2">
                    <input
                      ref={el => { boletaInputRefs.current[index] = el }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) handleImageUpload(index, 'fotoBoletaUrl', file)
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => boletaInputRefs.current[index]?.click()}
                    >
                      <ImageIcon className="w-3 h-3 mr-1" /> Subir
                    </Button>
                    {item.fotoBoletaUrl && (
                      <>
                        <img src={item.fotoBoletaUrl} alt="Boleta" className="w-8 h-8 rounded object-cover cursor-pointer" onClick={() => setImagenViewer(item.fotoBoletaUrl!)} />
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400" onClick={() => updateItem(index, 'fotoBoletaUrl', null)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] text-slate-500">Foto Compra</Label>
                  <div className="flex items-center gap-2">
                    <input
                      ref={el => { compraInputRefs.current[index] = el }}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) handleImageUpload(index, 'fotoCompraUrl', file)
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => compraInputRefs.current[index]?.click()}
                    >
                      <Camera className="w-3 h-3 mr-1" /> Cámara
                    </Button>
                    {item.fotoCompraUrl && (
                      <>
                        <img src={item.fotoCompraUrl} alt="Compra" className="w-8 h-8 rounded object-cover cursor-pointer" onClick={() => setImagenViewer(item.fotoCompraUrl!)} />
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400" onClick={() => updateItem(index, 'fotoCompraUrl', null)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Total */}
          <Separator />
          <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
            <span className="text-sm font-medium text-slate-600">Total Rendición</span>
            <span className="text-lg font-bold text-[#0f2044]">{formatCLP(formTotal)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2 justify-end">
        <Button variant="outline" onClick={handleVolver}>
          Cancelar
        </Button>
        <Button variant="outline" onClick={handleSaveDraft} disabled={formSaving}>
          <Save className="w-4 h-4 mr-1" /> {formSaving ? 'Guardando...' : 'Guardar Borrador'}
        </Button>
        <Button onClick={handleSubmit} disabled={formSaving} className="bg-[#0f2044] hover:bg-[#0a1628]">
          <Send className="w-4 h-4 mr-1" /> {formSaving ? 'Enviando...' : 'Enviar para Revisión'}
        </Button>
      </div>
    </div>
  )

  // ============================================================
  // RENDER: DETAIL VIEW
  // ============================================================
  const renderDetalle = () => {
    if (!rendicionSeleccionada) return null
    const r = rendicionSeleccionada
    const canReview = isAdmin() || isSupervisor()
    const isOwner = user?.id === r.userId
    const canEdit = isOwner && (r.estado === 'BORRADOR' || r.estado === 'RECHAZADO' || r.estado === 'MODIFICACION')
    const canDelete = isOwner && r.estado === 'BORRADOR'

    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleVolver}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Volver
          </Button>
          <h2 className="text-sm font-bold text-[#0f2044] flex-1 truncate">{r.numeroRendicion}</h2>
          <Badge className={getEstadoColor(r.estado)}>
            <span className="flex items-center gap-1">
              {getEstadoIcon(r.estado)}
              {getEstadoLabel(r.estado)}
            </span>
          </Badge>
        </div>

        {/* Report Info */}
        <Card className="shadow-sm">
          <CardContent className="p-3 space-y-2">
            <h3 className="text-base font-bold text-[#0f2044]">{r.titulo}</h3>
            {r.descripcion && (
              <p className="text-sm text-slate-600">{r.descripcion}</p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>Creado por: <strong className="text-slate-700">{r.user.nombre} {r.user.apellido || ''}</strong></span>
              <span>Fecha: {new Date(r.createdAt).toLocaleDateString('es-CL')}</span>
              <span>Gastos: {r.items.length}</span>
              {r.centroCosto && (
                <span>CC: <strong className="text-slate-700">{r.centroCosto.codigo} - {r.centroCosto.nombre}</strong></span>
              )}
            </div>
            {r.enviadoAt && (
              <p className="text-xs text-slate-400">Enviado: {new Date(r.enviadoAt).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            )}
            {r.revisadoAt && (
              <p className="text-xs text-slate-400">Revisado: {new Date(r.revisadoAt).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            )}
          </CardContent>
        </Card>

        {/* Items */}
        <Card className="shadow-sm">
          <CardHeader className="p-3 pb-0">
            <CardTitle className="text-sm">Detalle de Gastos</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 px-1 font-medium text-slate-500">#</th>
                    <th className="text-left py-2 px-1 font-medium text-slate-500">Descripción</th>
                    <th className="text-left py-2 px-1 font-medium text-slate-500">Boleta</th>
                    <th className="text-left py-2 px-1 font-medium text-slate-500">Categoría</th>
                    <th className="text-left py-2 px-1 font-medium text-slate-500">Fecha</th>
                    <th className="text-right py-2 px-1 font-medium text-slate-500">Monto</th>
                    <th className="text-center py-2 px-1 font-medium text-slate-500">Fotos</th>
                  </tr>
                </thead>
                <tbody>
                  {r.items.map((item, idx) => (
                    <tr key={item.id || idx} className="border-b border-slate-100 last:border-0">
                      <td className="py-2 px-1 text-slate-400">{idx + 1}</td>
                      <td className="py-2 px-1 text-slate-700">{item.descripcion}</td>
                      <td className="py-2 px-1 text-slate-500 font-mono">{item.numeroBoleta}</td>
                      <td className="py-2 px-1">
                        <span className="inline-flex items-center gap-0.5">
                          {categorias.find(c => c.nombre === item.categoria)?.icon || '📦'}
                          <span className="text-slate-600">{item.categoria}</span>
                        </span>
                      </td>
                      <td className="py-2 px-1 text-slate-500">{item.fechaGasto ? new Date(item.fechaGasto).toLocaleDateString('es-CL') : '-'}</td>
                      <td className="py-2 px-1 text-right font-medium text-[#0f2044]">{formatCLP(item.montoRendir)}</td>
                      <td className="py-2 px-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {item.fotoBoletaUrl && (
                            <img src={item.fotoBoletaUrl} alt="Boleta" className="w-7 h-7 rounded object-cover cursor-pointer border" onClick={() => setImagenViewer(item.fotoBoletaUrl!)} />
                          )}
                          {item.fotoCompraUrl && (
                            <img src={item.fotoCompraUrl} alt="Compra" className="w-7 h-7 rounded object-cover cursor-pointer border" onClick={() => setImagenViewer(item.fotoCompraUrl!)} />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-300">
                    <td colSpan={5} className="py-2 px-1 text-sm font-bold text-slate-700 text-right">Total</td>
                    <td className="py-2 px-1 text-sm font-bold text-[#0f2044] text-right">{formatCLP(r.montoTotal)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Review Note (if exists) */}
        {r.notaRevision && (
          <Card className="shadow-sm border-amber-300 bg-amber-50/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-medium text-amber-700">Nota de Revisión</span>
              </div>
              <p className="text-sm text-amber-800">{r.notaRevision}</p>
            </CardContent>
          </Card>
        )}

        {/* Admin Review Section */}
        {canReview && r.estado === 'ENVIADO' && (
          <Card className="shadow-sm">
            <CardHeader className="p-3 pb-0">
              <CardTitle className="text-sm">Revisión de Rendición</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              <Textarea
                value={notaRevision}
                onChange={e => setNotaRevision(e.target.value)}
                placeholder="Nota de revisión (obligatoria para rechazar o solicitar modificación)..."
                rows={3}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => handleRevisar('APROBADO')}
                  disabled={revisando}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Aprobar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleRevisar('MODIFICACION')}
                  disabled={revisando || !notaRevision.trim()}
                  className="border-orange-400 text-orange-600 hover:bg-orange-50"
                >
                  <AlertTriangle className="w-4 h-4 mr-1" /> Solicitar Modificación
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleRevisar('RECHAZADO')}
                  disabled={revisando || !notaRevision.trim()}
                >
                  <XCircle className="w-4 h-4 mr-1" /> Rechazar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => handleDescargarPDF(r)}
          >
            <Download className="w-4 h-4 mr-1" /> Descargar PDF
          </Button>
          {canEdit && (
            <Button variant="outline" onClick={() => handleEditar(r)}>
              <Edit3 className="w-4 h-4 mr-1" /> Editar
            </Button>
          )}
          {canDelete && (
            <Button variant="destructive" onClick={() => handleEliminar(r)}>
              <Trash2 className="w-4 h-4 mr-1" /> Eliminar
            </Button>
          )}
        </div>
      </div>
    )
  }

  // ============================================================
  // MAIN RENDER
  // ============================================================
  return (
    <div className="space-y-4">
      {vistaActual === 'lista' && renderLista()}
      {vistaActual === 'crear' && renderCrear()}
      {vistaActual === 'detalle' && renderDetalle()}

      {/* Image Viewer Dialog */}
      <Dialog open={!!imagenViewer} onOpenChange={() => setImagenViewer(null)}>
        <DialogContent className="max-w-2xl p-2">
          <DialogHeader>
            <DialogTitle className="text-sm">Imagen</DialogTitle>
          </DialogHeader>
          {imagenViewer && (
            <div className="relative">
              <img src={imagenViewer} alt="Foto" className="w-full rounded-lg" />
              <a
                href={imagenViewer}
                download="foto-rendicion.jpg"
                className="absolute bottom-2 right-2 bg-white/90 rounded-lg p-2 shadow-md hover:bg-white transition"
              >
                <Download className="w-4 h-4 text-[#0f2044]" />
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Need Save icon
function Save({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/>
      <path d="M17 21v-8a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v8"/>
      <path d="M7 3v4a1 1 0 0 0 1 1h7"/>
    </svg>
  )
}
