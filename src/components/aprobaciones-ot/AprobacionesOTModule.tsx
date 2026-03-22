'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useSession } from '@/hooks/use-session'
import { 
  Search, CheckCircle, XCircle, Clock, Eye, History,
  Wrench, Package, Users, Building2, Calendar,
  FileText, AlertTriangle
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
}

interface OTPersonalOT {
  id: string
  nombre: string
  tipo: string
  cantidad: number
  precioUnit: number
  horasTrabajadas: number
  total: number
}

interface HistorialAprobacion {
  id: string
  estadoAnterior: string | null
  estadoNuevo: string
  observaciones: string | null
  nombreAprobador: string | null
  fechaAccion: string
  createdAt: string
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
  notas: string | null
  estadoAprobacion: string | null
  fechaSolicitudAprob: string | null
  fechaAprobacion: string | null
  aprobadoPor: string | null
  observacionesAprob: string | null
  materiales: OTMaterial[]
  herramientas: OTHerramienta[]
  tareas: OTTarea[]
  personalOT: OTPersonalOT[]
  asignado: { id: string; nombre: string } | null
  propiedad: { id: string; nombre: string } | null
  historialAprobaciones: HistorialAprobacion[]
}

interface Estadisticas {
  Pendiente: number
  Aprobada: number
  Rechazada: number
}

const formatCLP = (n: number) => 
  '$' + new Intl.NumberFormat('es-CL').format(Math.round(n || 0))

const formatDate = (d: string | null) => {
  if (!d) return '–'
  try {
    const date = new Date(d)
    return date.toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return d
  }
}

