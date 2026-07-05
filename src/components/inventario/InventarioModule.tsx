'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { 
  Plus, Pencil, Search, AlertTriangle, Package, 
  Minus, History, Download,
  ArrowUpRight, ArrowDownRight, RefreshCw, Calendar,
  FolderTree, Boxes, Wrench
} from 'lucide-react'
import { TableroIndicadores } from '@/components/ui/tablero-indicadores'
import { apiFetch } from '@/lib/api-client'

interface Material {
  id: string
  codigo: string | null
  nombre: string
  unidad: string
  precioUnit: number
  categoria: string
  stockMinimo: number
  stockActual: number
  ubicacion: string | null
  descripcion: string | null
  centroCosto?: {
    id: string
    codigo: string
    nombre: string
  } | null
}

interface Movimiento {
  id: string
  tipo: string
  materialId: string | null
  materialCodigo: string | null
  materialNombre: string
  cantidad: number
  stockAnterior: number
  stockNuevo: number
  motivo: string | null
  referencia: string | null
  observaciones: string | null
  usuarioId: string | null
  usuarioNombre: string | null
  createdAt: string
}

interface MovimientosStats {
  movimientosHoy: number
  entradasMes: number
  salidasMes: number
  ajustesMes: number
}

// Herramienta del catálogo CatHerramienta (inventario de herramientas)
interface Herramienta {
  id: string
  codigo: string | null
  nombre: string
  marca: string | null
  modelo: string | null
  cantidad: number
  ubicacion: string | null
  estado: string
  valorReposicion: number
  fechaAdquisicion: string | null
  descripcion: string | null
  tieneManual?: boolean
}

const formatCLP = (n: number) => 
  '$' + new Intl.NumberFormat('es-CL').format(Math.round(n || 0))

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-CL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const categoriaColors: Record<string, string> = {
  'Eléctrico': 'bg-amber-100 text-amber-700',
  'Fontanería': 'bg-blue-100 text-blue-700',
  'Ferretería': 'bg-amber-100 text-amber-700',
  'Pintura': 'bg-purple-100 text-purple-700',
  'Jardinería': 'bg-green-100 text-green-700',
  'Limpieza': 'bg-cyan-100 text-cyan-700',
  'Seguridad': 'bg-red-100 text-red-700',
  'General': 'bg-slate-100 text-slate-700',
}

const tipoMovimientoColors: Record<string, string> = {
  'Entrada': 'bg-green-100 text-green-700 border-green-200',
  'Salida': 'bg-red-100 text-red-700 border-red-200',
  'Ajuste': 'bg-amber-100 text-amber-700 border-amber-200',
  'Transferencia': 'bg-blue-100 text-blue-700 border-blue-200',
}

// Colores para estados de herramientas (mismos que el módulo Herramientas)
const estadoHerramientaColors: Record<string, string> = {
  'Operativo': 'bg-green-100 text-green-700',
  'Bueno': 'bg-green-100 text-green-700',
  'Regular': 'bg-amber-100 text-amber-700',
  'Malo': 'bg-red-100 text-red-700',
  'Falta Mantención': 'bg-orange-100 text-orange-700',
  'En reparación': 'bg-purple-100 text-purple-700',
  'En Reparación': 'bg-purple-100 text-purple-700',
}

const MOTIVOS_OPTIONS = [
  'Compra',
  'Uso en OT',
  'Ajuste de Inventario',
  'Merma',
  'Devolución',
  'Transferencia',
  'Otro'
]

