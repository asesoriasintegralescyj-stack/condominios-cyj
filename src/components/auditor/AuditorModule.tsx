'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Shield, 
  Activity, 
  AlertTriangle, 
  Download,
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  X,
  LogIn,
  LogOut,
  Edit,
  Trash2,
  Database,
  RefreshCw,
  Calendar,
  BarChart3,
  History,
  CalendarDays,
  Users
} from 'lucide-react'
import { TableroIndicadores } from '@/components/ui/tablero-indicadores'

interface Auditoria {
  id: string
  tipoAccion: string
  modulo: string
  descripcion: string
  entidad?: string | null
  entidadId?: string | null
  datosAntes?: string | null
  datosDespues?: string | null
  usuarioId?: string | null
  usuarioNombre?: string | null
  ip?: string | null
  userAgent?: string | null
  resultado: string
  mensajeError?: string | null
  createdAt: string
}

interface Stats {
  total: number
  accionesHoy: number
  accionesSemana: number
  accionesPorModulo: { modulo: string; count: number }[]
  erroresRecientes: Auditoria[]
}

interface Filtros {
  modulos: string[]
  usuarios: string[]
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const TIPOS_ACCION = [
  { value: 'Acceso', label: 'Acceso', color: 'bg-blue-100 text-blue-700', icon: <Eye className="w-3 h-3" /> },
  { value: 'Modificación', label: 'Modificación', color: 'bg-amber-100 text-amber-700', icon: <Edit className="w-3 h-3" /> },
  { value: 'Eliminación', label: 'Eliminación', color: 'bg-red-100 text-red-700', icon: <Trash2 className="w-3 h-3" /> },
  { value: 'Exportación', label: 'Exportación', color: 'bg-green-100 text-green-700', icon: <Download className="w-3 h-3" /> },
  { value: 'Backup', label: 'Backup', color: 'bg-purple-100 text-purple-700', icon: <Database className="w-3 h-3" /> },
  { value: 'Login', label: 'Login', color: 'bg-green-100 text-green-700', icon: <LogIn className="w-3 h-3" /> },
  { value: 'Logout', label: 'Logout', color: 'bg-slate-100 text-slate-700', icon: <LogOut className="w-3 h-3" /> },
]

const getTipoAccionConfig = (tipo: string) => {
  return TIPOS_ACCION.find(t => t.value === tipo) || { 
    value: tipo, 
    label: tipo, 
    color: 'bg-slate-100 text-slate-700', 
    icon: <Activity className="w-3 h-3" /> 
  }
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleString('es-CL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatJSON = (jsonStr: string | null | undefined): string => {
  if (!jsonStr) return '-'
  try {
    const parsed = JSON.parse(jsonStr)
    return JSON.stringify(parsed, null, 2)
  } catch {
    return jsonStr
  }
}

export function AuditorModule() {
  const [auditorias, setAuditorias] = useState<Auditoria[]>([])
  const [loading, setLoading] = useState(true)
  const [detalleDialogOpen, setDetalleDialogOpen] = useState(false)
  const [selectedAuditoria, setSelectedAuditoria] = useState<Auditoria | null>(null)
  const [stats, setStats] = useState<Stats>({
    total: 0,
    accionesHoy: 0,
    accionesSemana: 0,
    accionesPorModulo: [],
    erroresRecientes: []
  })
  const [filtros, setFiltros] = useState<Filtros>({
    modulos: [],
    usuarios: []
  })
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0
  })