const formatDateShort = (d: string | null) => {
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

const tipoColors: Record<string, string> = {
  'Correctivo': 'bg-orange-100 text-orange-700 border-orange-200',
  'Preventivo': 'bg-blue-100 text-blue-700 border-blue-200',
  'Mejora': 'bg-purple-100 text-purple-700 border-purple-200',
  'Emergencia': 'bg-red-100 text-red-700 border-red-200',
}

const prioridadColors: Record<string, string> = {
  'Urgente': 'bg-red-100 text-red-700 border-red-200',
  'Alta': 'bg-orange-100 text-orange-700 border-orange-200',
  'Media': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Baja': 'bg-green-100 text-green-700 border-green-200',
}

const estadoAprobacionColors: Record<string, string> = {
  'Pendiente': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Aprobada': 'bg-green-100 text-green-700 border-green-200',
  'Rechazada': 'bg-red-100 text-red-700 border-red-200',
}

export function AprobacionesOTModule() {
  const { user } = useSession()
  const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([])
  const [estadisticas, setEstadisticas] = useState<Estadisticas>({ Pendiente: 0, Aprobada: 0, Rechazada: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('all')
  
  // Dialogs
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedOT, setSelectedOT] = useState<OrdenTrabajo | null>(null)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<'aprobar' | 'rechazar'>('aprobar')
  const [observaciones, setObservaciones] = useState('')
  const [processing, setProcessing] = useState(false)
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    
    const fetchData = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (filtroEstado !== 'all') params.append('estado', filtroEstado)
        if (search) params.append('search', search)
        
        const res = await fetch(`/api/aprobaciones-ot?${params.toString()}`, {
          signal: controller.signal
        })
        const data = await res.json()
        setOrdenes(data.ordenes || [])
        setEstadisticas(data.estadisticas || { Pendiente: 0, Aprobada: 0, Rechazada: 0 })
      } catch (error) {
        if (!(error instanceof Error && error.name === 'AbortError')) {
          console.error('Error fetching aprobaciones:', error)
        }
      }
      setLoading(false)
    }
    
    fetchData()
    
    return () => controller.abort()
  }, [filtroEstado, search])

  const fetchOrdenes = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filtroEstado !== 'all') params.append('estado', filtroEstado)
      if (search) params.append('search', search)
      
      const res = await fetch(`/api/aprobaciones-ot?${params.toString()}`)
      const data = await res.json()
      setOrdenes(data.ordenes || [])
      setEstadisticas(data.estadisticas || { Pendiente: 0, Aprobada: 0, Rechazada: 0 })
    } catch (error) {
      console.error('Error fetching aprobaciones:', error)
    }
    setLoading(false)
  }, [filtroEstado, search])

  const openDetailDialog = (ot: OrdenTrabajo) => {
    setSelectedOT(ot)
    setDetailDialogOpen(true)
  }

  const openActionDialog = (ot: OrdenTrabajo, accion: 'aprobar' | 'rechazar') => {
    setSelectedOT(ot)
    setActionType(accion)
    setObservaciones('')
    setActionDialogOpen(true)
  }

  const openHistoryDialog = (ot: OrdenTrabajo) => {
    setSelectedOT(ot)
    setHistoryDialogOpen(true)
  }

  const handleAction = async () => {
    if (!selectedOT) return
    setProcessing(true)
    
    try {
      const res = await fetch('/api/aprobaciones-ot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          otId: selectedOT.id,
          accion: actionType,
          observaciones: observaciones || null,
          aprobadoPor: user?.id || null,
          nombreAprobador: user ? `${user.nombre} ${user.apellido || ''}`.trim() : null,
        }),
      })
      
      if (res.ok) {
        setActionDialogOpen(false)
        fetchOrdenes()
      } else {
        const data = await res.json()
        alert(data.error || 'Error al procesar la acción')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al procesar la acción')
    }
    
    setProcessing(false)
  }

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'Pendiente':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'Aprobada':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'Rechazada':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />
    }
  }

  // Calcular totales para OT seleccionada
  const totalMateriales = selectedOT?.materiales?.reduce((sum, m) => sum + (m.total || m.cantidad * m.precioUnit), 0) || 0
  const totalPersonal = selectedOT?.personalOT?.reduce((sum, p) => sum + (p.total || p.precioUnit * p.horasTrabajadas * p.cantidad), 0) || 0
  const granTotal = totalMateriales + totalPersonal

  return (
    <div className="space-y-5">
      {/* Estadísticas */}
      <div className="grid grid-cols-3 gap-4">
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${filtroEstado === 'Pendiente' ? 'ring-2 ring-yellow-400' : ''}`}
          onClick={() => setFiltroEstado(filtroEstado === 'Pendiente' ? 'all' : 'Pendiente')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-100">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-700">{estadisticas.Pendiente}</div>
                <div className="text-xs text-slate-500 font-medium">Pendientes</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${filtroEstado === 'Aprobada' ? 'ring-2 ring-green-400' : ''}`}
          onClick={() => setFiltroEstado(filtroEstado === 'Aprobada' ? 'all' : 'Aprobada')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-700">{estadisticas.Aprobada}</div>
                <div className="text-xs text-slate-500 font-medium">Aprobadas</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className={`cursor-pointer transition-all hover:shadow-md ${filtroEstado === 'Rechazada' ? 'ring-2 ring-red-400' : ''}`}
          onClick={() => setFiltroEstado(filtroEstado === 'Rechazada' ? 'all' : 'Rechazada')}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-red-100">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-700">{estadisticas.Rechazada}</div>
                <div className="text-xs text-slate-500 font-medium">Rechazadas</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar OT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="Pendiente">Pendientes</SelectItem>
            <SelectItem value="Aprobada">Aprobadas</SelectItem>
            <SelectItem value="Rechazada">Rechazadas</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => fetchOrdenes()}>
          Actualizar
        </Button>
      </div>

      {/* Lista de OTs */}
      {loading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-slate-500">Cargando órdenes de trabajo...</p>
          </CardContent>
        </Card>
      ) : ordenes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500">No hay órdenes de trabajo {filtroEstado !== 'all' ? `${filtroEstado.toLowerCase()}s` : 'completadas'}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {ordenes.map((ot) => (
            <Card key={ot.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    {getEstadoIcon(ot.estadoAprobacion || 'Pendiente')}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-bold text-[#0f2040]">{ot.otNum}</span>
                        <Badge className={tipoColors[ot.tipo] || 'bg-slate-100'} variant="outline">
                          {ot.tipo}
                        </Badge>
                        <Badge className={prioridadColors[ot.prioridad] || 'bg-slate-100'} variant="outline">
                          {ot.prioridad}
                        </Badge>
                        <Badge className={estadoAprobacionColors[ot.estadoAprobacion || 'Pendiente']} variant="outline">
                          {ot.estadoAprobacion || 'Pendiente'}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-[#0f2040] mt-1">{ot.titulo}</h3>
                      <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {ot.asignado?.nombre || 'Sin asignar'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {ot.centroCosto?.codigo || 'Sin CC'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Completado: {formatDateShort(ot.fechaFinReal)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-2">
                          <Progress value={ot.progreso} className="h-1.5 w-20" />
                          <span className="text-xs text-slate-500">{ot.progreso}%</span>
                        </div>
                        <span className="font-mono text-sm font-bold text-red-600">{formatCLP(ot.costoReal)}</span>
                        <span className="text-xs text-slate-500">
                          Tiempo: {formatMinutes(ot.tiempoReal)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => openDetailDialog(ot)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Ver Detalle
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => openHistoryDialog(ot)}
                    >
                      <History className="w-4 h-4 mr-1" />
                      Historial
                    </Button>
                    {ot.estadoAprobacion === 'Pendiente' && (
                      <>
                        <Button 
                          size="sm" 
                          variant="default"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => openActionDialog(ot, 'aprobar')}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Aprobar
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => openActionDialog(ot, 'rechazar')}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Rechazar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog: Detalle de OT */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Detalle de Orden de Trabajo: {selectedOT?.otNum}
            </DialogTitle>
          </DialogHeader>
          
          {selectedOT && (
            <div className="space-y-4">
              {/* Info General */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-xs text-slate-500">N° OT</Label>
                  <div className="font-mono font-bold">{selectedOT.otNum}</div>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Estado Aprobación</Label>
                  <div>
                    <Badge className={estadoAprobacionColors[selectedOT.estadoAprobacion || 'Pendiente']}>
                      {selectedOT.estadoAprobacion || 'Pendiente'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Costo Real</Label>
                  <div className="font-mono font-bold text-red-600">{formatCLP(selectedOT.costoReal)}</div>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Tiempo Real</Label>
                  <div className="font-bold">{formatMinutes(selectedOT.tiempoReal)}</div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <Label className="text-xs text-slate-500">Título</Label>
                <div className="font-semibold text-lg">{selectedOT.titulo}</div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-slate-500">Tipo</Label>
                  <div><Badge className={tipoColors[selectedOT.tipo]}>{selectedOT.tipo}</Badge></div>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Prioridad</Label>
                  <div><Badge className={prioridadColors[selectedOT.prioridad]}>{selectedOT.prioridad}</Badge></div>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Centro de Costo</Label>
                  <div className="text-sm font-mono">{selectedOT.centroCosto?.codigo || 'Sin CC'} - {selectedOT.centroCosto?.nombre || ''}</div>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Asignado</Label>
                  <div className="text-sm">{selectedOT.asignado?.nombre || 'Sin asignar'}</div>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Fecha Fin Real</Label>
                  <div className="text-sm">{formatDateShort(selectedOT.fechaFinReal)}</div>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Ubicación</Label>
                  <div className="text-sm">{selectedOT.ubicacion || 'Sin ubicación'}</div>
                </div>
              </div>
              
              {selectedOT.descripcion && (
                <div>
                  <Label className="text-xs text-slate-500">Descripción</Label>
                  <div className="text-sm bg-slate-50 p-3 rounded">{selectedOT.descripcion}</div>
                </div>
              )}
              
              <Separator />
              
              {/* Recursos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Materiales */}
                <Card>
                  <CardHeader className="py-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Materiales ({selectedOT.materiales?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {selectedOT.materiales?.length > 0 ? (
                      <div className="max-h-40 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50 sticky top-0">
                            <tr>
                              <th className="text-left p-2">Descripción</th>
                              <th className="text-right p-2">Cant.</th>
                              <th className="text-right p-2">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedOT.materiales.map((m) => (
                              <tr key={m.id} className="border-t">
                                <td className="p-2">{m.descripcion}</td>
                                <td className="p-2 text-right">{m.cantidad} {m.unidad}</td>
                                <td className="p-2 text-right font-mono">{formatCLP(m.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="p-3 text-xs text-slate-400 text-center">Sin materiales</p>
                    )}
                    <div className="p-2 bg-slate-50 text-right font-mono text-sm">
                      Total: {formatCLP(totalMateriales)}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Personal */}
                <Card>
                  <CardHeader className="py-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Personal ({selectedOT.personalOT?.length || 0})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {selectedOT.personalOT?.length > 0 ? (
                      <div className="max-h-40 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50 sticky top-0">
                            <tr>
                              <th className="text-left p-2">Nombre</th>
                              <th className="text-right p-2">Horas</th>
                              <th className="text-right p-2">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedOT.personalOT.map((p) => (
                              <tr key={p.id} className="border-t">
                                <td className="p-2">{p.nombre}</td>
                                <td className="p-2 text-right">{p.horasTrabajadas}h</td>
                                <td className="p-2 text-right font-mono">{formatCLP(p.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="p-3 text-xs text-slate-400 text-center">Sin personal asignado</p>
                    )}
                    <div className="p-2 bg-slate-50 text-right font-mono text-sm">
                      Total: {formatCLP(totalPersonal)}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Total General */}
              <Card className="bg-slate-50">
                <CardContent className="p-3 flex justify-between items-center">
                  <span className="font-semibold text-slate-700">TOTAL GENERAL</span>
                  <span className="text-xl font-mono font-bold text-red-600">{formatCLP(granTotal)}</span>
                </CardContent>
              </Card>
              
              {/* Observaciones de aprobación */}
              {selectedOT.observacionesAprob && (
                <div>
                  <Label className="text-xs text-slate-500">Observaciones de Aprobación</Label>
                  <div className="text-sm bg-slate-50 p-3 rounded">{selectedOT.observacionesAprob}</div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Aprobar/Rechazar */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'aprobar' ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Aprobar Orden de Trabajo
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-red-600" />
                  Rechazar Orden de Trabajo
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {selectedOT && (
                <span>
                  OT: <strong>{selectedOT.otNum}</strong> - {selectedOT.titulo}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Observaciones</Label>
              <Textarea
                placeholder={actionType === 'aprobar' 
                  ? "Observaciones opcionales para la aprobación..." 
                  : "Indique el motivo del rechazo..."
                }
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)} disabled={processing}>
              Cancelar
            </Button>
            <Button 
              variant={actionType === 'aprobar' ? 'default' : 'destructive'}
              onClick={handleAction}
              disabled={processing}
              className={actionType === 'aprobar' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {processing ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Procesando...
                </span>
              ) : (
                actionType === 'aprobar' ? 'Confirmar Aprobación' : 'Confirmar Rechazo'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Historial */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Historial de Aprobaciones
            </DialogTitle>
            <DialogDescription>
              {selectedOT && (
                <span>
                  OT: <strong>{selectedOT.otNum}</strong> - {selectedOT.titulo}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOT && selectedOT.historialAprobaciones?.length > 0 ? (
            <div className="space-y-3">
              {selectedOT.historialAprobaciones.map((h, index) => (
                <div key={h.id} className="border rounded-lg p-3 bg-slate-50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getEstadoIcon(h.estadoNuevo)}
                      <Badge className={estadoAprobacionColors[h.estadoNuevo]}>
                        {h.estadoNuevo}
                      </Badge>
                    </div>
                    <span className="text-xs text-slate-500">{formatDate(h.fechaAccion)}</span>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1">
                    <div>
                      <span className="font-medium">Estado anterior:</span> {h.estadoAnterior || 'Pendiente'}
                    </div>
                    {h.nombreAprobador && (
                      <div>
                        <span className="font-medium">Realizado por:</span> {h.nombreAprobador}
                      </div>
                    )}
                    {h.observaciones && (
                      <div className="mt-2 p-2 bg-white rounded text-sm">
                        <span className="font-medium">Observaciones:</span> {h.observaciones}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500">
              <History className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p>No hay historial de aprobaciones</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
