'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
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
import { toast } from 'sonner'
import { formatCLP } from '@/lib/utils'
import { useSession } from '@/hooks/use-session'
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Download,
  Mail,
  MailCheck,
  RefreshCw,
  ShoppingCart,
  Eye,
  Link2,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  FileText,
  RotateCcw,
  History,
  Send,
  ShieldAlert,
  Filter,
} from 'lucide-react'
import { TableroIndicadores } from '@/components/ui/tablero-indicadores'

interface MaterialSolicitud {
  nombre: string
  cantidad: number
  unidad: string
  precioEstimado: number
  total: number
  mejorPrecio?: number | null
  mejorTienda?: string | null
  mejorUrl?: string | null
  linkCompra?: string | null
}

interface SolicitudCompra {
  id: string
  codigo: string
  titulo: string
  descripcion: string | null
  estado: string
  prioridad: string
  moneda?: string
  origenTipo: string | null
  origenId: string | null
  origenCodigo: string | null
  proyectoId?: string | null
  proyectoNombre?: string | null
  otId?: string | null
  otCodigo?: string | null
  centroCostoId?: string | null
  materiales: MaterialSolicitud[]
  totalEstimado: number
  solicitadoPor: string | null
  solicitadoPorId: string | null
  fechaSolicitud: string
  submittedAt?: string | null
  fechaEspera: string | null
  proveedorSugerido: string | null
  observaciones: string | null
  links?: string[]
  emailEnviado: boolean
  emailEnviadoA: string | null
  emailFechaEnvio: string | null
  etapaAprobacion?: string | null
  supervisorAprobadorNombre?: string | null
  supervisorFechaAprobacion?: string | null
  supervisorObservaciones?: string | null
  adminAprobadorNombre?: string | null
  adminFechaAprobacion?: string | null
  adminObservaciones?: string | null
  createdAt: string
  updatedAt: string
}

// Centro de costo simplificado
interface CentroCostoItem {
  id: string
  nombre: string
  codigo?: string
}

// Proyecto/OT para el selector
interface ProyectoItem {
  id: string
  codigo: string
  nombre: string
}

interface OTItem {
  id: string
  codigo: string
  titulo: string
  proyectoId: string
}

const ESTADOS = ['Borrador', 'Solicitado', 'En Proceso', 'Comprado', 'Rechazado', 'Anulada'] as const
const PRIORIDADES = ['Baja', 'Media', 'Alta', 'Urgente'] as const
const MONEDAS = ['CLP', 'USD'] as const
const UNIDADES = ['unidad', 'metro', 'm²', 'm³', 'kilo', 'saco', 'litro', 'galón', 'caja', 'bolsa', 'rollo', 'tubo']

const estadoColors: Record<string, string> = {
  Borrador: 'bg-slate-100 text-slate-700',
  Solicitado: 'bg-blue-100 text-blue-700',
  'En Proceso': 'bg-amber-100 text-amber-700',
  Comprado: 'bg-green-100 text-green-700',
  Rechazado: 'bg-red-100 text-red-700',
  Anulada: 'bg-slate-200 text-slate-700',
}

const etapaColors: Record<string, string> = {
  'Pendiente Supervisor': 'bg-amber-100 text-amber-800 border-amber-200',
  'Aprobada Supervisor': 'bg-blue-100 text-blue-800 border-blue-200',
  'Aprobada Admin': 'bg-green-100 text-green-800 border-green-200',
  'Rechazada Supervisor': 'bg-red-100 text-red-800 border-red-200',
  'Rechazada Admin': 'bg-red-200 text-red-900 border-red-300',
  'Sin etapa': 'bg-slate-100 text-slate-600 border-slate-200',
  'Presupuesto': 'bg-blue-100 text-blue-700 border-blue-200',
  'Coordinación con Proveedor': 'bg-purple-100 text-purple-700 border-purple-200',
  'Estudio de Materiales': 'bg-amber-100 text-amber-700 border-amber-200',
  'Preparación de Compra': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  'Completado': 'bg-green-100 text-green-700 border-green-200',
}

const ETAPAS_SELECT = [
  'Sin etapa',
  'Presupuesto',
  'Coordinación con Proveedor',
  'Estudio de Materiales',
  'Preparación de Compra',
  'Completado',
]

const prioridadColors: Record<string, string> = {
  Baja: 'bg-green-100 text-green-700',
  Media: 'bg-amber-100 text-amber-700',
  Alta: 'bg-orange-100 text-orange-700',
  Urgente: 'bg-red-100 text-red-700',
}

const emptyForm = {
  titulo: '',
  descripcion: '',
  prioridad: 'Media',
  estado: 'Borrador',
  moneda: 'CLP',
  fechaEspera: '',
  proveedorSugerido: '',
  observaciones: '',
  proyectoId: '',
  proyectoNombre: '',
  otId: '',
  otCodigo: '',
  centroCostoId: '',
}

