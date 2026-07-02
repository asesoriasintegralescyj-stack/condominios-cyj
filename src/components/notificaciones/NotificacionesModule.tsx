'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { toast } from 'sonner'
import { 
  Plus, 
  Bell, 
  BellRing,
  Info,
  AlertTriangle,
  AlertCircle,
  Clock,
  Trash2,
  Eye,
  Send,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface Notificacion {
  id: string
  titulo: string
  mensaje: string
  tipo: string
  categoria: string
  destino: string
  destinoId?: string
  leido: boolean
  fechaEnvio?: string
  fechaLeido?: string
  createdAt: string
}

const tipoColors: Record<string, string> = {
  'Info': 'bg-blue-100 text-blue-700',
  'Alerta': 'bg-red-100 text-red-700',
  'Urgente': 'bg-red-100 text-red-700',
  'Recordatorio': 'bg-blue-100 text-blue-700',
  'Modificación': 'bg-amber-100 text-amber-700',
  'Success': 'bg-green-100 text-green-700',
}

// Colored indicator dot (circle) shown next to each notification title.
// - Alerta / Urgente = RED
// - Modificación = YELLOW
// - Info / Recordatorio = BLUE
// - Success = GREEN
const tipoDotColors: Record<string, string> = {
  'Info': 'bg-blue-500',
  'Alerta': 'bg-red-500',
  'Urgente': 'bg-red-500',
  'Recordatorio': 'bg-blue-500',
  'Modificación': 'bg-amber-500',
  'Success': 'bg-green-500',
}

// Highlighted message box style (casilla de mensaje) per type.
const tipoBoxStyles: Record<string, string> = {
  'Info': 'border-blue-500 bg-blue-50',
  'Alerta': 'border-red-500 bg-red-50',
  'Urgente': 'border-red-500 bg-red-50',
  'Recordatorio': 'border-blue-500 bg-blue-50',
  'Modificación': 'border-amber-500 bg-amber-50',
  'Success': 'border-green-500 bg-green-50',
}

const getDotColor = (tipo: string) => tipoDotColors[tipo] || 'bg-slate-400'
const getBoxStyle = (tipo: string) => tipoBoxStyles[tipo] || 'border-slate-400 bg-slate-50'

const tipoIcons: Record<string, React.ReactNode> = {
  'Info': <Info className="w-4 h-4" />,
  'Alerta': <AlertTriangle className="w-4 h-4" />,
  'Urgente': <AlertCircle className="w-4 h-4" />,
  'Recordatorio': <Clock className="w-4 h-4" />,
  'Modificación': <BellRing className="w-4 h-4" />,
  'Success': <CheckCircle className="w-4 h-4" />,
}

export function NotificacionesModule() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detalleDialogOpen, setDetalleDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedNotificacion, setSelectedNotificacion] = useState<Notificacion | null>(null)
  const [stats, setStats] = useState({
    total: 0,
    noLeidas: 0,
    urgentes: 0,
    enviadas: 0
  })

  // Form state
  const [formData, setFormData] = useState({
    titulo: '',
    mensaje: '',
    tipo: 'Info',
    categoria: 'General',
    destino: 'Todos',
    destinoId: '',
  })

  const fetchData = async () => {
    try {
      const res = await fetch('/api/notificaciones')
      const data = await res.json()
      setNotificaciones(data.notificaciones || [])
      setStats(data.stats || stats)
    } catch (error) {
      console.error('Error fetching notificaciones:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSubmit = async () => {
    if (!formData.titulo.trim() || !formData.mensaje.trim()) {
      toast.error('Título y mensaje son obligatorios')
      return
    }
    try {
      const res = await fetch('/api/notificaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (!res.ok) throw new Error('Request failed')

      const created = await res.json()
      setDialogOpen(false)
      resetForm()
      fetchData()
      // Visual alert on creation
      toast.success(`Notificación "${created.titulo}" creada`, {
        description: `Tipo: ${created.tipo} · Destino: ${created.destino}`,
      })
    } catch (error) {
      console.error('Error saving notificacion:', error)
      toast.error('Error al crear la notificación')
    }
  }

  const handleDelete = async () => {
    if (!selectedNotificacion) return
    try {
      await fetch(`/api/notificaciones/${selectedNotificacion.id}`, { method: 'DELETE' })
      setDeleteDialogOpen(false)
      setSelectedNotificacion(null)
      fetchData()
    } catch (error) {
      console.error('Error deleting notificacion:', error)
    }
  }

  const marcarLeida = async (id: string, leido: boolean) => {
    try {
      await fetch(`/api/notificaciones/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leido })
      })
      fetchData()
      toast.success(leido ? 'Notificación marcada como leída' : 'Notificación marcada como no leída')
    } catch (error) {
      console.error('Error updating notificacion:', error)
      toast.error('Error al actualizar la notificación')
    }
  }

  const resetForm = () => {
    setFormData({
      titulo: '',
      mensaje: '',
      tipo: 'Info',
      categoria: 'General',
      destino: 'Todos',
      destinoId: '',
    })
    setSelectedNotificacion(null)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Cargando...</div>
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Total</p>
                <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <BellRing className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase">No Leídas</p>
                <p className="text-2xl font-bold text-amber-600">{stats.noLeidas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Urgentes</p>
                <p className="text-2xl font-bold text-red-600">{stats.urgentes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Send className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Enviadas</p>
                <p className="text-2xl font-bold text-green-600">{stats.enviadas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-800">Centro de Notificaciones</h2>
        <Button 
          onClick={() => { resetForm(); setDialogOpen(true); }}
          className="bg-[#0f2044] hover:bg-[#1a3155]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Notificación
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Estado</TableHead>
                <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Tipo</TableHead>
                <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Título</TableHead>
                <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Categoría</TableHead>
                <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Destino</TableHead>
                <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Fecha Envío</TableHead>
                <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notificaciones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                    No hay notificaciones registradas
                  </TableCell>
                </TableRow>
              ) : (
                notificaciones.map((notif) => (
                  <TableRow 
                    key={notif.id} 
                    className={`hover:bg-slate-50 ${!notif.leido ? 'bg-blue-50/50' : ''}`}
                  >
                    <TableCell>
                      {notif.leido ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-amber-500" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${tipoColors[notif.tipo] || 'bg-slate-100'} inline-flex`}>
                        <span className="flex items-center gap-1">
                          {tipoIcons[notif.tipo]}
                          {notif.tipo}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium max-w-[260px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          aria-label={`Indicador ${notif.tipo}`}
                          className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${getDotColor(notif.tipo)}`}
                        />
                        <span className="truncate" title={notif.titulo}>{notif.titulo}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{notif.categoria}</Badge>
                    </TableCell>
                    <TableCell>{notif.destino}</TableCell>
                    <TableCell className="text-sm text-slate-500 whitespace-nowrap">
                      {notif.fechaEnvio || 'Pendiente'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => { setSelectedNotificacion(notif); setDetalleDialogOpen(true); }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => marcarLeida(notif.id, !notif.leido)}
                        >
                          {notif.leido ? (
                            <XCircle className="w-4 h-4 text-amber-500" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => { setSelectedNotificacion(notif); setDeleteDialogOpen(true); }}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva Notificación</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2 min-w-0">
              <Label>Título</Label>
              <Input
                className="w-full"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Título de la notificación"
              />
            </div>

            <div className="space-y-2 min-w-0">
              <Label>Mensaje</Label>
              <Textarea
                className="w-full"
                value={formData.mensaje}
                onChange={(e) => setFormData({ ...formData, mensaje: e.target.value })}
                placeholder="Contenido del mensaje..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <Label>Tipo</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(v) => setFormData({ ...formData, tipo: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Info">Info</SelectItem>
                    <SelectItem value="Alerta">Alerta</SelectItem>
                    <SelectItem value="Urgente">Urgente</SelectItem>
                    <SelectItem value="Recordatorio">Recordatorio</SelectItem>
                    <SelectItem value="Modificación">Modificación</SelectItem>
                    <SelectItem value="Success">Success</SelectItem>
                  </SelectContent>
                </Select>
                {/* Live color preview for the selected type */}
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span
                    aria-label="Color del tipo seleccionado"
                    className={`inline-block w-3 h-3 rounded-full ${getDotColor(formData.tipo)}`}
                  />
                  <span>Color asociado al tipo seleccionado</span>
                </div>
              </div>

              <div className="space-y-2 min-w-0">
                <Label>Categoría</Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(v) => setFormData({ ...formData, categoria: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="OT">Orden de Trabajo</SelectItem>
                    <SelectItem value="Pago">Pago</SelectItem>
                    <SelectItem value="Reserva">Reserva</SelectItem>
                    <SelectItem value="Morosidad">Morosidad</SelectItem>
                    <SelectItem value="Emergencia">Emergencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 min-w-0">
              <Label>Destino</Label>
              <Select
                value={formData.destino}
                onValueChange={(v) => setFormData({ ...formData, destino: v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  <SelectItem value="Residentes">Solo Residentes</SelectItem>
                  <SelectItem value="Personal">Solo Personal</SelectItem>
                  <SelectItem value="Administracion">Administración</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} className="bg-[#0f2044]">
              <Send className="w-4 h-4 mr-2" />
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detalleDialogOpen} onOpenChange={setDetalleDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedNotificacion?.titulo}</DialogTitle>
          </DialogHeader>
          
          {selectedNotificacion && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span
                  aria-label={`Indicador ${selectedNotificacion.tipo}`}
                  className={`inline-block w-3 h-3 rounded-full shrink-0 ${getDotColor(selectedNotificacion.tipo)}`}
                />
                <Badge className={tipoColors[selectedNotificacion.tipo]}>
                  {selectedNotificacion.tipo}
                </Badge>
                <Badge variant="outline">{selectedNotificacion.categoria}</Badge>
              </div>

              {/* Casilla de mensaje — highlighted box with type-colored border */}
              <div className={`p-4 rounded-lg border-l-4 min-w-0 ${getBoxStyle(selectedNotificacion.tipo)}`}>
                <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">Mensaje</div>
                <p className="text-slate-800 whitespace-pre-wrap break-words font-medium">{selectedNotificacion.mensaje}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="min-w-0">
                  <p className="text-slate-500">Destino</p>
                  <p className="font-medium truncate">{selectedNotificacion.destino}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-slate-500">Fecha Envío</p>
                  <p className="font-medium truncate">{selectedNotificacion.fechaEnvio || 'Pendiente'}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-slate-500">Estado</p>
                  <Badge className={selectedNotificacion.leido ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                    {selectedNotificacion.leido ? 'Leído' : 'No leído'}
                  </Badge>
                </div>
                <div className="min-w-0">
                  <p className="text-slate-500">Fecha Lectura</p>
                  <p className="font-medium truncate">{selectedNotificacion.fechaLeido || '-'}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta notificación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
