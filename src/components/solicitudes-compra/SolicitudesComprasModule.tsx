'use client'

import { useEffect, useMemo, useState } from 'react'
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
  origenTipo: string | null
  origenId: string | null
  origenCodigo: string | null
  materiales: MaterialSolicitud[]
  totalEstimado: number
  solicitadoPor: string | null
  solicitadoPorId: string | null
  fechaSolicitud: string
  fechaEspera: string | null
  proveedorSugerido: string | null
  observaciones: string | null
  links?: string[]
  emailEnviado: boolean
  emailEnviadoA: string | null
  emailFechaEnvio: string | null
  // Campos del flujo de aprobación
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

const ESTADOS = ['Solicitado', 'En Proceso', 'Comprado', 'Rechazado', 'Anulada'] as const
const PRIORIDADES = ['Baja', 'Media', 'Alta', 'Urgente'] as const
const UNIDADES = ['unidad', 'metro', 'm²', 'm³', 'kilo', 'saco', 'litro', 'galón', 'caja', 'bolsa', 'rollo', 'tubo']

const estadoColors: Record<string, string> = {
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
  // Nuevas etapas
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
  Alta: 'bg-amber-100 text-amber-700',
  Urgente: 'bg-red-100 text-red-700',
}

const emptyForm = {
  titulo: '',
  descripcion: '',
  prioridad: 'Media',
  estado: 'Solicitado',
  fechaEspera: '',
  proveedorSugerido: '',
  observaciones: '',
}

