'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Textarea } from '@/components/ui/textarea'
import { 
  Plus, Pencil, Trash2, Search, Calendar, Users, 
  Home, CheckCircle, XCircle, Clock, DollarSign, Download,
  Upload, FileText, Eye
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

interface Residente {
  id: string
  nombre: string
  apellido?: string
  unidad?: string
  telefono?: string
  email?: string
}

interface Reserva {
  id: string
  titulo: string
  espacio: string
  fecha: string
  horaInicio: string
  horaFin: string
  residente: string
  unidad: string | null
  telefono: string | null
  email: string | null
  numPersonas: number
  estado: string
  monto: number
  pagado: boolean
  comprobante: string | null
  notas: string | null
  residenteId: string | null
  residenteRel?: Residente | null
}

const formatCLP = (n: number) => 
  '$' + new Intl.NumberFormat('es-CL').format(Math.round(n || 0))

const espaciosOptions = [
  'Quincho',
  'Sala de Eventos',
  'Piscina',
  'Estacionamiento Visita',
  'Cancha Deportiva',
  'Gimnasio',
  'Sala de Reuniones',
  'Parrilla',
  'Juegos Infantiles',
  'Otro'
]

const estadoColors: Record<string, string> = {
  'Pendiente': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Confirmada': 'bg-blue-100 text-blue-700 border-blue-200',
  'Cancelada': 'bg-red-100 text-red-700 border-red-200',
  'Completada': 'bg-green-100 text-green-700 border-green-200',
}

const estadoIcons: Record<string, React.ReactNode> = {
  'Pendiente': <Clock className="w-3 h-3 mr-1" />,
  'Confirmada': <CheckCircle className="w-3 h-3 mr-1" />,
  'Cancelada': <XCircle className="w-3 h-3 mr-1" />,
  'Completada': <CheckCircle className="w-3 h-3 mr-1" />,
}

const estadosOptions = ['Pendiente', 'Confirmada', 'Cancelada', 'Completada']

const exportToCSV = (data: Reserva[]) => {
  const headers = ['Fecha', 'Espacio', 'Título', 'Residente', 'Unidad', 'Hora Inicio', 'Hora Fin', 'Personas', 'Estado', 'Monto', 'Pagado', 'Teléfono', 'Email', 'Notas']
  const rows = data.map(r => [
    r.fecha,
    r.espacio,
    r.titulo,
    r.residente,
    r.unidad || '',
    r.horaInicio,
    r.horaFin,
    r.numPersonas,
    r.estado,
    r.monto,
    r.pagado ? 'Sí' : 'No',
    r.telefono || '',
    r.email || '',
    r.notas || ''
  ])
  
  const csvContent = '\uFEFF' + [headers, ...rows].map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `reservas_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
}

export function ReservasModule() {
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [residentes, setResidentes] = useState<Residente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterEspacio, setFilterEspacio] = useState('todos')
  const [filterEstado, setFilterEstado] = useState('todos')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedReserva, setSelectedReserva] = useState<Reserva | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    titulo: '',
    espacio: 'Quincho',
    fecha: '',
    horaInicio: '09:00',
    horaFin: '18:00',
    residente: '',
    unidad: '',
    telefono: '',
    email: '',
    numPersonas: 1,
    estado: 'Pendiente',
    monto: 0,
    pagado: false,
    comprobante: '',
    notas: '',
    residenteId: '',
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewFile, setPreviewFile] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [resReservas, resResidentes] = await Promise.all([
        fetch('/api/reservas'),
        fetch('/api/residentes'),
      ])
      setReservas(await resReservas.json())
      setResidentes(await resResidentes.json())
    } catch (error) {
      console.error('Error fetching data:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    void (async () => {
      await fetchData()
    })()
  }, [])

  // Filtrar reservas
  const filteredReservas = reservas.filter(r => {
    const matchSearch = !search || 
      r.titulo.toLowerCase().includes(search.toLowerCase()) ||
      r.residente.toLowerCase().includes(search.toLowerCase()) ||
      (r.unidad && r.unidad.toLowerCase().includes(search.toLowerCase()))
    
    const matchEspacio = filterEspacio === 'todos' || r.espacio === filterEspacio
    const matchEstado = filterEstado === 'todos' || r.estado === filterEstado
    
    return matchSearch && matchEspacio && matchEstado
  })

  // Estadísticas
  const stats = {
    total: reservas.length,
    pendientes: reservas.filter(r => r.estado === 'Pendiente').length,
    confirmadas: reservas.filter(r => r.estado === 'Confirmada').length,
    completadas: reservas.filter(r => r.estado === 'Completada').length,
    canceladas: reservas.filter(r => r.estado === 'Cancelada').length,
    montoTotal: reservas.filter(r => r.pagado).reduce((sum, r) => sum + r.monto, 0),
  }

  // Próximas reservas (siguientes 7 días)
  const hoy = new Date()
  const en7Dias = new Date()
  en7Dias.setDate(en7Dias.getDate() + 7)
  
  const proximasReservas = reservas.filter(r => {
    const fechaReserva = new Date(r.fecha + 'T12:00:00')
    return fechaReserva >= hoy && fechaReserva <= en7Dias && 
           (r.estado === 'Pendiente' || r.estado === 'Confirmada')
  }).slice(0, 5)

  const openCreateDialog = () => {
    setIsEditing(false)
    setSelectedReserva(null)
    const today = new Date().toISOString().split('T')[0]
    setFormData({
      titulo: '',
      espacio: 'Quincho',
      fecha: today,
      horaInicio: '09:00',
      horaFin: '18:00',
      residente: '',
      unidad: '',
      telefono: '',
      email: '',
      numPersonas: 1,
      estado: 'Pendiente',
      monto: 0,
      pagado: false,
      comprobante: '',
      notas: '',
      residenteId: '',
    })
    setDialogOpen(true)
  }

  // Handle file selection and convert to base64
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('El archivo es demasiado grande. Máximo 5MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setFormData({ ...formData, comprobante: base64 })
    }
    reader.readAsDataURL(file)
  }

  const removeFile = () => {
    setFormData({ ...formData, comprobante: '' })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const openPreview = (base64: string) => {
    setPreviewFile(base64)
  }

  const isImage = (base64: string) => {
    return base64.includes('image/')
  }

  const isPdf = (base64: string) => {
    return base64.includes('application/pdf')
  }

  const openEditDialog = (reserva: Reserva) => {
    setIsEditing(true)
    setSelectedReserva(reserva)
    setFormData({
      titulo: reserva.titulo,
      espacio: reserva.espacio,
      fecha: reserva.fecha,
      horaInicio: reserva.horaInicio,
      horaFin: reserva.horaFin,
      residente: reserva.residente,
      unidad: reserva.unidad || '',
      telefono: reserva.telefono || '',
      email: reserva.email || '',
      numPersonas: reserva.numPersonas,
      estado: reserva.estado,
      monto: reserva.monto,
      pagado: reserva.pagado,
      comprobante: reserva.comprobante || '',
      notas: reserva.notas || '',
      residenteId: reserva.residenteId || '',
    })
    setDialogOpen(true)
  }

  const openDeleteDialog = (reserva: Reserva) => {
    setSelectedReserva(reserva)
    setDeleteDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      if (isEditing && selectedReserva) {
        await fetch(`/api/reservas/${selectedReserva.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      } else {
        await fetch('/api/reservas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      }
      setDialogOpen(false)
      fetchData()
    } catch (error) {
      console.error('Error saving reserva:', error)
    }
  }

  const handleDelete = async () => {
    if (!selectedReserva) return
    
    try {
      await fetch(`/api/reservas/${selectedReserva.id}`, {
        method: 'DELETE',
      })
      setDeleteDialogOpen(false)
      fetchData()
    } catch (error) {
      console.error('Error deleting reserva:', error)
    }
  }

  const handleResidenteSelect = (residenteId: string) => {
    const residente = residentes.find(r => r.id === residenteId)
    if (residente) {
      setFormData({
        ...formData,
        residenteId: residente.id,
        residente: `${residente.nombre} ${residente.apellido || ''}`.trim(),
        unidad: residente.unidad || '',
        telefono: residente.telefono || '',
        email: residente.email || '',
      })
    } else {
      setFormData({
        ...formData,
        residenteId: '',
      })
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00')
    return date.toLocaleDateString('es-CL', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    })
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-500" />
            <div>
              <div className="text-[10px] text-slate-500 font-semibold uppercase">Total Reservas</div>
              <div className="text-xl font-bold text-[#0f2040]">{stats.total}</div>
            </div>
          </div>
        </Card>
        <Card className="p-3 border-yellow-200 bg-yellow-50">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            <div>
              <div className="text-[10px] text-yellow-600 font-semibold uppercase">Pendientes</div>
              <div className="text-xl font-bold text-yellow-600">{stats.pendientes}</div>
            </div>
          </div>
        </Card>
        <Card className="p-3 border-blue-200 bg-blue-50">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-500" />
            <div>
              <div className="text-[10px] text-blue-600 font-semibold uppercase">Confirmadas</div>
              <div className="text-xl font-bold text-blue-600">{stats.confirmadas}</div>
            </div>
          </div>
        </Card>
        <Card className="p-3 border-green-200 bg-green-50">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <div className="text-[10px] text-green-600 font-semibold uppercase">Completadas</div>
              <div className="text-xl font-bold text-green-600">{stats.completadas}</div>
            </div>
          </div>
        </Card>
        <Card className="p-3 border-red-200 bg-red-50">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <div>
              <div className="text-[10px] text-red-600 font-semibold uppercase">Canceladas</div>
              <div className="text-xl font-bold text-red-600">{stats.canceladas}</div>
            </div>
          </div>
        </Card>
        <Card className="p-3 border-emerald-200 bg-emerald-50">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-500" />
            <div>
              <div className="text-[10px] text-emerald-600 font-semibold uppercase">Monto Pagado</div>
              <div className="text-lg font-bold text-emerald-600">{formatCLP(stats.montoTotal)}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Próximas Reservas */}
      {proximasReservas.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-600" />
              Próximas Reservas (7 días)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-3">
              {proximasReservas.map((r) => (
                <div 
                  key={r.id}
                  className="bg-white rounded-lg p-3 border border-amber-100 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-1">
                    <Badge className={estadoColors[r.estado]}>
                      {estadoIcons[r.estado]}
                      {r.estado}
                    </Badge>
                    <span className="text-xs text-slate-500">{r.espacio}</span>
                  </div>
                  <div className="font-semibold text-sm">{r.titulo}</div>
                  <div className="text-xs text-slate-600">{r.residente}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {formatDate(r.fecha)} · {r.horaInicio} - {r.horaFin}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar reserva..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterEspacio} onValueChange={setFilterEspacio}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Espacio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los espacios</SelectItem>
            {espaciosOptions.map(espacio => (
              <SelectItem key={espacio} value={espacio}>{espacio}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {estadosOptions.map(estado => (
              <SelectItem key={estado} value={estado}>{estado}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => exportToCSV(filteredReservas)}>
          <Download className="w-4 h-4 mr-2" /> Exportar
        </Button>
        <Button onClick={openCreateDialog} className="ml-auto">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Reserva
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Lista de Reservas ({filteredReservas.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Fecha</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Espacio</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Título</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Residente</th>
                  <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Horario</th>
                  <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Personas</th>
                  <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Estado</th>
                  <th className="text-right p-3 text-[10px] font-bold text-slate-500 uppercase">Monto</th>
                  <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Pagado</th>
                  <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="p-8 text-center text-slate-400">Cargando...</td></tr>
                ) : filteredReservas.length === 0 ? (
                  <tr><td colSpan={10} className="p-8 text-center text-slate-400">Sin reservas</td></tr>
                ) : (
                  filteredReservas.map((res) => (
                    <tr key={res.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="p-3">
                        <div className="font-semibold text-xs">{formatDate(res.fecha)}</div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">
                          <Home className="w-3 h-3 mr-1" />
                          {res.espacio}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold">{res.titulo}</div>
                        {res.notas && (
                          <div className="text-xs text-slate-500 truncate max-w-[150px]">{res.notas}</div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="font-semibold">{res.residente}</div>
                        {res.unidad && (
                          <div className="text-xs text-slate-500">Unidad: {res.unidad}</div>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="text-xs font-mono">
                          {res.horaInicio} - {res.horaFin}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="w-3 h-3 text-slate-400" />
                          <span className="font-semibold">{res.numPersonas}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <Badge className={estadoColors[res.estado]}>
                          {estadoIcons[res.estado]}
                          {res.estado}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-mono text-xs font-bold">
                        {formatCLP(res.monto)}
                      </td>
                      <td className="p-3 text-center">
                        {res.pagado ? (
                          <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <XCircle className="w-5 h-5 text-slate-300 mx-auto" />
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center gap-1">
                          {res.comprobante && (
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="h-7 w-7 text-blue-600 hover:text-blue-700" 
                              onClick={() => openPreview(res.comprobante || '')}
                              title="Ver comprobante"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7" 
                            onClick={() => openEditDialog(res)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7 text-red-500 hover:text-red-700" 
                            onClick={() => openDeleteDialog(res)}
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Reserva' : 'Nueva Reserva'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Espacio *</Label>
                <Select value={formData.espacio} onValueChange={(v) => setFormData({...formData, espacio: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar espacio" />
                  </SelectTrigger>
                  <SelectContent>
                    {espaciosOptions.map(espacio => (
                      <SelectItem key={espacio} value={espacio}>{espacio}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Título / Evento *</Label>
                <Input 
                  value={formData.titulo} 
                  onChange={(e) => setFormData({...formData, titulo: e.target.value})} 
                  placeholder="Ej: Cumpleaños, Reunión..."
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Fecha *</Label>
                <Input 
                  type="date" 
                  value={formData.fecha} 
                  onChange={(e) => setFormData({...formData, fecha: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Hora Inicio</Label>
                <Input 
                  type="time" 
                  value={formData.horaInicio} 
                  onChange={(e) => setFormData({...formData, horaInicio: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Hora Fin</Label>
                <Input 
                  type="time" 
                  value={formData.horaFin} 
                  onChange={(e) => setFormData({...formData, horaFin: e.target.value})} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Buscar Residente (opcional)</Label>
              <Select value={formData.residenteId} onValueChange={handleResidenteSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar residente..." />
                </SelectTrigger>
                <SelectContent>
                  {residentes.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.nombre} {r.apellido} - {r.unidad || 'Sin unidad'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre Residente *</Label>
                <Input 
                  value={formData.residente} 
                  onChange={(e) => setFormData({...formData, residente: e.target.value})} 
                  placeholder="Nombre completo"
                />
              </div>
              <div className="space-y-2">
                <Label>Unidad</Label>
                <Input 
                  value={formData.unidad} 
                  onChange={(e) => setFormData({...formData, unidad: e.target.value})} 
                  placeholder="Ej: A-101"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input 
                  value={formData.telefono} 
                  onChange={(e) => setFormData({...formData, telefono: e.target.value})} 
                  placeholder="+56 9 1234 5678"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email"
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})} 
                  placeholder="email@ejemplo.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>N° Personas</Label>
                <Input 
                  type="number" 
                  value={formData.numPersonas} 
                  onChange={(e) => setFormData({...formData, numPersonas: parseInt(e.target.value) || 1})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={formData.estado} onValueChange={(v) => setFormData({...formData, estado: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {estadosOptions.map(estado => (
                      <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Monto ($)</Label>
                <Input 
                  type="number" 
                  value={formData.monto} 
                  onChange={(e) => setFormData({...formData, monto: parseFloat(e.target.value) || 0})} 
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="pagado" 
                checked={formData.pagado} 
                onCheckedChange={(checked) => setFormData({...formData, pagado: !!checked})} 
              />
              <Label htmlFor="pagado" className="cursor-pointer">Reserva pagada</Label>
            </div>

            {/* Comprobante de pago */}
            <div className="space-y-2">
              <Label>Comprobante de Pago</Label>
              
              {formData.comprobante ? (
                <div className="border rounded-lg p-3 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isImage(formData.comprobante) ? (
                        <div className="w-16 h-16 rounded overflow-hidden border">
                          <img 
                            src={formData.comprobante} 
                            alt="Comprobante" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded border bg-red-50 flex items-center justify-center">
                          <FileText className="w-8 h-8 text-red-500" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium">Comprobante adjunto</p>
                        <p className="text-xs text-slate-500">
                          {isImage(formData.comprobante) ? 'Imagen' : 'PDF'}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon"
                        onClick={() => openPreview(formData.comprobante)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon"
                        onClick={removeFile}
                        className="text-red-500 hover:text-red-700"
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div 
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <p className="text-sm text-slate-600">Click para subir comprobante</p>
                  <p className="text-xs text-slate-400 mt-1">PDF, PNG, JPG (máx. 5MB)</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea 
                value={formData.notas} 
                onChange={(e) => setFormData({...formData, notas: e.target.value})} 
                placeholder="Observaciones adicionales..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!formData.titulo || !formData.residente || !formData.fecha}>
              {isEditing ? 'Guardar Cambios' : 'Crear Reserva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar esta reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la reserva
              {selectedReserva && <strong> {selectedReserva.titulo}</strong>} del residente {selectedReserva?.residente}.
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

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Vista previa del comprobante</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-2 bg-slate-100 rounded-lg">
            {previewFile && isImage(previewFile) && (
              <img 
                src={previewFile} 
                alt="Comprobante" 
                className="max-w-full h-auto mx-auto rounded shadow"
              />
            )}
            {previewFile && isPdf(previewFile) && (
              <iframe 
                src={previewFile} 
                className="w-full h-[70vh] rounded"
                title="PDF Preview"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewFile(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