export function SolicitudesComprasModule() {
  const { user, hasPermission, isAdmin } = useSession()
  const canAprobarSupervisor = !isAdmin() && hasPermission('solicitudescompra.aprobar_supervisor')
  const canAprobarAdmin = isAdmin() || hasPermission('solicitudescompra.aprobar_admin')
  const [solicitudes, setSolicitudes] = useState<SolicitudCompra[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('all')
  const [filterPrioridad, setFilterPrioridad] = useState('all')
  const [filterFechaDesde, setFilterFechaDesde] = useState('')
  const [filterFechaHasta, setFilterFechaHasta] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<SolicitudCompra | null>(null)
  const [formData, setFormData] = useState({ ...emptyForm })
  const [materiales, setMateriales] = useState<MaterialSolicitud[]>([])
  const [links, setLinks] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detail, setDetail] = useState<SolicitudCompra | null>(null)
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null)

  // Diálogo de aprobación/rechazo
  const [aprobDialogOpen, setAprobDialogOpen] = useState(false)
  const [aprobTarget, setAprobTarget] = useState<SolicitudCompra | null>(null)
  const [aprobAccion, setAprobAccion] = useState<'aprobar_supervisor' | 'rechazar_supervisor' | 'devolver_supervisor' | 'aprobar_admin' | 'rechazar_admin' | 'devolver_admin' | null>(null)
  const [aprobObservaciones, setAprobObservaciones] = useState('')
  const [aprobLoading, setAprobLoading] = useState(false)

  const [historial, setHistorial] = useState<any[] | null>(null)
  const [loadingHistorial, setLoadingHistorial] = useState(false)

  // Datos para selectores
  const [proyectos, setProyectos] = useState<ProyectoItem[]>([])
  const [ots, setOts] = useState<OTItem[]>([])
  const [centrosCosto, setCentrosCosto] = useState<CentroCostoItem[]>([])
  const [proyectoSearch, setProyectoSearch] = useState('')

  // ===== CARGA DE DATOS AUXILIARES =====
  useEffect(() => {
    const loadAuxData = async () => {
      try {
        const [proyRes, ccRes] = await Promise.all([
          fetch('/api/proyectos?limit=200').then((r) => r.json()).catch(() => []),
          fetch('/api/centros-costo').then((r) => r.json()).catch(() => []),
        ])
        setProyectos(Array.isArray(proyRes) ? proyRes.map((p: any) => ({ id: p.id, codigo: p.codigo || '', nombre: p.nombre || '' })) : [])
        setCentrosCosto(Array.isArray(ccRes) ? ccRes.map((c: any) => ({ id: c.id, nombre: c.nombre || '', codigo: c.codigo || '' })) : [])
      } catch (e) {
        console.error('Error cargando datos auxiliares:', e)
      }
    }
    void loadAuxData()
  }, [])

  // Cargar OTs cuando se selecciona un proyecto
  const filteredOts = useMemo(() => {
    if (!formData.proyectoId) return []
    // Filtrar OTs del proyecto seleccionado (usando origen del proyecto)
    return ots.filter((ot) => ot.proyectoId === formData.proyectoId)
  }, [formData.proyectoId, ots])

  // Cargar OTs desde la API cuando se cambia proyecto
  useEffect(() => {
    if (!formData.proyectoId) {
      setOts([])
      setFormData((f) => ({ ...f, otId: '', otCodigo: '' }))
      return
    }
    const loadOts = async () => {
      try {
        const res = await fetch(`/api/ordenes-trabajo?proyectoId=${formData.proyectoId}&limit=200`)
        if (res.ok) {
          const data = await res.json()
          const otList = Array.isArray(data) ? data : []
          setOts(otList.map((ot: any) => ({ id: ot.id, codigo: ot.otNum || '', titulo: ot.titulo || '', proyectoId: ot.proyectoId || '' })))
        }
      } catch (e) {
        console.error('Error cargando OTs:', e)
      }
    }
    void loadOts()
  }, [formData.proyectoId])

  // ===== PROYECTOS FILTRADOS PARA BÚSQUEDA PREDICTIVA =====
  const proyectosFiltrados = useMemo(() => {
    if (!proyectoSearch) return proyectos.slice(0, 20)
    const q = proyectoSearch.toLowerCase()
    return proyectos.filter(
      (p) => p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)
    ).slice(0, 20)
  }, [proyectos, proyectoSearch])

  const fetchHistorial = async (scId: string) => {
    setLoadingHistorial(true)
    try {
      const res = await fetch(`/api/solicitudes-compra/${scId}/historial`)
      if (res.ok) setHistorial(await res.json())
    } catch (e) { console.error(e) }
    finally { setLoadingHistorial(false) }
  }

  const openDetail = (s: SolicitudCompra) => {
    setDetail(s)
    setHistorial(null)
    setDetailOpen(true)
    void fetchHistorial(s.id)
  }

  const openAprobDialog = (s: SolicitudCompra, accion: 'aprobar_supervisor' | 'rechazar_supervisor' | 'devolver_supervisor' | 'aprobar_admin' | 'rechazar_admin' | 'devolver_admin') => {
    setAprobTarget(s)
    setAprobAccion(accion)
    setAprobObservaciones('')
    setAprobDialogOpen(true)
  }

  const handleAprobSubmit = async () => {
    if (!aprobTarget || !aprobAccion) return
    if ((aprobAccion.includes('rechazar') || aprobAccion.includes('devolver')) && !aprobObservaciones.trim()) {
      toast.error(aprobAccion.includes('rechazar') ? 'Debe ingresar el motivo del rechazo' : 'Debe indicar las correcciones necesarias')
      return
    }
    setAprobLoading(true)
    try {
      const res = await fetch(`/api/solicitudes-compra/${aprobTarget.id}/aprobar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: aprobAccion, observaciones: aprobObservaciones.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Error al procesar la aprobación'); return }
      toast.success(data.message || 'Acción procesada correctamente')
      setAprobDialogOpen(false)
      setAprobTarget(null)
      setAprobAccion(null)
      setAprobObservaciones('')
      fetchSolicitudes()
    } catch (e) {
      console.error('Error aprobación:', e)
      toast.error('Error de conexión')
    } finally { setAprobLoading(false) }
  }

  const fetchSolicitudes = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterEstado !== 'all') params.set('estado', filterEstado)
      if (filterPrioridad !== 'all') params.set('prioridad', filterPrioridad)
      if (filterFechaDesde) params.set('fechaDesde', filterFechaDesde)
      if (filterFechaHasta) params.set('fechaHasta', filterFechaHasta)
      const url = `/api/solicitudes-compra${params.toString() ? `?${params.toString()}` : ''}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Error al cargar')
      const data = await res.json()
      setSolicitudes(data)
    } catch (error) {
      console.error(error)
      toast.error('Error al cargar solicitudes de compra')
    } finally { setLoading(false) }
  }

  useEffect(() => {
    void fetchSolicitudes()
    const interval = setInterval(() => { void fetchSolicitudes() }, 300000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => { void fetchSolicitudes() }, 300)
    return () => clearTimeout(t)
  }, [search, filterEstado, filterPrioridad, filterFechaDesde, filterFechaHasta])

  const stats = useMemo(() => {
    const total = solicitudes.length
    const borradores = solicitudes.filter((s) => s.estado === 'Borrador').length
    const solicitadas = solicitudes.filter((s) => s.estado === 'Solicitado').length
    const enProceso = solicitudes.filter((s) => s.estado === 'En Proceso').length
    const completadas = solicitudes.filter((s) => s.estado === 'Comprado').length
    const montoTotal = solicitudes.filter((s) => s.estado !== 'Borrador').reduce((acc, s) => acc + (s.totalEstimado || 0), 0)
    return { total, borradores, solicitadas, enProceso, completadas, montoTotal }
  }, [solicitudes])

  // ===== TOTAL ESTIMADO (debe ir ANTES de validateValuacion para evitar TDZ) =====
  const totalEstimado = useMemo(
    () => materiales.reduce((acc, m) => acc + (Number(m.total) || 0), 0),
    [materiales]
  )

  // ===== VALIDACIÓN DE VALORIZACIÓN =====
  const validateValuacion = useCallback((): string[] => {
    const errors: string[] = []
    const cleanItems = materiales.filter((m) => m.nombre && m.nombre.trim() !== '')
    if (cleanItems.length === 0) errors.push('Debe agregar al menos un material')
    for (const item of cleanItems) {
      if (!item.cantidad || item.cantidad <= 0) errors.push(`Cantidad inválida en "${item.nombre}"`)
      if (!item.precioEstimado || item.precioEstimado <= 0) errors.push(`Precio inválido en "${item.nombre}"`)
    }
    if (totalEstimado <= 0) errors.push('La valorización total debe ser mayor a 0')
    return errors
  }, [materiales, totalEstimado])

  const openCreate = () => {
    setEditing(null)
    setFormData({ ...emptyForm })
    setMateriales([{ nombre: '', cantidad: 1, unidad: 'unidad', precioEstimado: 0, total: 0 }])
    setLinks([])
    setDialogOpen(true)
  }

  const openEdit = (s: SolicitudCompra) => {
    if (s.estado !== 'Borrador' && !isAdmin()) {
      toast.error(`No se puede editar una solicitud en estado "${s.estado}". Solo el administrador puede hacer ediciones de emergencia.`)
      return
    }
    setEditing(s)
    setFormData({
      titulo: s.titulo,
      descripcion: s.descripcion || '',
      prioridad: s.prioridad,
      estado: s.estado,
      moneda: s.moneda || 'CLP',
      fechaEspera: s.fechaEspera || '',
      proveedorSugerido: s.proveedorSugerido || '',
      observaciones: s.observaciones || '',
      proyectoId: s.proyectoId || '',
      proyectoNombre: s.proyectoNombre || '',
      otId: s.otId || '',
      otCodigo: s.otCodigo || '',
      centroCostoId: s.centroCostoId || '',
    })
    setMateriales(
      s.materiales && s.materiales.length > 0
        ? s.materiales.map((m) => ({ ...m }))
        : [{ nombre: '', cantidad: 1, unidad: 'unidad', precioEstimado: 0, total: 0 }]
    )
    setLinks(Array.isArray(s.links) ? s.links.map((l) => String(l || '')) : [])
    setDialogOpen(true)
  }

  const addMaterial = () => {
    setMateriales([...materiales, { nombre: '', cantidad: 1, unidad: 'unidad', precioEstimado: 0, total: 0 }])
  }

  const updateMaterial = (index: number, field: keyof MaterialSolicitud, value: any) => {
    const next = [...materiales]
    next[index] = { ...next[index], [field]: value }
    if (field === 'cantidad' || field === 'precioEstimado') {
      next[index].total = (Number(next[index].cantidad) || 0) * (Number(next[index].precioEstimado) || 0)
    }
    setMateriales(next)
  }

  const removeMaterial = (index: number) => {
    setMateriales(materiales.filter((_, i) => i !== index))
  }

  const addLink = () => setLinks([...links, ''])
  const updateLink = (index: number, value: string) => {
    const next = [...links]
    next[index] = value
    setLinks(next)
  }
  const removeLink = (index: number) => setLinks(links.filter((_, i) => i !== index))

  const handleSave = async (submitDirectly = false) => {
    if (!formData.titulo.trim()) { toast.error('El título es obligatorio'); return }

    const cleanMateriales = materiales
      .filter((m) => m.nombre && m.nombre.trim() !== '')
      .map((m) => ({
        nombre: m.nombre.trim(),
        cantidad: Number(m.cantidad) || 0,
        unidad: m.unidad || 'unidad',
        precioEstimado: Number(m.precioEstimado) || 0,
        total: Number(m.total) || 0,
      }))

    // Si se envía directamente a revisión, validar valorización
    if (submitDirectly) {
      const valErrors: string[] = []
      if (cleanMateriales.length === 0) valErrors.push('Debe agregar al menos un material')
      for (const item of cleanMateriales) {
        if (!item.cantidad || item.cantidad <= 0) valErrors.push(`Cantidad inválida en "${item.nombre}"`)
        if (!item.precioEstimado || item.precioEstimado <= 0) valErrors.push(`Precio inválido en "${item.nombre}"`)
      }
      const total = cleanMateriales.reduce((s, m) => s + m.total, 0)
      if (total <= 0) valErrors.push('La valorización total debe ser mayor a 0')
      if (valErrors.length > 0) {
        toast.error(valErrors[0])
        return
      }
    }

    const payload = {
      ...formData,
      estado: submitDirectly ? 'Solicitado' : 'Borrador',
      materiales: cleanMateriales,
      totalEstimado,
      links: links.map((l) => l.trim()).filter((l) => l !== ''),
    }

    setSaving(true)
    try {
      const res = editing
        ? await fetch(`/api/solicitudes-compra/${editing.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/solicitudes-compra', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

      const data = await res.json()
      if (!res.ok) {
        const details = data.details
          ? Array.isArray(data.details) ? data.details.join('. ') : data.details
          : data.error || 'Error al guardar'
        throw new Error(details)
      }

      if (editing) {
        toast.success(`Solicitud ${editing.codigo} actualizada`)
      } else if (submitDirectly) {
        const emailMsg = data?.emailSkipped ? ' (email no enviado: SMTP no configurado)' : data?.emailEnviado ? ' y email enviado' : ''
        toast.success(`Solicitud ${data.codigo} enviada a revisión${emailMsg}`)
      } else {
        toast.success(`Borrador ${data.codigo} guardado`)
      }
      setDialogOpen(false)
      void fetchSolicitudes()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Error al guardar')
    } finally { setSaving(false) }
  }

  // Enviar borrador a revisión
  const handleSubmitToReview = async (s: SolicitudCompra) => {
 setSubmitting(true)
    try {
      const res = await fetch(`/api/solicitudes-compra/${s.id}/submit`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        const details = data.details
          ? Array.isArray(data.details) ? data.details.join('. ') : data.details
          : data.error || 'Error al enviar'
        toast.error(details)
        return
      }
      toast.success(data.message || `Solicitud ${s.codigo} enviada a revisión`)
      void fetchSolicitudes()
    } catch (e) {
      console.error(e)
      toast.error('Error de conexión')
    } finally { setSubmitting(false) }
  }

  const handleDelete = async (s: SolicitudCompra) => {
    if (!window.confirm(`¿Eliminar la solicitud ${s.codigo}?`)) return
    try {
      const res = await fetch(`/api/solicitudes-compra/${s.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')
      toast.success('Solicitud eliminada')
      void fetchSolicitudes()
    } catch (error) {
      console.error(error)
      toast.error('Error al eliminar')
    }
  }

  const handleResendEmail = async (s: SolicitudCompra) => {
    setSendingEmailId(s.id)
    try {
      const res = await fetch(`/api/solicitudes-compra/${s.id}/enviar-email`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Error al enviar email')
      if (data?.skipped) toast.warning('SMTP no configurado. El email no se pudo enviar.')
      else toast.success('Email reenviado a administracionlagunanorte@gmail.com')
      void fetchSolicitudes()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Error al enviar email')
    } finally { setSendingEmailId(null) }
  }

  const changeEtapa = async (scId: string, nuevaEtapa: string) => {
    try {
      const res = await fetch(`/api/solicitudes-compra/${scId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etapaAprobacion: nuevaEtapa }),
      })
      if (res.ok) { toast.success(`Etapa: ${nuevaEtapa}`); fetchSolicitudes() }
      else toast.error('Error al cambiar etapa')
    } catch (_err) { toast.error('Error de conexión') }
  }

  const exportToCSV = () => {
    const headers = ['Código', 'Título', 'Estado', 'Prioridad', 'Moneda', 'Proyecto', 'OT', 'Total Estimado', 'Solicitado por', 'Fecha Solicitud', 'Fecha Esperada', 'Proveedor Sugerido', 'Email Enviado', 'Materiales']
    const rows = solicitudes.map((s) => [
      s.codigo,
      `"${(s.titulo || '').replace(/"/g, '""')}"`,
      s.estado,
      s.prioridad,
      s.moneda || 'CLP',
      `"${(s.proyectoNombre || '').replace(/"/g, '""')}"`,
      `"${(s.otCodigo || '').replace(/"/g, '""')}"`,
      String(s.totalEstimado || 0),
      `"${(s.solicitadoPor || '').replace(/"/g, '""')}"`,
      s.fechaSolicitud ? new Date(s.fechaSolicitud).toLocaleString() : '',
      s.fechaEspera || '',
      `"${(s.proveedorSugerido || '').replace(/"/g, '""')}"`,
      s.emailEnviado ? 'Sí' : 'No',
      `"${(s.materiales || []).map((m) => `${m.cantidad} ${m.unidad} ${m.nombre}`).join(' | ').replace(/"/g, '""')}"`,
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `solicitudes_compra_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const formatMonto = (monto: number, moneda?: string) => {
    if ((moneda || formData.moneda) === 'USD') return `$${(monto || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    return formatCLP(monto)
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <TableroIndicadores
        columnas={6}
        cards={[
          { titulo: 'Total', numero: stats.total, icon: <ShoppingCart className="w-5 h-5" />, color: 'primary', subtitulo: '' },
          { titulo: 'Borradores', numero: stats.borradores, icon: <FileText className="w-5 h-5" />, color: 'gris', subtitulo: '' },
          { titulo: 'Solicitadas', numero: stats.solicitadas, icon: <Clock className="w-5 h-5" />, color: 'naranja', subtitulo: '' },
          { titulo: 'En Proceso', numero: stats.enProceso, icon: <AlertTriangle className="w-5 h-5" />, color: 'azul', subtitulo: '' },
          { titulo: 'Compradas', numero: stats.completadas, icon: <CheckCircle className="w-5 h-5" />, color: 'verde', subtitulo: '' },
          { titulo: 'Monto Total', numero: formatCLP(stats.montoTotal), icon: <DollarSign className="w-5 h-5" />, color: 'gris', subtitulo: 'En revisión+' },
        ]}
      />

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Buscar por código, título, proyecto, OT..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {ESTADOS.map((e) => (<SelectItem key={e} value={e}>{e}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={filterPrioridad} onValueChange={setFilterPrioridad}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Prioridad" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {PRIORIDADES.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="w-4 h-4 mr-1" /> Filtros
        </Button>
        <Button variant="outline" onClick={() => void fetchSolicitudes()}>
          <RefreshCw className="w-4 h-4 mr-1" /> Refrescar
        </Button>
        <Button variant="outline" onClick={exportToCSV}>
          <Download className="w-4 h-4 mr-1" /> CSV
        </Button>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" /> Nueva Solicitud
        </Button>
      </div>

      {/* Filtros avanzados */}
      {showFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Fecha desde</Label>
              <Input type="date" value={filterFechaDesde} onChange={(e) => setFilterFechaDesde(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fecha hasta</Label>
              <Input type="date" value={filterFechaHasta} onChange={(e) => setFilterFechaHasta(e.target.value)} />
            </div>
          </div>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Solicitudes de Compra ({solicitudes.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <p className="md:hidden text-xs text-slate-400 text-center py-1">← Desliza horizontalmente para ver más →</p>
          <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Código</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Título</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Estado</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Etapa</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Prioridad</th>
                  <th className="text-right p-3 text-[10px] font-bold text-slate-500 uppercase">Total</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Proyecto/OT</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Fecha</th>
                  <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Email</th>
                  <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="p-8 text-center text-slate-400">Cargando...</td></tr>
                ) : solicitudes.length === 0 ? (
                  <tr><td colSpan={10} className="p-8 text-center text-slate-400">No hay solicitudes de compra. Crea la primera con &quot;Nueva Solicitud&quot;.</td></tr>
                ) : (
                  solicitudes.map((s) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="p-3 font-mono text-xs font-semibold whitespace-nowrap">{s.codigo}</td>
                      <td className="p-3 max-w-[220px]">
                        <div className="font-medium truncate" title={s.titulo}>{s.titulo}</div>
                        {s.origenCodigo && (
                          <div className="text-[10px] text-slate-500 truncate">Origen: {s.origenTipo} {s.origenCodigo}</div>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge className={estadoColors[s.estado] || 'bg-slate-100'}>{s.estado}</Badge>
                      </td>
                      <td className="p-3">
                        {s.estado === 'Borrador' ? (
                          <span className="text-[10px] text-slate-400 italic">—</span>
                        ) : (
                          <select
                            value={(() => {
                              const etapa = s.etapaAprobacion || 'Sin etapa'
                              if (etapa === 'Pendiente Supervisor') return 'Presupuesto'
                              if (etapa === 'Aprobada Supervisor') return 'Coordinación con Proveedor'
                              if (etapa === 'Aprobada Admin') return 'Completado'
                              if (etapa && etapa.startsWith('Rechazada')) return 'Sin etapa'
                              return ETAPAS_SELECT.includes(etapa) ? etapa : 'Sin etapa'
                            })()}
                            onChange={(e) => void changeEtapa(s.id, e.target.value)}
                            className={`text-[10px] font-medium rounded-md border px-1.5 py-1 cursor-pointer ${etapaColors[s.etapaAprobacion || ''] || etapaColors['Sin etapa']}`}
                          >
                            {ETAPAS_SELECT.map(etapa => (<option key={etapa} value={etapa}>{etapa}</option>))}
                          </select>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge className={prioridadColors[s.prioridad] || 'bg-slate-100'}>{s.prioridad}</Badge>
                      </td>
                      <td className="p-3 text-right font-mono font-semibold whitespace-nowrap">
                        {formatMonto(s.totalEstimado, s.moneda)}
                      </td>
                      <td className="p-3 text-xs text-slate-600 max-w-[120px]">
                        <div className="truncate" title={s.proyectoNombre || s.otCodigo || ''}>
                          {s.proyectoNombre || '—'}
                        </div>
                        {s.otCodigo && (
                          <div className="text-[10px] text-slate-400 truncate">{s.otCodigo}</div>
                        )}
                      </td>
                      <td className="p-3 text-xs text-slate-600 whitespace-nowrap">
                        {s.fechaSolicitud ? new Date(s.fechaSolicitud).toLocaleDateString('es-CL') : '–'}
                      </td>
                      <td className="p-3 text-center">
                        {s.emailEnviado ? (
                          <span className="inline-flex items-center gap-1 text-green-600 text-xs" title={s.emailFechaEnvio ? `Enviado el ${new Date(s.emailFechaEnvio).toLocaleString('es-CL')}` : 'Enviado'}>
                            <MailCheck className="w-4 h-4" /> Sí
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
                            <Mail className="w-4 h-4" /> No
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center gap-1 flex-wrap">
                          {/* Botón enviar a revisión (solo borradores del propio usuario o admin) */}
                          {s.estado === 'Borrador' && (s.solicitadoPorId === user?.id || isAdmin()) && (
                            <Button size="sm" className="h-7 px-2 text-xs bg-blue-600 hover:bg-blue-700 text-white" title="Enviar a revisión" disabled={submitting} onClick={() => void handleSubmitToReview(s)}>
                              <Send className="w-3 h-3 mr-1" /> Enviar
                            </Button>
                          )}
                          {/* Botones de aprobación */}
                          {s.etapaAprobacion === 'Pendiente Supervisor' && canAprobarSupervisor && (
                            <>
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-green-300 text-green-700 hover:bg-green-50" onClick={() => openAprobDialog(s, 'aprobar_supervisor')}><CheckCircle className="w-3 h-3 mr-1" /> Aprobar</Button>
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => openAprobDialog(s, 'devolver_supervisor')}><RotateCcw className="w-3 h-3 mr-1" /> Devolver</Button>
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-red-300 text-red-700 hover:bg-red-50" onClick={() => openAprobDialog(s, 'rechazar_supervisor')}><XCircle className="w-3 h-3 mr-1" /> Rechazar</Button>
                            </>
                          )}
                          {s.etapaAprobacion === 'Aprobada Supervisor' && canAprobarAdmin && (
                            <>
                              <Button size="sm" className="h-7 px-2 text-xs bg-green-700 hover:bg-green-800 text-white" onClick={() => openAprobDialog(s, 'aprobar_admin')}><CheckCircle className="w-3 h-3 mr-1" /> Gestionar</Button>
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => openAprobDialog(s, 'devolver_admin')}><RotateCcw className="w-3 h-3 mr-1" /> Devolver</Button>
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-red-300 text-red-700 hover:bg-red-50" onClick={() => openAprobDialog(s, 'rechazar_admin')}><XCircle className="w-3 h-3 mr-1" /> Rechazar</Button>
                            </>
                          )}
                          {s.etapaAprobacion && s.etapaAprobacion.startsWith('Rechazada') && (
                            <span className="text-[10px] text-red-600 italic">Rechazada</span>
                          )}
                          {s.etapaAprobacion === 'Aprobada Admin' && (
                            <span className="text-[10px] text-green-700 italic">Aprobada</span>
                          )}
                          {s.fechaEspera && new Date(s.fechaEspera) < new Date() && s.estado !== 'Comprado' && s.estado !== 'Rechazada' && s.estado !== 'Anulada' && s.estado !== 'Borrador' && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-red-600 font-medium" title="Fecha esperada vencida"><AlertTriangle className="w-3 h-3" /> Vencida</span>
                          )}
                          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Ver detalle" onClick={() => openDetail(s)}><Eye className="w-3.5 h-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Reenviar email" disabled={sendingEmailId === s.id} onClick={() => void handleResendEmail(s)} title="Reenviar email">
                            {sendingEmailId === s.id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Editar" onClick={() => openEdit(s)}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:text-red-700" aria-label="Eliminar" onClick={() => void handleDelete(s)}><Trash2 className="w-3.5 h-3.5" /></Button>
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

      {/* ===== CREATE/EDIT DIALOG ===== */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Editar Solicitud ${editing.codigo}` : 'Nueva Solicitud de Compra'}</DialogTitle>
            <DialogDescription>
              {editing ? (
                editing.estado === 'Borrador' ? 'Editando borrador. Los cambios se guardan como borrador.' : 'Edición de emergencia (administrador)'
              ) : 'Crea un borrador primero, luego envíalo a revisión cuando esté listo.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Info del solicitante */}
            {user && (
              <div className="bg-slate-50 border rounded-lg p-3 flex flex-wrap gap-x-6 gap-y-1 text-xs">
                <span><span className="text-slate-500">Solicitante:</span> <strong>{user.nombre} {user.apellido || ''}</strong></span>
                {user.cargo && <span><span className="text-slate-500">Cargo:</span> {user.cargo}</span>}
              </div>
            )}

            {/* Título */}
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="titulo">Título *</Label>
              <Input id="titulo" className="w-full" value={formData.titulo} onChange={(e) => setFormData({ ...formData, titulo: e.target.value })} placeholder="Ej: Compra de pintura para OT-1024" />
            </div>

            {/* Descripción */}
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea id="descripcion" className="w-full" rows={3} value={formData.descripcion} onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} placeholder="Detalle del motivo de la compra..." />
            </div>

            {/* Selector de Proyecto (búsqueda predictiva) */}
            <div className="space-y-1.5 min-w-0">
              <Label>Proyecto (opcional)</Label>
              <Select value={formData.proyectoId} onValueChange={(v) => {
                const p = proyectos.find((pr) => pr.id === v)
                setFormData({ ...formData, proyectoId: v, proyectoNombre: p?.nombre || '', otId: '', otCodigo: '' })
              }}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Seleccionar proyecto..." /></SelectTrigger>
                <SelectContent>
                  <div className="p-2 border-b">
                    <Input placeholder="Buscar proyecto..." value={proyectoSearch} onChange={(e) => setProyectoSearch(e.target.value)} className="h-8 text-xs" />
                  </div>
                  {proyectosFiltrados.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.codigo ? `[${p.codigo}] ` : ''}{p.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selector de OT (se filtra por proyecto) */}
            {formData.proyectoId && (
              <div className="space-y-1.5 min-w-0">
                <Label>Orden de Trabajo (opcional)</Label>
                <Select value={formData.otId} onValueChange={(v) => {
                  const ot = ots.find((o) => o.id === v)
                  setFormData({ ...formData, otId: v, otCodigo: ot?.codigo || '' })
                }}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Seleccionar OT..." /></SelectTrigger>
                  <SelectContent>
                    {filteredOts.map((ot) => (
                      <SelectItem key={ot.id} value={ot.id}>{ot.codigo ? `[${ot.codigo}] ` : ''}{ot.titulo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Centro de Costos */}
            <div className="space-y-1.5 min-w-0">
              <Label>Centro de Costos (opcional)</Label>
              <Select value={formData.centroCostoId} onValueChange={(v) => setFormData({ ...formData, centroCostoId: v })}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Seleccionar centro de costos..." /></SelectTrigger>
                <SelectContent>
                  {centrosCosto.map((cc) => (
                    <SelectItem key={cc.id} value={cc.id}>{cc.codigo ? `[${cc.codigo}] ` : ''}{cc.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Prioridad / Moneda / Fecha / Proveedor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5 min-w-0">
                <Label>Prioridad</Label>
                <Select value={formData.prioridad} onValueChange={(v) => setFormData({ ...formData, prioridad: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORIDADES.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label>Moneda</Label>
                <Select value={formData.moneda} onValueChange={(v) => setFormData({ ...formData, moneda: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{MONEDAS.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="fechaEspera">Fecha esperada</Label>
                <Input id="fechaEspera" type="date" value={formData.fechaEspera} onChange={(e) => setFormData({ ...formData, fechaEspera: e.target.value })} />
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="proveedorSugerido">Proveedor sugerido</Label>
                <Input id="proveedorSugerido" value={formData.proveedorSugerido} onChange={(e) => setFormData({ ...formData, proveedorSugerido: e.target.value })} placeholder="Ej: Sodimac" />
              </div>
            </div>

            {/* Materiales */}
            <div className="space-y-2 min-w-0">
              <div className="flex justify-between items-center">
                <Label>Materiales ({materiales.length})</Label>
                <Button size="sm" variant="outline" onClick={addMaterial}><Plus className="w-3.5 h-3.5 mr-1" /> Agregar material</Button>
              </div>
              {/* Alertas de validación de valorización */}
              {validateValuacion().length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <ul className="space-y-0.5">
                    {validateValuacion().map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}
              <div className="border rounded-lg overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-2 text-xs" style={{ width: '38%' }}>Nombre</th>
                      <th className="text-center p-2 text-xs" style={{ width: '10%' }}>Cant.</th>
                      <th className="text-center p-2 text-xs" style={{ width: '10%' }}>Unidad</th>
                      <th className="text-right p-2 text-xs" style={{ width: '15%' }}>P. Unit.</th>
                      <th className="text-right p-2 text-xs" style={{ width: '15%' }}>Total</th>
                      <th className="p-2" style={{ width: '10%' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {materiales.length === 0 ? (
                      <tr><td colSpan={6} className="p-4 text-center text-slate-500 text-xs">Sin materiales. Agrega al menos uno.</td></tr>
                    ) : (
                      materiales.map((m, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2 min-w-0"><Input value={m.nombre} onChange={(e) => updateMaterial(i, 'nombre', e.target.value)} className="h-9 w-full" placeholder="Nombre del material" /></td>
                          <td className="p-2 min-w-0"><Input type="number" value={m.cantidad} onChange={(e) => updateMaterial(i, 'cantidad', parseFloat(e.target.value) || 0)} className="h-9 w-full text-center" /></td>
                          <td className="p-2 min-w-0">
                            <Select value={m.unidad} onValueChange={(v) => updateMaterial(i, 'unidad', v)}>
                              <SelectTrigger className="h-9 w-full"><SelectValue /></SelectTrigger>
                              <SelectContent>{UNIDADES.map((u) => (<SelectItem key={u} value={u}>{u}</SelectItem>))}</SelectContent>
                            </Select>
                          </td>
                          <td className="p-2 min-w-0"><Input type="number" value={m.precioEstimado} onChange={(e) => updateMaterial(i, 'precioEstimado', parseFloat(e.target.value) || 0)} className="h-9 w-full text-right" /></td>
                          <td className="p-2 text-right font-mono font-semibold whitespace-nowrap">{formatMonto(m.total)}</td>
                          <td className="p-2 text-center">
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600" aria-label="Eliminar material" onClick={() => removeMaterial(i)}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {materiales.length > 0 && (
                    <tfoot>
                      <tr className="border-t bg-slate-50">
                        <td colSpan={4} className="p-2 text-right font-semibold text-xs">Total estimado ({formData.moneda}):</td>
                        <td className="p-2 text-right font-mono font-bold text-red-600">{formatMonto(totalEstimado)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Observaciones */}
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea id="observaciones" rows={3} value={formData.observaciones} onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })} placeholder="Observaciones adicionales para administración..." />
            </div>

            {/* Links de Compra */}
            <div className="space-y-2 min-w-0">
              <div className="flex justify-between items-center">
                <Label>Links de Compra ({links.length})</Label>
                <Button size="sm" variant="outline" onClick={addLink}><Plus className="w-3.5 h-3.5 mr-1" /> Agregar link</Button>
              </div>
              {links.length === 0 ? (
                <p className="text-xs text-slate-500 italic">Sin links de compra. Agrega URLs de productos (opcional).</p>
              ) : (
                <div className="space-y-2">
                  {links.map((l, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <Input value={l} onChange={(e) => updateLink(i, e.target.value)} className="h-9 flex-1" placeholder="https://..." />
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 shrink-0" aria-label="Eliminar link" onClick={() => removeLink(i)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving || submitting}>Cancelar</Button>
            {!editing && (
              <Button variant="outline" onClick={() => void handleSave(false)} disabled={saving || submitting}>
                {saving ? 'Guardando...' : 'Guardar Borrador'}
              </Button>
            )}
            <Button onClick={() => { if (editing) { void handleSave(false) } else { void handleSave(true) } }} disabled={saving || submitting}>
              {saving ? 'Guardando...' : editing ? 'Actualizar' : <><Send className="w-4 h-4 mr-1" /> Crear y Enviar a Revisión</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== DETAIL DIALOG ===== */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>Solicitud {detail.codigo} — {detail.titulo}</DialogTitle>
                <DialogDescription>
                  Creada el {detail.fechaSolicitud ? new Date(detail.fechaSolicitud).toLocaleString('es-CL') : '—'} {detail.solicitadoPor ? `por ${detail.solicitadoPor}` : ''}
                  {detail.submittedAt && <span className="block text-xs mt-1">Enviada a revisión: {new Date(detail.submittedAt).toLocaleString('es-CL')}</span>}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="flex flex-wrap gap-2">
                  <Badge className={estadoColors[detail.estado] || 'bg-slate-100'}>{detail.estado}</Badge>
                  <Badge className={prioridadColors[detail.prioridad] || 'bg-slate-100'}>Prioridad: {detail.prioridad}</Badge>
                  {detail.moneda && detail.moneda !== 'CLP' && <Badge variant="outline">{detail.moneda}</Badge>}
                  {(detail.proyectoNombre || detail.origenCodigo) && (
                    <Badge variant="outline">Origen: {detail.proyectoNombre || detail.origenTipo} {detail.origenCodigo}</Badge>
                  )}
                  {detail.centroCostoId && <Badge variant="outline">Centro de costos asociado</Badge>}
                  {detail.emailEnviado ? (
                    <Badge className="bg-green-100 text-green-700"><MailCheck className="w-3 h-3 mr-1" /> Email enviado</Badge>
                  ) : (
                    <Badge className="bg-slate-100 text-slate-700"><Mail className="w-3 h-3 mr-1" /> Email pendiente</Badge>
                  )}
                </div>

                {detail.descripcion && <div className="text-sm text-slate-700 whitespace-pre-wrap">{detail.descripcion}</div>}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {detail.fechaEspera && <div className="min-w-0"><span className="text-xs text-slate-500">Fecha esperada:</span><div className="font-medium truncate">{detail.fechaEspera}</div></div>}
                  {detail.proveedorSugerido && <div className="min-w-0"><span className="text-xs text-slate-500">Proveedor sugerido:</span><div className="font-medium truncate" title={detail.proveedorSugerido}>{detail.proveedorSugerido}</div></div>}
                  {detail.centroCostoId && <div className="min-w-0"><span className="text-xs text-slate-500">Centro de Costos:</span><div className="font-medium">{centrosCosto.find((c) => c.id === detail.centroCostoId)?.nombre || 'Asociado'}</div></div>}
                </div>

                {detail.estado === 'Borrador' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                    <div className="text-xs text-blue-800">
                      <p className="font-bold">Esta solicitud está en borrador</p>
                      <p>Debes completar la valorización y enviarla a revisión para que inicie el flujo de aprobación.</p>
                    </div>
                  </div>
                )}

                {/* Materiales */}
                <div>
                  <Label className="text-xs">Materiales</Label>
                  <div className="border rounded-lg overflow-hidden mt-1">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50"><tr><th className="text-left p-2 text-xs">Nombre</th><th className="text-center p-2 text-xs">Cant.</th><th className="text-center p-2 text-xs">Unidad</th><th className="text-right p-2 text-xs">P. Unit.</th><th className="text-right p-2 text-xs">Total</th></tr></thead>
                      <tbody>
                        {detail.materiales && detail.materiales.length > 0 ? detail.materiales.map((m, i) => (
                          <tr key={i} className="border-t"><td className="p-2">{m.nombre}</td><td className="p-2 text-center whitespace-nowrap">{m.cantidad}</td><td className="p-2 text-center whitespace-nowrap">{m.unidad}</td><td className="p-2 text-right whitespace-nowrap">{formatMonto(m.precioEstimado, detail.moneda)}</td><td className="p-2 text-right font-mono font-semibold whitespace-nowrap">{formatMonto(m.total, detail.moneda)}</td></tr>
                        )) : (<tr><td colSpan={5} className="p-4 text-center text-slate-500 text-xs">Sin materiales</td></tr>)}
                      </tbody>
                      <tfoot><tr className="border-t bg-slate-50"><td colSpan={4} className="p-2 text-right font-semibold text-xs">Total estimado:</td><td className="p-2 text-right font-mono font-bold text-red-600 whitespace-nowrap">{formatMonto(detail.totalEstimado, detail.moneda)}</td></tr></tfoot>
                    </table>
                  </div>
                </div>

                {/* Comparativo de precios */}
                {detail.materiales && detail.materiales.some(m => m.mejorPrecio || m.mejorTienda) && (
                  <div>
                    <Label className="text-xs flex items-center gap-1"><DollarSign className="w-3 h-3" /> Comparativo de Precios por Tienda</Label>
                    <div className="border rounded-lg overflow-hidden mt-1">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-100"><tr><th className="text-left p-2">Material</th><th className="text-center p-2">Cant.</th><th className="text-right p-2">P. Estimado</th><th className="text-right p-2">Mejor Precio</th><th className="text-left p-2">Mejor Tienda</th><th className="text-right p-2">Diferencia</th><th className="text-center p-2">Ahorro</th></tr></thead>
                        <tbody>{detail.materiales.map((m, i) => {
                          const dif = m.mejorPrecio ? (m.precioEstimado - m.mejorPrecio) * m.cantidad : 0
                          const tieneMejor = m.mejorPrecio && m.mejorPrecio < m.precioEstimado
                          return (<tr key={i} className="border-t"><td className="p-2"><div className="font-medium">{m.nombre}</div>{m.mejorUrl && <a href={m.mejorUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline">Ver en tienda →</a>}</td><td className="p-2 text-center">{m.cantidad}</td><td className="p-2 text-right font-mono">{formatMonto(m.precioEstimado, detail.moneda)}</td><td className="p-2 text-right font-mono font-bold text-green-700">{m.mejorPrecio ? formatMonto(m.mejorPrecio, detail.moneda) : '–'}</td><td className="p-2">{m.mejorTienda ? <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-medium">{m.mejorTienda}</span> : '–'}</td><td className={`p-2 text-right font-mono ${tieneMejor ? 'text-green-600' : 'text-slate-400'}`}>{tieneMejor ? formatMonto(dif, detail.moneda) : '–'}</td><td className="p-2 text-center">{tieneMejor ? <span className="inline-block px-2 py-0.5 rounded bg-green-100 text-green-700 text-[10px] font-bold">✓ {((dif / (m.precioEstimado * m.cantidad)) * 100).toFixed(0)}%</span> : '–'}</td></tr>)
                        })}</tbody>
                        <tfoot className="bg-slate-100"><tr><td colSpan={5} className="p-2 text-right font-bold">Ahorro total:</td><td colSpan={2} className="p-2 text-right font-mono font-bold text-green-700">{formatMonto(detail.materiales.reduce((sum, m) => { if (!m.mejorPrecio || m.mejorPrecio >= m.precioEstimado) return sum; return sum + (m.precioEstimado - m.mejorPrecio) * m.cantidad }, 0), detail.moneda)}</td></tr></tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {detail.observaciones && <div><Label className="text-xs">Observaciones</Label><div className="text-sm text-slate-700 whitespace-pre-wrap mt-1">{detail.observaciones}</div></div>}

                {detail.links && detail.links.length > 0 && (
                  <div><Label className="text-xs">Links de Compra</Label><div className="space-y-1 mt-1">{detail.links.map((l, i) => (<a key={i} href={l} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline break-all"><ExternalLink className="w-3.5 h-3.5 shrink-0" /><span className="truncate">{l}</span></a>))}</div></div>
                )}

                {/* Información de aprobación */}
                {detail.etapaAprobacion && detail.etapaAprobacion !== 'Sin etapa' && (
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1"><History className="w-3 h-3" /> Estado de Aprobación</Label>
                    <div className="bg-slate-50 border rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2"><span className={`text-xs font-medium px-2 py-0.5 rounded-md border ${etapaColors[detail.etapaAprobacion || ''] || etapaColors['Sin etapa']}`}>{detail.etapaAprobacion}</span></div>
                      {detail.supervisorAprobadorNombre && <div className="text-xs"><span className="text-slate-500">Supervisor:</span> <span className="font-medium">{detail.supervisorAprobadorNombre}</span>{detail.supervisorFechaAprobacion && <span className="text-slate-400 ml-2">{new Date(detail.supervisorFechaAprobacion).toLocaleString('es-CL')}</span>}</div>}
                      {detail.supervisorObservaciones && <div className="text-xs text-slate-600 bg-amber-50 p-2 rounded">{detail.supervisorObservaciones}</div>}
                      {detail.adminAprobadorNombre && <div className="text-xs"><span className="text-slate-500">Administrador:</span> <span className="font-medium">{detail.adminAprobadorNombre}</span>{detail.adminFechaAprobacion && <span className="text-slate-400 ml-2">{new Date(detail.adminFechaAprobacion).toLocaleString('es-CL')}</span>}</div>}
                      {detail.adminObservaciones && <div className="text-xs text-slate-600 bg-amber-50 p-2 rounded">{detail.adminObservaciones}</div>}
                    </div>
                  </div>
                )}

                {/* Historial */}
                {loadingHistorial && <p className="text-xs text-slate-400">Cargando historial...</p>}
                {historial && historial.length > 0 && (
                  <div>
                    <Label className="text-xs flex items-center gap-1"><History className="w-3 h-3" /> Historial de Aprobación</Label>
                    <div className="border rounded-lg overflow-hidden mt-1">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50"><tr><th className="text-left p-2">Fecha</th><th className="text-left p-2">Acción</th><th className="text-left p-2">Aprobador</th><th className="text-left p-2">Observaciones</th></tr></thead>
                        <tbody>{historial.map((h: any, i: number) => (
                          <tr key={i} className="border-t"><td className="p-2 text-slate-500 whitespace-nowrap">{new Date(h.fechaAccion).toLocaleString('es-CL')}</td><td className="p-2"><Badge className={h.accion.includes('aprobar') || h.accion === 'submit' ? 'bg-green-100 text-green-700' : h.accion.includes('devolver') ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}>{h.accion.replace(/_/g, ' ')}</Badge></td><td className="p-2 font-medium">{h.aprobadorNombre || '—'}</td><td className="p-2 text-slate-600 max-w-[200px] truncate" title={h.observaciones || ''}>{h.observaciones || '—'}</td></tr>
                        ))}</tbody>
                      </table>
                    </div>
                  </div>
                )}

                {detail.emailEnviado && detail.emailFechaEnvio && <div className="text-xs text-slate-500">Último email enviado a <span className="font-mono">{detail.emailEnviadoA}</span> el {new Date(detail.emailFechaEnvio).toLocaleString('es-CL')}</div>}
              </div>

              <DialogFooter className="gap-2">
                {detail.estado === 'Borrador' && (detail.solicitadoPorId === user?.id || isAdmin()) && (
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white" disabled={submitting} onClick={() => { void handleSubmitToReview(detail); setDetailOpen(false) }}>
                    {submitting ? 'Enviando...' : <><Send className="w-4 h-4 mr-1" /> Enviar a Revisión</>}
                  </Button>
                )}
                <Button variant="outline" onClick={() => window.open(`/api/solicitudes-compra/${detail.id}/pdf`, '_blank')}><FileText className="w-4 h-4 mr-1" /> PDF</Button>
                <Button variant="outline" onClick={() => void handleResendEmail(detail)} disabled={sendingEmailId === detail.id}>
                  {sendingEmailId === detail.id ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Mail className="w-4 h-4 mr-1" />} Reenviar Email
                </Button>
                <Button variant="outline" onClick={() => { setDetailOpen(false); openEdit(detail) }}><Pencil className="w-4 h-4 mr-1" /> Editar</Button>
                <Button onClick={() => setDetailOpen(false)}>Cerrar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== APPROVAL DIALOG ===== */}
      <Dialog open={aprobDialogOpen} onOpenChange={(open) => {
        if (!aprobLoading) { setAprobDialogOpen(open); if (!open) { setAprobTarget(null); setAprobAccion(null); setAprobObservaciones('') } }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {aprobAccion && aprobAccion.includes('aprobar') ? <CheckCircle className="w-5 h-5 text-green-600" /> : aprobAccion && aprobAccion.includes('devolver') ? <RotateCcw className="w-5 h-5 text-amber-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
              {aprobAccion === 'aprobar_supervisor' && 'Aprobar Solicitud (Supervisor)'}
              {aprobAccion === 'rechazar_supervisor' && 'Rechazar Solicitud (Supervisor)'}
              {aprobAccion === 'devolver_supervisor' && 'Devolver Solicitud (Supervisor)'}
              {aprobAccion === 'aprobar_admin' && 'Aprobar y Gestionar Compra (Admin)'}
              {aprobAccion === 'rechazar_admin' && 'Rechazar Solicitud (Admin)'}
              {aprobAccion === 'devolver_admin' && 'Devolver Solicitud (Admin)'}
            </DialogTitle>
            <DialogDescription>{aprobTarget && (<>Solicitud <strong>{aprobTarget.codigo}</strong> — {aprobTarget.titulo}<br />Solicitado por: <strong>{aprobTarget.solicitadoPor || '—'}</strong></>)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {aprobAccion && aprobAccion.includes('aprobar') && <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800">{aprobAccion === 'aprobar_supervisor' ? <>Al aprobar, la solicitud pasará al <strong>administrador</strong> para que gestione la compra.</> : <>Al aprobar, la solicitud quedará <strong>lista para gestionar la compra</strong> y su estado pasará a "En Proceso".</>}</div>}
            {aprobAccion && aprobAccion.includes('devolver') && <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">Al devolver, la solicitud vuelve a estado <strong>"Borrador"</strong> para que el solicitante corrija y reenvíe.</div>}
            {aprobAccion && aprobAccion.includes('rechazar') && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800">Al rechazar, la solicitud pasará a estado <strong>"Rechazada"</strong> y no se podrá continuar.</div>}
            <div className="space-y-2">
              <Label className="text-xs">{aprobAccion && aprobAccion.includes('devolver') ? 'Correcciones necesarias *' : aprobAccion && aprobAccion.includes('rechazar') ? 'Motivo del rechazo *' : 'Observaciones (opcional)'}</Label>
              <Textarea value={aprobObservaciones} onChange={(e) => setAprobObservaciones(e.target.value)} placeholder={aprobAccion && aprobAccion.includes('devolver') ? 'Indica las correcciones...' : aprobAccion && aprobAccion.includes('rechazar') ? 'Indica el motivo del rechazo...' : 'Comentarios adicionales...'} rows={3} disabled={aprobLoading} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAprobDialogOpen(false)} disabled={aprobLoading}>Cancelar</Button>
            <Button onClick={handleAprobSubmit} disabled={aprobLoading || ((aprobAccion?.includes('rechazar') || aprobAccion?.includes('devolver')) && !aprobObservaciones.trim())} className={aprobAccion && aprobAccion.includes('aprobar') ? 'bg-green-700 hover:bg-green-800 text-white' : aprobAccion && aprobAccion.includes('devolver') ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}>
              {aprobLoading ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Procesando...</> : aprobAccion && aprobAccion.includes('aprobar') ? <><CheckCircle className="w-4 h-4 mr-2" /> Confirmar</> : aprobAccion && aprobAccion.includes('devolver') ? <><RotateCcw className="w-4 h-4 mr-2" /> Devolver</> : <><XCircle className="w-4 h-4 mr-2" /> Rechazar</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
