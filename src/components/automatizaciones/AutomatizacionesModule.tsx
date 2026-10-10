'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from '@/hooks/use-session'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
} from '@/components/ui/dialog'
import {
  Bell,
  CheckCircle,
  ClipboardCheck,
  FileText,
  Moon,
  Sun,
  Database,
  Play,
  RefreshCw,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  History,
  Zap,
  Settings,
  ToggleLeft,
  ToggleRight,
  Activity,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Automatizacion {
  id: string
  codigo: string
  nombre: string
  descripcion: string | null
  categoria: string
  endpoint: string
  metodo: string
  activa: boolean
  modoManual: boolean
  cronSchedule: string | null
  cronDescription: string | null
  requiereAuth: boolean
  maxDuration: number
  reintentos: number
  timeoutMs: number
  parametros: string | null
  icono: string | null
  color: string | null
  orden: number
  ultimaEjecucion: string | null
  ultimoResultado: string | null
  ultimoError: string | null
  proximaEjecucion: string | null
  ejecucionesExitosas: number
  ejecucionesFallidas: number
  createdAt: string
  updatedAt: string
}

interface LogEntry {
  id: string
  automatizacionCodigo: string
  tipo: string
  resultado: string
  mensaje: string | null
  error: string | null
  duracionMs: number | null
  ejecutadoPor: string | null
  createdAt: string
}

const iconMap: Record<string, React.ReactNode> = {
  Bell: <Bell className="w-5 h-5" />,
  CheckCircle: <CheckCircle className="w-5 h-5" />,
  ClipboardCheck: <ClipboardCheck className="w-5 h-5" />,
  FileText: <FileText className="w-5 h-5" />,
  Moon: <Moon className="w-5 h-5" />,
  Sun: <Sun className="w-5 h-5" />,
  Database: <Database className="w-5 h-5" />,
}

const colorBorderMap: Record<string, string> = {
  blue: 'border-l-blue-500',
  amber: 'border-l-amber-500',
  green: 'border-l-green-500',
  purple: 'border-l-purple-500',
  indigo: 'border-l-indigo-500',
  orange: 'border-l-orange-500',
  slate: 'border-l-slate-500',
}

const colorMap: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  green: 'bg-green-100 text-green-700 border-green-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
}

const categoriaLabels: Record<string, string> = {
  alertas: 'Alertas',
  reportes: 'Reportes',
  rondas: 'Rondas',
  backups: 'Respaldos',
}

const categoriaOrder = ['alertas', 'reportes', 'rondas', 'backups']

