'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  AlertTriangle, 
  DollarSign, 
  Users, 
  TrendingUp,
  Search,
  FileDown,
  Phone,
  Mail,
  Eye,
  FileText,
  Send,
  Settings,
  Calculator,
  Clock,
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
  Download,
  Printer,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  MessageSquare
} from 'lucide-react'

// ============================================
// INTERFACES
// ============================================
interface Deuda {
  id: string
  tipo: string
  periodo: string
  concepto: string
  montoOriginal: number
  montoInteres: number
  montoTotal: number
  diasMora: number
  estado: string
  fechaVencimiento: string | null
  notas: string | null
  residenteId: string | null
  residente?: {
    id: string
    nombre: string
    apellido?: string | null
    unidad?: string | null
    etapa?: string | null
    telefono?: string | null
    email?: string | null
  }
  createdAt: string
}

interface EstadoCuenta {
  id: string
  periodo: string
  fechaGeneracion: string
  saldoAnterior: number
  cargosMes: number
  pagosMes: number
  saldoActual: number
  interesesMora: number
  totalPagar: number
  fechaVencimiento: string | null
  estado: string
  residenteId: string | null
  residente?: {
    id: string
    nombre: string
    apellido?: string | null
    unidad?: string | null
    etapa?: string | null
    telefono?: string | null
    email?: string | null
  }
  detalles?: DetalleEstadoCuenta[]
}

interface DetalleEstadoCuenta {
  id: string
  tipo: string
  concepto: string
  monto: number
  fecha: string | null
  referencia: string | null
}

interface CartaCobranza {
  id: string
  tipo: string
  numeroCarta: number
  asunto: string
  contenido: string
  fechaEnvio: string | null
  fechaGeneracion: string
  metodoEnvio: string
  estado: string
  residenteId: string | null
  residente?: {
    id: string
    nombre: string
    apellido?: string | null
    unidad?: string | null
    etapa?: string | null
    telefono?: string | null
    email?: string | null
  }
  archivoPdf?: string | null
}

interface ConfigMorosidad {
  id: string
  tasaInteresMensual: number
  tasaInteresDiario: number
  diasGracia: number
  maxDiasMora: number
  montosCartas?: string | null
  plantillasCartas?: string | null
  activo: boolean
}

interface Stats {
  totalMorosidad: number
  deudasPendientes: number
  residentesMorosos: number
  interesesMes: number
  rango130: number
  rango3160: number
  rango60mas: number
}

// ============================================
// UTILITIES
// ============================================
const formatCLP = (n: number) => 
  '$' + new Intl.NumberFormat('es-CL').format(Math.round(n || 0))

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '–'
  try {
    const [y, m, d] = dateStr.split('-')
    return `${d}/${m}/${y}`
  } catch {
    return dateStr
  }
}

const estadoColors: Record<string, string> = {
  'Pendiente': 'bg-red-100 text-red-700 border-red-200',
  'Parcial': 'bg-amber-100 text-amber-700 border-amber-200',
  'Pagado': 'bg-green-100 text-green-700 border-green-200',
  'Condonado': 'bg-blue-100 text-blue-700 border-blue-200',
}

const estadoCuentaColors: Record<string, string> = {
  'Generado': 'bg-slate-100 text-slate-700 border-slate-200',
  'Enviado': 'bg-blue-100 text-blue-700 border-blue-200',
  'Pagado': 'bg-green-100 text-green-700 border-green-200',
  'Vencido': 'bg-red-100 text-red-700 border-red-200',
}

const cartaColors: Record<string, string> = {
  'Recordatorio': 'bg-blue-100 text-blue-700 border-blue-200',
  'Aviso': 'bg-amber-100 text-amber-700 border-amber-200',
  'UltimoAviso': 'bg-orange-100 text-orange-700 border-orange-200',
  'CobroJudicial': 'bg-red-100 text-red-700 border-red-200',
}

const cartaEstadoColors: Record<string, string> = {
  'Generada': 'bg-slate-100 text-slate-700 border-slate-200',
  'Enviada': 'bg-blue-100 text-blue-700 border-blue-200',
  'Entregada': 'bg-green-100 text-green-700 border-green-200',
  'SinRespuesta': 'bg-red-100 text-red-700 border-red-200',
}