  // Filter state
  const [filterTipoAccion, setFilterTipoAccion] = useState('todos')
  const [filterModulo, setFilterModulo] = useState('todos')
  const [filterUsuario, setFilterUsuario] = useState('todos')
  const [filterResultado, setFilterResultado] = useState('todos')
  const [filterFechaDesde, setFilterFechaDesde] = useState('')
  const [filterFechaHasta, setFilterFechaHasta] = useState('')
  const [searchText, setSearchText] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterTipoAccion !== 'todos') params.append('tipoAccion', filterTipoAccion)
      if (filterModulo !== 'todos') params.append('modulo', filterModulo)
      if (filterUsuario !== 'todos') params.append('usuario', filterUsuario)
      if (filterResultado !== 'todos') params.append('resultado', filterResultado)
      if (filterFechaDesde) params.append('fechaDesde', filterFechaDesde)
      if (filterFechaHasta) params.append('fechaHasta', filterFechaHasta)
      if (searchText) params.append('search', searchText)
      params.append('page', pagination.page.toString())
      params.append('limit', pagination.limit.toString())

      const res = await fetch(`/api/auditoria?${params.toString()}`)
      const data = await res.json()
      setAuditorias(data.auditorias || [])
      setStats(data.stats || stats)
      setFiltros(data.filtros || filtros)
      setPagination(data.pagination || pagination)
    } catch (error) {
      console.error('Error fetching auditoria:', error)
    } finally {
      setLoading(false)
    }
  }, [filterTipoAccion, filterModulo, filterUsuario, filterResultado, filterFechaDesde, filterFechaHasta, searchText, pagination.page, pagination.limit])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  const clearFilters = () => {
    setFilterTipoAccion('todos')
    setFilterModulo('todos')
    setFilterUsuario('todos')
    setFilterResultado('todos')
    setFilterFechaDesde('')
    setFilterFechaHasta('')
    setSearchText('')
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const hasActiveFilters = () => {
    return filterTipoAccion !== 'todos' ||
           filterModulo !== 'todos' ||
           filterUsuario !== 'todos' ||
           filterResultado !== 'todos' ||
           filterFechaDesde !== '' ||
           filterFechaHasta !== '' ||
           searchText !== ''
  }

  const exportToCSV = async () => {
    try {
      const params = new URLSearchParams()
      if (filterTipoAccion !== 'todos') params.append('tipoAccion', filterTipoAccion)
      if (filterModulo !== 'todos') params.append('modulo', filterModulo)
      if (filterFechaDesde) params.append('fechaDesde', filterFechaDesde)
      if (filterFechaHasta) params.append('fechaHasta', filterFechaHasta)

      const res = await fetch(`/api/auditoria?${params.toString()}`, { method: 'DELETE' })
      const data = await res.json()

      const headers = [
        'Fecha', 'Tipo Acción', 'Módulo', 'Descripción', 'Entidad', 
        'Entidad ID', 'Usuario', 'IP', 'Resultado', 'Mensaje Error'
      ]

      const csvRows = [
        '\uFEFF' + headers.join(';'),
        ...data.auditorias.map((a: Auditoria) => [
          formatDate(a.createdAt),
          a.tipoAccion,
          a.modulo,
          `"${(a.descripcion || '').replace(/"/g, '""')}"`,
          a.entidad || '',
          a.entidadId || '',
          a.usuarioNombre || '',
          a.ip || '',
          a.resultado,
          `"${(a.mensajeError || '').replace(/"/g, '""')}"`
        ].join(';'))
      ]

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `auditoria_${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting to CSV:', error)
    }
  }

  const exportToPDF = () => {
    // Generate HTML table for printing
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Tu navegador bloqueó la ventana emergente. Permite ventanas emergentes para este sitio e inténtalo de nuevo.')
      return
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reporte de Auditoría del Sistema</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #0f2044; margin-bottom: 10px; }
          .subtitle { color: #64748b; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #0f2044; color: white; padding: 8px; text-align: left; }
          td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
          tr:nth-child(even) { background: #f8fafc; }
          .exitoso { color: #16a34a; }
          .fallido { color: #dc2626; }
          .summary { margin-bottom: 20px; display: flex; gap: 20px; }
          .summary-item { background: #f8fafc; padding: 10px 20px; border-radius: 8px; }
          .summary-label { font-size: 10px; color: #64748b; text-transform: uppercase; }
          .summary-value { font-size: 24px; font-weight: bold; color: #0f2044; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <h1>Reporte de Auditoría del Sistema</h1>
        <p class="subtitle">Generado el ${new Date().toLocaleString('es-CL')}</p>
        
        <div class="summary">
          <div class="summary-item">
            <div class="summary-label">Total Registros</div>
            <div class="summary-value">${stats.total}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Acciones Hoy</div>
            <div class="summary-value">${stats.accionesHoy}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Acciones Semana</div>
            <div class="summary-value">${stats.accionesSemana}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Módulo</th>
              <th>Descripción</th>
              <th>Usuario</th>
              <th>IP</th>
              <th>Resultado</th>
            </tr>
          </thead>
          <tbody>
            ${auditorias.map(a => `
              <tr>
                <td>${formatDate(a.createdAt)}</td>
                <td>${a.tipoAccion}</td>
                <td>${a.modulo}</td>
                <td>${a.descripcion?.substring(0, 50) || ''}${a.descripcion && a.descripcion.length > 50 ? '...' : ''}</td>
                <td>${a.usuarioNombre || '-'}</td>
                <td>${a.ip || '-'}</td>
                <td class="${a.resultado.toLowerCase()}">${a.resultado}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `

    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 250)
  }

  const openDetalle = (auditoria: Auditoria) => {
    setSelectedAuditoria(auditoria)
    setDetalleDialogOpen(true)
  }

  if (loading && auditorias.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    )
  }

  const usuariosActivosCount = new Set(auditorias.map(a => a.usuarioId).filter(Boolean)).size

  return (
    <div className="space-y-6">
      <TableroIndicadores
        columnas={5}
        cards={[
          { titulo: 'Total Logs', numero: stats.total, icon: <History className="w-5 h-5" />, color: 'primary' },
          { titulo: 'Hoy', numero: stats.accionesHoy, icon: <Calendar className="w-5 h-5" />, color: 'azul' },
          { titulo: 'Esta Semana', numero: stats.accionesSemana, icon: <CalendarDays className="w-5 h-5" />, color: 'verde' },
          { titulo: 'Usuarios Activos', numero: usuariosActivosCount, icon: <Users className="w-5 h-5" />, color: 'purpura' },
          { titulo: 'Errores Recientes', numero: stats.erroresRecientes.length, icon: <AlertTriangle className="w-5 h-5" />, color: 'rojo' },
        ]}
      />
      {/* Acciones por Módulo Chart */}
      {stats.accionesPorModulo.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Acciones por Módulo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {stats.accionesPorModulo.map((item, idx) => {
                const colors = ['bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500', 'bg-cyan-500', 'bg-amber-500', 'bg-rose-500', 'bg-blue-500', 'bg-cyan-500']
                const maxCount = Math.max(...stats.accionesPorModulo.map(m => m.count))
                const width = (item.count / maxCount) * 100
                return (
                  <div key={idx} className="flex-1 min-w-[100px]">
                    <div className="text-[10px] text-slate-500 mb-1 truncate">{item.modulo}</div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${colors[idx % colors.length]} rounded-full`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <div className="text-xs font-medium text-slate-700 mt-1">{item.count}</div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header with Search and Filters */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-slate-800">Registro de Auditoría</h2>
          <Badge variant="outline" className="text-slate-500">
            {pagination.total} registros
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Buscar..."
              className="pl-9 w-48"
            />
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-slate-100' : ''}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
          {hasActiveFilters() && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={clearFilters}
              className="text-slate-500"
            >
              <X className="w-4 h-4 mr-2" />
              Limpiar
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm"
            onClick={exportToCSV}
          >
            <Download className="w-4 h-4 mr-2" />
            CSV
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={exportToPDF}
          >
            <FileText className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="bg-slate-50">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] text-slate-500 uppercase font-semibold">Tipo de Acción</Label>
                <Select value={filterTipoAccion} onValueChange={setFilterTipoAccion}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {TIPOS_ACCION.map(tipo => (
                      <SelectItem key={tipo.value} value={tipo.value}>{tipo.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] text-slate-500 uppercase font-semibold">Módulo</Label>
                <Select value={filterModulo} onValueChange={setFilterModulo}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {filtros.modulos.map(mod => (
                      <SelectItem key={mod} value={mod}>{mod}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] text-slate-500 uppercase font-semibold">Usuario</Label>
                <Select value={filterUsuario} onValueChange={setFilterUsuario}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {filtros.usuarios.map(user => (
                      <SelectItem key={user} value={user}>{user}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] text-slate-500 uppercase font-semibold">Resultado</Label>
                <Select value={filterResultado} onValueChange={setFilterResultado}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="Exitoso">Exitoso</SelectItem>
                    <SelectItem value="Fallido">Fallido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] text-slate-500 uppercase font-semibold">Fecha Desde</Label>
                <Input 
                  type="date" 
                  value={filterFechaDesde}
                  onChange={(e) => setFilterFechaDesde(e.target.value)}
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] text-slate-500 uppercase font-semibold">Fecha Hasta</Label>
                <Input 
                  type="date" 
                  value={filterFechaHasta}
                  onChange={(e) => setFilterFechaHasta(e.target.value)}
                  className="bg-white"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Fecha/Hora</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Tipo</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Módulo</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Descripción</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Usuario</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Resultado</TableHead>
                  <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditorias.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                      No se encontraron registros de auditoría
                    </TableCell>
                  </TableRow>
                ) : (
                  auditorias.map((auditoria) => {
                    const tipoConfig = getTipoAccionConfig(auditoria.tipoAccion)
                    return (
                      <TableRow key={auditoria.id} className="hover:bg-slate-50">
                        <TableCell className="text-sm text-slate-600">
                          {formatDate(auditoria.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge className={tipoConfig.color}>
                            <span className="flex items-center gap-1">
                              {tipoConfig.icon}
                              {tipoConfig.label}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{auditoria.modulo}</TableCell>
                        <TableCell className="max-w-xs truncate text-sm text-slate-600">
                          {auditoria.descripcion}
                        </TableCell>
                        <TableCell className="text-sm">{auditoria.usuarioNombre || '-'}</TableCell>
                        <TableCell>
                          <Badge className={
                            auditoria.resultado === 'Exitoso' 
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }>
                            {auditoria.resultado}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => openDetalle(auditoria)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
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

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Mostrando {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => handlePageChange(pagination.page - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="flex items-center px-3 text-sm">
              Página {pagination.page} de {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.totalPages}
              onClick={() => handlePageChange(pagination.page + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detalleDialogOpen} onOpenChange={setDetalleDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-slate-600" />
              Detalle de Auditoría
            </DialogTitle>
          </DialogHeader>
          
          {selectedAuditoria && (
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4">
                {/* Header Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Fecha/Hora</p>
                    <p className="text-sm font-medium">{formatDate(selectedAuditoria.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Tipo de Acción</p>
                    <Badge className={getTipoAccionConfig(selectedAuditoria.tipoAccion).color}>
                      {selectedAuditoria.tipoAccion}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Módulo</p>
                    <p className="text-sm font-medium">{selectedAuditoria.modulo}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Resultado</p>
                    <Badge className={
                      selectedAuditoria.resultado === 'Exitoso' 
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }>
                      {selectedAuditoria.resultado}
                    </Badge>
                  </div>
                </div>

                {/* Descripción */}
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Descripción</p>
                  <p className="text-sm text-slate-700">{selectedAuditoria.descripcion || '-'}</p>
                </div>

                {/* Entidad Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Entidad</p>
                    <p className="text-sm font-medium">{selectedAuditoria.entidad || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">ID Entidad</p>
                    <p className="text-sm font-mono text-slate-600">{selectedAuditoria.entidadId || '-'}</p>
                  </div>
                </div>

                {/* Usuario Info */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Usuario</p>
                    <p className="text-sm font-medium">{selectedAuditoria.usuarioNombre || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">ID Usuario</p>
                    <p className="text-sm font-mono text-slate-600">{selectedAuditoria.usuarioId || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-semibold">Dirección IP</p>
                    <p className="text-sm font-mono text-slate-600">{selectedAuditoria.ip || '-'}</p>
                  </div>
                </div>

                {/* User Agent */}
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">User Agent</p>
                  <p className="text-xs text-slate-600 break-all">{selectedAuditoria.userAgent || '-'}</p>
                </div>

                {/* Error Message */}
                {selectedAuditoria.mensajeError && (
                  <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                    <p className="text-[10px] text-red-600 uppercase font-semibold mb-1">Mensaje de Error</p>
                    <p className="text-sm text-red-700">{selectedAuditoria.mensajeError}</p>
                  </div>
                )}

                {/* Datos Antes/Después */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-semibold mb-2">Datos Antes</p>
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                      <pre className="text-xs text-amber-800 whitespace-pre-wrap overflow-auto max-h-48">
                        {formatJSON(selectedAuditoria.datosAntes)}
                      </pre>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-semibold mb-2">Datos Después</p>
                    <div className="bg-green-50 border border-green-100 rounded-lg p-3">
                      <pre className="text-xs text-green-800 whitespace-pre-wrap overflow-auto max-h-48">
                        {formatJSON(selectedAuditoria.datosDespues)}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
