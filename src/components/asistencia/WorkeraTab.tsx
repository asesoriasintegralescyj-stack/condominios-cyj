'use client'

/**
 * Pestaña Workera - Integración con API Workera v1.4 CL
 * ---------------------------------------------------
 * Permite sincronizar datos de asistencia desde Workera.
 * Todas las llamadas pasan por un proxy servidor (/api/workera/proxy)
 * para evitar problemas de CORS.
 * 
 * Flujo:
 * 1. Al montar, intenta conectar a Workera via proxy
 * 2. Muestra datos de sucursales, empleados, marcaciones, turnos, permisos
 */

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  RefreshCw, Loader2, Wifi, WifiOff, Users, Clock, Calendar,
  Shield, Building2, MapPin, LogIn, LogOut, AlertCircle,
  CheckCircle2, XCircle, Download, ChevronDown, ChevronUp,
  Activity,
} from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from '@/hooks/use-session'
import {
  workeraApi,
  setConnectionMode,
  getConnectionMode,
  hasCloudflareWorker,
  ATTENDANCE_TYPE_LABELS,
  ORIGIN_LABELS,
  type WorkeraBranchOffice,
  type WorkeraEmployee,
  type WorkeraAttendanceRecord,
  type WorkeraPermission,
  type WorkeraEmployeeSchedule,
  type WorkeraWorkshiftAssign,
  type WorkeraOvertimeAuth,
  type ConnectionMode,
} from '@/lib/workera-api'

// ============================================
// Sub-componentes
// ============================================

function ConnectionStatus({ connected, lastSync, mode }: { connected: boolean; lastSync: string | null; mode: ConnectionMode }) {
  const modeLabel = mode === 'cloudflare' ? 'Cloudflare Chile' : mode === 'proxy' ? 'proxy servidor' : 'navegador'
  return (
    <div className="flex items-center gap-2 text-xs">
      {connected ? (
        <Badge className="bg-green-100 text-green-800 text-[10px] gap-1">
          <Wifi className="w-3 h-3" /> Conectado a Workera
          <span className="text-[9px] opacity-60">({modeLabel})</span>
        </Badge>
      ) : (
        <Badge className="bg-red-100 text-red-800 text-[10px] gap-1">
          <WifiOff className="w-3 h-3" /> Desconectado
        </Badge>
      )}
      {lastSync && (
        <span className="text-gray-400">Última sinc: {lastSync}</span>
      )}
    </div>
  )
}

function WorkeraStats({ stats }: { stats: Record<string, number> }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
      {Object.entries(stats).map(([key, val]) => (
        <Card key={key} className="p-3" style={{
          borderColor: key === 'empleados' ? '#3b82f6' :
                       key === 'marcaciones' ? '#22c55e' :
                       key === 'permisos' ? '#f59e0b' :
                       key === 'horasExtras' ? '#8b5cf6' :
                       key === 'turnos' ? '#06b6d4' : '#d1d5db'
        }}>
          <div className="text-2xl font-bold" style={{
            color: key === 'empleados' ? '#1d4ed8' :
                   key === 'marcaciones' ? '#15803d' :
                   key === 'permisos' ? '#b45309' :
                   key === 'horasExtras' ? '#6d28d9' :
                   key === 'turnos' ? '#0e7490' : '#374151'
          }}>{val}</div>
          <div className="text-xs text-gray-500 capitalize">
            {key === 'empleados' ? 'Empleados' :
             key === 'marcaciones' ? 'Marcaciones' :
             key === 'permisos' ? 'Permisos' :
             key === 'horasExtras' ? 'Hrs. Extras' :
             key === 'turnos' ? 'Turnos Asign.' :
             key === 'sucursales' ? 'Sucursales' : key}
          </div>
        </Card>
      ))}
    </div>
  )
}

