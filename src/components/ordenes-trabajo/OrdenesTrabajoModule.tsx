'use client'

import { useEffect, useMemo, useState } from 'react'
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
  DialogDescription,
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
import { Checkbox } from '@/components/ui/checkbox'
import { DatePicker, dateToISO, isoToDate } from '@/components/ui/date-picker'
import { Separator } from '@/components/ui/separator'
import { useSession } from '@/hooks/use-session'
import { formatCLP, HORAS_OPTIONS } from '@/lib/utils'
import { filtrarPersonalAsignableOT } from '@/lib/personal-cargos'
import { toast } from 'sonner'
import { TableroIndicadores } from '@/components/ui/tablero-indicadores'
import {
  Plus, Pencil, Trash2, Search, Printer, Clock, Users,
  Wrench, Package, CheckSquare, Database, RefreshCw, Building2,
  Calendar, Lock, Download, Camera, Image, X, ShoppingCart,
  AlertTriangle, CheckCircle, FileText, Eye
} from 'lucide-react'

// Interfaces
interface OTMaterial {
  id: string
  descripcion: string
  cantidad: number
  unidad: string
  precioUnit: number
  total: number
}

interface OTHerramienta {
  id: string
  nombre: string
  cantidad: number
}

interface OTTarea {
  id: string
  descripcion: string
  cantidad: number
  estado: string
  cumple?: boolean | null
  // Checklist de verificación (LV del PMI): OK / NO OK / N/A (mutuamente excluyentes)
  ok?: boolean
  noOk?: boolean
  na?: boolean
}

interface OTPersonalOT {
  id: string
  nombre: string
  tipo: string
  cantidad: number
  precioUnit: number
  horasTrabajadas: number
  total: number
  cumple: boolean | null
  observaciones?: string
}

interface OrdenTrabajo {
  id: string
  otNum: string
  titulo: string
  tipo: string
  prioridad: string
  estado: string
  ubicacion: string | null
  fechaInicio: string | null
  fechaLimite: string | null
  fechaInicioReal: string | null
  fechaFinReal: string | null
  costoEstimado: number
  costoReal: number
  progreso: number
  descripcion: string | null
  centroCostoId: string | null
  centroCosto?: { id: string; codigo: string; nombre: string } | null
  tiempoEst: number
  tiempoReal: number
  valorHora: number
  notas: string | null
  esRecurrente: boolean
  formaPago: string | null
  materiales: OTMaterial[]
  herramientas: OTHerramienta[]
  tareas: OTTarea[]
  personalOT: OTPersonalOT[]
  asignado: { id: string; nombre: string; sueldoBase: number } | null
  propiedad: { id: string; nombre: string } | null
  fotosAntes?: string[]
  fotosDespues?: string[]
}

interface Personal {
  id: string
  nombre: string
  cargo: string | null
  sueldoBase: number
}

// Catalog interfaces
interface CentroCosto {
  id: string
  codigo: string
  nombre: string
  descripcion: string | null
  responsable: string | null
  tipoGasto: string
  presupuestoMens: number
}

interface CatMaterial {
  id: string
  codigo: string | null
  nombre: string
  unidad: string
  precioUnit: number
  categoria: string
  stockMinimo: number
  stockActual: number
  ubicacion: string | null
  centroCosto?: CentroCosto | null
}

interface CatHerramienta {
  id: string
  codigo: string | null
  nombre: string
  marca: string | null
  cantidad: number
  ubicacion: string | null
  estado: string
  valorReposicion: number
  centroCosto?: CentroCosto | null
}

interface CatTarea {
  id: string
  codigo: string | null
  nombre: string
  categoria: string
  sistema: string | null
  tipoMantencion: string
  frecuencia: string | null
  responsable: string | null
  tiempoEstimado: number
  centroCosto?: CentroCosto | null
  esRecurrente: boolean
}

const formatDate = (d: string | null) => {
  if (!d) return '–'
  try {
    const date = new Date(d)
    return date.toLocaleDateString('es-CL')
  } catch {
    return d
  }
}

