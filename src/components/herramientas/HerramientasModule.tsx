'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import {
  Plus, Pencil, Trash2, Search, Wrench,
  CheckCircle, AlertCircle, XCircle, Settings,
  Upload, Download, FileSpreadsheet, QrCode, ExternalLink,
  FileText, Clock, AlertTriangle, Printer, ClipboardList,
} from 'lucide-react'
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
import { useSession } from '@/hooks/use-session'
import { TableroIndicadores } from '@/components/ui/tablero-indicadores'
import { apiFetch } from '@/lib/api-client'
import { imprimirLVHerramienta } from '@/components/herramientas/LVHerramientas'

interface CentroCosto {
  id: string
  codigo: string
  nombre: string
}

interface Herramienta {
  id: string
  codigo: string | null
  nombre: string
  marca: string | null
  modelo: string | null
  cantidad: number
  ubicacion: string | null
  estado: string
  valorReposicion: number
  fechaAdquisicion: string | null
  descripcion: string | null
  manualNombre?: string | null
  manualTipo?: string | null
  tieneManual?: boolean
  // Mantenimiento
  fechaUltimoMantencion?: string | null
  informeMantencionNombre?: string | null
  informeMantencionTipo?: string | null
  tieneInformeMantencion?: boolean
  centroCosto: CentroCosto | null
  // Mercado
  imagenUrl?: string | null
  fuente?: string | null
  ultimaActPrecio?: string | null
}

interface ManualState {
  base64: string | null
  nombre: string | null
  tipo: string | null
  removed: boolean
  isNew: boolean
}

interface InformeMantencionState {
  base64: string | null
  nombre: string | null
  tipo: string | null
  removed: boolean
  isNew: boolean
}

const PUBLIC_HERRAMIENTA_BASE = 'https://condominios-cyj.vercel.app'

const formatCLP = (n: number) => 
  '$' + new Intl.NumberFormat('es-CL').format(Math.round(n || 0))

// ============================================
// NORMALIZACIÓN DE ESTADOS
// Unifica todos los variantes de estados a 6 categorías estándar
// ============================================
const ESTADOS_NORMALIZADOS = {
  'Operativo': 'Operativo',
  'Operativa': 'Operativo',
  'Operativos': 'Operativo',
  'Operativas': 'Operativo',
  'Operativa (sin uso)': 'Operativo',
  'Buen estado': 'Bueno',
  'Bueno': 'Bueno',
  'Nuevo': 'Bueno',
  'Nueva': 'Bueno',
  'Regular': 'Regular',
  'Mal estado': 'Malo',
  'Malo': 'Malo',
  'Mala': 'Malo',
  'Falta Mantención': 'Falta Mantención',
  'Falta mantención': 'Falta Mantención',
  'Nueva - Falta perno': 'Falta Mantención',
  'En reparación': 'En reparación',
} as const

function normalizarEstado(estado: string): string {
  return ESTADOS_NORMALIZADOS[estado as keyof typeof ESTADOS_NORMALIZADOS] || estado
}

const estadoColors: Record<string, string> = {
  'Operativo': 'bg-green-100 text-green-700 border-green-200',
  'Bueno': 'bg-green-100 text-green-700 border-green-200',
  'Regular': 'bg-amber-100 text-amber-700 border-amber-200',
  'Malo': 'bg-red-100 text-red-700 border-red-200',
  'Falta Mantención': 'bg-orange-100 text-orange-700 border-orange-200',
  'En reparación': 'bg-blue-100 text-blue-700 border-blue-200',
}

const estadoIcons: Record<string, React.ReactNode> = {
  'Operativo': <CheckCircle className="w-3 h-3 mr-1" />,
  'Bueno': <CheckCircle className="w-3 h-3 mr-1" />,
  'Regular': <AlertCircle className="w-3 h-3 mr-1" />,
  'Malo': <XCircle className="w-3 h-3 mr-1" />,
  'Falta Mantención': <AlertCircle className="w-3 h-3 mr-1" />,
  'En reparación': <Settings className="w-3 h-3 mr-1" />,
}

const estadosOptions = ['Operativo', 'Bueno', 'Regular', 'Malo', 'Falta Mantención', 'En reparación']

const emptyManual: ManualState = {
  base64: null,
  nombre: null,
  tipo: null,
  removed: false,
  isNew: false,
}