export function AutomatizacionesModule() {
  const { user } = useSession()
  const [automatizaciones, setAutomatizaciones] = useState<Automatizacion[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState<string | null>(null)
  const [seeding, setSeeding] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const [selectedCodigo, setSelectedCodigo] = useState<string | null>(null)
  const [expandedCat, setExpandedCat] = useState<Set<string>>(new Set(categoriaOrder))
  const [lastResult, setLastResult] = useState<{ codigo: string; ok: boolean; mensaje: string } | null>(null)

  const isAdmin = user?.rol === 'admin'

  const fetchAutomatizaciones = useCallback(async () => {
    try {
      const res = await fetch('/api/automatizaciones')
      if (res.ok) {
        const data = await res.json()
        setAutomatizaciones(data)
      }
    } catch (err) {
      console.error('Error fetching automatizaciones:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchLogs = useCallback(async (codigo?: string) => {
    try {
      const params = codigo ? `?codigo=${codigo}&limite=30` : '?limite=50'
      const res = await fetch(`/api/automatizaciones/logs${params}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs)
      }
    } catch (err) {
      console.error('Error fetching logs:', err)
    }
  }, [])

  useEffect(() => {
    fetchAutomatizaciones()
  }, [fetchAutomatizaciones])

  const handleSeed = async () => {
    setSeeding(true)
    try {
      const res = await fetch('/api/automatizaciones/seed')
      const data = await res.json()
      if (data.ok) {
        await fetchAutomatizaciones()
      }
    } catch (err) {
      console.error('Error seeding:', err)
    } finally {
      setSeeding(false)
    }
  }

  const handleToggleActiva = async (codigo: string, activa: boolean) => {
    try {
      const res = await fetch('/api/automatizaciones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo, activa }),
      })
      if (res.ok) {
        await fetchAutomatizaciones()
      }
    } catch (err) {
      console.error('Error toggling activa:', err)
    }
  }

  const handleToggleModoManual = async (codigo: string, modoManual: boolean) => {
    try {
      const res = await fetch('/api/automatizaciones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo, modoManual }),
      })
      if (res.ok) {
        await fetchAutomatizaciones()
      }
    } catch (err) {
      console.error('Error toggling modoManual:', err)
    }
  }

  const handleEjecutar = async (codigo: string) => {
    setExecuting(codigo)
    setLastResult(null)
    try {
      const res = await fetch('/api/automatizaciones/ejecutar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo }),
      })
      const data = await res.json()
      setLastResult({ codigo, ok: data.ok, mensaje: data.mensaje || data.error || 'Ejecutada' })
      await fetchAutomatizaciones()
    } catch (err) {
      setLastResult({ codigo, ok: false, mensaje: 'Error de conexión' })
    } finally {
      setExecuting(null)
    }
  }

  const handleShowLogs = async (codigo?: string) => {
    setSelectedCodigo(codigo || null)
    setShowLogs(true)
    await fetchLogs(codigo)
  }

  const toggleCategory = (cat: string) => {
    setExpandedCat(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca'
    try {
      return new Date(dateStr).toLocaleString('es-CL', {
        timeZone: 'America/Santiago',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateStr
    }
  }

  const getResultIcon = (resultado: string | null) => {
    switch (resultado) {
      case 'exitoso': return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />
      case 'timeout': return <AlertCircle className="w-4 h-4 text-amber-500" />
      default: return <Clock className="w-4 h-4 text-slate-400" />
    }
  }

  // Agrupar por categoría
  const grouped = automatizaciones.reduce<Record<string, Automatizacion[]>>((acc, auto) => {
    if (!acc[auto.categoria]) acc[auto.categoria] = []
    acc[auto.categoria].push(auto)
    return acc
  }, {})

  // Estadísticas
  const totalActivas = automatizaciones.filter(a => a.activa && !a.modoManual).length
  const totalManuales = automatizaciones.filter(a => a.activa && a.modoManual).length
  const totalInactivas = automatizaciones.filter(a => !a.activa).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (automatizaciones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Zap className="w-12 h-12 text-slate-300" />
        <p className="text-slate-500 text-lg">No hay automatizaciones configuradas</p>
        {isAdmin && (
          <Button onClick={handleSeed} disabled={seeding} className="gap-2">
            {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Inicializar Automatizaciones
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header con estadísticas */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-800">Centro de Automatizaciones</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleShowLogs()} className="gap-1.5">
            <History className="w-3.5 h-3.5" />
            Ver Logs
          </Button>
          <Button variant="outline" size="sm" onClick={fetchAutomatizaciones} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Actualizar
          </Button>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={handleSeed} disabled={seeding} className="gap-1.5">
              {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Settings className="w-3.5 h-3.5" />}
              Re-sincronizar
            </Button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-green-600">{totalActivas}</div>
            <div className="text-xs text-slate-500">Automáticas Activas</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-amber-600">{totalManuales}</div>
            <div className="text-xs text-slate-500">Modo Manual</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-slate-400">
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-slate-500">{totalInactivas}</div>
            <div className="text-xs text-slate-500">Inactivas</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-3">
            <div className="text-2xl font-bold text-blue-600">
              {automatizaciones.reduce((s, a) => s + a.ejecucionesExitosas, 0)}
            </div>
            <div className="text-xs text-slate-500">Ejecuciones Exitosas</div>
          </CardContent>
        </Card>
      </div>

      {/* Último resultado */}
      {lastResult && (
        <div className={cn(
          'p-3 rounded-lg border text-sm flex items-center gap-2',
          lastResult.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
        )}>
          {lastResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          <span className="font-medium">{lastResult.codigo}</span>: {lastResult.mensaje}
          <button onClick={() => setLastResult(null)} className="ml-auto text-xs opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Automatizaciones por categoría */}
      {categoriaOrder.map(cat => {
        const items = grouped[cat]
        if (!items || items.length === 0) return null
        const isExpanded = expandedCat.has(cat)

        return (
          <div key={cat} className="space-y-2">
            <button
              onClick={() => toggleCategory(cat)}
              className="flex items-center gap-2 w-full text-left"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">
                {categoriaLabels[cat] || cat}
              </h3>
              <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
            </button>

            {isExpanded && (
              <div className="grid gap-3">
                {items.map(auto => {
                  const color = auto.color || 'blue'
                  const isExecuting = executing === auto.codigo

                  return (
                    <Card key={auto.id} className={cn('border-l-4', colorBorderMap[color] || 'border-l-slate-400')}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className={cn('p-2 rounded-lg', colorMap[color] || colorMap.slate)}>
                              {iconMap[auto.icono || ''] || <Zap className="w-5 h-5" />}
                            </div>
                            <div>
                              <CardTitle className="text-sm font-bold">{auto.nombre}</CardTitle>
                              <CardDescription className="text-xs mt-0.5">{auto.descripcion}</CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Badge de estado */}
                            {!auto.activa ? (
                              <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-500 border-slate-200">
                                Inactiva
                              </Badge>
                            ) : auto.modoManual ? (
                              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-600 border-amber-200">
                                <ToggleLeft className="w-3 h-3 mr-0.5" />
                                Manual
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-green-50 text-green-600 border-green-200">
                                <ToggleRight className="w-3 h-3 mr-0.5" />
                                Automática
                              </Badge>
                            )}
                            {/* Último resultado */}
                            {getResultIcon(auto.ultimoResultado)}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        {/* Info de ejecución */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{auto.cronDescription || 'Sin programación'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Activity className="w-3 h-3" />
                            <span>Última: {formatDate(auto.ultimaEjecucion)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                            <span>{auto.ejecucionesExitosas} exitosas</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <XCircle className="w-3 h-3 text-red-500" />
                            <span>{auto.ejecucionesFallidas} fallidas</span>
                          </div>
                        </div>

                        {/* Último error */}
                        {auto.ultimoError && (
                          <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700 truncate">
                            <AlertCircle className="w-3 h-3 inline mr-1" />
                            {auto.ultimoError.substring(0, 150)}
                          </div>
                        )}

                        {/* Controles Admin */}
                        {isAdmin && (
                          <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-100">
                            {/* Toggle Activada */}
                            <div className="flex items-center gap-1.5">
                              <Switch
                                checked={auto.activa}
                                onCheckedChange={(checked) => handleToggleActiva(auto.codigo, checked)}
                                className="data-[state=checked]:bg-green-500"
                              />
                              <span className="text-xs text-slate-600 font-medium">
                                {auto.activa ? 'Activada' : 'Desactivada'}
                              </span>
                            </div>

                            {/* Toggle Modo Manual/Automático */}
                            {auto.activa && (
                              <div className="flex items-center gap-1.5">
                                <Switch
                                  checked={!auto.modoManual}
                                  onCheckedChange={(checked) => handleToggleModoManual(auto.codigo, !checked)}
                                  className="data-[state=checked]:bg-blue-500"
                                />
                                <span className="text-xs text-slate-600 font-medium">
                                  {auto.modoManual ? 'Solo Manual' : 'Automática'}
                                </span>
                              </div>
                            )}

                            {/* Botón Ejecutar Manualmente */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEjecutar(auto.codigo)}
                              disabled={isExecuting}
                              className="gap-1.5 h-7 text-xs"
                            >
                              {isExecuting ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Play className="w-3 h-3" />
                              )}
                              Ejecutar Ahora
                            </Button>

                            {/* Ver Logs */}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleShowLogs(auto.codigo)}
                              className="gap-1.5 h-7 text-xs"
                            >
                              <History className="w-3 h-3" />
                              Logs
                            </Button>
                          </div>
                        )}

                        {/* Controles Supervisor */}
                        {!isAdmin && user?.rol === 'supervisor' && (
                          <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-100">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEjecutar(auto.codigo)}
                              disabled={isExecuting}
                              className="gap-1.5 h-7 text-xs"
                            >
                              {isExecuting ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Play className="w-3 h-3" />
                              )}
                              Ejecutar Ahora
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleShowLogs(auto.codigo)}
                              className="gap-1.5 h-7 text-xs"
                            >
                              <History className="w-3 h-3" />
                              Logs
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {/* Dialog de Logs */}
      <Dialog open={showLogs} onOpenChange={setShowLogs}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Logs de Ejecución
              {selectedCodigo && <Badge variant="outline">{selectedCodigo}</Badge>}
            </DialogTitle>
            <DialogDescription>
              Historial de ejecuciones de automatizaciones
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {logs.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No hay logs disponibles</p>
            ) : (
              logs.map(log => (
                <div
                  key={log.id}
                  className={cn(
                    'p-2.5 rounded-lg border text-xs',
                    log.resultado === 'exitoso' ? 'bg-green-50/50 border-green-100' :
                    log.resultado === 'error' ? 'bg-red-50/50 border-red-100' :
                    'bg-amber-50/50 border-amber-100'
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      {getResultIcon(log.resultado)}
                      <span className="font-medium text-slate-700">{log.automatizacionCodigo}</span>
                      <Badge variant="outline" className="text-[9px] py-0">
                        {log.tipo === 'manual' ? 'Manual' : 'Auto'}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[9px] py-0',
                          log.resultado === 'exitoso' ? 'text-green-600' :
                          log.resultado === 'error' ? 'text-red-600' :
                          'text-amber-600'
                        )}
                      >
                        {log.resultado}
                      </Badge>
                    </div>
                    <span className="text-slate-400 text-[10px]">
                      {formatDate(log.createdAt)}
                    </span>
                  </div>
                  {log.mensaje && (
                    <p className="text-slate-600 mb-0.5">{log.mensaje}</p>
                  )}
                  {log.error && (
                    <p className="text-red-600 truncate">{log.error.substring(0, 200)}</p>
                  )}
                  <div className="flex items-center gap-3 text-slate-400 text-[10px] mt-1">
                    {log.duracionMs !== null && <span>{log.duracionMs}ms</span>}
                    {log.ejecutadoPor && <span>Por: {log.ejecutadoPor}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Leyenda de ayuda */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="p-3">
          <h4 className="text-xs font-bold text-slate-600 mb-2">Guía de Configuración</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-500">
            <div className="flex items-start gap-1.5">
              <ToggleLeft className="w-3.5 h-3.5 mt-0.5 text-amber-500 shrink-0" />
              <span><strong className="text-slate-600">Modo Manual:</strong> La automatización está activada pero NO se ejecuta automáticamente por cron. Solo se ejecuta cuando presionas &quot;Ejecutar Ahora&quot;. Ideal para pruebas y verificación.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <ToggleRight className="w-3.5 h-3.5 mt-0.5 text-green-500 shrink-0" />
              <span><strong className="text-slate-600">Modo Automática:</strong> La automatización se ejecuta según el horario programado (cron) sin intervención manual. Úsala una vez que hayas verificado el funcionamiento correcto.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-green-500 shrink-0" />
              <span><strong className="text-slate-600">Recomendación:</strong> Primero activa en modo manual, ejecuta para verificar, revisa logs, corrige si es necesario, y luego cambia a automática.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <Settings className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" />
              <span><strong className="text-slate-600">Re-sincronizar:</strong> Actualiza las automatizaciones con los valores por defecto del sistema (no sobrescribe activa/modoManual).</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