export function SolicitudesComprasModule() {
  const { user, hasPermission, isAdmin } = useSession()
  // El admin SOLO interviene en la 2da etapa (aprobar_admin / gestionar compra).
  // El supervisor (rol explícito, NO admin) aprueba en la 1ra etapa.
  // Esto evita que el admin vea "Aprobar (Supervisor)" — solo ve "Gestionar" cuando le toca.
  const canAprobarSupervisor = !isAdmin() && hasPermission('solicitudescompra.aprobar_supervisor')
  const canAprobarAdmin = isAdmin() || hasPermission('solicitudescompra.aprobar_admin')
  const [solicitudes, setSolicitudes] = useState<SolicitudCompra[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('all')
  const [filterPrioridad, setFilterPrioridad] = useState('all')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<SolicitudCompra | null>(null)
  const [formData, setFormData] = useState({ ...emptyForm })
  const [materiales, setMateriales] = useState<MaterialSolicitud[]>([])
  const [links, setLinks] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detail, setDetail] = useState<SolicitudCompra | null>(null)
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null)

  // Diálogo de aprobación/rechazo
  const [aprobDialogOpen, setAprobDialogOpen] = useState(false)
  const [aprobTarget, setAprobTarget] = useState<SolicitudCompra | null>(null)
  const [aprobAccion, setAprobAccion] = useState<'aprobar_supervisor' | 'rechazar_supervisor' | 'aprobar_admin' | 'rechazar_admin' | null>(null)
  const [aprobObservaciones, setAprobObservaciones] = useState('')
  const [aprobLoading, setAprobLoading] = useState(false)

  const openAprobDialog = (s: SolicitudCompra, accion: 'aprobar_supervisor' | 'rechazar_supervisor' | 'aprobar_admin' | 'rechazar_admin') => {
    setAprobTarget(s)
    setAprobAccion(accion)
    setAprobObservaciones('')
    setAprobDialogOpen(true)
  }

  const handleAprobSubmit = async () => {
    if (!aprobTarget || !aprobAccion) return
    // Para rechazos, las observaciones son obligatorias
    if (aprobAccion.includes('rechazar') && !aprobObservaciones.trim()) {
      toast.error('Debe ingresar el motivo del rechazo')
      return
    }
    setAprobLoading(true)
    try {
      const res = await fetch(`/api/solicitudes-compra/${aprobTarget.id}/aprobar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: aprobAccion,
          observaciones: aprobObservaciones.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Error al procesar la aprobación')
        return
      }
      toast.success(data.message || 'Acción procesada correctamente')
      setAprobDialogOpen(false)
      setAprobTarget(null)
      setAprobAccion(null)
      setAprobObservaciones('')
      fetchSolicitudes()
    } catch (e) {
      console.error('Error aprobación:', e)
      toast.error('Error de conexión')
    } finally {
      setAprobLoading(false)
    }
  }

  const fetchSolicitudes = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterEstado !== 'all') params.set('estado', filterEstado)
      if (filterPrioridad !== 'all') params.set('prioridad', filterPrioridad)
      const url = `/api/solicitudes-compra${params.toString() ? `?${params.toString()}` : ''}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Error al cargar')
      const data = await res.json()
      setSolicitudes(data)
    } catch (error) {
      console.error(error)
      toast.error('Error al cargar solicitudes de compra')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchSolicitudes()
    // Auto-refresh cada 60 segundos
    const interval = setInterval(() => {
      void fetchSolicitudes()
    }, 300000) // 5 min (optimizado BD)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      void fetchSolicitudes()
    }, 300)
    return () => clearTimeout(t)
  }, [search, filterEstado, filterPrioridad])

  const stats = useMemo(() => {
    const total = solicitudes.length
    const solicitadas = solicitudes.filter((s) => s.estado === 'Solicitado').length
    const enProceso = solicitudes.filter((s) => s.estado === 'En Proceso').length
    const completadas = solicitudes.filter((s) => s.estado === 'Comprado').length
    const montoTotal = solicitudes.reduce((acc, s) => acc + (s.totalEstimado || 0), 0)
    return { total, solicitadas, enProceso, completadas, montoTotal }
  }, [solicitudes])

  const openCreate = () => {
    setEditing(null)
    setFormData({ ...emptyForm })
    setMateriales([
      { nombre: '', cantidad: 1, unidad: 'unidad', precioEstimado: 0, total: 0 },
    ])
    setLinks([])
    setDialogOpen(true)
  }

  const openEdit = (s: SolicitudCompra) => {
    setEditing(s)
    setFormData({
      titulo: s.titulo,
      descripcion: s.descripcion || '',
      prioridad: s.prioridad,
      estado: s.estado,
      fechaEspera: s.fechaEspera || '',
      proveedorSugerido: s.proveedorSugerido || '',
      observaciones: s.observaciones || '',
    })
    setMateriales(
      s.materiales && s.materiales.length > 0
        ? s.materiales.map((m) => ({ ...m }))
        : [{ nombre: '', cantidad: 1, unidad: 'unidad', precioEstimado: 0, total: 0 }]
    )
    setLinks(Array.isArray(s.links) ? s.links.map((l) => String(l || '')) : [])
    setDialogOpen(true)
  }

  const openDetail = (s: SolicitudCompra) => {
    setDetail(s)
    setDetailOpen(true)
  }

  const addMaterial = () => {
    setMateriales([
      ...materiales,
      { nombre: '', cantidad: 1, unidad: 'unidad', precioEstimado: 0, total: 0 },
    ])
  }

  const updateMaterial = (index: number, field: keyof MaterialSolicitud, value: any) => {
    const next = [...materiales]
    next[index] = { ...next[index], [field]: value }
    if (field === 'cantidad' || field === 'precioEstimado') {
      next[index].total =
        (Number(next[index].cantidad) || 0) * (Number(next[index].precioEstimado) || 0)
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

  const totalEstimado = useMemo(
    () => materiales.reduce((acc, m) => acc + (Number(m.total) || 0), 0),
    [materiales]
  )

  const handleSave = async () => {
    if (!formData.titulo.trim()) {
      toast.error('El título es obligatorio')
      return
    }
    const cleanMateriales = materiales
      .filter((m) => m.nombre && m.nombre.trim() !== '')
      .map((m) => ({
        nombre: m.nombre.trim(),
        cantidad: Number(m.cantidad) || 0,
        unidad: m.unidad || 'unidad',
        precioEstimado: Number(m.precioEstimado) || 0,
        total: Number(m.total) || 0,
      }))

    const payload = {
      ...formData,
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
        throw new Error(data?.error || 'Error al guardar')
      }
      if (editing) {
        toast.success(`Solicitud ${editing.codigo} actualizada`)
      } else {
        const emailMsg = data?.emailSkipped
          ? ' (email no enviado: SMTP no configurado)'
          : data?.emailEnviado
            ? ' y email enviado'
            : ''
        toast.success(`Solicitud ${data.codigo} creada${emailMsg}`)
      }
      setDialogOpen(false)
      void fetchSolicitudes()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
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
      const res = await fetch(`/api/solicitudes-compra/${s.id}/enviar-email`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Error al enviar email')
      }
      if (data?.skipped) {
        toast.warning('SMTP no configurado. El email no se pudo enviar.')
      } else {
        toast.success(`Email reenviado a administracionlagunanorte@gmail.com`)
      }
      void fetchSolicitudes()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Error al enviar email')
    } finally {
      setSendingEmailId(null)
    }
  }

  const exportToCSV = () => {
    const headers = [
      'Código',
      'Título',
      'Estado',
      'Prioridad',
      'Origen',
      'Total Estimado',
      'Solicitado por',
      'Fecha Solicitud',
      'Fecha Esperada',
      'Proveedor Sugerido',
      'Email Enviado',
      'Materiales',
    ]
    const rows = solicitudes.map((s) => [
      s.codigo,
      `"${(s.titulo || '').replace(/"/g, '""')}"`,
      s.estado,
      s.prioridad,
      s.origenCodigo || s.origenTipo || '',
      String(s.totalEstimado || 0),
      `"${(s.solicitadoPor || '').replace(/"/g, '""')}"`,
      s.fechaSolicitud ? new Date(s.fechaSolicitud).toLocaleString() : '',
      s.fechaEspera || '',
      `"${(s.proveedorSugerido || '').replace(/"/g, '""')}"`,
      s.emailEnviado ? 'Sí' : 'No',
      `"${(s.materiales || [])
        .map((m) => `${m.cantidad} ${m.unidad} ${m.nombre}`)
        .join(' | ')
        .replace(/"/g, '""')}"`,
    ])
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `solicitudes_compra_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <TableroIndicadores
        columnas={5}
        cards={[
          { titulo: 'Total', numero: stats.total, icon: <ShoppingCart className="w-5 h-5" />, color: 'primary', subtitulo: formatCLP(stats.montoTotal) },
          { titulo: 'Solicitadas', numero: stats.solicitadas, icon: <Clock className="w-5 h-5" />, color: 'naranja' },
          { titulo: 'En Proceso', numero: stats.enProceso, icon: <AlertTriangle className="w-5 h-5" />, color: 'azul' },
          { titulo: 'Compradas', numero: stats.completadas, icon: <CheckCircle className="w-5 h-5" />, color: 'verde' },
          { titulo: 'Monto Total', numero: formatCLP(stats.montoTotal), icon: <DollarSign className="w-5 h-5" />, color: 'gris' },
        ]}
      />

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por código, título..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {ESTADOS.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPrioridad} onValueChange={setFilterPrioridad}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Prioridad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las prioridades</SelectItem>
            {PRIORIDADES.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => void fetchSolicitudes()}>
          <RefreshCw className="w-4 h-4 mr-1" /> Refrescar
        </Button>
        <Button variant="outline" onClick={exportToCSV}>
          <Download className="w-4 h-4 mr-1" /> Exportar CSV
        </Button>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" /> Nueva Solicitud
        </Button>
      </div>

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
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Fecha</th>
                  <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Email</th>
                  <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      Cargando...
                    </td>
                  </tr>
                ) : solicitudes.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      No hay solicitudes de compra. Crea la primera con &quot;Nueva Solicitud&quot;.
                    </td>
                  </tr>
                ) : (
                  solicitudes.map((s) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="p-3 font-mono text-xs font-semibold whitespace-nowrap">{s.codigo}</td>
                      <td className="p-3 max-w-[260px]">
                        <div className="font-medium truncate" title={s.titulo}>{s.titulo}</div>
                        {s.origenCodigo && (
                          <div className="text-[10px] text-slate-500 truncate">
                            Origen: {s.origenTipo} {s.origenCodigo}
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge className={estadoColors[s.estado] || 'bg-slate-100'}>
                          {s.estado}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <select
                          value={(() => {
                            const etapa = s.etapaAprobacion || 'Sin etapa'
                            // Mapear etapas viejas a nuevas
                            if (etapa === 'Pendiente Supervisor') return 'Presupuesto'
                            if (etapa === 'Aprobada Supervisor') return 'Coordinación con Proveedor'
                            if (etapa === 'Aprobada Admin') return 'Completado'
                            if (etapa && etapa.startsWith('Rechazada')) return 'Sin etapa'
                            return ETAPAS_SELECT.includes(etapa) ? etapa : 'Sin etapa'
                          })()}
                          onChange={async (e) => {
                            const nuevaEtapa = e.target.value
                            try {
                              const res = await fetch(`/api/solicitudes-compra/${s.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ etapaAprobacion: nuevaEtapa }),
                              })
                              if (res.ok) {
                                toast.success(`Etapa cambiada a: ${nuevaEtapa}`)
                                fetchSolicitudes()
                              } else {
                                toast.error('Error al cambiar etapa')
                              }
                            } catch (err) {
                              toast.error('Error de conexión')
                            }
                          }}
                          className={`text-[10px] font-medium rounded-md border px-1.5 py-1 cursor-pointer ${etapaColors[s.etapaAprobacion || ''] || etapaColors['Sin etapa']}`}
                        >
                          {ETAPAS_SELECT.map(etapa => (
                            <option key={etapa} value={etapa}>{etapa}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3">
                        <Badge className={prioridadColors[s.prioridad] || 'bg-slate-100'}>
                          {s.prioridad}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-mono font-semibold whitespace-nowrap">
                        {formatCLP(s.totalEstimado)}
                      </td>
                      <td className="p-3 text-xs text-slate-600">
                        {s.fechaSolicitud
                          ? new Date(s.fechaSolicitud).toLocaleDateString('es-CL')
                          : '–'}
                      </td>
                      <td className="p-3 text-center">
                        {s.emailEnviado ? (
                          <span
                            className="inline-flex items-center gap-1 text-green-600 text-xs"
                            title={
                              s.emailFechaEnvio
                                ? `Enviado el ${new Date(s.emailFechaEnvio).toLocaleString('es-CL')}`
                                : 'Enviado'
                            }
                          >
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
                          {/* Botones de aprobación según etapa y rol */}
                          {s.etapaAprobacion === 'Pendiente Supervisor' && canAprobarSupervisor && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs border-green-300 text-green-700 hover:bg-green-50"
                                title="Aprobar (Supervisor)"
                                onClick={() => openAprobDialog(s, 'aprobar_supervisor')}
                              >
                                <CheckCircle className="w-3 h-3 mr-1" /> Aprobar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs border-red-300 text-red-700 hover:bg-red-50"
                                title="Rechazar (Supervisor)"
                                onClick={() => openAprobDialog(s, 'rechazar_supervisor')}
                              >
                                <XCircle className="w-3 h-3 mr-1" /> Rechazar
                              </Button>
                            </>
                          )}
                          {s.etapaAprobacion === 'Aprobada Supervisor' && canAprobarAdmin && (
                            <>
                              <Button
                                size="sm"
                                className="h-7 px-2 text-xs bg-green-700 hover:bg-green-800 text-white"
                                title="Aprobar y gestionar compra (Admin)"
                                onClick={() => openAprobDialog(s, 'aprobar_admin')}
                              >
                                <CheckCircle className="w-3 h-3 mr-1" /> Gestionar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs border-red-300 text-red-700 hover:bg-red-50"
                                title="Rechazar (Admin)"
                                onClick={() => openAprobDialog(s, 'rechazar_admin')}
                              >
                                <XCircle className="w-3 h-3 mr-1" /> Rechazar
                              </Button>
                            </>
                          )}
                          {s.etapaAprobacion && s.etapaAprobacion.startsWith('Rechazada') && (
                            <span className="text-[10px] text-red-600 italic">Rechazada</span>
                          )}
                          {s.etapaAprobacion === 'Aprobada Admin' && (
                            <span className="text-[10px] text-green-700 italic">Aprobada</span>
                          )}
                          {/* Acciones estándar */}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            aria-label="Ver detalle"
                            onClick={() => openDetail(s)}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            aria-label="Reenviar email"
                            disabled={sendingEmailId === s.id}
                            onClick={() => void handleResendEmail(s)}
                            title="Reenviar email a administracionlagunanorte@gmail.com"
                          >
                            {sendingEmailId === s.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Mail className="w-3.5 h-3.5" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            aria-label="Editar"
                            onClick={() => openEdit(s)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-600 hover:text-red-700"
                            aria-label="Eliminar"
                            onClick={() => void handleDelete(s)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
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
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Editar Solicitud ${editing.codigo}` : 'Nueva Solicitud de Compra'}
            </DialogTitle>
            <DialogDescription>
              Las solicitudes nuevas se crean en estado &quot;Solicitado&quot; y envían
              automáticamente un email desde asesoriasintegralescyj@gmail.com hacia administracionlagunanorte@gmail.com (si SMTP está
              configurado).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Título */}
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                className="w-full"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Ej: Compra de pintura para OT-1024"
              />
            </div>

            {/* Descripción */}
            <div className="space-y-1.5 min-w-0">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                className="w-full"
                rows={3}
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Detalle del motivo de la compra..."
              />
            </div>

            {/* Prioridad / Estado / Fecha / Proveedor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5 min-w-0">
                <Label>Prioridad</Label>
                <Select
                  value={formData.prioridad}
                  onValueChange={(v) => setFormData({ ...formData, prioridad: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORIDADES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {editing && (
                <div className="space-y-1.5 min-w-0">
                  <Label>Estado</Label>
                  <Select
                    value={formData.estado}
                    onValueChange={(v) => setFormData({ ...formData, estado: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS.map((e) => (
                        <SelectItem key={e} value={e}>
                          {e}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="fechaEspera">Fecha esperada</Label>
                <Input
                  id="fechaEspera"
                  className="w-full"
                  type="date"
                  value={formData.fechaEspera}
                  onChange={(e) => setFormData({ ...formData, fechaEspera: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="proveedorSugerido">Proveedor sugerido</Label>
                <Input
                  id="proveedorSugerido"
                  className="w-full"
                  value={formData.proveedorSugerido}
                  onChange={(e) =>
                    setFormData({ ...formData, proveedorSugerido: e.target.value })
                  }
                  placeholder="Ej: Sodimac"
                />
              </div>
            </div>

            {/* Materiales */}
            <div className="space-y-2 min-w-0">
              <div className="flex justify-between items-center">
                <Label>Materiales ({materiales.length})</Label>
                <Button size="sm" variant="outline" onClick={addMaterial}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Agregar material
                </Button>
              </div>
              <div className="border rounded-lg overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-2 text-xs" style={{ width: '40%' }}>Nombre</th>
                      <th className="text-center p-2 text-xs" style={{ width: '10%' }}>Cant.</th>
                      <th className="text-center p-2 text-xs" style={{ width: '10%' }}>Unidad</th>
                      <th className="text-right p-2 text-xs" style={{ width: '15%' }}>P. Estimado</th>
                      <th className="text-right p-2 text-xs" style={{ width: '15%' }}>Total</th>
                      <th className="p-2" style={{ width: '10%' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {materiales.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-slate-500 text-xs">
                          Sin materiales. Agrega al menos uno.
                        </td>
                      </tr>
                    ) : (
                      materiales.map((m, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2 min-w-0">
                            <Input
                              value={m.nombre}
                              onChange={(e) => updateMaterial(i, 'nombre', e.target.value)}
                              className="h-9 w-full"
                              placeholder="Nombre del material"
                            />
                          </td>
                          <td className="p-2 min-w-0">
                            <Input
                              type="number"
                              value={m.cantidad}
                              onChange={(e) =>
                                updateMaterial(i, 'cantidad', parseFloat(e.target.value) || 0)
                              }
                              className="h-9 w-full text-center"
                            />
                          </td>
                          <td className="p-2 min-w-0">
                            <Select
                              value={m.unidad}
                              onValueChange={(v) => updateMaterial(i, 'unidad', v)}
                            >
                              <SelectTrigger className="h-9 w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {UNIDADES.map((u) => (
                                  <SelectItem key={u} value={u}>
                                    {u}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-2 min-w-0">
                            <Input
                              type="number"
                              value={m.precioEstimado}
                              onChange={(e) =>
                                updateMaterial(i, 'precioEstimado', parseFloat(e.target.value) || 0)
                              }
                              className="h-9 w-full text-right"
                            />
                          </td>
                          <td className="p-2 text-right font-mono font-semibold whitespace-nowrap">
                            {formatCLP(m.total)}
                          </td>
                          <td className="p-2 text-center">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-red-600"
                              aria-label="Eliminar material"
                              onClick={() => removeMaterial(i)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {materiales.length > 0 && (
                    <tfoot>
                      <tr className="border-t bg-slate-50">
                        <td colSpan={4} className="p-2 text-right font-semibold text-xs">
                          Total estimado:
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-red-600">
                          {formatCLP(totalEstimado)}
                        </td>
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
              <Textarea
                id="observaciones"
                className="w-full"
                rows={3}
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                placeholder="Observaciones adicionales para administración..."
              />
            </div>

            {/* Links de Compra */}
            <div className="space-y-2 min-w-0">
              <div className="flex justify-between items-center">
                <Label>Links de Compra ({links.length})</Label>
                <Button size="sm" variant="outline" onClick={addLink}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Agregar link
                </Button>
              </div>
              {links.length === 0 ? (
                <p className="text-xs text-slate-500 italic">
                  Sin links de compra. Agrega URLs de productos (opcional).
                </p>
              ) : (
                <div className="space-y-2">
                  {links.map((l, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <Input
                        value={l}
                        onChange={(e) => updateLink(i, e.target.value)}
                        className="h-9 flex-1"
                        placeholder="https://..."
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-600 shrink-0"
                        aria-label="Eliminar link"
                        onClick={() => removeLink(i)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear y enviar email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Solicitud {detail.codigo} — {detail.titulo}
                </DialogTitle>
                <DialogDescription>
                  Creada el{' '}
                  {detail.fechaSolicitud
                    ? new Date(detail.fechaSolicitud).toLocaleString('es-CL')
                    : '—'}{' '}
                  {detail.solicitadoPor ? `por ${detail.solicitadoPor}` : ''}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="flex flex-wrap gap-2">
                  <Badge className={estadoColors[detail.estado] || 'bg-slate-100'}>
                    {detail.estado}
                  </Badge>
                  <Badge className={prioridadColors[detail.prioridad] || 'bg-slate-100'}>
                    Prioridad: {detail.prioridad}
                  </Badge>
                  {detail.origenCodigo && (
                    <Badge variant="outline">
                      Origen: {detail.origenTipo} {detail.origenCodigo}
                    </Badge>
                  )}
                  {detail.emailEnviado ? (
                    <Badge className="bg-green-100 text-green-700">
                      <MailCheck className="w-3 h-3 mr-1" /> Email enviado
                    </Badge>
                  ) : (
                    <Badge className="bg-slate-100 text-slate-700">
                      <Mail className="w-3 h-3 mr-1" /> Email pendiente
                    </Badge>
                  )}
                </div>

                {detail.descripcion && (
                  <div className="text-sm text-slate-700 whitespace-pre-wrap">
                    {detail.descripcion}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {detail.fechaEspera && (
                    <div className="min-w-0">
                      <span className="text-xs text-slate-500">Fecha esperada:</span>
                      <div className="font-medium truncate">{detail.fechaEspera}</div>
                    </div>
                  )}
                  {detail.proveedorSugerido && (
                    <div className="min-w-0">
                      <span className="text-xs text-slate-500">Proveedor sugerido:</span>
                      <div className="font-medium truncate" title={detail.proveedorSugerido}>{detail.proveedorSugerido}</div>
                    </div>
                  )}
                </div>

                <div>
                  <Label className="text-xs">Materiales</Label>
                  <div className="border rounded-lg overflow-hidden mt-1">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left p-2 text-xs">Nombre</th>
                          <th className="text-center p-2 text-xs">Cant.</th>
                          <th className="text-center p-2 text-xs">Unidad</th>
                          <th className="text-right p-2 text-xs">P. Estimado</th>
                          <th className="text-right p-2 text-xs">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.materiales && detail.materiales.length > 0 ? (
                          detail.materiales.map((m, i) => (
                            <tr key={i} className="border-t">
                              <td className="p-2">{m.nombre}</td>
                              <td className="p-2 text-center whitespace-nowrap">{m.cantidad}</td>
                              <td className="p-2 text-center whitespace-nowrap">{m.unidad}</td>
                              <td className="p-2 text-right whitespace-nowrap">{formatCLP(m.precioEstimado)}</td>
                              <td className="p-2 text-right font-mono font-semibold whitespace-nowrap">
                                {formatCLP(m.total)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="p-4 text-center text-slate-500 text-xs">
                              Sin materiales
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="border-t bg-slate-50">
                          <td colSpan={4} className="p-2 text-right font-semibold text-xs">
                            Total estimado:
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-red-600 whitespace-nowrap">
                            {formatCLP(detail.totalEstimado)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* ===== CUADRO COMPARATIVO DE PRECIOS POR TIENDA ===== */}
                {detail.materiales && detail.materiales.some(m => m.mejorPrecio || m.mejorTienda) && (
                  <div>
                    <Label className="text-xs flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      Comparativo de Precios por Tienda
                    </Label>
                    <div className="border rounded-lg overflow-hidden mt-1">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="text-left p-2">Material</th>
                            <th className="text-center p-2">Cant.</th>
                            <th className="text-right p-2">P. Estimado</th>
                            <th className="text-right p-2">Mejor Precio</th>
                            <th className="text-left p-2">Mejor Tienda</th>
                            <th className="text-right p-2">Diferencia</th>
                            <th className="text-center p-2">Ahorro</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.materiales.map((m, i) => {
                            const dif = m.mejorPrecio ? (m.precioEstimado - m.mejorPrecio) * m.cantidad : 0
                            const tieneMejor = m.mejorPrecio && m.mejorPrecio < m.precioEstimado
                            return (
                              <tr key={i} className="border-t">
                                <td className="p-2">
                                  <div className="font-medium">{m.nombre}</div>
                                  {m.mejorUrl && (
                                    <a href={m.mejorUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline">
                                      Ver en tienda →
                                    </a>
                                  )}
                                </td>
                                <td className="p-2 text-center">{m.cantidad}</td>
                                <td className="p-2 text-right font-mono">{formatCLP(m.precioEstimado)}</td>
                                <td className="p-2 text-right font-mono font-bold text-green-700">
                                  {m.mejorPrecio ? formatCLP(m.mejorPrecio) : '–'}
                                </td>
                                <td className="p-2">
                                  {m.mejorTienda ? (
                                    <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-medium">
                                      {m.mejorTienda}
                                    </span>
                                  ) : '–'}
                                </td>
                                <td className={`p-2 text-right font-mono ${tieneMejor ? 'text-green-600' : 'text-slate-400'}`}>
                                  {tieneMejor ? formatCLP(dif) : '–'}
                                </td>
                                <td className="p-2 text-center">
                                  {tieneMejor ? (
                                    <span className="inline-block px-2 py-0.5 rounded bg-green-100 text-green-700 text-[10px] font-bold">
                                      ✓ {((dif / (m.precioEstimado * m.cantidad)) * 100).toFixed(0)}%
                                    </span>
                                  ) : '–'}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                        <tfoot className="bg-slate-100">
                          <tr>
                            <td colSpan={5} className="p-2 text-right font-bold">
                              Ahorro total comprando en mejores tiendas:
                            </td>
                            <td colSpan={2} className="p-2 text-right font-mono font-bold text-green-700">
                              {formatCLP(
                                detail.materiales.reduce((sum, m) => {
                                  if (!m.mejorPrecio || m.mejorPrecio >= m.precioEstimado) return sum
                                  return sum + (m.precioEstimado - m.mejorPrecio) * m.cantidad
                                }, 0)
                              )}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* ===== ANÁLISIS: ¿CONVIENE COMPRAR EN UNA O VARIAS TIENDAS? ===== */}
                    {(() => {
                      const tiendasConPrecios = new Map<string, { items: number; total: number }>()
                      for (const m of detail.materiales) {
                        if (m.mejorPrecio && m.mejorTienda) {
                          const actual = tiendasConPrecios.get(m.mejorTienda) || { items: 0, total: 0 }
                          actual.items += 1
                          actual.total += m.mejorPrecio * m.cantidad
                          tiendasConPrecios.set(m.mejorTienda, actual)
                        }
                      }

                      if (tiendasConPrecios.size <= 1) return null

                      const totalMejoresPrecios = Array.from(tiendasConPrecios.values()).reduce((s, t) => s + t.total, 0)
                      const totalUnaTienda = detail.materiales.reduce((s, m) => s + (m.precioEstimado || 0) * m.cantidad, 0)
                      const tiendasArray = Array.from(tiendasConPrecios.entries()).sort((a, b) => b[1].total - a[1].total)
                      const tiendaPrincipal = tiendasArray[0]
                      const porcentajeTiendaPrincipal = (tiendaPrincipal[1].total / totalMejoresPrecios) * 100

                      return (
                        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                            <div className="text-xs">
                              <p className="font-bold text-amber-900 mb-1">
                                Análisis de Compra: ¿una tienda o varias?
                              </p>
                              <p className="text-amber-800 mb-2">
                                Los mejores precios están distribuidos en <strong>{tiendasConPrecios.size} tiendas</strong>:
                              </p>
                              <ul className="space-y-1 mb-2">
                                {tiendasArray.map(([tienda, info]) => (
                                  <li key={tienda} className="flex justify-between">
                                    <span>• {tienda}: {info.items} producto(s)</span>
                                    <span className="font-mono font-medium">{formatCLP(info.total)}</span>
                                  </li>
                                ))}
                              </ul>
                              {porcentajeTiendaPrincipal >= 70 ? (
                                <p className="text-green-700 font-medium">
                                  ✓ <strong>Recomendación: comprar todo en {tiendaPrincipal[0]}</strong> ({porcentajeTiendaPrincipal.toFixed(0)}% del total).
                                  Simplifica logística, unify envíos y probablemente califica para descuento por volumen.
                                  Pérdida por no comprar en tiendas menores: ~{formatCLP(totalUnaTienda - totalMejoresPrecios - tiendaPrincipal[1].total * 0.05)}.
                                </p>
                              ) : (
                                <p className="text-blue-700 font-medium">
                                  ⓘ <strong>Recomendación: comprar en varias tiendas</strong>.
                                  La distribución está balanceada (mayor tienda = {porcentajeTiendaPrincipal.toFixed(0)}% del total),
                                  por lo que conviene aprovechar los mejores precios individuales.
                                  Ahorro estimado vs comprar todo al precio estimado: <strong>{formatCLP(totalUnaTienda - totalMejoresPrecios)}</strong>.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}

                {detail.observaciones && (
                  <div>
                    <Label className="text-xs">Observaciones</Label>
                    <div className="text-sm text-slate-700 whitespace-pre-wrap mt-1">
                      {detail.observaciones}
                    </div>
                  </div>
                )}

                {detail.links && detail.links.length > 0 && (
                  <div>
                    <Label className="text-xs">Links de Compra</Label>
                    <div className="space-y-1 mt-1">
                      {detail.links.map((l, i) => (
                        <a
                          key={i}
                          href={l}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline break-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{l}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {detail.emailEnviado && detail.emailFechaEnvio && (
                  <div className="text-xs text-slate-500">
                    Último email enviado a{' '}
                    <span className="font-mono">{detail.emailEnviadoA}</span> el{' '}
                    {new Date(detail.emailFechaEnvio).toLocaleString('es-CL')}
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => void handleResendEmail(detail)}
                  disabled={sendingEmailId === detail.id}
                >
                  {sendingEmailId === detail.id ? (
                    <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4 mr-1" />
                  )}{' '}
                  Reenviar Email
                </Button>
                <Button variant="outline" onClick={() => openEdit(detail)}>
                  <Pencil className="w-4 h-4 mr-1" /> Editar
                </Button>
                <Button onClick={() => setDetailOpen(false)}>Cerrar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo: Aprobar / Rechazar Solicitud */}
      <Dialog open={aprobDialogOpen} onOpenChange={(open) => {
        if (!aprobLoading) {
          setAprobDialogOpen(open)
          if (!open) {
            setAprobTarget(null)
            setAprobAccion(null)
            setAprobObservaciones('')
          }
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {aprobAccion && aprobAccion.includes('aprobar') ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600" />
              )}
              {aprobAccion === 'aprobar_supervisor' && 'Aprobar Solicitud (Supervisor)'}
              {aprobAccion === 'rechazar_supervisor' && 'Rechazar Solicitud (Supervisor)'}
              {aprobAccion === 'aprobar_admin' && 'Aprobar y Gestionar Compra (Admin)'}
              {aprobAccion === 'rechazar_admin' && 'Rechazar Solicitud (Admin)'}
            </DialogTitle>
            <DialogDescription>
              {aprobTarget && (
                <>
                  Solicitud <strong>{aprobTarget.codigo}</strong> — {aprobTarget.titulo}
                  <br />
                  Solicitado por: <strong>{aprobTarget.solicitadoPor || '—'}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {aprobAccion && aprobAccion.includes('aprobar') && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800">
                {aprobAccion === 'aprobar_supervisor' ? (
                  <>Al aprobar, la solicitud pasará al <strong>administrador</strong> para que gestione la compra.</>
                ) : (
                  <>Al aprobar, la solicitud quedará <strong>lista para gestionar la compra</strong> y su estado pasará a "En Proceso".</>
                )}
              </div>
            )}
            {aprobAccion && aprobAccion.includes('rechazar') && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800">
                Al rechazar, la solicitud pasará a estado <strong>"Rechazada"</strong> y no se podrá continuar con el flujo.
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs">
                {aprobAccion && aprobAccion.includes('rechazar')
                  ? 'Motivo del rechazo *'
                  : 'Observaciones (opcional)'}
              </Label>
              <Textarea
                value={aprobObservaciones}
                onChange={(e) => setAprobObservaciones(e.target.value)}
                placeholder={aprobAccion && aprobAccion.includes('rechazar')
                  ? 'Indica el motivo del rechazo...'
                  : 'Comentarios adicionales para el solicitante...'
                }
                rows={3}
                disabled={aprobLoading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAprobDialogOpen(false)} disabled={aprobLoading}>
              Cancelar
            </Button>
            <Button
              onClick={handleAprobSubmit}
              disabled={aprobLoading || (aprobAccion?.includes('rechazar') && !aprobObservaciones.trim())}
              className={aprobAccion && aprobAccion.includes('aprobar')
                ? 'bg-green-700 hover:bg-green-800 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
              }
            >
              {aprobLoading ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Procesando...</>
              ) : aprobAccion && aprobAccion.includes('aprobar') ? (
                <><CheckCircle className="w-4 h-4 mr-2" /> Confirmar Aprobación</>
              ) : (
                <><XCircle className="w-4 h-4 mr-2" /> Confirmar Rechazo</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
