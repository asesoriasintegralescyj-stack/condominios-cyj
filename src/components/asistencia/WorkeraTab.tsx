'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  Wifi, WifiOff, RefreshCw, Loader2, Search, Users, Clock,
  MapPin, ChevronDown, ChevronRight, Eye, CalendarDays,
  AlertTriangle, CheckCircle, Info, Database, Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  workeraApi,
  setConnectionMode,
  getConnectionMode,
  type ConnectionMode,
  type WorkeraEmployee,
  type WorkeraAttendanceRecord,
  type WorkeraBranchOffice,
  ATTENDANCE_TYPE_LABELS,
  ORIGIN_LABELS,
} from '@/lib/workera-api'

// ============================================
// Tipos de estado de conexión
// ============================================
interface DiagResult {
  status: string
  runtime: string
  timestamp: string
  apiBase: string
  credentials: string
  cacheSize: number
  edgeLocation: { country: string; city: string }
}

interface ConnectionState {
  status: 'idle' | 'testing' | 'connected' | 'error'
  diag?: DiagResult
  geoTest?: { geoTest: string; data?: unknown; error?: string }
  error?: string
}

// ============================================
// WorkeraTab Component
// ============================================
export default function WorkeraTab() {
  const [connection, setConnection] = useState<ConnectionState>({ status: 'idle' })
  const [connectionMode, setConnectionModeState] = useState<ConnectionMode>(getConnectionMode())
  const [activeTab, setActiveTab] = useState<'employees' | 'attendance'>('employees')

  // Employees
  const [employees, setEmployees] = useState<WorkeraEmployee[]>([])
  const [employeesPage, setEmployeesPage] = useState(1)
  const [employeesTotalPages, setEmployeesTotalPages] = useState(1)
  const [employeesTotal, setEmployeesTotal] = useState(0)
  const [employeesSearch, setEmployeesSearch] = useState('')
  const [employeesLoading, setEmployeesLoading] = useState(false)

  // Branches
  const [branches, setBranches] = useState<WorkeraBranchOffice[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string>('')
  const [branchesLoading, setBranchesLoading] = useState(false)

  // Attendance
  const [attendance, setAttendance] = useState<WorkeraAttendanceRecord[]>([])
  const [attendancePage, setAttendancePage] = useState(1)
  const [attendanceTotalPages, setAttendanceTotalPages] = useState(1)
  const [attendanceTotal, setAttendanceTotal] = useState(0)
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [selectedEmployeeCode, setSelectedEmployeeCode] = useState<string>('')
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])

  // Detail dialog
  const [selectedAttendance, setSelectedAttendance] = useState<WorkeraAttendanceRecord | null>(null)

  // Config collapsible
  const [configOpen, setConfigOpen] = useState(false)

  // Test connection
  const handleTestConnection = useCallback(async () => {
    setConnection({ status: 'testing' })
    try {
      // Probar usando la API real con el modo actual de conexión
      const result = await workeraApi.getBranchOffices(1)
      setConnection({
        status: 'connected',
        diag: {
          status: 'ok',
          runtime: connectionMode,
          timestamp: new Date().toISOString(),
          apiBase: 'https://api.workera.com/apiClient/v1',
          credentials: 'embedded',
          cacheSize: 0,
          edgeLocation: { country: 'CL (browser)', city: 'user-location' },
        },
        geoTest: { geoTest: 'OK', data: result },
      })
      toast.success(`Conexión exitosa (modo: ${connectionMode})`)
    } catch (err: any) {
      const isGeo = err.message?.includes('geo') || err.message?.includes('406') || err.message?.includes('Country') || err.geoBlocked
      setConnection({
        status: 'error',
        error: isGeo
          ? `Geo-block en modo ${connectionMode}. Workera bloquea peticiones desde este origen.`
          : err.message || 'Error desconocido',
        geoTest: { geoTest: 'FAILED', error: err.message },
      })
      toast.error(isGeo ? `Geo-block (${connectionMode}). Intenta modo "Directo" si estás en Chile.` : `Error: ${err.message}`)
    }
  }, [connectionMode])

  // Load employees
  const loadEmployees = useCallback(async (page: number) => {
    setEmployeesLoading(true)
    try {
      const result = await workeraApi.getEmployees({
        page,
        employees: employeesSearch || undefined,
        branchOffice: selectedBranch || undefined,
      })
      setEmployees(result.data || [])
      setEmployeesPage(result.page)
      setEmployeesTotalPages(result.totalPages)
      setEmployeesTotal(result.totalResult)
    } catch (err: any) {
      toast.error(`Error empleados: ${err.message}`)
    } finally {
      setEmployeesLoading(false)
    }
  }, [employeesSearch, selectedBranch])

  // Load branches
  const loadBranches = useCallback(async () => {
    setBranchesLoading(true)
    try {
      const result = await workeraApi.getBranchOffices(1)
      setBranches(result.data || [])
    } catch {
      // silent
    } finally {
      setBranchesLoading(false)
    }
  }, [])

  // Load attendance
  const loadAttendance = useCallback(async (page: number) => {
    setAttendanceLoading(true)
    try {
      const result = await workeraApi.getAttendance({
        start: dateFrom,
        end: dateTo,
        page,
        employees: selectedEmployeeCode || undefined,
        branchOffice: selectedBranch || undefined,
      })
      setAttendance(result.data || [])
      setAttendancePage(result.page)
      setAttendanceTotalPages(result.totalPages)
      setAttendanceTotal(result.totalResult)
    } catch (err: any) {
      toast.error(`Error asistencia: ${err.message}`)
    } finally {
      setAttendanceLoading(false)
    }
  }, [dateFrom, dateTo, selectedEmployeeCode, selectedBranch])

  // Auto-load on connect
  useEffect(() => {
    if (connection.status === 'connected') {
      loadBranches()
      loadEmployees(1)
    }
  }, [connection.status, loadBranches, loadEmployees])

  // Reload attendance on filter change
  useEffect(() => {
    if (connection.status === 'connected' && activeTab === 'attendance') {
      loadAttendance(1)
    }
  }, [dateFrom, dateTo, selectedEmployeeCode, selectedBranch, activeTab, loadAttendance])

  const handleModeChange = (mode: ConnectionMode) => {
    setConnectionMode(mode)
    setConnectionModeState(mode)
    setConnection({ status: 'idle' })
    toast.info(`Modo cambiado a: ${mode}`)
  }

  const getEmployeeName = (code: string | number) => {
    const emp = employees.find(e => e.code === String(code))
    return emp ? `${emp.name} ${emp.lastName}` : String(code)
  }

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            {connection.status === 'connected' ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : connection.status === 'error' ? (
              <WifiOff className="h-4 w-4 text-red-500" />
            ) : (
              <Wifi className="h-4 w-4 text-gray-400" />
            )}
            Estado de Conexión Workera
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Badges */}
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant={
              connection.status === 'connected' ? 'default' :
              connection.status === 'error' ? 'destructive' : 'secondary'
            }>
              {connection.status === 'idle' && 'Sin probar'}
              {connection.status === 'testing' && 'Probando...'}
              {connection.status === 'connected' && 'Conectado'}
              {connection.status === 'error' && 'Error'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              Modo: {connectionMode}
            </Badge>
            {connection.diag && (
              <>
                <Badge variant="outline" className="text-xs">
                  Edge: {connection.diag.edgeLocation?.country || '?'} / {connection.diag.edgeLocation?.city || '?'}
                </Badge>
                <Badge variant={connection.diag.credentials === 'env_vars' ? 'default' : 'secondary'} className="text-xs">
                  Creds: {connection.diag.credentials}
                </Badge>
              </>
            )}
          </div>

          {/* Error */}
          {connection.error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{connection.error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={handleTestConnection} disabled={connection.status === 'testing'}>
              {connection.status === 'testing' ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Probar Conexión
            </Button>
            <Select value={connectionMode} onValueChange={v => handleModeChange(v as ConnectionMode)}>
              <SelectTrigger className="h-8 text-xs w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="proxy">
                  <Zap className="h-3 w-3 inline mr-1" /> Proxy (Vercel Edge)
                </SelectItem>
                <SelectItem value="cloudflare">
                  <Zap className="h-3 w-3 inline mr-1" /> Cloudflare Worker
                </SelectItem>
                <SelectItem value="direct">
                  <Zap className="h-3 w-3 inline mr-1" /> Directo (Browser)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Config */}
          <Collapsible open={configOpen} onOpenChange={setConfigOpen}>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              {configOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Información de configuración
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="bg-muted rounded-md p-3 text-xs space-y-1 font-mono">
                <div className="flex items-center gap-2">
                  <Database className="h-3 w-3" />
                  <span>API: api.workera.com/apiClient/v1</span>
                </div>
                <div className="flex items-center gap-2">
                  <Database className="h-3 w-3" />
                  <span>User: administracionlagunanorte@gmail.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <Database className="h-3 w-3" />
                  <span>Key: 2aa45c...08e3</span>
                </div>
                <p className="text-muted-foreground mt-2">
                  Credenciales embebidas en Edge Function. Para mayor seguridad, configura WORKERA_API_USER y WORKERA_API_KEY como Environment Variables en Vercel.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Main content */}
      {connection.status === 'connected' && (
        <>
          {/* Tab selector */}
          <div className="flex gap-2">
            <Button size="sm" variant={activeTab === 'employees' ? 'default' : 'outline'} onClick={() => setActiveTab('employees')}>
              <Users className="h-3 w-3" /> Empleados
            </Button>
            <Button size="sm" variant={activeTab === 'attendance' ? 'default' : 'outline'} onClick={() => setActiveTab('attendance')}>
              <Clock className="h-3 w-3" /> Asistencia
            </Button>
          </div>

          {/* EMPLOYEES TAB */}
          {activeTab === 'employees' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Empleados Workera
                    <Badge variant="secondary" className="text-xs">{employeesTotal} total</Badge>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Filters */}
                <div className="flex flex-wrap gap-2 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-xs text-muted-foreground mb-1 block">Código ficha</label>
                    <div className="flex gap-1">
                      <Input
                        placeholder="Ej: 12345678"
                        value={employeesSearch}
                        onChange={e => setEmployeesSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && loadEmployees(1)}
                        className="h-8 text-sm"
                      />
                      <Button size="sm" variant="outline" onClick={() => loadEmployees(1)}>
                        <Search className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="min-w-[180px]">
                    <label className="text-xs text-muted-foreground mb-1 block">Sucursal</label>
                    <Select value={selectedBranch} onValueChange={v => { setSelectedBranch(v); loadEmployees(1) }}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {branches.filter(b => b.status === 'ACTIVO').map(b => (
                          <SelectItem key={b.code} value={b.code}>{b.name} ({b.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Table */}
                {employeesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : employees.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No se encontraron empleados</p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-md border overflow-auto max-h-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Código</TableHead>
                            <TableHead className="text-xs">Nombre</TableHead>
                            <TableHead className="text-xs">RUT</TableHead>
                            <TableHead className="text-xs">Sucursal</TableHead>
                            <TableHead className="text-xs">Estado</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {employees.map((emp) => (
                            <TableRow key={emp.code} className="text-sm cursor-pointer hover:bg-muted/50"
                              onClick={() => {
                                setSelectedEmployeeCode(emp.code)
                                setActiveTab('attendance')
                              }}>
                              <TableCell className="font-mono text-xs">{emp.code}</TableCell>
                              <TableCell>
                                <div className="font-medium">{emp.name} {emp.lastName}</div>
                                {emp.corporateMail && <div className="text-xs text-muted-foreground">{emp.corporateMail}</div>}
                              </TableCell>
                              <TableCell className="text-xs font-mono">{emp.identification}</TableCell>
                              <TableCell className="text-xs">{emp.branchOfficeName}</TableCell>
                              <TableCell>
                                <Badge variant={emp.employeeStatus === 'ACTIVO' ? 'default' : 'secondary'} className="text-xs">
                                  {emp.employeeStatus}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {employeesTotalPages > 1 && (
                      <div className="flex items-center justify-between text-xs">
                        <span>Página {employeesPage} de {employeesTotalPages}</span>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" disabled={employeesPage <= 1} onClick={() => loadEmployees(employeesPage - 1)}>Anterior</Button>
                          <Button size="sm" variant="outline" disabled={employeesPage >= employeesTotalPages} onClick={() => loadEmployees(employeesPage + 1)}>Siguiente</Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* ATTENDANCE TAB */}
          {activeTab === 'attendance' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Registros de Asistencia
                    <Badge variant="secondary" className="text-xs">{attendanceTotal} registros</Badge>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Filters */}
                <div className="flex flex-wrap gap-2 items-end">
                  <div className="min-w-[130px]">
                    <label className="text-xs text-muted-foreground mb-1 block">Desde</label>
                    <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="min-w-[130px]">
                    <label className="text-xs text-muted-foreground mb-1 block">Hasta</label>
                    <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="flex-1 min-w-[180px]">
                    <label className="text-xs text-muted-foreground mb-1 block">Código ficha</label>
                    <Input placeholder="Todos" value={selectedEmployeeCode} onChange={e => setSelectedEmployeeCode(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="min-w-[160px]">
                    <label className="text-xs text-muted-foreground mb-1 block">Sucursal</label>
                    <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {branches.filter(b => b.status === 'ACTIVO').map(b => (
                          <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Table */}
                {attendanceLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : attendance.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No hay registros para este período</p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-md border overflow-auto max-h-[500px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Fecha/Hora</TableHead>
                            <TableHead className="text-xs">Empleado</TableHead>
                            <TableHead className="text-xs">Tipo</TableHead>
                            <TableHead className="text-xs">Estado</TableHead>
                            <TableHead className="text-xs">Origen</TableHead>
                            <TableHead className="text-xs"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {attendance.map((att, idx) => (
                            <TableRow key={idx} className="text-sm">
                              <TableCell className="text-xs font-mono whitespace-nowrap">
                                {new Date(att.attendanceDate).toLocaleString('es-CL', {
                                  day: '2-digit', month: '2-digit',
                                  hour: '2-digit', minute: '2-digit',
                                })}
                              </TableCell>
                              <TableCell>
                                <div className="font-medium text-xs">{att.employee?.name} {att.employee?.lastName}</div>
                                <div className="text-xs text-muted-foreground font-mono">Ficha: {att.employee?.code}</div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {ATTENDANCE_TYPE_LABELS[att.attendanceType] || `Tipo ${att.attendanceType}`}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={att.attendanceStatus === 'ACTIVO' ? 'default' : 'secondary'} className="text-xs">
                                  {att.attendanceStatus}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs">{att.originCode || att.origin}</TableCell>
                              <TableCell>
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setSelectedAttendance(att)}>
                                  <Eye className="h-3 w-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {attendanceTotalPages > 1 && (
                      <div className="flex items-center justify-between text-xs">
                        <span>Página {attendancePage} de {attendanceTotalPages} ({attendanceTotal} total)</span>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" disabled={attendancePage <= 1} onClick={() => loadAttendance(attendancePage - 1)}>Anterior</Button>
                          <Button size="sm" variant="outline" disabled={attendancePage >= attendanceTotalPages} onClick={() => loadAttendance(attendancePage + 1)}>Siguiente</Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Attendance Detail Dialog */}
          <Dialog open={!!selectedAttendance} onOpenChange={() => setSelectedAttendance(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Detalle de Marcación</DialogTitle>
                <DialogDescription>Información completa del registro</DialogDescription>
              </DialogHeader>
              {selectedAttendance && (
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground text-xs">Empleado</span>
                      <p className="font-medium">{selectedAttendance.employee?.name} {selectedAttendance.employee?.lastName}</p>
                      <p className="text-xs font-mono">Ficha: {selectedAttendance.employee?.code} | RUT: {selectedAttendance.employee?.identification}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Fecha/Hora</span>
                      <p className="font-medium font-mono">{new Date(selectedAttendance.attendanceDate).toLocaleString('es-CL')}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground text-xs">Tipo</span>
                      <Badge variant="outline">{ATTENDANCE_TYPE_LABELS[selectedAttendance.attendanceType] || `Tipo ${selectedAttendance.attendanceType}`}</Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Estado</span>
                      <Badge variant={selectedAttendance.attendanceStatus === 'ACTIVO' ? 'default' : 'secondary'}>{selectedAttendance.attendanceStatus}</Badge>
                    </div>
                  </div>
                  <div className="border-t pt-2 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs">
                      <Info className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Origen:</span>
                      <span>{selectedAttendance.origin} ({selectedAttendance.originCode})</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Info className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Dispositivo:</span>
                      <span>{selectedAttendance.deviceName || 'N/A'}</span>
                    </div>
                    {selectedAttendance.address && (
                      <div className="flex items-center gap-2 text-xs">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Dirección:</span>
                        <span>{selectedAttendance.address}</span>
                      </div>
                    )}
                    {selectedAttendance.isMobile && selectedAttendance.coordinatesMobile && (
                      <div className="flex items-center gap-2 text-xs">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">GPS:</span>
                        <span className="font-mono">{selectedAttendance.coordinatesMobile}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs">
                      <Info className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Sucursal:</span>
                      <span>{selectedAttendance.employee?.branchOffice}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Info className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Empresa:</span>
                      <span>{selectedAttendance.employee?.companyName}</span>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}
