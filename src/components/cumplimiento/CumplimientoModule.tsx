'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  Plus, Pencil, Trash2, Search, FileText, Shield, AlertTriangle,
  CheckCircle, Clock, Upload, Download, Eye, Building2,
  FileCheck, FileWarning, FileX, Info, Calendar
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

// ============================================
// INTERFACES
// ============================================
interface CategoriaCumplimiento {
  id: string
  nombre: string
  codigo: string | null
  descripcion: string | null
  tipo: string
  obligatorio: boolean
  articuloLey: string | null
  fechaLimiteDias: number | null
  orden: number
  documentos?: DocumentoCumplimiento[]
  _count?: { documentos: number }
}

interface DocumentoCumplimiento {
  id: string
  titulo: string
  descripcion: string | null
  archivoNombre: string | null
  archivoTipo: string | null
  archivoBase64: string | null
  archivoUrl: string | null
  fechaDocumento: string | null
  fechaVencimiento: string | null
  estado: string
  cumple: boolean
  porcentajeCumplimiento: number
  verificadoPor: string | null
  observaciones: string | null
  categoria: CategoriaCumplimiento | null
  categoriaId: string | null
  createdAt: string
}

interface ResumenCumplimiento {
  totalRequisitos: number
  requisitosCumplidos: number
  requisitosPendientes: number
  requisitosVencidos: number
  porcentajeGeneral: number
  porcentajeLegal: number
  porcentajeReglamentario: number
  porcentajeInterno: number
  porcentajeSeguridad: number
  alertasActivas: number
}

// ============================================
// CONSTANTS
// ============================================
const TIPOS_CATEGORIA = ['Legal', 'Reglamentario', 'Interno', 'Seguridad'] as const

const tipoColors: Record<string, string> = {
  'Legal': 'bg-rose-100 text-rose-700 border-rose-200',
  'Reglamentario': 'bg-blue-100 text-blue-700 border-blue-200',
  'Interno': 'bg-slate-100 text-slate-700 border-slate-200',
  'Seguridad': 'bg-amber-100 text-amber-700 border-amber-200',
}

const tipoIcons: Record<string, React.ReactNode> = {
  'Legal': <Building2 className="w-3 h-3" />,
  'Reglamentario': <FileText className="w-3 h-3" />,
  'Interno': <FileCheck className="w-3 h-3" />,
  'Seguridad': <Shield className="w-3 h-3" />,
}

const estadoColors: Record<string, string> = {
  'Pendiente': 'bg-slate-100 text-slate-700',
  'Aprobado': 'bg-green-100 text-green-700',
  'Rechazado': 'bg-red-100 text-red-700',
  'Vencido': 'bg-amber-100 text-amber-700',
  'En Revisión': 'bg-blue-100 text-blue-700',
}

const estadoIcons: Record<string, React.ReactNode> = {
  'Pendiente': <Clock className="w-3 h-3" />,
  'Aprobado': <CheckCircle className="w-3 h-3" />,
  'Rechazado': <FileX className="w-3 h-3" />,
  'Vencido': <FileWarning className="w-3 h-3" />,
  'En Revisión': <Eye className="w-3 h-3" />,
}

// ============================================
// HELPER FUNCTIONS
// ============================================
const formatDate = (d: string | null) => {
  if (!d) return '–'
  try {
    const [y, m, dd] = d.split('-')
    return `${dd}/${m}/${y}`
  } catch {
    return d
  }
}