const emptyInformeMantencion: InformeMantencionState = {
  base64: null,
  nombre: null,
  tipo: null,
  removed: false,
  isNew: false,
}

export function HerramientasModule() {
  const [herramientas, setHerramientas] = useState<Herramienta[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('todos')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedHerramienta, setSelectedHerramienta] = useState<Herramienta | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    marca: '',
    modelo: '',
    cantidad: 1,
    ubicacion: '',
    estado: 'Bueno',
    valorReposicion: 0,
    fechaAdquisicion: '',
    descripcion: '',
    fechaUltimoMantencion: '',
  })
  const [manual, setManual] = useState<ManualState>(emptyManual)
  const [manualDownloading, setManualDownloading] = useState(false)
  const [informeMantencion, setInformeMantencion] = useState<InformeMantencionState>(emptyInformeMantencion)
  const [informeDownloading, setInformeDownloading] = useState(false)

  // QR dialog
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [qrHerramienta, setQrHerramienta] = useState<Herramienta | null>(null)

  // Bulk upload
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [bulkData, setBulkData] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{success: number, errors: string[]} | null>(null)
  
  const { hasPermission } = useSession()
  const canEdit = hasPermission('catalogos.editar')

  const fetchHerramientas = async () => {
    setLoading(true)
    try {
      const data = await apiFetch<Herramienta[]>('/api/catalogos/herramientas', [])
      setHerramientas(data)
    } catch (error) {
      console.error('Error fetching herramientas:', error)
      setHerramientas([])
    }
    setLoading(false)
  }

  useEffect(() => {
    void (async () => {
      await fetchHerramientas()
    })()
  }, [])

  // Filtrar herramientas (usando estado normalizado)
  const filteredHerramientas = herramientas.filter(h => {
    const matchSearch = !search || 
      h.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (h.codigo && h.codigo.toLowerCase().includes(search.toLowerCase())) ||
      (h.marca && h.marca.toLowerCase().includes(search.toLowerCase())) ||
      (h.modelo && h.modelo.toLowerCase().includes(search.toLowerCase()))
    
    const estadoNorm = normalizarEstado(h.estado)
    const matchEstado = filterEstado === 'todos' || estadoNorm === filterEstado
    
    return matchSearch && matchEstado
  })

  // Estadísticas (usando estado normalizado)
  const stats = {
    total: herramientas.length,
    operativo: herramientas.filter(h => normalizarEstado(h.estado) === 'Operativo').length,
    bueno: herramientas.filter(h => normalizarEstado(h.estado) === 'Bueno').length,
    regular: herramientas.filter(h => normalizarEstado(h.estado) === 'Regular').length,
    malo: herramientas.filter(h => normalizarEstado(h.estado) === 'Malo').length,
    faltaMantencion: herramientas.filter(h => normalizarEstado(h.estado) === 'Falta Mantención').length,
    enReparacion: herramientas.filter(h => normalizarEstado(h.estado) === 'En reparación').length,
    valorTotal: herramientas.reduce((sum, h) => sum + (h.cantidad * h.valorReposicion), 0),
  }

  const openCreateDialog = () => {
    setIsEditing(false)
    setSelectedHerramienta(null)
    setFormData({
      codigo: '',
      nombre: '',
      marca: '',
      modelo: '',
      cantidad: 1,
      ubicacion: '',
      estado: 'Bueno',
      valorReposicion: 0,
      fechaAdquisicion: '',
      descripcion: '',
      fechaUltimoMantencion: '',
    })
    setManual(emptyManual)
    setInformeMantencion(emptyInformeMantencion)
    setDialogOpen(true)
  }

  const openEditDialog = (herramienta: Herramienta) => {
    setIsEditing(true)
    setSelectedHerramienta(herramienta)
    setFormData({
      codigo: herramienta.codigo || '',
      nombre: herramienta.nombre,
      marca: herramienta.marca || '',
      modelo: herramienta.modelo || '',
      cantidad: herramienta.cantidad,
      ubicacion: herramienta.ubicacion || '',
      estado: herramienta.estado,
      valorReposicion: herramienta.valorReposicion,
      fechaAdquisicion: herramienta.fechaAdquisicion || '',
      descripcion: herramienta.descripcion || '',
      fechaUltimoMantencion: herramienta.fechaUltimoMantencion || '',
    })
    // Cargar el manual existente (sin el base64 para no inflar el formulario)
    setManual({
      base64: null,
      nombre: herramienta.manualNombre || null,
      tipo: herramienta.manualTipo || null,
      removed: false,
      isNew: false,
    })
    // Cargar el informe de mantención existente (sin el base64)
    setInformeMantencion({
      base64: null,
      nombre: herramienta.informeMantencionNombre || null,
      tipo: herramienta.informeMantencionTipo || null,
      removed: false,
      isNew: false,
    })
    setDialogOpen(true)
  }

  const openDeleteDialog = (herramienta: Herramienta) => {
    setSelectedHerramienta(herramienta)
    setDeleteDialogOpen(true)
  }

  const openQrDialog = (herramienta: Herramienta) => {
    setQrHerramienta(herramienta)
    setQrDialogOpen(true)
  }

  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      alert('Solo se permiten archivos PDF')
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      // result viene como "data:application/pdf;base64,XXXX"
      const base64 = result.split(',')[1] || result
      setManual({
        base64,
        nombre: file.name,
        tipo: file.type || 'application/pdf',
        removed: false,
        isNew: true,
      })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleManualRemove = () => {
    setManual({
      base64: null,
      nombre: null,
      tipo: null,
      removed: true,
      isNew: false,
    })
  }

  const handleInformeMantencionUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      alert('Solo se permiten archivos PDF')
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1] || result
      setInformeMantencion({
        base64,
        nombre: file.name,
        tipo: file.type || 'application/pdf',
        removed: false,
        isNew: true,
      })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleInformeMantencionRemove = () => {
    setInformeMantencion({
      base64: null,
      nombre: null,
      tipo: null,
      removed: true,
      isNew: false,
    })
  }

  const handleDownloadInforme = async () => {
    if (!selectedHerramienta) return
    setInformeDownloading(true)
    try {
      // Si el usuario acaba de subir un informe nuevo, descargarlo directamente
      if (informeMantencion.isNew && informeMantencion.base64 && informeMantencion.nombre) {
        const blob = base64ToBlob(informeMantencion.base64, informeMantencion.tipo || 'application/pdf')
        triggerDownload(blob, informeMantencion.nombre)
        setInformeDownloading(false)
        return
      }
      // Si no, obtener el informe existente del backend
      const res = await fetch(`/api/catalogos/herramientas/${selectedHerramienta.id}`, {
        headers: { 'x-incluir-manual': 'true' },
      })
      if (!res.ok) {
        alert('No se pudo descargar el informe')
        return
      }
      const data = await res.json()
      if (!data.informeMantencionBase64) {
        alert('Esta herramienta no tiene informe de mantención adjunto')
        return
      }
      const blob = base64ToBlob(data.informeMantencionBase64, data.informeMantencionTipo || 'application/pdf')
      triggerDownload(blob, data.informeMantencionNombre || 'informe-mantencion.pdf')
    } catch (error) {
      console.error('Error descargando informe:', error)
      alert('Error al descargar el informe')
    } finally {
      setInformeDownloading(false)
    }
  }

  const handleDownloadManual = async () => {
    if (!selectedHerramienta) return
    setManualDownloading(true)
    try {
      // Si el usuario acaba de subir un manual nuevo, descargarlo directamente
      if (manual.isNew && manual.base64 && manual.nombre) {
        const blob = base64ToBlob(manual.base64, manual.tipo || 'application/pdf')
        triggerDownload(blob, manual.nombre)
        setManualDownloading(false)
        return
      }
      // Si no, obtener el manual existente del backend
      const res = await fetch(`/api/catalogos/herramientas/${selectedHerramienta.id}`, {
        headers: { 'x-incluir-manual': 'true' },
      })
      if (!res.ok) {
        alert('No se pudo descargar el manual')
        return
      }
      const data = await res.json()
      if (!data.manualBase64) {
        alert('Esta herramienta no tiene manual adjunto')
        return
      }
      const blob = base64ToBlob(data.manualBase64, data.manualTipo || 'application/pdf')
      triggerDownload(blob, data.manualNombre || 'manual.pdf')
    } catch (error) {
      console.error('Error descargando manual:', error)
      alert('Error al descargar el manual')
    } finally {
      setManualDownloading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Construir el body del manual
      const manualBody: Record<string, string | boolean | null> = {}
      if (manual.isNew && manual.base64) {
        manualBody.manualBase64 = manual.base64
        manualBody.manualNombre = manual.nombre
        manualBody.manualTipo = manual.tipo
      } else if (manual.removed) {
        manualBody.eliminarManual = true
      }

      // Construir el body del informe de mantención
      const informeBody: Record<string, string | boolean | null> = {}
      if (informeMantencion.isNew && informeMantencion.base64) {
        informeBody.informeMantencionBase64 = informeMantencion.base64
        informeBody.informeMantencionNombre = informeMantencion.nombre
        informeBody.informeMantencionTipo = informeMantencion.tipo
      } else if (informeMantencion.removed) {
        informeBody.eliminarInformeMantencion = true
      }

      const body = { ...formData, ...manualBody, ...informeBody }

      if (isEditing && selectedHerramienta) {
        await fetch(`/api/catalogos/herramientas/${selectedHerramienta.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        await fetch('/api/catalogos/herramientas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }
      setDialogOpen(false)
      fetchHerramientas()
    } catch (error) {
      console.error('Error saving herramienta:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedHerramienta) return
    
    try {
      await fetch(`/api/catalogos/herramientas/${selectedHerramienta.id}`, {
        method: 'DELETE',
      })
      setDeleteDialogOpen(false)
      fetchHerramientas()
    } catch (error) {
      console.error('Error deleting herramienta:', error)
    }
  }

  // Bulk upload
  const handleBulkUpload = async () => {
    if (!bulkData.trim()) return
    setUploading(true)
    setUploadResult(null)
    
    try {
      const res = await fetch('/api/catalogos/herramientas/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: bulkData }),
      })
      const result = await res.json()
      setUploadResult(result)
      if (result.success > 0) {
        fetchHerramientas()
      }
    } catch (error) {
      console.error('Error uploading herramientas:', error)
      setUploadResult({ success: 0, errors: ['Error de conexión'] })
    }
    setUploading(false)
  }

  // Export
  const exportHerramientas = () => {
    const header = 'codigo,nombre,marca,modelo,cantidad,ubicacion,estado,valorReposicion,fechaAdquisicion\n'
    const rows = herramientas.map(h => 
      `"${h.codigo || ''}","${h.nombre}","${h.marca || ''}","${h.modelo || ''}",${h.cantidad},"${h.ubicacion || ''}","${h.estado}",${h.valorReposicion},"${h.fechaAdquisicion || ''}"`
    ).join('\n')
    
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'herramientas.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDownloadQr = async (herramienta: Herramienta) => {
    try {
      const res = await fetch(`/api/herramientas/${herramienta.id}/qr`)
      if (!res.ok) {
        alert('No se pudo generar el QR')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `qr-herramienta-${herramienta.codigo || herramienta.id}.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error descargando QR:', error)
      alert('Error al descargar el QR')
    }
  }

  const handleAbrirPaginaHerramienta = (herramienta: Herramienta) => {
    window.open(`/h/${herramienta.id}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="space-y-5">
      <TableroIndicadores
        cards={[
          { titulo: 'Total Herramientas', numero: stats.total, icon: <Wrench className="w-5 h-5" />, color: 'primary' },
          { titulo: 'Operativas', numero: stats.operativo + stats.bueno, icon: <CheckCircle className="w-5 h-5" />, color: 'verde', subtitulo: 'Listas para usar' },
          { titulo: 'Regular', numero: stats.regular, icon: <AlertCircle className="w-5 h-5" />, color: 'naranja', subtitulo: 'Funciona con observaciones' },
          { titulo: 'Falta Mantención', numero: stats.faltaMantencion, icon: <AlertTriangle className="w-5 h-5" />, color: 'naranja', subtitulo: 'Requiere atención' },
          { titulo: 'Mal estado', numero: stats.malo, icon: <XCircle className="w-5 h-5" />, color: 'rojo', subtitulo: 'No operativo' },
          { titulo: 'En Reparación', numero: stats.enReparacion, icon: <Settings className="w-5 h-5" />, color: 'azul', subtitulo: 'En taller' },
        ]}
      />
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar herramienta..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {estadosOptions.map(estado => (
              <SelectItem key={estado} value={estado}>{estado}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canEdit && (
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={exportHerramientas}>
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button variant="outline" onClick={() => { setBulkData(''); setUploadResult(null); setBulkDialogOpen(true) }}>
              <Upload className="w-4 h-4 mr-2" />
              Carga Masiva
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Herramienta
            </Button>
          </div>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Catálogo de Herramientas ({filteredHerramientas.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <p className="md:hidden text-xs text-slate-400 text-center py-1">← Desliza horizontalmente para ver más →</p>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Foto</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Código</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Nombre</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Marca</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Modelo</th>
                  <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Cant.</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Ubicación</th>
                  <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Estado</th>
                  <th className="text-right p-3 text-[10px] font-bold text-slate-500 uppercase">Valor</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Fuente</th>
                  <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Manual</th>
                  <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Acc.</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={12} className="p-8 text-center text-slate-400">Cargando...</td></tr>
                ) : filteredHerramientas.length === 0 ? (
                  <tr><td colSpan={12} className="p-8 text-center text-slate-400">Sin herramientas</td></tr>
                ) : (
                  filteredHerramientas.map((herr) => (
                    <tr key={herr.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="p-3">
                        {herr.imagenUrl ? (
                          <img
                            src={herr.imagenUrl}
                            alt={herr.nombre}
                            className="w-10 h-10 object-cover rounded border border-slate-200"
                            loading="lazy"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                          />
                        ) : (
                          <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center text-slate-400">
                            <Wrench className="w-4 h-4" />
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-mono text-xs font-semibold text-[#0f2044]">
                        {herr.codigo || '–'}
                      </td>
                      <td className="p-3">
                        <div className="font-semibold">{herr.nombre}</div>
                        {herr.descripcion && (
                          <div className="text-xs text-slate-500 truncate max-w-[200px]">{herr.descripcion}</div>
                        )}
                      </td>
                      <td className="p-3 text-xs">{herr.marca || '–'}</td>
                      <td className="p-3 text-xs">{herr.modelo || '–'}</td>
                      <td className="p-3 text-center font-semibold">{herr.cantidad}</td>
                      <td className="p-3 text-xs">{herr.ubicacion || '–'}</td>
                      <td className="p-3 text-center">
                        {(() => {
                          const estadoNorm = normalizarEstado(herr.estado)
                          return (
                            <Badge className={estadoColors[estadoNorm] || 'bg-slate-100 text-slate-700 border-slate-200'}>
                              {estadoIcons[estadoNorm] || <AlertCircle className="w-3 h-3 mr-1" />}
                              {estadoNorm}
                            </Badge>
                          )
                        })()}
                      </td>
                      <td className="p-3 text-right font-mono text-xs font-bold">{formatCLP(herr.valorReposicion)}</td>
                      <td className="p-3 text-xs">
                        {herr.fuente ? (
                          <div>
                            <Badge className="bg-slate-100 text-slate-700">{herr.fuente}</Badge>
                            {herr.ultimaActPrecio && (
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {new Date(herr.ultimaActPrecio).toLocaleDateString('es-CL')}
                              </div>
                            )}
                          </div>
                        ) : '–'}
                      </td>
                      <td className="p-3 text-center">
                        {herr.tieneManual ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-50 text-red-600" title="Tiene manual adjunto">
                            <FileText className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">–</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => openQrDialog(herr)}
                            title="Ver QR"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-amber-600 hover:text-amber-800"
                            onClick={() => imprimirLVHerramienta(herr, 'antes')}
                            title="Imprimir LV Antes de Uso"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-blue-600 hover:text-blue-800"
                            onClick={() => window.open(`/h/${herr.id}`, '_blank')}
                            title="Pañol / Ver página de la herramienta"
                          >
                            <ClipboardList className="w-3.5 h-3.5" />
                          </Button>
                          {canEdit && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => openEditDialog(herr)}
                                title="Editar"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-red-500 hover:text-red-700"
                                onClick={() => openDeleteDialog(herr)}
                                title="Eliminar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Herramienta' : 'Nueva Herramienta'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 min-w-0">
                <Label>Código</Label>
                <Input
                  className="w-full"
                  value={formData.codigo}
                  onChange={(e) => setFormData({...formData, codigo: e.target.value})}
                  placeholder="Ej: HERR-01"
                />
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label>Nombre *</Label>
                <Input
                  className="w-full"
                  value={formData.nombre}
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                  placeholder="Nombre de la herramienta"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 min-w-0">
                <Label>Marca</Label>
                <Input
                  className="w-full"
                  value={formData.marca}
                  onChange={(e) => setFormData({...formData, marca: e.target.value})}
                  placeholder="Ej: Bosch, Makita"
                />
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label>Modelo</Label>
                <Input
                  className="w-full"
                  value={formData.modelo}
                  onChange={(e) => setFormData({...formData, modelo: e.target.value})}
                  placeholder="Modelo del equipo"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 min-w-0">
                <Label>Cantidad</Label>
                <Input
                  className="w-full"
                  type="number"
                  value={formData.cantidad}
                  onChange={(e) => setFormData({...formData, cantidad: parseInt(e.target.value) || 1})}
                />
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label>Estado</Label>
                <Select value={formData.estado} onValueChange={(v) => setFormData({...formData, estado: v})}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {estadosOptions.map(estado => (
                      <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 min-w-0">
                <Label>Ubicación</Label>
                <Input
                  className="w-full"
                  value={formData.ubicacion}
                  onChange={(e) => setFormData({...formData, ubicacion: e.target.value})}
                  placeholder="Ej: Bodega A, Estante 2"
                />
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label>Fecha Adquisición</Label>
                <Input
                  className="w-full"
                  type="date"
                  value={formData.fechaAdquisicion}
                  onChange={(e) => setFormData({...formData, fechaAdquisicion: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label>Valor Reposición</Label>
              <Input
                className="w-full"
                type="number"
                value={formData.valorReposicion}
                onChange={(e) => setFormData({...formData, valorReposicion: parseFloat(e.target.value) || 0})}
                placeholder="Valor en CLP"
              />
            </div>
            <div className="space-y-1.5 min-w-0">
              <Label>Descripción</Label>
              <Textarea
                className="w-full"
                value={formData.descripcion}
                onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                placeholder="Notas adicionales..."
                rows={2}
              />
            </div>

            {/* Mantenimiento */}
            <div className="space-y-3 border-t pt-4">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <Settings className="w-4 h-4 text-[#0f2044]" />
                Mantenimiento
              </Label>
              <div className="space-y-1.5 min-w-0">
                <Label>Fecha Último Mantenimiento</Label>
                <Input
                  className="w-full"
                  type="date"
                  value={formData.fechaUltimoMantencion}
                  onChange={(e) => setFormData({...formData, fechaUltimoMantencion: e.target.value})}
                />
              </div>
              <div className="space-y-2 min-w-0">
                <Label className="text-xs text-slate-600">Informe de Mantenimiento (PDF)</Label>
                {informeMantencion.nombre && !informeMantencion.removed ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {informeMantencion.nombre}
                        </p>
                        <p className="text-xs text-slate-500">
                          {informeMantencion.isNew ? 'Nuevo informe (se subirá al guardar)' : 'Informe adjunto'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept=".pdf,application/pdf"
                          className="hidden"
                          onChange={handleInformeMantencionUpload}
                        />
                        <Button size="sm" variant="outline" asChild>
                          <span><Upload className="w-3.5 h-3.5 mr-1" /> Reemplazar</span>
                        </Button>
                      </label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleDownloadInforme}
                        disabled={informeDownloading}
                      >
                        <Download className="w-3.5 h-3.5 mr-1" />
                        {informeDownloading ? 'Descargando...' : 'Descargar'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={handleInformeMantencionRemove}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Eliminar Informe
                      </Button>
                    </div>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onChange={handleInformeMantencionUpload}
                    />
                    <div className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-slate-300 rounded-lg hover:border-[#0f2044] hover:bg-slate-50 transition-colors">
                      <Upload className="w-6 h-6 text-slate-400" />
                      <p className="text-sm text-slate-600">
                        <span className="text-[#0f2044] font-semibold">Haz clic para subir</span> un PDF
                      </p>
                      <p className="text-xs text-slate-400">Solo archivos PDF · máx. ~5 MB recomendado</p>
                    </div>
                  </label>
                )}
              </div>
            </div>

            {/* Manual de Usuario */}
            <div className="space-y-2 border-t pt-4 min-w-0">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="w-4 h-4 text-[#0f2044]" />
                Manual de Usuario (PDF)
              </Label>
              {manual.nombre && !manual.removed ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="w-10 h-10 bg-red-100 text-red-600 rounded-lg flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {manual.nombre}
                      </p>
                      <p className="text-xs text-slate-500">
                        {manual.isNew ? 'Nuevo manual (se subirá al guardar)' : 'Manual adjunto'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={handleManualUpload}
                      />
                      <Button size="sm" variant="outline" asChild>
                        <span><Upload className="w-3.5 h-3.5 mr-1" /> Reemplazar</span>
                      </Button>
                    </label>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={handleDownloadManual}
                      disabled={manualDownloading}
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      {manualDownloading ? 'Descargando...' : 'Descargar'}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={handleManualRemove}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Eliminar Manual
                    </Button>
                  </div>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={handleManualUpload}
                  />
                  <div className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-slate-300 rounded-lg hover:border-[#0f2044] hover:bg-slate-50 transition-colors">
                    <Upload className="w-6 h-6 text-slate-400" />
                    <p className="text-sm text-slate-600">
                      <span className="text-[#0f2044] font-semibold">Haz clic para subir</span> un PDF
                    </p>
                    <p className="text-xs text-slate-400">Solo archivos PDF · máx. ~5 MB recomendado</p>
                  </div>
                </label>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!formData.nombre || saving}>
              {saving ? 'Guardando...' : (isEditing ? 'Guardar Cambios' : 'Crear Herramienta')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-[#0f2044]" />
              Código QR de la Herramienta
            </DialogTitle>
          </DialogHeader>
          {qrHerramienta && (
            <div className="space-y-4 py-2">
              <div className="text-center">
                <div className="inline-block p-4 bg-white border-2 border-slate-200 rounded-xl">
                  <img
                    src={`/api/herramientas/${qrHerramienta.id}/qr`}
                    alt={`QR de ${qrHerramienta.nombre}`}
                    className="w-56 h-56"
                  />
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Herramienta</p>
                <p className="text-sm font-bold text-slate-900">{qrHerramienta.nombre}</p>
                {qrHerramienta.codigo && (
                  <p className="text-xs font-mono text-[#0f2044]">{qrHerramienta.codigo}</p>
                )}
              </div>
              <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">URL del QR</p>
                <p className="text-xs font-mono text-slate-700 break-all">
                  {PUBLIC_HERRAMIENTA_BASE}/h/{qrHerramienta.id}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  className="flex-1 bg-[#0f2044] hover:bg-[#1a3060]"
                  onClick={() => handleDownloadQr(qrHerramienta)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar QR
                </Button>
                <Button 
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleAbrirPaginaHerramienta(qrHerramienta)}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir página
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar herramienta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la herramienta
              {selectedHerramienta && <strong> {selectedHerramienta.nombre}</strong>}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Carga Masiva de Herramientas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-slate-50 p-3 rounded-lg text-sm">
              <p className="font-semibold mb-2">Formato CSV (una línea por herramienta):</p>
              <code className="text-xs bg-white p-2 rounded block">
                codigo,nombre,marca,modelo,cantidad,ubicacion,estado,valorReposicion
              </code>
              <p className="text-xs text-slate-500 mt-2">
                Ejemplo: HERR-01,Taladro Percutor,Bosch,GBH-2000,2,Bodega A,Bueno,85000
              </p>
            </div>
            <div className="space-y-2">
              <Label>Datos CSV</Label>
              <Textarea 
                value={bulkData} 
                onChange={(e) => setBulkData(e.target.value)}
                placeholder="codigo,nombre,marca,modelo,cantidad,ubicacion,estado,valorReposicion&#10;HERR-01,Taladro Percutor,Bosch,GBH-2000,2,Bodega A,Bueno,85000&#10;HERR-02,Amoladora,Makita,9557HP,1,Bodega A,Bueno,45000"
                rows={10}
                className="font-mono text-sm"
              />
            </div>
            {uploadResult && (
              <div className={`p-3 rounded ${uploadResult.success > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                <p className="font-semibold">{uploadResult.success} herramientas importadas correctamente</p>
                {uploadResult.errors.length > 0 && (
                  <ul className="text-sm mt-1">
                    {uploadResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>Cerrar</Button>
            <Button onClick={handleBulkUpload} disabled={uploading || !bulkData.trim()}>
              {uploading ? 'Importando...' : 'Importar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============= Helpers =============

function base64ToBlob(base64: string, mime: string): Blob {
  const byteChars = atob(base64)
  const byteNumbers = new Array(byteChars.length)
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  return new Blob([byteArray], { type: mime })
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
