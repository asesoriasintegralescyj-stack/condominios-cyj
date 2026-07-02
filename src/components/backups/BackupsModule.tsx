'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
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
import { Progress } from '@/components/ui/progress'
import { 
  Database, 
  Download, 
  Trash2, 
  RefreshCw, 
  Settings, 
  Plus,
  Clock,
  HardDrive,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  RotateCcw,
  Calendar,
  FileText,
  Archive,
  Info,
  Mail
} from 'lucide-react'
import { toast } from 'sonner'

interface Backup {
  id: string
  tipo: string
  estado: string
  fechaInicio: string | null
  fechaFin: string | null
  tamano: number
  ubicacion: string | null
  archivo: string | null
  incluyeBase64: boolean
  mensajeError: string | null
  verificado: boolean
  fechaVerificacion: string | null
  totalTablas: number
  totalRegistros: number
  createdAt: string
}

interface Stats {
  total: number
  completados: number
  fallidos: number
  backupsEsteMes: number
  ultimoBackup: string | null
  tamanoTotal: number
}

interface Config {
  frecuencia: string
  hora: string
  retencionDias: number
  incluyeBase64: boolean
  ultimoEjecutado: string | null
  activo: boolean
}

const ESTADOS = [
  { value: 'Pendiente', label: 'Pendiente', color: 'bg-slate-100 text-slate-700', icon: <Clock className="w-3 h-3" /> },
  { value: 'EnProgreso', label: 'En Progreso', color: 'bg-blue-100 text-blue-700', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  { value: 'Completado', label: 'Completado', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
  { value: 'Fallido', label: 'Fallido', color: 'bg-red-100 text-red-700', icon: <XCircle className="w-3 h-3" /> },
]

const TIPOS = [
  { value: 'Automatico', label: 'Automático', color: 'bg-purple-100 text-purple-700' },
  { value: 'Manual', label: 'Manual', color: 'bg-amber-100 text-amber-700' },
]

const getEstadoConfig = (estado: string) => {
  return ESTADOS.find(e => e.value === estado) || ESTADOS[0]
}

const getTipoConfig = (tipo: string) => {
  return TIPOS.find(t => t.value === tipo) || TIPOS[1]
}

const formatDate = (date: string | Date | null) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('es-CL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatSize = (mb: number) => {
  if (mb < 1) return `${(mb * 1024).toFixed(1)} KB`
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`
  return `${mb.toFixed(2)} MB`
}

export function BackupsModule() {
  const [backups, setBackups] = useState<Backup[]>([])
  const [stats, setStats] = useState<Stats>({
    total: 0,
    completados: 0,
    fallidos: 0,
    backupsEsteMes: 0,
    ultimoBackup: null,
    tamanoTotal: 0
  })
  const [config, setConfig] = useState<Config>({
    frecuencia: 'Diario',
    hora: '02:00',
    retencionDias: 30,
    incluyeBase64: false,
    ultimoEjecutado: null,
    activo: true
  })
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [generandoMensual, setGenerandoMensual] = useState(false)
  const [restoreProgress, setRestoreProgress] = useState(0)

  // Filters
  const [filterEstado, setFilterEstado] = useState('todos')
  const [filterTipo, setFilterTipo] = useState('todos')

  // Dialogs
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null)

  // Config form
  const [configForm, setConfigForm] = useState(config)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterEstado !== 'todos') params.append('estado', filterEstado)
      if (filterTipo !== 'todos') params.append('tipo', filterTipo)

      const [backupsRes, configRes] = await Promise.all([
        fetch(`/api/backups?${params.toString()}`),
        fetch('/api/backups/config')
      ])

      const backupsData = await backupsRes.json()
      const configData = await configRes.json()

      setBackups(backupsData.backups || [])
      setStats(backupsData.stats || stats)
      setConfig(configData)
      setConfigForm(configData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }, [filterEstado, filterTipo])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Poll for updates if there's a backup in progress
  useEffect(() => {
    const inProgress = backups.some(b => b.estado === 'EnProgreso' || b.estado === 'Pendiente')
    if (inProgress) {
      const interval = setInterval(fetchData, 2000)
      return () => clearInterval(interval)
    }
  }, [backups, fetchData])

  const createBackup = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'Manual', incluyeBase64: false })
      })
      
      if (res.ok) {
        fetchData()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Error al crear respaldo')
      }
    } catch (error) {
      console.error('Error creating backup:', error)
      toast.error('Error al crear respaldo')
    } finally {
      setCreating(false)
    }
  }

  const generarRespaldoMensual = async () => {
    setGenerandoMensual(true)
    toast.info('Generando respaldo jerárquico (ZIP con OTs, Proyectos, SCs, Rondas y Asistencia)... esto puede tardar 1-2 minutos.', { duration: 8000 })
    try {
      const res = await fetch('/api/backups/auto-mensual', {
        method: 'POST',
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Respaldo mensual generado correctamente')
        if (data.resumen) {
          const r = data.resumen
          const partesInfo = r.totalPartes > 1
            ? `• Email: ${r.partesEnviadas}/${r.totalPartes} partes enviadas a asesoriasintegralescyj@gmail.com\n`
            : `• Email: ${r.emailEnviado ? 'Enviado a asesoriasintegralescyj@gmail.com' : 'No enviado'}\n`
          toast.info(
            `Estructura del ZIP:\n` +
            `• 01_OT_Generales/ — ${r.ot} OTs (cada una con PDF + fotos + SC asociadas + resumen de costos)\n` +
            `• 02_Proyectos/ — ${r.proyectos} proyectos (misma estructura)\n` +
            `• 03_Solicitudes_no_asociadas/ — ${r.scNoAsociadas} SCs + resumen\n` +
            `• 04_Rondas.pdf — ${r.rondas} registros\n` +
            `• 05_Asistencia.pdf — ${r.inasistencias} incidencias\n` +
            `• Tamaño ZIP: ${r.zipMB} MB` + (r.totalPartes > 1 ? ` (${r.totalPartes} partes)` : '') + `\n` +
            (r.fotosOmitidas > 0 || r.docsOmitidos > 0
              ? `• ${r.fotosOmitidas || 0} fotos y ${r.docsOmitidos || 0} docs omitidos por límite de tamaño\n`
              : '') +
            partesInfo,
            { duration: 12000 }
          )
        }
        fetchData()
      } else {
        toast.error(data.error || 'Error al generar respaldo mensual')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error de conexión. Si tardó más de 60s, el servidor pudo haber agotado el tiempo. Revisa el email en unos minutos.')
    } finally {
      setGenerandoMensual(false)
    }
  }

  const downloadBackup = async (backup: Backup) => {
    try {
      const res = await fetch(`/api/backups/${backup.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'download' })
      })
      
      const data = await res.json()
      
      if (data.base64) {
        // Create download link
        const link = document.createElement('a')
        link.href = `data:application/octet-stream;base64,${data.base64}`
        link.download = data.archivo || `backup_${backup.id}.db`
        link.click()
      }
    } catch (error) {
      console.error('Error downloading backup:', error)
      toast.error('Error al descargar respaldo')
    }
  }

  const restoreBackup = async () => {
    if (!selectedBackup) return
    
    setRestoreProgress(10)
    try {
      setRestoreProgress(30)
      const res = await fetch(`/api/backups/restore/${selectedBackup.id}`, {
        method: 'POST'
      })
      
      setRestoreProgress(70)
      
      if (res.ok) {
        setRestoreProgress(100)
        setTimeout(() => {
          setRestoreDialogOpen(false)
          setRestoreProgress(0)
          fetchData()
          toast.success('Base de datos restaurada correctamente')
        }, 500)
      } else {
        const error = await res.json()
        toast.error(error.error || 'Error al restaurar respaldo')
        setRestoreProgress(0)
      }
    } catch (error) {
      console.error('Error restoring backup:', error)
      toast.error('Error al restaurar respaldo')
      setRestoreProgress(0)
    }
  }

  const deleteBackup = async () => {
    if (!selectedBackup) return
    
    try {
      const res = await fetch(`/api/backups/${selectedBackup.id}`, {
        method: 'DELETE'
      })
      
      if (res.ok) {
        setDeleteDialogOpen(false)
        setSelectedBackup(null)
        fetchData()
      } else {
        const error = await res.json()
        toast.error(error.error || 'Error al eliminar respaldo')
      }
    } catch (error) {
      console.error('Error deleting backup:', error)
      toast.error('Error al eliminar respaldo')
    }
  }

  const saveConfig = async () => {
    try {
      const res = await fetch('/api/backups/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configForm)
      })
      
      if (res.ok) {
        setConfig(configForm)
        setConfigDialogOpen(false)
      } else {
        const error = await res.json()
        toast.error(error.error || 'Error al guardar configuración')
      }
    } catch (error) {
      console.error('Error saving config:', error)
      toast.error('Error al guardar configuración')
    }
  }

  const cleanOldBackups = async () => {
    try {
      const res = await fetch('/api/backups/config', {
        method: 'DELETE'
      })
      
      if (res.ok) {
        const data = await res.json()
        toast.success(`Limpieza completada: ${data.eliminados} respaldos eliminados`)
        fetchData()
      }
    } catch (error) {
      console.error('Error cleaning backups:', error)
      toast.error('Error al limpiar respaldos antiguos')
    }
  }

  const openRestoreDialog = (backup: Backup) => {
    setSelectedBackup(backup)
    setRestoreDialogOpen(true)
  }

  const openDeleteDialog = (backup: Backup) => {
    setSelectedBackup(backup)
    setDeleteDialogOpen(true)
  }

  const openDetailDialog = (backup: Backup) => {
    setSelectedBackup(backup)
    setDetailDialogOpen(true)
  }

  if (loading && backups.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Archive className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Total Respaldos</p>
                <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Este Mes</p>
                <p className="text-2xl font-bold text-blue-600">{stats.backupsEsteMes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Último Respaldo</p>
                <p className="text-sm font-bold text-emerald-600">
                  {stats.ultimoBackup ? formatDate(stats.ultimoBackup) : 'Sin respaldos'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <HardDrive className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Tamaño Total</p>
                <p className="text-2xl font-bold text-amber-600">{formatSize(stats.tamanoTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Auto Backup Status & Quick Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${config.activo ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  Respaldos Automáticos {config.activo ? 'Activados' : 'Desactivados'}
                </p>
                <p className="text-xs text-slate-500">
                  {config.activo ? `${config.frecuencia} a las ${config.hora} • Retención: ${config.retencionDias} días` : 'Activar en configuración'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  El <strong>Respaldo Mensual Jerárquico</strong> genera un ZIP con: 01_OT_Generales/ (cada OT con su PDF, fotos, documentos, SC asociadas y resumen de costos), 02_Proyectos/ (misma estructura), 03_Solicitudes_no_asociadas/, 04_Rondas, 05_Asistencia y Respaldo_BD. Se envía por email a asesoriasintegralescyj@gmail.com.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfigDialogOpen(true)}>
                <Settings className="w-4 h-4 mr-2" />
                Configurar
              </Button>
              <Button variant="outline" size="sm" onClick={cleanOldBackups}>
                <Trash2 className="w-4 h-4 mr-2" />
                Limpiar Antiguos
              </Button>
              <Button 
                size="sm" 
                onClick={createBackup} 
                disabled={creating}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Respaldo
                  </>
                )}
              </Button>
              <Button
                onClick={generarRespaldoMensual}
                disabled={generandoMensual || creating}
                className="bg-green-700 hover:bg-green-800"
              >
                {generandoMensual ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generando ZIP...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Respaldo Mensual Jerárquico (ZIP)
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Header with Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-lg font-bold text-slate-800">Historial de Respaldos</h2>
        <div className="flex gap-2">
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {ESTADOS.map(e => (
                <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {TIPOS.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Backups Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Fecha</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Tipo</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Estado</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Archivo</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Tamaño</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Tablas</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Registros</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-slate-400">
                      <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      No hay respaldos registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  backups.map((backup) => {
                    const estadoConfig = getEstadoConfig(backup.estado)
                    const tipoConfig = getTipoConfig(backup.tipo)
                    return (
                      <TableRow key={backup.id} className="hover:bg-slate-50">
                        <TableCell className="text-sm text-slate-600">
                          {formatDate(backup.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge className={tipoConfig.color}>
                            {tipoConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={estadoConfig.color}>
                            <span className="flex items-center gap-1">
                              {estadoConfig.icon}
                              {estadoConfig.label}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm font-mono text-slate-600 max-w-[200px] truncate">
                          {backup.archivo || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {backup.tamano ? formatSize(backup.tamano) : '-'}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {backup.totalTablas || '-'}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {backup.totalRegistros ? backup.totalRegistros.toLocaleString('es-CL') : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => openDetailDialog(backup)}
                              title="Ver detalles"
                            >
                              <Info className="w-4 h-4" />
                            </Button>
                            {backup.estado === 'Completado' && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => downloadBackup(backup)}
                                  title="Descargar"
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => openRestoreDialog(backup)}
                                  title="Restaurar"
                                  className="text-amber-600 hover:text-amber-700"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => openDeleteDialog(backup)}
                              title="Eliminar"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-slate-600" />
              Configuración de Respaldos Automáticos
            </DialogTitle>
            <DialogDescription>
              Configura la frecuencia y retención de los respaldos automáticos
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Activar Respaldos Automáticos</Label>
              <Switch
                checked={configForm.activo}
                onCheckedChange={(checked) => setConfigForm({ ...configForm, activo: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Frecuencia</Label>
              <Select 
                value={configForm.frecuencia} 
                onValueChange={(value) => setConfigForm({ ...configForm, frecuencia: value })}
                disabled={!configForm.activo}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Diario">Diario</SelectItem>
                  <SelectItem value="Semanal">Semanal</SelectItem>
                  <SelectItem value="Mensual">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Hora del Respaldo</Label>
              <Input
                type="time"
                value={configForm.hora}
                onChange={(e) => setConfigForm({ ...configForm, hora: e.target.value })}
                disabled={!configForm.activo}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Retención (días)</Label>
              <Input
                type="number"
                value={configForm.retencionDias}
                onChange={(e) => setConfigForm({ ...configForm, retencionDias: parseInt(e.target.value) || 30 })}
                disabled={!configForm.activo}
                min={1}
                max={365}
              />
              <p className="text-xs text-slate-500">Los respaldos más antiguos serán eliminados automáticamente</p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Incluir Archivos Base64</Label>
                <p className="text-xs text-slate-500">Incluye imágenes y documentos en el respaldo</p>
              </div>
              <Switch
                checked={configForm.incluyeBase64}
                onCheckedChange={(checked) => setConfigForm({ ...configForm, incluyeBase64: checked })}
                disabled={!configForm.activo}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveConfig}>
              Guardar Configuración
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Dialog */}
      <AlertDialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
              Restaurar Base de Datos
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro que desea restaurar la base de datos desde este respaldo?
              <br /><br />
              <strong className="text-slate-700">Esta acción reemplazará todos los datos actuales.</strong>
              <br /><br />
              {selectedBackup && (
                <div className="text-sm bg-slate-50 p-3 rounded-lg mt-2">
                  <p><strong>Archivo:</strong> {selectedBackup.archivo}</p>
                  <p><strong>Fecha:</strong> {formatDate(selectedBackup.createdAt)}</p>
                  <p><strong>Tamaño:</strong> {formatSize(selectedBackup.tamano)}</p>
                  <p><strong>Registros:</strong> {selectedBackup.totalRegistros?.toLocaleString('es-CL')}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {restoreProgress > 0 && (
            <div className="px-4 pb-4">
              <Progress value={restoreProgress} className="h-2" />
              <p className="text-xs text-center text-slate-500 mt-2">
                {restoreProgress < 100 ? 'Restaurando...' : '¡Completado!'}
              </p>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoreProgress > 0}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={restoreBackup}
              disabled={restoreProgress > 0}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {restoreProgress > 0 ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Restaurando...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restaurar
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Eliminar Respaldo
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro que desea eliminar este respaldo?
              <br /><br />
              <strong>Esta acción no se puede deshacer.</strong>
              {selectedBackup && (
                <div className="text-sm bg-slate-50 p-3 rounded-lg mt-2">
                  <p><strong>Archivo:</strong> {selectedBackup.archivo}</p>
                  <p><strong>Fecha:</strong> {formatDate(selectedBackup.createdAt)}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteBackup}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-600" />
              Detalle del Respaldo
            </DialogTitle>
          </DialogHeader>
          
          {selectedBackup && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">ID</p>
                  <p className="text-xs font-mono text-slate-600 truncate">{selectedBackup.id}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Tipo</p>
                  <Badge className={getTipoConfig(selectedBackup.tipo).color}>
                    {getTipoConfig(selectedBackup.tipo).label}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Fecha Creación</p>
                  <p className="text-sm">{formatDate(selectedBackup.createdAt)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Estado</p>
                  <Badge className={getEstadoConfig(selectedBackup.estado).color}>
                    <span className="flex items-center gap-1">
                      {getEstadoConfig(selectedBackup.estado).icon}
                      {getEstadoConfig(selectedBackup.estado).label}
                    </span>
                  </Badge>
                </div>
              </div>

              {selectedBackup.fechaInicio && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Inicio</p>
                    <p className="text-sm">{formatDate(selectedBackup.fechaInicio)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Fin</p>
                    <p className="text-sm">{formatDate(selectedBackup.fechaFin)}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Tamaño</p>
                  <p className="text-sm font-medium">{formatSize(selectedBackup.tamano)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Tablas</p>
                  <p className="text-sm font-medium">{selectedBackup.totalTablas}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Registros</p>
                  <p className="text-sm font-medium">{selectedBackup.totalRegistros?.toLocaleString('es-CL')}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Archivo</p>
                <p className="text-sm font-mono bg-slate-50 p-2 rounded truncate">{selectedBackup.archivo || '-'}</p>
              </div>

              {selectedBackup.ubicacion && (
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Ubicación</p>
                  <p className="text-xs font-mono bg-slate-50 p-2 rounded truncate">{selectedBackup.ubicacion}</p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Incluye Base64:</p>
                <Badge className={selectedBackup.incluyeBase64 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}>
                  {selectedBackup.incluyeBase64 ? 'Sí' : 'No'}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Verificado:</p>
                <Badge className={selectedBackup.verificado ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                  {selectedBackup.verificado ? 'Sí' : 'No'}
                </Badge>
              </div>

              {selectedBackup.mensajeError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                  <p className="text-[10px] text-red-600 uppercase font-semibold mb-1">Mensaje de Error</p>
                  <p className="text-sm text-red-700">{selectedBackup.mensajeError}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