const getDaysUntilExpiry = (fechaVencimiento: string | null) => {
  if (!fechaVencimiento) return null
  const hoy = new Date()
  const vencimiento = new Date(fechaVencimiento)
  const diff = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

export function CumplimientoModule() {
  const { currentCondominio, setCurrentCondominio } = useAppStore()

  // Fallback hardcoded: el sistema es para UN SOLO CONDOMINIO (LAGUNA NORTE).
  // Si por alguna razón currentCondominio no está cargado (ej: refresh en módulo),
  // usar este ID garantizado para que el módulo siempre funcione.
  const CONDOMINIO_ID_FALLBACK = 'cmo9f3x7j0000ktyeb0rzhwt9'
  const CONDOMINIO_NOMBRE_FALLBACK = 'LAGUNA NORTE'

  const condominioId = currentCondominio?.id || CONDOMINIO_ID_FALLBACK
  const condominioNombre = currentCondominio?.nombre || CONDOMINIO_NOMBRE_FALLBACK

  // Auto-set si no está en store (para refresh directo al módulo)
  useEffect(() => {
    if (!currentCondominio?.id) {
      setCurrentCondominio({ id: CONDOMINIO_ID_FALLBACK, nombre: CONDOMINIO_NOMBRE_FALLBACK })
    }
  }, [currentCondominio?.id, setCurrentCondominio])
  
  // ============================================
  // STATE
  // ============================================
  const [categorias, setCategorias] = useState<CategoriaCumplimiento[]>([])
  const [documentos, setDocumentos] = useState<DocumentoCumplimiento[]>([])
  const [resumen, setResumen] = useState<ResumenCumplimiento | null>(null)
  const [documentosProximosVencer, setDocumentosProximosVencer] = useState<DocumentoCumplimiento[]>([])
  const [documentosVencidos, setDocumentosVencidos] = useState<DocumentoCumplimiento[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Filters
  const [search, setSearch] = useState('')
  const [filterTipo, setFilterTipo] = useState('todos')
  const [filterEstado, setFilterEstado] = useState('todos')
  const [filterCategoria, setFilterCategoria] = useState('todos')
  
  // Dialogs
  const [documentoDialogOpen, setDocumentoDialogOpen] = useState(false)
  const [categoriaDialogOpen, setCategoriaDialogOpen] = useState(false)
  const [viewFileDialogOpen, setViewFileDialogOpen] = useState(false)
  const [editingDocumento, setEditingDocumento] = useState<DocumentoCumplimiento | null>(null)
  const [editingCategoria, setEditingCategoria] = useState<CategoriaCumplimiento | null>(null)
  const [viewingDocumento, setViewingDocumento] = useState<DocumentoCumplimiento | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteType, setDeleteType] = useState<'documento' | 'categoria'>('documento')
  const [deleteId, setDeleteId] = useState<string>('')
  
  // Form data
  const [documentoForm, setDocumentoForm] = useState({
    titulo: '',
    descripcion: '',
    categoriaId: '',
    fechaDocumento: '',
    fechaVencimiento: '',
    estado: 'Pendiente',
    observaciones: '',
    archivoNombre: '',
    archivoTipo: '',
    archivoBase64: '',
  })
  
  const [categoriaForm, setCategoriaForm] = useState({
    nombre: '',
    codigo: '',
    descripcion: '',
    tipo: 'Legal',
    obligatorio: true,
    articuloLey: '',
    fechaLimiteDias: '',
    orden: 0,
  })

  // ============================================
  // FETCH FUNCTIONS
  // ============================================
  const fetchData = useCallback(async () => {
    if (!condominioId) {
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      // Fetch categories with createDefaults=true to populate initial categories
      const catRes = await fetch(`/api/cumplimiento/categorias?condominioId=${condominioId}&createDefaults=true`)
      if (!catRes.ok) {
        const err = await catRes.json().catch(() => ({}))
        throw new Error(err.error || `Error ${catRes.status} al cargar categorías`)
      }
      const catData = await catRes.json()
      // Asegurar que categorias sea siempre un array
      setCategorias(Array.isArray(catData) ? catData : [])
      
      // Fetch documents
      const params = new URLSearchParams()
      params.append('condominioId', condominioId)
      if (search) params.append('search', search)
      if (filterTipo !== 'todos') params.append('tipo', filterTipo)
      if (filterEstado !== 'todos') params.append('estado', filterEstado)
      if (filterCategoria !== 'todos') params.append('categoriaId', filterCategoria)
      
      const docRes = await fetch(`/api/cumplimiento?${params.toString()}`)
      if (!docRes.ok) {
        const err = await docRes.json().catch(() => ({}))
        throw new Error(err.error || `Error ${docRes.status} al cargar documentos`)
      }
      const docData = await docRes.json()
      setDocumentos(Array.isArray(docData?.documentos) ? docData.documentos : [])
      setResumen(docData?.resumen || null)
      
      // Fetch summary (opcional - no fallar si no carga)
      try {
        const resumenRes = await fetch(`/api/cumplimiento/resumen?condominioId=${condominioId}`)
        if (resumenRes.ok) {
          const resumenData = await resumenRes.json()
          setDocumentosProximosVencer(Array.isArray(resumenData?.documentosProximosVencer) ? resumenData.documentosProximosVencer : [])
          setDocumentosVencidos(Array.isArray(resumenData?.documentosVencidos) ? resumenData.documentosVencidos : [])
        }
      } catch (e) {
        console.warn('No se pudo cargar resumen:', e)
      }
    } catch (error) {
      console.error('Error fetching cumplimiento data:', error)
      toast.error('Error al cargar datos: ' + (error instanceof Error ? error.message : 'desconocido'))
      // Asegurar que los arrays estén vacíos en caso de error
      setCategorias([])
      setDocumentos([])
      setDocumentosProximosVencer([])
      setDocumentosVencidos([])
    } finally {
      setLoading(false)
    }
  }, [currentCondominio, search, filterTipo, filterEstado, filterCategoria])

  useEffect(() => {
    void (async () => {
      await fetchData()
    })()
  }, [fetchData])

  useEffect(() => {
    const timeout = setTimeout(() => fetchData(), 300)
    return () => clearTimeout(timeout)
  }, [fetchData])

  // ============================================
  // COMPUTED VALUES
  // ============================================
  const documentosByCategoria = useMemo(() => {
    const grouped: Record<string, DocumentoCumplimiento[]> = {}
    documentos.forEach(doc => {
      const catId = doc.categoriaId || 'sin-categoria'
      if (!grouped[catId]) grouped[catId] = []
      grouped[catId].push(doc)
    })
    return grouped
  }, [documentos])

  // ============================================
  // HANDLERS
  // ============================================
  const openDocumentoDialog = (documento?: DocumentoCumplimiento) => {
    if (documento) {
      setEditingDocumento(documento)
      setDocumentoForm({
        titulo: documento.titulo,
        descripcion: documento.descripcion || '',
        categoriaId: documento.categoriaId || '',
        fechaDocumento: documento.fechaDocumento || '',
        fechaVencimiento: documento.fechaVencimiento || '',
        estado: documento.estado,
        observaciones: documento.observaciones || '',
        archivoNombre: documento.archivoNombre || '',
        archivoTipo: documento.archivoTipo || '',
        archivoBase64: documento.archivoBase64 || '',
      })
    } else {
      setEditingDocumento(null)
      setDocumentoForm({
        titulo: '',
        descripcion: '',
        categoriaId: filterCategoria !== 'todos' ? filterCategoria : '',
        fechaDocumento: new Date().toISOString().split('T')[0],
        fechaVencimiento: '',
        estado: 'Pendiente',
        observaciones: '',
        archivoNombre: '',
        archivoTipo: '',
        archivoBase64: '',
      })
    }
    setDocumentoDialogOpen(true)
  }

  const openCategoriaDialog = (categoria?: CategoriaCumplimiento) => {
    if (categoria) {
      setEditingCategoria(categoria)
      setCategoriaForm({
        nombre: categoria.nombre,
        codigo: categoria.codigo || '',
        descripcion: categoria.descripcion || '',
        tipo: categoria.tipo,
        obligatorio: categoria.obligatorio,
        articuloLey: categoria.articuloLey || '',
        fechaLimiteDias: categoria.fechaLimiteDias?.toString() || '',
        orden: categoria.orden,
      })
    } else {
      setEditingCategoria(null)
      setCategoriaForm({
        nombre: '',
        codigo: '',
        descripcion: '',
        tipo: 'Legal',
        obligatorio: true,
        articuloLey: '',
        fechaLimiteDias: '',
        orden: 0,
      })
    }
    setCategoriaDialogOpen(true)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      setDocumentoForm({
        ...documentoForm,
        archivoNombre: file.name,
        archivoTipo: file.type,
        archivoBase64: base64,
      })
    }
    reader.readAsDataURL(file)
  }

  const handleSaveDocumento = async () => {
    if (!documentoForm.titulo.trim()) {
      toast.error('El título es obligatorio')
      return
    }
    if (!condominioId) {
      toast.error('No hay condominio seleccionado')
      return
    }
    
    setSaving(true)
    try {
      const data = {
        ...documentoForm,
        condominioId: condominioId,
      }
      
      let response
      if (editingDocumento) {
        response = await fetch(`/api/cumplimiento/${editingDocumento.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
      } else {
        response = await fetch('/api/cumplimiento', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
      }
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || `Error ${response.status} al guardar documento`)
      }
      
      toast.success(editingDocumento ? 'Documento actualizado' : 'Documento creado')
      setDocumentoDialogOpen(false)
      await fetchData()
    } catch (error) {
      console.error('Error saving documento:', error)
      toast.error('Error al guardar documento: ' + (error instanceof Error ? error.message : 'desconocido'))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveCategoria = async () => {
    if (!categoriaForm.nombre.trim()) {
      toast.error('El nombre de la categoría es obligatorio')
      return
    }
    if (!condominioId) {
      toast.error('No hay condominio seleccionado')
      return
    }
    
    setSaving(true)
    try {
      const data = {
        ...categoriaForm,
        obligatorio: categoriaForm.obligatorio,
        fechaLimiteDias: categoriaForm.fechaLimiteDias ? parseInt(categoriaForm.fechaLimiteDias) : null,
        condominioId: condominioId,
      }
      
      let response
      if (editingCategoria) {
        response = await fetch(`/api/cumplimiento/categorias`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, id: editingCategoria.id }),
        })
      } else {
        response = await fetch('/api/cumplimiento/categorias', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
      }
      
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || `Error ${response.status} al guardar categoría`)
      }
      
      toast.success(editingCategoria ? 'Categoría actualizada' : 'Categoría creada')
      setCategoriaDialogOpen(false)
      await fetchData()
    } catch (error) {
      console.error('Error saving categoria:', error)
      toast.error('Error al guardar categoría: ' + (error instanceof Error ? error.message : 'desconocido'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      let response
      if (deleteType === 'documento') {
        response = await fetch(`/api/cumplimiento?id=${deleteId}`, { method: 'DELETE' })
      } else {
        response = await fetch(`/api/cumplimiento/categorias?id=${deleteId}`, { method: 'DELETE' })
      }
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || `Error ${response.status} al eliminar`)
      }
      toast.success(deleteType === 'documento' ? 'Documento eliminado' : 'Categoría eliminada')
      await fetchData()
    } catch (error) {
      console.error('Error deleting:', error)
      toast.error('Error al eliminar: ' + (error instanceof Error ? error.message : 'desconocido'))
    } finally {
      setSaving(false)
      setDeleteDialogOpen(false)
    }
  }

  const openDeleteDialog = (type: 'documento' | 'categoria', id: string) => {
    setDeleteType(type)
    setDeleteId(id)
    setDeleteDialogOpen(true)
  }

  const viewDocument = (doc: DocumentoCumplimiento) => {
    setViewingDocumento(doc)
    setViewFileDialogOpen(true)
  }

  const downloadDocument = (doc: DocumentoCumplimiento) => {
    if (!doc.archivoBase64) return
    
    const link = document.createElement('a')
    link.href = doc.archivoBase64
    link.download = doc.archivoNombre || 'documento'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // ============================================
  // RENDER
  // ============================================

  // Mostrar mensaje si no hay condominio seleccionado
  if (!condominioId && !loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Building2 className="w-16 h-16 mx-auto text-slate-400 mb-4" />
            <h2 className="text-xl font-bold text-slate-700 mb-2">No hay condominio seleccionado</h2>
            <p className="text-slate-500 text-sm">
              Cargando condominio {condominioNombre}...
            </p>
            <Button className="mt-4" onClick={() => fetchData()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Mostrar loading inicial
  if (loading && categorias.length === 0 && documentos.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-[#0A1172] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Cargando datos de cumplimiento...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="bg-gradient-to-br from-[#0f2044] to-[#0a1628] text-white">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 opacity-80" />
              <div>
                <p className="text-xs opacity-80">Cumplimiento</p>
                <p className="text-xl font-bold">{resumen?.porcentajeGeneral || 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 opacity-80" />
              <div>
                <p className="text-xs opacity-80">Total Requisitos</p>
                <p className="text-xl font-bold">{resumen?.totalRequisitos || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 opacity-80" />
              <div>
                <p className="text-xs opacity-80">Cumplidos</p>
                <p className="text-xl font-bold">{resumen?.requisitosCumplidos || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-slate-500 to-slate-600 text-white">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 opacity-80" />
              <div>
                <p className="text-xs opacity-80">Pendientes</p>
                <p className="text-xl font-bold">{resumen?.requisitosPendientes || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <FileWarning className="w-5 h-5 opacity-80" />
              <div>
                <p className="text-xs opacity-80">Vencidos</p>
                <p className="text-xl font-bold">{resumen?.requisitosVencidos || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 opacity-80" />
              <div>
                <p className="text-xs opacity-80">Alertas</p>
                <p className="text-xl font-bold">{resumen?.alertasActivas || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress by Type */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Cumplimiento por Tipo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {TIPOS_CATEGORIA.map(tipo => {
              const porcentaje = resumen ? resumen[`porcentaje${tipo}` as keyof ResumenCumplimiento] as number : 0
              return (
                <div key={tipo} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1">
                      {tipoIcons[tipo]}
                      {tipo}
                    </span>
                    <span className="font-bold">{porcentaje}%</span>
                  </div>
                  <Progress value={porcentaje} className="h-2" />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Alertas */}
      {(documentosVencidos.length > 0 || documentosProximosVencer.length > 0) && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-4 h-4" />
              Documentos que Requieren Atención
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {documentosVencidos.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-200">
                <div className="flex items-center gap-2 min-w-0">
                  <FileX className="w-4 h-4 text-red-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" title={doc.titulo}>{doc.titulo}</p>
                    <p className="text-xs text-red-600">Vencido el {formatDate(doc.fechaVencimiento)}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => openDocumentoDialog(doc)} className="shrink-0">
                  Actualizar
                </Button>
              </div>
            ))}
            {documentosProximosVencer.map(doc => {
              const dias = getDaysUntilExpiry(doc.fechaVencimiento)
              return (
                <div key={doc.id} className="flex items-center justify-between p-2 bg-amber-50 rounded border border-amber-200">
                  <div className="flex items-center gap-2 min-w-0">
                    <Calendar className="w-4 h-4 text-amber-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" title={doc.titulo}>{doc.titulo}</p>
                      <p className="text-xs text-amber-600">Vence en {dias} días ({formatDate(doc.fechaVencimiento)})</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openDocumentoDialog(doc)} className="shrink-0">
                    Ver
                  </Button>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="documentos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="documentos" className="flex items-center gap-1">
            <FileText className="w-4 h-4" />
            Documentos
          </TabsTrigger>
          <TabsTrigger value="categorias" className="flex items-center gap-1">
            <Building2 className="w-4 h-4" />
            Categorías
          </TabsTrigger>
        </TabsList>

        {/* Documentos Tab */}
        <TabsContent value="documentos" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar documento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {TIPOS_CATEGORIA.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Pendiente">Pendiente</SelectItem>
                <SelectItem value="Aprobado">Aprobado</SelectItem>
                <SelectItem value="En Revisión">En Revisión</SelectItem>
                <SelectItem value="Vencido">Vencido</SelectItem>
                <SelectItem value="Rechazado">Rechazado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategoria} onValueChange={setFilterCategoria}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                {categorias.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => openDocumentoDialog()}>
              <Plus className="w-4 h-4 mr-1" /> Nuevo Documento
            </Button>
          </div>

          {/* Documentos List by Category */}
          {loading ? (
            <Card><CardContent className="p-8 text-center text-slate-400">Cargando...</CardContent></Card>
          ) : documentos.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-slate-400">No hay documentos de cumplimiento. Haz clic en "Nuevo Documento" para agregar uno.</CardContent></Card>
          ) : (
            <div className="space-y-4">
              {categorias.map(categoria => {
                const docsCategoria = documentosByCategoria[categoria.id] || []
                if (filterCategoria !== 'todos' && filterCategoria !== categoria.id) return null
                if (docsCategoria.length === 0 && filterTipo === 'todos' && filterEstado === 'todos' && !search) {
                  return (
                    <Card key={categoria.id} className="border-dashed">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`p-2 rounded-lg shrink-0 ${tipoColors[categoria.tipo]}`}>
                              {tipoIcons[categoria.tipo]}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate" title={categoria.nombre}>{categoria.nombre}</p>
                              <p className="text-xs text-slate-500 truncate">
                                {categoria.articuloLey || categoria.descripcion || 'Sin descripción'}
                              </p>
                            </div>
                            {categoria.obligatorio && (
                              <Badge variant="outline" className="text-xs shrink-0">Obligatorio</Badge>
                            )}
                          </div>
                          <Button size="sm" variant="outline" onClick={() => openDocumentoDialog()} className="shrink-0">
                            <Plus className="w-3 h-3 mr-1" /> Agregar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                }
                if (docsCategoria.length === 0) return null
                
                const cumplidos = docsCategoria.filter(d => d.cumple).length
                const porcentaje = Math.round((cumplidos / docsCategoria.length) * 100)
                
                return (
                  <Card key={categoria.id}>
                    <CardHeader className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge className={`${tipoColors[categoria.tipo]} shrink-0`}>
                            {tipoIcons[categoria.tipo]}
                            {categoria.tipo}
                          </Badge>
                          <CardTitle className="text-sm truncate" title={categoria.nombre}>{categoria.nombre}</CardTitle>
                          {categoria.obligatorio && (
                            <Badge variant="outline" className="text-xs shrink-0">Obligatorio</Badge>
                          )}
                          {categoria.articuloLey && (
                            <span className="text-xs text-slate-500 truncate" title={categoria.articuloLey}>{categoria.articuloLey}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-medium whitespace-nowrap">{porcentaje}% cumplido</span>
                          <Progress value={porcentaje} className="w-20 h-2" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <p className="md:hidden text-xs text-slate-400 text-center py-1">← Desliza horizontalmente para ver más →</p>
                      <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50">
                            <tr className="border-b">
                              <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Documento</th>
                              <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Archivo</th>
                              <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Fechas</th>
                              <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Estado</th>
                              <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Cumple</th>
                              <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {docsCategoria.map(doc => {
                              const diasVencimiento = getDaysUntilExpiry(doc.fechaVencimiento)
                              const proximoAVencer = diasVencimiento !== null && diasVencimiento <= 30 && diasVencimiento > 0
                              const vencido = diasVencimiento !== null && diasVencimiento <= 0
                              
                              return (
                                <tr key={doc.id} className={`border-b last:border-0 hover:bg-slate-50 ${vencido ? 'bg-red-50' : proximoAVencer ? 'bg-amber-50' : ''}`}>
                                  <td className="p-3 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                                      <div className="min-w-0">
                                        <p className="font-medium truncate" title={doc.titulo}>{doc.titulo}</p>
                                        {doc.descripcion && (
                                          <p className="text-xs text-slate-500 truncate">{doc.descripcion.substring(0, 50)}...</p>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    {doc.archivoNombre ? (
                                      <div className="flex items-center gap-1 min-w-0">
                                        <FileCheck className="w-4 h-4 text-green-500 shrink-0" />
                                        <span className="text-xs truncate max-w-[150px]" title={doc.archivoNombre}>{doc.archivoNombre}</span>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-slate-400">Sin archivo</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-xs whitespace-nowrap">
                                    <div>Doc: {formatDate(doc.fechaDocumento)}</div>
                                    {doc.fechaVencimiento && (
                                      <div className={vencido ? 'text-red-600 font-medium' : proximoAVencer ? 'text-amber-600' : ''}>
                                        Vence: {formatDate(doc.fechaVencimiento)}
                                        {vencido && ' (Vencido)'}
                                        {proximoAVencer && ` (${diasVencimiento} días)`}
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-3">
                                    <Badge className={`${estadoColors[doc.estado]} flex items-center gap-1 w-fit`}>
                                      {estadoIcons[doc.estado]}
                                      {doc.estado}
                                    </Badge>
                                  </td>
                                  <td className="p-3">
                                    <div className="flex items-center gap-2 whitespace-nowrap">
                                      <Progress value={doc.porcentajeCumplimiento} className="w-12 h-2" />
                                      <span className="text-xs font-medium">{doc.porcentajeCumplimiento}%</span>
                                    </div>
                                  </td>
                                  <td className="p-3">
                                    <div className="flex justify-center gap-1">
                                      {doc.archivoBase64 && (
                                        <>
                                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => viewDocument(doc)}>
                                            <Eye className="w-3.5 h-3.5" />
                                          </Button>
                                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => downloadDocument(doc)}>
                                            <Download className="w-3.5 h-3.5" />
                                          </Button>
                                        </>
                                      )}
                                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openDocumentoDialog(doc)}>
                                        <Pencil className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="h-7 w-7 text-red-600 hover:text-red-700" 
                                        onClick={() => openDeleteDialog('documento', doc.id)}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Categorías Tab */}
        <TabsContent value="categorias" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Categorías basadas en la Ley 21.442 de Copropiedad Inmobiliaria de Chile
            </p>
            <Button onClick={() => openCategoriaDialog()}>
              <Plus className="w-4 h-4 mr-1" /> Nueva Categoría
            </Button>
          </div>

          <div className="grid gap-3">
            {categorias.map(cat => {
              const docsCount = documentosByCategoria[cat.id]?.length || 0
              const cumplidos = documentosByCategoria[cat.id]?.filter(d => d.cumple).length || 0
              const porcentaje = docsCount > 0 ? Math.round((cumplidos / docsCount) * 100) : 0
              
              return (
                <Card key={cat.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`p-2 rounded-lg shrink-0 ${tipoColors[cat.tipo]}`}>
                          {tipoIcons[cat.tipo]}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold truncate" title={cat.nombre}>{cat.nombre}</h3>
                            {cat.codigo && (
                              <Badge variant="outline" className="text-xs font-mono shrink-0">{cat.codigo}</Badge>
                            )}
                            {cat.obligatorio && (
                              <Badge className="bg-red-100 text-red-700 text-xs shrink-0">Obligatorio</Badge>
                            )}
                          </div>
                          <div className="text-sm text-slate-500 mt-1 break-words">
                            {cat.descripcion}
                          </div>
                          {cat.articuloLey && (
                            <div className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                              <Info className="w-3 h-3 shrink-0" />
                              <span className="truncate">{cat.articuloLey}</span>
                            </div>
                          )}
                          {cat.fechaLimiteDias && (
                            <div className="text-xs text-slate-400 mt-1">
                              Renovación cada {cat.fechaLimiteDias} días
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="text-xs text-slate-500 whitespace-nowrap">{docsCount} documentos</div>
                          <div className="flex items-center gap-2">
                            <Progress value={porcentaje} className="w-16 h-2" />
                            <span className="text-xs font-medium whitespace-nowrap">{porcentaje}%</span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openCategoriaDialog(cat)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 text-red-600 hover:text-red-700" 
                            onClick={() => openDeleteDialog('categoria', cat.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Documento Dialog */}
      <Dialog open={documentoDialogOpen} onOpenChange={setDocumentoDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDocumento ? 'Editar' : 'Nuevo'} Documento de Cumplimiento</DialogTitle>
            <DialogDescription>Complete los datos del documento y adjunte el archivo si corresponde.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2 min-w-0">
              <Label>Título *</Label>
              <Input
                className="w-full"
                value={documentoForm.titulo}
                onChange={(e) => setDocumentoForm({...documentoForm, titulo: e.target.value})}
                placeholder="Nombre del documento"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <Label>Categoría</Label>
                <Select value={documentoForm.categoriaId} onValueChange={(v) => setDocumentoForm({...documentoForm, categoriaId: v})}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                  <SelectContent>
                    {categorias.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 min-w-0">
                <Label>Estado</Label>
                <Select value={documentoForm.estado} onValueChange={(v) => setDocumentoForm({...documentoForm, estado: v})}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                    <SelectItem value="En Revisión">En Revisión</SelectItem>
                    <SelectItem value="Aprobado">Aprobado</SelectItem>
                    <SelectItem value="Rechazado">Rechazado</SelectItem>
                    <SelectItem value="Vencido">Vencido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <Label>Fecha del Documento</Label>
                <Input
                  className="w-full"
                  type="date"
                  value={documentoForm.fechaDocumento}
                  onChange={(e) => setDocumentoForm({...documentoForm, fechaDocumento: e.target.value})}
                />
              </div>
              <div className="space-y-2 min-w-0">
                <Label>Fecha de Vencimiento</Label>
                <Input
                  className="w-full"
                  type="date"
                  value={documentoForm.fechaVencimiento}
                  onChange={(e) => setDocumentoForm({...documentoForm, fechaVencimiento: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2 min-w-0">
              <Label>Descripción</Label>
              <Textarea
                className="w-full"
                value={documentoForm.descripcion}
                onChange={(e) => setDocumentoForm({...documentoForm, descripcion: e.target.value})}
                placeholder="Descripción del documento..."
                rows={2}
              />
            </div>

            <div className="space-y-2 min-w-0">
              <Label>Archivo Adjunto</Label>
              <div className="border-2 border-dashed rounded-lg p-4 text-center">
                {documentoForm.archivoNombre ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileCheck className="w-5 h-5 text-green-500" />
                    <span className="text-sm">{documentoForm.archivoNombre}</span>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setDocumentoForm({...documentoForm, archivoNombre: '', archivoTipo: '', archivoBase64: ''})}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                    <p className="text-sm text-slate-500">Arrastra un archivo o haz clic para seleccionar</p>
                    <Input
                      type="file"
                      className="mt-2"
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    />
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Formatos permitidos: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG. Máx 10MB.
              </p>
            </div>

            <div className="space-y-2 min-w-0">
              <Label>Observaciones</Label>
              <Textarea
                className="w-full"
                value={documentoForm.observaciones}
                onChange={(e) => setDocumentoForm({...documentoForm, observaciones: e.target.value})}
                placeholder="Observaciones o notas..."
                rows={2}
              />
            </div>

            {/* Compliance Preview */}
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-2">Vista previa del cumplimiento:</p>
              <div className="flex items-center gap-3">
                <Progress value={documentoForm.archivoBase64 ? 100 : 0} className="flex-1 h-2" />
                <span className="text-sm font-medium">{documentoForm.archivoBase64 ? '100%' : '0%'}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {documentoForm.archivoBase64 
                  ? '✓ Al subir un archivo, el cumplimiento será del 100% cuando el estado sea "Aprobado"' 
                  : 'Sube un archivo para calcular el porcentaje de cumplimiento'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocumentoDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveDocumento} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Categoria Dialog */}
      <Dialog open={categoriaDialogOpen} onOpenChange={setCategoriaDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingCategoria ? 'Editar' : 'Nueva'} Categoría de Cumplimiento</DialogTitle>
            <DialogDescription>Configure los datos de la categoría de cumplimiento legal.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <Label>Nombre *</Label>
                <Input
                  className="w-full"
                  value={categoriaForm.nombre}
                  onChange={(e) => setCategoriaForm({...categoriaForm, nombre: e.target.value})}
                />
              </div>
              <div className="space-y-2 min-w-0">
                <Label>Código</Label>
                <Input
                  className="w-full"
                  placeholder="Ej: LEY-001"
                  value={categoriaForm.codigo}
                  onChange={(e) => setCategoriaForm({...categoriaForm, codigo: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <Label>Tipo</Label>
                <Select value={categoriaForm.tipo} onValueChange={(v) => setCategoriaForm({...categoriaForm, tipo: v})}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIPOS_CATEGORIA.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 min-w-0">
                <Label>Orden</Label>
                <Input
                  className="w-full text-right"
                  type="number"
                  value={categoriaForm.orden}
                  onChange={(e) => setCategoriaForm({...categoriaForm, orden: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>
            <div className="space-y-2 min-w-0">
              <Label>Descripción</Label>
              <Textarea
                className="w-full"
                value={categoriaForm.descripcion}
                onChange={(e) => setCategoriaForm({...categoriaForm, descripcion: e.target.value})}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <Label>Artículo de Ley</Label>
                <Input
                  className="w-full"
                  placeholder="Ej: Art. 8 Ley 21.442"
                  value={categoriaForm.articuloLey}
                  onChange={(e) => setCategoriaForm({...categoriaForm, articuloLey: e.target.value})}
                />
              </div>
              <div className="space-y-2 min-w-0">
                <Label>Renovación (días)</Label>
                <Input
                  className="w-full text-right"
                  type="number"
                  placeholder="Ej: 365"
                  value={categoriaForm.fechaLimiteDias}
                  onChange={(e) => setCategoriaForm({...categoriaForm, fechaLimiteDias: e.target.value})}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="obligatorio"
                checked={categoriaForm.obligatorio}
                onChange={(e) => setCategoriaForm({...categoriaForm, obligatorio: e.target.checked})}
                className="rounded border-slate-300"
              />
              <Label htmlFor="obligatorio" className="text-sm">Obligatorio por ley</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCategoriaDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveCategoria} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View File Dialog */}
      <Dialog open={viewFileDialogOpen} onOpenChange={setViewFileDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{viewingDocumento?.titulo}</DialogTitle>
            <DialogDescription>Vista previa del documento adjunto</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {viewingDocumento?.archivoTipo?.startsWith('image/') ? (
              <img 
                src={viewingDocumento.archivoBase64 || ''} 
                alt={viewingDocumento.titulo}
                className="max-w-full max-h-[60vh] mx-auto"
              />
            ) : viewingDocumento?.archivoTipo === 'application/pdf' ? (
              <iframe 
                src={viewingDocumento.archivoBase64 || ''} 
                className="w-full h-[60vh]"
                title={viewingDocumento.titulo}
              />
            ) : (
              <div className="text-center py-8">
                <FileText className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                <p className="text-slate-500">Vista previa no disponible para este tipo de archivo</p>
                <Button className="mt-4" onClick={() => viewingDocumento && downloadDocument(viewingDocumento)}>
                  <Download className="w-4 h-4 mr-2" />
                  Descargar Archivo
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewFileDialogOpen(false)}>Cerrar</Button>
            {viewingDocumento && (
              <Button onClick={() => downloadDocument(viewingDocumento)}>
                <Download className="w-4 h-4 mr-2" />
                Descargar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Confirmar Eliminación
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de eliminar este {deleteType === 'documento' ? 'documento' : 'categoría'}? 
              {deleteType === 'categoria' && ' Si hay documentos asociados, la categoría será desactivada en lugar de eliminada.'}
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={saving} className="bg-red-600 hover:bg-red-700">
              {saving ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
