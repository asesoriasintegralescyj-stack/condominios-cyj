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
import { Plus, Pencil, Trash2, Upload, Download, AlertCircle, CheckCircle, Search, Printer, FileSpreadsheet } from 'lucide-react'

interface CatMaterial {
  id: string
  codigo: string | null
  nombre: string
  descripcion: string | null
  unidad: string
  precioUnit: number
  stockActual: number
  stockMinimo: number
  categoria: string
  ubicacion: string | null
}

interface BulkResult {
  show: boolean
  total: number
  created: number
  updated: number
  skipped: number
  errors: string[]
}

const formatCLP = (n: number) => 
  '$' + new Intl.NumberFormat('es-CL').format(Math.round(n || 0))

const CATEGORIAS = [
  'Construcción',
  'Electricidad',
  'Fontanería',
  'Ferretería',
  'Pintura',
  'Jardinería',
  'Limpieza',
  'Seguridad',
  'General'
]

const UNIDADES = [
  'unidad',
  'saco',
  'kg',
  'litro',
  'galón',
  'metro',
  'm²',
  'm³',
  'caja',
  'rollo',
  'tubo',
  'lata',
  'bolsa',
  'pie'
]

const UBICACIONES = [
  'Bodega A',
  'Bodega B',
  'Bodega C',
  'Almacén Principal',
  'Container 1',
  'Container 2',
  'Patio',
  'Oficina'
]

