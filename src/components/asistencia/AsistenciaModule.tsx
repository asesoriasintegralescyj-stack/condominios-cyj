'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Clock, CheckCircle, XCircle, Calendar, AlertCircle, LogIn, LogOut,
  Upload, FileText, Download, RefreshCw, Loader2, Users, AlertTriangle,
  CheckSquare, FileDown, Search, Filter, Activity,
} from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from '@/hooks/use-session'
import { WorkeraTab } from './WorkeraTab'

// ============================================
// Tipos
// ============================================
interface Inasistencia {
  id: string
  nombreTrabajador: string
  rut?: string | null
  departamento?: string | null
  fecha: string
  diaSemana: string
  tipo: string
  horaEsperadaInicio?: string | null
  horaEsperadaFin?: string | null
  horaRealInicio?: string | null
  horaRealFin?: string | null
  minutosAtraso: number
  tipoTurno?: string | null
  estado: string
  justificacion?: {
    id: string
    tipoJustificacion: string
    observaciones?: string | null
    supervisorNombre?: string | null
    fechaJustificacion?: string | null
    estado: string
    adminNombre?: string | null
    adminObservaciones?: string | null
    fechaRevision?: string | null
    documento?: string | null
    documentoNombre?: string | null
  } | null
}

interface Stats {
  total: number
  atrasos: number
  ausencias: number
  salidasTempranas: number
  colacionesExcedidas: number
  pendientes: number
  justificados: number
  aprobados: number
  rechazados: number
}

interface ResumenTrabajador {
  nombre: string
  departamento?: string | null
  atrasos: number
  ausencias: number
  salidasTempranas: number
  colacionesExcedidas: number
  totalMinutosAtraso: number
  pendientes: number
  justificados: number
  aprobados: number
  rechazados: number
}

const tipoColors: Record<string, string> = {
  atraso: 'bg-amber-100 text-amber-800 border-amber-200',
  ausencia: 'bg-red-100 text-red-800 border-red-200',
  salida_temprana: 'bg-amber-100 text-amber-800 border-amber-200',
  colacion_excedida: 'bg-purple-100 text-purple-800 border-purple-200',
}

const estadoColors: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-800',
  justificado: 'bg-blue-100 text-blue-800',
  aprobado: 'bg-green-100 text-green-800',
  rechazado: 'bg-red-100 text-red-800',
}

const tipoLabels: Record<string, string> = {
  atraso: 'Atraso',
  ausencia: 'Ausencia',
  salida_temprana: 'Salida temprana',
  colacion_excedida: 'Colación excedida',
}

