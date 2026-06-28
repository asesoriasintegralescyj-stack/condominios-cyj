'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  CheckCircle, Clock, XCircle, AlertTriangle, 
  Search, Eye, RefreshCw,
  Wrench, DollarSign, User, Building
} from 'lucide-react'
import { Input } from '@/components/ui/input'

interface OrdenTrabajo {
  id: string
  otNum: string
  titulo: string
  tipo: string
  prioridad: string
  estado: string
  estadoAprobacion: string
  ubicacion: string | null
  fechaSolicitudAprob: string | null
  fechaAprobacion: string | null
  costoEstimado: number
  costoReal: number
  descripcion: string | null
  observacionesAprob: string | null
  aprobadoPor: string | null
  propiedad: { nombre: string } | null
  asignado: { nombre: string } | null
  historialAprobaciones: HistorialAprobacion[]
}

interface HistorialAprobacion {
  id: string
  estadoAnterior: string | null
  estadoNuevo: string
  observaciones: string | null
  aprobadoPor: string | null
  nombreAprobador: string | null
  fechaAccion: string
}

interface Estadisticas {
  Pendiente: number
  Aprobada: number
  Rechazada: number
}

export function AprobacionesModule() {
  const [ordenes, setOrdenes] = useState<OrdenTrabajo[]>([])
  const [estadisticas, setEstadisticas] = useState<Estadisticas>({ Pendiente: 0, Aprobada: 0, Rechazada: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<'all' | 'Pendiente' | 'Aprobada' | 'Rechazada'>('all')
  
  // Dialogs
  const [detalleDialogOpen, setDetalleDialogOpen] = useState(false)
  const [aprobarDialogOpen, setAprobarDialogOpen] = useState(false)
  const [rechazarDialogOpen, setRechazarDialogOpen] = useState(false)
  const [selectedOT, setSelectedOT] = useState<OrdenTrabajo | null>(null)
  const [observaciones, setObservaciones] = useState('')
  const [procesando, setProcesando] = useState(false)

  useEffect(() => {
    fetchOrdenes()
  }, [filtroEstado, search])

  const fetchOrdenes = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append('estado', filtroEstado)
      if (search) params.append('search', search)
      
      const res = await fetch(`/api/aprobaciones-ot?${params.toString()}`)
      const data = await res.json()
      setOrdenes(data.ordenes || [])
      setEstadisticas(data.estadisticas || { Pendiente: 0, Aprobada: 0, Rechazada: 0 })
    } catch (error) {
      console.error('Error fetching aprobaciones:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAprobar = async () => {
    if (!selectedOT) return
    setProcesando(true)
    try {
      const res = await fetch('/api/aprobaciones-ot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          otId: selectedOT.id,
          accion: 'aprobar',
          observaciones,
          aprobadoPor: 'admin',
          nombreAprobador: 'Administrador'
        })
      })
      if (res.ok) {
        fetchOrdenes()
        setAprobarDialogOpen(false)
        setObservaciones('')
        setSelectedOT(null)
      }
    } catch (error) {
      console.error('Error aprobando:', error)
    } finally {
      setProcesando(false)
    }
  }

  const handleRechazar = async () => {
    if (!selectedOT) return
    if (!observaciones.trim()) {
      alert('Debe ingresar observaciones para rechazar')
      return
    }
    setProcesando(true)
    try {
      const res = await fetch('/api/aprobaciones-ot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          otId: selectedOT.id,
          accion: 'rechazar',
          observaciones,
          aprobadoPor: 'admin',
          nombreAprobador: 'Administrador'
        })
      })
      if (res.ok) {
        fetchOrdenes()
        setRechazarDialogOpen(false)
        setObservaciones('')
        setSelectedOT(null)
      }
    } catch (error) {
      console.error('Error rechazando:', error)
    } finally {
      setProcesando(false)
    }
  }

  const getEstadoAprobacionIcon = (estado: string) => {
    switch (estado) {
      case 'Pendiente':
        return <Clock className="w-4 h-4 text-amber-500" />
      case 'Aprobada':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'Rechazada':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <AlertTriangle className="w-4 h-4 text-slate-500" />
    }
  }

  const getEstadoAprobacionColor = (estado: string) => {
    switch (estado) {
      case 'Pendiente':
        return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'Aprobada':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'Rechazada':
        return 'bg-red-100 text-red-700 border-red-200'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'Urgente': return 'bg-red-100 text-red-700'
      case 'Alta': return 'bg-orange-100 text-orange-700'
      case 'Media': return 'bg-yellow-100 text-yellow-700'
      case 'Baja': return 'bg-green-100 text-green-700'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  const formatCLP = (n: number) => 
    '$' + new Intl.NumberFormat('es-CL').format(n || 0)

  const formatDate = (d: string | null) => {
    if (!d) return '-'
    try {
      return new Date(d).toLocaleDateString('es-CL')
    } catch {
      return d
    }
  }

  const filteredOrdenes = filtroEstado === 'all' 
    ? ordenes 
    : ordenes.filter(o => o.estadoAprobacion === filtroEstado)

  return (
    <div className="space-y-5">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Wrench className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium">Total Completadas</p>
                <p className="text-xl font-bold text-slate-700">
                  {estadisticas.Pendiente + estadisticas.Aprobada + estadisticas.Rechazada}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-amber-600 font-medium">Pendientes</p>
                <p className="text-xl font-bold text-amber-700">{estadisticas.Pendiente}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-green-600 font-medium">Aprobadas</p>
                <p className="text-xl font-bold text-green-700">{estadisticas.Aprobada}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-red-600 font-medium">Rechazadas</p>
                <p className="text-xl font-bold text-red-700">{estadisticas.Rechazada}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="p-4">
          <p className="text-sm text-slate-600">
            Módulo de aprobación de Órdenes de Trabajo completadas. Las OT deben ser aprobadas para su cierre definitivo y facturación.
          </p>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar por número o título..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={filtroEstado} onValueChange={(v) => setFiltroEstado(v as any)}>
          <TabsList>
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="Pendiente">Pendientes</TabsTrigger>
            <TabsTrigger value="Aprobada">Aprobadas</TabsTrigger>
            <TabsTrigger value="Rechazada">Rechazadas</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button variant="outline" size="icon" onClick={fetchOrdenes}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* OT List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full"></div>
        </div>
      ) : filteredOrdenes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-slate-500">
            <Wrench className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No hay órdenes de trabajo {filtroEstado !== 'all' ? `con estado "${filtroEstado}"` : ''} para mostrar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredOrdenes.map((ot) => (
            <Card key={ot.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {getEstadoAprobacionIcon(ot.estadoAprobacion)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-[#0f2040]">{ot.otNum}</span>
                        <Badge className={getPrioridadColor(ot.prioridad)}>{ot.prioridad}</Badge>
                        <Badge className={getEstadoAprobacionColor(ot.estadoAprobacion)}>
                          {ot.estadoAprobacion || 'Pendiente'}
                        </Badge>
                      </div>
                      <div className="text-sm text-slate-700 font-medium mt-1">{ot.titulo}</div>
                      <div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-2">
                        <span className="flex items-center gap-1">
                          <Building className="w-3 h-3" />
                          {ot.propiedad?.nombre || 'Sin propiedad'}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {ot.asignado?.nombre || 'Sin asignar'}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          Est: {formatCLP(ot.costoEstimado)}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          Real: {formatCLP(ot.costoReal)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedOT(ot)
                        setDetalleDialogOpen(true)
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" /> Ver
                    </Button>
                    {ot.estadoAprobacion === 'Pendiente' && (
                      <>
                        <Button 
                          variant="default" 
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => {
                            setSelectedOT(ot)
                            setAprobarDialogOpen(true)
                          }}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" /> Aprobar
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={() => {
                            setSelectedOT(ot)
                            setRechazarDialogOpen(true)
                          }}
                        >
                          <XCircle className="w-4 h-4 mr-1" /> Rechazar
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

      {/* Dialog Detalle */}
      <Dialog open={detalleDialogOpen} onOpenChange={setDetalleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Detalle de OT: {selectedOT?.otNum}
            </DialogTitle>
          </DialogHeader>
          {selectedOT && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-slate-500">Título</Label>
                  <p className="font-medium">{selectedOT.titulo}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Tipo</Label>
                  <p>{selectedOT.tipo}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Propiedad</Label>
                  <p>{selectedOT.propiedad?.nombre || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Asignado</Label>
                  <p>{selectedOT.asignado?.nombre || '-'}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Costo Estimado</Label>
                  <p className="font-medium">{formatCLP(selectedOT.costoEstimado)}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Costo Real</Label>
                  <p className="font-bold text-green-700">{formatCLP(selectedOT.costoReal)}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Fecha Solicitud Aprobación</Label>
                  <p>{formatDate(selectedOT.fechaSolicitudAprob)}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Estado Aprobación</Label>
                  <Badge className={getEstadoAprobacionColor(selectedOT.estadoAprobacion)}>
                    {selectedOT.estadoAprobacion || 'Pendiente'}
                  </Badge>
                </div>
              </div>
              {selectedOT.descripcion && (
                <div>
                  <Label className="text-xs text-slate-500">Descripción</Label>
                  <p className="text-sm bg-slate-50 p-3 rounded">{selectedOT.descripcion}</p>
                </div>
              )}
              {selectedOT.observacionesAprob && (
                <div>
                  <Label className="text-xs text-slate-500">Observaciones</Label>
                  <p className="text-sm bg-slate-50 p-3 rounded">{selectedOT.observacionesAprob}</p>
                </div>
              )}
              {selectedOT.historialAprobaciones && selectedOT.historialAprobaciones.length > 0 && (
                <div>
                  <Label className="text-xs text-slate-500">Historial</Label>
                  <div className="space-y-2 mt-2">
                    {selectedOT.historialAprobaciones.map((h) => (
                      <div key={h.id} className="text-xs bg-slate-50 p-2 rounded flex items-center gap-2">
                        {getEstadoAprobacionIcon(h.estadoNuevo)}
                        <span>
                          {h.estadoAnterior || 'Inicio'} → {h.estadoNuevo}
                        </span>
                        <span className="text-slate-400">| {h.nombreAprobador || 'Sistema'}</span>
                        <span className="text-slate-400">| {formatDate(h.fechaAccion)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetalleDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Aprobar */}
      <Dialog open={aprobarDialogOpen} onOpenChange={setAprobarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              Aprobar OT: {selectedOT?.otNum}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              ¿Está seguro que desea aprobar la orden de trabajo <strong>{selectedOT?.titulo}</strong>?
            </p>
            <div>
              <Label>Observaciones (opcional)</Label>
              <Textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Agregar observaciones..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAprobarDialogOpen(false)}>Cancelar</Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={handleAprobar}
              disabled={procesando}
            >
              {procesando ? 'Procesando...' : 'Confirmar Aprobación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Rechazar */}
      <Dialog open={rechazarDialogOpen} onOpenChange={setRechazarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <XCircle className="w-5 h-5" />
              Rechazar OT: {selectedOT?.otNum}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              ¿Está seguro que desea rechazar la orden de trabajo <strong>{selectedOT?.titulo}</strong>?
            </p>
            <div>
              <Label>Observaciones (obligatorio)</Label>
              <Textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Indique el motivo del rechazo..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRechazarDialogOpen(false)}>Cancelar</Button>
            <Button 
              variant="destructive"
              onClick={handleRechazar}
              disabled={procesando}
            >
              {procesando ? 'Procesando...' : 'Confirmar Rechazo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