// Marcaciones expandible por trabajador
function MarcacionesTable({ records, onLoadingMore, hasMore, loading }: {
  records: WorkeraAttendanceRecord[];
  onLoadingMore: () => void;
  hasMore: boolean;
  loading: boolean;
}) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})

  // Agrupar por trabajador
  const grouped = records.reduce((acc, r) => {
    const code = r.employee.code
    if (!acc[code]) {
      acc[code] = {
        employee: r.employee,
        records: [],
      }
    }
    acc[code].records.push(r)
    return acc
  }, {} as Record<number, { employee: WorkeraAttendanceRecord['employee']; records: WorkeraAttendanceRecord[] }>)

  return (
    <div className="space-y-2">
      <div className="text-sm text-gray-600 flex items-center gap-2">
        <Clock className="w-4 h-4" />
        {records.length} marcaciones de {Object.keys(grouped).length} trabajadores
      </div>

      {Object.entries(grouped).map(([code, group]) => {
        const isOpen = expanded[Number(code)]
        const sortedRecords = [...group.records].sort((a, b) =>
          new Date(a.attendanceDate).getTime() - new Date(b.attendanceDate).getTime()
        )

        return (
          <Card key={code}>
            <CardContent className="p-3">
              <button
                onClick={() => setExpanded(prev => ({ ...prev, [code]: !isOpen }))}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-sm">{group.employee.name} {group.employee.lastName}</span>
                  <Badge variant="outline" className="text-[10px]">{group.employee.code}</Badge>
                  {group.employee.department && (
                    <span className="text-xs text-gray-500">({group.employee.department})</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-800 text-[10px]">
                    {group.records.length} reg.
                  </Badge>
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {isOpen && (
                <div className="mt-3 border-t pt-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-2">Fecha/Hora</th>
                        <th className="text-left p-2">Tipo</th>
                        <th className="text-left p-2">Origen</th>
                        <th className="text-left p-2">Dispositivo</th>
                        <th className="text-left p-2">Estado</th>
                        <th className="text-left p-2">Dirección</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedRecords.map((rec, idx) => {
                        const fecha = new Date(rec.attendanceDate)
                        return (
                          <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="p-2 font-mono">
                              {fecha.toLocaleDateString('es-CL')} {fecha.toLocaleTimeString('es-CL')}
                            </td>
                            <td className="p-2">
                              <Badge className={`text-[10px] ${
                                rec.attendanceType === 0 ? 'bg-green-100 text-green-800' :
                                rec.attendanceType === 1 ? 'bg-red-100 text-red-800' :
                                rec.attendanceType === 2 ? 'bg-orange-100 text-orange-800' :
                                rec.attendanceType === 3 ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {rec.attendanceType === 0 ? <LogIn className="w-2.5 h-2.5 mr-0.5" /> :
                                 rec.attendanceType === 1 ? <LogOut className="w-2.5 h-2.5 mr-0.5" /> : null}
                                {ATTENDANCE_TYPE_LABELS[rec.attendanceType] || `Tipo ${rec.attendanceType}`}
                              </Badge>
                            </td>
                            <td className="p-2">
                              <Badge variant="outline" className="text-[10px]">
                                {ORIGIN_LABELS[rec.originCode] || rec.originCode}
                              </Badge>
                            </td>
                            <td className="p-2 text-gray-600">{rec.deviceName || '-'}</td>
                            <td className="p-2">
                              <Badge className={`text-[10px] ${
                                rec.attendanceStatus === 'ACTIVO' ? 'bg-green-100 text-green-800' :
                                rec.attendanceStatus === 'MODIFICADO' ? 'bg-amber-100 text-amber-800' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {rec.attendanceStatus}
                              </Badge>
                            </td>
                            <td className="p-2 text-gray-500 truncate max-w-[200px]">{rec.address || '-'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      {hasMore && (
        <div className="text-center">
          <Button variant="outline" size="sm" onClick={onLoadingMore} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
            Cargar más marcaciones
          </Button>
        </div>
      )}
    </div>
  )
}

// Permisos table
function PermisosTable({ permisos }: { permisos: WorkeraPermission[] }) {
  if (permisos.length === 0) {
    return <div className="text-center py-6 text-gray-400 text-sm">No hay permisos en el rango seleccionado</div>
  }
  return (
    <div className="space-y-2">
      <div className="text-sm text-gray-600 flex items-center gap-2">
        <Shield className="w-4 h-4 text-amber-600" />
        {permisos.length} permisos/licencias encontrados
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="text-left p-2">Trabajador</th>
            <th className="text-left p-2">Tipo</th>
            <th className="text-left p-2">Permiso</th>
            <th className="text-left p-2">Desde</th>
            <th className="text-left p-2">Hasta</th>
            <th className="text-left p-2">Comentario</th>
          </tr>
        </thead>
        <tbody>
          {permisos.map((p, idx) => (
            <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
              <td className="p-2">
                <div className="font-medium">{p.employee.name} {p.employee.lastName}</div>
                <div className="text-gray-400 text-[10px]">{p.employee.code}</div>
              </td>
              <td className="p-2">
                <Badge className={`text-[10px] ${
                  p.permissionType === 'LICENCIA_MEDICA' ? 'bg-red-100 text-red-800' :
                  p.permissionType === 'VACACIONES' ? 'bg-blue-100 text-blue-800' :
                  p.permissionType === 'PRENATAL' || p.permissionType === 'POSTNATAL' ? 'bg-pink-100 text-pink-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {p.permissionType}
                </Badge>
              </td>
              <td className="p-2">{p.permissionName}</td>
              <td className="p-2 font-mono">{new Date(p.start).toLocaleString('es-CL')}</td>
              <td className="p-2 font-mono">{new Date(p.end).toLocaleString('es-CL')}</td>
              <td className="p-2 text-gray-500">{p.comment || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Empleados table
function EmpleadosTable({ empleados }: { empleados: WorkeraEmployee[] }) {
  const [search, setSearch] = useState('')
  const filtered = search
    ? empleados.filter(e =>
        `${e.name} ${e.lastName} ${e.identification} ${e.code}`
          .toLowerCase().includes(search.toLowerCase())
      )
    : empleados

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600 flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-600" />
          {filtered.length} empleados
        </div>
        <Input
          placeholder="Buscar..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-48 h-8 text-xs"
        />
      </div>
      <div className="max-h-[500px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b bg-gray-50">
              <th className="text-left p-2">Código</th>
              <th className="text-left p-2">Nombre</th>
              <th className="text-left p-2">RUT</th>
              <th className="text-left p-2">Sucursal</th>
              <th className="text-left p-2">Depto</th>
              <th className="text-left p-2">Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map((e, idx) => (
              <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-2 font-mono font-bold">{e.code}</td>
                <td className="p-2 font-medium">{e.name} {e.lastName}</td>
                <td className="p-2 font-mono">{e.identification}</td>
                <td className="p-2 text-gray-600">{e.branchOfficeName}</td>
                <td className="p-2 text-gray-600">{e.departmentName}</td>
                <td className="p-2">
                  <Badge className={`text-[10px] ${
                    e.employeeStatus === 'ACTIVO' ? 'bg-green-100 text-green-800' :
                    e.employeeStatus === 'INACTIVO' ? 'bg-red-100 text-red-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {e.employeeStatus}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 100 && (
          <div className="text-center py-2 text-gray-400 text-xs">
            Mostrando 100 de {filtered.length}. Use el buscador para filtrar.
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// Componente Principal
// ============================================
export function WorkeraTab() {
  const { isAdmin } = useSession()

  // Estado de conexión
  const [connectionError, setConnectionError] = useState<string | null>(null)

  // Datos
  const [empleados, setEmpleados] = useState<WorkeraEmployee[]>([])
  const [marcaciones, setMarcaciones] = useState<WorkeraAttendanceRecord[]>([])
  const [permisos, setPermisos] = useState<WorkeraPermission[]>([])
  const [sucursales, setSucursales] = useState<WorkeraBranchOffice[]>([])
  const [turnos, setTurnos] = useState<WorkeraWorkshiftAssign[]>([])
  const [horasExtras, setHorasExtras] = useState<WorkeraOvertimeAuth[]>([])
  const [horarios, setHorarios] = useState<WorkeraEmployeeSchedule[]>([])

  // Estado
  const [connected, setConnected] = useState(false)
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeView, setActiveView] = useState('marcaciones')
  const [loadingView, setLoadingView] = useState<Record<string, boolean>>({})

  // Filtros
  const today = new Date()
  const [fechaDesde, setFechaDesde] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
  )
  const [fechaHasta, setFechaHasta] = useState(today.toISOString().split('T')[0])
  const [selectedBranch, setSelectedBranch] = useState('')
  const [selectedDept, setSelectedDept] = useState('')
  const [selectedEmployee, setSelectedEmployee] = useState('')

  // Paginación marcaciones
  const [attendancePage, setAttendancePage] = useState(1)
  const [attendanceTotalPages, setAttendanceTotalPages] = useState(1)

  // Verificar conexión al montar - cascada de 3 modos
  useEffect(() => {
    const testConnection = async () => {
      try {
        setLoadingView(prev => ({ ...prev, test: true }))
        
        // MODO 1: Cloudflare Worker (desde Santiago, Chile - sin geo-block)
        if (hasCloudflareWorker()) {
          try {
            const branches = await workeraApi.getBranchOffices(1)
            setSucursales(branches.data || [])
            setConnected(true)
            setConnectionError(null)
            toast.success('Conectado via Cloudflare Worker (Chile)')
            return
          } catch (cfErr: any) {
            console.warn('Cloudflare Worker fallo:', cfErr.message)
            // Continuar al siguiente modo
          }
        }

        // MODO 2: Proxy Servidor (Edge Function Vercel - puede ser geo-bloqueado)
        setConnectionMode('proxy')
        try {
          const branches = await workeraApi.getBranchOffices(1)
          setSucursales(branches.data || [])
          setConnected(true)
          setConnectionError(null)
          toast.success('Conectado via proxy servidor')
          return
        } catch (proxyErr: any) {
          const isGeoBlocked = proxyErr.geoBlocked || 
            proxyErr.message?.includes('Country request') || 
            proxyErr.message?.includes('406') ||
            proxyErr.message?.includes('bloqueada');

          if (!isGeoBlocked) throw proxyErr
          console.warn('Proxy geo-bloqueado, intentando modo directo...')
        }

        // MODO 3: Directo desde navegador (requiere credenciales + CORS)
        const credRes = await fetch('/api/workera/credentials')
        if (credRes.ok) {
          const creds = await credRes.json()
          setConnectionMode('direct', creds.apiUser, creds.apiKey)
          const branches = await workeraApi.getBranchOffices(1)
          setSucursales(branches.data || [])
          setConnected(true)
          setConnectionError(null)
          toast.success('Conectado en modo directo (desde tu navegador)')
          return
        }

        // Todos los modos fallaron
        setConnected(false)
        setConnectionError(
          'No se pudo conectar con Workera. El proxy del servidor esta bloqueado geograficamente y las llamadas directas desde el navegador son bloqueadas por CORS. ' +
          'SOLUCION: Desplegar el Cloudflare Worker incluido en /workera-proxy-worker/ (ver README). ' +
          'El Worker corre en Santiago (Chile) y evita ambos bloqueos. Costo: GRATIS (100,000 peticiones/dia).'
        )
      } catch (err: any) {
        setConnected(false)
        setConnectionError(err.message)
      } finally {
        setLoadingView(prev => ({ ...prev, test: false }))
      }
    }
    testConnection()
  }, [])

  // Sincronización principal
  const syncData = useCallback(async (view?: string) => {
    const targetView = view || activeView
    setLoadingView(prev => ({ ...prev, [targetView]: true }))
    setConnectionError(null)

    try {
      const commonParams = {
        branchOffice: selectedBranch || undefined,
        department: selectedDept || undefined,
        employees: selectedEmployee || undefined,
      }

      switch (targetView) {
        case 'empleados': {
          const res = await workeraApi.getAllEmployees()
          setEmpleados(res)
          setConnected(true)
          break
        }
        case 'marcaciones': {
          const res = await workeraApi.getAttendance({
            start: fechaDesde,
            end: fechaHasta,
            page: view ? 1 : attendancePage,
            employeeCode: selectedEmployee || undefined,
            branchOfficeCode: selectedBranch || undefined,
            departmentCode: selectedDept || undefined,
          })
          if (view) {
            setMarcaciones(res.data || [])
          } else {
            setMarcaciones(prev => [...prev, ...(res.data || [])])
          }
          setAttendanceTotalPages(res.totalPages || 1)
          setConnected(true)
          break
        }
        case 'permisos': {
          const res = await workeraApi.getAllPermissions({
            start: fechaDesde,
            end: fechaHasta,
            ...commonParams,
          })
          setPermisos(res)
          setConnected(true)
          break
        }
        case 'turnos': {
          const res = await workeraApi.getWorkshiftAssigns({
            start: fechaDesde,
            end: fechaHasta,
            ...commonParams,
          })
          setTurnos(res.data || [])
          setConnected(true)
          break
        }
        case 'horarios': {
          const res = await workeraApi.getAllSchedules({
            start: fechaDesde,
            end: fechaHasta,
            ...commonParams,
          })
          setHorarios(res)
          setConnected(true)
          break
        }
        case 'horasExtras': {
          const res = await workeraApi.getAllOvertimeAuthorizations({
            start: fechaDesde,
            end: fechaHasta,
            ...commonParams,
          })
          setHorasExtras(res)
          setConnected(true)
          break
        }
      }

      setLastSync(new Date().toLocaleTimeString('es-CL'))
    } catch (err: any) {
      setConnected(false)
      setConnectionError(err.message)
      if (err.message?.includes('Country request') || err.message?.includes('406')) {
        setConnectionError('Workera bloquea peticiones desde servidores extranjeros. Se requiere un proxy en Chile.')
      }
      toast.error(`Error al sincronizar: ${err.message}`)
    } finally {
      setLoadingView(prev => ({ ...prev, [targetView]: false }))
      setLoading(false)
    }
  }, [activeView, fechaDesde, fechaHasta, selectedBranch, selectedDept, selectedEmployee, attendancePage])

  // Sincronizar todo
  const syncAll = async () => {
    setLoading(true)
    setConnectionError(null)
    try {
      // Sucursales primero
      const branches = await workeraApi.getAllBranchOffices()
      setSucursales(branches)

      // Luego el view activo
      await syncData(activeView)
      toast.success('Datos sincronizados con Workera')
    } catch (err: any) {
      setConnectionError(err.message)
      toast.error(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Cargar más marcaciones
  const loadMoreAttendance = () => {
    const nextPage = attendancePage + 1
    setAttendancePage(nextPage)
    syncData('marcaciones')
  }

  // Cambiar view
  const handleViewChange = (view: string) => {
    setActiveView(view)
    setAttendancePage(1)
  }

  // Efecto al cambiar view
  useEffect(() => {
    syncData(activeView)
  }, [activeView])

  // Obtener departamentos filtrados
  const departamentos = sucursales.length > 0 ? [] : []
  // Los departamentos se pueden obtener de los empleados
  const deptFromEmployees = Array.from(new Set(
    empleados.filter(e => selectedBranch ? e.branchOfficeCode === selectedBranch : true)
      .map(e => e.departmentCode)
  ))

  // Convertir segundos a horas:minutos
  const formatSeconds = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return `${hrs}h ${mins}m`
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-[#0f2044] flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Workera API
          </h3>
          <ConnectionStatus connected={connected} lastSync={lastSync} mode={getConnectionMode()} />
        </div>
        <Button
          onClick={syncAll}
          disabled={loading}
          size="sm"
          className="bg-[#0f2044] hover:bg-[#1a3155]"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-1" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-1" />
          )}
          Sincronizar
        </Button>
      </div>

      {/* Info / Error */}
      {connectionError ? (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 text-sm">
            {connectionError}
          </AlertDescription>
        </Alert>
      ) : connected ? (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 text-sm">
            Conectado a Workera v1.4 CL ({getConnectionMode() === 'cloudflare' ? 'vía Cloudflare Worker en Santiago, Chile' : getConnectionMode() === 'proxy' ? 'vía proxy servidor' : 'vía tu navegador'}). Datos en tiempo real del sistema de control de asistencia.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 text-sm">
            Conectando con Workera...
          </AlertDescription>
        </Alert>
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs">Desde</Label>
              <Input
                type="date"
                value={fechaDesde}
                onChange={e => setFechaDesde(e.target.value)}
                className="h-8 text-xs w-36"
              />
            </div>
            <div>
              <Label className="text-xs">Hasta</Label>
              <Input
                type="date"
                value={fechaHasta}
                onChange={e => setFechaHasta(e.target.value)}
                className="h-8 text-xs w-36"
              />
            </div>
            {sucursales.length > 0 && (
              <div>
                <Label className="text-xs">Sucursal</Label>
                <Select value={selectedBranch} onValueChange={v => { setSelectedBranch(v); setSelectedDept('') }}>
                  <SelectTrigger className="h-8 text-xs w-48">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todas</SelectItem>
                    {sucursales.map(s => (
                      <SelectItem key={s.code} value={s.code}>{s.name} ({s.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button size="sm" variant="outline" onClick={() => syncData(activeView)} disabled={loading}>
              <RefreshCw className={`w-3 h-3 mr-1 ${loadingView[activeView] ? 'animate-spin' : ''}`} />
              Aplicar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats resumen */}
      <WorkeraStats stats={{
        empleados: empleados.length || (activeView === 'empleados' ? 0 : undefined as any),
        marcaciones: marcaciones.length,
        permisos: permisos.length,
        horasExtras: horasExtras.length,
        turnos: turnos.length,
        sucursales: sucursales.length,
      }} />

      {/* View Tabs */}
      <div className="flex items-center gap-1 flex-wrap">
        {[
          { id: 'marcaciones', label: 'Marcaciones', icon: <Clock className="w-3.5 h-3.5" /> },
          { id: 'empleados', label: 'Empleados', icon: <Users className="w-3.5 h-3.5" /> },
          { id: 'permisos', label: 'Permisos', icon: <Shield className="w-3.5 h-3.5" /> },
          { id: 'turnos', label: 'Turnos', icon: <Calendar className="w-3.5 h-3.5" /> },
          { id: 'horarios', label: 'Horarios', icon: <Clock className="w-3.5 h-3.5" /> },
          { id: 'horasExtras', label: 'Hrs. Extras', icon: <Activity className="w-3.5 h-3.5" /> },
        ].map(tab => (
          <Button
            key={tab.id}
            variant={activeView === tab.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleViewChange(tab.id)}
            className={`text-xs ${activeView === tab.id ? 'bg-[#0f2044]' : ''}`}
          >
            {tab.icon}
            <span className="ml-1">{tab.label}</span>
          </Button>
        ))}
      </div>

      {/* Content */}
      <Card>
        <CardContent className="p-3">
          {loadingView[activeView] && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#0f2044]" />
            </div>
          )}

          {!loadingView[activeView] && activeView === 'empleados' && (
            <EmpleadosTable empleados={empleados} />
          )}

          {!loadingView[activeView] && activeView === 'marcaciones' && (
            <MarcacionesTable
              records={marcaciones}
              onLoadingMore={loadMoreAttendance}
              hasMore={attendancePage < attendanceTotalPages}
              loading={loadingView['marcaciones']}
            />
          )}

          {!loadingView[activeView] && activeView === 'permisos' && (
            <PermisosTable permisos={permisos} />
          )}

          {!loadingView[activeView] && activeView === 'turnos' && (
            <div className="space-y-2">
              <div className="text-sm text-gray-600 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-600" />
                {turnos.length} turnos asignados
              </div>
              {turnos.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">No hay turnos en el rango seleccionado</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-2">Trabajador</th>
                      <th className="text-left p-2">Turno</th>
                      <th className="text-left p-2">Desde</th>
                      <th className="text-left p-2">Hasta</th>
                      <th className="text-left p-2">Tipo</th>
                      <th className="text-left p-2">Periodo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {turnos.map((t, idx) => (
                      <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="p-2 font-medium">{t.employee.name} {t.employee.lastName}</td>
                        <td className="p-2">
                          <Badge className="bg-cyan-100 text-cyan-800 text-[10px]">{t.workshiftName}</Badge>
                        </td>
                        <td className="p-2 font-mono">{t.start}</td>
                        <td className="p-2 font-mono">{t.end}</td>
                        <td className="p-2">
                          <Badge variant={t.flexible ? 'outline' : 'secondary'} className="text-[10px]">
                            {t.flexible ? 'Flexible' : 'Fijo'}
                          </Badge>
                        </td>
                        <td className="p-2">{t.period}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {!loadingView[activeView] && activeView === 'horarios' && (
            <div className="space-y-2">
              <div className="text-sm text-gray-600 flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-600" />
                {horarios.length} trabajadores con horarios asignados
              </div>
              {horarios.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">No hay horarios en el rango seleccionado (máx. 60 días)</div>
              ) : (
                horarios.map((h, idx) => (
                  <Card key={idx}>
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-sm">{h.employee.name} {h.employee.lastName}</span>
                        <Badge variant="outline" className="text-[10px]">{h.employee.code}</Badge>
                      </div>
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left p-1.5">Fecha</th>
                            <th className="text-left p-1.5">Turno</th>
                            <th className="text-left p-1.5">Horario</th>
                            <th className="text-left p-1.5">Entrada</th>
                            <th className="text-left p-1.5">Salida</th>
                          </tr>
                        </thead>
                        <tbody>
                          {h.schedules.map((s, sIdx) => (
                            <tr key={sIdx} className="border-b last:border-0">
                              <td className="p-1.5 font-mono">{s.date}</td>
                              <td className="p-1.5 text-cyan-700">{s.workshiftName}</td>
                              <td className="p-1.5">{s.scheduleName}</td>
                              <td className="p-1.5 font-mono">{s.start ? new Date(s.start).toLocaleTimeString('es-CL') : '-'}</td>
                              <td className="p-1.5 font-mono">{s.end ? new Date(s.end).toLocaleTimeString('es-CL') : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {!loadingView[activeView] && activeView === 'horasExtras' && (
            <div className="space-y-2">
              <div className="text-sm text-gray-600 flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-600" />
                {horasExtras.length} autorizaciones de horas extras
              </div>
              {horasExtras.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">No hay horas extras autorizadas en el rango seleccionado</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-2">Trabajador</th>
                      <th className="text-left p-2">Fecha</th>
                      <th className="text-left p-2">Entrada</th>
                      <th className="text-left p-2">Salida</th>
                      <th className="text-left p-2">Fuera Horario</th>
                      <th className="text-left p-2">Festivo</th>
                      <th className="text-left p-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {horasExtras.map((h, idx) => (
                      <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="p-2 font-medium">{h.employee.name} {h.employee.lastName}</td>
                        <td className="p-2 font-mono">{h.authDate}</td>
                        <td className="p-2">{formatSeconds(h.scheduleInAuthTime)}</td>
                        <td className="p-2">{formatSeconds(h.scheduleOutAuthTime)}</td>
                        <td className="p-2">{formatSeconds(h.withoutScheduleAuthTime)}</td>
                        <td className="p-2">{formatSeconds(h.holidayExtraAuthTime)}</td>
                        <td className="p-2">
                          <Badge className={`text-[10px] ${
                            h.assigned ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {h.assigned ? 'Asignada' : 'Pendiente'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
