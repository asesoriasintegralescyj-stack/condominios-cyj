'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from '@/hooks/use-session'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
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
  Mail,
  Plus,
  X,
  Calendar,
  Trash2,
  Save,
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
  correos: string | null
  fechaInicio: string | null
  fechaFin: string | null
  horaEjecucion: string | null
  diasSemana: string | null
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
  blue: 'border-l-blue-500', amber: 'border-l-amber-500', green: 'border-l-green-500',
  purple: 'border-l-purple-500', indigo: 'border-l-indigo-500', orange: 'border-l-orange-500', slate: 'border-l-slate-500',
}

const colorMap: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700 border-blue-200', amber: 'bg-amber-100 text-amber-700 border-amber-200',
  green: 'bg-green-100 text-green-700 border-green-200', purple: 'bg-purple-100 text-purple-700 border-purple-200',
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200', orange: 'bg-orange-100 text-orange-700 border-orange-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
}

const categoriaLabels: Record<string, string> = {
  alertas: 'Alertas', reportes: 'Reportes', rondas: 'Rondas', backups: 'Respaldos',
}
const categoriaOrder = ['alertas', 'reportes', 'rondas', 'backups']

const DIAS_LABELS: Record<number, string> = {
  1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb', 7: 'Dom',
}

export function AutomatizacionesModule() {
  const { user } = useSession()
  const [automatizaciones, setAutomatizaciones] = useState<Automatizacion[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [executing, setExecuting] = useState<string | null>(null)
  const [seeding, setSeeding] = useState(false)
  const [showLogs, setShowLogs] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [configAuto, setConfigAuto] = useState<Automatizacion | null>(null)
  const [selectedCodigo, setSelectedCodigo] = useState<string | null>(null)
  const [expandedCat, setExpandedCat] = useState<Set<string>>(new Set(categoriaOrder))
  const [lastResult, setLastResult] = useState<{ codigo: string; ok: boolean; mensaje: string } | null>(null)

  // Config state
  const [configCorreos, setConfigCorreos] = useState<string[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [configHora, setConfigHora] = useState('10:00')
  const [configFechaInicio, setConfigFechaInicio] = useState('')
  const [configFechaFin, setConfigFechaFin] = useState('')
  const [configDias, setConfigDias] = useState<number[]>([1, 2, 3, 4, 5])
  const [configReintentos, setConfigReintentos] = useState(1)
  const [configTimeout, setConfigTimeout] = useState(30)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

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

  useEffect(() => { fetchAutomatizaciones() }, [fetchAutomatizaciones])

  const handleSeed = async () => {
    setSeeding(true)
    try {
      const res = await fetch('/api/automatizaciones/seed')
      const data = await res.json()
      if (data.ok) await fetchAutomatizaciones()
    } catch (err) { console.error('Error seeding:', err) }
    finally { setSeeding(false) }
  }

  const handleToggleActiva = async (codigo: string, activa: boolean) => {
    try {
      const res = await fetch('/api/automatizaciones', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo, activa }),
      })
      if (res.ok) await fetchAutomatizaciones()
    } catch (err) { console.error('Error toggling activa:', err) }
  }

  const handleToggleModoManual = async (codigo: string, modoManual: boolean) => {
    try {
      const res = await fetch('/api/automatizaciones', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo, modoManual }),
      })
      if (res.ok) await fetchAutomatizaciones()
    } catch (err) { console.error('Error toggling modoManual:', err) }
  }

  const handleEjecutar = async (codigo: string) => {
    setExecuting(codigo)
    setLastResult(null)
    try {
      const res = await fetch('/api/automatizaciones/ejecutar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo }),
      })
      const data = await res.json()
      setLastResult({ codigo, ok: data.ok, mensaje: data.mensaje || data.error || 'Ejecutada' })
      await fetchAutomatizaciones()
    } catch (err) {
      setLastResult({ codigo, ok: false, mensaje: 'Error de conexión' })
    } finally { setExecuting(null) }
  }

  const handleShowLogs = async (codigo?: string) => {
    setSelectedCodigo(codigo || null)
    setShowLogs(true)
    await fetchLogs(codigo)
  }

  const parseCorreos = (correos: string | null): string[] => {
    if (!correos) return []
    try { const parsed = JSON.parse(correos); return Array.isArray(parsed) ? parsed : [] }
    catch { return [] }
  }

  const parseDias = (dias: string | null): number[] => {
    if (!dias) return [1, 2, 3, 4, 5]
    try { const parsed = JSON.parse(dias); return Array.isArray(parsed) ? parsed : [1, 2, 3, 4, 5] }
    catch { return [1, 2, 3, 4, 5] }
  }

  const formatDateInput = (dateStr: string | null): string => {
    if (!dateStr) return ''
    try {
      const d = new Date(dateStr)
      return d.toISOString().slice(0, 10) // YYYY-MM-DD
    } catch { return '' }
  }

  const openConfig = (auto: Automatizacion) => {
    setConfigAuto(auto)
    setConfigCorreos(parseCorreos(auto.correos))
    setConfigHora(auto.horaEjecucion || '10:00')
    setConfigFechaInicio(formatDateInput(auto.fechaInicio))
    setConfigFechaFin(formatDateInput(auto.fechaFin))
    setConfigDias(parseDias(auto.diasSemana))
    setConfigReintentos(auto.reintentos || 1)
    setConfigTimeout(Math.round((auto.timeoutMs || 30000) / 1000))
    setNewEmail('')
    setSaveError(null)
    setShowConfig(true)
  }

  const addEmail = () => {
    const email = newEmail.trim().toLowerCase()
    if (email && email.includes('@') && !configCorreos.includes(email)) {
      setConfigCorreos(prev => [...prev, email])
      setNewEmail('')
    }
  }

  const removeEmail = (email: string) => {
    setConfigCorreos(prev => prev.filter(e => e !== email))
  }

  const toggleDia = (dia: number) => {
    setConfigDias(prev => prev.includes(dia) ? prev.filter(d => d !== dia) : [...prev, dia].sort())
  }

  const saveConfig = async () => {
    if (!configAuto) return
    setSaving(true)
    try {
      // Construir descripción del cron
      const diasStr = configDias.length === 7 ? 'Todos los días'
        : configDias.length === 5 && [1,2,3,4,5].every(d => configDias.includes(d)) ? 'Lunes a Viernes'
        : configDias.map(d => DIAS_LABELS[d]).join(', ')

      const cronDesc = configDias.length > 0 && configHora
        ? `${diasStr} a las ${configHora}`
        : null

      // Construir cron schedule
      const [hora, minuto] = configHora.split(':').map(Number)
      let cronSchedule: string | null = null
      if (configDias.length > 0 && configHora) {
        if (configDias.length === 7) {
          cronSchedule = `${minuto} ${hora} * * *`
        } else {
          cronSchedule = `${minuto} ${hora} * * ${configDias.join(',')}`
        }
      }

      const payload = {
        codigo: configAuto.codigo,
        correos: configCorreos,
        horaEjecucion: configHora,
        fechaInicio: configFechaInicio || null,
        fechaFin: configFechaFin || null,
        diasSemana: configDias,
        cronSchedule,
        cronDescription: cronDesc,
        reintentos: configReintentos,
        timeoutMs: configTimeout * 1000,
      }
      console.log('Saving config:', configAuto.codigo, payload)

      const res = await fetch('/api/automatizaciones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      console.log('Save response:', res.status, data)

      if (res.ok && data.ok) {
        setSaveError(null)
        await fetchAutomatizaciones()
        setShowConfig(false)
      } else {
        setSaveError(data.error || `Error ${res.status}: No se pudo guardar la configuración`)
      }
    } catch (err: any) {
      console.error('Error saving config:', err)
      setSaveError(err.message || 'Error de conexión al guardar')
    }
    finally { setSaving(false) }
  }

  const toggleCategory = (cat: string) => {
    setExpandedCat(prev => { const next = new Set(prev); if (next.has(cat)) next.delete(cat); else next.add(cat); return next })
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Nunca'
    try { return new Date(dateStr).toLocaleString('es-CL', { timeZone: 'America/Santiago', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
    catch { return dateStr }
  }

  const getResultIcon = (resultado: string | null) => {
    switch (resultado) {
      case 'exitoso': return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />
      case 'timeout': return <AlertCircle className="w-4 h-4 text-amber-500" />
      default: return <Clock className="w-4 h-4 text-slate-400" />
    }
  }

  const grouped = automatizaciones.reduce<Record<string, Automatizacion[]>>((acc, auto) => {
    if (!acc[auto.categoria]) acc[auto.categoria] = []
    acc[auto.categoria].push(auto)
    return acc
  }, {})

  const totalActivas = automatizaciones.filter(a => a.activa && !a.modoManual).length
  const totalManuales = automatizaciones.filter(a => a.activa && a.modoManual).length
  const totalInactivas = automatizaciones.filter(a => !a.activa).length

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
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
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-800">Centro de Automatizaciones</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleShowLogs()} className="gap-1.5">
            <History className="w-3.5 h-3.5" /> Ver Logs
          </Button>
          <Button variant="outline" size="sm" onClick={fetchAutomatizaciones} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Actualizar
          </Button>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={handleSeed} disabled={seeding} className="gap-1.5">
              {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Settings className="w-3.5 h-3.5" />} Re-sincronizar
            </Button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-green-500"><CardContent className="p-3"><div className="text-2xl font-bold text-green-600">{totalActivas}</div><div className="text-xs text-slate-500">Automáticas Activas</div></CardContent></Card>
        <Card className="border-l-4 border-l-amber-500"><CardContent className="p-3"><div className="text-2xl font-bold text-amber-600">{totalManuales}</div><div className="text-xs text-slate-500">Modo Manual</div></CardContent></Card>
        <Card className="border-l-4 border-l-slate-400"><CardContent className="p-3"><div className="text-2xl font-bold text-slate-500">{totalInactivas}</div><div className="text-xs text-slate-500">Inactivas</div></CardContent></Card>
        <Card className="border-l-4 border-l-blue-500"><CardContent className="p-3"><div className="text-2xl font-bold text-blue-600">{automatizaciones.reduce((s, a) => s + a.ejecucionesExitosas, 0)}</div><div className="text-xs text-slate-500">Ejecuciones Exitosas</div></CardContent></Card>
      </div>

      {/* Último resultado */}
      {lastResult && (
        <div className={cn('p-3 rounded-lg border text-sm flex items-center gap-2', lastResult.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700')}>
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
            <button onClick={() => toggleCategory(cat)} className="flex items-center gap-2 w-full text-left">
              {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wider">{categoriaLabels[cat] || cat}</h3>
              <Badge variant="outline" className="text-[10px]">{items.length}</Badge>
            </button>

            {isExpanded && (
              <div className="grid gap-3">
                {items.map(auto => {
                  const color = auto.color || 'blue'
                  const isExecuting = executing === auto.codigo
                  let correosList: string[] = []
                  try { correosList = auto.correos ? JSON.parse(auto.correos) : [] } catch { correosList = [] }
                  let diasList: number[] = []
                  try { diasList = auto.diasSemana ? JSON.parse(auto.diasSemana) : [] } catch { diasList = [] }

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
                            {!auto.activa ? (
                              <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-500 border-slate-200">Inactiva</Badge>
                            ) : auto.modoManual ? (
                              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-600 border-amber-200"><ToggleLeft className="w-3 h-3 mr-0.5" />Manual</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-green-50 text-green-600 border-green-200"><ToggleRight className="w-3 h-3 mr-0.5" />Automática</Badge>
                            )}
                            {getResultIcon(auto.ultimoResultado)}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0 space-y-3">
                        {/* Info de ejecución */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-slate-500">
                          <div className="flex items-center gap-1"><Clock className="w-3 h-3" /><span>{auto.cronDescription || 'Sin programación'}</span></div>
                          <div className="flex items-center gap-1"><Activity className="w-3 h-3" /><span>Última: {formatDate(auto.ultimaEjecucion)}</span></div>
                          <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-500" /><span>{auto.ejecucionesExitosas} exitosas</span></div>
                          <div className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-500" /><span>{auto.ejecucionesFallidas} fallidas</span></div>
                        </div>

                        {/* Correos destinatarios */}
                        {correosList.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {correosList.slice(0, 3).map((email: string) => (
                              <Badge key={email} variant="outline" className="text-[10px] py-0 bg-blue-50 text-blue-600 border-blue-200">{email}</Badge>
                            ))}
                            {correosList.length > 3 && (
                              <Badge variant="outline" className="text-[10px] py-0">+{correosList.length - 3} más</Badge>
                            )}
                          </div>
                        )}

                        {/* Días de ejecución */}
                        {diasList.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {diasList.map((d: number) => (
                              <span key={d} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{DIAS_LABELS[d]}</span>
                            ))}
                            {auto.horaEjecucion && <span className="text-[10px] text-slate-500 ml-1">a las {auto.horaEjecucion}</span>}
                          </div>
                        )}

                        {/* Último error */}
                        {auto.ultimoError && (
                          <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700 truncate">
                            <AlertCircle className="w-3 h-3 inline mr-1" />{auto.ultimoError.substring(0, 150)}
                          </div>
                        )}

                        {/* Controles Admin */}
                        {isAdmin && (
                          <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-100">
                            <div className="flex items-center gap-1.5">
                              <Switch checked={auto.activa} onCheckedChange={(checked) => handleToggleActiva(auto.codigo, checked)} className="data-[state=checked]:bg-green-500" />
                              <span className="text-xs text-slate-600 font-medium">{auto.activa ? 'Activada' : 'Desactivada'}</span>
                            </div>
                            {auto.activa && (
                              <div className="flex items-center gap-1.5">
                                <Switch checked={!auto.modoManual} onCheckedChange={(checked) => handleToggleModoManual(auto.codigo, !checked)} className="data-[state=checked]:bg-blue-500" />
                                <span className="text-xs text-slate-600 font-medium">{auto.modoManual ? 'Solo Manual' : 'Automática'}</span>
                              </div>
                            )}
                            <Button size="sm" variant="outline" onClick={() => handleEjecutar(auto.codigo)} disabled={isExecuting} className="gap-1.5 h-7 text-xs">
                              {isExecuting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />} Ejecutar Ahora
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openConfig(auto)} className="gap-1.5 h-7 text-xs bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100">
                              <Settings className="w-3 h-3" /> Configurar
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleShowLogs(auto.codigo)} className="gap-1.5 h-7 text-xs">
                              <History className="w-3 h-3" /> Logs
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

      {/* === DIALOG CONFIGURACIÓN COMPLETA === */}
      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-500" />
              Configurar Automatización
            </DialogTitle>
            <DialogDescription>
              {configAuto?.nombre} — Control completo de programación, correos y ejecución
            </DialogDescription>
          </DialogHeader>

          {configAuto && (
            <div className="space-y-5 mt-2">
              {/* ─── ESTADO Y MODO ─── */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Estado y Modo
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-600">Activada</span>
                      <Switch
                        checked={configAuto.activa}
                        onCheckedChange={(checked) => {
                          handleToggleActiva(configAuto.codigo, checked)
                          setConfigAuto({ ...configAuto, activa: checked })
                        }}
                        className="data-[state=checked]:bg-green-500"
                      />
                    </div>
                  </Card>
                  <Card className="p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-600">
                        {configAuto.modoManual ? 'Solo Manual' : 'Automática'}
                      </span>
                      <Switch
                        checked={!configAuto.modoManual}
                        onCheckedChange={(checked) => {
                          handleToggleModoManual(configAuto.codigo, !checked)
                          setConfigAuto({ ...configAuto, modoManual: !checked })
                        }}
                        className="data-[state=checked]:bg-blue-500"
                      />
                    </div>
                  </Card>
                </div>
              </div>

              {/* ─── CORREOS DESTINATARIOS ─── */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Correos Destinatarios
                </h4>
                <p className="text-[11px] text-slate-400">Agrega los correos que recibirán notificaciones cuando se ejecute esta automatización.</p>

                <div className="space-y-2">
                  {/* Lista de correos actuales */}
                  {configCorreos.length > 0 ? (
                    <div className="space-y-1.5">
                      {configCorreos.map(email => (
                        <div key={email} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-blue-500" />
                            <span className="text-sm text-slate-700">{email}</span>
                          </div>
                          <button onClick={() => removeEmail(email)} className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                      <Mail className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-400">No hay correos configurados</p>
                    </div>
                  )}

                  {/* Agregar correo */}
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addEmail()}
                      className="flex-1 h-9 text-sm"
                    />
                    <Button onClick={addEmail} disabled={!newEmail.includes('@')} size="sm" className="gap-1.5 h-9">
                      <Plus className="w-3.5 h-3.5" /> Agregar
                    </Button>
                  </div>
                </div>
              </div>

              {/* ─── PROGRAMACIÓN DE FECHA Y HORA ─── */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Programación
                </h4>
                <p className="text-[11px] text-slate-400">Define cuándo y con qué frecuencia se ejecuta esta automatización.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Hora de ejecución */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Hora de Ejecución</label>
                    <Input
                      type="time"
                      value={configHora}
                      onChange={(e) => setConfigHora(e.target.value)}
                      className="h-9"
                    />
                  </div>

                  {/* Reintentos */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Reintentos si falla</label>
                    <select
                      value={configReintentos}
                      onChange={(e) => setConfigReintentos(Number(e.target.value))}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value={0}>Sin reintentos</option>
                      <option value={1}>1 reintento</option>
                      <option value={2}>2 reintentos</option>
                      <option value={3}>3 reintentos</option>
                    </select>
                  </div>

                  {/* Fecha inicio */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Fecha de Inicio</label>
                    <Input
                      type="date"
                      value={configFechaInicio}
                      onChange={(e) => setConfigFechaInicio(e.target.value)}
                      className="h-9"
                    />
                  </div>

                  {/* Fecha fin */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Fecha de Fin (opcional)</label>
                    <Input
                      type="date"
                      value={configFechaFin}
                      onChange={(e) => setConfigFechaFin(e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>

                {/* Timeout */}
                <div className="space-y-1 mt-2">
                  <label className="text-xs font-medium text-slate-600">Tiempo máximo de espera (timeout)</label>
                  <select
                    value={configTimeout}
                    onChange={(e) => setConfigTimeout(Number(e.target.value))}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value={10}>10 segundos</option>
                    <option value={30}>30 segundos</option>
                    <option value={60}>1 minuto</option>
                    <option value={120}>2 minutos</option>
                    <option value={300}>5 minutos</option>
                  </select>
                </div>
              </div>

              {/* ─── DÍAS DE LA SEMANA ─── */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Días de Ejecución
                </h4>
                <p className="text-[11px] text-slate-400">Selecciona los días en que se ejecutará automáticamente.</p>

                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map(dia => (
                    <button
                      key={dia}
                      onClick={() => toggleDia(dia)}
                      className={cn(
                        'w-14 h-10 rounded-lg border-2 text-xs font-bold transition-all',
                        configDias.includes(dia)
                          ? 'bg-blue-500 text-white border-blue-500'
                          : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'
                      )}
                    >
                      {DIAS_LABELS[dia]}
                    </button>
                  ))}
                </div>

                {/* Botones rápidos */}
                <div className="flex gap-2 mt-1">
                  <Button variant="ghost" size="sm" onClick={() => setConfigDias([1, 2, 3, 4, 5])} className="text-[10px] h-6">Lun-Vie</Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfigDias([1, 2, 3, 4, 5, 6, 7])} className="text-[10px] h-6">Todos</Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfigDias([])} className="text-[10px] h-6 text-red-500">Ninguno</Button>
                </div>
              </div>

              {/* ─── RESUMEN ─── */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1.5">
                <h4 className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Resumen de Configuración
                </h4>
                <div className="text-[11px] text-blue-600 space-y-0.5">
                  <p><strong>Estado:</strong> {configAuto.activa ? (configAuto.modoManual ? 'Solo Manual' : 'Automática') : 'Inactiva'}</p>
                  <p><strong>Correos:</strong> {configCorreos.length > 0 ? configCorreos.join(', ') : 'Ninguno'}</p>
                  <p><strong>Hora:</strong> {configHora || 'No definida'}</p>
                  <p><strong>Días:</strong> {configDias.length > 0 ? configDias.map(d => DIAS_LABELS[d]).join(', ') : 'Ninguno'}</p>
                  <p><strong>Desde:</strong> {configFechaInicio || 'Inmediato'}</p>
                  {configFechaFin && <p><strong>Hasta:</strong> {configFechaFin}</p>}
                  <p><strong>Reintentos:</strong> {configReintentos}</p>
                  <p><strong>Timeout:</strong> {configTimeout}s</p>
                </div>
              </div>

              {/* Error de guardado */}
              {saveError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-700">Error al guardar</p>
                    <p className="text-xs text-red-600 mt-0.5">{saveError}</p>
                  </div>
                  <button onClick={() => setSaveError(null)} className="ml-auto text-red-400 hover:text-red-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* ─── BOTONES GUARDAR/CANCELAR ─── */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setShowConfig(false)} className="gap-1.5">
                  Cancelar
                </Button>
                <Button onClick={saveConfig} disabled={saving} className="gap-1.5 bg-blue-600 hover:bg-blue-700">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar Configuración
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Logs */}
      <Dialog open={showLogs} onOpenChange={setShowLogs}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" /> Logs de Ejecución
              {selectedCodigo && <Badge variant="outline">{selectedCodigo}</Badge>}
            </DialogTitle>
            <DialogDescription>Historial de ejecuciones de automatizaciones</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {logs.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No hay logs disponibles</p>
            ) : (
              logs.map(log => (
                <div key={log.id} className={cn('p-2.5 rounded-lg border text-xs', log.resultado === 'exitoso' ? 'bg-green-50/50 border-green-100' : log.resultado === 'error' ? 'bg-red-50/50 border-red-100' : 'bg-amber-50/50 border-amber-100')}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5">
                      {getResultIcon(log.resultado)}
                      <span className="font-medium text-slate-700">{log.automatizacionCodigo}</span>
                      <Badge variant="outline" className="text-[9px] py-0">{log.tipo === 'manual' || log.tipo === 'ejecucion_manual' ? 'Manual' : log.tipo}</Badge>
                      <Badge variant="outline" className={cn('text-[9px] py-0', log.resultado === 'exitoso' ? 'text-green-600' : log.resultado === 'error' ? 'text-red-600' : 'text-amber-600')}>{log.resultado}</Badge>
                    </div>
                    <span className="text-slate-400 text-[10px]">{formatDate(log.createdAt)}</span>
                  </div>
                  {log.mensaje && <p className="text-slate-600 mb-0.5">{log.mensaje}</p>}
                  {log.error && <p className="text-red-600 truncate">{log.error.substring(0, 200)}</p>}
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

      {/* Guía de ayuda */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="p-3">
          <h4 className="text-xs font-bold text-slate-600 mb-2">Guía de Configuración</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-500">
            <div className="flex items-start gap-1.5">
              <Settings className="w-3.5 h-3.5 mt-0.5 text-blue-500 shrink-0" />
              <span><strong className="text-slate-600">Configurar:</strong> Presiona el botón "Configurar" para acceder al control completo: correos, horario, días, fechas y reintentos.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <Mail className="w-3.5 h-3.5 mt-0.5 text-blue-500 shrink-0" />
              <span><strong className="text-slate-600">Correos:</strong> Agrega los destinatarios que recibirán notificaciones automáticas cada vez que se ejecute la automatización.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <Calendar className="w-3.5 h-3.5 mt-0.5 text-green-500 shrink-0" />
              <span><strong className="text-slate-600">Programación:</strong> Define la hora, días de la semana y rango de fechas en que debe ejecutarse automáticamente.</span>
            </div>
            <div className="flex items-start gap-1.5">
              <ToggleLeft className="w-3.5 h-3.5 mt-0.5 text-amber-500 shrink-0" />
              <span><strong className="text-slate-600">Modo Manual:</strong> Activa pero NO se ejecuta sola. Solo al presionar "Ejecutar Ahora". Ideal para pruebas.</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
