'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Plus, Pencil, Trash2, Search, Download, Package, Wrench,
  CheckSquare, Users, FileText, Upload, Eye, X, Paperclip,
  FileSpreadsheet, FileDown, Settings, Camera, Image as ImageIcon,
  ShoppingCart,
} from 'lucide-react'
import { toast } from 'sonner'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ============================================
// Interfaces
// ============================================
interface ProyectoMaterial {
  id: string
  descripcion: string
  cantidad: number
  unidad: string
  precioUnit: number
  total: number
}

interface ProyectoHerramienta {
  id: string
  nombre: string
  cantidad: number
}

interface ProyectoTarea {
  id: string
  descripcion: string
  cantidad: number
  estado: string
}

interface ProyectoPersonal {
  id: string
  nombre: string
  tipo: string
  cantidad: number
  precioUnit: number
  total: number
}

interface ProyectoDocumento {
  id: string
  nombre: string
  tipo: string
  descripcion: string | null
  archivo: string
  fechaDoc: string | null
  createdAt: string
}

interface Cotizacion {
  nombre: string
  archivo: string
  tipo: string
}

interface Proyecto {
  id: string
  nombre: string
  categoria: string
  estado: string
  ubicacion: string | null
  fechaInicio: string | null
  fechaFin: string | null
  presProg: number
  presUsado: number
  avance: number
  descripcion: string | null
  notas: string | null
  materiales: ProyectoMaterial[]
  herramientas: ProyectoHerramienta[]
  tareas: ProyectoTarea[]
  personal: ProyectoPersonal[]
  documentos: ProyectoDocumento[]
  // Nuevos campos
  sector?: string | null
  tipoReparacion?: string | null
  prioridad?: string | null
  estadoAprobacion?: string | null
  responsable?: string | null
  tiempoEstimado?: string | null
  monto?: number
  fechaInicioReal?: string | null
  fechaFinReal?: string | null
  comentarios?: string | null
  fotosAntes?: string | null
  fotosDespues?: string | null
  cotizaciones?: string | null
  tieneFotosAntes?: boolean
  tieneFotosDespues?: boolean
  tieneCotizaciones?: boolean
  fotosAntesCount?: number
  fotosDespuesCount?: number
  cotizacionesCount?: number
}

interface ListaDesplegable {
  id: string
  nombre: string
  tipo: string
  valor: string
  activo: boolean
  condominioId: string | null
}

// ============================================
// Helpers
// ============================================
const formatCLP = (n: number) =>
  '$' + new Intl.NumberFormat('es-CL').format(Math.round(n || 0))

const formatDate = (d: string | null | undefined) => {
  if (!d) return '–'
  try {
    const [y, m, dd] = d.split('-')
    return `${dd}/${m}/${y}`
  } catch {
    return d
  }
}

