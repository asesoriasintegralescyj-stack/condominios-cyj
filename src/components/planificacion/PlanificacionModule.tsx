'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  eachDayOfInterval,
  parseISO,
} from 'date-fns'
import { es } from 'date-fns/locale'
import {
  CalendarDays,
  ListChecks,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Edit,
  Trash2,
  CheckCircle2,
  Circle,
  Clock,
  MapPin,
  User,
  Tag,
  FileText,
  RefreshCw,
  Link2,
  Unlink,
  AlertCircle,
  CalendarClock,
  Filter,
  ArrowUpDown,
  X,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { TableroIndicadores } from '@/components/ui/tablero-indicadores'

// ─── Types ──────────────────────────────────────────────────────────────────

interface TareaPlanificacion {
  id: string
  titulo: string
  descripcion: string | null
  estado: 'pendiente' | 'en_progreso' | 'completada' | 'cancelada'
  prioridad: 'baja' | 'media' | 'alta' | 'urgente'
  fechaInicio: string | null
  fechaFin: string | null
  horaInicio: string | null
  horaFin: string | null
  diaCompleto: boolean
  asignadoA: string | null
  asignadoEmail: string | null
  categoria: string | null
  ubicacion: string | null
  googleEventId: string | null
  googleTaskId: string | null
  recordatorio: string | null
  recurrente: boolean
  notas: string | null
  etiquetas: string | null
  completadoEn: string | null
  sincronizado: boolean
  creadoEn: string
  actualizadoEn: string
}

interface GoogleAuth {
  connected: boolean
  email?: string
  calendarSync?: boolean
  tasksSync?: boolean
  lastSyncAt?: string | null
}

// ─── Constants ──────────────────────────────────────────────────────────────

const CATEGORIAS = ['Personal', 'Financiera', 'Mantención', 'Legal', 'Administrativa']

const RECORDATORIOS: { value: string; label: string }[] = [
  { value: 'ninguno', label: 'Ninguno' },
  { value: '5min', label: '5 minutos antes' },
  { value: '15min', label: '15 minutos antes' },
  { value: '30min', label: '30 minutos antes' },
  { value: '1hora', label: '1 hora antes' },
  { value: '1dia', label: '1 día antes' },
]

const ESTADOS: { value: string; label: string }[] = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_progreso', label: 'En Progreso' },
  { value: 'completada', label: 'Completada' },
  { value: 'cancelada', label: 'Cancelada' },
]

const PRIORIDADES: { value: string; label: string }[] = [
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
]

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'fechaInicio', label: 'Fecha Inicio' },
  { value: 'prioridad', label: 'Prioridad' },
  { value: 'titulo', label: 'Título' },
]

const DIA_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const EMPTY_FORM = {
  titulo: '',
  descripcion: '',
  estado: 'pendiente' as TareaPlanificacion['estado'],
  prioridad: 'media' as TareaPlanificacion['prioridad'],
  fechaInicio: '',
  fechaFin: '',
  horaInicio: '',
  horaFin: '',
  diaCompleto: false,
  asignadoA: '',
  categoria: '',
  ubicacion: '',
  recordatorio: 'ninguno',
  notas: '',
}

type FormData = typeof EMPTY_FORM

// ─── Helpers ────────────────────────────────────────────────────────────────

function getPrioridadColor(p: string) {
  switch (p) {
    case 'urgente': return 'bg-red-100 text-red-700 border-red-200'
    case 'alta': return 'bg-orange-100 text-orange-700 border-orange-200'
    case 'media': return 'bg-sky-100 text-sky-700 border-sky-200'
    case 'baja': return 'bg-slate-100 text-slate-600 border-slate-200'
    default: return 'bg-slate-100 text-slate-600 border-slate-200'
  }
}

function getPrioridadDot(p: string) {
  switch (p) {
    case 'urgente': return 'bg-red-500'
    case 'alta': return 'bg-orange-500'
    case 'media': return 'bg-sky-500'
    case 'baja': return 'bg-slate-400'
    default: return 'bg-slate-400'
  }
}

function getEstadoColor(e: string) {
  switch (e) {
    case 'pendiente': return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'en_progreso': return 'bg-sky-50 text-sky-700 border-sky-200'
    case 'completada': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'cancelada': return 'bg-red-50 text-red-600 border-red-200'
    default: return 'bg-slate-50 text-slate-600 border-slate-200'
  }
}

function getEstadoLabel(e: string) {
  return ESTADOS.find(s => s.value === e)?.label ?? e
}

function getPrioridadLabel(p: string) {
  return PRIORIDADES.find(pr => pr.value === p)?.label ?? p
}

function getRecordatorioLabel(r: string | null) {
  if (!r || r === 'ninguno') return 'Sin recordatorio'
  return RECORDATORIOS.find(re => re.value === r)?.label ?? r
}

const PRIORIDAD_ORDER: Record<string, number> = { urgente: 0, alta: 1, media: 2, baja: 3 }

function formatDateShort(d: string | null) {
  if (!d) return ''
  try {
    return format(parseISO(d), "d MMM yyyy", { locale: es })
  } catch {
    return d
  }
}