const metodoEnvioIcons: Record<string, typeof Mail> = {
  'Email': Mail,
  'WhatsApp': MessageSquare,
  'CartaFisica': FileText,
}

// ============================================
// MAIN COMPONENT
// ============================================
export function MorosidadModule() {
  // States for Deudas
  const [deudas, setDeudas] = useState<Deuda[]>([])
  const [deudasLoading, setDeudasLoading] = useState(true)
  const [deudaDialogOpen, setDeudaDialogOpen] = useState(false)
  const [selectedDeuda, setSelectedDeuda] = useState<Deuda | null>(null)
  const [deudaFormMode, setDeudaFormMode] = useState<'create' | 'edit'>('create')
  const [deudaFormData, setDeudaFormData] = useState({
    tipo: 'GastoComun',
    periodo: '',
    concepto: '',
    montoOriginal: 0,
    residenteId: '',
    fechaVencimiento: '',
    notas: ''
  })
  const [deleteDeudaDialog, setDeleteDeudaDialog] = useState(false)
  const [deudaToDelete, setDeudaToDelete] = useState<Deuda | null>(null)

  // States for Estados de Cuenta
  const [estadosCuenta, setEstadosCuenta] = useState<EstadoCuenta[]>([])
  const [estadosLoading, setEstadosLoading] = useState(false)
  const [estadoCuentaDialogOpen, setEstadoCuentaDialogOpen] = useState(false)
  const [selectedEstadoCuenta, setSelectedEstadoCuenta] = useState<EstadoCuenta | null>(null)
  const [generarEstadoDialog, setGenerarEstadoDialog] = useState(false)

  // States for Cartas
  const [cartas, setCartas] = useState<CartaCobranza[]>([])
  const [cartasLoading, setCartasLoading] = useState(false)
  const [cartaDialogOpen, setCartaDialogOpen] = useState(false)
  const [selectedCarta, setSelectedCarta] = useState<CartaCobranza | null>(null)
  const [generarCartaDialog, setGenerarCartaDialog] = useState(false)
  const [cartaFormData, setCartaFormData] = useState({
    tipo: 'Recordatorio',
    residenteId: '',
    deudasIncluidas: [] as string[],
    metodoEnvio: 'Email'
  })

  // States for Config
  const [config, setConfig] = useState<ConfigMorosidad | null>(null)
  const [configLoading, setConfigLoading] = useState(false)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [configFormData, setConfigFormData] = useState({
    tasaInteresMensual: 1.5,
    tasaInteresDiario: 0.05,
    diasGracia: 10,
    maxDiasMora: 90
  })

  // States for filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroPeriodo, setFiltroPeriodo] = useState('todos')
  const [filtroResidente, setFiltroResidente] = useState('')

  // States for residentes list
  const [residentes, setResidentes] = useState<Array<{id: string; nombre: string; apellido?: string | null; unidad?: string | null}>>([])

  // Stats
  const [stats, setStats] = useState<Stats>({
    totalMorosidad: 0,
    deudasPendientes: 0,
    residentesMorosos: 0,
    interesesMes: 0,
    rango130: 0,
    rango3160: 0,
    rango60mas: 0
  })

  // ============================================
  // DATA FETCHING
  // ============================================
  const fetchDeudas = async () => {
    setDeudasLoading(true)
    try {
      const res = await fetch('/api/morosidad')
      const data = await res.json()
      setDeudas(data.deudas || [])
      setStats(data.stats || stats)
    } catch (error) {
      console.error('Error fetching deudas:', error)
    } finally {
      setDeudasLoading(false)
    }
  }

  const fetchEstadosCuenta = async () => {
    setEstadosLoading(true)
    try {
      const res = await fetch('/api/morosidad/estado-cuenta')
      const data = await res.json()
      setEstadosCuenta(data.estadosCuenta || [])
    } catch (error) {
      console.error('Error fetching estados cuenta:', error)
    } finally {
      setEstadosLoading(false)
    }
  }

  const fetchCartas = async () => {
    setCartasLoading(true)
    try {
      const res = await fetch('/api/morosidad/cartas')
      const data = await res.json()
      setCartas(data.cartas || [])
    } catch (error) {
      console.error('Error fetching cartas:', error)
    } finally {
      setCartasLoading(false)
    }
  }

  const fetchConfig = async () => {
    setConfigLoading(true)
    try {
      const res = await fetch('/api/morosidad/config')
      const data = await res.json()
      if (data.config) {
        setConfig(data.config)
        setConfigFormData({
          tasaInteresMensual: data.config.tasaInteresMensual,
          tasaInteresDiario: data.config.tasaInteresDiario,
          diasGracia: data.config.diasGracia,
          maxDiasMora: data.config.maxDiasMora
        })
      }
    } catch (error) {
      console.error('Error fetching config:', error)
    } finally {
      setConfigLoading(false)
    }
  }

  const fetchResidentes = async () => {
    try {
      const res = await fetch('/api/residentes')
      const data = await res.json()
      setResidentes(data.residentes || data || [])
    } catch (error) {
      console.error('Error fetching residentes:', error)
    }
  }

  useEffect(() => {
    fetchDeudas()
    fetchResidentes()
  }, [])

  // ============================================
  // DEUDAS CRUD
  // ============================================
  const handleCreateDeuda = () => {
    setDeudaFormMode('create')
    setDeudaFormData({
      tipo: 'GastoComun',
      periodo: new Date().toISOString().slice(0, 7),
      concepto: '',
      montoOriginal: 0,
      residenteId: '',
      fechaVencimiento: '',
      notas: ''
    })
    setSelectedDeuda(null)
    setDeudaDialogOpen(true)
  }

  const handleEditDeuda = (deuda: Deuda) => {
    setDeudaFormMode('edit')
    setSelectedDeuda(deuda)
    setDeudaFormData({
      tipo: deuda.tipo,
      periodo: deuda.periodo,
      concepto: deuda.concepto,
      montoOriginal: deuda.montoOriginal,
      residenteId: deuda.residenteId || '',
      fechaVencimiento: deuda.fechaVencimiento || '',
      notas: deuda.notas || ''
    })
    setDeudaDialogOpen(true)
  }

  const handleSaveDeuda = async () => {
    try {
      const url = '/api/morosidad'
      const method = deudaFormMode === 'create' ? 'POST' : 'PUT'
      const body = deudaFormMode === 'create' 
        ? deudaFormData 
        : { ...deudaFormData, id: selectedDeuda?.id }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        setDeudaDialogOpen(false)
        fetchDeudas()
      } else {
        const error = await res.json()
        console.error('Error saving deuda:', error)
      }
    } catch (error) {
      console.error('Error saving deuda:', error)
    }
  }

  const handleDeleteDeuda = async () => {
    if (!deudaToDelete) return
    try {
      const res = await fetch(`/api/morosidad?id=${deudaToDelete.id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setDeleteDeudaDialog(false)
        setDeudaToDelete(null)
        fetchDeudas()
      }
    } catch (error) {
      console.error('Error deleting deuda:', error)
    }
  }

  const calcularIntereses = async () => {
    try {
      const res = await fetch('/api/morosidad/calcular-intereses', {
        method: 'POST'
      })
      if (res.ok) {
        fetchDeudas()
      }
    } catch (error) {
      console.error('Error calculating interests:', error)
    }
  }

  // ============================================
  // ESTADOS DE CUENTA
  // ============================================
  const handleGenerarEstadosCuenta = async () => {
    try {
      const res = await fetch('/api/morosidad/estado-cuenta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodo: new Date().toISOString().slice(0, 7) })
      })
      if (res.ok) {
        setGenerarEstadoDialog(false)
        fetchEstadosCuenta()
      }
    } catch (error) {
      console.error('Error generating estados cuenta:', error)
    }
  }

  const handleDownloadEstadoCuenta = async (id: string) => {
    window.open(`/api/pdf/estado-cuenta/${id}`, '_blank')
  }

  // ============================================
  // CARTAS DE COBRANZA
  // ============================================
  const handleGenerarCarta = async () => {
    try {
      const res = await fetch('/api/morosidad/cartas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cartaFormData)
      })
      if (res.ok) {
        setGenerarCartaDialog(false)
        fetchCartas()
      }
    } catch (error) {
      console.error('Error generating carta:', error)
    }
  }

  const handleDownloadCarta = async (id: string) => {
    window.open(`/api/pdf/carta-cobranza/${id}`, '_blank')
  }

  // ============================================
  // CONFIG
  // ============================================
  const handleSaveConfig = async () => {
    try {
      const res = await fetch('/api/morosidad/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configFormData)
      })
      if (res.ok) {
        setConfigDialogOpen(false)
        fetchConfig()
      }
    } catch (error) {
      console.error('Error saving config:', error)
    }
  }

  // ============================================
  // EXPORT CSV
  // ============================================
  const exportarCSV = () => {
    const headers = ['Unidad', 'Nombre', 'Período', 'Concepto', 'Monto Original', 'Interés', 'Total', 'Días Mora', 'Estado']
    const rows = filteredDeudas.map(d => [
      d.residente?.unidad || '',
      `${d.residente?.nombre || ''} ${d.residente?.apellido || ''}`,
      d.periodo,
      d.concepto,
      d.montoOriginal,
      d.montoInteres,
      d.montoTotal,
      d.diasMora,
      d.estado
    ])

    const csvContent = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n')
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `morosidad_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  // ============================================
  // FILTERS
  // ============================================
  const periodos = [...new Set(deudas.map(d => d.periodo).filter(Boolean))].sort().reverse()
  
  const filteredDeudas = deudas.filter(d => {
    const matchSearch = 
      d.residente?.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.residente?.apellido?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.residente?.unidad?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.concepto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.periodo.includes(searchTerm)
    
    const matchEstado = filtroEstado === 'todos' || d.estado === filtroEstado
    const matchPeriodo = filtroPeriodo === 'todos' || d.periodo === filtroPeriodo

    return matchSearch && matchEstado && matchPeriodo
  })

  // ============================================
  // RENDER
  // ============================================
  if (deudasLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Total Morosidad</p>
                <p className="text-lg font-bold text-red-600">{formatCLP(stats.totalMorosidad)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Deudas Pendientes</p>
                <p className="text-2xl font-bold text-amber-600">{stats.deudasPendientes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Residentes Morosos</p>
                <p className="text-2xl font-bold text-purple-600">{stats.residentesMorosos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Intereses Mes</p>
                <p className="text-lg font-bold text-orange-600">{formatCLP(stats.interesesMes)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase">1-30 días</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.rango130}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase">31-60 días</p>
                <p className="text-2xl font-bold text-amber-600">{stats.rango3160}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase">60+ días</p>
                <p className="text-2xl font-bold text-red-600">{stats.rango60mas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="deudas" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="deudas" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Deudas
          </TabsTrigger>
          <TabsTrigger value="estados" className="flex items-center gap-2" onClick={fetchEstadosCuenta}>
            <FileText className="w-4 h-4" />
            Estados de Cuenta
          </TabsTrigger>
          <TabsTrigger value="cartas" className="flex items-center gap-2" onClick={fetchCartas}>
            <Send className="w-4 h-4" />
            Cartas de Cobranza
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2" onClick={fetchConfig}>
            <Settings className="w-4 h-4" />
            Configuración
          </TabsTrigger>
        </TabsList>

        {/* Tab: Deudas */}
        <TabsContent value="deudas" className="space-y-4">
          {/* Header */}
          <div className="flex flex-wrap justify-between items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800">Gestión de Deudas</h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={calcularIntereses}>
                <Calculator className="w-4 h-4 mr-2" />
                Calcular Intereses
              </Button>
              <Button variant="outline" onClick={exportarCSV}>
                <FileDown className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
              <Button onClick={handleCreateDeuda}>
                <Plus className="w-4 h-4 mr-2" />
                Nueva Deuda
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      placeholder="Buscar por nombre, unidad, concepto..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                    <SelectItem value="Parcial">Parcial</SelectItem>
                    <SelectItem value="Pagado">Pagado</SelectItem>
                    <SelectItem value="Condonado">Condonado</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filtroPeriodo} onValueChange={setFiltroPeriodo}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {periodos.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 sticky top-0">
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Unidad</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Nombre</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Tipo</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Período</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Concepto</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase text-right">Original</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase text-right">Interés</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase text-right">Total</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase text-center">Días Mora</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Estado</TableHead>
                      <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDeudas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-slate-400">
                          No se encontraron deudas
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDeudas.map((deuda) => (
                        <TableRow key={deuda.id} className="hover:bg-slate-50">
                          <TableCell className="font-mono font-medium">{deuda.residente?.unidad || '-'}</TableCell>
                          <TableCell>{deuda.residente?.nombre} {deuda.residente?.apellido}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">{deuda.tipo}</Badge>
                          </TableCell>
                          <TableCell>{deuda.periodo}</TableCell>
                          <TableCell className="max-w-[150px] truncate">{deuda.concepto}</TableCell>
                          <TableCell className="text-right">{formatCLP(deuda.montoOriginal)}</TableCell>
                          <TableCell className="text-right text-orange-600">{formatCLP(deuda.montoInteres)}</TableCell>
                          <TableCell className="text-right font-bold text-red-600">{formatCLP(deuda.montoTotal)}</TableCell>
                          <TableCell className="text-center">
                            <span className={`font-bold ${
                              deuda.diasMora > 60 ? 'text-red-600' : 
                              deuda.diasMora > 30 ? 'text-amber-600' : 
                              'text-slate-600'
                            }`}>
                              {deuda.diasMora}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className={estadoColors[deuda.estado] || 'bg-slate-100'}>
                              {deuda.estado}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleEditDeuda(deuda)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => { setDeudaToDelete(deuda); setDeleteDeudaDialog(true); }}>
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Estados de Cuenta */}
        <TabsContent value="estados" className="space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800">Estados de Cuenta</h2>
            <div className="flex gap-2">
              <Button onClick={() => setGenerarEstadoDialog(true)}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Generar Estados de Cuenta
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {estadosLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 sticky top-0">
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Unidad</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Residente</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Período</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase text-right">Saldo Anterior</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase text-right">Cargos</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase text-right">Pagos</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase text-right">Intereses</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase text-right">Total a Pagar</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Estado</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {estadosCuenta.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-8 text-slate-400">
                            No hay estados de cuenta generados
                          </TableCell>
                        </TableRow>
                      ) : (
                        estadosCuenta.map((ec) => (
                          <TableRow key={ec.id}>
                            <TableCell className="font-mono font-medium">{ec.residente?.unidad || '-'}</TableCell>
                            <TableCell>{ec.residente?.nombre} {ec.residente?.apellido}</TableCell>
                            <TableCell>{ec.periodo}</TableCell>
                            <TableCell className="text-right">{formatCLP(ec.saldoAnterior)}</TableCell>
                            <TableCell className="text-right text-red-600">{formatCLP(ec.cargosMes)}</TableCell>
                            <TableCell className="text-right text-green-600">{formatCLP(ec.pagosMes)}</TableCell>
                            <TableCell className="text-right text-orange-600">{formatCLP(ec.interesesMora)}</TableCell>
                            <TableCell className="text-right font-bold">{formatCLP(ec.totalPagar)}</TableCell>
                            <TableCell>
                              <Badge className={estadoCuentaColors[ec.estado] || 'bg-slate-100'}>
                                {ec.estado}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => handleDownloadEstadoCuenta(ec.id)}>
                                <Download className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Cartas de Cobranza */}
        <TabsContent value="cartas" className="space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <h2 className="text-lg font-bold text-slate-800">Cartas de Cobranza</h2>
            <div className="flex gap-2">
              <Button onClick={() => {
                setCartaFormData({
                  tipo: 'Recordatorio',
                  residenteId: '',
                  deudasIncluidas: [],
                  metodoEnvio: 'Email'
                })
                setGenerarCartaDialog(true)
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Generar Carta
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              {cartasLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 sticky top-0">
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Tipo</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">N°</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Unidad</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Residente</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Asunto</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Fecha Generación</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Método</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Estado</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cartas.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-slate-400">
                            No hay cartas de cobranza generadas
                          </TableCell>
                        </TableRow>
                      ) : (
                        cartas.map((carta) => {
                          const MetodoIcon = metodoEnvioIcons[carta.metodoEnvio] || Mail
                          return (
                            <TableRow key={carta.id}>
                              <TableCell>
                                <Badge className={cartaColors[carta.tipo] || 'bg-slate-100'}>
                                  {carta.tipo}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">{carta.numeroCarta}</TableCell>
                              <TableCell className="font-mono">{carta.residente?.unidad || '-'}</TableCell>
                              <TableCell>{carta.residente?.nombre} {carta.residente?.apellido}</TableCell>
                              <TableCell className="max-w-[200px] truncate">{carta.asunto}</TableCell>
                              <TableCell>{formatDate(carta.fechaGeneracion)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <MetodoIcon className="w-4 h-4" />
                                  {carta.metodoEnvio}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={cartaEstadoColors[carta.estado] || 'bg-slate-100'}>
                                  {carta.estado}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => { setSelectedCarta(carta); setCartaDialogOpen(true); }}>
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleDownloadCarta(carta.id)}>
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Configuración */}
        <TabsContent value="config" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800">Configuración de Morosidad</h2>
            <Button onClick={() => setConfigDialogOpen(true)}>
              <Pencil className="w-4 h-4 mr-2" />
              Editar Configuración
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Parámetros de Intereses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {configLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                </div>
              ) : config ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-500">Tasa Interés Mensual</p>
                    <p className="text-2xl font-bold">{config.tasaInteresMensual}%</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-500">Tasa Interés Diario</p>
                    <p className="text-2xl font-bold">{config.tasaInteresDiario}%</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-500">Días de Gracia</p>
                    <p className="text-2xl font-bold">{config.diasGracia} días</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-500">Máx. Días Mora (Cobro Judicial)</p>
                    <p className="text-2xl font-bold">{config.maxDiasMora} días</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-slate-400">
                  No hay configuración guardada. Edite para crear una.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fórmula de Cálculo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="font-mono text-sm">
                  <strong>Interés = </strong> Monto Original × (Tasa Diario / 100) × (Días Mora - Días Gracia)
                </p>
                <p className="text-sm text-slate-600 mt-2">
                  El interés se calcula solo después de transcurridos los días de gracia.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ============================================ */}
      {/* DIALOGS */}
      {/* ============================================ */}

      {/* Deuda Dialog */}
      <Dialog open={deudaDialogOpen} onOpenChange={setDeudaDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{deudaFormMode === 'create' ? 'Nueva Deuda' : 'Editar Deuda'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={deudaFormData.tipo} onValueChange={(v) => setDeudaFormData({ ...deudaFormData, tipo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GastoComun">Gasto Común</SelectItem>
                    <SelectItem value="Multa">Multa</SelectItem>
                    <SelectItem value="Interes">Interés</SelectItem>
                    <SelectItem value="CargoExtra">Cargo Extra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Período</Label>
                <Input 
                  type="month" 
                  value={deudaFormData.periodo}
                  onChange={(e) => setDeudaFormData({ ...deudaFormData, periodo: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Residente</Label>
              <Select value={deudaFormData.residenteId} onValueChange={(v) => setDeudaFormData({ ...deudaFormData, residenteId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar residente" />
                </SelectTrigger>
                <SelectContent>
                  {residentes.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.unidad} - {r.nombre} {r.apellido || ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Concepto</Label>
              <Input 
                value={deudaFormData.concepto}
                onChange={(e) => setDeudaFormData({ ...deudaFormData, concepto: e.target.value })}
                placeholder="Descripción del cargo"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monto Original</Label>
                <Input 
                  type="number"
                  value={deudaFormData.montoOriginal}
                  onChange={(e) => setDeudaFormData({ ...deudaFormData, montoOriginal: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha Vencimiento</Label>
                <Input 
                  type="date"
                  value={deudaFormData.fechaVencimiento}
                  onChange={(e) => setDeudaFormData({ ...deudaFormData, fechaVencimiento: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea 
                value={deudaFormData.notas}
                onChange={(e) => setDeudaFormData({ ...deudaFormData, notas: e.target.value })}
                placeholder="Notas adicionales"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeudaDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveDeuda}>{deudaFormMode === 'create' ? 'Crear' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Deuda Dialog */}
      <AlertDialog open={deleteDeudaDialog} onOpenChange={setDeleteDeudaDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar deuda?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la deuda de {deudaToDelete?.residente?.nombre} por {formatCLP(deudaToDelete?.montoTotal || 0)}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDeuda} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Generar Estados de Cuenta Dialog */}
      <AlertDialog open={generarEstadoDialog} onOpenChange={setGenerarEstadoDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generar Estados de Cuenta</AlertDialogTitle>
            <AlertDialogDescription>
              Se generarán estados de cuenta para todos los residentes con deudas pendientes del período actual. ¿Desea continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleGenerarEstadosCuenta}>
              Generar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Generar Carta Dialog */}
      <Dialog open={generarCartaDialog} onOpenChange={setGenerarCartaDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generar Carta de Cobranza</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Carta</Label>
              <Select value={cartaFormData.tipo} onValueChange={(v) => setCartaFormData({ ...cartaFormData, tipo: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Recordatorio">Recordatorio</SelectItem>
                  <SelectItem value="Aviso">Aviso</SelectItem>
                  <SelectItem value="UltimoAviso">Último Aviso</SelectItem>
                  <SelectItem value="CobroJudicial">Cobro Judicial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Residente</Label>
              <Select value={cartaFormData.residenteId} onValueChange={(v) => setCartaFormData({ ...cartaFormData, residenteId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar residente" />
                </SelectTrigger>
                <SelectContent>
                  {residentes.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.unidad} - {r.nombre} {r.apellido || ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Método de Envío</Label>
              <Select value={cartaFormData.metodoEnvio} onValueChange={(v) => setCartaFormData({ ...cartaFormData, metodoEnvio: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Email">Email</SelectItem>
                  <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                  <SelectItem value="CartaFisica">Carta Física</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerarCartaDialog(false)}>Cancelar</Button>
            <Button onClick={handleGenerarCarta}>Generar Carta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Carta Dialog */}
      <Dialog open={cartaDialogOpen} onOpenChange={setCartaDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle de Carta de Cobranza</DialogTitle>
          </DialogHeader>
          {selectedCarta && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm text-slate-500">Tipo</p>
                  <Badge className={cartaColors[selectedCarta.tipo]}>{selectedCarta.tipo}</Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-500">N° Carta</p>
                  <p className="font-bold">{selectedCarta.numeroCarta}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Residente</p>
                  <p className="font-medium">{selectedCarta.residente?.nombre} {selectedCarta.residente?.apellido}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Unidad</p>
                  <p className="font-mono">{selectedCarta.residente?.unidad || '-'}</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Asunto</p>
                <p className="p-2 bg-slate-50 rounded">{selectedCarta.asunto}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Contenido</p>
                <div className="p-4 bg-white border rounded-lg max-h-64 overflow-y-auto whitespace-pre-wrap text-sm">
                  {selectedCarta.contenido}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm text-slate-500">Fecha Generación</p>
                  <p>{formatDate(selectedCarta.fechaGeneracion)}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Método</p>
                  <p>{selectedCarta.metodoEnvio}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Estado</p>
                  <Badge className={cartaEstadoColors[selectedCarta.estado]}>{selectedCarta.estado}</Badge>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCartaDialogOpen(false)}>Cerrar</Button>
            {selectedCarta && (
              <Button onClick={() => handleDownloadCarta(selectedCarta.id)}>
                <Download className="w-4 h-4 mr-2" />
                Descargar PDF
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Config Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Configuración</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tasa Interés Mensual (%)</Label>
              <Input 
                type="number" 
                step="0.01"
                value={configFormData.tasaInteresMensual}
                onChange={(e) => setConfigFormData({ ...configFormData, tasaInteresMensual: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tasa Interés Diario (%)</Label>
              <Input 
                type="number" 
                step="0.001"
                value={configFormData.tasaInteresDiario}
                onChange={(e) => setConfigFormData({ ...configFormData, tasaInteresDiario: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Días de Gracia</Label>
              <Input 
                type="number"
                value={configFormData.diasGracia}
                onChange={(e) => setConfigFormData({ ...configFormData, diasGracia: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Máx. Días Mora (para Cobro Judicial)</Label>
              <Input 
                type="number"
                value={configFormData.maxDiasMora}
                onChange={(e) => setConfigFormData({ ...configFormData, maxDiasMora: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveConfig}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
