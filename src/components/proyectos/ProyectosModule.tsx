'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
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
  FileSpreadsheet, FileDown, Camera, Image as ImageIcon,
  ShoppingCart, Link2, FolderKanban, HardHat, CheckCircle, XCircle,
  BarChart3,
} from 'lucide-react'
import { toast } from 'sonner'
import { TableroIndicadores } from '@/components/ui/tablero-indicadores'
import { verDocumentoEnVentana } from '@/lib/utils'

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
  linkCompra: string
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

interface PersonalItem {
  id: string
  nombre: string
  cargo?: string | null
  estado?: string | null
  sueldoBase?: number
}

// Item del catálogo de materiales (CatMaterial)
interface CatalogoMaterial {
  id: string
  codigo: string | null
  nombre: string
  unidad: string
  precioUnit: number
  categoria: string
  imagenUrl?: string | null
  fuente?: string | null
}

// Item del catálogo de herramientas (CatHerramienta)
interface CatalogoHerramienta {
  id: string
  codigo: string | null
  nombre: string
  marca: string | null
  valorReposicion: number
  imagenUrl?: string | null
}

interface Proyecto {
  id: string
  codigo?: string | null
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
  tipoTrabajo?: string | null
  prioridad?: string | null
  estadoAprobacion?: string | null
  responsable?: string | null
  responsableExterno?: string | null
  tiempoEstimado?: string | null
  monto?: number
  fechaInicioReal?: string | null
  fechaFinReal?: string | null
  comentarios?: string | null
  fotosAntes?: string | null
  fotosDespues?: string | null
  cotizaciones?: string | null
  centroCostoId?: string | null
  centroCosto?: { id: string; codigo: string; nombre: string } | null
  tieneFotosAntes?: boolean
  tieneFotosDespues?: boolean
  tieneCotizaciones?: boolean
  fotosAntesCount?: number
  fotosDespuesCount?: number
  cotizacionesCount?: number
  _count?: {
    materiales?: number
    herramientas?: number
    tareas?: number
    personal?: number
    documentos?: number
  }
}

// ============================================
// Listas desplegables (hardcodeadas, editables en código)
// ============================================
const SECTORES = [
  'Activos',
  'Club House',
  'Av. Principal',
  'Áreas Verdes',
  'Portería',
  'Canchas',
  'Piscina',
  'Parque Inundable',
  'Quincho',
  'Casino',
  'Gimnasio',
  'Otros',
]

const TIPOS_REPARACION = [
  'Seguridad',
  'Impermeabilización',
  'Pavimentación',
  'Electricidad',
  'Plomería',
  'Carpintería',
  'Pintura',
  'Jardinería',
  'Techado',
  'Revestimiento',
  'Equipamiento',
  'Otros',
]

const TIPOS_TRABAJO = [
  'Mantención Preventiva',
  'Mantención Correctiva',
  'Reparación',
  'Instalación',
  'Construcción',
  'Remodelación',
  'Inspección',
  'Limpieza Profunda',
  'Pintura',
  'Impermeabilización',
  'Poda / Jardinería',
  'Reparación Eléctrica',
  'Reparación Sanitaria',
  'Reparación Estructural',
  'Otros',
]

const PRIORIDADES = ['Alta', 'Media', 'Baja']

const ESTADOS_PROYECTO = [
  'Planificado',
  'En Ejecución',
  'Completado',
  'Cancelado',
  'Pausado',
]

// Etapas del flujo de aprobación/compra de un proyecto.
// Reemplaza al antiguo "Estado de Aprobación" (Pendiente/Aprobado/En espera/Rechazado/Aprobado por Supervisor).
// Sigue la misma taxonomía que Solicitudes de Compra para consistencia.
const ETAPAS_PROYECTO = [
  'Sin etapa',
  'Presupuesto',
  'Coordinación con Proveedor',
  'Estudio de Materiales',
  'Preparación de Compra',
  'Completado',
]

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

