'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Download,
  Upload,
  QrCode,
  ExternalLink,
  FileText,
  Settings,
} from 'lucide-react'

interface Activo {
  id: string
  nombre: string
  categoria: string
  estado: string
  ubicacion: string | null
  serie: string | null
  fechaCompra: string | null
  costoCompra: number
  valorActual: number
  descripcion: string | null
  asignadoId: string | null
  asignado: { nombre: string } | null
  // Manual
  manualNombre?: string | null
  manualTipo?: string | null
  tieneManual?: boolean
  // Mantenimiento
  fechaUltimoMantencion?: string | null
  informeMantencionNombre?: string | null
  informeMantencionTipo?: string | null
  tieneInformeMantencion?: boolean
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

const PUBLIC_ACTIVO_BASE = 'https://condominios-cyj.vercel.app'

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

const formatCLP = (n: number) =>
  '$' + new Intl.NumberFormat('es-CL').format(Math.round(n || 0))

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '–'
  try {
    const [y, m, d] = dateStr.split('-')
    return `${d}/${m}/${y}`
  } catch {
    return dateStr
  }
}

const exportToCSV = (data: Activo[]) => {
  const headers = [
    'Nombre',
    'Categoría',
    'Estado',
    'Ubicación',
    'N° Serie',
    'Fecha Compra',
    'Costo Compra',
    'Valor Actual',
    'Asignado',
    'Últ. Mant.',
    'Descripción',
  ]
  const rows = data.map((a) => [
    a.nombre,
    a.categoria,
    a.estado,
    a.ubicacion || '',
    a.serie || '',
    a.fechaCompra || '',
    a.costoCompra,
    a.valorActual,
    a.asignado?.nombre || '',
    a.fechaUltimoMantencion || '',
    a.descripcion || '',
  ])

  const csvContent =
    '\uFEFF' +
    [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `activos_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
}

const categoriaColors: Record<string, string> = {
  Equipo: 'bg-blue-100 text-blue-700',
  Herramienta: 'bg-amber-100 text-amber-700',
  Vehículo: 'bg-purple-100 text-purple-700',
  Mobiliario: 'bg-cyan-100 text-cyan-700',
  Infraestructura: 'bg-slate-100 text-slate-700',
  Tecnología: 'bg-green-100 text-green-700',
}

const estadoColors: Record<string, string> = {
  Activo: 'bg-green-100 text-green-700',
  Inactivo: 'bg-slate-100 text-slate-700',
  'En Reparación': 'bg-yellow-100 text-yellow-700',
  'Dado de Baja': 'bg-red-100 text-red-700',
}

export function ActivosModule() {
  const [activos, setActivos] = useState<Activo[]>([])
  const [personal, setPersonal] = useState<{ id: string; nombre: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAct, setEditingAct] = useState<Activo | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    categoria: 'Equipo',
    estado: 'Activo',
    ubicacion: '',
    serie: '',
    fechaCompra: '',
    costoCompra: 0,
    valorActual: 0,
    descripcion: '',
    asignadoId: 'none',
    fechaUltimoMantencion: '',
  })

  const [manual, setManual] = useState<ManualState>(emptyManual)
  const [manualDownloading, setManualDownloading] = useState(false)
  const [informeMantencion, setInformeMantencion] =
    useState<InformeMantencionState>(emptyInformeMantencion)
  const [informeDownloading, setInformeDownloading] = useState(false)

  // QR dialog
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [qrActivo, setQrActivo] = useState<Activo | null>(null)

  const fetchActivos = async (searchTerm = '') => {
    setLoading(true)
    try {
      const url = searchTerm
        ? `/api/activos?search=${encodeURIComponent(searchTerm)}`
        : '/api/activos'
      const res = await fetch(url)
      const data = await res.json()
      setActivos(data)
    } catch (error) {
      console.error('Error fetching activos:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    void (async () => {
      await fetchActivos()
    })()
    fetch('/api/personal')
      .then((res) => res.json())
      .then(setPersonal)
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => fetchActivos(search), 300)
    return () => clearTimeout(timeout)
  }, [search])

  const openDialog = (act?: Activo) => {
    if (act) {
      setEditingAct(act)
      setFormData({
        nombre: act.nombre,
        categoria: act.categoria,
        estado: act.estado,
        ubicacion: act.ubicacion || '',
        serie: act.serie || '',
        fechaCompra: act.fechaCompra || '',
        costoCompra: act.costoCompra,
        valorActual: act.valorActual,
        descripcion: act.descripcion || '',
        asignadoId: act.asignadoId || 'none',
        fechaUltimoMantencion: act.fechaUltimoMantencion || '',
      })
      // Cargar manual existente (sin base64 para no inflar el formulario)
      setManual({
        base64: null,
        nombre: act.manualNombre || null,
        tipo: act.manualTipo || null,
        removed: false,
        isNew: false,
      })
      // Cargar informe existente (sin base64)
      setInformeMantencion({
        base64: null,
        nombre: act.informeMantencionNombre || null,
        tipo: act.informeMantencionTipo || null,
        removed: false,
        isNew: false,
      })
    } else {
      setEditingAct(null)
      setFormData({
        nombre: '',
        categoria: 'Equipo',
        estado: 'Activo',
        ubicacion: '',
        serie: '',
        fechaCompra: '',
        costoCompra: 0,
        valorActual: 0,
        descripcion: '',
        asignadoId: 'none',
        fechaUltimoMantencion: '',
      })
      setManual(emptyManual)
      setInformeMantencion(emptyInformeMantencion)
    }
    setDialogOpen(true)
  }

  const openQrDialog = (act: Activo) => {
    setQrActivo(act)
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

  const handleInformeMantencionUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
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

  const handleDownloadManual = async () => {
    if (!editingAct) return
    setManualDownloading(true)
    try {
      // Si el usuario acaba de subir un manual nuevo, descargarlo directamente
      if (manual.isNew && manual.base64 && manual.nombre) {
        const blob = base64ToBlob(
          manual.base64,
          manual.tipo || 'application/pdf'
        )
        triggerDownload(blob, manual.nombre)
        setManualDownloading(false)
        return
      }
      // Si no, obtener el manual existente del backend
      const res = await fetch(`/api/activos/${editingAct.id}`, {
        headers: { 'x-incluir-manual': 'true' },
      })
      if (!res.ok) {
        alert('No se pudo descargar el manual')
        return
      }
      const data = await res.json()
      if (!data.manualBase64) {
        alert('Este activo no tiene manual adjunto')
        return
      }
      const blob = base64ToBlob(
        data.manualBase64,
        data.manualTipo || 'application/pdf'
      )
      triggerDownload(blob, data.manualNombre || 'manual.pdf')
    } catch (error) {
      console.error('Error descargando manual:', error)
      alert('Error al descargar el manual')
    } finally {
      setManualDownloading(false)
    }
  }

  const handleDownloadInforme = async () => {
    if (!editingAct) return
    setInformeDownloading(true)
    try {
      // Si el usuario acaba de subir un informe nuevo, descargarlo directamente
      if (
        informeMantencion.isNew &&
        informeMantencion.base64 &&
        informeMantencion.nombre
      ) {
        const blob = base64ToBlob(
          informeMantencion.base64,
          informeMantencion.tipo || 'application/pdf'
        )
        triggerDownload(blob, informeMantencion.nombre)
        setInformeDownloading(false)
        return
      }
      // Si no, obtener el informe existente del backend
      const res = await fetch(`/api/activos/${editingAct.id}`, {
        headers: { 'x-incluir-manual': 'true' },
      })
      if (!res.ok) {
        alert('No se pudo descargar el informe')
        return
      }
      const data = await res.json()
      if (!data.informeMantencionBase64) {
        alert('Este activo no tiene informe de mantención adjunto')
        return
      }
      const blob = base64ToBlob(
        data.informeMantencionBase64,
        data.informeMantencionTipo || 'application/pdf'
      )
      triggerDownload(
        blob,
        data.informeMantencionNombre || 'informe-mantencion.pdf'
      )
    } catch (error) {
      console.error('Error descargando informe:', error)
      alert('Error al descargar el informe')
    } finally {
      setInformeDownloading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.nombre.trim()) return
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

      const dataToSend = {
        ...formData,
        asignadoId: formData.asignadoId === 'none' ? null : formData.asignadoId,
        ...manualBody,
        ...informeBody,
      }

      if (editingAct) {
        await fetch(`/api/activos/${editingAct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend),
        })
      } else {
        await fetch('/api/activos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend),
        })
      }
      setDialogOpen(false)
      fetchActivos(search)
    } catch (error) {
      console.error('Error saving activo:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este activo?')) return
    try {
      await fetch(`/api/activos/${id}`, { method: 'DELETE' })
      fetchActivos(search)
    } catch (error) {
      console.error('Error deleting activo:', error)
    }
  }

  const handleDownloadQr = async (act: Activo) => {
    try {
      const res = await fetch(`/api/activos/${act.id}/qr`)
      if (!res.ok) {
        alert('No se pudo generar el QR')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `qr-activo-${act.serie || act.id}.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error descargando QR:', error)
      alert('Error al descargar el QR')
    }
  }

  const handleAbrirPaginaActivo = (act: Activo) => {
    window.open(`/a/${act.id}`, '_blank', 'noopener,noreferrer')
  }

  const totalValor = activos.reduce((sum, a) => sum + a.valorActual, 0)

  return (
    <div className="space-y-5">
      {/* Actions */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={() => exportToCSV(activos)}>
          <Download className="w-4 h-4 mr-1" /> Exportar
        </Button>
        <Button onClick={() => openDialog()}>
          <Plus className="w-4 h-4 mr-1" /> Nuevo
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="py-3 flex-row items-center justify-between">
          <CardTitle className="text-sm">Activos ({activos.length})</CardTitle>
          <div className="text-sm font-semibold">
            Valor Total: {formatCLP(totalValor)}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <p className="md:hidden text-xs text-slate-400 text-center py-1">← Desliza horizontalmente para ver más →</p>
          <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">
                    Nombre
                  </th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">
                    Categoría
                  </th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">
                    Estado
                  </th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">
                    Ubicación
                  </th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">
                    N° Serie
                  </th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">
                    Costo
                  </th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">
                    Valor Actual
                  </th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">
                    Asignado
                  </th>
                  <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">
                    Últ. Mant.
                  </th>
                  <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">
                    Manual
                  </th>
                  <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="p-8 text-center text-slate-400"
                    >
                      Cargando...
                    </td>
                  </tr>
                ) : activos.length === 0 ? (
                  <tr>
                    <td
                      colSpan={11}
                      className="p-8 text-center text-slate-400"
                    >
                      Sin activos
                    </td>
                  </tr>
                ) : (
                  activos.map((act) => (
                    <tr
                      key={act.id}
                      className="border-b last:border-0 hover:bg-slate-50"
                    >
                      <td
                        className="p-3 font-semibold max-w-[200px] truncate"
                        title={act.nombre}
                      >
                        {act.nombre}
                      </td>
                      <td className="p-3">
                        <Badge
                          className={
                            categoriaColors[act.categoria] || 'bg-slate-100'
                          }
                        >
                          {act.categoria}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge
                          className={
                            estadoColors[act.estado] || 'bg-slate-100'
                          }
                        >
                          {act.estado}
                        </Badge>
                      </td>
                      <td
                        className="p-3 text-xs text-slate-600 max-w-[150px] truncate"
                        title={act.ubicacion || ''}
                      >
                        {act.ubicacion || '–'}
                      </td>
                      <td className="p-3 font-mono text-xs whitespace-nowrap">
                        {act.serie || '–'}
                      </td>
                      <td className="p-3 font-mono text-xs whitespace-nowrap">
                        {formatCLP(act.costoCompra)}
                      </td>
                      <td className="p-3 font-mono text-xs whitespace-nowrap">
                        {formatCLP(act.valorActual)}
                      </td>
                      <td
                        className="p-3 text-xs max-w-[150px] truncate"
                        title={act.asignado?.nombre || ''}
                      >
                        {act.asignado?.nombre || '–'}
                      </td>
                      <td className="p-3 text-center text-xs whitespace-nowrap">
                        {act.fechaUltimoMantencion ? (
                          <span title={act.fechaUltimoMantencion}>
                            {formatDate(act.fechaUltimoMantencion)}
                          </span>
                        ) : (
                          <span className="text-slate-300">–</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {act.tieneManual ? (
                          <span
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-50 text-red-600"
                            title="Tiene manual adjunto"
                          >
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
                            onClick={() => openQrDialog(act)}
                            title="Ver QR"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => openDialog(act)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(act.id)}
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

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAct ? 'Editar' : 'Nuevo'} Activo</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <Label>Nombre</Label>
                <Input
                  className="w-full"
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2 min-w-0">
                <Label>Categoría</Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(v) =>
                    setFormData({ ...formData, categoria: v })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      'Equipo',
                      'Herramienta',
                      'Vehículo',
                      'Mobiliario',
                      'Infraestructura',
                      'Tecnología',
                    ].map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <Label>Estado</Label>
                <Select
                  value={formData.estado}
                  onValueChange={(v) =>
                    setFormData({ ...formData, estado: v })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      'Activo',
                      'Inactivo',
                      'En Reparación',
                      'Dado de Baja',
                    ].map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 min-w-0">
                <Label>Ubicación</Label>
                <Input
                  className="w-full"
                  value={formData.ubicacion}
                  onChange={(e) =>
                    setFormData({ ...formData, ubicacion: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <Label>N° Serie</Label>
                <Input
                  className="w-full"
                  value={formData.serie}
                  onChange={(e) =>
                    setFormData({ ...formData, serie: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2 min-w-0">
                <Label>Fecha Compra</Label>
                <Input
                  className="w-full"
                  type="date"
                  value={formData.fechaCompra}
                  onChange={(e) =>
                    setFormData({ ...formData, fechaCompra: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <Label>Costo Compra ($)</Label>
                <Input
                  className="w-full text-right"
                  type="number"
                  value={formData.costoCompra}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      costoCompra: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2 min-w-0">
                <Label>Valor Actual ($)</Label>
                <Input
                  className="w-full text-right"
                  type="number"
                  value={formData.valorActual}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      valorActual: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-2 min-w-0">
              <Label>Asignado a</Label>
              <Select
                value={formData.asignadoId}
                onValueChange={(v) =>
                  setFormData({ ...formData, asignadoId: v })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {personal.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 min-w-0">
              <Label>Descripción</Label>
              <Textarea
                className="w-full"
                value={formData.descripcion}
                onChange={(e) =>
                  setFormData({ ...formData, descripcion: e.target.value })
                }
              />
            </div>

            {/* Mantenimiento */}
            <div className="space-y-3 border-t pt-4">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <Settings className="w-4 h-4 text-[#0f2040]" />
                Mantenimiento
              </Label>
              <div className="space-y-1.5 min-w-0">
                <Label>Fecha Último Mantenimiento</Label>
                <Input
                  className="w-full"
                  type="date"
                  value={formData.fechaUltimoMantencion}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fechaUltimoMantencion: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2 min-w-0">
                <Label className="text-xs text-slate-600">
                  Informe de Mantenimiento (PDF)
                </Label>
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
                          {informeMantencion.isNew
                            ? 'Nuevo informe (se subirá al guardar)'
                            : 'Informe adjunto'}
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
                          <span>
                            <Upload className="w-3.5 h-3.5 mr-1" /> Reemplazar
                          </span>
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
                    <div className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-slate-300 rounded-lg hover:border-[#0f2040] hover:bg-slate-50 transition-colors">
                      <Upload className="w-6 h-6 text-slate-400" />
                      <p className="text-sm text-slate-600">
                        <span className="text-[#0f2040] font-semibold">
                          Haz clic para subir
                        </span>{' '}
                        un PDF
                      </p>
                      <p className="text-xs text-slate-400">
                        Solo archivos PDF · máx. ~5 MB recomendado
                      </p>
                    </div>
                  </label>
                )}
              </div>
            </div>

            {/* Manual de Usuario */}
            <div className="space-y-2 border-t pt-4 min-w-0">
              <Label className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="w-4 h-4 text-[#0f2040]" />
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
                        {manual.isNew
                          ? 'Nuevo manual (se subirá al guardar)'
                          : 'Manual adjunto'}
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
                        <span>
                          <Upload className="w-3.5 h-3.5 mr-1" /> Reemplazar
                        </span>
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
                  <div className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-slate-300 rounded-lg hover:border-[#0f2040] hover:bg-slate-50 transition-colors">
                    <Upload className="w-6 h-6 text-slate-400" />
                    <p className="text-sm text-slate-600">
                      <span className="text-[#0f2040] font-semibold">
                        Haz clic para subir
                      </span>{' '}
                      un PDF
                    </p>
                    <p className="text-xs text-slate-400">
                      Solo archivos PDF · máx. ~5 MB recomendado
                    </p>
                  </div>
                </label>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!formData.nombre || saving}>
              {saving
                ? 'Guardando...'
                : editingAct
                ? 'Guardar Cambios'
                : 'Crear Activo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-[#0f2040]" />
              Código QR del Activo
            </DialogTitle>
          </DialogHeader>
          {qrActivo && (
            <div className="space-y-4 py-2">
              <div className="text-center">
                <div className="inline-block p-4 bg-white border-2 border-slate-200 rounded-xl">
                  <img
                    src={`/api/activos/${qrActivo.id}/qr`}
                    alt={`QR de ${qrActivo.nombre}`}
                    className="w-56 h-56"
                  />
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                  Activo
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {qrActivo.nombre}
                </p>
                {qrActivo.serie && (
                  <p className="text-xs font-mono text-[#0f2040]">
                    {qrActivo.serie}
                  </p>
                )}
              </div>
              <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                  URL del QR
                </p>
                <p className="text-xs font-mono text-slate-700 break-all">
                  {PUBLIC_ACTIVO_BASE}/a/{qrActivo.id}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  className="flex-1 bg-[#0f2040] hover:bg-[#1a3060]"
                  onClick={() => handleDownloadQr(qrActivo)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar QR
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleAbrirPaginaActivo(qrActivo)}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir página
                </Button>
              </div>
            </div>
          )}
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