function formatDateFull(d: string | null) {
  if (!d) return ''
  try {
    return format(parseISO(d), "EEEE d 'de' MMMM yyyy", { locale: es })
  } catch {
    return d
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PlanificacionModule() {
  // ── State ──
  const [tareas, setTareas] = useState<TareaPlanificacion[]>([])
  const [totalTareas, setTotalTareas] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('calendario')

  // Calendar
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [dayTasksOpen, setDayTasksOpen] = useState(false)

  // Tasks list
  const [filterEstado, setFilterEstado] = useState('all')
  const [filterPrioridad, setFilterPrioridad] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('fechaInicio')

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<TareaPlanificacion | null>(null)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Google
  const [googleAuth, setGoogleAuth] = useState<GoogleAuth | null>(null)
  const [googleLoading, setGoogleLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [connectingGoogle, setConnectingGoogle] = useState(false)

  // ── Fetch tareas ──
  const fetchTareas = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterEstado !== 'all') params.set('estado', filterEstado)
      if (filterPrioridad !== 'all') params.set('prioridad', filterPrioridad)
      if (searchQuery) params.set('search', searchQuery)
      params.set('limit', '500')
      params.set('offset', '0')

      const res = await fetch(`/api/planificacion/tareas?${params.toString()}`)
      const json = await res.json()
      if (!json.error) {
        setTareas(json.tareas ?? [])
        setTotalTareas(json.total ?? 0)
      } else {
        toast.error('Error al cargar tareas')
      }
    } catch {
      toast.error('Error de conexión al cargar tareas')
    } finally {
      setLoading(false)
    }
  }, [filterEstado, filterPrioridad, searchQuery])

  // Fetch all tareas for calendar (no filters)
  const fetchAllTareas = useCallback(async () => {
    try {
      const res = await fetch('/api/planificacion/tareas?limit=500&offset=0')
      const json = await res.json()
      if (!json.error) {
        setTareas(json.tareas ?? [])
        setTotalTareas(json.total ?? 0)
      }
    } catch {
      // silent for calendar
    }
  }, [])

  // ── Fetch Google auth ──
  const fetchGoogleAuth = useCallback(async () => {
    setGoogleLoading(true)
    try {
      const res = await fetch('/api/planificacion/google/auth')
      const json = await res.json()
      if (!json.error) {
        setGoogleAuth(json)
      }
    } catch {
      setGoogleAuth(null)
    } finally {
      setGoogleLoading(false)
    }
  }, [])

  // ── Initial load ──
  useEffect(() => {
    void fetchAllTareas()
    void fetchGoogleAuth()
  }, [])

  // ── Re-fetch when tab changes to tareas ──
  useEffect(() => {
    if (activeTab === 'tareas') {
      void fetchTareas()
    }
  }, [activeTab, fetchTareas])

  // ── Re-fetch google auth when tab changes ──
  useEffect(() => {
    if (activeTab === 'google') {
      void fetchGoogleAuth()
    }
  }, [activeTab, fetchGoogleAuth])

  // ── Calendar Logic ──
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [currentMonth])

  const tasksByDate = useMemo(() => {
    const map: Record<string, TareaPlanificacion[]> = {}
    for (const t of tareas) {
      if (t.fechaInicio) {
        const key = t.fechaInicio.slice(0, 10)
        if (!map[key]) map[key] = []
        map[key].push(t)
      }
    }
    return map
  }, [tareas])

  const getTasksForDay = useCallback((day: Date) => {
    const key = format(day, 'yyyy-MM-dd')
    return tasksByDate[key] ?? []
  }, [tasksByDate])

  const handleDayClick = useCallback((day: Date) => {
    const tasks = getTasksForDay(day)
    if (tasks.length > 0) {
      setSelectedDay(day)
      setDayTasksOpen(true)
    }
  }, [getTasksForDay])

  // ── CRUD ──
  const openNew = useCallback(() => {
    setEditando(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }, [])

  const openEdit = useCallback((tarea: TareaPlanificacion) => {
    setEditando(tarea)
    setForm({
      titulo: tarea.titulo,
      descripcion: tarea.descripcion ?? '',
      estado: tarea.estado,
      prioridad: tarea.prioridad,
      fechaInicio: tarea.fechaInicio ?? '',
      fechaFin: tarea.fechaFin ?? '',
      horaInicio: tarea.horaInicio ?? '',
      horaFin: tarea.horaFin ?? '',
      diaCompleto: tarea.diaCompleto,
      asignadoA: tarea.asignadoA ?? '',
      categoria: tarea.categoria ?? '',
      ubicacion: tarea.ubicacion ?? '',
      recordatorio: tarea.recordatorio ?? 'ninguno',
      notas: tarea.notas ?? '',
    })
    setDialogOpen(true)
  }, [])

  const handleSave = async () => {
    if (!form.titulo.trim()) {
      toast.error('El título es obligatorio')
      return
    }
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        titulo: form.titulo.trim(),
        descripcion: form.descripcion || null,
        estado: form.estado,
        prioridad: form.prioridad,
        fechaInicio: form.fechaInicio || null,
        fechaFin: form.fechaFin || null,
        horaInicio: form.horaInicio || null,
        horaFin: form.horaFin || null,
        diaCompleto: form.diaCompleto,
        asignadoA: form.asignadoA || null,
        categoria: form.categoria || null,
        ubicacion: form.ubicacion || null,
        recordatorio: form.recordatorio !== 'ninguno' ? form.recordatorio : null,
        notas: form.notas || null,
      }

      if (editando) {
        const res = await fetch(`/api/planificacion/tareas/${editando.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const json = await res.json()
        if (!json.error) {
          toast.success('Tarea actualizada correctamente')
        } else {
          toast.error(json.error || 'Error al actualizar la tarea')
          return
        }
      } else {
        const res = await fetch('/api/planificacion/tareas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const json = await res.json()
        if (!json.error) {
          toast.success('Tarea creada correctamente')
        } else {
          toast.error(json.error || 'Error al crear la tarea')
          return
        }
      }

      setDialogOpen(false)
      if (activeTab === 'tareas') {
        await fetchTareas()
      } else {
        await fetchAllTareas()
      }
    } catch {
      toast.error('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/planificacion/tareas/${deleteId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.error) {
        toast.success('Tarea eliminada correctamente')
        setDeleteId(null)
        if (activeTab === 'tareas') {
          await fetchTareas()
        } else {
          await fetchAllTareas()
        }
      } else {
        toast.error(json.error || 'Error al eliminar la tarea')
      }
    } catch {
      toast.error('Error de conexión al eliminar')
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleComplete = async (tarea: TareaPlanificacion) => {
    const newEstado = tarea.estado === 'completada' ? 'pendiente' : 'completada'
    try {
      const res = await fetch(`/api/planificacion/tareas/${tarea.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: newEstado, completadoEn: newEstado === 'completada' ? new Date().toISOString() : null }),
      })
      const json = await res.json()
      if (!json.error) {
        toast.success(newEstado === 'completada' ? 'Tarea marcada como completada' : 'Tarea marcada como pendiente')
        if (activeTab === 'tareas') {
          await fetchTareas()
        } else {
          await fetchAllTareas()
        }
      }
    } catch {
      toast.error('Error al cambiar estado')
    }
  }

  // ── Google Actions ──
  const handleConnectGoogle = async () => {
    setConnectingGoogle(true)
    try {
      const res = await fetch('/api/planificacion/google/auth', { method: 'POST' })
      const json = await res.json()
      if (!json.error && json.url) {
        window.open(json.url, '_blank')
        toast.info('Se abrió la ventana de autenticación de Google')
      } else {
        toast.error(json.error || 'Error al iniciar la conexión con Google')
      }
    } catch {
      toast.error('Error de conexión con el servicio de Google')
    } finally {
      setConnectingGoogle(false)
    }
  }

  const handleDisconnectGoogle = async () => {
    try {
      const res = await fetch('/api/planificacion/google/auth', { method: 'DELETE' })
      const json = await res.json()
      if (!json.error) {
        toast.success('Google desconectado correctamente')
        void fetchGoogleAuth()
      }
    } catch {
      toast.error('Error al desconectar Google')
    }
  }

  const handleSyncNow = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/planificacion/google/sync', { method: 'POST' })
      const json = await res.json()
      if (!json.error) {
        toast.success(`Sincronización completada: ${json.synced ?? 0} elementos nuevos (${json.events ?? 0} eventos, ${json.tasks ?? 0} tareas)`)
        void fetchGoogleAuth()
        void fetchAllTareas()
      } else {
        toast.error(json.error || 'Error al sincronizar')
      }
    } catch {
      toast.error('Error de conexión al sincronizar')
    } finally {
      setSyncing(false)
    }
  }

  // ── Filtered & Sorted Tareas ──
  const filteredTareas = useMemo(() => {
    let result = [...tareas]
    if (filterEstado !== 'all') {
      result = result.filter(t => t.estado === filterEstado)
    }
    if (filterPrioridad !== 'all') {
      result = result.filter(t => t.prioridad === filterPrioridad)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(t =>
        t.titulo.toLowerCase().includes(q) ||
        t.descripcion?.toLowerCase().includes(q) ||
        t.categoria?.toLowerCase().includes(q) ||
        t.asignadoA?.toLowerCase().includes(q) ||
        t.ubicacion?.toLowerCase().includes(q)
      )
    }
    result.sort((a, b) => {
      switch (sortBy) {
        case 'prioridad': {
          const pa = PRIORIDAD_ORDER[a.prioridad] ?? 99
          const pb = PRIORIDAD_ORDER[b.prioridad] ?? 99
          return pa - pb
        }
        case 'titulo':
          return a.titulo.localeCompare(b.titulo, 'es')
        case 'fechaInicio':
        default: {
          if (!a.fechaInicio && !b.fechaInicio) return 0
          if (!a.fechaInicio) return 1
          if (!b.fechaInicio) return -1
          return a.fechaInicio.localeCompare(b.fechaInicio)
        }
      }
    })
    return result
  }, [tareas, filterEstado, filterPrioridad, searchQuery, sortBy])

  // ── KPI data ──
  const kpiData = useMemo(() => {
    const pendientes = tareas.filter(t => t.estado === 'pendiente').length
    const enProgreso = tareas.filter(t => t.estado === 'en_progreso').length
    const completadas = tareas.filter(t => t.estado === 'completada').length
    const urgentes = tareas.filter(t => t.prioridad === 'urgente' && t.estado !== 'completada' && t.estado !== 'cancelada').length
    return { pendientes, enProgreso, completadas, urgentes, total: tareas.length }
  }, [tareas])

  // ── Render: Loading (only on initial load or tareas tab) ──
  const isInitialLoading = loading && activeTab !== 'google' && tareas.length === 0

  // ── Selected day tasks ──
  const selectedDayTasks = selectedDay ? getTasksForDay(selectedDay) : []

  // ── Loading skeleton on initial load ──
  if (isInitialLoading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-md" />
          ))}
        </div>
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-5">
        {/* KPI Board */}
        <TableroIndicadores
          cards={[
            { titulo: 'Total Tareas', numero: kpiData.total, icon: <ListChecks className="w-5 h-5" />, color: 'primary' },
            { titulo: 'Pendientes', numero: kpiData.pendientes, icon: <Clock className="w-5 h-5" />, color: 'naranja' },
            { titulo: 'En Progreso', numero: kpiData.enProgreso, icon: <RefreshCw className="w-5 h-5" />, color: 'azul' },
            { titulo: 'Completadas', numero: kpiData.completadas, icon: <CheckCircle2 className="w-5 h-5" />, color: 'verde' },
          ]}
          columnas={4}
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-slate-100">
            <TabsTrigger value="calendario" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
              <CalendarDays className="w-4 h-4" />
              <span className="hidden sm:inline">Calendario</span>
            </TabsTrigger>
            <TabsTrigger value="tareas" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
              <ListChecks className="w-4 h-4" />
              <span className="hidden sm:inline">Tareas</span>
            </TabsTrigger>
            <TabsTrigger value="google" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">
              <CalendarClock className="w-4 h-4" />
              <span className="hidden sm:inline">Google Calendar</span>
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* TAB 1: CALENDAR */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="calendario">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-slate-800">
                    {format(currentMonth, "MMMM yyyy", { locale: es })}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => setCurrentMonth(new Date())}
                    >
                      Hoy
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button size="sm" className="ml-2" onClick={openNew}>
                      <Plus className="w-4 h-4 mr-1" /> Nueva
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Priority Legend */}
                <div className="flex flex-wrap items-center gap-3 mb-4 text-xs text-slate-500">
                  <span className="font-medium">Prioridad:</span>
                  {PRIORIDADES.map(p => (
                    <span key={p.value} className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${getPrioridadDot(p.value)}`} />
                      {p.label}
                    </span>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="border rounded-lg overflow-hidden">
                  {/* Header row */}
                  <div className="grid grid-cols-7 bg-slate-50 border-b">
                    {DIA_SEMANA.map(d => (
                      <div key={d} className="py-2 text-center text-xs font-semibold text-slate-500 uppercase">
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Day cells */}
                  <div className="grid grid-cols-7">
                    {calendarDays.map((day, idx) => {
                      const dayTasks = getTasksForDay(day)
                      const inMonth = isSameMonth(day, currentMonth)
                      const today = isToday(day)
                      const hasTasks = dayTasks.length > 0

                      return (
                        <div
                          key={idx}
                          onClick={() => hasTasks && handleDayClick(day)}
                          className={[
                            'min-h-[70px] md:min-h-[90px] border-b border-r last:border-r-0 p-1.5 transition-colors',
                            !inMonth && 'bg-slate-50/50 text-slate-300',
                            inMonth && 'bg-white',
                            hasTasks && inMonth && 'cursor-pointer hover:bg-amber-50/60',
                            today && 'bg-amber-50/80',
                          ].join(' ')}
                        >
                          <div className={[
                            'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full',
                            today && 'bg-amber-500 text-white',
                            !today && inMonth && 'text-slate-700',
                          ].join(' ')}>
                            {format(day, 'd')}
                          </div>
                          <div className="mt-0.5 flex flex-col gap-0.5">
                            {dayTasks.slice(0, 3).map(t => (
                              <Tooltip key={t.id}>
                                <TooltipTrigger asChild>
                                  <div className="flex items-center gap-1">
                                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getPrioridadDot(t.prioridad)}`} />
                                    <span className="text-[10px] leading-tight text-slate-600 truncate">
                                      {t.titulo}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs max-w-[220px]">
                                  <p className="font-semibold">{t.titulo}</p>
                                  <p className="text-slate-500">
                                    {t.horaInicio ? `${t.horaInicio}` : 'Todo el día'} · {getPrioridadLabel(t.prioridad)}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            ))}
                            {dayTasks.length > 3 && (
                              <span className="text-[10px] text-slate-400 pl-3">
                                +{dayTasks.length - 3} más
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Urgent tasks banner */}
                {kpiData.urgentes > 0 && (
                  <div className="mt-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-sm text-red-700">
                      <span className="font-semibold">{kpiData.urgentes} tarea{ kpiData.urgentes !== 1 ? 's' : ''} urgente{ kpiData.urgentes !== 1 ? 's' : ''}</span> sin completar
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* TAB 2: TAREAS LIST */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="tareas">
            {/* Filters */}
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-3">
                  {/* Search */}
                  <div className="relative flex-1 min-w-0">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Buscar por título, descripción, categoría, asignado..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                    {searchQuery && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                        onClick={() => setSearchQuery('')}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>

                  {/* Estado filter */}
                  <Select value={filterEstado} onValueChange={setFilterEstado}>
                    <SelectTrigger className="w-full md:w-[160px]">
                      <Filter className="w-4 h-4 mr-1.5 text-slate-400" />
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      {ESTADOS.map(e => (
                        <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Prioridad filter */}
                  <Select value={filterPrioridad} onValueChange={setFilterPrioridad}>
                    <SelectTrigger className="w-full md:w-[150px]">
                      <SelectValue placeholder="Prioridad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las prioridades</SelectItem>
                      {PRIORIDADES.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Sort */}
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-full md:w-[160px]">
                      <ArrowUpDown className="w-4 h-4 mr-1.5 text-slate-400" />
                      <SelectValue placeholder="Ordenar" />
                    </SelectTrigger>
                    <SelectContent>
                      {SORT_OPTIONS.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* New task button */}
                  <Button onClick={openNew} className="shrink-0">
                    <Plus className="w-4 h-4 mr-1.5" /> Nueva Tarea
                  </Button>
                </div>

                {/* Active filters chips */}
                {(filterEstado !== 'all' || filterPrioridad !== 'all' || searchQuery) && (
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className="text-xs text-slate-500">Filtros activos:</span>
                    {filterEstado !== 'all' && (
                      <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-slate-100"
                        onClick={() => setFilterEstado('all')}>
                        {getEstadoLabel(filterEstado)}
                        <X className="w-3 h-3" />
                      </Badge>
                    )}
                    {filterPrioridad !== 'all' && (
                      <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-slate-100"
                        onClick={() => setFilterPrioridad('all')}>
                        {getPrioridadLabel(filterPrioridad)}
                        <X className="w-3 h-3" />
                      </Badge>
                    )}
                    {searchQuery && (
                      <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-slate-100"
                        onClick={() => setSearchQuery('')}>
                        &ldquo;{searchQuery}&rdquo;
                        <X className="w-3 h-3" />
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-slate-500"
                      onClick={() => { setFilterEstado('all'); setFilterPrioridad('all'); setSearchQuery('') }}
                    >
                      Limpiar todo
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Task list */}
            {filteredTareas.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ListChecks className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-500 font-medium">No se encontraron tareas</p>
                  <p className="text-sm text-slate-400 mt-1">
                    {searchQuery || filterEstado !== 'all' || filterPrioridad !== 'all'
                      ? 'Intenta ajustar los filtros de búsqueda'
                      : 'Crea tu primera tarea para comenzar'
                    }
                  </p>
                  {!searchQuery && filterEstado === 'all' && filterPrioridad === 'all' && (
                    <Button className="mt-4" onClick={openNew}>
                      <Plus className="w-4 h-4 mr-1.5" /> Crear Tarea
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Mostrando {filteredTareas.length} de {totalTareas} tarea{totalTareas !== 1 ? 's' : ''}
                </p>
                <ScrollArea className="max-h-[600px]">
                  <div className="space-y-2 pr-3">
                    {filteredTareas.map(tarea => (
                      <Card
                        key={tarea.id}
                        className={[
                          'transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer border',
                          tarea.estado === 'completada' ? 'opacity-70' : '',
                          tarea.estado === 'cancelada' ? 'opacity-50' : '',
                        ].join(' ')}
                        onClick={() => openEdit(tarea)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {/* Toggle complete */}
                            <button
                              className="mt-0.5 shrink-0"
                              onClick={(e) => { e.stopPropagation(); void handleToggleComplete(tarea) }}
                          >
                              {tarea.estado === 'completada' ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                              ) : (
                                <Circle className="w-5 h-5 text-slate-300 hover:text-amber-500 transition-colors" />
                              )}
                            </button>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <Badge className={getPrioridadColor(tarea.prioridad)} variant="outline">
                                  {getPrioridadLabel(tarea.prioridad)}
                                </Badge>
                                <Badge className={getEstadoColor(tarea.estado)} variant="outline">
                                  {getEstadoLabel(tarea.estado)}
                                </Badge>
                                {tarea.categoria && (
                                  <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600">
                                    <Tag className="w-3 h-3 mr-1" />
                                    {tarea.categoria}
                                  </Badge>
                                )}
                              </div>

                              <h3 className={[
                                'font-semibold text-slate-800 text-sm',
                                tarea.estado === 'completada' && 'line-through text-slate-500',
                                tarea.estado === 'cancelada' && 'line-through text-slate-400',
                              ].join(' ')}>
                                {tarea.titulo}
                              </h3>

                              {tarea.descripcion && (
                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                                  {tarea.descripcion}
                                </p>
                              )}

                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                                {tarea.fechaInicio && (
                                  <span className="flex items-center gap-1">
                                    <CalendarDays className="w-3 h-3" />
                                    {tarea.fechaFin && tarea.fechaFin !== tarea.fechaInicio
                                      ? `${formatDateShort(tarea.fechaInicio)} → ${formatDateShort(tarea.fechaFin)}`
                                      : formatDateShort(tarea.fechaInicio)
                                    }
                                    {tarea.horaInicio && !tarea.diaCompleto && (
                                      <span className="text-slate-400">
                                        {tarea.horaInicio}{tarea.horaFin ? ` - ${tarea.horaFin}` : ''}
                                      </span>
                                    )}
                                  </span>
                                )}
                                {tarea.asignadoA && (
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {tarea.asignadoA}
                                  </span>
                                )}
                                {tarea.ubicacion && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {tarea.ubicacion}
                                  </span>
                                )}
                                {tarea.sincronizado && (
                                  <span className="flex items-center gap-1 text-emerald-600">
                                    <CalendarClock className="w-3 h-3" />
                                    Sync
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(tarea)}>
                                    <Edit className="w-4 h-4 text-slate-500" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => setDeleteId(tarea.id)}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Eliminar</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* TAB 3: GOOGLE CALENDAR */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <TabsContent value="google">
            {googleLoading ? (
              <Card>
                <CardContent className="p-8 space-y-4">
                  <Skeleton className="h-8 w-48 mx-auto" />
                  <Skeleton className="h-4 w-72 mx-auto" />
                  <Skeleton className="h-10 w-48 mx-auto" />
                </CardContent>
              </Card>
            ) : googleAuth?.connected ? (
              <div className="space-y-4">
                {/* Connected state */}
                <Card className="border-emerald-200 bg-emerald-50/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Link2 className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base text-emerald-800">Conectado con Google</CardTitle>
                        <p className="text-sm text-emerald-600">{googleAuth.email}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Calendar Sync Toggle */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-700">Sincronizar con Google Calendar</p>
                          <p className="text-xs text-slate-500">Las tareas se crearán como eventos en tu calendario</p>
                        </div>
                        <Switch
                          checked={googleAuth.calendarSync ?? false}
                          disabled
                        />
                      </div>

                      <Separator />

                      {/* Tasks Sync Toggle */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-700">Sincronizar con Google Tasks</p>
                          <p className="text-xs text-slate-500">Las tareas se agregarán a tu lista de tareas de Google</p>
                        </div>
                        <Switch
                          checked={googleAuth.tasksSync ?? false}
                          disabled
                        />
                      </div>

                      <Separator />

                      {/* Last sync */}
                      {googleAuth.lastSyncAt && (
                        <p className="text-xs text-slate-500">
                          Última sincronización: {formatDateFull(googleAuth.lastSyncAt)}
                        </p>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-3 pt-2">
                        <Button onClick={() => void handleSyncNow()} disabled={syncing}>
                          {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                          {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
                        </Button>
                        <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => void handleDisconnectGoogle()}>
                          <Unlink className="w-4 h-4 mr-2" />
                          Desconectar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Setup instructions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Configuración de Google Cloud Console</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-slate-600 space-y-3">
                    <p>Para que la integración funcione correctamente, asegúrate de haber configurado lo siguiente en tu proyecto de Google Cloud Console:</p>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                      <li>
                        Crea un proyecto en{' '}
                        <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer"
                          className="text-amber-600 hover:text-amber-700 underline inline-flex items-center gap-1">
                          Google Cloud Console <ExternalLink className="w-3 h-3" />
                        </a>
                      </li>
                      <li>Habilita las APIs de <strong>Google Calendar API</strong> y <strong>Google Tasks API</strong></li>
                      <li>Configura la pantalla de consentimiento OAuth</li>
                      <li>Crea credenciales de OAuth 2.0 (ID de cliente y secreto)</li>
                      <li>Configura las variables de entorno del servidor con el Client ID y Client Secret</li>
                      <li>Agrega la URL de redirección autorizada</li>
                    </ol>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Disconnected state */}
                <Card>
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                      <CalendarClock className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">Conectar con Google Calendar</h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                      Sincroniza tus tareas del condominio con Google Calendar y Google Tasks.
                      Mantén todo organizado y recibe recordatorios directamente en tu cuenta de Google.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <Button
                        size="lg"
                        onClick={() => void handleConnectGoogle()}
                        disabled={connectingGoogle}
                      >
                        {connectingGoogle ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Link2 className="w-4 h-4 mr-2" />
                        )}
                        {connectingGoogle ? 'Conectando...' : 'Conectar con Google'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Benefits */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                        <CalendarDays className="w-5 h-5 text-amber-600" />
                      </div>
                      <h4 className="font-semibold text-sm text-slate-800 mb-1">Calendario</h4>
                      <p className="text-xs text-slate-500">Sincroniza tareas como eventos en Google Calendar con fechas y horas</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center mx-auto mb-3">
                        <ListChecks className="w-5 h-5 text-sky-600" />
                      </div>
                      <h4 className="font-semibold text-sm text-slate-800 mb-1">Tareas</h4>
                      <p className="text-xs text-slate-500">Mantén tus tareas sincronizadas con Google Tasks desde cualquier dispositivo</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                        <RefreshCw className="w-5 h-5 text-emerald-600" />
                      </div>
                      <h4 className="font-semibold text-sm text-slate-800 mb-1">Bidireccional</h4>
                      <p className="text-xs text-slate-500">Los cambios se sincronizan en ambas direcciones automáticamente</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Setup instructions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Instrucciones de Configuración</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-slate-600 space-y-3">
                    <p>Antes de conectar, necesitas configurar las credenciales OAuth 2.0 en Google Cloud Console:</p>
                    <ol className="list-decimal list-inside space-y-2 ml-2">
                      <li>
                        Ve a{' '}
                        <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer"
                          className="text-amber-600 hover:text-amber-700 underline inline-flex items-center gap-1">
                          Google Cloud Console <ExternalLink className="w-3 h-3" />
                        </a>
                      </li>
                      <li>Crea un nuevo proyecto o selecciona uno existente</li>
                      <li>Navega a <strong>APIs y servicios → Biblioteca</strong></li>
                      <li>Busca y habilita <strong>Google Calendar API</strong> y <strong>Google Tasks API</strong></li>
                      <li>Ve a <strong>APIs y servicios → Credenciales</strong></li>
                      <li>Configura la <strong>Pantalla de consentimiento OAuth</strong> (aplicación externa)</li>
                      <li>Crea credenciales de <strong>OAuth 2.0 → ID de cliente</strong> (aplicación web)</li>
                      <li>Copia el <strong>Client ID</strong> y <strong>Client Secret</strong></li>
                      <li>En <strong>URI de redirección autorizadas</strong>, agrega la URL de tu aplicación</li>
                      <li>Configura las variables de entorno en el servidor:</li>
                    </ol>
                    <div className="bg-slate-50 rounded-lg p-3 font-mono text-xs space-y-1 mt-2">
                      <p><span className="text-slate-400"># Variables de entorno requeridas</span></p>
                      <p>GOOGLE_CLIENT_ID=tu_client_id_aquí</p>
                      <p>GOOGLE_CLIENT_SECRET=tu_client_secret_aquí</p>
                      <p>GOOGLE_REDIRECT_URI=https://tu-dominio.com/api/planificacion/google/callback</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* CREATE / EDIT DIALOG */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {editando ? <Edit className="w-5 h-5 text-amber-500" /> : <Plus className="w-5 h-5 text-amber-500" />}
                {editando ? 'Editar Tarea' : 'Nueva Tarea'}
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="tarea-titulo">
                  Título <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="tarea-titulo"
                  placeholder="Título de la tarea"
                  value={form.titulo}
                  onChange={(e) => setForm(prev => ({ ...prev, titulo: e.target.value }))}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="tarea-descripcion">Descripción</Label>
                <Textarea
                  id="tarea-descripcion"
                  placeholder="Describe la tarea..."
                  rows={3}
                  value={form.descripcion}
                  onChange={(e) => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
                />
              </div>

              {/* Row: Estado + Prioridad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Select value={form.estado} onValueChange={(v) => setForm(prev => ({ ...prev, estado: v as TareaPlanificacion['estado'] }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS.map(e => (
                        <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prioridad</Label>
                  <Select value={form.prioridad} onValueChange={(v) => setForm(prev => ({ ...prev, prioridad: v as TareaPlanificacion['prioridad'] }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORIDADES.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row: Categoría + Asignado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select value={form.categoria} onValueChange={(v) => setForm(prev => ({ ...prev, categoria: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIAS.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tarea-asignado">Asignado a</Label>
                  <Input
                    id="tarea-asignado"
                    placeholder="Nombre de la persona"
                    value={form.asignadoA}
                    onChange={(e) => setForm(prev => ({ ...prev, asignadoA: e.target.value }))}
                  />
                </div>
              </div>

              {/* All Day toggle */}
              <div className="flex items-center gap-3">
                <Checkbox
                  id="tarea-diacompleto"
                  checked={form.diaCompleto}
                  onCheckedChange={(checked) => setForm(prev => ({ ...prev, diaCompleto: !!checked }))}
                />
                <Label htmlFor="tarea-diacompleto" className="cursor-pointer">
                  Día completo (sin hora específica)
                </Label>
              </div>

              {/* Row: Fecha Inicio + Hora Inicio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tarea-fechainicio">Fecha de inicio</Label>
                  <Input
                    id="tarea-fechainicio"
                    type="date"
                    value={form.fechaInicio}
                    onChange={(e) => setForm(prev => ({ ...prev, fechaInicio: e.target.value }))}
                  />
                </div>
                {!form.diaCompleto && (
                  <div className="space-y-2">
                    <Label htmlFor="tarea-horainicio">Hora de inicio</Label>
                    <Input
                      id="tarea-horainicio"
                      type="time"
                      value={form.horaInicio}
                      onChange={(e) => setForm(prev => ({ ...prev, horaInicio: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              {/* Row: Fecha Fin + Hora Fin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tarea-fechafin">Fecha de término</Label>
                  <Input
                    id="tarea-fechafin"
                    type="date"
                    value={form.fechaFin}
                    onChange={(e) => setForm(prev => ({ ...prev, fechaFin: e.target.value }))}
                  />
                </div>
                {!form.diaCompleto && (
                  <div className="space-y-2">
                    <Label htmlFor="tarea-horafin">Hora de término</Label>
                    <Input
                      id="tarea-horafin"
                      type="time"
                      value={form.horaFin}
                      onChange={(e) => setForm(prev => ({ ...prev, horaFin: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              {/* Row: Ubicación + Recordatorio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tarea-ubicacion">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> Ubicación
                    </span>
                  </Label>
                  <Input
                    id="tarea-ubicacion"
                    placeholder="Ej: Edificio A, Sala de reuniones"
                    value={form.ubicacion}
                    onChange={(e) => setForm(prev => ({ ...prev, ubicacion: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Recordatorio
                    </span>
                  </Label>
                  <Select value={form.recordatorio} onValueChange={(v) => setForm(prev => ({ ...prev, recordatorio: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECORDATORIOS.map(r => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="tarea-notas">
                  <span className="inline-flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> Notas adicionales
                  </span>
                </Label>
                <Textarea
                  id="tarea-notas"
                  placeholder="Notas, enlaces, referencias..."
                  rows={2}
                  value={form.notas}
                  onChange={(e) => setForm(prev => ({ ...prev, notas: e.target.value }))}
                />
              </div>

              {/* Sync info (edit only) */}
              {editando && editando.sincronizado && (
                <div className="flex items-center gap-2 p-3 bg-sky-50 border border-sky-200 rounded-lg">
                  <CalendarClock className="w-4 h-4 text-sky-500 shrink-0" />
                  <p className="text-xs text-sky-700">
                    Esta tarea está sincronizada con Google
                    {editando.googleEventId && ' Calendar'}
                    {editando.googleEventId && editando.googleTaskId && ' y'}
                    {editando.googleTaskId && ' Google Tasks'}.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => void handleSave()} disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editando ? 'Guardar Cambios' : 'Crear Tarea'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* DAY TASKS DIALOG (Calendar) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <Dialog open={dayTasksOpen} onOpenChange={setDayTasksOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-amber-500" />
                {selectedDay && format(selectedDay, "EEEE d 'de' MMMM, yyyy", { locale: es })}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {selectedDayTasks.length === 0 ? (
                <p className="text-center text-slate-500 py-6">No hay tareas para este día</p>
              ) : (
                selectedDayTasks.map(tarea => (
                  <div
                    key={tarea.id}
                    className="flex items-start gap-3 p-3 rounded-lg border hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => {
                      setDayTasksOpen(false)
                      openEdit(tarea)
                    }}
                  >
                    <span className={`w-2 h-2 rounded-full mt-2 shrink-0 ${getPrioridadDot(tarea.prioridad)}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-medium text-sm text-slate-800">{tarea.titulo}</span>
                        <Badge variant="outline" className={`${getPrioridadColor(tarea.prioridad)} text-[10px] px-1.5 py-0`}>
                          {getPrioridadLabel(tarea.prioridad)}
                        </Badge>
                        <Badge variant="outline" className={`${getEstadoColor(tarea.estado)} text-[10px] px-1.5 py-0`}>
                          {getEstadoLabel(tarea.estado)}
                        </Badge>
                      </div>
                      {tarea.horaInicio && !tarea.diaCompleto && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          {tarea.horaInicio}{tarea.horaFin ? ` - ${tarea.horaFin}` : ''}
                        </p>
                      )}
                      {tarea.ubicacion && (
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {tarea.ubicacion}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDayTasksOpen(false)}>
                Cerrar
              </Button>
              <Button
                onClick={() => {
                  setDayTasksOpen(false)
                  openNew()
                }}
              >
                <Plus className="w-4 h-4 mr-1.5" /> Nueva Tarea
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* DELETE CONFIRM DIALOG */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 className="w-5 h-5" />
                Eliminar Tarea
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-600">
              ¿Estás seguro de que deseas eliminar esta tarea? Esta acción no se puede deshacer.
              {deleteId && tareas.find(t => t.id === deleteId)?.sincronizado && (
                <span className="block mt-2 text-amber-600 font-medium">
                  Esta tarea también se eliminará de Google Calendar/Tasks.
                </span>
              )}
            </p>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={() => void handleDelete()} disabled={deleting}>
                {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