function extraerNumProyecto(nombre: string): string {
  const m = nombre.match(/#(\d+)/)
  return m ? m[1] : '–'
}

function extraerDescripcion(nombre: string): string {
  return nombre.replace(/^#\d+\s*-\s*/, '')
}

// Convierte un File a base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Parsea JSON string de fotos/cotizaciones de forma segura
function parseJsonArray<T = unknown>(raw: string | null | undefined): T[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

// ============================================
// Color maps
// ============================================
const estadoBadgeColors: Record<string, string> = {
  'Planificado': 'bg-blue-100 text-blue-700 border-blue-200',
  'En Ejecución': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Completado': 'bg-green-100 text-green-700 border-green-200',
  'Cancelado': 'bg-red-100 text-red-700 border-red-200',
  'Pausado': 'bg-slate-100 text-slate-700 border-slate-200',
}

const aprobacionColors: Record<string, string> = {
  'Aprobado': 'text-green-600 font-medium',
  'En espera': 'text-orange-500 font-medium',
  'Aprobado por Supervisor': 'text-blue-600 font-medium',
  'Pendiente': 'text-orange-500 font-medium',
  'Rechazado': 'text-red-600 font-medium',
}

const prioridadColors: Record<string, string> = {
  'Alta': 'bg-red-100 text-red-700',
  'Media': 'bg-yellow-100 text-yellow-700',
  'Baja': 'bg-green-100 text-green-700',
  'Urgente': 'bg-red-200 text-red-800',
}

const estadoColors: Record<string, string> = {
  'Planificado': 'bg-blue-100 text-blue-700',
  'En Ejecución': 'bg-yellow-100 text-yellow-700',
  'Completado': 'bg-green-100 text-green-700',
  'Cancelado': 'bg-red-100 text-red-700',
  'Pausado': 'bg-slate-100 text-slate-700',
}

const documentoTipoColors: Record<string, string> = {
  'cotizacion': 'bg-blue-100 text-blue-700',
  'respaldo': 'bg-green-100 text-green-700',
  'contrato': 'bg-purple-100 text-purple-700',
  'factura': 'bg-orange-100 text-orange-700',
  'otro': 'bg-slate-100 text-slate-700',
}

const TIPOS_LISTA = [
  { value: 'sector', label: 'Sector' },
  { value: 'tipoReparacion', label: 'Tipo de Reparación' },
  { value: 'prioridad', label: 'Prioridad' },
  { value: 'estadoProyecto', label: 'Estado de Proyecto' },
  { value: 'estadoAprobacion', label: 'Estado de Aprobación' },
] as const

// ============================================
// Component
// ============================================
export function ProyectosModule() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [editingProy, setEditingProy] = useState<Proyecto | null>(null)
  const [selectedProy, setSelectedProy] = useState<Proyecto | null>(null)

  // Listas desplegables
  const [listas, setListas] = useState<Record<string, ListaDesplegable[]>>({
    sector: [],
    tipoReparacion: [],
    prioridad: [],
    estadoProyecto: [],
    estadoAprobacion: [],
  })
  const [configListasOpen, setConfigListasOpen] = useState(false)
  const [configTipo, setConfigTipo] = useState<string>('sector')
  const [nuevoValorLista, setNuevoValorLista] = useState('')
  const [configLoading, setConfigLoading] = useState(false)

  // Form state (incluye nuevos campos)
  const [formData, setFormData] = useState({
    nombre: '',
    categoria: 'General',
    estado: 'Planificado',
    ubicacion: '',
    fechaInicio: '',
    fechaFin: '',
    presProg: 0,
    presUsado: 0,
    avance: 0,
    descripcion: '',
    notas: '',
    // Nuevos campos
    sector: '',
    tipoReparacion: '',
    prioridad: '',
    estadoAprobacion: '',
    responsable: '',
    tiempoEstimado: '',
    monto: 0,
    fechaInicioReal: '',
    fechaFinReal: '',
    comentarios: '',
  })

  // Resources state
  const [materiales, setMateriales] = useState<ProyectoMaterial[]>([])
  const [herramientas, setHerramientas] = useState<ProyectoHerramienta[]>([])
  const [tareas, setTareas] = useState<ProyectoTarea[]>([])
  const [personal, setPersonal] = useState<ProyectoPersonal[]>([])
  const [documentos, setDocumentos] = useState<ProyectoDocumento[]>([])

  // Fotos y cotizaciones
  const [fotosAntes, setFotosAntes] = useState<string[]>([])
  const [fotosDespues, setFotosDespues] = useState<string[]>([])
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false)

  // ============================================
  // Fetchers
  // ============================================
  const fetchProyectos = useCallback(async (searchTerm = '') => {
    setLoading(true)
    try {
      const url = searchTerm ? `/api/proyectos?search=${encodeURIComponent(searchTerm)}` : '/api/proyectos'
      const res = await fetch(url)
      const data = await res.json()
      setProyectos(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching proyectos:', error)
      setProyectos([])
      toast.error('Error al cargar proyectos')
    }
    setLoading(false)
  }, [])

  const fetchListas = useCallback(async () => {
    try {
      const res = await fetch('/api/listas-desplegables')
      const data = await res.json()
      const agrupado: Record<string, ListaDesplegable[]> = {
        sector: [],
        tipoReparacion: [],
        prioridad: [],
        estadoProyecto: [],
        estadoAprobacion: [],
      }
      if (Array.isArray(data)) {
        for (const item of data as ListaDesplegable[]) {
          if (agrupado[item.tipo]) agrupado[item.tipo].push(item)
        }
      }
      setListas(agrupado)
    } catch (error) {
      console.error('Error fetching listas:', error)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      await fetchProyectos()
      await fetchListas()
    })()
  }, [fetchProyectos, fetchListas])

  useEffect(() => {
    const timeout = setTimeout(() => fetchProyectos(search), 300)
    return () => clearTimeout(timeout)
  }, [search, fetchProyectos])

  // ============================================
  // Dialog openers
  // ============================================
  const openDialog = async (proy?: Proyecto) => {
    if (proy) {
      setEditingProy(proy)
      // Si el proyecto tiene fotos/cotizaciones en base64, las cargamos
      let fotosAntesData: string[] = []
      let fotosDespuesData: string[] = []
      let cotizacionesData: Cotizacion[] = []

      try {
        const res = await fetch(`/api/proyectos/${proy.id}`)
        if (res.ok) {
          const detail = await res.json()
          fotosAntesData = parseJsonArray<string>(detail.fotosAntes)
          fotosDespuesData = parseJsonArray<string>(detail.fotosDespues)
          cotizacionesData = parseJsonArray<Cotizacion>(detail.cotizaciones)
        }
      } catch (e) {
        console.error('Error fetching proyecto detail:', e)
      }

      setFormData({
        nombre: proy.nombre,
        categoria: proy.categoria,
        estado: proy.estado,
        ubicacion: proy.ubicacion || '',
        fechaInicio: proy.fechaInicio || '',
        fechaFin: proy.fechaFin || '',
        presProg: proy.presProg,
        presUsado: proy.presUsado,
        avance: proy.avance,
        descripcion: proy.descripcion || '',
        notas: proy.notas || '',
        sector: proy.sector || '',
        tipoReparacion: proy.tipoReparacion || '',
        prioridad: proy.prioridad || '',
        estadoAprobacion: proy.estadoAprobacion || '',
        responsable: proy.responsable || '',
        tiempoEstimado: proy.tiempoEstimado || '',
        monto: proy.monto ?? 0,
        fechaInicioReal: proy.fechaInicioReal || '',
        fechaFinReal: proy.fechaFinReal || '',
        comentarios: proy.comentarios || '',
      })
      setMateriales(proy.materiales || [])
      setHerramientas(proy.herramientas || [])
      setTareas(proy.tareas || [])
      setPersonal(proy.personal || [])
      setDocumentos(proy.documentos || [])
      setFotosAntes(fotosAntesData)
      setFotosDespues(fotosDespuesData)
      setCotizaciones(cotizacionesData)
    } else {
      setEditingProy(null)
      setFormData({
        nombre: '',
        categoria: 'General',
        estado: 'Planificado',
        ubicacion: '',
        fechaInicio: '',
        fechaFin: '',
        presProg: 0,
        presUsado: 0,
        avance: 0,
        descripcion: '',
        notas: '',
        sector: '',
        tipoReparacion: '',
        prioridad: '',
        estadoAprobacion: '',
        responsable: '',
        tiempoEstimado: '',
        monto: 0,
        fechaInicioReal: '',
        fechaFinReal: '',
        comentarios: '',
      })
      setMateriales([])
      setHerramientas([])
      setTareas([])
      setPersonal([])
      setDocumentos([])
      setFotosAntes([])
      setFotosDespues([])
      setCotizaciones([])
    }
    setDialogOpen(true)
  }

  const openDetailDialog = (proy: Proyecto) => {
    setSelectedProy(proy)
    setDetailDialogOpen(true)
  }

  // ============================================
  // Save / Delete
  // ============================================
  const handleSave = async () => {
    if (!formData.nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    const costoMateriales = materiales.reduce((sum, m) => sum + (m.total || m.cantidad * m.precioUnit), 0)
    const costoPersonal = personal.reduce((sum, p) => sum + (p.total || p.precioUnit * p.cantidad), 0)
    const presUsadoCalculado = costoMateriales + costoPersonal

    const dataToSend = {
      ...formData,
      presUsado: presUsadoCalculado,
      materiales,
      herramientas,
      tareas,
      personal,
      documentos,
      // Solo enviar fotos/cotizaciones si hay datos (evita sobreescribir con null si no se cargaron)
      ...(fotosAntes.length > 0 ? { fotosAntes } : { fotosAntes: [] }),
      ...(fotosDespues.length > 0 ? { fotosDespues } : { fotosDespues: [] }),
      ...(cotizaciones.length > 0 ? { cotizaciones } : { cotizaciones: [] }),
    }

    try {
      const res = editingProy
        ? await fetch(`/api/proyectos/${editingProy.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSend),
          })
        : await fetch('/api/proyectos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSend),
          })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Error al guardar proyecto')
      }
      toast.success(editingProy ? 'Proyecto actualizado' : 'Proyecto creado')
      setDialogOpen(false)
      fetchProyectos(search)
    } catch (error) {
      console.error('Error saving proyecto:', error)
      toast.error(error instanceof Error ? error.message : 'Error al guardar proyecto')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este proyecto y todos sus recursos asociados?')) return
    try {
      await fetch(`/api/proyectos/${id}`, { method: 'DELETE' })
      toast.success('Proyecto eliminado')
      fetchProyectos(search)
    } catch (error) {
      console.error('Error deleting proyecto:', error)
      toast.error('Error al eliminar proyecto')
    }
  }

  // ============================================
  // Material handlers
  // ============================================
  const addMaterial = () => {
    setMateriales([...materiales, {
      id: `temp-${Date.now()}`,
      descripcion: '',
      cantidad: 1,
      unidad: 'unidad',
      precioUnit: 0,
      total: 0,
    }])
  }
  const updateMaterial = (index: number, field: string, value: string | number) => {
    const updated = [...materiales]
    updated[index] = { ...updated[index], [field]: value }
    if (field === 'cantidad' || field === 'precioUnit') {
      updated[index].total = updated[index].cantidad * updated[index].precioUnit
    }
    setMateriales(updated)
  }
  const removeMaterial = (index: number) => setMateriales(materiales.filter((_, i) => i !== index))

  // Herramienta handlers
  const addHerramienta = () => {
    setHerramientas([...herramientas, { id: `temp-${Date.now()}`, nombre: '', cantidad: 1 }])
  }
  const updateHerramienta = (index: number, field: string, value: string | number) => {
    const updated = [...herramientas]
    updated[index] = { ...updated[index], [field]: value }
    setHerramientas(updated)
  }
  const removeHerramienta = (index: number) => setHerramientas(herramientas.filter((_, i) => i !== index))

  // Tarea handlers
  const addTarea = () => {
    setTareas([...tareas, { id: `temp-${Date.now()}`, descripcion: '', cantidad: 1, estado: 'Pendiente' }])
  }
  const updateTarea = (index: number, field: string, value: string | number) => {
    const updated = [...tareas]
    updated[index] = { ...updated[index], [field]: value }
    setTareas(updated)
  }
  const removeTarea = (index: number) => setTareas(tareas.filter((_, i) => i !== index))

  // Personal handlers
  const addPersonal = () => {
    setPersonal([...personal, {
      id: `temp-${Date.now()}`,
      nombre: '',
      tipo: 'Interno',
      cantidad: 1,
      precioUnit: 0,
      total: 0,
    }])
  }
  const updatePersonal = (index: number, field: string, value: string | number) => {
    const updated = [...personal]
    updated[index] = { ...updated[index], [field]: value }
    updated[index].total = updated[index].precioUnit * updated[index].cantidad
    setPersonal(updated)
  }
  const removePersonal = (index: number) => setPersonal(personal.filter((_, i) => i !== index))

  // Documento handlers (mantenemos el sistema existente de ProyectoDocumento)
  const addDocumento = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = () => {
          const base64 = reader.result as string
          setDocumentos([...documentos, {
            id: `temp-${Date.now()}`,
            nombre: file.name,
            tipo: 'cotizacion',
            descripcion: '',
            archivo: base64,
            fechaDoc: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString(),
          }])
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }
  const updateDocumento = (index: number, field: string, value: string) => {
    const updated = [...documentos]
    updated[index] = { ...updated[index], [field]: value }
    setDocumentos(updated)
  }
  const removeDocumento = (index: number) => setDocumentos(documentos.filter((_, i) => i !== index))
  const viewDocumento = (doc: ProyectoDocumento) => {
    const newWindow = window.open()
    if (newWindow) {
      newWindow.document.write(`<iframe src="${doc.archivo}" style="width:100%;height:100%;border:none;"></iframe>`)
    }
  }

  // ============================================
  // Fotos handlers (nuevo)
  // ============================================
  const handleFotosChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    tipo: 'antes' | 'despues'
  ) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    try {
      const base64Files: string[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        if (!file.type.startsWith('image/')) {
          toast.error(`El archivo ${file.name} no es una imagen`)
          continue
        }
        // Limitar a 3MB por imagen para no sobrecargar la BD
        if (file.size > 3 * 1024 * 1024) {
          toast.error(`La imagen ${file.name} excede 3MB`)
          continue
        }
        const b64 = await fileToBase64(file)
        base64Files.push(b64)
      }
      if (tipo === 'antes') {
        setFotosAntes([...fotosAntes, ...base64Files])
      } else {
        setFotosDespues([...fotosDespues, ...base64Files])
      }
      toast.success(`${base64Files.length} imagen(es) agregada(s)`)
    } catch (error) {
      console.error('Error procesando imágenes:', error)
      toast.error('Error al procesar imágenes')
    } finally {
      // Reset input para poder subir el mismo archivo otra vez
      e.target.value = ''
    }
  }

  const removeFoto = (index: number, tipo: 'antes' | 'despues') => {
    if (tipo === 'antes') {
      setFotosAntes(fotosAntes.filter((_, i) => i !== index))
    } else {
      setFotosDespues(fotosDespues.filter((_, i) => i !== index))
    }
  }

  // ============================================
  // Cotizaciones handlers (nuevo)
  // ============================================
  const handleCotizacionesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    try {
      const nuevas: Cotizacion[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        // Permitir PDF e imágenes
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
          toast.error(`El archivo ${file.name} no es PDF ni imagen`)
          continue
        }
        // Limitar a 5MB
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`El archivo ${file.name} excede 5MB`)
          continue
        }
        const b64 = await fileToBase64(file)
        nuevas.push({
          nombre: file.name,
          archivo: b64,
          tipo: file.type,
        })
      }
      setCotizaciones([...cotizaciones, ...nuevas])
      if (nuevas.length > 0) {
        toast.success(`${nuevas.length} cotización(es) agregada(s)`)
      }
    } catch (error) {
      console.error('Error procesando cotizaciones:', error)
      toast.error('Error al procesar cotizaciones')
    } finally {
      e.target.value = ''
    }
  }

  const removeCotizacion = (index: number) => {
    setCotizaciones(cotizaciones.filter((_, i) => i !== index))
  }

  const downloadCotizacion = (cot: Cotizacion) => {
    try {
      const link = document.createElement('a')
      link.href = cot.archivo
      link.download = cot.nombre
      link.click()
    } catch (error) {
      console.error('Error descargando cotización:', error)
      toast.error('Error al descargar')
    }
  }

  const viewCotizacion = (cot: Cotizacion) => {
    const newWindow = window.open()
    if (newWindow) {
      newWindow.document.write(`<iframe src="${cot.archivo}" style="width:100%;height:100%;border:none;"></iframe>`)
    }
  }

  // ============================================
  // Exportar PDF (nuevo)
  // ============================================
  const exportToPDF = () => {
    if (proyectos.length === 0) {
      toast.error('No hay proyectos para exportar')
      return
    }
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
      doc.setFontSize(14)
      doc.text('Planificación de Mantención — Tabla de Tareas', 40, 30)
      doc.setFontSize(9)
      doc.setTextColor(120)
      doc.text(`Generado: ${new Date().toLocaleString('es-CL')}  ·  Total: ${proyectos.length} proyectos`, 40, 46)

      const head = [['#', 'Descripción', 'Sector', 'Tipo', 'Prior.', 'Estado', 'Aprobación', 'Responsable', 'T.E.', 'Monto', 'Inicio', 'Término']]

      const rows = proyectos.map((p) => [
        extraerNumProyecto(p.nombre),
        extraerDescripcion(p.nombre),
        p.sector || p.ubicacion || '',
        p.tipoReparacion || p.categoria || '',
        p.prioridad || '',
        p.estado || '',
        p.estadoAprobacion || '',
        p.responsable || '',
        p.tiempoEstimado || '',
        p.monto ? formatCLP(p.monto) : (p.presProg ? formatCLP(p.presProg) : ''),
        formatDate(p.fechaInicio),
        formatDate(p.fechaFin),
      ])

      autoTable(doc, {
        head,
        body: rows,
        startY: 60,
        styles: { fontSize: 7, cellPadding: 3, overflow: 'linebreak' },
        headStyles: { fillColor: [15, 32, 64], textColor: 255, fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 130 },
          9: { halign: 'right' },
        },
        alternateRowStyles: { fillColor: [245, 247, 250] },
      })

      doc.save(`proyectos_${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success('PDF generado')
    } catch (error) {
      console.error('Error generando PDF:', error)
      toast.error('Error al generar PDF')
    }
  }

  // ============================================
  // Exportar Excel (nuevo, dynamic import)
  // ============================================
  const exportToExcel = async () => {
    if (proyectos.length === 0) {
      toast.error('No hay proyectos para exportar')
      return
    }
    try {
      const XLSX = await import('xlsx')
      const data = proyectos.map((p) => ({
        '#': extraerNumProyecto(p.nombre),
        'Descripción': extraerDescripcion(p.nombre),
        'Sector': p.sector || p.ubicacion || '',
        'Tipo': p.tipoReparacion || p.categoria || '',
        'Prioridad': p.prioridad || '',
        'Estado': p.estado || '',
        'Aprobación': p.estadoAprobacion || '',
        'Responsable': p.responsable || '',
        'Tiempo Estimado': p.tiempoEstimado || '',
        'Monto': p.monto ?? p.presProg ?? 0,
        'Fecha Inicio': p.fechaInicio || '',
        'Fecha Fin': p.fechaFin || '',
        'Fecha Inicio Real': p.fechaInicioReal || '',
        'Fecha Fin Real': p.fechaFinReal || '',
        'Avance %': p.avance,
        'Pres. Programado': p.presProg,
        'Pres. Usado': p.presUsado,
        'Comentarios': p.comentarios || '',
        'Tiene Fotos Antes': p.tieneFotosAntes ? 'Sí' : 'No',
        'Tiene Fotos Después': p.tieneFotosDespues ? 'Sí' : 'No',
        'Tiene Cotizaciones': p.tieneCotizaciones ? 'Sí' : 'No',
      }))
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Proyectos')
      XLSX.writeFile(wb, `proyectos_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('Excel generado')
    } catch (error) {
      console.error('Error generando Excel:', error)
      toast.error('Error al generar Excel')
    }
  }

  // ============================================
  // Enviar Solicitud de Compra (nuevo)
  // ============================================
  const enviarSolicitudCompra = async () => {
    if (!selectedProy) return
    if (!selectedProy.materiales || selectedProy.materiales.length === 0) {
      toast.error('El proyecto no tiene materiales para solicitar')
      return
    }
    setEnviandoSolicitud(true)
    try {
      const materialesSolicitud = selectedProy.materiales
        .filter((m) => (m.descripcion || '').trim() !== '')
        .map((m) => ({
          nombre: (m.descripcion || '').trim(),
          cantidad: Number(m.cantidad) || 0,
          unidad: m.unidad || 'unidad',
          precioEstimado: Number(m.precioUnit) || 0,
          total: Number(m.total) || (Number(m.cantidad) || 0) * (Number(m.precioUnit) || 0),
        }))

      if (materialesSolicitud.length === 0) {
        toast.error('No hay materiales válidos para crear la solicitud')
        setEnviandoSolicitud(false)
        return
      }

      const total = materialesSolicitud.reduce((acc, m) => acc + (m.total || 0), 0)

      const payload = {
        titulo: `Solicitud de compra para Proyecto - ${extraerDescripcion(selectedProy.nombre)}`.slice(0, 200),
        descripcion: `Solicitud generada automáticamente desde el Proyecto ${selectedProy.nombre}.`,
        prioridad: selectedProy.prioridad === 'Urgente' ? 'Alta' : (selectedProy.prioridad as 'Media' | 'Alta' | 'Baja' | 'Urgente') || 'Media',
        materiales: materialesSolicitud,
        totalEstimado: total,
        origenTipo: 'Proyecto',
        origenId: selectedProy.id,
        origenCodigo: selectedProy.nombre,
      }

      const res = await fetch('/api/solicitudes-compra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Error al crear la solicitud de compra')
      }
      const emailMsg = data?.emailSkipped
        ? ' (SMTP no configurado, email no enviado)'
        : data?.emailEnviado
          ? ' y email enviado'
          : ''
      toast.success(`Solicitud ${data.codigo} creada${emailMsg}`)
    } catch (error) {
      console.error('Error creando solicitud de compra:', error)
      toast.error(error instanceof Error ? error.message : 'Error al crear la solicitud de compra')
    } finally {
      setEnviandoSolicitud(false)
    }
  }

  // ============================================
  // Configurar Listas Desplegables (nuevo)
  // ============================================
  const openConfigListas = () => {
    setConfigTipo('sector')
    setNuevoValorLista('')
    setConfigListasOpen(true)
  }

  const addLista = async () => {
    const valor = nuevoValorLista.trim()
    if (!valor) {
      toast.error('Ingrese un valor')
      return
    }
    setConfigLoading(true)
    try {
      const res = await fetch('/api/listas-desplegables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: configTipo,
          valor,
          nombre: valor,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al crear')
      toast.success(`Valor "${valor}" agregado a la lista`)
      setNuevoValorLista('')
      await fetchListas()
    } catch (error) {
      console.error('Error agregando valor:', error)
      toast.error(error instanceof Error ? error.message : 'Error al agregar valor')
    } finally {
      setConfigLoading(false)
    }
  }

  const removeLista = async (id: string, valor: string) => {
    if (!confirm(`¿Desactivar el valor "${valor}"?`)) return
    setConfigLoading(true)
    try {
      const res = await fetch(`/api/listas-desplegables/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al desactivar')
      }
      toast.success(`Valor "${valor}" desactivado`)
      await fetchListas()
    } catch (error) {
      console.error('Error desactivando valor:', error)
      toast.error(error instanceof Error ? error.message : 'Error al desactivar')
    } finally {
      setConfigLoading(false)
    }
  }

  // ============================================
  // Totales
  // ============================================
  const totalMateriales = materiales.reduce((sum, m) => sum + (m.total || m.cantidad * m.precioUnit), 0)
  const totalPersonal = personal.reduce((sum, p) => sum + (p.total || p.precioUnit * p.cantidad), 0)
  const granTotal = totalMateriales + totalPersonal

  return (
    <div className="space-y-5">
      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={exportToPDF} title="Exportar a PDF">
          <FileDown className="w-4 h-4 mr-1" /> PDF
        </Button>
        <Button variant="outline" onClick={exportToExcel} title="Exportar a Excel">
          <FileSpreadsheet className="w-4 h-4 mr-1" /> Excel
        </Button>
        <Button variant="outline" onClick={openConfigListas} title="Configurar Listas Desplegables">
          <Settings className="w-4 h-4 mr-1" /> Configurar Listas
        </Button>
        <Button onClick={() => openDialog()}>
          <Plus className="w-4 h-4 mr-1" /> Nuevo Proyecto
        </Button>
      </div>

      {/* Table - Formato PDF: # | Descripción | Sector | Tipo | Prior. | Etapa | Estado | Aprobación | Responsable | T.E. | Monto | Inicio | Término | Adj. | Acc. */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Planificación de Mantención — Tabla de Tareas ({proyectos.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs whitespace-nowrap" style={{ minWidth: '1600px' }}>
              <thead>
                <tr className="border-b bg-[#0f2040] text-white">
                  <th className="text-center p-2 text-[10px] font-bold uppercase" style={{ width: '40px' }}>#</th>
                  <th className="text-left p-2 text-[10px] font-bold uppercase" style={{ minWidth: '200px' }}>Descripción</th>
                  <th className="text-left p-2 text-[10px] font-bold uppercase" style={{ minWidth: '100px' }}>Sector</th>
                  <th className="text-left p-2 text-[10px] font-bold uppercase" style={{ minWidth: '100px' }}>Tipo</th>
                  <th className="text-center p-2 text-[10px] font-bold uppercase" style={{ width: '60px' }}>Prior.</th>
                  <th className="text-left p-2 text-[10px] font-bold uppercase" style={{ minWidth: '120px' }}>Estado</th>
                  <th className="text-left p-2 text-[10px] font-bold uppercase" style={{ minWidth: '120px' }}>Aprobación</th>
                  <th className="text-left p-2 text-[10px] font-bold uppercase" style={{ minWidth: '100px' }}>Responsable</th>
                  <th className="text-center p-2 text-[10px] font-bold uppercase" style={{ width: '60px' }}>T.E.</th>
                  <th className="text-right p-2 text-[10px] font-bold uppercase" style={{ minWidth: '90px' }}>Monto</th>
                  <th className="text-center p-2 text-[10px] font-bold uppercase" style={{ width: '80px' }}>Inicio</th>
                  <th className="text-center p-2 text-[10px] font-bold uppercase" style={{ width: '80px' }}>Término</th>
                  <th className="text-center p-2 text-[10px] font-bold uppercase" style={{ width: '60px' }}>Adj.</th>
                  <th className="text-center p-2 text-[10px] font-bold uppercase" style={{ width: '70px' }}>Acc.</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={14} className="p-8 text-center text-slate-400">Cargando...</td></tr>
                ) : !proyectos || proyectos.length === 0 ? (
                  <tr><td colSpan={14} className="p-8 text-center text-slate-400">Sin proyectos</td></tr>
                ) : (
                  proyectos.map((proy, idx) => {
                    const sector = proy.sector || proy.ubicacion || '–'
                    const tipo = proy.tipoReparacion || proy.categoria || '–'
                    const prioridad = proy.prioridad || '–'
                    const aprobacion = proy.estadoAprobacion || '–'
                    const responsable = proy.responsable || '–'
                    const te = proy.tiempoEstimado || '–'
                    const monto = proy.monto || proy.presProg || 0
                    const totalAdj = (proy.tieneFotosAntes ? 1 : 0) + (proy.tieneFotosDespues ? 1 : 0) + (proy.tieneCotizaciones ? 1 : 0) + (proy.documentos?.length || 0)
                    return (
                      <tr key={proy.id} className={`border-b last:border-0 hover:bg-blue-50 cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`} onClick={() => openDetailDialog(proy)}>
                        <td className="text-center p-2 font-bold text-[#0f2040]">{extraerNumProyecto(proy.nombre)}</td>
                        <td className="p-2 font-medium max-w-[250px] truncate" title={extraerDescripcion(proy.nombre)}>{extraerDescripcion(proy.nombre)}</td>
                        <td className="p-2 text-slate-600">{sector}</td>
                        <td className="p-2 text-slate-600">{tipo}</td>
                        <td className="text-center p-2">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${prioridadColors[prioridad] || 'bg-slate-100 text-slate-600'}`}>{prioridad}</span>
                        </td>
                        <td className="text-center p-2">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${estadoBadgeColors[proy.estado] || 'bg-slate-100 text-slate-600'}`}>{proy.estado}</span>
                        </td>
                        <td className="p-2">
                          <span className={`text-[10px] ${aprobacionColors[aprobacion] || 'text-slate-500'}`}>{aprobacion}</span>
                        </td>
                        <td className="p-2 text-slate-600">{responsable}</td>
                        <td className="text-center p-2 text-slate-500">{te}</td>
                        <td className="text-right p-2 font-mono font-medium">{monto > 0 ? formatCLP(monto) : '–'}</td>
                        <td className="text-center p-2 text-slate-500">{formatDate(proy.fechaInicio)}</td>
                        <td className="text-center p-2 text-slate-500">{formatDate(proy.fechaFin)}</td>
                        <td className="text-center p-2">
                          {totalAdj > 0 ? (
                            <span className="inline-flex items-center gap-0.5 text-blue-600">
                              <Paperclip className="w-3 h-3" />{totalAdj}
                            </span>
                          ) : '–'}
                        </td>
                        <td className="p-2" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-center gap-0.5">
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="Editar" aria-label="Editar" onClick={() => openDialog(proy)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:text-red-700" title="Eliminar" aria-label="Eliminar" onClick={() => handleDelete(proy.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{selectedProy?.nombre}</DialogTitle>
          </DialogHeader>
          {selectedProy && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="min-w-0">
                  <Label className="text-xs text-slate-500">Sector</Label>
                  <p className="text-sm font-medium truncate">{selectedProy.sector || selectedProy.ubicacion || '–'}</p>
                </div>
                <div className="min-w-0">
                  <Label className="text-xs text-slate-500">Tipo</Label>
                  <p className="text-sm font-medium truncate">{selectedProy.tipoReparacion || selectedProy.categoria || '–'}</p>
                </div>
                <div className="min-w-0">
                  <Label className="text-xs text-slate-500">Prioridad</Label>
                  <Badge className={prioridadColors[selectedProy.prioridad || ''] || 'bg-slate-100'}>{selectedProy.prioridad || '–'}</Badge>
                </div>
                <div className="min-w-0">
                  <Label className="text-xs text-slate-500">Estado</Label>
                  <Badge className={estadoColors[selectedProy.estado] || 'bg-slate-100'}>{selectedProy.estado}</Badge>
                </div>
                <div className="min-w-0">
                  <Label className="text-xs text-slate-500">Aprobación</Label>
                  <p className={`text-sm ${aprobacionColors[selectedProy.estadoAprobacion || ''] || 'text-slate-500'}`}>{selectedProy.estadoAprobacion || '–'}</p>
                </div>
                <div className="min-w-0">
                  <Label className="text-xs text-slate-500">Responsable</Label>
                  <p className="text-sm font-medium truncate">{selectedProy.responsable || '–'}</p>
                </div>
                <div className="min-w-0">
                  <Label className="text-xs text-slate-500">Tiempo Estimado</Label>
                  <p className="text-sm font-medium truncate">{selectedProy.tiempoEstimado || '–'}</p>
                </div>
                <div className="min-w-0">
                  <Label className="text-xs text-slate-500">Monto</Label>
                  <p className="text-sm font-bold truncate">{(selectedProy.monto || selectedProy.presProg) > 0 ? formatCLP(selectedProy.monto || selectedProy.presProg) : '–'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="min-w-0">
                  <Label className="text-xs text-slate-500">Fecha Inicio Programada</Label>
                  <p className="text-sm">{formatDate(selectedProy.fechaInicio)}</p>
                </div>
                <div className="min-w-0">
                  <Label className="text-xs text-slate-500">Fecha Término Programada</Label>
                  <p className="text-sm">{formatDate(selectedProy.fechaFin)}</p>
                </div>
                <div className="min-w-0">
                  <Label className="text-xs text-slate-500">Fecha Inicio Real</Label>
                  <p className="text-sm">{formatDate(selectedProy.fechaInicioReal)}</p>
                </div>
                <div className="min-w-0">
                  <Label className="text-xs text-slate-500">Fecha Término Real</Label>
                  <p className="text-sm">{formatDate(selectedProy.fechaFinReal)}</p>
                </div>
              </div>

              <div>
                <Label className="text-xs text-slate-500">Avance</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={selectedProy.avance} className="h-2 flex-1" />
                  <span className="font-bold">{selectedProy.avance}%</span>
                </div>
              </div>

              {selectedProy.comentarios && (
                <div>
                  <Label className="text-xs text-slate-500">Comentarios</Label>
                  <p className="text-sm bg-slate-50 p-3 rounded whitespace-pre-wrap">{selectedProy.comentarios}</p>
                </div>
              )}

              {selectedProy.descripcion && (
                <div>
                  <Label className="text-xs text-slate-500">Descripción</Label>
                  <p className="text-sm bg-slate-50 p-3 rounded">{selectedProy.descripcion}</p>
                </div>
              )}

              <Separator />

              {/* Recursos del proyecto */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-slate-50 p-3 rounded min-w-0">
                  <Package className="w-5 h-5 mx-auto mb-1 text-slate-500" />
                  <div className="text-lg font-bold">{selectedProy.materiales?.length || 0}</div>
                  <div className="text-xs text-slate-500">Materiales</div>
                </div>
                <div className="bg-slate-50 p-3 rounded min-w-0">
                  <Wrench className="w-5 h-5 mx-auto mb-1 text-slate-500" />
                  <div className="text-lg font-bold">{selectedProy.herramientas?.length || 0}</div>
                  <div className="text-xs text-slate-500">Herramientas</div>
                </div>
                <div className="bg-slate-50 p-3 rounded min-w-0">
                  <CheckSquare className="w-5 h-5 mx-auto mb-1 text-slate-500" />
                  <div className="text-lg font-bold">{selectedProy.tareas?.length || 0}</div>
                  <div className="text-xs text-slate-500">Tareas</div>
                </div>
                <div className="bg-slate-50 p-3 rounded min-w-0">
                  <FileText className="w-5 h-5 mx-auto mb-1 text-slate-500" />
                  <div className="text-lg font-bold">{selectedProy.documentos?.length || 0}</div>
                  <div className="text-xs text-slate-500">Documentos</div>
                </div>
              </div>

              {/* Indicadores de fotos y cotizaciones */}
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className={`p-2 rounded border ${selectedProy.tieneFotosAntes ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                  <Camera className="w-4 h-4 mx-auto mb-1" />
                  Fotos Antes: {selectedProy.fotosAntesCount || 0}
                </div>
                <div className={`p-2 rounded border ${selectedProy.tieneFotosDespues ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                  <Camera className="w-4 h-4 mx-auto mb-1" />
                  Fotos Después: {selectedProy.fotosDespuesCount || 0}
                </div>
                <div className={`p-2 rounded border ${selectedProy.tieneCotizaciones ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                  <Paperclip className="w-4 h-4 mx-auto mb-1" />
                  Cotizaciones: {selectedProy.cotizacionesCount || 0}
                </div>
              </div>

              {/* Documentos adjuntos */}
              {selectedProy.documentos && selectedProy.documentos.length > 0 && (
                <div>
                  <Label className="text-xs text-slate-500 mb-2 block">Documentos Adjuntos</Label>
                  <div className="space-y-2">
                    {selectedProy.documentos.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between bg-slate-50 p-2 rounded gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
                          <div className="min-w-0 flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium truncate">{doc.nombre}</span>
                            <Badge className={`${documentoTipoColors[doc.tipo] || 'bg-slate-100'}`}>{doc.tipo}</Badge>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => viewDocumento(doc)} className="shrink-0">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>Cerrar</Button>
            <Button
              variant="secondary"
              onClick={enviarSolicitudCompra}
              disabled={enviandoSolicitud}
              title="Crea una Solicitud de Compra con los materiales del proyecto"
            >
              <ShoppingCart className="w-4 h-4 mr-1" />
              {enviandoSolicitud ? 'Enviando...' : 'Enviar Solicitud de Compra'}
            </Button>
            <Button onClick={() => { setDetailDialogOpen(false); openDialog(selectedProy!); }}>
              <Pencil className="w-4 h-4 mr-1" /> Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{editingProy ? 'Editar' : 'Nuevo'} Proyecto</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid grid-cols-8 w-full h-9">
              <TabsTrigger value="general" className="text-xs">General</TabsTrigger>
              <TabsTrigger value="materiales" className="text-xs">Materiales</TabsTrigger>
              <TabsTrigger value="herramientas" className="text-xs">Herramientas</TabsTrigger>
              <TabsTrigger value="tareas" className="text-xs">Tareas</TabsTrigger>
              <TabsTrigger value="personal" className="text-xs">Personal</TabsTrigger>
              <TabsTrigger value="fotos" className="text-xs">Fotos</TabsTrigger>
              <TabsTrigger value="cotizaciones" className="text-xs">Cotizaciones</TabsTrigger>
              <TabsTrigger value="documentos" className="text-xs">Adjuntos</TabsTrigger>
            </TabsList>

            <div className="py-4">
              {/* General Tab */}
              <TabsContent value="general" className="space-y-4 mt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 min-w-0">
                    <Label>Nombre</Label>
                    <Input value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className="w-full" />
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label>Categoría</Label>
                    <Select value={formData.categoria} onValueChange={(v) => setFormData({ ...formData, categoria: v })}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Áreas Verdes', 'Eléctrico', 'Sanitario', 'Infraestructura', 'Seguridad', 'Administración', 'Otro'].map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Nuevos campos: Sector / Tipo de Reparación / Prioridad / Estado */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-2 min-w-0">
                    <Label>Sector</Label>
                    <Select value={formData.sector} onValueChange={(v) => setFormData({ ...formData, sector: v })}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        {listas.sector.map((l) => (
                          <SelectItem key={l.id} value={l.valor}>{l.valor}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label>Tipo de Reparación</Label>
                    <Select value={formData.tipoReparacion} onValueChange={(v) => setFormData({ ...formData, tipoReparacion: v })}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        {listas.tipoReparacion.map((l) => (
                          <SelectItem key={l.id} value={l.valor}>{l.valor}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label>Prioridad</Label>
                    <Select value={formData.prioridad} onValueChange={(v) => setFormData({ ...formData, prioridad: v })}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        {listas.prioridad.map((l) => (
                          <SelectItem key={l.id} value={l.valor}>{l.valor}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label>Estado</Label>
                    <Select value={formData.estado} onValueChange={(v) => setFormData({ ...formData, estado: v })}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {listas.estadoProyecto.length > 0 ? (
                          listas.estadoProyecto.map((l) => (
                            <SelectItem key={l.id} value={l.valor}>{l.valor}</SelectItem>
                          ))
                        ) : (
                          ['Planificado', 'En Ejecución', 'Completado', 'Cancelado', 'Pausado'].map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label>Estado de Aprobación</Label>
                    <Select value={formData.estadoAprobacion} onValueChange={(v) => setFormData({ ...formData, estadoAprobacion: v })}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      <SelectContent>
                        {listas.estadoAprobacion.map((l) => (
                          <SelectItem key={l.id} value={l.valor}>{l.valor}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label>Responsable</Label>
                    <Input value={formData.responsable} onChange={(e) => setFormData({ ...formData, responsable: e.target.value })} className="w-full" placeholder="Nombre del responsable" />
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label>Tiempo Estimado</Label>
                    <Input value={formData.tiempoEstimado} onChange={(e) => setFormData({ ...formData, tiempoEstimado: e.target.value })} className="w-full" placeholder="Ej: 3 días" />
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label>Monto ($)</Label>
                    <Input type="number" value={formData.monto} onChange={(e) => setFormData({ ...formData, monto: parseFloat(e.target.value) || 0 })} className="w-full text-right" />
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label>Ubicación</Label>
                    <Input value={formData.ubicacion} onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })} className="w-full" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 min-w-0">
                    <Label>Presupuesto Programado ($)</Label>
                    <Input type="number" value={formData.presProg} onChange={(e) => setFormData({ ...formData, presProg: parseFloat(e.target.value) || 0 })} className="w-full text-right" />
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label>Presupuesto Usado (calculado) ($)</Label>
                    <Input type="number" value={granTotal} disabled className="w-full bg-slate-100 text-right" />
                    <p className="text-xs text-slate-500">Se calcula desde materiales y personal</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Avance: {formData.avance}%</Label>
                  <input type="range" min="0" max="100" value={formData.avance} onChange={(e) => setFormData({ ...formData, avance: parseInt(e.target.value) })} className="w-full" />
                </div>

                {/* Fechas programadas */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 min-w-0">
                    <Label>Fecha Inicio Programada</Label>
                    <Input type="date" value={formData.fechaInicio} onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })} className="w-full" />
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label>Fecha Término Programada</Label>
                    <Input type="date" value={formData.fechaFin} onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })} className="w-full" />
                  </div>
                </div>

                {/* Fechas reales */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 min-w-0">
                    <Label>Fecha Inicio Real</Label>
                    <Input type="date" value={formData.fechaInicioReal} onChange={(e) => setFormData({ ...formData, fechaInicioReal: e.target.value })} className="w-full" />
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label>Fecha Término Real</Label>
                    <Input type="date" value={formData.fechaFinReal} onChange={(e) => setFormData({ ...formData, fechaFinReal: e.target.value })} className="w-full" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea value={formData.descripcion} onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} className="w-full" />
                </div>
                <div className="space-y-2">
                  <Label>Notas</Label>
                  <Textarea value={formData.notas} onChange={(e) => setFormData({ ...formData, notas: e.target.value })} className="w-full" />
                </div>
                <div className="space-y-2">
                  <Label>Comentarios</Label>
                  <Textarea value={formData.comentarios} onChange={(e) => setFormData({ ...formData, comentarios: e.target.value })} className="w-full" placeholder="Comentarios internos del proyecto..." />
                </div>
              </TabsContent>

              {/* Materiales Tab */}
              <TabsContent value="materiales" className="space-y-4 mt-0">
                <div className="flex justify-between items-center">
                  <Label>Materiales</Label>
                  <Button size="sm" onClick={addMaterial}><Plus className="w-4 h-4 mr-1" /> Agregar</Button>
                </div>
                {materiales.length > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 px-2 pb-1 border-b">
                      <div className="col-span-4 text-[10px] font-bold text-slate-500 uppercase">Descripción</div>
                      <div className="col-span-2 text-[10px] font-bold text-slate-500 uppercase">Cantidad</div>
                      <div className="col-span-2 text-[10px] font-bold text-slate-500 uppercase">Unidad</div>
                      <div className="col-span-2 text-[10px] font-bold text-slate-500 uppercase text-right">Precio Unit.</div>
                      <div className="col-span-1 text-[10px] font-bold text-slate-500 uppercase text-right">Total</div>
                      <div className="col-span-1"></div>
                    </div>
                    {materiales.map((m, i) => (
                      <div key={m.id} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded">
                        <div className="col-span-4 min-w-0">
                          <Input value={m.descripcion} onChange={(e) => updateMaterial(i, 'descripcion', e.target.value)} className="h-8 w-full" placeholder="Descripción" />
                        </div>
                        <div className="col-span-2 min-w-0">
                          <Input type="number" value={m.cantidad} onChange={(e) => updateMaterial(i, 'cantidad', parseFloat(e.target.value) || 0)} className="h-8 w-full text-right" placeholder="0" />
                        </div>
                        <div className="col-span-2 min-w-0">
                          <Input value={m.unidad} onChange={(e) => updateMaterial(i, 'unidad', e.target.value)} className="h-8 w-full" placeholder="unidad" />
                        </div>
                        <div className="col-span-2 min-w-0">
                          <Input type="number" value={m.precioUnit} onChange={(e) => updateMaterial(i, 'precioUnit', parseFloat(e.target.value) || 0)} className="h-8 w-full text-right" placeholder="$0" />
                        </div>
                        <div className="col-span-1 min-w-0">
                          <div className="h-8 px-1 py-1.5 bg-slate-200 rounded text-xs font-bold text-right truncate">{formatCLP(m.total)}</div>
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => removeMaterial(i)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-end pt-2 border-t">
                      <div className="text-sm font-bold">Total Materiales: <span className="text-red-600">{formatCLP(totalMateriales)}</span></div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Sin materiales agregados</p>
                  </div>
                )}
              </TabsContent>

              {/* Herramientas Tab */}
              <TabsContent value="herramientas" className="space-y-4 mt-0">
                <div className="flex justify-between items-center">
                  <Label>Herramientas</Label>
                  <Button size="sm" onClick={addHerramienta}><Plus className="w-4 h-4 mr-1" /> Agregar</Button>
                </div>
                {herramientas.length > 0 ? (
                  <div className="space-y-2">
                    {herramientas.map((h, i) => (
                      <div key={h.id} className="grid grid-cols-6 gap-3 items-end bg-slate-50 p-2 rounded">
                        <div className="col-span-4 min-w-0">
                          <Label className="text-[10px]">Nombre</Label>
                          <Input value={h.nombre} onChange={(e) => updateHerramienta(i, 'nombre', e.target.value)} className="h-8 w-full" />
                        </div>
                        <div className="col-span-1 min-w-0">
                          <Label className="text-[10px]">Cantidad</Label>
                          <Input type="number" value={h.cantidad} onChange={(e) => updateHerramienta(i, 'cantidad', parseInt(e.target.value) || 1)} className="h-8 w-full text-center" />
                        </div>
                        <div className="col-span-1 min-w-0 flex justify-center items-end pb-0.5">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => removeHerramienta(i)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Wrench className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Sin herramientas agregadas</p>
                  </div>
                )}
              </TabsContent>

              {/* Tareas Tab */}
              <TabsContent value="tareas" className="space-y-4 mt-0">
                <div className="flex justify-between items-center">
                  <Label>Tareas</Label>
                  <Button size="sm" onClick={addTarea}><Plus className="w-4 h-4 mr-1" /> Agregar</Button>
                </div>
                {tareas.length > 0 ? (
                  <div className="space-y-2">
                    {tareas.map((t, i) => (
                      <div key={t.id} className="grid grid-cols-6 gap-3 items-end bg-slate-50 p-2 rounded">
                        <div className="col-span-3 min-w-0">
                          <Label className="text-[10px]">Descripción</Label>
                          <Input value={t.descripcion} onChange={(e) => updateTarea(i, 'descripcion', e.target.value)} className="h-8 w-full" />
                        </div>
                        <div className="col-span-1 min-w-0">
                          <Label className="text-[10px]">Cantidad</Label>
                          <Input type="number" value={t.cantidad} onChange={(e) => updateTarea(i, 'cantidad', parseInt(e.target.value) || 1)} className="h-8 w-full text-center" />
                        </div>
                        <div className="col-span-1 min-w-0">
                          <Label className="text-[10px]">Estado</Label>
                          <Select value={t.estado} onValueChange={(v) => updateTarea(i, 'estado', v)}>
                            <SelectTrigger className="h-8 w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {['Pendiente', 'En Progreso', 'Completado'].map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-1 min-w-0 flex justify-center items-end pb-0.5">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => removeTarea(i)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <CheckSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Sin tareas agregadas</p>
                  </div>
                )}
              </TabsContent>

              {/* Personal Tab */}
              <TabsContent value="personal" className="space-y-4 mt-0">
                <div className="flex justify-between items-center">
                  <Label>Personal</Label>
                  <Button size="sm" onClick={addPersonal}><Plus className="w-4 h-4 mr-1" /> Agregar</Button>
                </div>
                {personal.length > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 px-2 pb-1 border-b">
                      <div className="col-span-3 text-[10px] font-bold text-slate-500 uppercase">Nombre</div>
                      <div className="col-span-2 text-[10px] font-bold text-slate-500 uppercase">Tipo</div>
                      <div className="col-span-2 text-[10px] font-bold text-slate-500 uppercase text-right">Cantidad</div>
                      <div className="col-span-2 text-[10px] font-bold text-slate-500 uppercase text-right">Precio Unit.</div>
                      <div className="col-span-2 text-[10px] font-bold text-slate-500 uppercase text-right">Total</div>
                      <div className="col-span-1"></div>
                    </div>
                    {personal.map((p, i) => (
                      <div key={p.id} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded">
                        <div className="col-span-3 min-w-0">
                          <Input value={p.nombre} onChange={(e) => updatePersonal(i, 'nombre', e.target.value)} className="h-8 w-full" placeholder="Nombre" />
                        </div>
                        <div className="col-span-2 min-w-0">
                          <Select value={p.tipo} onValueChange={(v) => updatePersonal(i, 'tipo', v)}>
                            <SelectTrigger className="h-8 w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Interno">Interno</SelectItem>
                              <SelectItem value="Externo">Externo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2 min-w-0">
                          <Input type="number" value={p.cantidad} onChange={(e) => updatePersonal(i, 'cantidad', parseInt(e.target.value) || 1)} className="h-8 w-full text-right" placeholder="1" />
                        </div>
                        <div className="col-span-2 min-w-0">
                          <Input type="number" value={p.precioUnit} onChange={(e) => updatePersonal(i, 'precioUnit', parseFloat(e.target.value) || 0)} className="h-8 w-full text-right" placeholder="$0" />
                        </div>
                        <div className="col-span-2 min-w-0">
                          <div className="h-8 px-2 py-1.5 bg-slate-200 rounded text-xs font-bold text-right truncate">{formatCLP(p.total)}</div>
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => removePersonal(i)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-end pt-2 border-t">
                      <div className="text-sm font-bold">Total Personal: <span className="text-red-600">{formatCLP(totalPersonal)}</span></div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Sin personal agregado</p>
                  </div>
                )}
              </TabsContent>

              {/* Fotos Tab (nuevo) */}
              <TabsContent value="fotos" className="space-y-4 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Fotos Antes */}
                  <div className="space-y-3 min-w-0">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Camera className="w-4 h-4" /> Fotos Antes ({fotosAntes.length})
                      </Label>
                      <label className="cursor-pointer">
                        <span className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 h-8 px-3">
                          <Upload className="w-3.5 h-3.5 mr-1" /> Subir
                        </span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFotosChange(e, 'antes')}
                        />
                      </label>
                    </div>
                    {fotosAntes.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {fotosAntes.map((foto, i) => (
                          <div key={i} className="relative group aspect-square bg-slate-100 rounded overflow-hidden border">
                            <img src={foto} alt={`Antes ${i + 1}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeFoto(i, 'antes')}
                              className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Eliminar"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-400 border-2 border-dashed rounded">
                        <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">Sin fotos antes</p>
                      </div>
                    )}
                  </div>

                  {/* Fotos Después */}
                  <div className="space-y-3 min-w-0">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Camera className="w-4 h-4" /> Fotos Después ({fotosDespues.length})
                      </Label>
                      <label className="cursor-pointer">
                        <span className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-green-600 text-white hover:bg-green-700 h-8 px-3">
                          <Upload className="w-3.5 h-3.5 mr-1" /> Subir
                        </span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFotosChange(e, 'despues')}
                        />
                      </label>
                    </div>
                    {fotosDespues.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {fotosDespues.map((foto, i) => (
                          <div key={i} className="relative group aspect-square bg-slate-100 rounded overflow-hidden border">
                            <img src={foto} alt={`Después ${i + 1}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeFoto(i, 'despues')}
                              className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Eliminar"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-400 border-2 border-dashed rounded">
                        <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p className="text-xs">Sin fotos después</p>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Las imágenes se guardan como base64 en la base de datos. Tamaño máximo: 3MB por imagen.
                </p>
              </TabsContent>

              {/* Cotizaciones Tab (nuevo) */}
              <TabsContent value="cotizaciones" className="space-y-4 mt-0">
                <div className="flex justify-between items-center">
                  <Label>Cotizaciones y Documentos</Label>
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors bg-purple-600 text-white hover:bg-purple-700 h-8 px-3">
                      <Upload className="w-3.5 h-3.5 mr-1" /> Subir Cotización
                    </span>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,image/*"
                      className="hidden"
                      onChange={handleCotizacionesChange}
                    />
                  </label>
                </div>
                {cotizaciones.length > 0 ? (
                  <div className="space-y-2">
                    {cotizaciones.map((cot, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-50 p-3 rounded gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{cot.nombre}</p>
                            <p className="text-[10px] text-slate-500">{cot.tipo}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => viewCotizacion(cot)} title="Ver">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => downloadCotizacion(cot)} title="Descargar">
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => removeCotizacion(i)} title="Eliminar">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Sin cotizaciones adjuntas</p>
                    <p className="text-xs mt-1">Sube cotizaciones en PDF o imágenes (máx 5MB)</p>
                  </div>
                )}
              </TabsContent>

              {/* Documentos Tab (sistema existente) */}
              <TabsContent value="documentos" className="space-y-4 mt-0">
                <div className="flex justify-between items-center">
                  <Label>Documentos Adjuntos (Cotizaciones, Respaldos, etc.)</Label>
                  <Button size="sm" onClick={addDocumento}><Upload className="w-4 h-4 mr-1" /> Subir Archivo</Button>
                </div>
                {documentos.length > 0 ? (
                  <div className="space-y-2">
                    {documentos.map((d, i) => (
                      <div key={d.id} className="bg-slate-50 p-3 rounded">
                        <div className="grid grid-cols-12 gap-3 items-end">
                          <div className="col-span-4 min-w-0">
                            <Label className="text-[10px]">Nombre del archivo</Label>
                            <Input value={d.nombre} onChange={(e) => updateDocumento(i, 'nombre', e.target.value)} className="h-8 w-full" />
                          </div>
                          <div className="col-span-2 min-w-0">
                            <Label className="text-[10px]">Tipo</Label>
                            <Select value={d.tipo} onValueChange={(v) => updateDocumento(i, 'tipo', v)}>
                              <SelectTrigger className="h-8 w-full"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cotizacion">Cotización</SelectItem>
                                <SelectItem value="respaldo">Respaldo</SelectItem>
                                <SelectItem value="contrato">Contrato</SelectItem>
                                <SelectItem value="factura">Factura</SelectItem>
                                <SelectItem value="otro">Otro</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-4 min-w-0">
                            <Label className="text-[10px]">Descripción</Label>
                            <Input value={d.descripcion || ''} onChange={(e) => updateDocumento(i, 'descripcion', e.target.value)} className="h-8 w-full" />
                          </div>
                          <div className="col-span-1 min-w-0 flex justify-center items-end pb-0.5">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => viewDocumento(d)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="col-span-1 min-w-0 flex justify-center items-end pb-0.5">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => removeDocumento(i)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Sin documentos adjuntos</p>
                    <p className="text-xs mt-1">Sistema legacy de documentos. Para cotizaciones PDF/imágenes usar la pestaña Cotizaciones.</p>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>

          {/* Resumen de totales */}
          <div className="bg-slate-50 p-4 rounded-lg border mt-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="min-w-0">
                <span className="text-xs text-slate-500">Total Materiales</span>
                <p className="font-bold text-slate-700">{formatCLP(totalMateriales)}</p>
              </div>
              <div className="min-w-0">
                <span className="text-xs text-slate-500">Total Personal</span>
                <p className="font-bold text-slate-700">{formatCLP(totalPersonal)}</p>
              </div>
              <div className="min-w-0">
                <span className="text-xs text-slate-500">Gran Total</span>
                <p className="font-bold text-red-600 text-lg">{formatCLP(granTotal)}</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar Proyecto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Configurar Listas Desplegables Dialog */}
      <Dialog open={configListasOpen} onOpenChange={setConfigListasOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Settings className="w-5 h-5" /> Configurar Listas Desplegables
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2 min-w-0">
              <Label>Tipo de Lista</Label>
              <Select value={configTipo} onValueChange={(v) => setConfigTipo(v)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS_LISTA.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Agregar nuevo valor */}
            <div className="flex gap-2">
              <Input
                value={nuevoValorLista}
                onChange={(e) => setNuevoValorLista(e.target.value)}
                placeholder="Nuevo valor..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addLista()
                  }
                }}
              />
              <Button onClick={addLista} disabled={configLoading}>
                <Plus className="w-4 h-4 mr-1" /> Agregar
              </Button>
            </div>

            <Separator />

            {/* Lista de valores actuales */}
            <div className="space-y-2">
              <Label>Valores actuales ({listas[configTipo]?.length || 0})</Label>
              {listas[configTipo]?.length > 0 ? (
                <div className="space-y-1 max-h-[400px] overflow-y-auto">
                  {listas[configTipo].map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-slate-50 p-2 rounded border">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium">{item.valor}</span>
                        {!item.activo && (
                          <Badge className="bg-slate-200 text-slate-600">Inactivo</Badge>
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-600 shrink-0"
                        onClick={() => removeLista(item.id, item.valor)}
                        disabled={configLoading}
                        title="Desactivar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400">
                  <Settings className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Sin valores para esta lista</p>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-500">
              Los valores desactivados no aparecerán en los dropdowns del formulario de proyectos.
              Si un proyecto ya usa ese valor, se conservará en la base de datos.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigListasOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
