'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Clock, 
  CheckCircle, 
  XCircle, 
  Calendar, 
  AlertCircle,
  LogIn,
  LogOut,
  UserCheck,
  UserX,
  ClockAlert,
  FileText,
  Search,
  Download,
  Plus,
  Upload
} from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { toast } from 'sonner'

interface AsistenciaState {
  id: string
  personalId: string
  nombre: string
  cargo?: string | null
  fecha: string
  horaEntrada: string | null
  horaSalida: string | null
  estado: string
  observaciones?: string | null
  isNew?: boolean
}

const ESTADOS = [
  { value: 'Presente', label: 'Presente', icon: UserCheck, color: 'bg-green-600 hover:bg-green-700' },
  { value: 'Ausente', label: 'Ausente', icon: UserX, color: 'bg-red-600 hover:bg-red-700' },
  { value: 'Tarde', label: 'Tarde', icon: ClockAlert, color: 'bg-amber-500 hover:bg-amber-600' },
  { value: 'Permiso', label: 'Permiso', icon: FileText, color: 'bg-blue-600 hover:bg-blue-700' },
]

const exportToCSV = (data: AsistenciaState[], fechaExport: string) => {
  const headers = ['Nombre', 'Cargo', 'Fecha', 'Hora Entrada', 'Hora Salida', 'Estado', 'Observaciones']
  const rows = data.map(r => [
    r.nombre,
    r.cargo || '',
    r.fecha,
    r.horaEntrada || '',
    r.horaSalida || '',
    r.estado,
    r.observaciones || ''
  ])
  
  const csvContent = '\uFEFF' + [headers, ...rows].map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `asistencia_${fechaExport}.csv`
  link.click()
}