function extraerCodigoProyecto(nombre: string): string {
  const m = nombre.match(/#\d+/)
  return m ? m[0] : ''
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
  'En Ejecución': 'bg-amber-100 text-amber-700 border-amber-200',
  'Completado': 'bg-green-100 text-green-700 border-green-200',
  'Cancelado': 'bg-red-100 text-red-700 border-red-200',
  'Pausado': 'bg-slate-100 text-slate-700 border-slate-200',
}

// Colores para cada etapa del flujo del proyecto.
// Reemplaza al antiguo mapa `aprobacionColors` (basado en estados Pendiente/Aprobado/Rechazado).
const etapaColors: Record<string, string> = {
  'Sin etapa': 'text-slate-500 font-medium',
  'Presupuesto': 'text-blue-600 font-medium',
  'Coordinación con Proveedor': 'text-amber-600 font-medium',
  'Estudio de Materiales': 'text-purple-600 font-medium',
  'Preparación de Compra': 'text-orange-600 font-medium',
  'Completado': 'text-green-600 font-medium',
}

const prioridadColors: Record<string, string> = {
  'Alta': 'bg-red-100 text-red-700',
  'Media': 'bg-amber-100 text-amber-700',
  'Baja': 'bg-green-100 text-green-700',
  'Urgente': 'bg-red-200 text-red-800',
}

const estadoColors: Record<string, string> = {
  'Planificado': 'bg-blue-100 text-blue-700',
  'En Ejecución': 'bg-amber-100 text-amber-700',
  'Completado': 'bg-green-100 text-green-700',
  'Cancelado': 'bg-red-100 text-red-700',
  'Pausado': 'bg-slate-100 text-slate-700',
}

const documentoTipoColors: Record<string, string> = {
  'cotizacion': 'bg-blue-100 text-blue-700',
  'respaldo': 'bg-green-100 text-green-700',
  'contrato': 'bg-purple-100 text-purple-700',
  'factura': 'bg-amber-100 text-amber-700',
  'otro': 'bg-slate-100 text-slate-700',
}

// ============================================
// Component
// ============================================
export function ProyectosModule() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [personalList, setPersonalList] = useState<PersonalItem[]>([])
  const [catalogoMateriales, setCatalogoMateriales] = useState<CatalogoMaterial[]>([])
  const [catalogoHerramientas, setCatalogoHerramientas] = useState<CatalogoHerramienta[]>([])
  const [showGantt, setShowGantt] = useState(false)
  const [ganttFiltroEtapa, setGanttFiltroEtapa] = useState<string>('todas')
  const [ganttFiltroEstado, setGanttFiltroEstado] = useState<string>('todos')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [editingProy, setEditingProy] = useState<Proyecto | null>(null)
  const [selectedProy, setSelectedProy] = useState<Proyecto | null>(null)

  // Filtro por estado (dropdown) y vista por pestañas (Activos / Histórico / Todos)
  const [filtroEstado, setFiltroEstado] = useState<string>('all')
  const [vistaActiva, setVistaActiva] = useState<'activos' | 'completados' | 'todos'>('activos')

  // Diálogo de Informe de Costos
  const [informeDialogOpen, setInformeDialogOpen] = useState(false)
  const [informeFilters, setInformeFilters] = useState({
    fechaDesde: '',
    fechaHasta: '',
    sector: 'all',
    tipoReparacion: 'all',
    centroCosto: 'all',
    responsable: 'all',
  })

  // Ordenamiento
  const [sortField, setSortField] = useState<string>('prioridad')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

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
    tipoTrabajo: '',
    prioridad: '',
    estadoAprobacion: '',
    responsable: '',
    responsableExterno: '',
    tiempoEstimado: '',
    monto: 0,
    fechaInicioReal: '',
    fechaFinReal: '',
    comentarios: '',
    centroCostoId: '',
  })

  // Centros de costo disponibles
  const [centrosCosto, setCentrosCosto] = useState<{ id: string; codigo: string; nombre: string }[]>([])

  // Cargar centros de costo al montar
  useEffect(() => {
    fetch('/api/centros-costo')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const lista = Array.isArray(data) ? data : (data.centros || data.data || [])
        setCentrosCosto(lista.map((cc: any) => ({ id: cc.id, codigo: cc.codigo, nombre: cc.nombre })))
      })
      .catch(() => {})
  }, [])

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

  // Mapa de prioridad a número para ordenar (Alta=1, Media=2, Baja=3)
  const PRIORIDAD_ORDER: Record<string, number> = { 'Alta': 1, 'Media': 2, 'Baja': 3 }

  // Proyectos ordenados según sortField y sortDirection
  const proyectosOrdenados = useMemo(() => {
    if (!proyectos.length) return []
    const sorted = [...proyectos]
    sorted.sort((a: any, b: any) => {
      let valA = a[sortField]
      let valB = b[sortField]

      // Si es prioridad, usar el mapa numérico
      if (sortField === 'prioridad') {
        valA = PRIORIDAD_ORDER[valA] ?? 99
        valB = PRIORIDAD_ORDER[valB] ?? 99
      }
      // Si es monto o número, comparar numéricamente
      else if (sortField === 'monto' || sortField === 'presProg' || sortField === 'presUsado' || sortField === 'avance') {
        valA = Number(valA) || 0
        valB = Number(valB) || 0
      }
      // Si es string, comparar alfabéticamente
      else {
        valA = String(valA || '').toLowerCase()
        valB = String(valB || '').toLowerCase()
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [proyectos, sortField, sortDirection])

  // Proyectos filtrados según la vista activa (activos vs completados vs todos)
  // y el filtro por estado del dropdown
  const proyectosFiltrados = useMemo(() => {
    let lista = proyectosOrdenados

    // 1. Filtro por vista activa
    if (vistaActiva === 'activos') {
      // Activos: todo excepto Completado y Cancelado
      lista = lista.filter((p) => p.estado !== 'Completado' && p.estado !== 'Cancelado')
    } else if (vistaActiva === 'completados') {
      // Histórico: solo Completado
      lista = lista.filter((p) => p.estado === 'Completado')
    }
    // 'todos' = sin filtro de vista

    // 2. Filtro por estado del dropdown
    if (filtroEstado !== 'all') {
      lista = lista.filter((p) => p.estado === filtroEstado)
    }

    return lista
  }, [proyectosOrdenados, vistaActiva, filtroEstado])

  // Contadores por estado para mostrar en las pestañas
  const proyectosStats = useMemo(() => {
    const activos = proyectos.filter((p) => p.estado !== 'Completado' && p.estado !== 'Cancelado').length
    const completados = proyectos.filter((p) => p.estado === 'Completado').length
    const todos = proyectos.length
    return { activos, completados, todos }
  }, [proyectos])

  // Lista de TODOS los proyectos para el informe de costos (con filtros aplicados)
  // Indistinto del estado de avance (Completado, En Ejecución, Planificado, etc.)
  const proyectosInforme = useMemo(() => {
    let lista = [...proyectos]

    // Filtro por fecha (fechaInicio, fechaFin o fechaFinReal)
    if (informeFilters.fechaDesde) {
      lista = lista.filter((p) => {
        const fecha = p.fechaFinReal || p.fechaFin || p.fechaInicio || ''
        return fecha >= informeFilters.fechaDesde
      })
    }
    if (informeFilters.fechaHasta) {
      lista = lista.filter((p) => {
        const fecha = p.fechaFinReal || p.fechaFin || p.fechaInicio || ''
        return fecha <= informeFilters.fechaHasta
      })
    }

    // Filtro por sector
    if (informeFilters.sector !== 'all') {
      lista = lista.filter((p) => (p.sector || p.ubicacion || '') === informeFilters.sector)
    }

    // Filtro por tipo de reparación
    if (informeFilters.tipoReparacion !== 'all') {
      lista = lista.filter((p) => (p.tipoReparacion || p.categoria || '') === informeFilters.tipoReparacion)
    }

    // Filtro por responsable
    if (informeFilters.responsable !== 'all') {
      lista = lista.filter((p) => (p.responsable || '') === informeFilters.responsable)
    }

    return lista
  }, [proyectos, informeFilters])

  // Totales del informe
  const informeTotales = useMemo(() => {
    const totalProyectos = proyectosInforme.length
    const totalMonto = proyectosInforme.reduce((acc, p) => acc + (p.monto || p.presProg || 0), 0)
    const totalPresUsado = proyectosInforme.reduce((acc, p) => acc + (p.presUsado || 0), 0)
    const totalMateriales = proyectosInforme.reduce(
      (acc, p) => acc + (p.materiales?.reduce((s, m) => s + (m.total || 0), 0) || 0),
      0,
    )
    const totalPersonal = proyectosInforme.reduce(
      (acc, p) => acc + (p.personal?.reduce((s, x) => s + (x.total || 0), 0) || 0),
      0,
    )

    // Agrupación por sector
    const porSector: Record<string, { count: number; monto: number }> = {}
    proyectosInforme.forEach((p) => {
      const key = p.sector || p.ubicacion || 'Sin sector'
      if (!porSector[key]) porSector[key] = { count: 0, monto: 0 }
      porSector[key].count++
      porSector[key].monto += p.monto || p.presProg || 0
    })

    // Agrupación por tipo
    const porTipo: Record<string, { count: number; monto: number }> = {}
    proyectosInforme.forEach((p) => {
      const key = p.tipoReparacion || p.categoria || 'Sin tipo'
      if (!porTipo[key]) porTipo[key] = { count: 0, monto: 0 }
      porTipo[key].count++
      porTipo[key].monto += p.monto || p.presProg || 0
    })

    // Agrupación por mes (basado en fechaFinReal o fechaFin)
    const porMes: Record<string, { count: number; monto: number }> = {}
    proyectosInforme.forEach((p) => {
      const fecha = p.fechaFinReal || p.fechaFin || ''
      const mes = fecha ? fecha.substring(0, 7) : 'Sin fecha' // YYYY-MM
      if (!porMes[mes]) porMes[mes] = { count: 0, monto: 0 }
      porMes[mes].count++
      porMes[mes].monto += p.monto || p.presProg || 0
    })

    // Agrupación por responsable
    const porResponsable: Record<string, { count: number; monto: number }> = {}
    proyectosInforme.forEach((p) => {
      const key = p.responsable || 'Sin responsable'
      if (!porResponsable[key]) porResponsable[key] = { count: 0, monto: 0 }
      porResponsable[key].count++
      porResponsable[key].monto += p.monto || p.presProg || 0
    })

    return {
      totalProyectos,
      totalMonto,
      totalPresUsado,
      totalMateriales,
      totalPersonal,
      porSector,
      porTipo,
      porMes,
      porResponsable,
    }
  }, [proyectosInforme])

  // Lista única de responsables para el filtro del informe
  const responsablesUnicos = useMemo(() => {
    const set = new Set<string>()
    proyectos.forEach((p) => {
      if (p.responsable) set.add(p.responsable)
    })
    return Array.from(set).sort()
  }, [proyectos])

  // Exportar informe a CSV
  const exportarInformeCSV = () => {
    const headers = [
      'Código',
      'Descripción',
      'Sector',
      'Tipo Reparación',
      'Responsable',
      'Fecha Inicio',
      'Fecha Fin Real',
      'Monto Presupuestado',
      'Presupuesto Usado',
      'Materiales',
      'Personal',
      'Avance %',
    ]

    const rows = proyectosInforme.map((p) => [
      extraerCodigoProyecto(p.nombre),
      extraerDescripcion(p.nombre),
      p.sector || p.ubicacion || '',
      p.tipoReparacion || p.categoria || '',
      p.responsable || '',
      p.fechaInicio || '',
      p.fechaFinReal || p.fechaFin || '',
      p.monto || p.presProg || 0,
      p.presUsado || 0,
      p.materiales?.reduce((s, m) => s + (m.total || 0), 0) || 0,
      p.personal?.reduce((s, x) => s + (x.total || 0), 0) || 0,
      p.avance || 0,
    ])

    const csvContent = [headers, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `informe_costos_proyectos_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Informe exportado: ${proyectosInforme.length} proyectos(es)`)
  }

  // Exportar informe a PDF (tabla resumida)
  const exportarInformePDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 10

      // Header corporativo
      doc.setFillColor(15, 32, 64)
      doc.rect(0, 0, pageWidth, 20, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Informe de Costos — Proyectos Completados', margin, 12)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(
        `Generado: ${new Date().toLocaleString('es-CL')}  ·  ${proyectosInforme.length} proyecto(s)`,
        margin,
        17,
      )

      // Filtros aplicados
      let yPos = 26
      doc.setTextColor(80, 80, 80)
      doc.setFontSize(8)
      const filtrosText = [
        `Fecha desde: ${informeFilters.fechaDesde || '—'}`,
        `Fecha hasta: ${informeFilters.fechaHasta || '—'}`,
        `Sector: ${informeFilters.sector === 'all' ? 'Todos' : informeFilters.sector}`,
        `Tipo: ${informeFilters.tipoReparacion === 'all' ? 'Todos' : informeFilters.tipoReparacion}`,
        `Responsable: ${informeFilters.responsable === 'all' ? 'Todos' : informeFilters.responsable}`,
      ].join('   ·   ')
      doc.text(filtrosText, margin, yPos)
      yPos += 6

      // Resumen de totales
      doc.setFillColor(245, 245, 245)
      doc.rect(margin, yPos, pageWidth - margin * 2, 14, 'F')
      doc.setTextColor(15, 32, 64)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(
        `TOTAL: ${formatCLP(informeTotales.totalMonto)}  |  Materiales: ${formatCLP(informeTotales.totalMateriales)}  |  Personal: ${formatCLP(informeTotales.totalPersonal)}  |  Presupuesto Usado: ${formatCLP(informeTotales.totalPresUsado)}`,
        margin + 2,
        yPos + 9,
      )
      yPos += 20

      // Tabla de proyectos
      const headers = ['#', 'Descripción', 'Sector', 'Tipo', 'Resp.', 'Fecha Fin', 'Monto']
      const colWidths = [12, 80, 35, 35, 35, 30, 35]
      const tableWidth = colWidths.reduce((a, b) => a + b, 0)

      // Cabecera de tabla
      doc.setFillColor(15, 32, 64)
      doc.rect(margin, yPos, tableWidth, 7, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      let xPos = margin + 2
      headers.forEach((h, i) => {
        doc.text(h, xPos, yPos + 5)
        xPos += colWidths[i]
      })
      yPos += 7

      // Filas
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(40, 40, 40)
      doc.setFontSize(7)

      proyectosInforme.forEach((p, idx) => {
        if (yPos > 190) {
          doc.addPage()
          yPos = 20
        }
        if (idx % 2 === 0) {
          doc.setFillColor(245, 247, 250)
          doc.rect(margin, yPos, tableWidth, 6, 'F')
        }
        const rowData = [
          extraerNumProyecto(p.nombre),
          extraerDescripcion(p.nombre).substring(0, 50),
          (p.sector || p.ubicacion || '').substring(0, 20),
          (p.tipoReparacion || p.categoria || '').substring(0, 20),
          (p.responsable || '').substring(0, 20),
          formatDate(p.fechaFinReal || p.fechaFin),
          formatCLP(p.monto || p.presProg || 0),
        ]
        xPos = margin + 2
        rowData.forEach((cell, i) => {
          doc.text(String(cell), xPos, yPos + 4)
          xPos += colWidths[i]
        })
        yPos += 6
      })

      // Resumen por sector (en nueva página)
      doc.addPage()
      yPos = 26
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(15, 32, 64)
      doc.text('Resumen por Sector', margin, yPos)
      yPos += 8
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      Object.entries(informeTotales.porSector).forEach(([sector, data]) => {
        doc.text(`${sector}: ${data.count} proyecto(s) — ${formatCLP(data.monto)}`, margin, yPos)
        yPos += 5
      })

      yPos += 5
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text('Resumen por Tipo de Reparación', margin, yPos)
      yPos += 8
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      Object.entries(informeTotales.porTipo).forEach(([tipo, data]) => {
        doc.text(`${tipo}: ${data.count} proyecto(s) — ${formatCLP(data.monto)}`, margin, yPos)
        yPos += 5
      })

      yPos += 5
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text('Resumen por Mes', margin, yPos)
      yPos += 8
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      Object.entries(informeTotales.porMes)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([mes, data]) => {
          doc.text(`${mes}: ${data.count} proyecto(s) — ${formatCLP(data.monto)}`, margin, yPos)
          yPos += 5
        })

      doc.save(`informe_costos_proyectos_${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success('Informe PDF generado')
    } catch (error) {
      console.error('Error generando PDF:', error)
      toast.error('Error al generar PDF')
    }
  }

  // Toggle de ordenamiento: click en header
  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Icono de dirección de ordenamiento
  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <span className="text-slate-300 ml-0.5">↕</span>
    return <span className="text-white ml-0.5">{sortDirection === 'asc' ? '↑' : '↓'}</span>
  }

  const fetchPersonal = useCallback(async () => {
    try {
      const res = await fetch('/api/personal')
      const data = await res.json()
      if (Array.isArray(data)) {
        setPersonalList(
          data
            .filter((p: any) => p.nombre)
            .map((p: any) => ({
              id: p.id,
              nombre: p.nombre,
              cargo: p.cargo,
              estado: p.estado,
              sueldoBase: p.sueldoBase || 0,
            }))
        )
      }
    } catch (error) {
      console.error('Error fetching personal:', error)
    }
  }, [])

  // Cargar catálogos de materiales y herramientas
  const fetchCatalogos = useCallback(async () => {
    try {
      const [matRes, herrRes] = await Promise.all([
        fetch('/api/catalogos/materiales'),
        fetch('/api/catalogos/herramientas'),
      ])
      const matData = await matRes.json()
      const herrData = await herrRes.json()
      const mats = Array.isArray(matData) ? matData : (matData?.data || [])
      const herrs = Array.isArray(herrData) ? herrData : (herrData?.data || [])
      setCatalogoMateriales(mats)
      setCatalogoHerramientas(herrs)
    } catch (error) {
      console.error('Error fetching catálogos:', error)
    }
  }, [])

  // Calcular valor por hora del personal: sueldoBase / 30 días / 8 horas
  const getValorHora = (personalId: string | undefined): number => {
    if (!personalId) return 0
    const p = personalList.find(x => x.id === personalId || x.nombre === personalId)
    if (!p || !p.sueldoBase) return 0
    return Math.round(p.sueldoBase / 30 / 8)
  }

  useEffect(() => {
    void (async () => {
      await fetchProyectos()
      await fetchPersonal()
      await fetchCatalogos()
    })()
  }, [fetchProyectos, fetchPersonal, fetchCatalogos])

  useEffect(() => {
    const timeout = setTimeout(() => fetchProyectos(search), 300)
    return () => clearTimeout(timeout)
  }, [search, fetchProyectos])

  // ============================================
  // Dialog openers
  // ============================================
  const openDialog = async (proyParam?: Proyecto) => {
    if (proyParam) {
      setEditingProy(proyParam)
      // Cargar el detalle completo del proyecto (con materiales, tareas, etc.)
      // El listado ya no incluye estas relaciones (optimización BD)
      let fotosAntesData: string[] = []
      let fotosDespuesData: string[] = []
      let cotizacionesData: Cotizacion[] = []
      let proy: Proyecto = proyParam

      try {
        const res = await fetch(`/api/proyectos/${proyParam.id}`)
        if (res.ok) {
          const detail = await res.json()
          proy = detail
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
        tipoTrabajo: proy.tipoTrabajo || '',
        prioridad: proy.prioridad || '',
        estadoAprobacion: proy.estadoAprobacion || '',
        responsable: proy.responsable || '',
        responsableExterno: proy.responsableExterno || '',
        tiempoEstimado: proy.tiempoEstimado || '',
        monto: proy.monto ?? 0,
        fechaInicioReal: proy.fechaInicioReal || '',
        fechaFinReal: proy.fechaFinReal || '',
        comentarios: proy.comentarios || '',
        centroCostoId: proy.centroCostoId || '',
      })
      setMateriales((proy.materiales || []).map((m) => ({ ...m, linkCompra: m.linkCompra || '' })))
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
        tipoTrabajo: '',
        prioridad: '',
        estadoAprobacion: '',
        responsable: '',
        responsableExterno: '',
        tiempoEstimado: '',
        monto: 0,
        fechaInicioReal: '',
        fechaFinReal: '',
        comentarios: '',
        centroCostoId: '',
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

  const openDetailDialog = async (proy: Proyecto) => {
    // Cargar detalle completo (con documentos, materiales, etc.)
    try {
      const res = await fetch(`/api/proyectos/${proy.id}`)
      if (res.ok) {
        setSelectedProy(await res.json())
      } else {
        setSelectedProy(proy)
      }
    } catch (e) {
      setSelectedProy(proy)
    }
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
      // Limpiar IDs de recursos (Prisma genera nuevos cuid() en createMany)
      materiales: materiales.map(({ id, ...rest }) => rest),
      herramientas: herramientas.map(({ id, ...rest }) => rest),
      tareas: tareas.map(({ id, ...rest }) => rest),
      personal: personal.map(({ id, ...rest }) => rest),
      documentos: documentos.map(({ id, ...rest }) => rest),
      // Solo enviar fotos/cotizaciones si hay datos nuevos
      // (evita sobreescribir fotos existentes con array vacío)
      ...(fotosAntes.length > 0 ? { fotosAntes } : {}),
      ...(fotosDespues.length > 0 ? { fotosDespues } : {}),
      ...(cotizaciones.length > 0 ? { cotizaciones } : {}),
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
      linkCompra: '',
    }])
  }

  // Seleccionar material del catálogo y autocompletar campos
  const selectMaterialFromCatalog = (index: number, materialId: string) => {
    const mat = catalogoMateriales.find(m => m.id === materialId)
    if (!mat) return
    const updated = [...materiales]
    updated[index] = {
      ...updated[index],
      descripcion: mat.nombre,
      unidad: mat.unidad,
      precioUnit: mat.precioUnit,
      total: updated[index].cantidad * mat.precioUnit,
      linkCompra: '',
    }
    setMateriales(updated)
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

  // Seleccionar herramienta del catálogo
  const selectHerramientaFromCatalog = (index: number, herramientaId: string) => {
    const herr = catalogoHerramientas.find(h => h.id === herramientaId)
    if (!herr) return
    const updated = [...herramientas]
    updated[index] = { ...updated[index], nombre: herr.nombre + (herr.marca ? ` (${herr.marca})` : '') }
    setHerramientas(updated)
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

  // Al seleccionar personal del dropdown, cargar valor por hora automáticamente
  const selectPersonal = (index: number, nombre: string) => {
    const valorHora = getValorHora(nombre)
    const updated = [...personal]
    updated[index] = {
      ...updated[index],
      nombre: nombre,
      precioUnit: valorHora,
      total: valorHora * updated[index].cantidad,
    }
    setPersonal(updated)
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
    verDocumentoEnVentana(doc.archivo, doc.nombre || 'documento.pdf')
  }

  // ============================================
  // Fotos handlers
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
  // Cotizaciones handlers
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
    verDocumentoEnVentana(cot.archivo, `cotizacion-${cot.nombre || Date.now()}.pdf`)
  }

  // ============================================
  // Exportar PDF (dynamic import)
  // ============================================
  const exportToPDF = async () => {
    if (proyectos.length === 0) {
      toast.error('No hay proyectos para exportar')
      return
    }
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

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
        p.estadoAprobacion || 'Sin etapa',
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
  // Exportar Excel (dynamic import)
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
        'Etapa': p.estadoAprobacion || 'Sin etapa',
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
  // Exportar un solo proyecto a PDF (con todos los datos)
  // ============================================
  const exportProyectoToPdf = async (proy: Proyecto) => {
    try {
      toast.info('Generando PDF del proyecto...')

      // Fetch the full detail (includes fotosAntes / fotosDespues / cotizaciones)
      let fotosAntes: string[] = []
      let fotosDespues: string[] = []
      let materialesPdf: ProyectoMaterial[] = proy.materiales || []
      let personalPdf: ProyectoPersonal[] = proy.personal || []
      let tareasPdf: ProyectoTarea[] = proy.tareas || []
      let herramientasPdf: ProyectoHerramienta[] = proy.herramientas || []
      try {
        const res = await fetch(`/api/proyectos/${proy.id}`)
        if (res.ok) {
          const detail = await res.json()
          fotosAntes = parseJsonArray<string>(detail.fotosAntes)
          fotosDespues = parseJsonArray<string>(detail.fotosDespues)
          if (Array.isArray(detail.materiales)) materialesPdf = detail.materiales
          if (Array.isArray(detail.personal)) personalPdf = detail.personal
          if (Array.isArray(detail.tareas)) tareasPdf = detail.tareas
          if (Array.isArray(detail.herramientas)) herramientasPdf = detail.herramientas
        }
      } catch (e) {
        console.warn('No se pudo obtener detalle completo del proyecto para PDF:', e)
      }

      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 12
      let y = 14

      // ---------- Header ----------
      doc.setFillColor(15, 32, 64) // #0f2044
      doc.rect(margin, y, pageWidth - margin * 2, 18, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(15)
      doc.setFont('helvetica', 'bold')
      const codigoProy = extraerCodigoProyecto(proy.nombre) || `PROY-${proy.id.slice(-4)}`
      doc.text(`PROYECTO ${codigoProy}`, margin + 4, y + 8)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(
        `Generado: ${new Date().toLocaleString('es-CL')}`,
        pageWidth - margin - 4,
        y + 8,
        { align: 'right' }
      )
      doc.setFontSize(8)
      doc.text('Condominio LAGUNA NORTE', pageWidth - margin - 4, y + 14, {
        align: 'right',
      })
      y += 22

      // ---------- Nombre del proyecto ----------
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(15, 32, 64)
      const nombreLines = doc.splitTextToSize(
        extraerDescripcion(proy.nombre),
        pageWidth - margin * 2
      )
      doc.text(nombreLines, margin, y)
      y += nombreLines.length * 5 + 2

      // ---------- Info section ----------
      const infoRows: [string, string][] = [
        ['Sector', proy.sector || proy.ubicacion || '–'],
        ['Tipo', proy.tipoReparacion || proy.categoria || '–'],
        ['Prioridad', proy.prioridad || '–'],
        ['Estado', proy.estado || '–'],
        ['Etapa', proy.estadoAprobacion || 'Sin etapa'],
        ['Responsable', proy.responsable || '–'],
        ['Tiempo Estimado', proy.tiempoEstimado || '–'],
        ['Monto', (proy.monto || proy.presProg) > 0 ? formatCLP(proy.monto || proy.presProg) : '–'],
        ['Fecha Inicio', formatDate(proy.fechaInicio)],
        ['Fecha Término', formatDate(proy.fechaFin)],
        ['Avance', `${proy.avance ?? 0}%`],
        ['Pres. Programado', proy.presProg ? formatCLP(proy.presProg) : '–'],
        ['Pres. Usado', proy.presUsado ? formatCLP(proy.presUsado) : '–'],
      ]

      autoTable(doc, {
        startY: y,
        body: infoRows,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
        columnStyles: {
          0: {
            cellWidth: 45,
            fontStyle: 'bold',
            fillColor: [241, 245, 249],
            textColor: [15, 32, 64],
          },
          1: { cellWidth: 'auto' },
        },
        margin: { left: margin, right: margin },
      })
      y = (doc as any).lastAutoTable.finalY + 4

      // ---------- Comentarios ----------
      if (proy.comentarios) {
        if (y > pageHeight - 30) {
          doc.addPage()
          y = 14
        }
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(15, 32, 64)
        doc.text('Comentarios:', margin, y + 3)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(20, 20, 20)
        const cLines = doc.splitTextToSize(proy.comentarios, pageWidth - margin * 2)
        doc.text(cLines, margin, y + 8)
        y += 8 + cLines.length * 4 + 2
      }

      // ---------- Descripción ----------
      if (proy.descripcion) {
        if (y > pageHeight - 30) {
          doc.addPage()
          y = 14
        }
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(15, 32, 64)
        doc.text('Descripción:', margin, y + 3)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(20, 20, 20)
        const dLines = doc.splitTextToSize(proy.descripcion, pageWidth - margin * 2)
        doc.text(dLines, margin, y + 8)
        y += 8 + dLines.length * 4 + 2
      }

      // ---------- Materiales ----------
      if (materialesPdf.length > 0) {
        if (y > pageHeight - 40) {
          doc.addPage()
          y = 14
        }
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(15, 32, 64)
        doc.text(`Materiales (${materialesPdf.length})`, margin, y + 3)
        y += 6
        autoTable(doc, {
          startY: y,
          head: [['#', 'Descripción', 'Cant.', 'Unidad', 'P. Unit', 'Total']],
          body: materialesPdf.map((m, i) => [
            String(i + 1),
            m.descripcion || '',
            String(m.cantidad ?? 0),
            m.unidad || 'unidad',
            formatCLP(m.precioUnit),
            formatCLP(m.total),
          ]),
          foot: [
            [
              '',
              '',
              '',
              '',
              'Total',
              formatCLP(materialesPdf.reduce((s, m) => s + (m.total || m.cantidad * m.precioUnit), 0)),
            ],
          ],
          theme: 'striped',
          styles: { fontSize: 8, cellPadding: 1.5, overflow: 'linebreak' },
          headStyles: { fillColor: [15, 32, 64], textColor: 255, fontSize: 8 },
          footStyles: { fillColor: [254, 243, 199], textColor: [180, 83, 9], fontStyle: 'bold' },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 18, halign: 'center' },
            3: { cellWidth: 20, halign: 'center' },
            4: { cellWidth: 28, halign: 'right' },
            5: { cellWidth: 28, halign: 'right' },
          },
          margin: { left: margin, right: margin },
        })
        y = (doc as any).lastAutoTable.finalY + 4
      }

      // ---------- Personal ----------
      if (personalPdf.length > 0) {
        if (y > pageHeight - 40) {
          doc.addPage()
          y = 14
        }
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(15, 32, 64)
        doc.text(`Personal (${personalPdf.length})`, margin, y + 3)
        y += 6
        autoTable(doc, {
          startY: y,
          head: [['#', 'Nombre', 'Tipo', 'Cant.', 'P. Unit', 'Total']],
          body: personalPdf.map((p, i) => [
            String(i + 1),
            p.nombre || '',
            p.tipo || 'Interno',
            String(p.cantidad ?? 0),
            formatCLP(p.precioUnit),
            formatCLP(p.total),
          ]),
          foot: [
            [
              '',
              '',
              '',
              '',
              'Total',
              formatCLP(personalPdf.reduce((s, p) => s + (p.total || p.precioUnit * p.cantidad), 0)),
            ],
          ],
          theme: 'striped',
          styles: { fontSize: 8, cellPadding: 1.5, overflow: 'linebreak' },
          headStyles: { fillColor: [15, 32, 64], textColor: 255, fontSize: 8 },
          footStyles: { fillColor: [254, 243, 199], textColor: [180, 83, 9], fontStyle: 'bold' },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 22, halign: 'center' },
            3: { cellWidth: 18, halign: 'center' },
            4: { cellWidth: 28, halign: 'right' },
            5: { cellWidth: 28, halign: 'right' },
          },
          margin: { left: margin, right: margin },
        })
        y = (doc as any).lastAutoTable.finalY + 4
      }

      // ---------- Tareas ----------
      if (tareasPdf.length > 0) {
        if (y > pageHeight - 40) {
          doc.addPage()
          y = 14
        }
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(15, 32, 64)
        doc.text(`Tareas (${tareasPdf.length})`, margin, y + 3)
        y += 6
        autoTable(doc, {
          startY: y,
          head: [['#', 'Descripción', 'Cant.', 'Estado']],
          body: tareasPdf.map((t, i) => [
            String(i + 1),
            t.descripcion || '',
            String(t.cantidad ?? 0),
            t.estado || 'Pendiente',
          ]),
          theme: 'striped',
          styles: { fontSize: 8, cellPadding: 1.5, overflow: 'linebreak' },
          headStyles: { fillColor: [15, 32, 64], textColor: 255, fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 22, halign: 'center' },
            3: { cellWidth: 30, halign: 'center' },
          },
          margin: { left: margin, right: margin },
        })
        y = (doc as any).lastAutoTable.finalY + 4
      }

      // ---------- Herramientas ----------
      if (herramientasPdf.length > 0) {
        if (y > pageHeight - 40) {
          doc.addPage()
          y = 14
        }
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(15, 32, 64)
        doc.text(`Herramientas (${herramientasPdf.length})`, margin, y + 3)
        y += 6
        autoTable(doc, {
          startY: y,
          head: [['#', 'Nombre', 'Cantidad']],
          body: herramientasPdf.map((h, i) => [
            String(i + 1),
            h.nombre || '',
            String(h.cantidad ?? 0),
          ]),
          theme: 'striped',
          styles: { fontSize: 8, cellPadding: 1.5, overflow: 'linebreak' },
          headStyles: { fillColor: [15, 32, 64], textColor: 255, fontSize: 8 },
          columnStyles: {
            0: { cellWidth: 12, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 28, halign: 'center' },
          },
          margin: { left: margin, right: margin },
        })
        y = (doc as any).lastAutoTable.finalY + 4
      }

      // ---------- Fotos ----------
      const renderPhotoSection = (title: string, photos: string[]) => {
        if (!photos || photos.length === 0) return
        if (y > pageHeight - 40) {
          doc.addPage()
          y = 14
        }
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(15, 32, 64)
        doc.text(`${title} (${photos.length})`, margin, y + 4)
        y += 8

        const imgW = (pageWidth - margin * 2 - 6) / 3 // 3 per row
        const imgH = imgW * 0.75
        const startY = y

        photos.forEach((photo, idx) => {
          const col = idx % 3
          const row = Math.floor(idx / 3)
          const x = margin + col * (imgW + 3)
          let py = startY + row * (imgH + 3)
          if (py + imgH > pageHeight - 14) {
            doc.addPage()
            y = 14
            py = 14
            // Restart row positioning on new page
            const newX = margin
            try {
              doc.addImage(photo, 'JPEG' /* will be auto-detected */, newX, py, imgW, imgH)
            } catch (err) {
              console.warn('addImage failed:', err)
            }
            y = py + imgH + 3
            return
          }
          try {
            // jsPDF auto-detects PNG/JPEG from data URL
            doc.addImage(photo, 'PNG', x, py, imgW, imgH)
          } catch {
            // Retry with JPEG if PNG failed
            try {
              doc.addImage(photo, 'JPEG', x, py, imgW, imgH)
            } catch (err2) {
              console.warn('addImage failed (PNG and JPEG):', err2)
            }
          }
        })

        const totalRows = Math.ceil(photos.length / 3)
        y = startY + totalRows * (imgH + 3) + 4
      }

      renderPhotoSection('Fotos Antes', fotosAntes)
      renderPhotoSection('Fotos Después', fotosDespues)

      // ---------- Footer (on every page) ----------
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(120, 120, 120)
        doc.setFont('helvetica', 'normal')
        const footerText = 'Condominio LAGUNA NORTE · Asesorías Integrales CyJ'
        doc.text(footerText, pageWidth / 2, pageHeight - 6, { align: 'center' })
        doc.text(`Pág. ${i}/${pageCount}`, pageWidth - margin, pageHeight - 6, {
          align: 'right',
        })
      }

      const safeCodigo = codigoProy.replace(/[^a-zA-Z0-9-_]/g, '')
      doc.save(`proyecto_${safeCodigo || proy.id}.pdf`)
      toast.success('PDF generado')
    } catch (error) {
      console.error('Error generando PDF del proyecto:', error)
      toast.error('Error al generar PDF del proyecto')
    }
  }

  // ============================================
  // Enviar Solicitud de Compra
  // ============================================
  const enviarSolicitudCompra = async () => {
    if (!selectedProy) return
    if (!selectedProy.materiales || selectedProy.materiales.length === 0) {
      toast.error('El proyecto no tiene materiales para solicitar')
      return
    }
    setEnviandoSolicitud(true)
    try {
      const codigoProy = extraerCodigoProyecto(selectedProy.nombre) // "#NN"
      const descripcionProy = extraerDescripcion(selectedProy.nombre)

      const materialesSolicitud = selectedProy.materiales
        .filter((m) => (m.descripcion || '').trim() !== '')
        .map((m) => ({
          nombre: (m.descripcion || '').trim(),
          cantidad: Number(m.cantidad) || 0,
          unidad: m.unidad || 'unidad',
          precioEstimado: Number(m.precioUnit) || 0,
          total: Number(m.total) || (Number(m.cantidad) || 0) * (Number(m.precioUnit) || 0),
          linkCompra: m.linkCompra || '',
        }))

      if (materialesSolicitud.length === 0) {
        toast.error('No hay materiales válidos para crear la solicitud')
        setEnviandoSolicitud(false)
        return
      }

      // Recopilar todos los linkCompra no vacíos en un array de links
      const links = selectedProy.materiales
        .map((m) => (m.linkCompra || '').trim())
        .filter((l) => l !== '')

      const total = materialesSolicitud.reduce((acc, m) => acc + (m.total || 0), 0)

      const payload = {
        titulo: `Proyecto ${codigoProy} - ${descripcionProy}`.slice(0, 200).trim(),
        descripcion:
          selectedProy.descripcion ||
          `Solicitud generada desde el Proyecto ${selectedProy.nombre}.`,
        prioridad:
          (selectedProy.prioridad === 'Urgente'
            ? 'Alta'
            : (selectedProy.prioridad as 'Media' | 'Alta' | 'Baja' | 'Urgente')) ||
          'Media',
        materiales: materialesSolicitud,
        totalEstimado: total,
        origenTipo: 'Proyecto',
        origenId: selectedProy.id,
        origenCodigo: codigoProy,
        links,
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
          ? ' y email enviado a administracionlagunanorte@gmail.com'
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
  // Totales
  // ============================================
  const totalMateriales = materiales.reduce((sum, m) => sum + (m.total || m.cantidad * m.precioUnit), 0)
  const totalPersonal = personal.reduce((sum, p) => sum + (p.total || p.precioUnit * p.cantidad), 0)
  const granTotal = totalMateriales + totalPersonal

  return (
    <div className="space-y-5">
      <TableroIndicadores
        cards={[
          { titulo: 'Total Proyectos', numero: proyectos.length, icon: <FolderKanban className="w-5 h-5" />, color: 'primary' },
          { titulo: 'En Ejecución', numero: proyectos.filter(p => p.estado === 'En Ejecución').length, icon: <HardHat className="w-5 h-5" />, color: 'azul' },
          { titulo: 'Completados', numero: proyectos.filter(p => p.estado === 'Completado').length, icon: <CheckCircle className="w-5 h-5" />, color: 'verde' },
          { titulo: 'Cancelados', numero: proyectos.filter(p => p.estado === 'Cancelado').length, icon: <XCircle className="w-5 h-5" />, color: 'rojo' },
        ]}
      />
      {/* Pestañas de vista: Activos / Completados / Todos */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
          <button
            onClick={() => setVistaActiva('activos')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              vistaActiva === 'activos' ? 'bg-[#0f2044] text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            En Proceso ({proyectosStats.activos})
          </button>
          <button
            onClick={() => setVistaActiva('completados')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              vistaActiva === 'completados' ? 'bg-green-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Histórico Completados ({proyectosStats.completados})
          </button>
          <button
            onClick={() => setVistaActiva('todos')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              vistaActiva === 'todos' ? 'bg-slate-700 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Todos ({proyectosStats.todos})
          </button>
        </div>

        {/* Filtro por estado */}
        <div className="flex items-center gap-2 ml-auto">
          <label className="text-xs text-slate-500">Filtrar estado:</label>
          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {ESTADOS_PROYECTO.map((est) => (
                <SelectItem key={est} value={est}>{est}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

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
        <Button variant="outline" onClick={() => setInformeDialogOpen(true)} title="Informe de Costos de Proyectos Completados" className="border-green-300 text-green-700 hover:bg-green-50">
          <FileSpreadsheet className="w-4 h-4 mr-1" /> Informe de Costos
        </Button>
        <Button variant="outline" onClick={() => setShowGantt(!showGantt)} title="Ver/Ocultar diagrama Gantt" className="border-purple-300 text-purple-700 hover:bg-purple-50">
          <BarChart3 className="w-4 h-4 mr-1" /> Gantt
        </Button>
        <Button variant="outline" onClick={exportToPDF} title="Exportar a PDF">
          <FileDown className="w-4 h-4 mr-1" /> Exportar PDF
        </Button>
        <Button variant="outline" onClick={exportToExcel} title="Exportar a Excel">
          <FileSpreadsheet className="w-4 h-4 mr-1" /> Exportar Excel
        </Button>
        <Button onClick={() => openDialog()}>
          <Plus className="w-4 h-4 mr-1" /> Nuevo Proyecto
        </Button>
      </div>

      {/* ===== DIAGRAMA GANTT ===== */}
      {showGantt && (
        <Card>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-600" />
                Diagrama de Gantt — Cronograma de Proyectos
              </CardTitle>
              {/* Filtros del Gantt */}
              <div className="flex items-center gap-2">
                <Select value={ganttFiltroEtapa} onValueChange={setGanttFiltroEtapa}>
                  <SelectTrigger className="h-7 w-44 text-xs">
                    <SelectValue placeholder="Etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas las etapas</SelectItem>
                    <SelectItem value="Sin etapa">Sin etapa</SelectItem>
                    <SelectItem value="Presupuesto">Presupuesto</SelectItem>
                    <SelectItem value="Coordinación con Proveedor">Coordinación con Proveedor</SelectItem>
                    <SelectItem value="Estudio de Materiales">Estudio de Materiales</SelectItem>
                    <SelectItem value="Preparación de Compra">Preparación de Compra</SelectItem>
                    <SelectItem value="Completado">Completado</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={ganttFiltroEstado} onValueChange={setGanttFiltroEstado}>
                  <SelectTrigger className="h-7 w-36 text-xs">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los estados</SelectItem>
                    <SelectItem value="Planificado">Planificado</SelectItem>
                    <SelectItem value="En Ejecución">En Ejecución</SelectItem>
                    <SelectItem value="Completado">Completado</SelectItem>
                    <SelectItem value="Cancelado">Cancelado</SelectItem>
                    <SelectItem value="Pausado">Pausado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {(() => {
                // Usar TODOS los proyectos (no proyectosFiltrados) y aplicar filtros propios del Gantt
                let proysGantt = [...proyectos]

                // Filtro por etapa
                if (ganttFiltroEtapa !== 'todas') {
                  proysGantt = proysGantt.filter(p =>
                    (p.estadoAprobacion || 'Sin etapa') === ganttFiltroEtapa
                  )
                }

                // Filtro por estado
                if (ganttFiltroEstado !== 'todos') {
                  proysGantt = proysGantt.filter(p => p.estado === ganttFiltroEstado)
                }

                // Solo proyectos con al menos una fecha
                const proysConFechas = proysGantt.filter(p => p.fechaInicio || p.fechaFin)

                if (proysConFechas.length === 0) {
                  return (
                    <div className="p-8 text-center text-slate-400 text-sm">
                      <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      Sin proyectos con fechas para los filtros seleccionados.
                      <br />
                      <span className="text-xs">Cambia los filtros o asigna fechas a los proyectos.</span>
                    </div>
                  )
                }

                // Encontrar rango de fechas
                const fechas = proysConFechas.flatMap(p => [p.fechaInicio, p.fechaFin].filter(Boolean).map(f => new Date(f).getTime()))
                let minFecha = new Date(Math.min(...fechas))
                let maxFecha = new Date(Math.max(...fechas))
                minFecha.setDate(minFecha.getDate() - 2)
                maxFecha.setDate(maxFecha.getDate() + 2)
                const totalDias = Math.max(1, Math.ceil((maxFecha - minFecha) / (1000 * 60 * 60 * 24)))

                // Colores por estado
                const estadoColors: Record<string, string> = {
                  'Planificado': 'bg-blue-500',
                  'En Ejecución': 'bg-amber-500',
                  'Completado': 'bg-green-500',
                  'Cancelado': 'bg-red-400',
                  'Pausado': 'bg-slate-400',
                }

                // Colores por etapa (borde izquierdo)
                const etapaBorderColors: Record<string, string> = {
                  'Sin etapa': 'border-l-slate-400',
                  'Presupuesto': 'border-l-blue-600',
                  'Coordinación con Proveedor': 'border-l-amber-600',
                  'Estudio de Materiales': 'border-l-purple-600',
                  'Preparación de Compra': 'border-l-orange-600',
                  'Completado': 'border-l-green-600',
                }

                // Generar columnas — agrupar por semana si el rango es muy grande
                const dias = []
                const cursor = new Date(minFecha)
                const showEveryDay = totalDias <= 60
                const showEvery5Days = totalDias > 60 && totalDias <= 180
                while (cursor <= maxFecha) {
                  dias.push(new Date(cursor))
                  cursor.setDate(cursor.getDate() + 1)
                }

                // Función para decidir si mostrar etiqueta de día
                const shouldShowDay = (d: Date, i: number) => {
                  if (showEveryDay) return true
                  if (showEvery5Days) return d.getDate() % 5 === 0 || d.getDate() === 1
                  return d.getDate() === 1 // Mensual
                }

                return (
                  <div className="min-w-[900px]">
                    {/* Header con días */}
                    <div className="flex border-b bg-slate-50 sticky top-0 z-10">
                      <div className="w-56 p-2 text-[10px] font-bold text-slate-500 uppercase border-r shrink-0">
                        Proyecto ({proysConFechas.length})
                      </div>
                      <div className="flex-1 flex">
                        {dias.map((d, i) => (
                          <div key={i} className="flex-1 min-w-[20px] text-center text-[8px] text-slate-400 border-r py-1">
                            {shouldShowDay(d, i) ? (
                              <div>
                                <div>{d.getDate()}</div>
                                {(d.getDate() === 1 || (showEveryDay && d.getDay() === 1)) && (
                                  <div className="text-[7px] font-bold text-slate-600">
                                    {d.toLocaleDateString('es-CL', { month: 'short' })}
                                  </div>
                                )}
                              </div>
                            ) : ''}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Filas de proyectos */}
                    {proysConFechas.map((p) => {
                      const inicio = p.fechaInicio ? new Date(p.fechaInicio) : minFecha
                      const fin = p.fechaFin ? new Date(p.fechaFin) : maxFecha
                      const offsetDias = Math.max(0, Math.ceil((inicio - minFecha) / (1000 * 60 * 60 * 24)))
                      const duracionDias = Math.max(1, Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24)))
                      const offsetPercent = (offsetDias / totalDias) * 100
                      const widthPercent = Math.max(0.5, (duracionDias / totalDias) * 100)
                      const color = estadoColors[p.estado] || 'bg-blue-500'
                      const etapa = p.estadoAprobacion || 'Sin etapa'
                      const borderColor = etapaBorderColors[etapa] || 'border-l-slate-400'

                      return (
                        <div key={p.id} className="flex border-b hover:bg-slate-50">
                          <div
                            className={`w-56 p-2 text-xs font-medium truncate border-r shrink-0 border-l-4 ${borderColor}`}
                            title={`${p.codigo || ''} ${p.nombre}\nEstado: ${p.estado}\nEtapa: ${etapa}\nInicio: ${p.fechaInicio || 'N/A'}\nFin: ${p.fechaFin || 'N/A'}`}
                          >
                            <div className="truncate">
                              {p.codigo || ''} {p.nombre?.substring(0, 30)}
                            </div>
                            <div className="text-[9px] text-slate-400 truncate">
                              {p.estado} · {etapa}
                            </div>
                          </div>
                          <div className="flex-1 relative h-10">
                            {/* Línea de tiempo */}
                            <div
                              className={`absolute h-6 top-2 rounded ${color} text-white text-[9px] font-bold px-1 flex items-center cursor-pointer overflow-hidden shadow-sm hover:opacity-80 transition-opacity`}
                              style={{ left: `${offsetPercent}%`, width: `${widthPercent}%` }}
                              title={`${p.nombre}\nInicio: ${p.fechaInicio || 'N/A'}\nFin: ${p.fechaFin || 'N/A'}\nDuración: ${duracionDias} días\nEstado: ${p.estado}\nEtapa: ${etapa}`}
                            >
                              {widthPercent > 3 ? `${duracionDias}d` : ''}
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    {/* Leyenda */}
                    <div className="flex items-center gap-4 p-2 bg-slate-50 border-t text-[10px] flex-wrap">
                      <span className="font-bold text-slate-500">Estados:</span>
                      {Object.entries(estadoColors).map(([estado, color]) => (
                        <span key={estado} className="flex items-center gap-1">
                          <span className={`inline-block w-3 h-3 rounded ${color}`}></span>
                          {estado}
                        </span>
                      ))}
                      <span className="font-bold text-slate-500 ml-4">Etapas:</span>
                      {Object.entries(etapaBorderColors).map(([etapa, color]) => (
                        <span key={etapa} className="flex items-center gap-1">
                          <span className={`inline-block w-3 h-3 rounded border-l-2 ${color}`}></span>
                          {etapa}
                        </span>
                      ))}
                    </div>

                    {/* Resumen */}
                    <div className="p-2 bg-white border-t text-[10px] text-slate-500">
                      Mostrando <strong>{proysConFechas.length}</strong> de <strong>{proyectos.length}</strong> proyectos ·
                      Rango: <strong>{minFecha.toLocaleDateString('es-CL')}</strong> — <strong>{maxFecha.toLocaleDateString('es-CL')}</strong> ·
                      <strong> {totalDias}</strong> días
                    </div>
                  </div>
                )
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info banner según vista activa */}
      {vistaActiva === 'completados' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800">
          📊 <strong>Histórico de Proyectos Completados.</strong> Los proyectos en esta vista ya finalizaron.
          Usa el botón <strong>"Informe de Costos"</strong> para generar un reporte detallado con filtros por fecha, sector, tipo y responsable.
        </div>
      )}
      {vistaActiva === 'activos' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
          🚧 <strong>Proyectos en proceso.</strong> Muestra proyectos Planificados, En Ejecución y Pausados (excluye Completados y Cancelados).
        </div>
      )}

      {/* Table - Formato PDF: # | Descripción | Sector | Tipo | Prior. | Etapa | Estado | Aprobación | Responsable | T.E. | Monto | Inicio | Término | Adj. | Acc. */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">
            {vistaActiva === 'activos' && 'Proyectos en Proceso'}
            {vistaActiva === 'completados' && 'Histórico de Proyectos Completados'}
            {vistaActiva === 'todos' && 'Todos los Proyectos'}
            {' '}({proyectosFiltrados.length} de {proyectos.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <p className="md:hidden text-xs text-slate-400 text-center py-1">← Desliza horizontalmente para ver más →</p>
          <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full text-xs whitespace-nowrap" style={{ minWidth: '1600px' }}>
              <thead>
                <tr className="border-b bg-[#0f2044] text-white">
                  <th className="text-center p-2 text-[10px] font-bold uppercase" style={{ width: '40px' }}>#</th>
                  <th className="text-left p-2 text-[10px] font-bold uppercase cursor-pointer hover:bg-[#1a3155]" style={{ minWidth: '200px' }} onClick={() => toggleSort('nombre')}>Descripción <SortIcon field="nombre" /></th>
                  <th className="text-left p-2 text-[10px] font-bold uppercase cursor-pointer hover:bg-[#1a3155]" style={{ minWidth: '100px' }} onClick={() => toggleSort('sector')}>Sector <SortIcon field="sector" /></th>
                  <th className="text-left p-2 text-[10px] font-bold uppercase cursor-pointer hover:bg-[#1a3155]" style={{ minWidth: '100px' }} onClick={() => toggleSort('tipoReparacion')}>Tipo <SortIcon field="tipoReparacion" /></th>
                  <th className="text-center p-2 text-[10px] font-bold uppercase cursor-pointer hover:bg-[#1a3155]" style={{ width: '60px' }} onClick={() => toggleSort('prioridad')}>Prior. <SortIcon field="prioridad" /></th>
                  <th className="text-left p-2 text-[10px] font-bold uppercase cursor-pointer hover:bg-[#1a3155]" style={{ minWidth: '120px' }} onClick={() => toggleSort('estado')}>Estado <SortIcon field="estado" /></th>
                  <th className="text-left p-2 text-[10px] font-bold uppercase cursor-pointer hover:bg-[#1a3155]" style={{ minWidth: '140px' }} onClick={() => toggleSort('estadoAprobacion')}>Etapa <SortIcon field="estadoAprobacion" /></th>
                  <th className="text-left p-2 text-[10px] font-bold uppercase cursor-pointer hover:bg-[#1a3155]" style={{ minWidth: '100px' }} onClick={() => toggleSort('responsable')}>Responsable <SortIcon field="responsable" /></th>
                  <th className="text-center p-2 text-[10px] font-bold uppercase" style={{ width: '60px' }}>T.E.</th>
                  <th className="text-right p-2 text-[10px] font-bold uppercase cursor-pointer hover:bg-[#1a3155]" style={{ minWidth: '90px' }} onClick={() => toggleSort('monto')}>Monto <SortIcon field="monto" /></th>
                  <th className="text-center p-2 text-[10px] font-bold uppercase cursor-pointer hover:bg-[#1a3155]" style={{ width: '80px' }} onClick={() => toggleSort('fechaInicio')}>Inicio <SortIcon field="fechaInicio" /></th>
                  <th className="text-center p-2 text-[10px] font-bold uppercase cursor-pointer hover:bg-[#1a3155]" style={{ width: '80px' }} onClick={() => toggleSort('fechaFin')}>Término <SortIcon field="fechaFin" /></th>
                  <th className="text-center p-2 text-[10px] font-bold uppercase" style={{ width: '60px' }}>Adj.</th>
                  <th className="text-center p-2 text-[10px] font-bold uppercase" style={{ width: '70px' }}>Acc.</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={14} className="p-8 text-center text-slate-400">Cargando...</td></tr>
                ) : !proyectosFiltrados || proyectosFiltrados.length === 0 ? (
                  <tr><td colSpan={14} className="p-8 text-center text-slate-400">
                    {vistaActiva === 'completados'
                      ? 'No hay proyectos completados en el histórico'
                      : vistaActiva === 'activos'
                        ? 'No hay proyectos en proceso'
                        : 'Sin proyectos'}
                  </td></tr>
                ) : (
                  proyectosFiltrados.map((proy, idx) => {
                    const sector = proy.sector || proy.ubicacion || '–'
                    const tipo = proy.tipoReparacion || proy.categoria || '–'
                    const prioridad = proy.prioridad || '–'
                    const etapa = proy.estadoAprobacion || 'Sin etapa'
                    const responsable = proy.responsable || '–'
                    const te = proy.tiempoEstimado || '–'
                    const monto = proy.monto || proy.presProg || 0
                    const totalAdj = (proy.tieneFotosAntes ? 1 : 0) + (proy.tieneFotosDespues ? 1 : 0) + (proy.tieneCotizaciones ? 1 : 0) + (proy._count?.documentos || 0)
                    return (
                      <tr key={proy.id} className={`border-b last:border-0 hover:bg-blue-50 cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`} onClick={() => openDetailDialog(proy)}>
                        <td className="text-center p-2 font-bold text-[#0f2044]">{proy.codigo || extraerNumProyecto(proy.nombre)}</td>
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
                          <span className={`text-[10px] ${etapaColors[etapa] || 'text-slate-500'}`}>{etapa}</span>
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
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="Exportar proyecto a PDF" aria-label="PDF" onClick={() => void exportProyectoToPdf(proy)}>
                              <FileDown className="w-3.5 h-3.5" />
                            </Button>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
                  <Label className="text-xs text-slate-500">Etapa</Label>
                  <p className={`text-sm ${etapaColors[selectedProy.estadoAprobacion || 'Sin etapa'] || 'text-slate-500'}`}>{selectedProy.estadoAprobacion || 'Sin etapa'}</p>
                </div>
                <div className="min-w-0">
                  <Label className="text-xs text-slate-500">Responsable Interno</Label>
                  <p className="text-sm font-medium truncate">{selectedProy.responsable || '–'}</p>
                </div>
                <div className="min-w-0">
                  <Label className="text-xs text-slate-500">Empresa Externa</Label>
                  <p className="text-sm font-medium truncate">{selectedProy.responsableExterno || '–'}</p>
                </div>
                <div className="min-w-0">
                  <Label className="text-xs text-slate-500">Tipo de Trabajo</Label>
                  <p className="text-sm font-medium truncate">{selectedProy.tipoTrabajo || '–'}</p>
                </div>
                <div className="min-w-0">
                  <Label className="text-xs text-slate-500">Centro de Costo</Label>
                  <p className="text-sm font-medium truncate">
                    {selectedProy.centroCosto ? `${selectedProy.centroCosto.codigo} · ${selectedProy.centroCosto.nombre}` : '–'}
                  </p>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-slate-50 p-3 rounded min-w-0">
                  <Package className="w-5 h-5 mx-auto mb-1 text-slate-500" />
                  <div className="text-lg font-bold">{selectedProy.materiales?.length || selectedProy._count?.materiales || 0}</div>
                  <div className="text-xs text-slate-500">Materiales</div>
                </div>
                <div className="bg-slate-50 p-3 rounded min-w-0">
                  <Wrench className="w-5 h-5 mx-auto mb-1 text-slate-500" />
                  <div className="text-lg font-bold">{selectedProy.herramientas?.length || selectedProy._count?.herramientas || 0}</div>
                  <div className="text-xs text-slate-500">Herramientas</div>
                </div>
                <div className="bg-slate-50 p-3 rounded min-w-0">
                  <CheckSquare className="w-5 h-5 mx-auto mb-1 text-slate-500" />
                  <div className="text-lg font-bold">{selectedProy.tareas?.length || selectedProy._count?.tareas || 0}</div>
                  <div className="text-xs text-slate-500">Tareas</div>
                </div>
                <div className="bg-slate-50 p-3 rounded min-w-0">
                  <FileText className="w-5 h-5 mx-auto mb-1 text-slate-500" />
                  <div className="text-lg font-bold">{selectedProy.documentos?.length || selectedProy._count?.documentos || 0}</div>
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
            {selectedProy && (
              <Button
                variant="outline"
                onClick={() => void exportProyectoToPdf(selectedProy)}
                title="Exportar este proyecto a PDF con todos los datos"
              >
                <FileDown className="w-4 h-4 mr-1" /> Exportar PDF
              </Button>
            )}
            {selectedProy && (selectedProy.materiales?.length || 0) > 0 && (
              <Button
                variant="secondary"
                onClick={enviarSolicitudCompra}
                disabled={enviandoSolicitud}
                title="Crea una Solicitud de Compra con los materiales del proyecto"
              >
                <ShoppingCart className="w-4 h-4 mr-1" />
                {enviandoSolicitud ? 'Enviando...' : 'Enviar a Solicitud de Compra'}
              </Button>
            )}
            <Button onClick={() => { setDetailDialogOpen(false); openDialog(selectedProy!) }}>
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
            <TabsList className="grid grid-cols-6 w-full h-9">
              <TabsTrigger value="general" className="text-xs">General</TabsTrigger>
              <TabsTrigger value="materiales" className="text-xs">Materiales</TabsTrigger>
              <TabsTrigger value="herramientas" className="text-xs">Herramientas</TabsTrigger>
              <TabsTrigger value="tareas" className="text-xs">Tareas</TabsTrigger>
              <TabsTrigger value="personal" className="text-xs">Personal</TabsTrigger>
              <TabsTrigger value="documentos" className="text-xs">Documentos</TabsTrigger>
            </TabsList>

            <div className="py-4">
              {/* General Tab — Secciones 1-4 */}
              <TabsContent value="general" className="space-y-6 mt-0">
                {/* Section 1: Información Básica */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#0f2044] uppercase tracking-wide">Sección 1 · Información Básica</span>
                    <Separator className="flex-1" />
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label>Descripción</Label>
                    <Input
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="w-full"
                      placeholder="Ej: #12 - Reparación bomba piscina"
                    />
                    <p className="text-[10px] text-slate-500">
                      Use el formato <code>#NN - Descripción</code> para generar el código de proyecto.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2 min-w-0">
                      <Label>Sector</Label>
                      <Select value={formData.sector} onValueChange={(v) => setFormData({ ...formData, sector: v })}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent>
                          {SECTORES.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 min-w-0">
                      <Label>Tipo de Reparación</Label>
                      <Select value={formData.tipoReparacion} onValueChange={(v) => setFormData({ ...formData, tipoReparacion: v })}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent>
                          {TIPOS_REPARACION.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 min-w-0">
                      <Label>Prioridad</Label>
                      <Select value={formData.prioridad} onValueChange={(v) => setFormData({ ...formData, prioridad: v })}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent>
                          {PRIORIDADES.map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 min-w-0">
                      <Label>Estado</Label>
                      <Select value={formData.estado} onValueChange={(v) => setFormData({ ...formData, estado: v })}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {ESTADOS_PROYECTO.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 min-w-0">
                      <Label>Etapa</Label>
                      <Select value={formData.estadoAprobacion || 'Sin etapa'} onValueChange={(v) => setFormData({ ...formData, estadoAprobacion: v })}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Seleccionar etapa..." /></SelectTrigger>
                        <SelectContent>
                          {ETAPAS_PROYECTO.map((et) => (
                            <SelectItem key={et} value={et}>{et}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-slate-500">Etapa del flujo de aprobación / compra</p>
                    </div>
                    <div className="space-y-2 min-w-0">
                      <Label>Responsable Interno</Label>
                      <Select value={formData.responsable} onValueChange={(v) => setFormData({ ...formData, responsable: v })}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent>
                          {personalList.length === 0 ? (
                            <SelectItem value="__sin_personal" disabled>Sin personal cargado</SelectItem>
                          ) : (
                            personalList.map((p) => (
                              <SelectItem key={p.id} value={p.nombre}>
                                {p.nombre}{p.cargo ? ` · ${p.cargo}` : ''}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-slate-500">Personal interno</p>
                    </div>
                    <div className="space-y-2 min-w-0">
                      <Label>Tipo de Trabajo</Label>
                      <Select value={formData.tipoTrabajo} onValueChange={(v) => setFormData({ ...formData, tipoTrabajo: v })}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent>
                          {TIPOS_TRABAJO.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-slate-500">Mantención, reparación, instalación...</p>
                    </div>
                    <div className="space-y-2 min-w-0">
                      <Label>Empresa Externa</Label>
                      <Input
                        value={formData.responsableExterno}
                        onChange={(e) => setFormData({ ...formData, responsableExterno: e.target.value })}
                        placeholder="Ej: Constructora XYZ, Gasfíter Juan Pérez..."
                        className="w-full"
                      />
                      <p className="text-[10px] text-slate-500">Si el trabajo lo hace una empresa externa</p>
                    </div>
                    <div className="space-y-2 min-w-0">
                      <Label>Centro de Costo</Label>
                      <Select value={formData.centroCostoId} onValueChange={(v) => setFormData({ ...formData, centroCostoId: v })}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Sin asignar</SelectItem>
                          {centrosCosto.map((cc) => (
                            <SelectItem key={cc.id} value={cc.id}>
                              {cc.codigo} · {cc.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-slate-500">Para imputación contable</p>
                    </div>
                  </div>
                </div>

                {/* Section 2: Fechas y Tiempo */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#0f2044] uppercase tracking-wide">Sección 2 · Fechas y Tiempo</span>
                    <Separator className="flex-1" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2 min-w-0">
                      <Label>Fecha de Inicio</Label>
                      <Input
                        type="date"
                        value={formData.fechaInicio}
                        onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2 min-w-0">
                      <Label>Fecha de Término</Label>
                      <Input
                        type="date"
                        value={formData.fechaFin}
                        onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2 min-w-0">
                      <Label>Tiempo Estimado</Label>
                      <Input
                        value={formData.tiempoEstimado}
                        onChange={(e) => setFormData({ ...formData, tiempoEstimado: e.target.value })}
                        className="w-full"
                        placeholder="Ej: 5 días, 1 día"
                      />
                    </div>
                    <div className="space-y-2 min-w-0">
                      <Label>Monto (CLP)</Label>
                      <Input
                        type="number"
                        value={formData.monto}
                        onChange={(e) => setFormData({ ...formData, monto: parseFloat(e.target.value) || 0 })}
                        className="w-full text-right"
                      />
                    </div>
                  </div>

                  {/* Fechas reales (opcional) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 min-w-0">
                      <Label className="text-xs text-slate-500">Fecha Inicio Real (opcional)</Label>
                      <Input
                        type="date"
                        value={formData.fechaInicioReal}
                        onChange={(e) => setFormData({ ...formData, fechaInicioReal: e.target.value })}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2 min-w-0">
                      <Label className="text-xs text-slate-500">Fecha Término Real (opcional)</Label>
                      <Input
                        type="date"
                        value={formData.fechaFinReal}
                        onChange={(e) => setFormData({ ...formData, fechaFinReal: e.target.value })}
                        className="w-full"
                      />
                    </div>
                  </div>

                  {/* Avance y presupuesto */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 min-w-0">
                      <Label>Avance: {formData.avance}%</Label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={formData.avance}
                        onChange={(e) => setFormData({ ...formData, avance: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2 min-w-0">
                      <Label>Presupuesto Programado (CLP)</Label>
                      <Input
                        type="number"
                        value={formData.presProg}
                        onChange={(e) => setFormData({ ...formData, presProg: parseFloat(e.target.value) || 0 })}
                        className="w-full text-right"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label>Presupuesto Usado (calculado)</Label>
                    <Input type="number" value={granTotal} disabled className="w-full bg-slate-100 text-right" />
                    <p className="text-xs text-slate-500">Se calcula automáticamente desde materiales y personal</p>
                  </div>
                </div>

                {/* Section 3: Comentarios */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#0f2044] uppercase tracking-wide">Sección 3 · Comentarios</span>
                    <Separator className="flex-1" />
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label>Comentarios</Label>
                    <Textarea
                      value={formData.comentarios}
                      onChange={(e) => setFormData({ ...formData, comentarios: e.target.value })}
                      className="w-full"
                      rows={4}
                      placeholder="Comentarios internos del proyecto..."
                    />
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label className="text-xs text-slate-500">Descripción extendida (opcional)</Label>
                    <Textarea
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      className="w-full"
                      rows={3}
                      placeholder="Descripción larga del proyecto..."
                    />
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label className="text-xs text-slate-500">Ubicación (opcional)</Label>
                    <Input
                      value={formData.ubicacion}
                      onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Section 4: Fotos */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#0f2044] uppercase tracking-wide">Sección 4 · Fotos</span>
                    <Separator className="flex-1" />
                  </div>
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
                      <div key={m.id} className="bg-slate-50 p-2 rounded space-y-1">
                        {/* Select del catálogo + input manual */}
                        <div className="flex items-center gap-2 mb-1">
                          <Select onValueChange={(v) => selectMaterialFromCatalog(i, v)}>
                            <SelectTrigger className="h-7 w-full text-xs">
                              <SelectValue placeholder="📋 Seleccionar del catálogo..." />
                            </SelectTrigger>
                            <SelectContent>
                              {catalogoMateriales.length === 0 ? (
                                <SelectItem value="_empty" disabled>Cargando catálogo...</SelectItem>
                              ) : (
                                catalogoMateriales.slice(0, 200).map(mat => (
                                  <SelectItem key={mat.id} value={mat.id}>
                                    {mat.codigo ? `${mat.codigo} · ` : ''}{mat.nombre} — {formatCLP(mat.precioUnit)}/{mat.unidad}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-12 gap-2 items-center">
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
                        <div className="col-span-12 flex items-center gap-2 mt-1">
                          <Link2 className="w-3 h-3 text-slate-400 shrink-0" />
                          <Input
                            value={m.linkCompra || ''}
                            onChange={(e) => updateMaterial(i, 'linkCompra', e.target.value)}
                            className="h-7 w-full text-xs"
                            placeholder="https://... link de compra (opcional)"
                          />
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
                    <p className="text-xs mt-1">Haz clic en "Agregar" y selecciona del catálogo</p>
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
                      <div key={h.id} className="space-y-1 bg-slate-50 p-2 rounded">
                        {/* Select del catálogo */}
                        <Select onValueChange={(v) => selectHerramientaFromCatalog(i, v)}>
                          <SelectTrigger className="h-7 w-full text-xs">
                            <SelectValue placeholder="🔧 Seleccionar del catálogo..." />
                          </SelectTrigger>
                          <SelectContent>
                            {catalogoHerramientas.length === 0 ? (
                              <SelectItem value="_empty" disabled>Cargando catálogo...</SelectItem>
                            ) : (
                              catalogoHerramientas.slice(0, 200).map(herr => (
                                <SelectItem key={herr.id} value={herr.id}>
                                  {herr.codigo ? `${herr.codigo} · ` : ''}{herr.nombre}{herr.marca ? ` (${herr.marca})` : ''}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <div className="grid grid-cols-6 gap-3 items-end">
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
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Wrench className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Sin herramientas agregadas</p>
                    <p className="text-xs mt-1">Haz clic en "Agregar" y selecciona del catálogo</p>
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
                  <Label>Personal (valor/hora se carga automáticamente)</Label>
                  <Button size="sm" onClick={addPersonal}><Plus className="w-4 h-4 mr-1" /> Agregar</Button>
                </div>
                {personal.length > 0 ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 px-2 pb-1 border-b">
                      <div className="col-span-3 text-[10px] font-bold text-slate-500 uppercase">Nombre</div>
                      <div className="col-span-2 text-[10px] font-bold text-slate-500 uppercase">Tipo</div>
                      <div className="col-span-2 text-[10px] font-bold text-slate-500 uppercase text-right">Horas</div>
                      <div className="col-span-2 text-[10px] font-bold text-slate-500 uppercase text-right">$ / Hora</div>
                      <div className="col-span-2 text-[10px] font-bold text-slate-500 uppercase text-right">Total</div>
                      <div className="col-span-1"></div>
                    </div>
                    {personal.map((p, i) => (
                      <div key={p.id} className="space-y-1 bg-slate-50 p-2 rounded">
                        {/* Select del personal con valor/hora automático */}
                        <Select value={p.nombre} onValueChange={(v) => selectPersonal(i, v)}>
                          <SelectTrigger className="h-8 w-full text-xs">
                            <SelectValue placeholder="👤 Seleccionar trabajador..." />
                          </SelectTrigger>
                          <SelectContent>
                            {personalList.length === 0 ? (
                              <SelectItem value="_empty" disabled>Cargando personal...</SelectItem>
                            ) : (
                              personalList.map(pl => (
                                <SelectItem key={pl.id} value={pl.nombre}>
                                  {pl.nombre}{pl.cargo ? ` · ${pl.cargo}` : ''}{pl.sueldoBase ? ` · ${formatCLP(Math.round(pl.sueldoBase / 30 / 8))}/hr` : ''}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <div className="grid grid-cols-12 gap-2 items-center">
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

              {/* Documentos y Cotizaciones Tab (merged) */}
              <TabsContent value="documentos" className="space-y-6 mt-0">
                {/* Cotizaciones */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#0f2044] uppercase tracking-wide">Cotizaciones</span>
                    <Separator className="flex-1" />
                  </div>
                  <div className="flex justify-between items-center">
                    <Label>Cotizaciones y Respaldos (PDF o imágenes)</Label>
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
                    <div className="text-center py-6 text-slate-400">
                      <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Sin cotizaciones adjuntas</p>
                      <p className="text-xs mt-1">Sube cotizaciones en PDF o imágenes (máx 5MB)</p>
                    </div>
                  )}
                </div>

                {/* Documentos (sistema legacy) */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#0f2044] uppercase tracking-wide">Documentos Adjuntos</span>
                    <Separator className="flex-1" />
                  </div>
                  <div className="flex justify-between items-center">
                    <Label>Cotizaciones, Respaldos, Contratos, Facturas, etc.</Label>
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
                    <div className="text-center py-6 text-slate-400">
                      <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Sin documentos adjuntos</p>
                    </div>
                  )}
                </div>
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

      {/* Diálogo: Informe de Costos de Proyectos Completados */}
      <Dialog open={informeDialogOpen} onOpenChange={setInformeDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-green-700" />
              Informe de Costos — Proyectos Completados
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Filtros */}
            <div className="bg-slate-50 rounded-lg p-4 border">
              <h4 className="text-xs font-semibold text-slate-700 uppercase mb-3">Filtros del Informe</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                <div>
                  <Label className="text-[10px] text-slate-500">Fecha desde</Label>
                  <Input
                    type="date"
                    value={informeFilters.fechaDesde}
                    onChange={(e) => setInformeFilters({ ...informeFilters, fechaDesde: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-slate-500">Fecha hasta</Label>
                  <Input
                    type="date"
                    value={informeFilters.fechaHasta}
                    onChange={(e) => setInformeFilters({ ...informeFilters, fechaHasta: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-slate-500">Sector</Label>
                  <Select
                    value={informeFilters.sector}
                    onValueChange={(v) => setInformeFilters({ ...informeFilters, sector: v })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {SECTORES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] text-slate-500">Tipo reparación</Label>
                  <Select
                    value={informeFilters.tipoReparacion}
                    onValueChange={(v) => setInformeFilters({ ...informeFilters, tipoReparacion: v })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {TIPOS_REPARACION.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] text-slate-500">Responsable</Label>
                  <Select
                    value={informeFilters.responsable}
                    onValueChange={(v) => setInformeFilters({ ...informeFilters, responsable: v })}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {responsablesUnicos.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2 mt-3 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setInformeFilters({
                    fechaDesde: '',
                    fechaHasta: '',
                    sector: 'all',
                    tipoReparacion: 'all',
                    centroCosto: 'all',
                    responsable: 'all',
                  })}
                >
                  Limpiar filtros
                </Button>
                <Button size="sm" variant="outline" onClick={exportarInformeCSV} disabled={proyectosInforme.length === 0}>
                  <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> CSV
                </Button>
                <Button size="sm" onClick={exportarInformePDF} disabled={proyectosInforme.length === 0} className="bg-green-700 hover:bg-green-800">
                  <FileDown className="w-3.5 h-3.5 mr-1" /> PDF
                </Button>
              </div>
            </div>

            {/* Resumen de totales */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-white border rounded-lg p-3">
                <div className="text-[10px] text-slate-500 uppercase">Proyectos</div>
                <div className="text-xl font-bold text-slate-900">{informeTotales.totalProyectos}</div>
              </div>
              <div className="bg-white border rounded-lg p-3">
                <div className="text-[10px] text-slate-500 uppercase">Monto Total</div>
                <div className="text-xl font-bold text-[#0f2044]">{formatCLP(informeTotales.totalMonto)}</div>
              </div>
              <div className="bg-white border rounded-lg p-3">
                <div className="text-[10px] text-slate-500 uppercase">Materiales</div>
                <div className="text-xl font-bold text-blue-700">{formatCLP(informeTotales.totalMateriales)}</div>
              </div>
              <div className="bg-white border rounded-lg p-3">
                <div className="text-[10px] text-slate-500 uppercase">Personal</div>
                <div className="text-xl font-bold text-purple-700">{formatCLP(informeTotales.totalPersonal)}</div>
              </div>
              <div className="bg-white border rounded-lg p-3">
                <div className="text-[10px] text-slate-500 uppercase">Presupuesto Usado</div>
                <div className="text-xl font-bold text-amber-700">{formatCLP(informeTotales.totalPresUsado)}</div>
              </div>
            </div>

            {/* Tabla de proyectos del informe */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-slate-100 px-3 py-2 text-xs font-semibold">
                Proyectos en el informe ({proyectosInforme.length})
              </div>
              <div className="overflow-x-auto max-h-80">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="text-left p-2">#</th>
                      <th className="text-left p-2">Descripción</th>
                      <th className="text-left p-2">Sector</th>
                      <th className="text-left p-2">Tipo</th>
                      <th className="text-left p-2">Fecha Fin</th>
                      <th className="text-right p-2">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {proyectosInforme.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center p-6 text-slate-400">
                          No hay proyectos completados con los filtros seleccionados
                        </td>
                      </tr>
                    ) : (
                      proyectosInforme.map((p) => (
                        <tr key={p.id} className="border-t hover:bg-slate-50">
                          <td className="p-2 font-bold text-[#0f2044]">{extraerNumProyecto(p.nombre)}</td>
                          <td className="p-2 max-w-[250px] truncate" title={extraerDescripcion(p.nombre)}>{extraerDescripcion(p.nombre)}</td>
                          <td className="p-2 text-slate-600">{p.sector || p.ubicacion || '–'}</td>
                          <td className="p-2 text-slate-600">{p.tipoReparacion || p.categoria || '–'}</td>
                          <td className="p-2 text-slate-500">{formatDate(p.fechaFinReal || p.fechaFin)}</td>
                          <td className="p-2 text-right font-mono font-medium">{formatCLP(p.monto || p.presProg || 0)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Resumen agrupado */}
            {proyectosInforme.length > 0 && (
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="border rounded-lg p-3">
                  <h5 className="text-xs font-semibold text-slate-700 mb-2">Por Sector</h5>
                  <div className="space-y-1 text-xs">
                    {Object.entries(informeTotales.porSector).sort((a, b) => b[1].monto - a[1].monto).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-slate-600">{k}:</span>
                        <span className="font-mono">{formatCLP(v.monto)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border rounded-lg p-3">
                  <h5 className="text-xs font-semibold text-slate-700 mb-2">Por Tipo</h5>
                  <div className="space-y-1 text-xs">
                    {Object.entries(informeTotales.porTipo).sort((a, b) => b[1].monto - a[1].monto).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-slate-600">{k}:</span>
                        <span className="font-mono">{formatCLP(v.monto)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border rounded-lg p-3">
                  <h5 className="text-xs font-semibold text-slate-700 mb-2">Por Mes</h5>
                  <div className="space-y-1 text-xs">
                    {Object.entries(informeTotales.porMes).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-slate-600">{k}:</span>
                        <span className="font-mono">{formatCLP(v.monto)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border rounded-lg p-3">
                  <h5 className="text-xs font-semibold text-slate-700 mb-2">Por Responsable</h5>
                  <div className="space-y-1 text-xs">
                    {Object.entries(informeTotales.porResponsable).sort((a, b) => b[1].monto - a[1].monto).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-slate-600">{k}:</span>
                        <span className="font-mono">{formatCLP(v.monto)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInformeDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
