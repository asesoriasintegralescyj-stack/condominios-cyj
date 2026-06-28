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
} from 'lucide-react'

interface MaterialSolicitud {
  nombre: string
  cantidad: number
  unidad: string
  precioEstimado: number
  total: number
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
  emailEnviado: boolean
  emailEnviadoA: string | null
  emailFechaEnvio: string | null
  createdAt: string
  updatedAt: string
}

const ESTADOS = ['Solicitado', 'En Proceso', 'Comprado', 'Rechazado', 'Anulada'] as const
const PRIORIDADES = ['Baja', 'Media', 'Alta', 'Urgente'] as const
const UNIDADES = ['unidad', 'metro', 'm²', 'm³', 'kilo', 'saco', 'litro', 'galón', 'caja', 'bolsa', 'rollo', 'tubo']

const estadoColors: Record<string, string> = {
  Solicitado: 'bg-blue-100 text-blue-700',
  'En Proceso': 'bg-yellow-100 text-yellow-700',
  Comprado: 'bg-green-100 text-green-700',
  Rechazado: 'bg-red-100 text-red-700',
  Anulada: 'bg-slate-200 text-slate-700',
}

const prioridadColors: Record<string, string> = {
  Baja: 'bg-green-100 text-green-700',
  Media: 'bg-yellow-100 text-yellow-700',
  Alta: 'bg-orange-100 text-orange-700',
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
  const [solicitudes, setSolicitudes] = useState<SolicitudCompra[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('all')
  const [filterPrioridad, setFilterPrioridad] = useState('all')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<SolicitudCompra | null>(null)
  const [formData, setFormData] = useState({ ...emptyForm })
  const [materiales, setMateriales] = useState<MaterialSolicitud[]>([])
  const [saving, setSaving] = useState(false)

  const [detailOpen, setDetailOpen] = useState(false)
  const [detail, setDetail] = useState<SolicitudCompra | null>(null)
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null)

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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-500">Total</div>
            <div className="text-2xl font-bold text-[#0f2040]">{stats.total}</div>
            <div className="text-[10px] text-slate-400 mt-1">{formatCLP(stats.montoTotal)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-500">Solicitadas</div>
            <div className="text-2xl font-bold text-blue-600">{stats.solicitadas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-500">En Proceso</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.enProceso}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-500">Compradas</div>
            <div className="text-2xl font-bold text-green-600">{stats.completadas}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-slate-500">Monto Total</div>
            <div className="text-lg font-bold text-[#0f2040]">{formatCLP(stats.montoTotal)}</div>
          </CardContent>
        </Card>
      </div>

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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Código</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Título</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Estado</th>
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
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      Cargando...
                    </td>
                  </tr>
                ) : solicitudes.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No hay solicitudes de compra. Crea la primera con &quot;Nueva Solicitud&quot;.
                    </td>
                  </tr>
                ) : (
                  solicitudes.map((s) => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="p-3 font-mono text-xs font-semibold">{s.codigo}</td>
                      <td className="p-3">
                        <div className="font-medium">{s.titulo}</div>
                        {s.origenCodigo && (
                          <div className="text-[10px] text-slate-500">
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
                        <Badge className={prioridadColors[s.prioridad] || 'bg-slate-100'}>
                          {s.prioridad}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-mono font-semibold">
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
                        <div className="flex justify-center gap-1">
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
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="titulo">Título *</Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Ej: Compra de pintura para OT-1024"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Textarea
                rows={2}
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Detalle del motivo de la compra..."
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label>Prioridad</Label>
                <Select
                  value={formData.prioridad}
                  onValueChange={(v) => setFormData({ ...formData, prioridad: v })}
                >
                  <SelectTrigger>
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
                <div className="space-y-1.5">
                  <Label>Estado</Label>
                  <Select
                    value={formData.estado}
                    onValueChange={(v) => setFormData({ ...formData, estado: v })}
                  >
                    <SelectTrigger>
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
              <div className="space-y-1.5">
                <Label>Fecha esperada</Label>
                <Input
                  type="date"
                  value={formData.fechaEspera}
                  onChange={(e) => setFormData({ ...formData, fechaEspera: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Proveedor sugerido</Label>
                <Input
                  value={formData.proveedorSugerido}
                  onChange={(e) =>
                    setFormData({ ...formData, proveedorSugerido: e.target.value })
                  }
                  placeholder="Ej: Sodimac"
                />
              </div>
            </div>

            {/* Materiales */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>Materiales ({materiales.length})</Label>
                <Button size="sm" variant="outline" onClick={addMaterial}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Agregar material
                </Button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-2 text-xs">Nombre</th>
                      <th className="text-center p-2 w-20 text-xs">Cant.</th>
                      <th className="text-center p-2 w-24 text-xs">Unidad</th>
                      <th className="text-right p-2 w-28 text-xs">P. Estimado</th>
                      <th className="text-right p-2 w-28 text-xs">Total</th>
                      <th className="p-2 w-12"></th>
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
                          <td className="p-2">
                            <Input
                              value={m.nombre}
                              onChange={(e) => updateMaterial(i, 'nombre', e.target.value)}
                              className="h-8"
                              placeholder="Nombre del material"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              value={m.cantidad}
                              onChange={(e) =>
                                updateMaterial(i, 'cantidad', parseFloat(e.target.value) || 0)
                              }
                              className="h-8 text-center"
                            />
                          </td>
                          <td className="p-2">
                            <Select
                              value={m.unidad}
                              onValueChange={(v) => updateMaterial(i, 'unidad', v)}
                            >
                              <SelectTrigger className="h-8">
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
                          <td className="p-2">
                            <Input
                              type="number"
                              value={m.precioEstimado}
                              onChange={(e) =>
                                updateMaterial(i, 'precioEstimado', parseFloat(e.target.value) || 0)
                              }
                              className="h-8 text-right"
                            />
                          </td>
                          <td className="p-2 text-right font-mono font-semibold">
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

            <div className="space-y-1.5">
              <Label>Observaciones</Label>
              <Textarea
                rows={2}
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                placeholder="Observaciones adicionales para administración..."
              />
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

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {detail.fechaEspera && (
                    <div>
                      <span className="text-xs text-slate-500">Fecha esperada:</span>
                      <div className="font-medium">{detail.fechaEspera}</div>
                    </div>
                  )}
                  {detail.proveedorSugerido && (
                    <div>
                      <span className="text-xs text-slate-500">Proveedor sugerido:</span>
                      <div className="font-medium">{detail.proveedorSugerido}</div>
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
                              <td className="p-2 text-center">{m.cantidad}</td>
                              <td className="p-2 text-center">{m.unidad}</td>
                              <td className="p-2 text-right">{formatCLP(m.precioEstimado)}</td>
                              <td className="p-2 text-right font-mono font-semibold">
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
                          <td className="p-2 text-right font-mono font-bold text-red-600">
                            {formatCLP(detail.totalEstimado)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {detail.observaciones && (
                  <div>
                    <Label className="text-xs">Observaciones</Label>
                    <div className="text-sm text-slate-700 whitespace-pre-wrap mt-1">
                      {detail.observaciones}
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
    </div>
  )
}