export function AsistenciaModule() {
  const [registros, setRegistros] = useState<AsistenciaState[]>([])
  const [personal, setPersonal] = useState<{id: string; nombre: string; cargo?: string | null}[]>([])
  const [loading, setLoading] = useState(true)
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [search, setSearch] = useState('')
  const [nuevoDialogOpen, setNuevoDialogOpen] = useState(false)
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [nuevoPersonalId, setNuevoPersonalId] = useState('')
  const [nuevoEstado, setNuevoEstado] = useState('Presente')
  const [nuevoObservaciones, setNuevoObservaciones] = useState('')
  const { currentCondominio } = useAppStore()

  const fetchAsistencia = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ fecha })
      if (currentCondominio?.id) {
        params.append('condominioId', currentCondominio.id)
      }
      const res = await fetch(`/api/asistencia?${params.toString()}`)
      const data = await res.json()
      setRegistros(data)
    } catch (error) {
      console.error('Error fetching asistencia:', error)
    } finally {
      setLoading(false)
    }
  }, [fecha, currentCondominio])

  const fetchPersonal = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (currentCondominio?.id) {
        params.append('condominioId', currentCondominio.id)
      }
      const res = await fetch(`/api/personal?${params.toString()}`)
      const data = await res.json()
      setPersonal(data)
    } catch (error) {
      console.error('Error fetching personal:', error)
    }
  }, [currentCondominio])

  useEffect(() => {
    void fetchAsistencia()
    void fetchPersonal()
  }, [fecha, currentCondominio?.id, fetchAsistencia, fetchPersonal])

  const registrarEntrada = async (personalId: string) => {
    try {
      const ahora = new Date()
      const horaActual = ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      
      const res = await fetch('/api/asistencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalId,
          fecha,
          horaEntrada: horaActual,
          estado: 'Presente'
        })
      })
      if (res.ok) {
        toast.success('Entrada registrada', {
          description: `Hora: ${horaActual}`
        })
        void fetchAsistencia()
      }
    } catch (error) {
      console.error('Error registrando entrada:', error)
      toast.error('Error al registrar entrada')
    }
  }

  const registrarSalida = async (personalId: string) => {
    try {
      const ahora = new Date()
      const horaActual = ahora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      
      const res = await fetch('/api/asistencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalId,
          fecha,
          horaSalida: horaActual,
          estado: 'Completado'
        })
      })
      if (res.ok) {
        toast.success('Salida registrada', {
          description: `Hora: ${horaActual}`
        })
        void fetchAsistencia()
      }
    } catch (error) {
      console.error('Error registrando salida:', error)
      toast.error('Error al registrar salida')
    }
  }

  const cambiarEstado = async (personalId: string, nuevoEstado: string) => {
    try {
      const res = await fetch('/api/asistencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalId,
          fecha,
          estado: nuevoEstado
        })
      })
      if (res.ok) {
        toast.success(`Estado cambiado a "${nuevoEstado}"`)
        void fetchAsistencia()
      }
    } catch (error) {
      console.error('Error changing estado:', error)
      toast.error('Error al cambiar estado')
    }
  }

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'Presente':
      case 'Completado':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'Ausente':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'Tarde':
        return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'Permiso':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'Presente':
      case 'Completado':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'Ausente':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'Tarde':
        return <ClockAlert className="w-4 h-4 text-amber-600" />
      case 'Permiso':
        return <FileText className="w-4 h-4 text-blue-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  // Filtrar registros por búsqueda
  const filteredRegistros = registros.filter(r => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      r.nombre.toLowerCase().includes(searchLower) ||
      (r.cargo && r.cargo.toLowerCase().includes(searchLower)) ||
      r.estado.toLowerCase().includes(searchLower)
    )
  })

  // Calcular estadísticas
  const stats = {
    presentes: registros.filter(r => r.estado === 'Presente' || r.estado === 'Completado').length,
    tarde: registros.filter(r => r.estado === 'Tarde').length,
    ausentes: registros.filter(r => r.estado === 'Ausente').length,
    permisos: registros.filter(r => r.estado === 'Permiso').length,
    pendientes: registros.filter(r => r.estado === 'Pendiente').length,
    total: registros.length
  }

  // Crear nuevo registro
  const handleNuevoRegistro = async () => {
    if (!nuevoPersonalId) {
      toast.error('Seleccione un personal')
      return
    }
    try {
      const res = await fetch('/api/asistencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalId: nuevoPersonalId,
          fecha,
          estado: nuevoEstado,
          observaciones: nuevoObservaciones || null
        })
      })
      if (res.ok) {
        toast.success('Registro creado')
        setNuevoDialogOpen(false)
        setNuevoPersonalId('')
        setNuevoEstado('Presente')
        setNuevoObservaciones('')
        void fetchAsistencia()
      }
    } catch (error) {
      console.error('Error creating registro:', error)
      toast.error('Error al crear registro')
    }
  }

  // Bulk upload (simulated - manual entry for now)
  const handleBulkUpload = async (personalIds: string[], estadoDefault: string) => {
    try {
      const promises = personalIds.map(personalId => 
        fetch('/api/asistencia', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personalId,
            fecha,
            estado: estadoDefault
          })
        })
      )
      await Promise.all(promises)
      toast.success(`${personalIds.length} registros creados`)
      setBulkDialogOpen(false)
      void fetchAsistencia()
    } catch (error) {
      console.error('Error bulk upload:', error)
      toast.error('Error en carga masiva')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header con selector de fecha */}
      <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Control de asistencia del personal</p>
                {currentCondominio && (
                  <p className="text-xs text-amber-600 font-medium">
                    {currentCondominio.nombre}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 font-medium">Fecha:</label>
              <Input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="w-44 border-slate-300"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por nombre, cargo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={() => exportToCSV(filteredRegistros, fecha)}>
          <Download className="w-4 h-4 mr-1" /> Exportar
        </Button>
        <Button variant="outline" onClick={() => setBulkDialogOpen(true)}>
          <Upload className="w-4 h-4 mr-1" /> Carga Masiva
        </Button>
        <Button onClick={() => setNuevoDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Nuevo Registro
        </Button>
      </div>
      
      {/* Estadísticas */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-3 text-center border-green-200 bg-green-50">
          <div className="text-2xl font-bold text-green-600">{stats.presentes}</div>
          <div className="text-[10px] text-green-700 font-medium">Presentes</div>
        </Card>
        <Card className="p-3 text-center border-amber-200 bg-amber-50">
          <div className="text-2xl font-bold text-amber-600">{stats.tarde}</div>
          <div className="text-[10px] text-amber-700 font-medium">Tarde</div>
        </Card>
        <Card className="p-3 text-center border-red-200 bg-red-50">
          <div className="text-2xl font-bold text-red-600">{stats.ausentes}</div>
          <div className="text-[10px] text-red-700 font-medium">Ausentes</div>
        </Card>
        <Card className="p-3 text-center border-blue-200 bg-blue-50">
          <div className="text-2xl font-bold text-blue-600">{stats.permisos}</div>
          <div className="text-[10px] text-blue-700 font-medium">Permiso</div>
        </Card>
        <Card className="p-3 text-center border-slate-200 bg-slate-50">
          <div className="text-2xl font-bold text-slate-600">{stats.pendientes}</div>
          <div className="text-[10px] text-slate-700 font-medium">Pendientes</div>
        </Card>
      </div>

      {/* Tabla de asistencia */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3 bg-slate-50 border-b">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            Asistencia del {new Date(fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {currentCondominio && (
              <Badge variant="outline" className="ml-2 border-amber-300 text-amber-700">
                {currentCondominio.nombre}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {registros.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <AlertCircle className="w-10 h-10 mx-auto mb-3 text-slate-400" />
              <p className="font-medium">No hay personal registrado</p>
              {!currentCondominio && (
                <p className="text-xs text-amber-600 mt-2">Seleccione un condominio para gestionar asistencia</p>
              )}
            </div>
          ) : filteredRegistros.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Search className="w-10 h-10 mx-auto mb-3 text-slate-400" />
              <p className="font-medium">No se encontraron resultados</p>
              <p className="text-xs text-slate-400 mt-1">Intente con otro término de búsqueda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left p-3 text-xs font-bold text-slate-500 uppercase">Nombre</th>
                    <th className="text-left p-3 text-xs font-bold text-slate-500 uppercase">Cargo</th>
                    <th className="text-center p-3 text-xs font-bold text-slate-500 uppercase">Entrada</th>
                    <th className="text-center p-3 text-xs font-bold text-slate-500 uppercase">Salida</th>
                    <th className="text-center p-3 text-xs font-bold text-slate-500 uppercase">Estado</th>
                    <th className="text-center p-3 text-xs font-bold text-slate-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegistros.map((reg) => (
                    <tr key={reg.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <div className="font-medium text-slate-800">{reg.nombre}</div>
                      </td>
                      <td className="p-3 text-slate-600">{reg.cargo || '–'}</td>
                      <td className="p-3 text-center">
                        {reg.horaEntrada ? (
                          <div className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-md font-mono text-xs">
                            <LogIn className="w-3 h-3" />
                            {reg.horaEntrada}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">–</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {reg.horaSalida ? (
                          <div className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-1 rounded-md font-mono text-xs">
                            <LogOut className="w-3 h-3" />
                            {reg.horaSalida}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">–</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {getEstadoIcon(reg.estado)}
                          <Badge className={`${getEstadoColor(reg.estado)} text-xs`}>
                            {reg.estado}
                          </Badge>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap justify-center gap-1.5">
                          {/* Botón Registrar Entrada */}
                          {!reg.horaEntrada && (
                            <Button 
                              size="sm" 
                              className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white shadow-sm"
                              onClick={() => registrarEntrada(reg.personalId)}
                            >
                              <LogIn className="w-3.5 h-3.5 mr-1" /> 
                              Entrada
                            </Button>
                          )}
                          
                          {/* Botón Registrar Salida */}
                          {reg.horaEntrada && !reg.horaSalida && (
                            <Button 
                              size="sm" 
                              className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                              onClick={() => registrarSalida(reg.personalId)}
                            >
                              <LogOut className="w-3.5 h-3.5 mr-1" /> 
                              Salida
                            </Button>
                          )}
                          
                          {/* Indicador de jornada completa */}
                          {reg.horaEntrada && reg.horaSalida && (
                            <Badge className="bg-green-600 text-white text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Completado
                            </Badge>
                          )}
                          
                          {/* Separador */}
                          {(reg.horaEntrada || reg.horaSalida) && (
                            <div className="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>
                          )}
                          
                          {/* Botones de Estado */}
                          {ESTADOS.map((estado) => {
                            const Icon = estado.icon
                            const isActive = reg.estado === estado.value
                            return (
                              <Button
                                key={estado.value}
                                size="sm"
                                variant={isActive ? "default" : "outline"}
                                className={`h-8 text-xs ${isActive 
                                  ? `${estado.color} text-white` 
                                  : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                                }`}
                                onClick={() => cambiarEstado(reg.personalId, estado.value)}
                                title={`Marcar como ${estado.label}`}
                              >
                                <Icon className="w-3.5 h-3.5 mr-1" />
                                {estado.label}
                              </Button>
                            )
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leyenda de estados */}
      <Card className="border-slate-200 bg-slate-50">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-600">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Presente/Completado</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span>Tarde</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>Ausente</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Permiso</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-slate-400"></div>
              <span>Pendiente</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog: Nuevo Registro */}
      <Dialog open={nuevoDialogOpen} onOpenChange={setNuevoDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Registro de Asistencia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Personal</Label>
              <Select value={nuevoPersonalId} onValueChange={setNuevoPersonalId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar personal..." />
                </SelectTrigger>
                <SelectContent>
                  {personal.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nombre} {p.cargo ? `- ${p.cargo}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={nuevoEstado} onValueChange={setNuevoEstado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Presente">Presente</SelectItem>
                  <SelectItem value="Ausente">Ausente</SelectItem>
                  <SelectItem value="Tarde">Tarde</SelectItem>
                  <SelectItem value="Permiso">Permiso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observaciones</Label>
              <Textarea
                value={nuevoObservaciones}
                onChange={(e) => setNuevoObservaciones(e.target.value)}
                placeholder="Observaciones opcionales..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNuevoDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleNuevoRegistro}>Crear Registro</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Carga Masiva */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Carga Masiva de Asistencia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Marcará todos los personal como "Presente" para la fecha seleccionada.
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-700">
              <strong>Fecha:</strong> {new Date(fecha + 'T12:00:00').toLocaleDateString('es-CL')}
            </div>
            <p className="text-xs text-slate-500">
              Total personal: {personal.length} personas
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => handleBulkUpload(personal.map(p => p.id), 'Presente')}>
              Marcar Todos Presentes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
