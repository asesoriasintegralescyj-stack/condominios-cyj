'use client'

import { useEffect, useState, useRef } from 'react'
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
  FolderTree, Boxes, Wrench, DollarSign, Upload, FileSpreadsheet, X
} from 'lucide-react'
import { TableroIndicadores } from '@/components/ui/tablero-indicadores'
import { apiFetch } from '@/lib/api-client'
import { toast } from 'sonner'

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
  imagenUrl?: string | null
  fuente?: string | null
  ultimaActPrecio?: string | null
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
  imagenUrl?: string | null
  fuente?: string | null
  ultimaActPrecio?: string | null
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

  // ===== Estado para refresco de valores =====
  const [refreshing, setRefreshing] = useState(false)
  const [ultimaActualizacion, setUltimaActualizacion] = useState<string | null>(null)

  // ===== Estado para importación masiva de catálogo =====
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importTipo, setImportTipo] = useState<'material' | 'herramienta'>('material')
  const [importFuente, setImportFuente] = useState('Sodimac')
  const [importData, setImportData] = useState('')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: number; errors: string[]; creados: number; actualizados: number } | null>(null)
  const importFileRef = useRef<HTMLInputElement>(null)

  // Función para refrescar valores (botón "Refrescar valores")
  const handleRefreshValues = async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/actualizar-precios', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setUltimaActualizacion(data.fecha_actualizacion)
        toast.success(`Valores actualizados. Total inventario: ${formatCLP(data.estadisticas.valor_total_inventario)}`)
        // Recargar datos
        await Promise.all([fetchMateriales(), fetchHerramientas()])
      } else {
        toast.error(data.error || 'Error al refrescar valores')
      }
    } catch (error) {
      console.error('Error refrescando valores:', error)
      toast.error('Error de conexión al refrescar valores')
    }
    setRefreshing(false)
  }

  // Función para obtener el mejor precio de un material
  const [buscandoMejorPrecio, setBuscandoMejorPrecio] = useState<string | null>(null)
  const handleMejorPrecio = async (material: Material) => {
    setBuscandoMejorPrecio(material.id)
    try {
      const res = await fetch(`/api/mejor-precio?materialId=${material.id}&forzar=true`)
      const data = await res.json()
      if (data.success) {
        toast.success(
          `Mejor precio: ${formatCLP(data.mejor_precio)} en ${data.mejor_tienda}`,
          { duration: 6000 }
        )
        // Recargar materiales para reflejar el nuevo precio si se actualizó
        await fetchMateriales()
      } else {
        toast.warning(data.mensaje || 'No se encontraron precios')
      }
    } catch (error) {
      console.error('Error obteniendo mejor precio:', error)
      toast.error('Error al buscar mejor precio')
    }
    setBuscandoMejorPrecio(null)
  }

  // ===== Funciones para importación masiva de catálogo =====

  // Manejar selección de archivo Excel/CSV
  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const XLSX = await import('xlsx')
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      // Convertir a formato CSV pegable en el textarea
      if (jsonData.length > 0) {
        const headers = Object.keys(jsonData[0] as Record<string, unknown>)
        const csvLines = [headers.join(',')]
        for (const row of jsonData) {
          const values = headers.map(h => {
            const v = (row as Record<string, unknown>)[h]
            return v === null || v === undefined ? '' : `"${String(v).replace(/"/g, '""')}"`
          })
          csvLines.push(values.join(','))
        }
        setImportData(csvLines.join('\n'))
        toast.success(`${jsonData.length} filas cargadas del archivo`)
      }
    } catch (error) {
      console.error('Error leyendo archivo:', error)
      toast.error('Error al leer el archivo. Asegúrate de que sea Excel o CSV válido.')
    }

    if (importFileRef.current) {
      importFileRef.current.value = ''
    }
  }

  // Parsear CSV pegado a array de objetos
  const parseCSV = (csv: string): Record<string, string>[] => {
    const lines = csv.trim().split('\n')
    if (lines.length < 2) return []

    const parseLine = (line: string): string[] => {
      const result: string[] = []
      let current = ''
      let inQuotes = false
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"'
            i++
          } else {
            inQuotes = !inQuotes
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      result.push(current.trim())
      return result
    }

    const headers = parseLine(lines[0]).map(h => h.toLowerCase().trim())
    const rows: Record<string, string>[] = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      const values = parseLine(line)
      const row: Record<string, string> = {}
      headers.forEach((h, idx) => {
        row[h] = values[idx] || ''
      })
      rows.push(row)
    }

    return rows
  }

  // Ejecutar importación
  const handleImport = async () => {
    if (!importData.trim()) {
      toast.error('Pega datos CSV o sube un archivo primero')
      return
    }

    setImporting(true)
    setImportResult(null)

    try {
      const rows = parseCSV(importData)

      if (rows.length === 0) {
        toast.error('No se pudieron parsear los datos. Verifica el formato CSV.')
        setImporting(false)
        return
      }

      // Mapear filas a objetos según el tipo
      const items = rows.map(r => {
        // Buscar campos por nombres comunes (flexible)
        const get = (...keys: string[]) => {
          for (const k of keys) {
            for (const rk of Object.keys(r)) {
              if (rk.includes(k)) return r[rk]
            }
          }
          return ''
        }

        if (importTipo === 'material') {
          return {
            codigo: get('codigo', 'code', 'sku') || undefined,
            nombre: get('nombre', 'name', 'producto', 'descripcion'),
            categoria: get('categoria', 'category', 'rubro') || 'General',
            unidad: get('unidad', 'unit') || 'unidad',
            precioUnit: get('precio', 'price', 'valor', 'preciounit') || '0',
            stockMinimo: get('stockmin', 'min', 'stock') || '0',
            ubicacion: get('ubicacion', 'location') || '',
            imagenUrl: get('imagen', 'image', 'foto', 'url') || '',
            fuente: get('fuente', 'tienda', 'store') || importFuente,
          }
        } else {
          return {
            codigo: get('codigo', 'code', 'sku') || undefined,
            nombre: get('nombre', 'name', 'producto'),
            marca: get('marca', 'brand') || '',
            modelo: get('modelo', 'model') || '',
            cantidad: get('cantidad', 'quantity', 'qty') || '1',
            estado: get('estado', 'status') || 'Bueno',
            valorReposicion: get('valor', 'precio', 'price', 'valorreposicion') || '0',
            ubicacion: get('ubicacion', 'location') || '',
            imagenUrl: get('imagen', 'image', 'foto') || '',
            fuente: get('fuente', 'tienda') || importFuente,
          }
        }
      })

      // Filtrar items sin nombre
      const validos = items.filter(i => i.nombre && i.nombre.trim())
      if (validos.length === 0) {
        toast.error('No hay filas válidas con nombre de producto')
        setImporting(false)
        return
      }

      // Enviar al endpoint
      const url = importTipo === 'material'
        ? '/api/catalogos/materiales/importar'
        : '/api/catalogos/herramientas/importar'

      const body = importTipo === 'material'
        ? { materiales: validos, fuente: importFuente }
        : { herramientas: validos, fuente: importFuente }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (data.success) {
        setImportResult({
          success: data.resultados.creados + data.resultados.actualizados,
          errors: data.resultados.errores,
          creados: data.resultados.creados,
          actualizados: data.resultados.actualizados,
        })
        toast.success(data.mensaje)
        // Recargar datos
        await Promise.all([fetchMateriales(), fetchHerramientas()])
      } else {
        toast.error(data.error || 'Error en la importación')
      }
    } catch (error) {
      console.error('Error importando:', error)
      toast.error('Error al importar catálogo')
    }
    setImporting(false)
  }

  // Descargar plantilla CSV
  const downloadTemplate = () => {
    const headers = importTipo === 'material'
      ? 'codigo,nombre,categoria,unidad,precioUnit,stockMinimo,ubicacion,imagenUrl,fuente'
      : 'codigo,nombre,marca,modelo,cantidad,estado,valorReposicion,ubicacion,imagenUrl,fuente'

    const ejemplo = importTipo === 'material'
      ? 'MAT-SOD-001,Cemento Polpaico 25kg,Ferretería,saco,5180,5,Bodega Central,https://imagen.jpg,Sodimac'
      : 'HERR-SOD-001,Taladro Percutor 13mm,Bosch,GSB-13-RE,1,Bueno,89990,Pañol,https://imagen.jpg,Sodimac'

    const csv = `${headers}\n${ejemplo}\n`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `plantilla_${importTipo}_catalogo.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

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
      {/* Botón para refrescar valores del inventario */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs text-slate-500">
          {ultimaActualizacion ? (
            <span>Última actualización: {new Date(ultimaActualizacion).toLocaleString('es-CL')}</span>
          ) : (
            <span>Sincroniza los precios con Sodimac, Easy, Imperial, Construplaza y MercadoLibre</span>
          )}
        </div>
        <Button
          onClick={handleRefreshValues}
          disabled={refreshing}
          variant="default"
          className="bg-[#0f2044] hover:bg-[#0a1628]"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Actualizando...' : 'Refrescar valores'}
        </Button>
        <Button
          onClick={() => { setImportResult(null); setImportData(''); setImportDialogOpen(true) }}
          variant="outline"
          className="border-[#0f2044] text-[#0f2044] hover:bg-[#0f2044] hover:text-white"
        >
          <Upload className="w-4 h-4 mr-2" />
          Importar Catálogo
        </Button>
      </div>

      <TableroIndicadores
        cards={[
          { titulo: 'Consumibles', numero: materiales.length, icon: <Package className="w-5 h-5" />, color: 'azul' },
          { titulo: 'Herramientas', numero: totalHerramientas, icon: <Wrench className="w-5 h-5" />, color: 'purpura' },
          { titulo: 'Stock Bajo', numero: stockBajoCount, icon: <AlertTriangle className="w-5 h-5" />, color: 'rojo' },
          { titulo: 'Herr. Operativas', numero: herrOperativas, icon: <Boxes className="w-5 h-5" />, color: 'verde' },
          { titulo: 'En Reparación', numero: herrReparacion, icon: <RefreshCw className="w-5 h-5" />, color: 'naranja' },
          { titulo: 'Valor Herramientas', numero: formatCLP(valorTotalHerramientas), icon: <DollarSign className="w-5 h-5" />, color: 'cyan' },
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
                      <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Imagen</th>
                      <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Código</th>
                      <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Material</th>
                      <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Categoría</th>
                      <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Stock Actual</th>
                      <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Stock Mínimo</th>
                      <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Unidad</th>
                      <th className="text-right p-3 text-[10px] font-bold text-slate-500 uppercase">Precio Unit.</th>
                      <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Fuente</th>
                      <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={10} className="p-8 text-center text-slate-400">Cargando...</td></tr>
                    ) : filteredMateriales.length === 0 ? (
                      <tr><td colSpan={10} className="p-8 text-center text-slate-400">Sin materiales</td></tr>
                    ) : (
                      filteredMateriales.map((mat) => {
                        const isLowStock = mat.stockActual <= mat.stockMinimo
                        const valorTotal = mat.stockActual * mat.precioUnit

                        return (
                          <tr key={mat.id} className={`border-b last:border-0 hover:bg-slate-50 ${isLowStock ? 'bg-red-50' : ''}`}>
                            <td className="p-3">
                              {mat.imagenUrl ? (
                                <img
                                  src={mat.imagenUrl}
                                  alt={mat.nombre}
                                  className="w-12 h-12 object-cover rounded border border-slate-200"
                                  loading="lazy"
                                  onError={(e) => {
                                    ;(e.target as HTMLImageElement).style.display = 'none'
                                  }}
                                />
                              ) : (
                                <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center text-slate-400">
                                  <Package className="w-5 h-5" />
                                </div>
                              )}
                            </td>
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
                            <td className="p-3 text-right font-mono text-xs font-bold">{formatCLP(mat.precioUnit)}</td>
                            <td className="p-3 text-xs">
                              {mat.fuente ? (
                                <Badge className="bg-slate-100 text-slate-700">{mat.fuente}</Badge>
                              ) : '–'}
                              {mat.ultimaActPrecio && (
                                <div className="text-[10px] text-slate-400 mt-0.5">
                                  {new Date(mat.ultimaActPrecio).toLocaleDateString('es-CL')}
                                </div>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="flex justify-center gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-green-600 hover:text-green-700"
                                  onClick={() => handleMejorPrecio(mat)}
                                  disabled={buscandoMejorPrecio === mat.id}
                                  title="Buscar mejor precio en tiendas"
                                  aria-label="Mejor precio"
                                >
                                  {buscandoMejorPrecio === mat.id ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <DollarSign className="w-3.5 h-3.5" />
                                  )}
                                </Button>
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
                      <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Imagen</th>
                      <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Código</th>
                      <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Herramienta</th>
                      <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Marca / Modelo</th>
                      <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Cantidad</th>
                      <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Estado</th>
                      <th className="text-right p-3 text-[10px] font-bold text-slate-500 uppercase">Valor Reposición</th>
                      <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Fuente</th>
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
                          <td className="p-3">
                            {h.imagenUrl ? (
                              <img
                                src={h.imagenUrl}
                                alt={h.nombre}
                                className="w-12 h-12 object-cover rounded border border-slate-200"
                                loading="lazy"
                                onError={(e) => {
                                  ;(e.target as HTMLImageElement).style.display = 'none'
                                }}
                              />
                            ) : (
                              <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center text-slate-400">
                                <Wrench className="w-5 h-5" />
                              </div>
                            )}
                          </td>
                          <td className="p-3 font-mono text-xs font-semibold text-[#0f2044]">
                            {h.codigo || '–'}
                          </td>
                          <td className="p-3">
                            <div className="font-semibold">{h.nombre}</div>
                            {h.descripcion && (
                              <div className="text-xs text-slate-500 truncate max-w-[200px]">{h.descripcion}</div>
                            )}
                            <div className="text-[10px] text-slate-400">{h.ubicacion}</div>
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
                          <td className="p-3 text-xs">
                            {h.fuente ? (
                              <div>
                                <Badge className="bg-slate-100 text-slate-700">{h.fuente}</Badge>
                                {h.ultimaActPrecio && (
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    {new Date(h.ultimaActPrecio).toLocaleDateString('es-CL')}
                                  </div>
                                )}
                              </div>
                            ) : '–'}
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

      {/* ===== Diálogo de Importación Masiva de Catálogo ===== */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Importar Catálogo Completo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Instrucciones */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 space-y-1">
              <p className="font-bold">Cómo importar el catálogo completo de una tienda:</p>
              <p>1. Ve al sitio web de la tienda (Sodimac, Easy, Imperial, Construplaza o MercadoLibre)</p>
              <p>2. Navega a la categoría de productos que quieres importar</p>
              <p>3. Copia los datos de los productos (nombre, precio, etc.) o exporta a Excel/CSV</p>
              <p>4. Pega los datos abajo o sube el archivo Excel/CSV</p>
              <p>5. Selecciona el tipo (Consumible o Herramienta) y la tienda origen</p>
              <p>6. Haz clic en "Importar"</p>
              <p className="mt-1">💡 <strong>Formato flexible:</strong> el sistema detecta automáticamente las columnas por nombre (codigo, nombre, precio, imagen, etc.)</p>
            </div>

            {/* Tipo y fuente */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tipo de producto</Label>
                <Select value={importTipo} onValueChange={(v) => setImportTipo(v as 'material' | 'herramienta')}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="material">Consumibles / Materiales</SelectItem>
                    <SelectItem value="herramienta">Herramientas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tienda origen</Label>
                <Select value={importFuente} onValueChange={setImportFuente}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sodimac">Sodimac</SelectItem>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Imperial">Imperial</SelectItem>
                    <SelectItem value="Construplaza">Construplaza</SelectItem>
                    <SelectItem value="MercadoLibre">MercadoLibre</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Botones de archivo y plantilla */}
            <div className="flex gap-2">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                ref={importFileRef}
                onChange={handleImportFile}
                className="hidden"
              />
              <Button variant="outline" onClick={() => importFileRef.current?.click()} className="flex-1">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Subir Excel/CSV
              </Button>
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Descargar Plantilla
              </Button>
            </div>

            {/* Textarea para pegar CSV */}
            <div className="space-y-1">
              <Label className="text-xs">
                Datos CSV (pega aquí o sube un archivo arriba)
              </Label>
              <Textarea
                className="w-full font-mono text-xs"
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder={
                  importTipo === 'material'
                    ? 'codigo,nombre,categoria,unidad,precioUnit,stockMinimo,ubicacion,imagenUrl,fuente\nMAT-001,Cemento 25kg,Ferretería,saco,5180,5,Bodega,,Sodimac\nMAT-002,Tubo PVC 25mm,Fontanería,metro,1090,20,Bodega,,Sodimac'
                    : 'codigo,nombre,marca,modelo,cantidad,estado,valorReposicion,ubicacion,imagenUrl,fuente\nHERR-001,Taladro Percutor,Bosch,GSB-13,1,Bueno,89990,Pañol,,Sodimac'
                }
                rows={10}
              />
              {importData && (
                <p className="text-[10px] text-slate-500">
                  {importData.trim().split('\n').length - 1} filas detectadas
                </p>
              )}
            </div>

            {/* Resultados */}
            {importResult && (
              <div className={`p-3 rounded-lg text-sm ${importResult.errors.length > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
                <p className="font-bold mb-1">Resultado de la importación:</p>
                <p>✓ Creados: {importResult.creados}</p>
                <p>↻ Actualizados: {importResult.actualizados}</p>
                {importResult.errors.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-amber-700">
                      ⚠ {importResult.errors.length} errores
                    </summary>
                    <ul className="text-xs mt-1 space-y-0.5 max-h-32 overflow-y-auto">
                      {importResult.errors.slice(0, 50).map((e, i) => (
                        <li key={i} className="text-red-600">• {e}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}

            {/* Columnas soportadas */}
            <div className="text-[10px] text-slate-400 border-t pt-2">
              <p className="font-medium">Columnas detectadas automáticamente:</p>
              <p>{importTipo === 'material'
                ? 'codigo, nombre, categoria, unidad, precioUnit/precio/valor, stockMinimo/stock, ubicacion, imagenUrl/imagen/url, fuente/tienda'
                : 'codigo, nombre, marca, modelo, cantidad, estado, valorReposicion/valor/precio, ubicacion, imagenUrl/imagen, fuente/tienda'}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cerrar</Button>
            <Button onClick={handleImport} disabled={importing || !importData.trim()}>
              {importing ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Importando...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" />Importar</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