export function InventarioModule() {
  // Materials state
  const [materiales, setMateriales] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategoria, setFilterCategoria] = useState('todas')
  const [filterStock, setFilterStock] = useState('todos')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)
  const [formData, setFormData] = useState({
    stockActual: 0,
    stockMinimo: 0,
    ubicacion: '',
  })
  
  // Movement adjustment form
  const [adjustFormData, setAdjustFormData] = useState({
    stockNuevo: 0,
    motivo: '',
    referencia: '',
    observaciones: '',
  })
  
  // Movements state
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [movimientosStats, setMovimientosStats] = useState<MovimientosStats>({
    movimientosHoy: 0,
    entradasMes: 0,
    salidasMes: 0,
    ajustesMes: 0
  })
  const [movimientosLoading, setMovimientosLoading] = useState(true)
  const [movimientosTotal, setMovimientosTotal] = useState(0)
  const [movimientosPage, setMovimientosPage] = useState(1)
  
  // Movement filters
  const [filterTipo, setFilterTipo] = useState('todos')
  const [filterMaterialId, setFilterMaterialId] = useState('')
  const [filterFechaDesde, setFilterFechaDesde] = useState('')
  const [filterFechaHasta, setFilterFechaHasta] = useState('')

  // ===== Estado para Herramientas (separado de Consumibles) =====
  const [herramientas, setHerramientas] = useState<Herramienta[]>([])
  const [herrLoading, setHerrLoading] = useState(true)
  const [searchHerr, setSearchHerr] = useState('')
  const [filterEstadoHerr, setFilterEstadoHerr] = useState('todos')

  const fetchMateriales = async () => {
    setLoading(true)
    try {
      const data = await apiFetch<Material[]>('/api/catalogos/materiales', [])
      setMateriales(data)
    } catch (error) {
      console.error('Error fetching materiales:', error)
      setMateriales([])
    }
    setLoading(false)
  }

  // Fetch independiente de herramientas
  const fetchHerramientas = async () => {
    setHerrLoading(true)
    try {
      const data = await apiFetch<Herramienta[]>('/api/catalogos/herramientas', [])
      setHerramientas(data)
    } catch (error) {
      console.error('Error fetching herramientas:', error)
      setHerramientas([])
    }
    setHerrLoading(false)
  }

  const fetchMovimientos = async () => {
    setMovimientosLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterTipo && filterTipo !== 'todos') params.append('tipo', filterTipo)
      if (filterMaterialId) params.append('materialId', filterMaterialId)
      if (filterFechaDesde) params.append('fechaDesde', filterFechaDesde)
      if (filterFechaHasta) params.append('fechaHasta', filterFechaHasta)
      params.append('page', movimientosPage.toString())
      params.append('limit', '20')
      
      const res = await fetch(`/api/inventario/movimientos?${params.toString()}`)
      const data = await res.json()
      setMovimientos(data.movimientos || [])
      setMovimientosTotal(data.total || 0)
      setMovimientosStats(data.stats || {
        movimientosHoy: 0,
        entradasMes: 0,
        salidasMes: 0,
        ajustesMes: 0
      })
    } catch (error) {
      console.error('Error fetching movimientos:', error)
    }
    setMovimientosLoading(false)
  }

  useEffect(() => {
    void (async () => {
      await fetchMateriales()
      await fetchHerramientas()
    })()
  }, [])

  useEffect(() => {
    void (async () => {
      await fetchMovimientos()
    })()
  }, [filterTipo, filterMaterialId, filterFechaDesde, filterFechaHasta, movimientosPage])

  // Filtrar materiales (CONSUMIBLES)
  const filteredMateriales = materiales.filter(m => {
    const matchSearch = !search || 
      m.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (m.codigo && m.codigo.toLowerCase().includes(search.toLowerCase()))
    
    const matchCategoria = filterCategoria === 'todas' || m.categoria === filterCategoria
    
    let matchStock = true
    if (filterStock === 'bajo') {
      matchStock = m.stockActual <= m.stockMinimo
    } else if (filterStock === 'normal') {
      matchStock = m.stockActual > m.stockMinimo
    }
    
    return matchSearch && matchCategoria && matchStock
  })

  // Filtrar herramientas (separado de consumibles)
  const filteredHerramientas = herramientas.filter(h => {
    const matchSearch = !searchHerr ||
      h.nombre.toLowerCase().includes(searchHerr.toLowerCase()) ||
      (h.codigo && h.codigo.toLowerCase().includes(searchHerr.toLowerCase())) ||
      (h.marca && h.marca.toLowerCase().includes(searchHerr.toLowerCase())) ||
      (h.modelo && h.modelo.toLowerCase().includes(searchHerr.toLowerCase()))
    const matchEstado = filterEstadoHerr === 'todos' || h.estado === filterEstadoHerr
    return matchSearch && matchEstado
  })

  // Estadísticas de materiales cubiertas por <TableroIndicadores> al inicio del módulo.

  const openDialog = (material: Material) => {
    setSelectedMaterial(material)
    setFormData({
      stockActual: material.stockActual,
      stockMinimo: material.stockMinimo,
      ubicacion: material.ubicacion || '',
    })
    setDialogOpen(true)
  }

  const openAdjustDialog = (material: Material) => {
    setSelectedMaterial(material)
    setAdjustFormData({
      stockNuevo: material.stockActual,
      motivo: '',
      referencia: '',
      observaciones: '',
    })
    setAdjustDialogOpen(true)
  }

  const handleSave = async () => {
    if (!selectedMaterial) return

    try {
      await fetch(`/api/catalogos/materiales/${selectedMaterial.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      setDialogOpen(false)
      fetchMateriales()
    } catch (error) {
      console.error('Error updating material:', error)
    }
  }

  const handleAdjustSave = async () => {
    if (!selectedMaterial) return

    try {
      await fetch(`/api/catalogos/materiales/${selectedMaterial.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stockActual: adjustFormData.stockNuevo,
          movimientoMotivo: adjustFormData.motivo,
          movimientoReferencia: adjustFormData.referencia,
          movimientoObservaciones: adjustFormData.observaciones,
          usuarioNombre: 'Sistema', // In a real app, this would be the logged-in user
        }),
      })
      setAdjustDialogOpen(false)
      fetchMateriales()
      fetchMovimientos()
    } catch (error) {
      console.error('Error adjusting stock:', error)
    }
  }

  const adjustStock = async (material: Material, adjustment: number) => {
    const newStock = Math.max(0, material.stockActual + adjustment)
    const tipo = adjustment > 0 ? 'Entrada' : 'Salida'
    
    try {
      await fetch(`/api/catalogos/materiales/${material.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stockActual: newStock,
          movimientoTipo: tipo,
          movimientoMotivo: adjustment > 0 ? 'Incremento rápido' : 'Decremento rápido',
          usuarioNombre: 'Sistema',
        }),
      })
      fetchMateriales()
      fetchMovimientos()
    } catch (error) {
      console.error('Error adjusting stock:', error)
    }
  }

  // Obtener categorías únicas
  const categorias = [...new Set(materiales.map(m => m.categoria))].sort()

  // Export to CSV
  const exportMovimientosToCSV = () => {
    const headers = [
      'Fecha', 'Tipo', 'Material', 'Código', 'Cantidad', 
      'Stock Anterior', 'Stock Nuevo', 'Motivo', 'Referencia', 'Usuario'
    ]
    
    const rows = movimientos.map(m => [
      formatDate(m.createdAt),
      m.tipo,
      m.materialNombre,
      m.materialCodigo || '',
      m.cantidad.toString(),
      m.stockAnterior.toString(),
      m.stockNuevo.toString(),
      m.motivo || '',
      m.referencia || '',
      m.usuarioNombre || ''
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `movimientos_inventario_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const totalPages = Math.ceil(movimientosTotal / 20)

  // Estadísticas separadas para Consumibles y Herramientas
  const categoriasCount = new Set(materiales.map(m => m.categoria).filter(Boolean)).size
  const stockBajoCount = materiales.filter(m => m.stockActual < m.stockMinimo).length
  const stockTotal = materiales.reduce((sum, m) => sum + (m.stockActual || 0), 0)

  const totalHerramientas = herramientas.reduce((sum, h) => sum + (h.cantidad || 0), 0)
  const herrOperativas = herramientas.filter(h => h.estado === 'Operativo' || h.estado === 'Bueno').length
  const herrReparacion = herramientas.filter(h =>
    h.estado === 'En reparación' || h.estado === 'En Reparación' || h.estado === 'Falta Mantención'
  ).length
  const valorTotalHerramientas = herramientas.reduce((sum, h) => sum + (h.valorReposicion || 0) * (h.cantidad || 1), 0)

  return (
    <div className="space-y-5">
      <TableroIndicadores
        cards={[
          { titulo: 'Consumibles', numero: materiales.length, icon: <Package className="w-5 h-5" />, color: 'azul' },
          { titulo: 'Herramientas', numero: totalHerramientas, icon: <Wrench className="w-5 h-5" />, color: 'purpura' },
          { titulo: 'Stock Bajo', numero: stockBajoCount, icon: <AlertTriangle className="w-5 h-5" />, color: 'rojo' },
          { titulo: 'Herr. Operativas', numero: herrOperativas, icon: <Boxes className="w-5 h-5" />, color: 'verde' },
          { titulo: 'En Reparación', numero: herrReparacion, icon: <RefreshCw className="w-5 h-5" />, color: 'naranja' },
          { titulo: 'Valor Herramientas', numero: formatCLP(valorTotalHerramientas), icon: <FolderTree className="w-5 h-5" />, color: 'cyan' },
        ]}
      />
      <Tabs defaultValue="inventario" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="inventario" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Consumibles
            {materiales.length > 0 && (
              <span className="ml-1 text-[10px] bg-slate-200 text-slate-700 rounded-full px-1.5 py-0.5 font-bold">
                {materiales.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="herramientas" className="flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            Herramientas
            {herramientas.length > 0 && (
              <span className="ml-1 text-[10px] bg-slate-200 text-slate-700 rounded-full px-1.5 py-0.5 font-bold">
                {herramientas.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="movimientos" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Movimientos
          </TabsTrigger>
        </TabsList>

        {/* INVENTARIO TAB - CONSUMIBLES */}
        <TabsContent value="inventario" className="space-y-5 mt-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar consumible..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterCategoria} onValueChange={setFilterCategoria}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las categorías</SelectItem>
                {categorias.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStock} onValueChange={setFilterStock}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Stock" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todo el stock</SelectItem>
                <SelectItem value="bajo">Stock bajo</SelectItem>
                <SelectItem value="normal">Stock normal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Consumibles ({filteredMateriales.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Código</th>
                      <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Material</th>
                      <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Categoría</th>
                      <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Stock Actual</th>
                      <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Stock Mínimo</th>
                      <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Unidad</th>
                      <th className="text-right p-3 text-[10px] font-bold text-slate-500 uppercase">Precio Unit.</th>
                      <th className="text-right p-3 text-[10px] font-bold text-slate-500 uppercase">Valor Total</th>
                      <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Ubicación</th>
                      <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Estado</th>
                      <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={11} className="p-8 text-center text-slate-400">Cargando...</td></tr>
                    ) : filteredMateriales.length === 0 ? (
                      <tr><td colSpan={11} className="p-8 text-center text-slate-400">Sin materiales</td></tr>
                    ) : (
                      filteredMateriales.map((mat) => {
                        const isLowStock = mat.stockActual <= mat.stockMinimo
                        const valorTotal = mat.stockActual * mat.precioUnit
                        
                        return (
                          <tr key={mat.id} className={`border-b last:border-0 hover:bg-slate-50 ${isLowStock ? 'bg-red-50' : ''}`}>
                            <td className="p-3 font-mono text-xs font-semibold text-[#0f2044]">
                              {mat.codigo || '–'}
                            </td>
                            <td className="p-3">
                              <div className="font-semibold">{mat.nombre}</div>
                              {mat.descripcion && (
                                <div className="text-xs text-slate-500 truncate max-w-[200px]">{mat.descripcion}</div>
                              )}
                            </td>
                            <td className="p-3">
                              <Badge className={categoriaColors[mat.categoria] || categoriaColors['General']}>
                                {mat.categoria}
                              </Badge>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  aria-label="Disminuir stock"
                                  onClick={() => adjustStock(mat, -1)}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <span className={`font-bold min-w-[40px] ${isLowStock ? 'text-red-600' : ''}`}>
                                  {mat.stockActual}
                                </span>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  aria-label="Aumentar stock"
                                  onClick={() => adjustStock(mat, 1)}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            </td>
                            <td className="p-3 text-center font-semibold">{mat.stockMinimo}</td>
                            <td className="p-3 text-center text-xs">{mat.unidad}</td>
                            <td className="p-3 text-right font-mono text-xs">{formatCLP(mat.precioUnit)}</td>
                            <td className="p-3 text-right font-mono text-xs font-bold">{formatCLP(valorTotal)}</td>
                            <td className="p-3 text-xs">{mat.ubicacion || '–'}</td>
                            <td className="p-3 text-center">
                              {isLowStock ? (
                                <Badge className="bg-red-100 text-red-700">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  Bajo
                                </Badge>
                              ) : (
                                <Badge className="bg-green-100 text-green-700">OK</Badge>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex justify-center gap-1">
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-7 w-7" 
                                  onClick={() => openAdjustDialog(mat)}
                                  title="Ajustar Stock"
                                  aria-label="Ver movimientos"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-7 w-7" 
                                  onClick={() => openDialog(mat)}
                                  title="Editar"
                                  aria-label="Editar"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HERRAMIENTAS TAB - independiente de consumibles */}
        <TabsContent value="herramientas" className="space-y-5 mt-4">
          {/* Filters propios para herramientas */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar herramienta por nombre, código, marca..."
                value={searchHerr}
                onChange={(e) => setSearchHerr(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterEstadoHerr} onValueChange={setFilterEstadoHerr}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="Operativo">Operativo</SelectItem>
                <SelectItem value="Bueno">Bueno</SelectItem>
                <SelectItem value="Regular">Regular</SelectItem>
                <SelectItem value="Malo">Malo</SelectItem>
                <SelectItem value="Falta Mantención">Falta Mantención</SelectItem>
                <SelectItem value="En reparación">En reparación</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { setSearchHerr(''); setFilterEstadoHerr('todos') }}>
              <RefreshCw className="w-4 h-4 mr-1" /> Limpiar
            </Button>
          </div>

          {/* Tabla de herramientas */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Herramientas ({filteredHerramientas.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Código</th>
                      <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Herramienta</th>
                      <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Marca / Modelo</th>
                      <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Cantidad</th>
                      <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Estado</th>
                      <th className="text-right p-3 text-[10px] font-bold text-slate-500 uppercase">Valor Reposición</th>
                      <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Ubicación</th>
                      <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Manual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {herrLoading ? (
                      <tr><td colSpan={8} className="p-8 text-center text-slate-400">Cargando herramientas...</td></tr>
                    ) : filteredHerramientas.length === 0 ? (
                      <tr><td colSpan={8} className="p-8 text-center text-slate-400">
                        {herramientas.length === 0
                          ? 'No hay herramientas registradas'
                          : 'Sin resultados para la búsqueda'}
                      </td></tr>
                    ) : (
                      filteredHerramientas.map((h) => (
                        <tr key={h.id} className="border-b last:border-0 hover:bg-slate-50">
                          <td className="p-3 font-mono text-xs font-semibold text-[#0f2044]">
                            {h.codigo || '–'}
                          </td>
                          <td className="p-3">
                            <div className="font-semibold">{h.nombre}</div>
                            {h.descripcion && (
                              <div className="text-xs text-slate-500 truncate max-w-[200px]">{h.descripcion}</div>
                            )}
                          </td>
                          <td className="p-3 text-xs">
                            {h.marca || h.modelo ? (
                              <div>
                                {h.marca && <div className="font-medium">{h.marca}</div>}
                                {h.modelo && <div className="text-slate-500">{h.modelo}</div>}
                              </div>
                            ) : '–'}
                          </td>
                          <td className="p-3 text-center font-bold">{h.cantidad}</td>
                          <td className="p-3 text-center">
                            <Badge className={estadoHerramientaColors[h.estado] || 'bg-slate-100 text-slate-700'}>
                              {h.estado}
                            </Badge>
                          </td>
                          <td className="p-3 text-right font-mono text-xs">
                            {h.valorReposicion > 0 ? formatCLP(h.valorReposicion) : '–'}
                          </td>
                          <td className="p-3 text-xs">{h.ubicacion || '–'}</td>
                          <td className="p-3 text-center">
                            {h.tieneManual ? (
                              <Badge className="bg-green-100 text-green-700">Sí</Badge>
                            ) : (
                              <span className="text-slate-400 text-xs">–</span>
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
          <p className="text-xs text-slate-500">
            💡 Para editar herramientas, registrar salidas del pañol o imprimir Listas de Verificación,
            usa el módulo <strong>Herramientas</strong> en el menú lateral.
          </p>
        </TabsContent>

        {/* MOVIMIENTOS TAB */}
        <TabsContent value="movimientos" className="space-y-5 mt-4">
          <TableroIndicadores
            cards={[
              { titulo: 'Movimientos Hoy', numero: movimientosStats.movimientosHoy, icon: <Calendar className="w-5 h-5" />, color: 'primary' },
              { titulo: 'Entradas del Mes', numero: movimientosStats.entradasMes, icon: <ArrowUpRight className="w-5 h-5" />, color: 'verde' },
              { titulo: 'Salidas del Mes', numero: movimientosStats.salidasMes, icon: <ArrowDownRight className="w-5 h-5" />, color: 'rojo' },
              { titulo: 'Ajustes del Mes', numero: movimientosStats.ajustesMes, icon: <RefreshCw className="w-5 h-5" />, color: 'naranja' },
            ]}
          />

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los tipos</SelectItem>
                <SelectItem value="Entrada">Entrada</SelectItem>
                <SelectItem value="Salida">Salida</SelectItem>
                <SelectItem value="Ajuste">Ajuste</SelectItem>
                <SelectItem value="Transferencia">Transferencia</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterMaterialId} onValueChange={setFilterMaterialId}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Material" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los materiales</SelectItem>
                {materiales.slice(0, 50).map(mat => (
                  <SelectItem key={mat.id} value={mat.id}>{mat.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-slate-500">Desde:</Label>
              <Input
                type="date"
                value={filterFechaDesde}
                onChange={(e) => setFilterFechaDesde(e.target.value)}
                className="w-36"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-slate-500">Hasta:</Label>
              <Input
                type="date"
                value={filterFechaHasta}
                onChange={(e) => setFilterFechaHasta(e.target.value)}
                className="w-36"
              />
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={exportMovimientosToCSV}
              className="ml-auto"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>

          {/* Movements Table */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm">Historial de Movimientos ({movimientosTotal})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 z-10">
                    <tr className="border-b">
                      <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Fecha</th>
                      <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Tipo</th>
                      <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Material</th>
                      <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Cantidad</th>
                      <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Stock Anterior</th>
                      <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Stock Nuevo</th>
                      <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Motivo</th>
                      <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Referencia</th>
                      <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Usuario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientosLoading ? (
                      <tr><td colSpan={9} className="p-8 text-center text-slate-400">Cargando...</td></tr>
                    ) : movimientos.length === 0 ? (
                      <tr><td colSpan={9} className="p-8 text-center text-slate-400">Sin movimientos</td></tr>
                    ) : (
                      movimientos.map((mov) => (
                        <tr key={mov.id} className="border-b last:border-0 hover:bg-slate-50">
                          <td className="p-3 text-xs">
                            {formatDate(mov.createdAt)}
                          </td>
                          <td className="p-3">
                            <Badge className={tipoMovimientoColors[mov.tipo] || 'bg-slate-100'}>
                              {mov.tipo}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="font-semibold">{mov.materialNombre}</div>
                            {mov.materialCodigo && (
                              <div className="text-xs text-slate-500 font-mono">{mov.materialCodigo}</div>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`font-bold ${mov.tipo === 'Entrada' ? 'text-green-600' : mov.tipo === 'Salida' ? 'text-red-600' : ''}`}>
                              {mov.tipo === 'Entrada' ? '+' : mov.tipo === 'Salida' ? '-' : ''}{mov.cantidad}
                            </span>
                          </td>
                          <td className="p-3 text-center font-semibold">{mov.stockAnterior}</td>
                          <td className="p-3 text-center font-semibold">{mov.stockNuevo}</td>
                          <td className="p-3 text-xs">{mov.motivo || '–'}</td>
                          <td className="p-3 text-xs">{mov.referencia || '–'}</td>
                          <td className="p-3 text-xs">{mov.usuarioNombre || 'Sistema'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMovimientosPage(p => Math.max(1, p - 1))}
                disabled={movimientosPage === 1}
              >
                Anterior
              </Button>
              <span className="text-sm text-slate-500">
                Página {movimientosPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMovimientosPage(p => Math.min(totalPages, p + 1))}
                disabled={movimientosPage === totalPages}
              >
                Siguiente
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Stock</DialogTitle>
          </DialogHeader>
          {selectedMaterial && (
            <div className="space-y-4 py-4">
              <div className="bg-slate-50 p-3 rounded-lg">
                <div className="font-semibold">{selectedMaterial.nombre}</div>
                <div className="text-xs text-slate-500">{selectedMaterial.codigo}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Stock Actual</Label>
                  <Input 
                    type="number" 
                    value={formData.stockActual} 
                    onChange={(e) => setFormData({...formData, stockActual: parseInt(e.target.value) || 0})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stock Mínimo</Label>
                  <Input 
                    type="number" 
                    value={formData.stockMinimo} 
                    onChange={(e) => setFormData({...formData, stockMinimo: parseInt(e.target.value) || 0})} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Ubicación</Label>
                <Input 
                  value={formData.ubicacion} 
                  onChange={(e) => setFormData({...formData, ubicacion: e.target.value})} 
                  placeholder="Ej: Bodega A, Estante 3"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Adjustment Dialog */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajuste de Stock</DialogTitle>
          </DialogHeader>
          {selectedMaterial && (
            <div className="space-y-4 py-4">
              <div className="bg-slate-50 p-3 rounded-lg">
                <div className="font-semibold">{selectedMaterial.nombre}</div>
                <div className="text-xs text-slate-500">{selectedMaterial.codigo}</div>
                <div className="text-sm mt-1">
                  Stock actual: <span className="font-bold">{selectedMaterial.stockActual}</span> {selectedMaterial.unidad}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Nuevo Stock</Label>
                <Input 
                  type="number" 
                  value={adjustFormData.stockNuevo} 
                  onChange={(e) => setAdjustFormData({...adjustFormData, stockNuevo: parseInt(e.target.value) || 0})} 
                />
                <div className="text-xs text-slate-500">
                  Diferencia: {adjustFormData.stockNuevo - selectedMaterial.stockActual > 0 ? '+' : ''}{adjustFormData.stockNuevo - selectedMaterial.stockActual} unidades
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Motivo del Ajuste</Label>
                <Select 
                  value={adjustFormData.motivo} 
                  onValueChange={(value) => setAdjustFormData({...adjustFormData, motivo: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOTIVOS_OPTIONS.map(motivo => (
                      <SelectItem key={motivo} value={motivo}>{motivo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Referencia (opcional)</Label>
                <Input 
                  value={adjustFormData.referencia} 
                  onChange={(e) => setAdjustFormData({...adjustFormData, referencia: e.target.value})} 
                  placeholder="Ej: N° OT, N° Factura, etc."
                />
              </div>
              
              <div className="space-y-2">
                <Label>Observaciones (opcional)</Label>
                <Textarea 
                  value={adjustFormData.observaciones} 
                  onChange={(e) => setAdjustFormData({...adjustFormData, observaciones: e.target.value})} 
                  placeholder="Notas adicionales..."
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdjustSave}>Registrar Ajuste</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