// ============================================
// Componente principal
// ============================================
export function AsistenciaModule() {
  const { user, isAdmin, isSupervisor } = useSession()
  const canJustificar = isSupervisor() || isAdmin()
  const canAprobar = isAdmin()

  const [activeTab, setActiveTab] = useState('analisis')
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)

  // Datos
  const [inasistencias, setInasistencias] = useState<Inasistencia[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [resumenTrabajadores, setResumenTrabajadores] = useState<ResumenTrabajador[]>([])

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState('all')
  const [filtroTipo, setFiltroTipo] = useState('all')
  const [filtroTrabajador, setFiltroTrabajador] = useState('')
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('')
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('')

  // Diálogo de justificación
  const [justDialogOpen, setJustDialogOpen] = useState(false)
  const [justTarget, setJustTarget] = useState<Inasistencia | null>(null)
  const [justTipo, setJustTipo] = useState('')
  const [justObservaciones, setJustObservaciones] = useState('')
  const [justDocumento, setJustDocumento] = useState<string | null>(null)
  const [justDocumentoName, setJustDocumentoName] = useState('')
  const [justLoading, setJustLoading] = useState(false)

  // Diálogo de aprobación
  const [aprobDialogOpen, setAprobDialogOpen] = useState(false)
  const [aprobTarget, setAprobTarget] = useState<Inasistencia | null>(null)
  const [aprobAccion, setAprobAccion] = useState<'aprobar' | 'rechazar' | ''>('')
  const [aprobObservaciones, setAprobObservaciones] = useState('')
  const [aprobLoading, setAprobLoading] = useState(false)

  // Cargar datos
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filtroFechaDesde) params.set('fechaDesde', filtroFechaDesde)
      if (filtroFechaHasta) params.set('fechaHasta', filtroFechaHasta)
      if (filtroEstado !== 'all') params.set('estado', filtroEstado)
      const url = `/api/asistencia/importar${params.toString() ? `?${params.toString()}` : ''}`
      const res = await fetch(url)
      const data = await res.json()
      if (res.ok) {
        setInasistencias(data.inasistencias || [])
        setStats(data.stats || null)
        setResumenTrabajadores(data.resumenPorTrabajador || [])
      } else {
        toast.error(data.error || 'Error al cargar datos')
      }
    } catch (e) {
      console.error('Error:', e)
    } finally {
      setLoading(false)
    }
  }, [filtroFechaDesde, filtroFechaHasta, filtroEstado])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Importar archivos
  const handleImport = async (horariosFile: File | null, registrosFile: File) => {
    setImporting(true)
    try {
      const formData = new FormData()
      if (horariosFile) {
        formData.append('horarios', horariosFile)
      }
      formData.append('registros', registrosFile)

      const res = await fetch('/api/asistencia/importar', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (res.ok) {
        toast.success(data.message || 'Importación completada')
        // Mostrar resumen detallado
        if (data.resumen) {
          toast.info(
            `Atrasos: ${data.resumen.totalAtrasos} | Ausencias: ${data.resumen.totalAusencias} | Salidas tempranas: ${data.resumen.totalSalidasTempranas}`,
            { duration: 6000 },
          )
        }
        fetchData()
      } else {
        toast.error(data.error || 'Error al importar')
      }
    } catch (e) {
      console.error('Error:', e)
      toast.error('Error de conexión')
    } finally {
      setImporting(false)
    }
  }

  // Justificar
  const handleJustificar = async () => {
    if (!justTarget || !justTipo) return
    setJustLoading(true)
    try {
      const res = await fetch('/api/asistencia/justificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inasistenciaId: justTarget.id,
          tipoJustificacion: justTipo,
          observaciones: justObservaciones,
          documento: justDocumento,
          documentoNombre: justDocumentoName,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Justificación enviada')
        setJustDialogOpen(false)
        setJustTarget(null)
        setJustTipo('')
        setJustObservaciones('')
        setJustDocumento(null)
        setJustDocumentoName('')
        fetchData()
      } else {
        toast.error(data.error || 'Error al justificar')
      }
    } catch (e) {
      toast.error('Error de conexión')
    } finally {
      setJustLoading(false)
    }
  }

  // Aprobar/Rechazar
  const handleAprobacion = async () => {
    if (!aprobTarget || !aprobAccion) return
    if (aprobAccion === 'rechazar' && !aprobObservaciones.trim()) {
      toast.error('Debe ingresar el motivo del rechazo')
      return
    }
    setAprobLoading(true)
    try {
      if (!aprobTarget.justificacion) {
        toast.error('No hay justificación para aprobar')
        return
      }
      const res = await fetch(`/api/asistencia/justificar/${aprobTarget.justificacion.id}/aprobar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: aprobAccion,
          adminObservaciones: aprobObservaciones.trim() || null,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Acción procesada')
        setAprobDialogOpen(false)
        setAprobTarget(null)
        setAprobAccion('')
        setAprobObservaciones('')
        fetchData()
      } else {
        toast.error(data.error || 'Error')
      }
    } catch (e) {
      toast.error('Error de conexión')
    } finally {
      setAprobLoading(false)
    }
  }

  // Exportar reporte
  const handleExport = (formato: 'pdf' | 'csv') => {
    // El reporte requiere fechas obligatorias
    const desde = filtroFechaDesde || ''
    const hasta = filtroFechaHasta || ''
    if (!desde || !hasta) {
      toast.error('Debe seleccionar fecha desde y hasta para generar el reporte')
      return
    }
    const params = new URLSearchParams()
    params.set('formato', formato)
    params.set('fechaDesde', desde)
    params.set('fechaHasta', hasta)
    if (filtroTrabajador) params.set('trabajador', filtroTrabajador)
    if (filtroEstado !== 'all') params.set('estado', filtroEstado)
    window.open(`/api/asistencia/reporte?${params.toString()}`, '_blank')
    toast.success('Generando reporte por trabajador...')
  }

  // Filtrar inasistencias para mostrar
  const inasistenciasFiltradas = inasistencias.filter((i) => {
    if (filtroTipo !== 'all' && i.tipo !== filtroTipo) return false
    if (filtroTrabajador && !i.nombreTrabajador.toLowerCase().includes(filtroTrabajador.toLowerCase())) return false
    return true
  })

  // ============================================
  // Render
  // ============================================
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-[#0f2044] flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Control de Asistencia
        </h2>
        {canJustificar && (
          <Badge variant="outline" className="text-xs">
            {isAdmin() ? 'Puede aprobar/rechazar justificaciones' : 'Puede justificar atrasos/ausencias'}
          </Badge>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-9 gap-2">
          <Card className="p-3">
            <div className="text-2xl font-bold text-[#0f2044]">{stats.total}</div>
            <div className="text-xs text-gray-500">Total</div>
          </Card>
          <Card className="p-3">
            <div className="text-2xl font-bold text-amber-600">{stats.atrasos}</div>
            <div className="text-xs text-gray-500">Atrasos</div>
          </Card>
          <Card className="p-3">
            <div className="text-2xl font-bold text-red-600">{stats.ausencias}</div>
            <div className="text-xs text-gray-500">Ausencias</div>
          </Card>
          <Card className="p-3">
            <div className="text-2xl font-bold text-amber-600">{stats.salidasTempranas}</div>
            <div className="text-xs text-gray-500">Sal. Tempranas</div>
          </Card>
          <Card className="p-3">
            <div className="text-2xl font-bold text-purple-600">{stats.colacionesExcedidas || 0}</div>
            <div className="text-xs text-gray-500">Col. Excedida</div>
          </Card>
          <Card className="p-3">
            <div className="text-2xl font-bold text-amber-700">{stats.pendientes}</div>
            <div className="text-xs text-gray-500">Pendientes</div>
          </Card>
          <Card className="p-3">
            <div className="text-2xl font-bold text-blue-600">{stats.justificados}</div>
            <div className="text-xs text-gray-500">Justificados</div>
          </Card>
          <Card className="p-3">
            <div className="text-2xl font-bold text-green-600">{stats.aprobados}</div>
            <div className="text-xs text-gray-500">Aprobados</div>
          </Card>
          <Card className="p-3">
            <div className="text-2xl font-bold text-red-700">{stats.rechazados}</div>
            <div className="text-xs text-gray-500">Rechazados</div>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
          <TabsTrigger value="analisis" className="text-xs">
            <AlertTriangle className="w-3.5 h-3.5 mr-1" />
            Análisis
          </TabsTrigger>
          <TabsTrigger value="resumen" className="text-xs">
            <Users className="w-3.5 h-3.5 mr-1" />
            Por Trabajador
          </TabsTrigger>
          {canJustificar && (
            <TabsTrigger value="justificaciones" className="text-xs">
              <CheckSquare className="w-3.5 h-3.5 mr-1" />
              {canAprobar ? 'Aprobaciones' : 'Justificar'}
            </TabsTrigger>
          )}
          {canJustificar && (
            <TabsTrigger value="importar" className="text-xs">
              <Upload className="w-3.5 h-3.5 mr-1" />
              Importar
            </TabsTrigger>
          )}
          <TabsTrigger value="workera" className="text-xs">
            <Activity className="w-3.5 h-3.5 mr-1" />
            Workera
          </TabsTrigger>
        </TabsList>

        {/* ============================================ */}
        {/* TAB: ANÁLISIS (listado de atrasos/ausencias) */}
        {/* ============================================ */}
        <TabsContent value="analisis" className="space-y-3 mt-3">
          {/* Filtros */}
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[150px]">
                  <Label className="text-xs">Buscar trabajador</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Nombre..."
                      value={filtroTrabajador}
                      onChange={(e) => setFiltroTrabajador(e.target.value)}
                      className="pl-8 h-9 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Tipo</Label>
                  <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                    <SelectTrigger className="w-[140px] h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="atraso">Atrasos</SelectItem>
                      <SelectItem value="ausencia">Ausencias</SelectItem>
                      <SelectItem value="salida_temprana">Salidas tempranas</SelectItem>
                      <SelectItem value="colacion_excedida">Colación excedida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Estado</Label>
                  <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                    <SelectTrigger className="w-[140px] h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pendiente">Pendientes</SelectItem>
                      <SelectItem value="justificado">Justificados</SelectItem>
                      <SelectItem value="aprobado">Aprobados</SelectItem>
                      <SelectItem value="rechazado">Rechazados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Desde</Label>
                  <Input
                    type="date"
                    value={filtroFechaDesde}
                    onChange={(e) => setFiltroFechaDesde(e.target.value)}
                    className="w-[140px] h-9 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Hasta</Label>
                  <Input
                    type="date"
                    value={filtroFechaHasta}
                    onChange={(e) => setFiltroFechaHasta(e.target.value)}
                    className="w-[140px] h-9 text-sm"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport('csv')}
                  className="h-9"
                  disabled={inasistenciasFiltradas.length === 0}
                >
                  <FileDown className="w-3.5 h-3.5 mr-1" /> CSV
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleExport('pdf')}
                  className="h-9 bg-[#0f2044] hover:bg-[#1a3155]"
                  disabled={inasistenciasFiltradas.length === 0}
                >
                  <FileDown className="w-3.5 h-3.5 mr-1" /> PDF
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Tabla */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left p-2 font-bold text-slate-600 uppercase">Trabajador</th>
                      <th className="text-left p-2 font-bold text-slate-600 uppercase">Depto</th>
                      <th className="text-left p-2 font-bold text-slate-600 uppercase">Fecha</th>
                      <th className="text-left p-2 font-bold text-slate-600 uppercase">Día</th>
                      <th className="text-left p-2 font-bold text-slate-600 uppercase">Tipo</th>
                      <th className="text-center p-2 font-bold text-slate-600 uppercase">Esperada</th>
                      <th className="text-center p-2 font-bold text-slate-600 uppercase">Real</th>
                      <th className="text-center p-2 font-bold text-slate-600 uppercase">Min</th>
                      <th className="text-left p-2 font-bold text-slate-600 uppercase">Estado</th>
                      <th className="text-center p-2 font-bold text-slate-600 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-gray-400">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                        </td>
                      </tr>
                    ) : inasistenciasFiltradas.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-gray-400">
                          No hay registros de atrasos o ausencias con los filtros seleccionados.
                          {canJustificar && ' Importa un archivo para generar el análisis.'}
                        </td>
                      </tr>
                    ) : (
                      inasistenciasFiltradas.slice(0, 200).map((i) => (
                        <tr key={i.id} className="border-b last:border-0 hover:bg-slate-50">
                          <td className="p-2 font-medium">{i.nombreTrabajador}</td>
                          <td className="p-2 text-gray-600">{i.departamento || '—'}</td>
                          <td className="p-2 text-gray-600 whitespace-nowrap">{i.fecha}</td>
                          <td className="p-2 text-gray-600">{i.diaSemana}</td>
                          <td className="p-2">
                            <Badge className={tipoColors[i.tipo] || 'bg-slate-100'} variant="outline">
                              {tipoLabels[i.tipo] || i.tipo}
                            </Badge>
                          </td>
                          <td className="p-2 text-center text-gray-600">{i.horaEsperadaInicio || '—'}</td>
                          <td className="p-2 text-center text-gray-600">{i.horaRealInicio || '—'}</td>
                          <td className="p-2 text-center font-mono">{i.minutosAtraso || 0}</td>
                          <td className="p-2">
                            <Badge className={estadoColors[i.estado] || 'bg-slate-100'}>
                              {i.estado}
                            </Badge>
                          </td>
                          <td className="p-2 text-center">
                            <div className="flex justify-center gap-1">
                              {/* Supervisor: justificar */}
                              {canJustificar && i.estado === 'pendiente' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs"
                                  onClick={() => {
                                    setJustTarget(i)
                                    setJustTipo('')
                                    setJustObservaciones('')
                                    setJustDialogOpen(true)
                                  }}
                                >
                                  Justificar
                                </Button>
                              )}
                              {/* Admin: aprobar/rechazar justificaciones pendientes */}
                              {canAprobar && i.justificacion && i.justificacion.estado === 'pendiente_revision' && (
                                <Button
                                  size="sm"
                                  className="h-7 px-2 text-xs bg-[#0f2044] hover:bg-[#1a3155]"
                                  onClick={() => {
                                    setAprobTarget(i)
                                    setAprobAccion('')
                                    setAprobObservaciones('')
                                    setAprobDialogOpen(true)
                                  }}
                                >
                                  Revisar
                                </Button>
                              )}
                              {/* Ver detalle */}
                              {i.justificacion && (
                                <span className="text-[10px] text-blue-600 italic">
                                  {i.justificacion.tipoJustificacion}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {inasistenciasFiltradas.length > 200 && (
                <div className="p-2 text-center text-xs text-gray-500 bg-slate-50">
                  Mostrando 200 de {inasistenciasFiltradas.length} registros. Usa los filtros para acotar.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================ */}
        {/* TAB: RESUMEN POR TRABAJADOR */}
        {/* ============================================ */}
        <TabsContent value="resumen" className="space-y-3 mt-3">
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Resumen por Trabajador</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left p-2 font-bold text-slate-600 uppercase">Trabajador</th>
                      <th className="text-left p-2 font-bold text-slate-600 uppercase">Departamento</th>
                      <th className="text-center p-2 font-bold text-slate-600 uppercase">Atrasos</th>
                      <th className="text-center p-2 font-bold text-slate-600 uppercase">Ausencias</th>
                      <th className="text-center p-2 font-bold text-slate-600 uppercase">Sal. Temp.</th>
                      <th className="text-center p-2 font-bold text-slate-600 uppercase">Min total</th>
                      <th className="text-center p-2 font-bold text-slate-600 uppercase">Pend.</th>
                      <th className="text-center p-2 font-bold text-slate-600 uppercase">Aprob.</th>
                      <th className="text-center p-2 font-bold text-slate-600 uppercase">Rech.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumenTrabajadores.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-gray-400">
                          No hay datos. Importa un archivo para generar el análisis.
                        </td>
                      </tr>
                    ) : (
                      resumenTrabajadores.map((t, idx) => (
                        <tr key={idx} className="border-b last:border-0 hover:bg-slate-50">
                          <td className="p-2 font-medium">{t.nombre}</td>
                          <td className="p-2 text-gray-600">{t.departamento || '—'}</td>
                          <td className="p-2 text-center font-mono">{t.atrasos}</td>
                          <td className="p-2 text-center font-mono">{t.ausencias}</td>
                          <td className="p-2 text-center font-mono">{t.salidasTempranas}</td>
                          <td className="p-2 text-center font-mono">{t.totalMinutosAtraso}</td>
                          <td className="p-2 text-center font-mono text-amber-700">{t.pendientes}</td>
                          <td className="p-2 text-center font-mono text-green-700">{t.aprobados}</td>
                          <td className="p-2 text-center font-mono text-red-700">{t.rechazados}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================ */}
        {/* TAB: JUSTIFICACIONES / APROBACIONES */}
        {/* ============================================ */}
        {canJustificar && (
          <TabsContent value="justificaciones" className="space-y-3 mt-3">
            {canAprobar ? (
              /* Admin: revisar justificaciones pendientes */
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckSquare className="w-4 h-4" />
                    Justificaciones pendientes de aprobación
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-slate-50">
                          <th className="text-left p-2 font-bold uppercase">Trabajador</th>
                          <th className="text-left p-2 font-bold uppercase">Fecha</th>
                          <th className="text-left p-2 font-bold uppercase">Tipo</th>
                          <th className="text-left p-2 font-bold uppercase">Justificación</th>
                          <th className="text-left p-2 font-bold uppercase">Supervisor</th>
                          <th className="text-center p-2 font-bold uppercase">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inasistencias
                          .filter((i) => i.justificacion?.estado === 'pendiente_revision')
                          .length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-gray-400">
                              No hay justificaciones pendientes de aprobación.
                            </td>
                          </tr>
                        ) : (
                          inasistencias
                            .filter((i) => i.justificacion?.estado === 'pendiente_revision')
                            .map((i) => (
                              <tr key={i.id} className="border-b last:border-0 hover:bg-slate-50">
                                <td className="p-2 font-medium">{i.nombreTrabajador}</td>
                                <td className="p-2 text-gray-600">{i.fecha}</td>
                                <td className="p-2">
                                  <Badge className={tipoColors[i.tipo]} variant="outline">
                                    {tipoLabels[i.tipo]}
                                  </Badge>
                                </td>
                                <td className="p-2">
                                  <div className="font-medium">{i.justificacion!.tipoJustificacion}</div>
                                  {i.justificacion!.observaciones && (
                                    <div className="text-gray-500 text-[10px]">{i.justificacion!.observaciones}</div>
                                  )}
                                </td>
                                <td className="p-2 text-gray-600">{i.justificacion!.supervisorNombre}</td>
                                <td className="p-2 text-center">
                                  <Button
                                    size="sm"
                                    className="h-7 text-xs bg-[#0f2044] hover:bg-[#1a3155]"
                                    onClick={() => {
                                      setAprobTarget(i)
                                      setAprobAccion('')
                                      setAprobObservaciones('')
                                      setAprobDialogOpen(true)
                                    }}
                                  >
                                    Revisar
                                  </Button>
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* Supervisor: ver justificaciones que ya envió */
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Justificaciones enviadas</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-slate-50">
                          <th className="text-left p-2 font-bold uppercase">Trabajador</th>
                          <th className="text-left p-2 font-bold uppercase">Fecha</th>
                          <th className="text-left p-2 font-bold uppercase">Tipo</th>
                          <th className="text-left p-2 font-bold uppercase">Justificación</th>
                          <th className="text-left p-2 font-bold uppercase">Estado</th>
                          <th className="text-left p-2 font-bold uppercase">Admin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inasistencias.filter((i) => i.justificacion).length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-gray-400">
                              No has enviado justificaciones todavía. Ve a la pestaña "Análisis" para justificar atrasos o ausencias.
                            </td>
                          </tr>
                        ) : (
                          inasistencias
                            .filter((i) => i.justificacion)
                            .map((i) => (
                              <tr key={i.id} className="border-b last:border-0 hover:bg-slate-50">
                                <td className="p-2 font-medium">{i.nombreTrabajador}</td>
                                <td className="p-2 text-gray-600">{i.fecha}</td>
                                <td className="p-2">
                                  <Badge className={tipoColors[i.tipo]} variant="outline">
                                    {tipoLabels[i.tipo]}
                                  </Badge>
                                </td>
                                <td className="p-2">
                                  <div className="font-medium">{i.justificacion!.tipoJustificacion}</div>
                                  {i.justificacion!.observaciones && (
                                    <div className="text-gray-500 text-[10px]">{i.justificacion!.observaciones}</div>
                                  )}
                                </td>
                                <td className="p-2">
                                  <Badge className={estadoColors[i.estado] || 'bg-slate-100'}>
                                    {i.estado}
                                  </Badge>
                                </td>
                                <td className="p-2 text-gray-600">
                                  {i.justificacion!.adminNombre || '—'}
                                  {i.justificacion!.adminObservaciones && (
                                    <div className="text-[10px] text-gray-500">{i.justificacion!.adminObservaciones}</div>
                                  )}
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* ============================================ */}
        {/* TAB: IMPORTAR */}
        {/* ============================================ */}
        {canJustificar && (
          <TabsContent value="importar" className="space-y-3 mt-3">
            <ImportTab onImport={handleImport} importing={importing} onCleaned={fetchData} />
          </TabsContent>
        )}

        {/* ============================================ */}
        {/* TAB: WORKERA API */
        {/* ============================================ */}
        <TabsContent value="workera" className="space-y-3 mt-3">
          <WorkeraTab />
        </TabsContent>
      </Tabs>

      {/* ============================================ */}
      {/* DIÁLOGO: JUSTIFICAR (supervisor) */}
      {/* ============================================ */}
      <Dialog open={justDialogOpen} onOpenChange={(open) => {
        if (!justLoading) {
          setJustDialogOpen(open)
          if (!open) {
            setJustTarget(null)
            setJustTipo('')
            setJustObservaciones('')
            setJustDocumento(null)
            setJustDocumentoName('')
          }
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              Justificar {justTarget ? tipoLabels[justTarget.tipo] : ''}
            </DialogTitle>
            <DialogDescription>
              {justTarget && (
                <>
                  Trabajador: <strong>{justTarget.nombreTrabajador}</strong><br />
                  Fecha: <strong>{justTarget.fecha}</strong> ({justTarget.diaSemana})<br />
                  {justTarget.horaEsperadaInicio && (
                    <>Esperada: {justTarget.horaEsperadaInicio} · Real: {justTarget.horaRealInicio || '—'} · Atraso: {justTarget.minutosAtraso} min</>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Tipo de justificación *</Label>
              <Select value={justTipo} onValueChange={setJustTipo}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecciona..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Permiso">Permiso</SelectItem>
                  <SelectItem value="Enfermedad">Enfermedad</SelectItem>
                  <SelectItem value="Personal">Personal</SelectItem>
                  <SelectItem value="Fuerza Mayor">Fuerza Mayor</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Observaciones</Label>
              <Textarea
                value={justObservaciones}
                onChange={(e) => setJustObservaciones(e.target.value)}
                placeholder="Explica el motivo de la justificación..."
                rows={3}
                disabled={justLoading}
              />
            </div>
            {/* Subir documento adjunto (permiso, respaldo médico, licencia) */}
            <div>
              <Label className="text-xs">Documento adjunto (permiso, licencia médica, respaldo)</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    if (file.size > 5 * 1024 * 1024) {
                      toast.error('El archivo no puede superar 5 MB')
                      e.target.value = ''
                      return
                    }
                    // Convertir a base64
                    const reader = new FileReader()
                    reader.onload = () => {
                      setJustDocumento(reader.result as string)
                      setJustDocumentoName(file.name)
                      toast.success(`Archivo cargado: ${file.name}`)
                    }
                    reader.onerror = () => toast.error('Error al leer el archivo')
                    reader.readAsDataURL(file)
                  }}
                  className="hidden"
                  id="just-documento-input"
                  disabled={justLoading}
                />
                <label htmlFor="just-documento-input" className="cursor-pointer">
                  <Upload className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                  <p className="text-xs text-gray-600">
                    {justDocumentoName || 'Click para subir documento (PDF, imagen, Word — máx 5 MB)'}
                  </p>
                </label>
                {justDocumentoName && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-1 h-7 text-xs text-red-600"
                    onClick={() => {
                      setJustDocumento(null)
                      setJustDocumentoName('')
                    }}
                  >
                    Quitar archivo
                  </Button>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJustDialogOpen(false)} disabled={justLoading}>
              Cancelar
            </Button>
            <Button
              onClick={handleJustificar}
              disabled={justLoading || !justTipo}
              className="bg-[#0f2044] hover:bg-[#1a3155]"
            >
              {justLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Enviar a revisión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================ */}
      {/* DIÁLOGO: APROBAR/RECHAZAR (admin) */}
      {/* ============================================ */}
      <Dialog open={aprobDialogOpen} onOpenChange={(open) => {
        if (!aprobLoading) {
          setAprobDialogOpen(open)
          if (!open) {
            setAprobTarget(null)
            setAprobAccion('')
            setAprobObservaciones('')
          }
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-[#0f2044]" />
              Revisar Justificación
            </DialogTitle>
            <DialogDescription>
              {aprobTarget && aprobTarget.justificacion && (
                <>
                  Trabajador: <strong>{aprobTarget.nombreTrabajador}</strong><br />
                  Fecha: <strong>{aprobTarget.fecha}</strong><br />
                  Tipo: {tipoLabels[aprobTarget.tipo]} · Atraso: {aprobTarget.minutosAtraso} min<br />
                  <hr className="my-2" />
                  Justificación: <strong>{aprobTarget.justificacion.tipoJustificacion}</strong><br />
                  Supervisor: {aprobTarget.justificacion.supervisorNombre}<br />
                  {aprobTarget.justificacion.observaciones && (
                    <em>"{aprobTarget.justificacion.observaciones}"</em>
                  )}
                  {aprobTarget.justificacion.documento && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                      <span className="text-blue-700">📎 Documento adjunto: </span>
                      <a
                        href={aprobTarget.justificacion.documento}
                        download={aprobTarget.justificacion.documentoNombre || 'documento'}
                        className="text-blue-600 underline font-medium"
                      >
                        {aprobTarget.justificacion.documentoNombre || 'Descargar'}
                      </a>
                    </div>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Acción</Label>
              <div className="flex gap-2">
                <Button
                  variant={aprobAccion === 'aprobar' ? 'default' : 'outline'}
                  className={`flex-1 ${aprobAccion === 'aprobar' ? 'bg-green-700 hover:bg-green-800' : ''}`}
                  onClick={() => setAprobAccion('aprobar')}
                  disabled={aprobLoading}
                >
                  <CheckCircle className="w-4 h-4 mr-1" /> Aprobar
                </Button>
                <Button
                  variant={aprobAccion === 'rechazar' ? 'default' : 'outline'}
                  className={`flex-1 ${aprobAccion === 'rechazar' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                  onClick={() => setAprobAccion('rechazar')}
                  disabled={aprobLoading}
                >
                  <XCircle className="w-4 h-4 mr-1" /> Rechazar
                </Button>
              </div>
            </div>
            {aprobAccion === 'rechazar' && (
              <div>
                <Label className="text-xs">Motivo del rechazo *</Label>
                <Textarea
                  value={aprobObservaciones}
                  onChange={(e) => setAprobObservaciones(e.target.value)}
                  placeholder="Explica por qué se rechaza..."
                  rows={3}
                  disabled={aprobLoading}
                />
              </div>
            )}
            {aprobAccion === 'aprobar' && (
              <div>
                <Label className="text-xs">Observaciones (opcional)</Label>
                <Textarea
                  value={aprobObservaciones}
                  onChange={(e) => setAprobObservaciones(e.target.value)}
                  placeholder="Observaciones adicionales..."
                  rows={2}
                  disabled={aprobLoading}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAprobDialogOpen(false)} disabled={aprobLoading}>
              Cancelar
            </Button>
            <Button
              onClick={handleAprobacion}
              disabled={aprobLoading || !aprobAccion || (aprobAccion === 'rechazar' && !aprobObservaciones.trim())}
              className={aprobAccion === 'rechazar' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-700 hover:bg-green-800'}
            >
              {aprobLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================
// Componente: ImportTab
// ============================================
function ImportTab({ onImport, importing, onCleaned }: { onImport: (h: File | null, r: File) => void; importing: boolean; onCleaned: () => void }) {
  const [horariosFile, setHorariosFile] = useState<File | null>(null)
  const [registrosFile, setRegistrosFile] = useState<File | null>(null)
  const [limpiando, setLimpiando] = useState(false)

  const handleLimpiar = async (soloFechasInvalidas: boolean = false) => {
    if (!soloFechasInvalidas) {
      if (!window.confirm('¿Está seguro de eliminar TODOS los datos de asistencia? Esta acción no se puede deshacer. Se borrarán: registros del reloj, inasistencias detectadas y justificaciones.')) {
        return
      }
    }
    setLimpiando(true)
    try {
      const res = await fetch('/api/asistencia/limpiar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ soloFechasInvalidas }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Datos limpiados')
        // Recargar datos en la UI (limpiar las tablas)
        onCleaned()
      } else {
        toast.error(data.error || 'Error al limpiar')
      }
    } catch (e) {
      toast.error('Error de conexión')
    } finally {
      setLimpiando(false)
    }
  }

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Importar Archivos de Asistencia
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Botón de limpiar datos */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-xs font-bold text-red-800">Limpiar datos antes de re-importar</p>
              <p className="text-xs text-red-600 mt-0.5">
                Si el reporte anterior salió con fechas incorrectas (1970) o ausencias masivas, limpia los datos antes de volver a importar.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                onClick={() => handleLimpiar(true)}
                disabled={limpiando || importing}
              >
                {limpiando ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                Solo fechas inválidas (1970)
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-50"
                onClick={() => handleLimpiar(false)}
                disabled={limpiando || importing}
              >
                {limpiando ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                Limpiar TODO
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
          <p className="font-bold mb-1">Instrucciones:</p>
          <ol className="list-decimal ml-4 space-y-1">
            <li>Si es la primera vez: salta el paso de limpiar. Si ya importaste antes: <strong>limpia los datos primero</strong></li>
            <li>Sube el archivo <strong>HORARIOS TRABAJADORES.xlsx</strong> (con los turnos por día)</li>
            <li>Sube el archivo <strong>Registro asistencia .xls/.xlsx</strong> (exportado del reloj control)</li>
            <li>El sistema analizará automáticamente: atrasos, ausencias y salidas tempranas</li>
            <li>Los turnos 4x4 se calculan automáticamente (4 días trabajo + 4 libres)</li>
          </ol>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Horarios */}
          <div className="space-y-2">
            <Label className="text-xs font-bold">1. Archivo de Horarios (.xlsx) <span className="text-gray-400 font-normal">— Opcional si ya están cargados</span></Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setHorariosFile(e.target.files?.[0] || null)}
                className="hidden"
                id="horarios-input"
              />
              <label htmlFor="horarios-input" className="cursor-pointer">
                <FileText className="w-8 h-8 mx-auto text-gray-400 mb-1" />
                <p className="text-xs text-gray-600">
                  {horariosFile ? horariosFile.name : 'Click para seleccionar'}
                </p>
              </label>
            </div>
          </div>

          {/* Registros */}
          <div className="space-y-2">
            <Label className="text-xs font-bold">2. Registro de Asistencia (.xls/.xlsx)</Label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setRegistrosFile(e.target.files?.[0] || null)}
                className="hidden"
                id="registros-input"
              />
              <label htmlFor="registros-input" className="cursor-pointer">
                <FileText className="w-8 h-8 mx-auto text-gray-400 mb-1" />
                <p className="text-xs text-gray-600">
                  {registrosFile ? registrosFile.name : 'Click para seleccionar'}
                </p>
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={() => registrosFile && onImport(horariosFile || null, registrosFile)}
            disabled={!registrosFile || importing}
            className="bg-[#0f2044] hover:bg-[#1a3155]"
          >
            {importing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importando y analizando...</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" /> Importar y Analizar</>
            )}
          </Button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
          <p><strong>Nota:</strong> La importación reemplaza los datos del rango de fechas del archivo. El análisis usa 5 minutos de tolerancia para atrasos.</p>
        </div>
      </CardContent>
    </Card>
  )
}