const formatMinutes = (mins: number) => {
  if (!mins) return '0 min'
  const hours = Math.floor(mins / 60)
  const minutes = mins % 60
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}min`
  if (hours > 0) return `${hours}h`
  return `${minutes}min`
}

// Calcular valor hora desde sueldo mensual (22 días, 8 horas)
const calcularValorHora = (sueldoBase: number) => {
  return sueldoBase / (22 * 8) // 176 horas al mes
}

const tipoColors: Record<string, string> = {
  'Correctivo': 'bg-amber-100 text-amber-700',
  'Preventivo': 'bg-blue-100 text-blue-700',
  'Mejora': 'bg-purple-100 text-purple-700',
  'Emergencia': 'bg-red-100 text-red-700',
}

const prioridadColors: Record<string, string> = {
  'Urgente': 'bg-red-100 text-red-700',
  'Alta': 'bg-amber-100 text-amber-700',
  'Media': 'bg-amber-100 text-amber-700',
  'Baja': 'bg-green-100 text-green-700',
}

const estadoColors: Record<string, string> = {
  'Pendiente': 'bg-amber-100 text-amber-700',
  'En Progreso': 'bg-blue-100 text-blue-700',
  'Completado': 'bg-green-100 text-green-700',
  'Cancelado': 'bg-red-100 text-red-700',
}

export function OrdenesTrabajoModule() {
  const { isPersonal, canEditProgress } = useSession()
  const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([])
  const [personal, setPersonal] = useState<Personal[]>([])
  // Personal filtrado para asignación de OT: excluye conserjes, guardias y encargados de cámaras
  const personalAsignable = useMemo(
    () => filtrarPersonalAsignableOT(personal),
    [personal]
  )
  const [propiedades, setPropiedades] = useState<{ id: string; nombre: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedOT, setSelectedOT] = useState<OrdenTrabajo | null>(null)
  const [editingOT, setEditingOT] = useState<OrdenTrabajo | null>(null)
  const [progressDialogOpen, setProgressDialogOpen] = useState(false)
  const [progressOT, setProgressOT] = useState<OrdenTrabajo | null>(null)
  const [crearSolicitudDialogOpen, setCrearSolicitudDialogOpen] = useState(false)
  const [creandoSolicitud, setCreandoSolicitud] = useState(false)
  
  // Catalogs state
  const [centrosCosto, setCentrosCosto] = useState<CentroCosto[]>([])
  const [catMateriales, setCatMateriales] = useState<CatMaterial[]>([])
  const [catHerramientas, setCatHerramientas] = useState<CatHerramienta[]>([])
  const [catTareas, setCatTareas] = useState<CatTarea[]>([])
  const [catalogsLoaded, setCatalogsLoaded] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    titulo: '',
    tipo: 'Correctivo',
    prioridad: 'Media',
    estado: 'Pendiente',
    ubicacion: '',
    fechaInicio: null as Date | null,
    fechaLimite: null as Date | null,
    fechaInicioReal: null as Date | null,
    fechaFinReal: null as Date | null,
    costoEstimado: 0,
    costoReal: 0,
    progreso: 0,
    descripcion: '',
    centroCostoId: 'none',
    asignadoId: 'none',
    propiedadId: 'none',
    tiempoEst: 0,
    tiempoReal: 0,
    notas: '',
    esRecurrente: false,
    formaPago: 'Gasto Común Mensual',
  })

  // Resources state
  const [materiales, setMateriales] = useState<OTMaterial[]>([])
  const [herramientas, setHerramientas] = useState<OTHerramienta[]>([])
  const [tareas, setTareas] = useState<OTTarea[]>([])
  const [personalOT, setPersonalOT] = useState<OTPersonalOT[]>([])
  const [fotosAntes, setFotosAntes] = useState<string[]>([])
  const [fotosDespues, setFotosDespues] = useState<string[]>([])

  const fetchOrdenes = async (searchTerm = '') => {
    setLoading(true)
    try {
      const url = searchTerm ? `/api/ordenes-trabajo?search=${encodeURIComponent(searchTerm)}` : '/api/ordenes-trabajo'
      const res = await fetch(url)
      const data = await res.json()
      setOrdenes(data)
    } catch (error) {
      console.error('Error fetching ordenes:', error)
    }
    setLoading(false)
  }

  const fetchCatalogs = async () => {
    try {
      const res = await fetch('/api/seed-catalogos')
      const data = await res.json()
      if (data.herramientas && data.tareas && data.materiales && data.centrosCosto) {
        setCentrosCosto(data.centrosCosto)
        setCatHerramientas(data.herramientas)
        setCatTareas(data.tareas)
        setCatMateriales(data.materiales)
        setCatalogsLoaded(true)
      }
    } catch (error) {
      console.error('Error fetching catalogs:', error)
    }
  }

  const seedCatalogs = async () => {
    try {
      const res = await fetch('/api/seed-catalogos', { method: 'POST' })
      const data = await res.json()
      toast.success(`Catálogos cargados: ${data.centrosCosto || 0} centros de costo, ${data.tareas} tareas, ${data.herramientas} herramientas, ${data.materiales} materiales`)
      fetchCatalogs()
    } catch (error) {
      console.error('Error seeding catalogs:', error)
      toast.error('Error al cargar catálogos')
    }
  }

  useEffect(() => {
    void (async () => {
      await fetchOrdenes()
    })()
    fetch('/api/personal').then(res => res.json()).then(setPersonal)
    fetch('/api/propiedades').then(res => res.json()).then(setPropiedades)
    void (async () => {
      await fetchCatalogs()
    })()
    // Auto-refresh cada 60 segundos
    const interval = setInterval(() => {
      fetchOrdenes(search)
    }, 300000) // 5 min (optimizado BD)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => fetchOrdenes(search), 300)
    return () => clearTimeout(timeout)
  }, [search])

  const openDialog = async (otParam?: OrdenTrabajo) => {
    if (otParam) {
      // Cargar el detalle completo de la OT (con materiales, tareas, etc.)
      // Estrategia:
      // 1. Cargar primero el detalle SIN fotos (rápido, <50KB)
      // 2. Si hay fotos (fotosAntesCount > 0 o fotosDespuesCount > 0), cargarlas automáticamente
      //    con ?fotos=true (puede tardar varios segundos si son grandes)
      // Las fotos quedan cargadas en el state para que se vean siempre que abras la OT
      let ot: OrdenTrabajo = otParam
      let fotosAntesCount = 0
      let fotosDespuesCount = 0
      let fotosAntesData: string[] = []
      let fotosDespuesData: string[] = []
      
      try {
        // 1. Cargar detalle sin fotos
        const res = await fetch(`/api/ordenes-trabajo/${otParam.id}`)
        if (res.ok) {
          ot = await res.json()
          fotosAntesCount = (ot as any).fotosAntesCount || 0
          fotosDespuesCount = (ot as any).fotosDespuesCount || 0
        }
        
        // 2. Si hay fotos, cargarlas automáticamente
        if (fotosAntesCount > 0 || fotosDespuesCount > 0) {
          try {
            const resFotos = await fetch(`/api/ordenes-trabajo/${otParam.id}?fotos=true`)
            if (resFotos.ok) {
              const otConFotos = await resFotos.json()
              fotosAntesData = otConFotos.fotosAntes || []
              fotosDespuesData = otConFotos.fotosDespues || []
            }
          } catch (e) {
            console.error('Error cargando fotos:', e)
            // Si falla la carga de fotos, dejamos los arrays vacíos
            // pero el conteo sigue disponible
          }
        }
      } catch (e) {
        console.error('Error cargando detalle OT:', e)
      }
      
      setEditingOT(ot)
      setFormData({
        titulo: ot.titulo,
        tipo: ot.tipo,
        prioridad: ot.prioridad,
        estado: ot.estado,
        ubicacion: ot.ubicacion || '',
        fechaInicio: ot.fechaInicio ? isoToDate(ot.fechaInicio) || null : null,
        fechaLimite: ot.fechaLimite ? isoToDate(ot.fechaLimite) || null : null,
        fechaInicioReal: ot.fechaInicioReal ? isoToDate(ot.fechaInicioReal) || null : null,
        fechaFinReal: ot.fechaFinReal ? isoToDate(ot.fechaFinReal) || null : null,
        costoEstimado: ot.costoEstimado,
        costoReal: ot.costoReal,
        progreso: ot.progreso,
        descripcion: ot.descripcion || '',
        centroCostoId: ot.centroCostoId || 'none',
        asignadoId: ot.asignado?.id || 'none',
        propiedadId: ot.propiedad?.id || 'none',
        tiempoEst: ot.tiempoEst,
        tiempoReal: ot.tiempoReal,
        notas: ot.notas || '',
        esRecurrente: ot.esRecurrente || false,
        formaPago: ot.formaPago || 'Gasto Común Mensual',
      })
      setMateriales(ot.materiales || [])
      setHerramientas(ot.herramientas || [])
      setTareas(ot.tareas || [])
      setPersonalOT(ot.personalOT || [])
      // Cargar fotos automáticamente - quedan a la vista siempre que abras la OT
      setFotosAntes(fotosAntesData)
      setFotosDespues(fotosDespuesData)
      // Guardar conteos por si se necesitan
      ;(ot as any).fotosAntesCount = fotosAntesCount
      ;(ot as any).fotosDespuesCount = fotosDespuesCount
    } else {
      setEditingOT(null)
      setFormData({
        titulo: '',
        tipo: 'Correctivo',
        prioridad: 'Media',
        estado: 'Pendiente',
        ubicacion: '',
        fechaInicio: null,
        fechaLimite: null,
        fechaInicioReal: null,
        fechaFinReal: null,
        costoEstimado: 0,
        costoReal: 0,
        progreso: 0,
        descripcion: '',
        centroCostoId: 'none',
        asignadoId: 'none',
        propiedadId: 'none',
        tiempoEst: 0,
        tiempoReal: 0,
        notas: '',
        esRecurrente: false,
        formaPago: 'Gasto Común Mensual',
      })
      setMateriales([])
      setHerramientas([])
      setTareas([])
      setPersonalOT([])
      setFotosAntes([])
      setFotosDespues([])
    }
    setDialogOpen(true)
  }

  const openDetailDialog = async (ot: OrdenTrabajo) => {
    // Cargar detalle completo (con relaciones) para mostrar en el dialog
    try {
      const res = await fetch(`/api/ordenes-trabajo/${ot.id}`)
      if (res.ok) {
        setSelectedOT(await res.json())
      } else {
        setSelectedOT(ot)
      }
    } catch (e) {
      setSelectedOT(ot)
    }
    setDetailDialogOpen(true)
  }

  const openProgressDialog = async (ot: OrdenTrabajo) => {
    // Cargar detalle completo si no tiene tareas cargadas (optimización BD)
    let otFull = ot
    if (!ot.tareas || ot.tareas.length === 0) {
      try {
        const res = await fetch(`/api/ordenes-trabajo/${ot.id}`)
        if (res.ok) otFull = await res.json()
      } catch (e) {
        console.error('Error cargando detalle OT para progreso:', e)
      }
    }
    setProgressOT(otFull)
    setProgressFormData({
      progreso: otFull.progreso,
      tiempoReal: otFull.tiempoReal,
      estado: otFull.estado,
      tareas: (otFull.tareas || []).map(t => ({
        id: t.id,
        descripcion: t.descripcion,
        estado: t.estado,
        cumple: t.cumple ?? null,
      })),
    })
    setProgressDialogOpen(true)
  }

  const [progressFormData, setProgressFormData] = useState({
    progreso: 0,
    tiempoReal: 0,
    estado: 'Pendiente',
    tareas: [] as { id: string; descripcion: string; estado: string; cumple: boolean | null }[],
  })

  const handleSaveProgress = async () => {
    if (!progressOT) return

    try {
      await fetch(`/api/ordenes-trabajo/${progressOT.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          progreso: progressFormData.progreso,
          tiempoReal: progressFormData.tiempoReal,
          estado: progressFormData.estado,
          tareas: progressFormData.tareas.map(t => ({
            id: t.id,
            estado: t.estado,
            cumple: t.cumple,
          })),
        }),
      })
      setProgressDialogOpen(false)
      fetchOrdenes(search)
    } catch (error) {
      console.error('Error updating progress:', error)
    }
  }

  const handleSave = async () => {
    if (!formData.titulo.trim()) return

    // Calcular costo real basado en materiales y personal
    const costoMateriales = materiales.reduce((sum, m) => sum + (m.total || m.cantidad * m.precioUnit), 0)
    const costoPersonal = personalOT.reduce((sum, p) => sum + (p.total || p.precioUnit * p.horasTrabajadas * p.cantidad), 0)
    const costoRealCalculado = costoMateriales + costoPersonal

    // Calcular tiempo total de tareas del catálogo
    const tiempoTareas = tareas.reduce((sum, t) => {
      const catTarea = catTareas.find(ct => ct.nombre === t.descripcion || ct.nombre === t.descripcion.replace(/^\[[^\]]+\]\s*/, '').replace(/\s*\(CC:.*\)$/, ''))
      return sum + (catTarea?.tiempoEstimado || 0) * t.cantidad
    }, 0)

    const dataToSend = {
      ...formData,
      fechaInicio: formData.fechaInicio ? dateToISO(formData.fechaInicio) : null,
      fechaLimite: formData.fechaLimite ? dateToISO(formData.fechaLimite) : null,
      fechaInicioReal: formData.fechaInicioReal ? dateToISO(formData.fechaInicioReal) : null,
      fechaFinReal: formData.fechaFinReal ? dateToISO(formData.fechaFinReal) : null,
      centroCostoId: formData.centroCostoId === 'none' ? null : formData.centroCostoId,
      asignadoId: formData.asignadoId === 'none' ? null : formData.asignadoId,
      propiedadId: formData.propiedadId === 'none' ? null : formData.propiedadId,
      costoReal: costoRealCalculado,
      tiempoEst: formData.tiempoEst || tiempoTareas,
      materiales,
      herramientas,
      tareas,
      personalOT,
      fotosAntes,
      fotosDespues,
    }

    try {
      if (editingOT) {
        await fetch(`/api/ordenes-trabajo/${editingOT.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend),
        })
      } else {
        await fetch('/api/ordenes-trabajo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend),
        })
      }
      setDialogOpen(false)
      fetchOrdenes(search)
    } catch (error) {
      console.error('Error saving OT:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar esta orden de trabajo?')) return
    try {
      await fetch(`/api/ordenes-trabajo/${id}`, { method: 'DELETE' })
      fetchOrdenes(search)
    } catch (error) {
      console.error('Error deleting OT:', error)
    }
  }

  // Imprimir Checklist (LV del PMI) - abre una ventana con la lista de verificación
  // para imprimir y rellenar a mano con casillas vacías (☐)
  const imprimirChecklist = (ot: OrdenTrabajo) => {
    const tareas = ot.tareas || []
    const filas = tareas.length > 0
      ? tareas.map((t, i) => `
        <tr>
          <td class="num">${i + 1}</td>
          <td class="desc">${(t.descripcion || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
          <td class="check">☐</td>
          <td class="check">☐</td>
          <td class="check">☐</td>
          <td class="obs"></td>
        </tr>`).join('')
      : `<tr><td colspan="6" style="text-align:center;padding:20px;color:#999;">Sin tareas registradas</td></tr>`

    const fechaStr = ot.fechaInicio
      ? new Date(ot.fechaInicio).toLocaleDateString('es-CL')
      : new Date().toLocaleDateString('es-CL')

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Checklist OT ${ot.otNum}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; margin: 20px; color: #222; }
    h1 { font-size: 18px; color: #0f2044; margin: 0 0 4px 0; }
    h2 { font-size: 13px; color: #444; margin: 0 0 12px 0; font-weight: normal; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f2044; padding-bottom: 10px; margin-bottom: 15px; }
    .header-left { flex: 1; }
    .header-right { text-align: right; font-size: 11px; color: #555; }
    .info { font-size: 12px; margin-bottom: 12px; }
    .info span { display: inline-block; margin-right: 18px; }
    .info b { color: #0f2044; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #0f2044; color: white; padding: 8px; font-size: 12px; text-align: center; border: 1px solid #0f2044; }
    th.desc { text-align: left; }
    td { border: 1px solid #ccc; padding: 6px 8px; font-size: 11px; vertical-align: middle; }
    td.num { text-align: center; width: 30px; color: #555; }
    td.desc { text-align: left; }
    td.check { text-align: center; font-size: 16px; width: 40px; }
    td.obs { width: 28%; }
    .check-title { text-align: center; font-size: 11px; padding: 4px; font-weight: bold; }
    .check-title.ok { color: #16a34a; }
    .check-title.no { color: #dc2626; }
    .check-title.na { color: #6b7280; }
    .signature { margin-top: 50px; display: flex; justify-content: space-between; }
    .sig-line { border-top: 1px solid #000; width: 220px; padding-top: 5px; font-size: 10px; color: #333; }
    .footer-note { margin-top: 20px; font-size: 10px; color: #666; font-style: italic; }
    @media print {
      body { margin: 10px; }
      .no-print { display: none; }
    }
    .no-print { margin-bottom: 15px; }
    .no-print button { padding: 6px 14px; font-size: 12px; cursor: pointer; background: #0f2044; color: white; border: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="no-print">
    <button onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
  </div>
  <div class="header">
    <div class="header-left">
      <h1>ORDEN DE TRABAJO ${ot.otNum}</h1>
      <h2>${(ot.titulo || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</h2>
    </div>
    <div class="header-right">
      <div><b>Fecha:</b> ${fechaStr}</div>
      <div><b>Tipo:</b> ${ot.tipo || '–'}</div>
      <div><b>Prioridad:</b> ${ot.prioridad || '–'}</div>
    </div>
  </div>
  <div class="info">
    <span><b>Ubicación:</b> ${ot.ubicacion || '–'}</span>
    <span><b>Asignado:</b> ${ot.asignado?.nombre || '–'}</span>
    <span><b>Propiedad:</b> ${ot.propiedad?.nombre || '–'}</span>
  </div>

  <h3 style="font-size:13px;color:#0f2044;margin:14px 0 4px 0;">LISTA DE VERIFICACIÓN DE TAREAS (LV - PMI)</h3>
  <table>
    <thead>
      <tr>
        <th style="width:30px;">ÍTEM</th>
        <th class="desc">TAREA / ACTIVIDAD</th>
        <th style="width:40px;" class="check-title ok">OK</th>
        <th style="width:40px;" class="check-title no">NO</th>
        <th style="width:40px;" class="check-title na">N/A</th>
        <th style="width:28%;">OBSERVACIONES</th>
      </tr>
    </thead>
    <tbody>
      ${filas}
    </tbody>
  </table>

  <div class="footer-note">
    Marcar con una X o ✓ la casilla correspondiente. Indicar observaciones si la tarea NO cumple o es N/A.
  </div>

  <div class="signature">
    <div class="sig-line">
      Ejecutado por (firma y nombre)
    </div>
    <div class="sig-line">
      Supervisor / Administrador (firma y nombre)
    </div>
  </div>

  <script>
    window.onload = function() { setTimeout(function(){ window.print(); }, 300); };
  </script>
</body>
</html>`

    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) {
      toast.error('No se pudo abrir la ventana de impresión. Revisa el bloqueador de pop-ups.')
      return
    }
    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()
  }

  // Crear Solicitud de Compra desde los materiales de la OT
  const crearSolicitudDesdeOT = async () => {
    if (materiales.length === 0) {
      toast.error('La OT no tiene materiales para solicitar')
      return
    }
    setCreandoSolicitud(true)
    try {
      const materialesSolicitud = materiales
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
        setCreandoSolicitud(false)
        return
      }

      const total = materialesSolicitud.reduce((acc, m) => acc + (m.total || 0), 0)

      const payload = {
        titulo: `Solicitud de compra para ${editingOT?.otNum || 'OT'} - ${formData.titulo || 'materiales OT'}`.slice(0, 200),
        descripcion: `Solicitud generada automáticamente desde la Orden de Trabajo ${editingOT?.otNum || ''}.`,
        prioridad: formData.prioridad === 'Urgente' ? 'Alta' : (formData.prioridad as 'Media' | 'Alta' | 'Baja' | 'Urgente') || 'Media',
        materiales: materialesSolicitud,
        totalEstimado: total,
        origenTipo: 'OT',
        origenId: editingOT?.id || null,
        origenCodigo: editingOT?.otNum || null,
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
      setCrearSolicitudDialogOpen(false)
    } catch (error) {
      console.error('Error creando solicitud de compra:', error)
      toast.error(error instanceof Error ? error.message : 'Error al crear la solicitud de compra')
    } finally {
      setCreandoSolicitud(false)
    }
  }

  // Material handlers
  const addMaterial = () => {
    setMateriales([...materiales, {
      id: `temp-${Date.now()}`,
      descripcion: '',
      cantidad: 1,
      unidad: 'unidad',
      precioUnit: 0,
      total: 0
    }])
  }

  const addMaterialFromCatalog = (catMat: CatMaterial) => {
    setMateriales([...materiales, {
      id: `temp-${Date.now()}`,
      descripcion: `${catMat.codigo ? `[${catMat.codigo}] ` : ''}${catMat.nombre}${catMat.centroCosto ? ` (CC: ${catMat.centroCosto.codigo})` : ''}`,
      cantidad: 1,
      unidad: catMat.unidad,
      precioUnit: catMat.precioUnit,
      total: catMat.precioUnit
    }])
  }

  const updateMaterial = (index: number, field: string, value: any) => {
    const updated = [...materiales]
    updated[index] = { ...updated[index], [field]: value }
    if (field === 'cantidad' || field === 'precioUnit') {
      updated[index].total = updated[index].cantidad * updated[index].precioUnit
    }
    setMateriales(updated)
  }

  const removeMaterial = (index: number) => {
    setMateriales(materiales.filter((_, i) => i !== index))
  }

  // Herramienta handlers
  const addHerramienta = () => {
    setHerramientas([...herramientas, {
      id: `temp-${Date.now()}`,
      nombre: '',
      cantidad: 1
    }])
  }

  const addHerramientaFromCatalog = (catHerr: CatHerramienta) => {
    setHerramientas([...herramientas, {
      id: `temp-${Date.now()}`,
      nombre: `${catHerr.codigo ? `[${catHerr.codigo}] ` : ''}${catHerr.nombre}${catHerr.marca ? ` (${catHerr.marca})` : ''}${catHerr.centroCosto ? ` [CC: ${catHerr.centroCosto.codigo}]` : ''}`,
      cantidad: 1
    }])
  }

  const updateHerramienta = (index: number, field: string, value: any) => {
    const updated = [...herramientas]
    updated[index] = { ...updated[index], [field]: value }
    setHerramientas(updated)
  }

  const removeHerramienta = (index: number) => {
    setHerramientas(herramientas.filter((_, i) => i !== index))
  }

  // Tarea handlers
  const addTarea = () => {
    setTareas([...tareas, {
      id: `temp-${Date.now()}`,
      descripcion: '',
      cantidad: 1,
      estado: 'Pendiente',
      cumple: null,
      ok: false,
      noOk: false,
      na: false
    }])
  }

  const addTareaFromCatalog = (catTar: CatTarea) => {
    setTareas([...tareas, {
      id: `temp-${Date.now()}`,
      descripcion: `${catTar.codigo ? `[${catTar.codigo}] ` : ''}${catTar.nombre}${catTar.centroCosto ? ` (CC: ${catTar.centroCosto.codigo})` : ''}`,
      cantidad: 1,
      estado: 'Pendiente',
      cumple: null,
      ok: false,
      noOk: false,
      na: false
    }])
  }

  const updateTarea = (index: number, field: string, value: any) => {
    const updated = [...tareas]
    updated[index] = { ...updated[index], [field]: value }
    setTareas(updated)
  }

  // Toggle checklist OK / NO / N/A (mutuamente excluyentes)
  const toggleTareaCheck = (index: number, field: 'ok' | 'noOk' | 'na') => {
    const updated = [...tareas]
    const current = !!updated[index][field]
    // Si se activa, desactiva los otros dos (mutuamente excluyentes)
    updated[index] = {
      ...updated[index],
      ok: field === 'ok' ? !current : false,
      noOk: field === 'noOk' ? !current : false,
      na: field === 'na' ? !current : false,
    }
    setTareas(updated)
  }

  const removeTarea = (index: number) => {
    setTareas(tareas.filter((_, i) => i !== index))
  }

  // Personal handlers
  const addPersonalOT = () => {
    setPersonalOT([...personalOT, {
      id: `temp-${Date.now()}`,
      nombre: '',
      tipo: 'Interno',
      cantidad: 1,
      precioUnit: 0,
      horasTrabajadas: 0,
      total: 0,
      cumple: null
    }])
  }

  const addPersonalFromEmployee = (emp: Personal) => {
    const valorHora = Math.round(calcularValorHora(emp.sueldoBase))
    setPersonalOT([...personalOT, {
      id: `temp-${Date.now()}`,
      nombre: emp.nombre,
      tipo: 'Interno',
      cantidad: 1,
      precioUnit: valorHora,
      horasTrabajadas: 0,
      total: 0,
      cumple: null
    }])
  }

  const updatePersonalOT = (index: number, field: string, value: any) => {
    const updated = [...personalOT]
    updated[index] = { ...updated[index], [field]: value }
    
    // Si selecciona personal interno, obtener valor hora del sueldo
    if (field === 'nombre' && updated[index].tipo === 'Interno') {
      const p = personal.find(per => per.nombre === value)
      if (p) {
        updated[index].precioUnit = Math.round(calcularValorHora(p.sueldoBase))
      }
    }
    
    // Calcular total
    updated[index].total = updated[index].precioUnit * updated[index].horasTrabajadas * updated[index].cantidad
    setPersonalOT(updated)
  }

  const removePersonalOT = (index: number) => {
    setPersonalOT(personalOT.filter((_, i) => i !== index))
  }

  // Calcular totales
  const totalMateriales = materiales.reduce((sum, m) => sum + (m.total || m.cantidad * m.precioUnit), 0)
  const totalPersonal = personalOT.reduce((sum, p) => sum + (p.total || p.precioUnit * p.horasTrabajadas * p.cantidad), 0)
  const granTotal = totalMateriales + totalPersonal
  
  // Calcular tiempo total estimado
  const tiempoEstimadoTareas = tareas.reduce((sum, t) => {
    const catTarea = catTareas.find(ct => ct.nombre === t.descripcion || ct.nombre === t.descripcion.replace(/^\[[^\]]+\]\s*/, '').replace(/\s*\(CC:.*\)$/, ''))
    return sum + (catTarea?.tiempoEstimado || 0) * t.cantidad
  }, 0)
  
  // Calcular diferencia de tiempo
  const diferenciaTiempo = formData.tiempoReal - (formData.tiempoEst || tiempoEstimadoTareas)

  // Exportar a CSV
  const exportToCSV = () => {
    const headers = ['N° OT', 'Título', 'Tipo', 'Prioridad', 'Estado', 'Ubicación', 'Centro Costo', 'Fecha Inicio', 'Fecha Límite', 'Tiempo Estimado', 'Tiempo Real', 'Costo Estimado', 'Costo Real', 'Progreso', 'Asignado']
    
    const rows = ordenes.map(ot => [
      ot.otNum,
      `"${ot.titulo.replace(/"/g, '""')}"`,
      ot.tipo,
      ot.prioridad,
      ot.estado,
      `"${(ot.ubicacion || '').replace(/"/g, '""')}"`,
      ot.centroCosto?.codigo || '',
      ot.fechaInicio || '',
      ot.fechaLimite || '',
      formatMinutes(ot.tiempoEst),
      formatMinutes(ot.tiempoReal),
      ot.costoEstimado,
      ot.costoReal,
      `${ot.progreso}%`,
      ot.asignado?.nombre || ''
    ])
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `ordenes_trabajo_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const stats = {
    Pendiente: ordenes.filter(o => o.estado === 'Pendiente').length,
    'En Progreso': ordenes.filter(o => o.estado === 'En Progreso').length,
    Completado: ordenes.filter(o => o.estado === 'Completado').length,
    Cancelado: ordenes.filter(o => o.estado === 'Cancelado').length,
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <TableroIndicadores
        cards={[
          { titulo: 'Pendiente', numero: stats.Pendiente, icon: <AlertTriangle className="w-5 h-5" />, color: 'naranja' },
          { titulo: 'En Progreso', numero: stats['En Progreso'], icon: <Clock className="w-5 h-5" />, color: 'azul' },
          { titulo: 'Completado', numero: stats.Completado, icon: <CheckCircle className="w-5 h-5" />, color: 'verde' },
          { titulo: 'Cancelado', numero: stats.Cancelado, icon: <X className="w-5 h-5" />, color: 'rojo' },
        ]}
      />

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Buscar OT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={seedCatalogs} className="flex items-center gap-2">
          <Database className="w-4 h-4" />
          Cargar Catálogos
        </Button>
        <Button variant="outline" onClick={exportToCSV}>
          <Download className="w-4 h-4 mr-1" /> Exportar CSV
        </Button>
        <Button onClick={() => openDialog()}>
          <Plus className="w-4 h-4 mr-1" /> Nueva OT
        </Button>
      </div>

      {/* Catalog status */}
      {catalogsLoaded && (
        <div className="flex gap-4 text-xs text-slate-500 bg-slate-50 p-2 rounded flex-wrap">
          <span><Building2 className="w-3 h-3 inline mr-1" />{centrosCosto.length} centros de costo</span>
          <span><Wrench className="w-3 h-3 inline mr-1" />{catHerramientas.length} herramientas</span>
          <span><CheckSquare className="w-3 h-3 inline mr-1" />{catTareas.length} tareas</span>
          <span><Package className="w-3 h-3 inline mr-1" />{catMateriales.length} materiales</span>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Órdenes de Trabajo ({ordenes.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <p className="md:hidden text-xs text-slate-400 text-center py-1">← Desliza horizontalmente para ver más →</p>
          <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-3 text-xs font-bold text-slate-500 uppercase">N° OT</th>
                  <th className="text-left p-3 text-xs font-bold text-slate-500 uppercase">Título</th>
                  <th className="text-left p-3 text-xs font-bold text-slate-500 uppercase">Tipo</th>
                  <th className="text-left p-3 text-xs font-bold text-slate-500 uppercase">Prioridad</th>
                  <th className="text-left p-3 text-xs font-bold text-slate-500 uppercase">Estado</th>
                  <th className="text-left p-3 text-xs font-bold text-slate-500 uppercase">Centro Costo</th>
                  <th className="text-left p-3 text-xs font-bold text-slate-500 uppercase">Tiempo</th>
                  <th className="text-left p-3 text-xs font-bold text-slate-500 uppercase">Costo Real</th>
                  <th className="text-left p-3 text-xs font-bold text-slate-500 uppercase">Progreso</th>
                  <th className="text-center p-3 text-xs font-bold text-slate-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="p-8 text-center text-slate-500">Cargando...</td></tr>
                ) : ordenes.length === 0 ? (
                  <tr><td colSpan={10} className="p-8 text-center text-slate-500">Sin órdenes de trabajo</td></tr>
                ) : (
                  ordenes.map((ot) => (
                    <tr key={ot.id} className="border-b last:border-0 hover:bg-slate-50 cursor-pointer" onClick={() => openDetailDialog(ot)}>
                      <td className="p-3 font-mono text-xs font-bold text-[#0f2044]">
                        {ot.otNum}
                        {ot.esRecurrente && <RefreshCw className="w-3 h-3 inline ml-1 text-blue-500" />}
                      </td>
                      <td className="p-3 font-semibold">{ot.titulo}</td>
                      <td className="p-3">
                        <Badge className={tipoColors[ot.tipo] || 'bg-slate-100'}>{ot.tipo}</Badge>
                      </td>
                      <td className="p-3">
                        <Badge className={prioridadColors[ot.prioridad] || 'bg-slate-100'}>{ot.prioridad}</Badge>
                      </td>
                      <td className="p-3">
                        <Badge className={estadoColors[ot.estado] || 'bg-slate-100'}>{ot.estado}</Badge>
                      </td>
                      <td className="p-3 text-xs font-mono">
                        {ot.centroCosto ? (
                          <span title={ot.centroCosto.nombre}>
                            {ot.centroCosto.codigo}
                          </span>
                        ) : '–'}
                      </td>
                      <td className="p-3 text-xs">
                        <div className="flex flex-col">
                          <span>Est: {formatMinutes(ot.tiempoEst)}</span>
                          <span className={ot.tiempoReal > ot.tiempoEst ? 'text-red-600' : 'text-green-600'}>
                            Real: {formatMinutes(ot.tiempoReal)}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-xs font-bold text-red-600">{formatCLP(ot.costoReal)}</td>
                      <td className="p-3 min-w-[100px]">
                        <div className="flex items-center gap-2">
                          <Progress value={ot.progreso} className="h-1.5 flex-1" />
                          <span className="text-xs text-slate-500">{ot.progreso}%</span>
                        </div>
                      </td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center gap-1">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7 text-slate-600 hover:text-slate-700" 
                            title="Imprimir Checklist"
                            aria-label="Imprimir Checklist"
                            onClick={() => imprimirChecklist(ot)}
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Button>
                          {isPersonal() ? (
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7 text-green-600 hover:text-green-700" 
                              title="Actualizar Progreso"
                              aria-label="Actualizar progreso"
                              onClick={() => openProgressDialog(ot)}
                            >
                              <CheckSquare className="w-3.5 h-3.5" />
                            </Button>
                          ) : (
                            <>
                              <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Editar orden" onClick={() => openDialog(ot)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:text-red-700" aria-label="Eliminar orden" onClick={() => handleDelete(ot.id)}>
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

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{editingOT ? 'Editar' : 'Nueva'} Orden de Trabajo</DialogTitle>
            <DialogDescription className="text-muted-foreground">Completa los detalles de la orden de trabajo</DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid grid-cols-7 w-full h-9">
              <TabsTrigger value="general" className="text-xs">General</TabsTrigger>
              <TabsTrigger value="materiales" className="text-xs">Materiales</TabsTrigger>
              <TabsTrigger value="herramientas" className="text-xs">Herramientas</TabsTrigger>
              <TabsTrigger value="tareas" className="text-xs">Tareas</TabsTrigger>
              <TabsTrigger value="personal" className="text-xs">Personal</TabsTrigger>
              <TabsTrigger value="fotos" className="text-xs">Fotos</TabsTrigger>
              <TabsTrigger value="documentos" className="text-xs">Documentos</TabsTrigger>
            </TabsList>
            
            <div className="py-4">
              {/* General Tab */}
              <TabsContent value="general" className="space-y-4 mt-0">
                {/* Sección: Información Básica */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                    <span className="bg-[#0f2044] text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">1</span>
                    Información Básica
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <Label className="text-xs">Título *</Label>
                      <Input value={formData.titulo} onChange={(e) => setFormData({...formData, titulo: e.target.value})} placeholder="Título de la OT" className="w-full" />
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <Label className="text-xs">Ubicación</Label>
                      <Input value={formData.ubicacion} onChange={(e) => setFormData({...formData, ubicacion: e.target.value})} placeholder="Ubicación del trabajo" className="w-full" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Descripción</Label>
                    <Textarea value={formData.descripcion} onChange={(e) => setFormData({...formData, descripcion: e.target.value})} placeholder="Descripción detallada..." rows={2} />
                  </div>
                </div>

                <Separator />

                {/* Sección: Clasificación */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                    <span className="bg-[#0f2044] text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">2</span>
                    Clasificación
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <Label className="text-xs">Tipo</Label>
                      <Select value={formData.tipo} onValueChange={(v) => setFormData({...formData, tipo: v})}>
                        <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['Correctivo', 'Preventivo', 'Mejora', 'Emergencia'].map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <Label className="text-xs">Prioridad</Label>
                      <Select value={formData.prioridad} onValueChange={(v) => setFormData({...formData, prioridad: v})}>
                        <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['Urgente', 'Alta', 'Media', 'Baja'].map(p => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <Label className="text-xs">Estado</Label>
                      <Select value={formData.estado} onValueChange={(v) => setFormData({...formData, estado: v})}>
                        <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['Pendiente', 'En Progreso', 'Completado', 'Cancelado'].map(s => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <Label className="text-xs">Progreso (%)</Label>
                      <Input type="number" min="0" max="100" value={formData.progreso} onChange={(e) => setFormData({...formData, progreso: parseInt(e.target.value) || 0})} className="h-9 w-full text-right" />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Sección: Centro de Costo */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                    <span className="bg-[#0f2044] text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">3</span>
                    <Building2 className="w-4 h-4" /> Centro de Costo e Imputación
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 min-w-0">
                      <Label className="text-xs font-medium">Centro de Costo</Label>
                      <Select value={formData.centroCostoId} onValueChange={(v) => setFormData({...formData, centroCostoId: v})}>
                        <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin centro de costo</SelectItem>
                          {centrosCosto.map(cc => (
                            <SelectItem key={cc.id} value={cc.id} className="max-w-full">
                              <span className="truncate">{cc.codigo} - {cc.nombre}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formData.centroCostoId && formData.centroCostoId !== 'none' && (
                        <p className="text-xs text-slate-500 truncate">
                          Presupuesto: {formatCLP(centrosCosto.find(cc => cc.id === formData.centroCostoId)?.presupuestoMens || 0)}/mes
                        </p>
                      )}
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <Label className="text-xs font-medium">Forma de Pago</Label>
                      <Select value={formData.formaPago} onValueChange={(v) => setFormData({...formData, formaPago: v})}>
                        <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Gasto Común Mensual">Gasto Común Mensual</SelectItem>
                          <SelectItem value="Fondo de Reserva">Fondo de Reserva</SelectItem>
                          <SelectItem value="Gasto Extraordinario">Gasto Extraordinario</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Recurrente */}
                  <div className="flex items-center gap-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
                    <Checkbox 
                      id="esRecurrente"
                      checked={formData.esRecurrente}
                      onCheckedChange={(checked) => setFormData({...formData, esRecurrente: checked as boolean})}
                    />
                    <label htmlFor="esRecurrente" className="text-sm cursor-pointer flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-blue-500" />
                      Tarea Recurrente (generar automáticamente)
                    </label>
                  </div>
                </div>

                <Separator />

                {/* Sección: Fechas */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                    <span className="bg-[#0f2044] text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">4</span>
                    <Calendar className="w-4 h-4" /> Fechas
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <Label className="text-xs">Inicio Planificado</Label>
                      <DatePicker
                        date={formData.fechaInicio}
                        onDateChange={(d) => setFormData({...formData, fechaInicio: d || null})}
                        placeholder="Seleccionar..."
                      />
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <Label className="text-xs">Fecha Límite</Label>
                      <DatePicker
                        date={formData.fechaLimite}
                        onDateChange={(d) => setFormData({...formData, fechaLimite: d || null})}
                        placeholder="Seleccionar..."
                      />
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <Label className="text-xs">Inicio Real</Label>
                      <DatePicker
                        date={formData.fechaInicioReal}
                        onDateChange={(d) => setFormData({...formData, fechaInicioReal: d || null})}
                        placeholder="Seleccionar..."
                      />
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <Label className="text-xs">Fin Real</Label>
                      <DatePicker
                        date={formData.fechaFinReal}
                        onDateChange={(d) => setFormData({...formData, fechaFinReal: d || null})}
                        placeholder="Seleccionar..."
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Sección: Asignación */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                    <span className="bg-[#0f2044] text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">5</span>
                    <Users className="w-4 h-4" /> Asignación
                  </h4>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <Label className="text-xs">Asignado a</Label>
                      <Select value={formData.asignadoId} onValueChange={(v) => setFormData({...formData, asignadoId: v})}>
                        <SelectTrigger className="h-9 w-full"><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sin asignar</SelectItem>
                          {personalAsignable.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nombre}{p.cargo ? ` · ${p.cargo}` : ''}{p.sueldoBase > 0 ? ` (${formatCLP(calcularValorHora(p.sueldoBase))}/hr)` : ''}
                            </SelectItem>
                          ))}
                          {personalAsignable.length === 0 && (
                            <div className="px-2 py-1.5 text-xs text-muted-foreground italic">
                              No hay personal asignable. Conserjes, guardias y encargados de cámaras están excluidos.
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                      {personal.length > personalAsignable.length && (
                        <p className="text-[10px] text-muted-foreground">
                          {personal.length - personalAsignable.length} persona(s) excluida(s) por cargo (conserjes, guardias, encargados de cámaras)
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Sección: Control de Tiempo */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                    <span className="bg-[#0f2044] text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">6</span>
                    <Clock className="w-4 h-4" /> Control de Tiempo
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <Label className="text-xs">Tiempo Estimado (min)</Label>
                      <Input 
                        type="number" 
                        value={formData.tiempoEst || tiempoEstimadoTareas} 
                        onChange={(e) => setFormData({...formData, tiempoEst: parseInt(e.target.value) || 0})} 
                        className="h-9 w-full text-right"
                      />
                      {tiempoEstimadoTareas > 0 && (
                        <p className="text-xs text-blue-600">De tareas: {formatMinutes(tiempoEstimadoTareas)}</p>
                      )}
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <Label className="text-xs">Tiempo Real (auto)</Label>
                      <Input
                        type="number"
                        value={formData.tiempoReal}
                        readOnly
                        tabIndex={-1}
                        className="h-9 w-full bg-slate-100 cursor-not-allowed text-slate-600 text-right"
                        title="Calculado automáticamente al cambiar estado o progreso"
                      />
                      <p className="text-[10px] text-slate-400">Autocalculado al completar</p>
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <Label className="text-xs">Diferencia</Label>
                      <div className={`h-9 px-3 rounded border flex items-center text-sm font-semibold ${
                        diferenciaTiempo > 0 ? 'bg-red-50 border-red-200 text-red-700' : 
                        diferenciaTiempo < 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50'
                      }`}>
                        {diferenciaTiempo > 0 ? '+' : ''}{formatMinutes(diferenciaTiempo)}
                      </div>
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <Label className="text-xs">Costo Estimado</Label>
                      <Input type="number" value={formData.costoEstimado} onChange={(e) => setFormData({...formData, costoEstimado: parseFloat(e.target.value) || 0})} className="h-9 w-full text-right" />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Notas */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Notas adicionales</Label>
                  <Textarea value={formData.notas} onChange={(e) => setFormData({...formData, notas: e.target.value})} placeholder="Notas u observaciones..." rows={2} />
                </div>
              </TabsContent>
              
              {/* Materials Tab */}
              <TabsContent value="materiales" className="space-y-4 mt-0">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <h3 className="font-semibold text-sm">Materiales ({materiales.length})</h3>
                  <div className="flex gap-2 flex-wrap">
                    {catMateriales.length > 0 && (
                      <div className="flex gap-2 items-center">
                        <Input
                          id="input-buscar-material"
                          list="datalist-materiales"
                          placeholder="Escribir material..."
                          className="w-[250px] h-8"
                          onChange={(e) => {
                            const nombre = e.target.value.toLowerCase();
                            const mat = catMateriales.find(m =>
                              m.nombre.toLowerCase() === nombre ||
                              (m.codigo && m.codigo.toLowerCase() === nombre.toUpperCase())
                            );
                            if (mat) {
                              addMaterialFromCatalog(mat);
                              e.target.value = '';
                            }
                          }}
                        />
                        <datalist id="datalist-materiales">
                          {catMateriales.map(m => (
                            <option key={m.id} value={m.nombre}>
                              {m.codigo ? `[${m.codigo}] ` : ''}{formatCLP(m.precioUnit)} - {m.unidad}
                            </option>
                          ))}
                        </datalist>
                      </div>
                    )}
                    <Button size="sm" onClick={addMaterial}><Plus className="w-3.5 h-3.5 mr-1" /> Manual</Button>
                  </div>
                </div>
                
                {materiales.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 border rounded-lg bg-slate-50">Sin materiales - seleccione del catálogo o agregue manualmente</div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left p-2 text-xs">Descripción</th>
                          <th className="text-center p-2 w-20 text-xs">Cant.</th>
                          <th className="text-center p-2 w-24 text-xs">Unidad</th>
                          <th className="text-right p-2 w-28 text-xs">P. Unit.</th>
                          <th className="text-right p-2 w-28 text-xs">Total</th>
                          <th className="p-2 w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {materiales.map((m, i) => (
                          <tr key={m.id} className="border-t">
                            <td className="p-2">
                              <Input value={m.descripcion} onChange={(e) => updateMaterial(i, 'descripcion', e.target.value)} className="h-8 w-full" />
                            </td>
                            <td className="p-2">
                              <Input type="number" value={m.cantidad} onChange={(e) => updateMaterial(i, 'cantidad', parseFloat(e.target.value) || 0)} className="h-8 w-full text-center" />
                            </td>
                            <td className="p-2">
                              <Select value={m.unidad} onValueChange={(v) => updateMaterial(i, 'unidad', v)}>
                                <SelectTrigger className="h-8 w-full"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {['unidad', 'metro', 'm²', 'm³', 'kilo', 'saco', 'litro', 'galón', 'caja', 'bolsa'].map(u => (
                                    <SelectItem key={u} value={u}>{u}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-2">
                              <Input type="number" value={m.precioUnit} onChange={(e) => updateMaterial(i, 'precioUnit', parseFloat(e.target.value) || 0)} className="h-8 w-full text-right" />
                            </td>
                            <td className="p-2 text-right font-mono font-semibold">{formatCLP(m.total)}</td>
                            <td className="p-2 text-center">
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" aria-label="Eliminar material" onClick={() => removeMaterial(i)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                <div className="flex justify-between items-center font-semibold text-sm">
                  <div>
                    {materiales.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-[#0f2044] border-[#0f2044]/30 hover:bg-[#0f2044]/5"
                        onClick={() => setCrearSolicitudDialogOpen(true)}
                        title="Crea una solicitud de compra con estos materiales y envía email a administración"
                      >
                        <ShoppingCart className="w-3.5 h-3.5 mr-1" /> Crear Solicitud de Compra
                      </Button>
                    )}
                  </div>
                  <div>
                    Total Materiales: <span className="ml-2 text-red-600">{formatCLP(totalMateriales)}</span>
                  </div>
                </div>
              </TabsContent>
              
              {/* Tools Tab */}
              <TabsContent value="herramientas" className="space-y-4 mt-0">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <h3 className="font-semibold text-sm">Herramientas ({herramientas.length})</h3>
                  <div className="flex gap-2 flex-wrap">
                    {catHerramientas.length > 0 && (
                      <div className="flex gap-2 items-center">
                        <Input
                          id="input-buscar-herramienta"
                          list="datalist-herramientas"
                          placeholder="Escribir herramienta..."
                          className="w-[250px] h-8"
                          onChange={(e) => {
                            const nombre = e.target.value.toLowerCase();
                            const herr = catHerramientas.find(h =>
                              h.nombre.toLowerCase() === nombre ||
                              (h.codigo && h.codigo.toLowerCase() === nombre.toUpperCase())
                            );
                            if (herr) {
                              addHerramientaFromCatalog(herr);
                              e.target.value = '';
                            }
                          }}
                        />
                        <datalist id="datalist-herramientas">
                          {catHerramientas.map(h => (
                            <option key={h.id} value={h.nombre}>
                              {h.codigo ? `[${h.codigo}] ` : ''}{h.marca || ''} {h.modelo || ''} ({h.estado})
                            </option>
                          ))}
                        </datalist>
                      </div>
                    )}
                    <Button size="sm" onClick={addHerramienta}><Plus className="w-3.5 h-3.5 mr-1" /> Manual</Button>
                  </div>
                </div>
                
                {herramientas.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 border rounded-lg bg-slate-50">Sin herramientas - seleccione del catálogo o agregue manualmente</div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left p-2 text-xs">Herramienta</th>
                          <th className="text-center p-2 w-20 text-xs">Cantidad</th>
                          <th className="p-2 w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {herramientas.map((h, i) => (
                          <tr key={h.id} className="border-t">
                            <td className="p-2">
                              <Input value={h.nombre} onChange={(e) => updateHerramienta(i, 'nombre', e.target.value)} className="h-8 w-full" placeholder="Nombre de herramienta" />
                            </td>
                            <td className="p-2">
                              <Input type="number" value={h.cantidad} onChange={(e) => updateHerramienta(i, 'cantidad', parseInt(e.target.value) || 1)} className="h-8 w-full text-center" />
                            </td>
                            <td className="p-2 text-center">
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" aria-label="Eliminar herramienta" onClick={() => removeHerramienta(i)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </TabsContent>
              
              {/* Tasks Tab */}
              <TabsContent value="tareas" className="space-y-4 mt-0">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <h3 className="font-semibold text-sm">Tareas ({tareas.length})</h3>
                  <div className="flex gap-2">
                    {catTareas.length > 0 && (
                      <Select onValueChange={(v) => {
                        const tar = catTareas.find(t => t.id === v)
                        if (tar) addTareaFromCatalog(tar)
                      }}>
                        <SelectTrigger className="w-[280px] h-8">
                          <SelectValue placeholder="Agregar del catálogo..." />
                        </SelectTrigger>
                        <SelectContent>
                          {catTareas.map(t => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.codigo ? `[${t.codigo}] ` : ''}{t.nombre} ({t.frecuencia || t.tipoMantencion})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Button size="sm" onClick={addTarea}><Plus className="w-3.5 h-3.5 mr-1" /> Manual</Button>
                  </div>
                </div>
                
                {tareas.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 border rounded-lg bg-slate-50">Sin tareas - seleccione del catálogo o agregue manualmente</div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left p-2 text-xs">Tarea</th>
                          <th className="text-center p-2 w-20 text-xs">Cant.</th>
                          <th className="text-center p-2 w-28 text-xs">Estado</th>
                          <th className="text-center p-2 w-12 text-xs text-green-700">OK</th>
                          <th className="text-center p-2 w-12 text-xs text-red-700">NO</th>
                          <th className="text-center p-2 w-12 text-xs text-slate-500">N/A</th>
                          <th className="p-2 w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {tareas.map((t, i) => (
                          <tr key={t.id} className="border-t">
                            <td className="p-2">
                              <Input value={t.descripcion} onChange={(e) => updateTarea(i, 'descripcion', e.target.value)} className="h-8 w-full" />
                            </td>
                            <td className="p-2">
                              <Input type="number" value={t.cantidad} onChange={(e) => updateTarea(i, 'cantidad', parseInt(e.target.value) || 1)} className="h-8 w-full text-center" />
                            </td>
                            <td className="p-2">
                              <Select value={t.estado} onValueChange={(v) => updateTarea(i, 'estado', v)}>
                                <SelectTrigger className="h-8 w-full"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {['Pendiente', 'En Progreso', 'Completado'].map(s => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                aria-label="Marcar OK"
                                onClick={() => toggleTareaCheck(i, 'ok')}
                                className={`inline-flex items-center justify-center w-6 h-6 rounded border-2 text-sm font-bold transition-colors ${
                                  t.ok
                                    ? 'bg-green-500 border-green-500 text-white'
                                    : 'bg-white border-green-400 text-transparent hover:border-green-600'
                                }`}
                              >
                                ✓
                              </button>
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                aria-label="Marcar NO OK"
                                onClick={() => toggleTareaCheck(i, 'noOk')}
                                className={`inline-flex items-center justify-center w-6 h-6 rounded border-2 text-sm font-bold transition-colors ${
                                  t.noOk
                                    ? 'bg-red-500 border-red-500 text-white'
                                    : 'bg-white border-red-400 text-transparent hover:border-red-600'
                                }`}
                              >
                                ✗
                              </button>
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                aria-label="Marcar N/A"
                                onClick={() => toggleTareaCheck(i, 'na')}
                                className={`inline-flex items-center justify-center w-6 h-6 rounded border-2 text-sm font-bold transition-colors ${
                                  t.na
                                    ? 'bg-slate-400 border-slate-400 text-white'
                                    : 'bg-white border-slate-300 text-transparent hover:border-slate-500'
                                }`}
                              >
                                –
                              </button>
                            </td>
                            <td className="p-2 text-center">
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" aria-label="Eliminar tarea" onClick={() => removeTarea(i)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {tiempoEstimadoTareas > 0 && (
                  <div className="bg-slate-50 p-3 rounded text-sm">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Tiempo total estimado de tareas: <strong>{formatMinutes(tiempoEstimadoTareas)}</strong>
                  </div>
                )}
              </TabsContent>
              
              {/* Personnel Tab */}
              <TabsContent value="personal" className="space-y-4 mt-0">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <h3 className="font-semibold text-sm">Personal ({personalOT.length})</h3>
                  <div className="flex gap-2">
                    {personalAsignable.length > 0 && (
                      <Select onValueChange={(v) => {
                        const emp = personalAsignable.find(p => p.id === v)
                        if (emp) addPersonalFromEmployee(emp)
                      }}>
                        <SelectTrigger className="w-[200px] h-8">
                          <SelectValue placeholder="Agregar empleado..." />
                        </SelectTrigger>
                        <SelectContent>
                          {personalAsignable.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nombre}{p.cargo ? ` · ${p.cargo}` : ''} - {formatCLP(calcularValorHora(p.sueldoBase))}/hr
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <Button size="sm" onClick={addPersonalOT}><Plus className="w-3.5 h-3.5 mr-1" /> Externo</Button>
                  </div>
                </div>
                
                {personalOT.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 border rounded-lg bg-slate-50">Sin personal asignado - seleccione un empleado o agregue personal externo</div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left p-2 text-xs">Nombre</th>
                          <th className="text-center p-2 w-20 text-xs">Tipo</th>
                          <th className="text-center p-2 w-20 text-xs">Cant.</th>
                          <th className="text-right p-2 w-28 text-xs">$ Hora</th>
                          <th className="text-right p-2 w-20 text-xs">Hrs</th>
                          <th className="text-right p-2 w-28 text-xs">Total</th>
                          <th className="p-2 w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {personalOT.map((p, i) => (
                          <tr key={p.id} className="border-t">
                            <td className="p-2">
                              <Input 
                                value={p.nombre} 
                                onChange={(e) => updatePersonalOT(i, 'nombre', e.target.value)} 
                                className="h-8 w-full" 
                                placeholder="Nombre"
                              />
                            </td>
                            <td className="p-2">
                              <Select value={p.tipo} onValueChange={(v) => updatePersonalOT(i, 'tipo', v)}>
                                <SelectTrigger className="h-8 w-full"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Interno">Interno</SelectItem>
                                  <SelectItem value="Externo">Externo</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-2">
                              <Input type="number" value={p.cantidad} onChange={(e) => updatePersonalOT(i, 'cantidad', parseInt(e.target.value) || 1)} className="h-8 w-full text-center" />
                            </td>
                            <td className="p-2">
                              <Input type="number" value={p.precioUnit} onChange={(e) => updatePersonalOT(i, 'precioUnit', parseFloat(e.target.value) || 0)} className="h-8 w-full text-right" />
                            </td>
                            <td className="p-2">
                              <Select value={String(p.horasTrabajadas)} onValueChange={(v) => updatePersonalOT(i, 'horasTrabajadas', parseFloat(v) || 0)}>
                                <SelectTrigger className="h-8 w-full">
                                  <SelectValue placeholder="Hrs" />
                                </SelectTrigger>
                                <SelectContent>
                                  {HORAS_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-2 text-right font-mono font-semibold">{formatCLP(p.total)}</td>
                            <td className="p-2 text-center">
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" aria-label="Eliminar personal" onClick={() => removePersonalOT(i)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                <div className="flex justify-end font-semibold text-sm">
                  Total Mano de Obra: <span className="ml-2 text-red-600">{formatCLP(totalPersonal)}</span>
                </div>
              </TabsContent>
              
              {/* Photos Tab */}
              <TabsContent value="fotos" className="space-y-4 mt-0">
                {/* Fotos Antes */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Camera className="w-4 h-4 text-amber-500" /> Fotos ANTES ({fotosAntes.length})
                      {(editingOT as any)?.fotosAntesCount > 0 && fotosAntes.length === 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs"
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/ordenes-trabajo/${editingOT.id}?fotos=true`)
                              if (res.ok) {
                                const ot = await res.json()
                                setFotosAntes(ot.fotosAntes || [])
                              }
                            } catch (e) { console.error('Error cargando fotos:', e) }
                          }}
                        >
                          <Eye className="w-3 h-3 mr-1" /> Cargar {(editingOT as any).fotosAntesCount} foto(s)
                        </Button>
                      )}
                    </h3>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = e.target.files
                          if (files) {
                            Array.from(files).forEach(file => {
                              const reader = new FileReader()
                              reader.onloadend = () => {
                                setFotosAntes(prev => [...prev, reader.result as string])
                              }
                              reader.readAsDataURL(file)
                            })
                          }
                          e.target.value = ''
                        }}
                      />
                      <Button size="sm" variant="outline" asChild>
                        <span><Plus className="w-3.5 h-3.5 mr-1" /> Agregar Foto</span>
                      </Button>
                    </label>
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                    {fotosAntes.map((foto, i) => (
                      <div key={i} className="relative group aspect-square bg-slate-100 rounded-lg overflow-hidden border-2 border-amber-200">
                        <img src={foto} alt={`Antes ${i+1}`} className="w-full h-full object-cover" />
                        <div className="absolute top-1 left-1 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded font-semibold">
                          ANTES
                        </div>
                        <button
                          aria-label="Eliminar foto"
                          onClick={() => setFotosAntes(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {fotosAntes.length === 0 && (
                      <div className="col-span-full py-8 text-center text-slate-500 border-2 border-dashed rounded-lg">
                        <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Sin fotos antes del trabajo</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <Separator />
                
                {/* Fotos Después */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <Camera className="w-4 h-4 text-green-500" /> Fotos DESPUÉS ({fotosDespues.length})
                      {(editingOT as any)?.fotosDespuesCount > 0 && fotosDespues.length === 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs"
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/ordenes-trabajo/${editingOT.id}?fotos=true`)
                              if (res.ok) {
                                const ot = await res.json()
                                setFotosDespues(ot.fotosDespues || [])
                              }
                            } catch (e) { console.error('Error cargando fotos:', e) }
                          }}
                        >
                          <Eye className="w-3 h-3 mr-1" /> Cargar {(editingOT as any).fotosDespuesCount} foto(s)
                        </Button>
                      )}
                    </h3>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = e.target.files
                          if (files) {
                            Array.from(files).forEach(file => {
                              const reader = new FileReader()
                              reader.onloadend = () => {
                                setFotosDespues(prev => [...prev, reader.result as string])
                              }
                              reader.readAsDataURL(file)
                            })
                          }
                          e.target.value = ''
                        }}
                      />
                      <Button size="sm" variant="outline" asChild>
                        <span><Plus className="w-3.5 h-3.5 mr-1" /> Agregar Foto</span>
                      </Button>
                    </label>
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                    {fotosDespues.map((foto, i) => (
                      <div key={i} className="relative group aspect-square bg-slate-100 rounded-lg overflow-hidden border-2 border-green-200">
                        <img src={foto} alt={`Después ${i+1}`} className="w-full h-full object-cover" />
                        <div className="absolute top-1 left-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded font-semibold">
                          DESPUÉS
                        </div>
                        <button
                          aria-label="Eliminar foto"
                          onClick={() => setFotosDespues(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {fotosDespues.length === 0 && (
                      <div className="col-span-full py-8 text-center text-slate-500 border-2 border-dashed rounded-lg">
                        <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Sin fotos después del trabajo</p>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Documentos Tab */}
              <TabsContent value="documentos" className="space-y-4 mt-0">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-sm">Documentos Adjuntos ({(formData as any).documentos?.length || 0})</h3>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => {
                        const files = e.target.files;
                        if (!files) return;
                        const docs = (formData as any).documentos || [];
                        Array.from(files).forEach(file => {
                          const reader = new FileReader();
                          reader.onload = () => {
                            const newDoc = {
                              nombre: file.name,
                              tipo: file.type || 'application/octet-stream',
                              tamaño: file.size,
                              data: reader.result as string,
                              fechaSubida: new Date().toISOString(),
                            };
                            setFormData((prev: any) => ({
                              ...prev,
                              documentos: [...(prev.documentos || []), newDoc],
                            }));
                          };
                          reader.readAsDataURL(file);
                        });
                        e.target.value = '';
                      }}
                    />
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium cursor-pointer hover:bg-blue-700">
                      <Plus className="w-3.5 h-3.5" /> Subir documento
                    </span>
                  </label>
                </div>

                {(formData as any).documentos?.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left p-2 text-xs">Nombre</th>
                          <th className="text-left p-2 text-xs w-32">Tipo</th>
                          <th className="text-right p-2 text-xs w-24">Tamaño</th>
                          <th className="text-center p-2 text-xs w-20">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(formData as any).documentos.map((doc: any, i: number) => (
                          <tr key={i} className="border-t">
                            <td className="p-2 text-xs font-medium">{doc.nombre}</td>
                            <td className="p-2 text-xs text-slate-500">{doc.tipo?.split('/')[1]?.toUpperCase() || 'FILE'}</td>
                            <td className="p-2 text-xs text-right text-slate-500">
                              {doc.tamaño < 1024 ? `${doc.tamaño} B` :
                               doc.tamaño < 1048576 ? `${(doc.tamaño/1024).toFixed(1)} KB` :
                               `${(doc.tamaño/1048576).toFixed(1)} MB`}
                            </td>
                            <td className="p-2 text-center">
                              <div className="flex gap-1 justify-center">
                                <a
                                  href={doc.data}
                                  download={doc.nombre}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                  title="Descargar"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                                <button
                                  onClick={() => {
                                    setFormData((prev: any) => ({
                                      ...prev,
                                      documentos: (prev.documentos || []).filter((_: any, idx: number) => idx !== i),
                                    }));
                                  }}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 border-2 border-dashed rounded-lg">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Sin documentos adjuntos</p>
                    <p className="text-xs text-slate-400 mt-1">PDF, Word, Excel, imagenes, etc.</p>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
          
          <DialogFooter className="flex justify-between border-t pt-4">
            <div className="text-lg font-bold flex items-center gap-4">
              <span>Total OT: <span className="text-red-600">{formatCLP(granTotal)}</span></span>
              <span className="text-xs font-normal text-slate-500">
                (Materiales: {formatCLP(totalMateriales)} + Personal: {formatCLP(totalPersonal)})
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave}>Guardar OT</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedOT && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg min-w-0">
                  <span className="font-mono text-xs font-bold text-[#0f2044] shrink-0">{selectedOT.otNum}</span>
                  <span className="truncate">{selectedOT.titulo}</span>
                  <Badge className={`${estadoColors[selectedOT.estado]} shrink-0`}>{selectedOT.estado}</Badge>
                  {selectedOT.esRecurrente && (
                    <Badge className="bg-blue-100 text-blue-700 flex items-center gap-1 shrink-0">
                      <RefreshCw className="w-3 h-3" /> Recurrente
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">Detalle de la orden de trabajo seleccionada</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* General info */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div className="min-w-0"><span className="text-slate-500 text-xs">Tipo:</span> <Badge className={tipoColors[selectedOT.tipo]}>{selectedOT.tipo}</Badge></div>
                  <div className="min-w-0"><span className="text-slate-500 text-xs">Prioridad:</span> <Badge className={prioridadColors[selectedOT.prioridad]}>{selectedOT.prioridad}</Badge></div>
                  <div className="min-w-0"><span className="text-slate-500 text-xs">Progreso:</span> {selectedOT.progreso}%</div>
                  <div className="min-w-0 truncate"><span className="text-slate-500 text-xs">Ubicación:</span> <span className="truncate">{selectedOT.ubicacion || selectedOT.propiedad?.nombre || '–'}</span></div>
                  <div className="min-w-0" title={selectedOT.centroCosto?.nombre}><span className="text-slate-500 text-xs">Centro Costo:</span> {selectedOT.centroCosto ? `${selectedOT.centroCosto.codigo} · ${selectedOT.centroCosto.nombre}` : '–'}</div>
                  <div className="min-w-0 truncate"><span className="text-slate-500 text-xs">Forma de Pago:</span> <span className="truncate">{selectedOT.formaPago || '–'}</span></div>
                </div>
                
                {/* Time tracking */}
                <div className="bg-blue-50 p-3 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Control de Tiempo
                  </h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="min-w-0">
                      <span className="text-slate-500 text-xs">Estimado:</span>
                      <span className="ml-2 font-semibold">{formatMinutes(selectedOT.tiempoEst)}</span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-500 text-xs">Real:</span>
                      <span className="ml-2 font-semibold">{formatMinutes(selectedOT.tiempoReal)}</span>
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-500 text-xs">Diferencia:</span>
                      <span className={`ml-2 font-semibold ${selectedOT.tiempoReal - selectedOT.tiempoEst > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {selectedOT.tiempoReal - selectedOT.tiempoEst > 0 ? '+' : ''}{formatMinutes(selectedOT.tiempoReal - selectedOT.tiempoEst)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {selectedOT.descripcion && (
                  <div className="text-sm">
                    <span className="text-slate-500 text-xs">Descripción:</span>
                    <p className="mt-1">{selectedOT.descripcion}</p>
                  </div>
                )}
                
                {/* Materials */}
                {selectedOT.materiales.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Package className="w-4 h-4" /> Materiales ({selectedOT.materiales.length})
                    </h4>
                    <table className="w-full text-xs border">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left p-2">Descripción</th>
                          <th className="text-center p-2">Cant.</th>
                          <th className="text-center p-2">Unidad</th>
                          <th className="text-right p-2">P. Unit.</th>
                          <th className="text-right p-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOT.materiales.map(m => (
                          <tr key={m.id} className="border-t">
                            <td className="p-2">{m.descripcion}</td>
                            <td className="p-2 text-center">{m.cantidad}</td>
                            <td className="p-2 text-center">{m.unidad}</td>
                            <td className="p-2 text-right">{formatCLP(m.precioUnit)}</td>
                            <td className="p-2 text-right font-semibold">{formatCLP(m.total || m.cantidad * m.precioUnit)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-amber-50">
                        <tr>
                          <td colSpan={4} className="p-2 text-right font-semibold">Total Materiales:</td>
                          <td className="p-2 text-right font-bold text-red-600">
                            {formatCLP(selectedOT.materiales.reduce((sum, m) => sum + (m.total || m.cantidad * m.precioUnit), 0))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
                
                {/* Tools */}
                {selectedOT.herramientas.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Wrench className="w-4 h-4" /> Herramientas ({selectedOT.herramientas.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedOT.herramientas.map(h => (
                        <Badge key={h.id} variant="outline">{h.nombre} ({h.cantidad})</Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Tasks */}
                {selectedOT.tareas.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <CheckSquare className="w-4 h-4" /> Tareas ({selectedOT.tareas.length})
                    </h4>
                    <table className="w-full text-xs border">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left p-2">Tarea</th>
                          <th className="text-center p-2 w-16">Cant.</th>
                          <th className="text-center p-2 w-24">Estado</th>
                          <th className="text-center p-2 w-10 text-green-700">OK</th>
                          <th className="text-center p-2 w-10 text-red-700">NO</th>
                          <th className="text-center p-2 w-10 text-slate-500">N/A</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOT.tareas.map(t => (
                          <tr key={t.id} className="border-t">
                            <td className="p-2">{t.descripcion}</td>
                            <td className="p-2 text-center">{t.cantidad}</td>
                            <td className="p-2 text-center">
                              <Badge className={t.estado === 'Completado' ? 'bg-green-100 text-green-700' : t.estado === 'En Progreso' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}>
                                {t.estado}
                              </Badge>
                            </td>
                            <td className="p-2 text-center">
                              <span className={`inline-flex items-center justify-center w-5 h-5 rounded border ${t.ok ? 'bg-green-500 border-green-500 text-white' : 'border-green-400 text-transparent'}`}>
                                ✓
                              </span>
                            </td>
                            <td className="p-2 text-center">
                              <span className={`inline-flex items-center justify-center w-5 h-5 rounded border ${t.noOk ? 'bg-red-500 border-red-500 text-white' : 'border-red-400 text-transparent'}`}>
                                ✗
                              </span>
                            </td>
                            <td className="p-2 text-center">
                              <span className={`inline-flex items-center justify-center w-5 h-5 rounded border ${t.na ? 'bg-slate-400 border-slate-400 text-white' : 'border-slate-300 text-transparent'}`}>
                                –
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {/* Personnel */}
                {selectedOT.personalOT.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Users className="w-4 h-4" /> Personal ({selectedOT.personalOT.length})
                    </h4>
                    <table className="w-full text-xs border">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left p-2">Nombre</th>
                          <th className="text-center p-2">Tipo</th>
                          <th className="text-center p-2">Cant.</th>
                          <th className="text-right p-2">$ Hora</th>
                          <th className="text-right p-2">Horas</th>
                          <th className="text-right p-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOT.personalOT.map(p => (
                          <tr key={p.id} className="border-t">
                            <td className="p-2">{p.nombre}</td>
                            <td className="p-2 text-center">{p.tipo}</td>
                            <td className="p-2 text-center">{p.cantidad}</td>
                            <td className="p-2 text-right">{formatCLP(p.precioUnit)}</td>
                            <td className="p-2 text-right">{p.horasTrabajadas || 0}</td>
                            <td className="p-2 text-right font-semibold">{formatCLP(p.total || p.precioUnit * p.horasTrabajadas * p.cantidad)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-amber-50">
                        <tr>
                          <td colSpan={5} className="p-2 text-right font-semibold">Total Mano de Obra:</td>
                          <td className="p-2 text-right font-bold text-red-600">
                            {formatCLP(selectedOT.personalOT.reduce((sum, p) => sum + (p.total || p.precioUnit * p.horasTrabajadas * p.cantidad), 0))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
                
                {/* Fotos Antes/Después */}
                {((selectedOT.fotosAntes && selectedOT.fotosAntes.length > 0) || (selectedOT.fotosDespues && selectedOT.fotosDespues.length > 0)) && (
                  <div>
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Image className="w-4 h-4" /> Fotos del Trabajo
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Fotos Antes */}
                      {selectedOT.fotosAntes && selectedOT.fotosAntes.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-amber-600 mb-2">ANTES ({selectedOT.fotosAntes.length})</p>
                          <div className="grid grid-cols-2 gap-2">
                            {selectedOT.fotosAntes.map((foto, i) => (
                              <div key={i} className="aspect-square bg-slate-100 rounded-lg overflow-hidden border-2 border-amber-200">
                                <img src={foto} alt={`Antes ${i+1}`} className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Fotos Después */}
                      {selectedOT.fotosDespues && selectedOT.fotosDespues.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-green-600 mb-2">DESPUÉS ({selectedOT.fotosDespues.length})</p>
                          <div className="grid grid-cols-2 gap-2">
                            {selectedOT.fotosDespues.map((foto, i) => (
                              <div key={i} className="aspect-square bg-slate-100 rounded-lg overflow-hidden border-2 border-green-200">
                                <img src={foto} alt={`Después ${i+1}`} className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Total */}
                <div className="bg-red-50 p-4 rounded-lg text-right">
                  <span className="text-lg font-bold">TOTAL OT: </span>
                  <span className="text-xl font-bold text-red-600">
                    {formatCLP(selectedOT.costoReal || 
                      selectedOT.materiales.reduce((sum, m) => sum + (m.total || m.cantidad * m.precioUnit), 0) +
                      selectedOT.personalOT.reduce((sum, p) => sum + (p.total || p.precioUnit * p.horasTrabajadas * p.cantidad), 0)
                    )}
                  </span>
                </div>
                
                {selectedOT.notas && (
                  <div className="text-sm bg-slate-50 p-3 rounded">
                    <span className="text-slate-500 font-semibold text-xs">Notas:</span>
                    <p className="mt-1">{selectedOT.notas}</p>
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>Cerrar</Button>
                <Button variant="outline" onClick={() => imprimirChecklist(selectedOT)}>
                  <Printer className="w-4 h-4 mr-1" /> Imprimir Checklist
                </Button>
                <Button onClick={() => { setDetailDialogOpen(false); openDialog(selectedOT); }}>
                  <Pencil className="w-4 h-4 mr-1" /> Editar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Progress Update Dialog (for Personal role) */}
      <Dialog open={progressDialogOpen} onOpenChange={setProgressDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Actualizar Progreso
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">Registra el avance y estado de las tareas</DialogDescription>
          </DialogHeader>
          {progressOT && (
            <div className="space-y-4 py-4">
              {/* OT Info - Read Only */}
              <div className="bg-slate-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-mono text-xs font-bold text-[#0f2044]">{progressOT.otNum}</span>
                  <Badge className={estadoColors[progressOT.estado]}>{progressOT.estado}</Badge>
                </div>
                <h3 className="font-semibold">{progressOT.titulo}</h3>
                <p className="text-xs text-slate-500 mt-1">{progressOT.descripcion || 'Sin descripción'}</p>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <Label>Progreso (%)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={progressFormData.progreso}
                    onChange={(e) => setProgressFormData({...progressFormData, progreso: parseInt(e.target.value) || 0})}
                    className="w-24"
                  />
                  <Progress value={progressFormData.progreso} className="flex-1 h-2" />
                </div>
              </div>

              {/* Estado */}
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select 
                  value={progressFormData.estado} 
                  onValueChange={(v) => setProgressFormData({...progressFormData, estado: v})}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                    <SelectItem value="En Progreso">En Progreso</SelectItem>
                    <SelectItem value="Completado">Completado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tiempo Real */}
              <div className="space-y-2">
                <Label>Tiempo Real (auto)</Label>
                <Input
                  type="number"
                  value={progressFormData.tiempoReal}
                  readOnly
                  tabIndex={-1}
                  className="w-full bg-slate-100 cursor-not-allowed text-slate-600 text-right"
                  title="Calculado automáticamente al cambiar estado o progreso"
                />
                <p className="text-xs text-slate-500">
                  Tiempo estimado: {formatMinutes(progressOT.tiempoEst)}
                </p>
                <p className="text-[10px] text-slate-400">
                  Autocalculado: al marcar &quot;En Progreso&quot; se inicia el cronómetro, al marcar &quot;Completado&quot; se calcula automáticamente.
                </p>
              </div>

              {/* Tareas */}
              {progressFormData.tareas.length > 0 && (
                <div className="space-y-2">
                  <Label>Estado de Tareas</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left p-2">Tarea</th>
                          <th className="text-center p-2 w-24">Estado</th>
                          <th className="text-center p-2 w-12">Cumple</th>
                        </tr>
                      </thead>
                      <tbody>
                        {progressFormData.tareas.map((tarea, index) => (
                          <tr key={tarea.id} className="border-t">
                            <td className="p-2">{tarea.descripcion}</td>
                            <td className="p-2">
                              <Select 
                                value={tarea.estado} 
                                onValueChange={(v) => {
                                  const updated = [...progressFormData.tareas]
                                  updated[index] = {...updated[index], estado: v}
                                  setProgressFormData({...progressFormData, tareas: updated})
                                }}
                              >
                                <SelectTrigger className="h-7 text-xs w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Pendiente">Pendiente</SelectItem>
                                  <SelectItem value="En Progreso">En Progreso</SelectItem>
                                  <SelectItem value="Completado">Completado</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="p-2 text-center">
                              <Checkbox 
                                checked={tarea.cumple === true}
                                onCheckedChange={(checked) => {
                                  const updated = [...progressFormData.tareas]
                                  updated[index] = {...updated[index], cumple: checked ? true : null}
                                  setProgressFormData({...progressFormData, tareas: updated})
                                }}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Verification Checkbox */}
              <div className="flex items-center gap-2 bg-green-50 p-3 rounded-lg border border-green-200">
                <Checkbox 
                  id="verificacion"
                  checked={progressFormData.progreso === 100 && progressFormData.estado === 'Completado'}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setProgressFormData({
                        ...progressFormData, 
                        progreso: 100, 
                        estado: 'Completado'
                      })
                    }
                  }}
                />
                <label htmlFor="verificacion" className="text-sm font-medium cursor-pointer">
                  Marcar como completado y verificar
                </label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setProgressDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveProgress}>Guardar Progreso</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Crear Solicitud de Compra desde OT */}
      <Dialog open={crearSolicitudDialogOpen} onOpenChange={setCrearSolicitudDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-[#0f2044]" />
              Crear Solicitud de Compra
            </DialogTitle>
            <DialogDescription>
              Se creará una solicitud de compra con los {materiales.length} material
              {materiales.length === 1 ? '' : 'es'} cargados en esta OT
              {editingOT?.otNum ? ` (${editingOT.otNum})` : ''}.
              La solicitud se guardará en estado &quot;Solicitado&quot; y se enviará
              automáticamente un email a administracionlagunanorte@gmail.com.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2 max-h-60 overflow-y-auto border rounded-lg bg-slate-50 p-3">
            {materiales.map((m, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <span className="truncate">{m.descripcion || '(sin nombre)'}</span>
                <span className="text-xs text-slate-600 ml-2 shrink-0">
                  {m.cantidad} {m.unidad} · {formatCLP(m.total || m.cantidad * m.precioUnit)}
                </span>
              </div>
            ))}
            <div className="border-t pt-2 mt-2 flex justify-between font-semibold text-sm">
              <span>Total estimado:</span>
              <span className="text-red-600">{formatCLP(totalMateriales)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCrearSolicitudDialogOpen(false)}
              disabled={creandoSolicitud}
            >
              Cancelar
            </Button>
            <Button onClick={crearSolicitudDesdeOT} disabled={creandoSolicitud}>
              {creandoSolicitud ? 'Creando...' : 'Confirmar y crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
