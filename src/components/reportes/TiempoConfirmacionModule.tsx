/**
 * Módulo de Reporte de Tiempo de Confirmación de OT
 * Asesorías Integrales CyJ - Sistema de Gestión
 * 
 * Reporte visible SOLO para administradores
 * Muestra tiempos de respuesta y desviaciones en OTs aprobadas
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { 
  Clock, 
  Calendar, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Timer, 
  Download,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { useSession } from '@/hooks/use-session'
import { useAppStore } from '@/lib/store'

interface TiempoConfirmacion {
  otNum: string
  titulo: string
  fechaSolicitud: string | null
  fechaAprobacion: string | null
  tiempoRespuesta: number | null // in minutes
  tiempoEstimado: number
  tiempoReal: number
  desviacion: number // positive = delay, negative = ahead
  aprobadoPor: string | null
  centroCosto: string | null
  estado: string
  tipo: string
  prioridad: string
}

const formatMinutes = (minutes: number | null): string => {
  if (minutes === null) return '–'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
}

const formatDateTime = (dateStr: string | null): string => {
  if (!dateStr) return '–'
  try {
    const date = new Date(dateStr)
    return date.toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateStr
  }
}

export function TiempoConfirmacionModule() {
  const router = useRouter()
  const { user, loading: sessionLoading, isAdmin } = useSession()
  const { setCurrentModule } = useAppStore()
  
  const [data, setData] = useState<TiempoConfirmacion[]>([])
  const [loading, setLoading] = useState(true)
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  useEffect(() => {
    if (sessionLoading) return
    if (!isAdmin()) {
      setCurrentModule('dashboard')
      return
    }
    
    const load = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/reportes/tiempo-confirmacion')
        const result = await response.json()
        setData(result)
      } catch (error) {
        console.error('Error fetching tiempo confirmación:', error)
      }
      setLoading(false)
    }
    
    void load()
  }, [sessionLoading, isAdmin, setCurrentModule])

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (fechaDesde) params.append('fechaDesde', fechaDesde)
      if (fechaHasta) params.append('fechaHasta', fechaHasta)
      
      const response = await fetch(`/api/reportes/tiempo-confirmacion?${params.toString()}`)
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching tiempo confirmación:', error)
    }
    setLoading(false)
  }

  // Calculate summary statistics
  const stats = {
    total: data.length,
    avgTiempoRespuesta: data.length > 0 
      ? data.reduce((sum, d) => sum + (d.tiempoRespuesta || 0), 0) / data.filter(d => d.tiempoRespuesta !== null).length || 0
      : 0,
    avgDesviacion: data.length > 0
      ? data.reduce((sum, d) => sum + d.desviacion, 0) / data.length
      : 0,
    conRetraso: data.filter(d => d.desviacion > 0).length,
    aTiempo: data.filter(d => d.desviacion <= 0).length,
  }

  const handleExportPDF = () => {
    const html = generatePDFHTML(data, stats, fechaDesde, fechaHasta)
    const w = window.open('', '_blank', 'width=960,height=720')
    if (!w) {
      alert('Habilita ventanas emergentes')
      return
    }
    w.document.open()
    w.document.write(html)
    w.document.close()
    w.onload = () => setTimeout(() => w.print(), 400)
  }

  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    )
  }

  if (!isAdmin()) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-red-700">Acceso Restringido</h2>
          <p className="text-red-600 mt-2">Este reporte está disponible solo para administradores.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-[#0f2040] to-[#1a3460] text-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs opacity-70">Total OTs</div>
                <div className="text-2xl font-bold">{stats.total}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-xs text-slate-500">Tiempo Resp. Promedio</div>
                <div className="text-xl font-bold text-[#0f2040]">{formatMinutes(stats.avgTiempoRespuesta)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stats.avgDesviacion > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
                {stats.avgDesviacion > 0 ? (
                  <TrendingUp className="w-5 h-5 text-red-600" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-green-600" />
                )}
              </div>
              <div>
                <div className="text-xs text-slate-500">Desviación Promedio</div>
                <div className={`text-xl font-bold ${stats.avgDesviacion > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {stats.avgDesviacion > 0 ? '+' : ''}{formatMinutes(stats.avgDesviacion)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Timer className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-xs text-green-600">A Tiempo</div>
                <div className="text-2xl font-bold text-green-700">{stats.aTiempo}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <div className="text-xs text-red-600">Con Retraso</div>
                <div className="text-2xl font-bold text-red-700">{stats.conRetraso}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Desde</label>
              <Input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-44"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-500">Hasta</label>
              <Input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-44"
              />
            </div>
            <Button onClick={fetchData} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Calendar className="w-4 h-4 mr-2" />}
              Filtrar
            </Button>
            <Button variant="outline" onClick={handleExportPDF} disabled={loading || data.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Detalle de Tiempos de Confirmación</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-slate-50 z-10">
                <TableRow>
                  <TableHead className="text-[10px] font-bold uppercase">N° OT</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Título</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-center">Tiempo Est.</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-center">Tiempo Real</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-center">Desviación</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase text-center">Tiempo Resp.</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Aprobado Por</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Fecha Aprobación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="p-8 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="p-8 text-center text-slate-400">
                      No hay OTs aprobadas en el período seleccionado
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((item, index) => (
                    <TableRow key={index} className="hover:bg-slate-50">
                      <TableCell className="font-mono font-bold">{item.otNum}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{item.titulo}</TableCell>
                      <TableCell className="text-center">{formatMinutes(item.tiempoEstimado)}</TableCell>
                      <TableCell className="text-center">{formatMinutes(item.tiempoReal)}</TableCell>
                      <TableCell className="text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge 
                                className={`cursor-help ${
                                  item.desviacion > 0 
                                    ? 'bg-red-100 text-red-700 hover:bg-red-100' 
                                    : 'bg-green-100 text-green-700 hover:bg-green-100'
                                }`}
                              >
                                {item.desviacion > 0 ? '+' : ''}{formatMinutes(item.desviacion)}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              {item.desviacion > 0 
                                ? `${formatMinutes(item.desviacion)} sobre el tiempo estimado`
                                : item.desviacion < 0
                                  ? `${formatMinutes(Math.abs(item.desviacion))} bajo el tiempo estimado`
                                  : 'Cumplió exactamente el tiempo estimado'
                              }
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-blue-600 font-medium">{formatMinutes(item.tiempoRespuesta)}</span>
                      </TableCell>
                      <TableCell>{item.aprobadoPor || '–'}</TableCell>
                      <TableCell className="text-xs">{formatDateTime(item.fechaAprobacion)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function generatePDFHTML(
  data: TiempoConfirmacion[], 
  stats: { total: number; avgTiempoRespuesta: number; avgDesviacion: number; conRetraso: number; aTiempo: number },
  fechaDesde: string,
  fechaHasta: string
): string {
  const formatMinutes = (minutes: number | null): string => {
    if (minutes === null) return '–'
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
  }

  const formatDateTime = (dateStr: string | null): string => {
    if (!dateStr) return '–'
    try {
      const date = new Date(dateStr)
      return date.toLocaleString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateStr
    }
  }

  const periodoTexto = fechaDesde || fechaHasta 
    ? `Período: ${fechaDesde || 'Inicio'} - ${fechaHasta || 'Actual'}`
    : ''

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Reporte Tiempo Confirmación OT</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 11px; padding: 24px; color: #000; }
        h1 { color: #0f2040; font-size: 16px; }
        .header { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; border-bottom: 3px solid #f0a500; padding-bottom: 14px; }
        .logo { width: 46px; height: 46px; background: #0f2040; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; }
        
        .stats { display: flex; gap: 15px; margin-bottom: 20px; }
        .stat-box { flex: 1; padding: 10px; border-radius: 6px; text-align: center; }
        .stat-box.primary { background: #0f2040; color: white; }
        .stat-box.green { background: #dcfce7; border: 1px solid #86efac; }
        .stat-box.red { background: #fee2e2; border: 1px solid #fca5a5; }
        .stat-box.blue { background: #dbeafe; border: 1px solid #93c5fd; }
        .stat-label { font-size: 9px; opacity: 0.7; }
        .stat-value { font-size: 18px; font-weight: bold; margin-top: 2px; }
        
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th { background: #0f2040; color: white; padding: 7px 8px; font-size: 9px; text-align: left; text-transform: uppercase; }
        td { padding: 6px 8px; border-bottom: 1px solid #e8ecf0; font-size: 10px; }
        tr:nth-child(even) td { background: #f8fafc; }
        
        .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; }
        .badge.green { background: #dcfce7; color: #166534; }
        .badge.red { background: #fee2e2; color: #991b1b; }
        
        .footer { margin-top: 14px; font-size: 9px; color: #94a3b8; }
        .note { background: #fffbeb; border: 1px solid #fcd34d; padding: 8px; border-radius: 4px; margin-top: 15px; font-size: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">🏘️</div>
        <div>
          <h1>Asesorías Integrales CyJ</h1>
          <p style="font-size:11px;color:#64748b">Reporte de Tiempos de Confirmación de OT – ${new Date().toLocaleDateString('es-CL')}</p>
          ${periodoTexto ? `<p style="font-size:10px;color:#94a3b8">${periodoTexto}</p>` : ''}
        </div>
      </div>
      
      <div class="stats">
        <div class="stat-box primary">
          <div class="stat-label">Total OTs</div>
          <div class="stat-value">${stats.total}</div>
        </div>
        <div class="stat-box blue">
          <div class="stat-label">Tiempo Resp. Promedio</div>
          <div class="stat-value">${formatMinutes(stats.avgTiempoRespuesta)}</div>
        </div>
        <div class="stat-box ${stats.avgDesviacion > 0 ? 'red' : 'green'}">
          <div class="stat-label">Desviación Promedio</div>
          <div class="stat-value">${stats.avgDesviacion > 0 ? '+' : ''}${formatMinutes(stats.avgDesviacion)}</div>
        </div>
        <div class="stat-box green">
          <div class="stat-label">A Tiempo</div>
          <div class="stat-value">${stats.aTiempo}</div>
        </div>
        <div class="stat-box red">
          <div class="stat-label">Con Retraso</div>
          <div class="stat-value">${stats.conRetraso}</div>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>N° OT</th>
            <th>Título</th>
            <th style="text-align:center">Tiempo Est.</th>
            <th style="text-align:center">Tiempo Real</th>
            <th style="text-align:center">Desviación</th>
            <th style="text-align:center">Tiempo Resp.</th>
            <th>Aprobado Por</th>
            <th>Fecha Aprobación</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(item => `
            <tr>
              <td><b>${item.otNum}</b></td>
              <td>${item.titulo}</td>
              <td style="text-align:center">${formatMinutes(item.tiempoEstimado)}</td>
              <td style="text-align:center">${formatMinutes(item.tiempoReal)}</td>
              <td style="text-align:center">
                <span class="badge ${item.desviacion > 0 ? 'red' : 'green'}">
                  ${item.desviacion > 0 ? '+' : ''}${formatMinutes(item.desviacion)}
                </span>
              </td>
              <td style="text-align:center">${formatMinutes(item.tiempoRespuesta)}</td>
              <td>${item.aprobadoPor || '–'}</td>
              <td>${formatDateTime(item.fechaAprobacion)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div class="note">
        <b>Nota:</b> Desviación positiva (rojo) indica retraso respecto al tiempo estimado. 
        Desviación negativa (verde) indica que se completó antes del tiempo estimado.
      </div>
      
      <div class="footer">Generado: ${new Date().toLocaleString('es-CL')} | Reporte confidencial - Solo administradores</div>
    </body>
    </html>
  `
}