export function MaterialesModule() {
  const [materiales, setMateriales] = useState<CatMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoriaFilter, setCategoriaFilter] = useState<string>('')

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CatMaterial | null>(null)

  // Form
  const [form, setForm] = useState({ 
    codigo: '', 
    nombre: '', 
    descripcion: '', 
    unidad: 'unidad', 
    precioUnit: 0, 
    stockActual: 0, 
    stockMinimo: 0, 
    categoria: 'General',
    ubicacion: ''
  })

  // Bulk upload state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/catalogos/materiales')
      setMateriales(await res.json())
    } catch (error) {
      console.error('Error fetching materiales:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    void (async () => {
      await fetchData()
    })()
  }, [])

  // Filter by search and categoria
  const filteredMateriales = materiales.filter(m => {
    const matchesSearch = 
      m.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (m.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (m.ubicacion?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
    const matchesCategoria = !categoriaFilter || m.categoria === categoriaFilter
    return matchesSearch && matchesCategoria
  })

  const openDialog = (item?: CatMaterial) => {
    if (item) {
      setEditingItem(item)
      setForm({ 
        codigo: item.codigo || '', 
        nombre: item.nombre, 
        descripcion: item.descripcion || '', 
        unidad: item.unidad, 
        precioUnit: item.precioUnit, 
        stockActual: item.stockActual, 
        stockMinimo: item.stockMinimo, 
        categoria: item.categoria,
        ubicacion: item.ubicacion || ''
      })
    } else {
      setEditingItem(null)
      setForm({ 
        codigo: '', 
        nombre: '', 
        descripcion: '', 
        unidad: 'unidad', 
        precioUnit: 0, 
        stockActual: 0, 
        stockMinimo: 0, 
        categoria: 'General',
        ubicacion: ''
      })
    }
    setDialogOpen(true)
  }

  const saveItem = async () => {
    if (!form.nombre.trim()) return
    try {
      const payload = {
        ...form,
        codigo: form.codigo || null,
        descripcion: form.descripcion || null,
        ubicacion: form.ubicacion || null
      }
      
      if (editingItem) {
        await fetch(`/api/catalogos/materiales/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        await fetch('/api/catalogos/materiales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      setDialogOpen(false)
      fetchData()
    } catch (error) {
      console.error('Error saving material:', error)
    }
  }

  const deleteItem = async (id: string) => {
    if (!confirm('¿Eliminar este material?')) return
    try {
      await fetch(`/api/catalogos/materiales/${id}`, { method: 'DELETE' })
      fetchData()
    } catch (error) {
      console.error('Error deleting material:', error)
    }
  }

  // Bulk upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setBulkUploading(true)
    setBulkResult(null)
    
    try {
      const XLSX = await import('xlsx')
      const reader = new FileReader()
      
      reader.onload = async (event) => {
        try {
          const data = event.target?.result
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet)
          
          const response = await fetch('/api/catalogos/materiales/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ materiales: jsonData }),
          })
          
          const result = await response.json()
          
          setBulkResult({
            show: true,
            total: result.total,
            created: result.created,
            updated: result.updated,
            skipped: result.skipped,
            errors: result.errors || [],
          })
          
          fetchData()
        } catch (error) {
          console.error('Error processing Excel:', error)
          setBulkResult({
            show: true,
            total: 0,
            created: 0,
            updated: 0,
            skipped: 0,
            errors: ['Error al procesar el archivo Excel'],
          })
        }
        setBulkUploading(false)
      }
      
      reader.readAsArrayBuffer(file)
    } catch (error) {
      console.error('Error reading file:', error)
      setBulkUploading(false)
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const downloadTemplate = () => {
    const templateData = [
      { 
        Codigo: 'MAT-001', 
        Nombre: 'Cemento 25kg', 
        Descripcion: 'Cemento Portland tipo I bolsa 25kg', 
        Unidad: 'saco', 
        PrecioUnit: 8500, 
        StockActual: 50, 
        StockMinimo: 10, 
        Categoria: 'Construcción', 
        Ubicacion: 'Bodega A' 
      },
      { 
        Codigo: 'MAT-002', 
        Nombre: 'Pintura Látex Blanca', 
        Descripcion: 'Pintura látex interior/exterior 20L', 
        Unidad: 'galón', 
        PrecioUnit: 15000, 
        StockActual: 20, 
        StockMinimo: 5, 
        Categoria: 'Pintura', 
        Ubicacion: 'Bodega B' 
      },
      { 
        Codigo: 'MAT-003', 
        Nombre: 'Tubería PVC 1"', 
        Descripcion: 'Tubería PVC presión 1" x 6m', 
        Unidad: 'metro', 
        PrecioUnit: 2500, 
        StockActual: 100, 
        StockMinimo: 20, 
        Categoria: 'Fontanería', 
        Ubicacion: 'Bodega A' 
      },
    ]
    
    import('xlsx').then(XLSX => {
      const ws = XLSX.utils.json_to_sheet(templateData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Materiales')
      XLSX.writeFile(wb, 'plantilla_materiales.xlsx')
    })
  }

  // Export to Excel
  const exportToExcel = () => {
    const exportData = filteredMateriales.map(m => ({
      Codigo: m.codigo || '',
      Nombre: m.nombre,
      Descripcion: m.descripcion || '',
      Unidad: m.unidad,
      PrecioUnit: m.precioUnit,
      StockActual: m.stockActual,
      StockMinimo: m.stockMinimo,
      Categoria: m.categoria,
      Ubicacion: m.ubicacion || ''
    }))
    
    import('xlsx').then(XLSX => {
      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Materiales')
      XLSX.writeFile(wb, `materiales_${new Date().toISOString().split('T')[0]}.xlsx`)
    })
  }

  // Export to printable view
  const handlePrint = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Catálogo de Materiales - Asesorías Integrales CyJ</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #0f2040; margin-bottom: 5px; }
          h2 { color: #666; font-size: 14px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
          th { background: #0f2040; color: white; }
          tr:nth-child(even) { background: #f9f9f9; }
          .footer { margin-top: 20px; font-size: 10px; color: #999; text-align: center; }
          .low-stock { background: #fff3cd !important; }
        </style>
      </head>
      <body>
        <h1>Asesorías Integrales CyJ</h1>
        <h2>Catálogo de Materiales - ${new Date().toLocaleDateString('es-CL')}</h2>
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Unidad</th>
              <th>Precio Unit.</th>
              <th>Stock Actual</th>
              <th>Stock Mín.</th>
              <th>Categoría</th>
              <th>Ubicación</th>
            </tr>
          </thead>
          <tbody>
            ${filteredMateriales.map(m => `
              <tr class="${m.stockActual <= m.stockMinimo ? 'low-stock' : ''}">
                <td>${m.codigo || '-'}</td>
                <td>${m.nombre}</td>
                <td>${m.descripcion || '-'}</td>
                <td>${m.unidad}</td>
                <td>${formatCLP(m.precioUnit)}</td>
                <td>${m.stockActual}</td>
                <td>${m.stockMinimo}</td>
                <td>${m.categoria}</td>
                <td>${m.ubicacion || '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          Generado el ${new Date().toLocaleString('es-CL')} | Total: ${filteredMateriales.length} materiales
        </div>
      </body>
      </html>
    `
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
    }
  }

  // Check stock status
  const getStockStatus = (stockActual: number, stockMinimo: number) => {
    if (stockActual === 0) return { label: 'Sin Stock', color: 'bg-red-100 text-red-700 border-red-200' }
    if (stockActual <= stockMinimo) return { label: 'Bajo', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' }
    return { label: 'OK', color: 'bg-green-100 text-green-700 border-green-200' }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Cargando materiales...</div>
  }

  return (
    <div className="space-y-5">
      {/* Bulk upload result */}
      {bulkResult?.show && (
        <Card className={`border-l-4 ${bulkResult.created > 0 || bulkResult.updated > 0 ? 'border-l-green-500' : 'border-l-yellow-500'}`}>
          <CardContent className="py-3">
            <div className="flex items-start gap-3">
              {bulkResult.created > 0 || bulkResult.updated > 0 ? (
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-semibold text-sm">Resultado de carga masiva</div>
                <div className="text-xs text-slate-600 mt-1">
                  Total: {bulkResult.total} | 
                  <span className="text-green-600 font-semibold ml-1">Creados: {bulkResult.created}</span> | 
                  <span className="text-blue-600 font-semibold ml-1">Actualizados: {bulkResult.updated}</span> | 
                  <span className="text-yellow-600 font-semibold ml-1">Omitidos: {bulkResult.skipped}</span>
                </div>
                {bulkResult.errors.length > 0 && (
                  <div className="text-xs text-red-600 mt-1">
                    Errores: {bulkResult.errors.slice(0, 3).join(', ')}
                  </div>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setBulkResult(null)}>✕</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="py-4 bg-[#0f2040] text-white rounded-t-lg">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-white">📦 Catálogo de Materiales ({filteredMateriales.length} de {materiales.length})</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint} className="bg-white border-slate-300 hover:bg-slate-100">
                  <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir
                </Button>
                <Button variant="outline" size="sm" onClick={exportToExcel} className="bg-white border-slate-300 hover:bg-slate-100">
                  <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Excel
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button variant="outline" size="sm" onClick={downloadTemplate} className="bg-white border-slate-300 hover:bg-slate-100">
                  <Download className="w-3.5 h-3.5 mr-1" /> Plantilla
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={bulkUploading}
                  className="bg-white border-slate-300 hover:bg-slate-100"
                >
                  {bulkUploading ? (
                    <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mr-1" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 mr-1" />
                  )}
                  Cargar
                </Button>
                <Button size="sm" onClick={() => openDialog()} className="bg-[#1a3a6a] hover:bg-[#0f2040]">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Agregar
                </Button>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por código, nombre, descripción o ubicación..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white border-slate-300"
                />
              </div>
              <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
                <SelectTrigger className="w-48 bg-white border-slate-300">
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas las categorías</SelectItem>
                  {CATEGORIAS.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-100 sticky top-0">
                  <th className="text-left p-3 text-[10px] font-bold text-slate-600 uppercase">Código</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-600 uppercase">Nombre</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-600 uppercase">Descripción</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-600 uppercase">Unidad</th>
                  <th className="text-right p-3 text-[10px] font-bold text-slate-600 uppercase">P.Unit.</th>
                  <th className="text-center p-3 text-[10px] font-bold text-slate-600 uppercase">Stock</th>
                  <th className="text-center p-3 text-[10px] font-bold text-slate-600 uppercase">Stock Mín.</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-600 uppercase">Categoría</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-600 uppercase">Ubicación</th>
                  <th className="text-center p-3 text-[10px] font-bold text-slate-600 uppercase"></th>
                </tr>
              </thead>
              <tbody>
                {filteredMateriales.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-6 text-center text-slate-400 text-xs">
                      {searchTerm || categoriaFilter ? 'No se encontraron materiales con los filtros aplicados' : 'Sin materiales registrados'}
                    </td>
                  </tr>
                ) : (
                  filteredMateriales.map((m) => {
                    const stockStatus = getStockStatus(m.stockActual, m.stockMinimo)
                    return (
                      <tr key={m.id} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="p-3 font-mono text-xs text-slate-600">{m.codigo || '-'}</td>
                        <td className="p-3 font-semibold">{m.nombre}</td>
                        <td className="p-3 text-xs text-slate-500 max-w-[150px] truncate">{m.descripcion || '-'}</td>
                        <td className="p-3 text-xs">{m.unidad}</td>
                        <td className="p-3 font-mono text-xs text-right">{formatCLP(m.precioUnit)}</td>
                        <td className="p-3 text-center">
                          <Badge variant="outline" className={`text-[10px] ${stockStatus.color}`}>
                            {m.stockActual}
                          </Badge>
                        </td>
                        <td className="p-3 text-center text-xs text-slate-500">{m.stockMinimo}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px]">{m.categoria}</Badge>
                        </td>
                        <td className="p-3 text-xs text-slate-500">{m.ubicacion || '-'}</td>
                        <td className="p-3">
                          <div className="flex justify-center gap-1">
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openDialog(m)}>
                              <Pencil className="w-3 h-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-red-600" onClick={() => deleteItem(m.id)}>
                              <Trash2 className="w-3 h-3" />
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

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar' : 'Nuevo'} Material</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código</Label>
                <Input 
                  value={form.codigo} 
                  onChange={(e) => setForm({...form, codigo: e.target.value})} 
                  placeholder="MAT-001"
                />
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={form.categoria} onValueChange={(v) => setForm({...form, categoria: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input 
                value={form.nombre} 
                onChange={(e) => setForm({...form, nombre: e.target.value})} 
                placeholder="Nombre del material"
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input 
                value={form.descripcion} 
                onChange={(e) => setForm({...form, descripcion: e.target.value})} 
                placeholder="Descripción detallada del material"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unidad</Label>
                <Select value={form.unidad} onValueChange={(v) => setForm({...form, unidad: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UNIDADES.map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Precio Unitario ($)</Label>
                <Input 
                  type="number" 
                  value={form.precioUnit} 
                  onChange={(e) => setForm({...form, precioUnit: parseFloat(e.target.value) || 0})} 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stock Actual</Label>
                <Input 
                  type="number" 
                  value={form.stockActual} 
                  onChange={(e) => setForm({...form, stockActual: parseInt(e.target.value) || 0})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Stock Mínimo</Label>
                <Input 
                  type="number" 
                  value={form.stockMinimo} 
                  onChange={(e) => setForm({...form, stockMinimo: parseInt(e.target.value) || 0})} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ubicación</Label>
              <Select value={form.ubicacion} onValueChange={(v) => setForm({...form, ubicacion: v})}>
                <SelectTrigger><SelectValue placeholder="Seleccionar ubicación" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin ubicación</SelectItem>
                  {UBICACIONES.map(ub => (
                    <SelectItem key={ub} value={ub}>{ub}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveItem} disabled={!form.nombre.trim()}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
