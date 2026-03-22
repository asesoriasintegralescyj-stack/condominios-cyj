'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Plus, Pencil, Trash2, Upload, Download, AlertCircle, CheckCircle, Search, Printer, FileSpreadsheet } from 'lucide-react'

interface CatHerramienta {
  id: string
  codigo: string | null
  nombre: string
  marca: string | null
  cantidad: number
  ubicacion: string | null
  estado: string
  precioUnitario: number
  fechaAdquisicion: string | null
  descripcion: string | null
}

interface BulkResult {
  show: boolean
  total: number
  created: number
  updated: number
  skipped: number
  errors: string[]
}

const ESTADOS = ['Bueno', 'Regular', 'Malo', 'En reparación']

const MARCAS = [
  'Bosch', 'Makita', 'DeWalt', 'Stanley', 'Black+Decker', 
  'Hitachi', 'Milwaukee', 'Craftsman', 'Ryobi', 'Hilti', 'Otro'
]

const UBICACIONES = [
  'Bodega A', 'Bodega B', 'Taller', 'Oficina', 'Área Común', 'Otro'
]

const formatCLP = (n: number) => 
  '$' + new Intl.NumberFormat('es-CL').format(Math.round(n || 0))

// Generate next codigo
const generateCodigo = (items: CatHerramienta[]): string => {
  const existingCodes = items
    .filter(h => h.codigo && h.codigo.startsWith('HER-'))
    .map(h => parseInt(h.codigo!.replace('HER-', ''), 10))
    .filter(n => !isNaN(n))
  
  const maxNum = existingCodes.length > 0 ? Math.max(...existingCodes) : 0
  return `HER-${String(maxNum + 1).padStart(3, '0')}`
}

export function HerramientasModule() {
  const [herramientas, setHerramientas] = useState<CatHerramienta[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [estadoFilter, setEstadoFilter] = useState<string>('')

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CatHerramienta | null>(null)

  // Form
  const [form, setForm] = useState({ 
    codigo: '',
    nombre: '', 
    marca: '',
    cantidad: 1, 
    ubicacion: '',
    estado: 'Bueno',
    precioUnitario: 0,
    fechaAdquisicion: ''
  })

  // Bulk upload state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/catalogos/herramientas')
      setHerramientas(await res.json())
    } catch (error) {
      console.error('Error fetching herramientas:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    void (async () => {
      await fetchData()
    })()
  }, [])

  // Filter by search and estado
  const filteredHerramientas = herramientas.filter(h => {
    const matchesSearch = 
      h.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (h.codigo && h.codigo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (h.marca && h.marca.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (h.ubicacion && h.ubicacion.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesEstado = !estadoFilter || h.estado === estadoFilter
    
    return matchesSearch && matchesEstado
  })

  // Calculate totals
  const totalValor = filteredHerramientas.reduce((sum, h) => sum + (h.cantidad * h.precioUnitario), 0)
  const totalCantidad = filteredHerramientas.reduce((sum, h) => sum + h.cantidad, 0)

  const openDialog = (item?: CatHerramienta) => {
    if (item) {
      setEditingItem(item)
      setForm({ 
        codigo: item.codigo || '',
        nombre: item.nombre, 
        marca: item.marca || '',
        cantidad: item.cantidad, 
        ubicacion: item.ubicacion || '',
        estado: item.estado,
        precioUnitario: item.precioUnitario,
        fechaAdquisicion: item.fechaAdquisicion || ''
      })
    } else {
      setEditingItem(null)
      setForm({ 
        codigo: generateCodigo(herramientas),
        nombre: '', 
        marca: '',
        cantidad: 1, 
        ubicacion: '',
        estado: 'Bueno',
        precioUnitario: 0,
        fechaAdquisicion: new Date().toISOString().split('T')[0]
      })
    }
    setDialogOpen(true)
  }

  const saveItem = async () => {
    if (!form.nombre.trim()) return
    try {
      const payload = {
        ...form,
        codigo: form.codigo || generateCodigo(herramientas),
        cantidad: parseInt(String(form.cantidad)) || 1,
        precioUnitario: parseFloat(String(form.precioUnitario)) || 0
      }
      
      if (editingItem) {
        await fetch(`/api/catalogos/herramientas/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        await fetch('/api/catalogos/herramientas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }
      setDialogOpen(false)
      fetchData()
    } catch (error) {
      console.error('Error saving herramienta:', error)
    }
  }

  const deleteItem = async (id: string) => {
    if (!confirm('¿Eliminar esta herramienta?')) return
    try {
      await fetch(`/api/catalogos/herramientas/${id}`, { method: 'DELETE' })
      fetchData()
    } catch (error) {
      console.error('Error deleting herramienta:', error)
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
          
          const response = await fetch('/api/catalogos/herramientas/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ herramientas: jsonData }),
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
        Codigo: 'HER-001', 
        Nombre: 'Taladro Percutor', 
        Marca: 'Bosch', 
        Cantidad: 2, 
        Ubicacion: 'Bodega A', 
        Estado: 'Bueno', 
        PrecioUnitario: 85000, 
        ValorTotal: 170000,
        FechaAdquisicion: '2024-01-15'
      },
      { 
        Codigo: 'HER-002', 
        Nombre: 'Sierra Circular', 
        Marca: 'Makita', 
        Cantidad: 1, 
        Ubicacion: 'Bodega A', 
        Estado: 'Bueno', 
        PrecioUnitario: 120000, 
        ValorTotal: 120000,
        FechaAdquisicion: '2024-02-20'
      },
      { 
        Codigo: 'HER-003', 
        Nombre: 'Escalera de Aluminio 3m', 
        Marca: 'Stanley', 
        Cantidad: 3, 
        Ubicacion: 'Bodega B', 
        Estado: 'Regular', 
        PrecioUnitario: 45000, 
        ValorTotal: 135000,
        FechaAdquisicion: '2023-08-10'
      },
    ]
    
    import('xlsx').then(XLSX => {
      const ws = XLSX.utils.json_to_sheet(templateData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Herramientas')
      XLSX.writeFile(wb, 'plantilla_herramientas.xlsx')
    })
  }

  // Export to Excel
  const exportToExcel = () => {
    const exportData = filteredHerramientas.map(h => ({
      Codigo: h.codigo || '',
      Nombre: h.nombre,
      Marca: h.marca || '',
      Cantidad: h.cantidad,
      Ubicacion: h.ubicacion || '',
      Estado: h.estado,
      PrecioUnitario: h.precioUnitario,
      ValorTotal: h.cantidad * h.precioUnitario,
      FechaAdquisicion: h.fechaAdquisicion || ''
    }))
    
    import('xlsx').then(XLSX => {
      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Herramientas')
      XLSX.writeFile(wb, `herramientas_${new Date().toISOString().split('T')[0]}.xlsx`)
    })
  }

  // Export to printable view
  const handlePrint = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Catálogo de Herramientas - Asesorías Integrales CyJ</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #0f2040; margin-bottom: 5px; }
          h2 { color: #666; font-size: 14px; margin-bottom: 5px; }
          .summary { background: #f5f5f5; padding: 10px; margin-bottom: 20px; border-radius: 4px; }
          .summary span { margin-right: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 6px; text-align: left; font-size: 11px; }
          th { background: #0f2040; color: white; }
          tr:nth-child(even) { background: #f9f9f9; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .footer { margin-top: 20px; font-size: 10px; color: #999; text-align: center; }
        </style>
      </head>
      <body>
        <h1>Asesorías Integrales CyJ</h1>
        <h2>Catálogo de Herramientas - ${new Date().toLocaleDateString('es-CL')}</h2>
        <div class="summary">
          <span><strong>Total Herramientas:</strong> ${filteredHerramientas.length}</span>
          <span><strong>Cantidad Total:</strong> ${totalCantidad}</span>
          <span><strong>Valor Total:</strong> ${formatCLP(totalValor)}</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Marca</th>
              <th class="text-center">Cant.</th>
              <th>Ubicación</th>
              <th>Estado</th>
              <th class="text-right">Precio Unit.</th>
              <th class="text-right">Valor Total</th>
              <th>Fecha Adq.</th>
            </tr>
          </thead>
          <tbody>
            ${filteredHerramientas.map(h => `
              <tr>
                <td>${h.codigo || '–'}</td>
                <td>${h.nombre}</td>
                <td>${h.marca || '–'}</td>
                <td class="text-center">${h.cantidad}</td>
                <td>${h.ubicacion || '–'}</td>
                <td>${h.estado}</td>
                <td class="text-right">${formatCLP(h.precioUnitario)}</td>
                <td class="text-right">${formatCLP(h.cantidad * h.precioUnitario)}</td>
                <td>${h.fechaAdquisicion || '–'}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="background: #0f2040; color: white;">
              <td colspan="3"><strong>TOTALES</strong></td>
              <td class="text-center"><strong>${totalCantidad}</strong></td>
              <td colspan="3"></td>
              <td class="text-right"><strong>${formatCLP(totalValor)}</strong></td>
              <td></td>
            </tr>
          </tfoot>
        </table>
        <div class="footer">
          Generado el ${new Date().toLocaleString('es-CL')}
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

  // Get badge color for estado
  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'Bueno':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Bueno</Badge>
      case 'Regular':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Regular</Badge>
      case 'Malo':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Malo</Badge>
      case 'En reparación':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">En reparación</Badge>
      default:
        return <Badge variant="outline">{estado}</Badge>
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Cargando herramientas...</div>
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
        <CardHeader className="py-4" style={{ backgroundColor: '#0f2040' }}>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-white">
                🔧 Catálogo de Herramientas ({filteredHerramientas.length} de {herramientas.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint} className="bg-white border-slate-300">
                  <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir
                </Button>
                <Button variant="outline" size="sm" onClick={exportToExcel} className="bg-white border-slate-300">
                  <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Excel
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button variant="outline" size="sm" onClick={downloadTemplate} className="bg-white border-slate-300">
                  <Download className="w-3.5 h-3.5 mr-1" /> Plantilla
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={bulkUploading}
                  className="bg-white border-slate-300"
                >
                  {bulkUploading ? (
                    <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mr-1" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 mr-1" />
                  )}
                  Cargar
                </Button>
                <Button size="sm" onClick={() => openDialog()} className="bg-[#0f2040] border border-white hover:bg-slate-700">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Agregar
                </Button>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por código, nombre, marca o ubicación..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white"
                />
              </div>
              <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                <SelectTrigger className="w-40 bg-white">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {ESTADOS.map(e => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        {/* Summary bar */}
        <div className="bg-slate-100 px-4 py-2 border-b flex items-center gap-6 text-xs">
          <span className="text-slate-600">Total Herramientas: <strong>{filteredHerramientas.length}</strong></span>
          <span className="text-slate-600">Cantidad Total: <strong>{totalCantidad}</strong></span>
          <span className="text-slate-600">Valor Total: <strong className="text-green-600">{formatCLP(totalValor)}</strong></span>
        </div>
        
        <CardContent className="p-0">
          <div className="max-h-[calc(100vh-380px)] overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50 sticky top-0">
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Código</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Nombre</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Marca</th>
                  <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Cantidad</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Ubicación</th>
                  <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Estado</th>
                  <th className="text-right p-3 text-[10px] font-bold text-slate-500 uppercase">Precio Unit.</th>
                  <th className="text-right p-3 text-[10px] font-bold text-slate-500 uppercase">Valor Total</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Fecha Adq.</th>
                  <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase"></th>
                </tr>
              </thead>
              <tbody>
                {filteredHerramientas.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-6 text-center text-slate-400 text-xs">
                      {searchTerm || estadoFilter ? 'No se encontraron herramientas con los filtros aplicados' : 'Sin herramientas registradas'}
                    </td>
                  </tr>
                ) : (
                  filteredHerramientas.map((h) => (
                    <tr key={h.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="p-3 font-mono text-xs">{h.codigo || '–'}</td>
                      <td className="p-3 font-semibold">{h.nombre}</td>
                      <td className="p-3 text-xs">{h.marca || '–'}</td>
                      <td className="p-3 text-center font-mono">{h.cantidad}</td>
                      <td className="p-3 text-xs">{h.ubicacion || '–'}</td>
                      <td className="p-3 text-center">{getEstadoBadge(h.estado)}</td>
                      <td className="p-3 text-right font-mono text-xs">{formatCLP(h.precioUnitario)}</td>
                      <td className="p-3 text-right font-mono text-xs font-semibold text-green-600">{formatCLP(h.cantidad * h.precioUnitario)}</td>
                      <td className="p-3 text-xs">{h.fechaAdquisicion || '–'}</td>
                      <td className="p-3">
                        <div className="flex justify-center gap-1">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openDialog(h)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-red-600" onClick={() => deleteItem(h.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar' : 'Nueva'} Herramienta</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código *</Label>
                <Input 
                  value={form.codigo} 
                  onChange={(e) => setForm({...form, codigo: e.target.value})} 
                  placeholder="HER-001"
                />
              </div>
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input 
                  value={form.nombre} 
                  onChange={(e) => setForm({...form, nombre: e.target.value})} 
                  placeholder="Nombre de la herramienta"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Marca</Label>
                <Select value={form.marca} onValueChange={(v) => setForm({...form, marca: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar marca" />
                  </SelectTrigger>
                  <SelectContent>
                    {MARCAS.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ubicación</Label>
                <Select value={form.ubicacion} onValueChange={(v) => setForm({...form, ubicacion: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar ubicación" />
                  </SelectTrigger>
                  <SelectContent>
                    {UBICACIONES.map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Cantidad</Label>
                <Input 
                  type="number" 
                  value={form.cantidad} 
                  onChange={(e) => setForm({...form, cantidad: parseInt(e.target.value) || 1})} 
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={form.estado} onValueChange={(v) => setForm({...form, estado: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS.map(e => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Precio Unitario</Label>
                <Input 
                  type="number" 
                  value={form.precioUnitario} 
                  onChange={(e) => setForm({...form, precioUnitario: parseFloat(e.target.value) || 0})} 
                  min="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Fecha de Adquisición</Label>
              <Input 
                type="date" 
                value={form.fechaAdquisicion} 
                onChange={(e) => setForm({...form, fechaAdquisicion: e.target.value})} 
              />
            </div>
            
            {/* Calculated ValorTotal */}
            <div className="bg-slate-100 rounded-lg p-3 flex justify-between items-center">
              <span className="text-sm text-slate-600">Valor Total (Cantidad × Precio Unitario):</span>
              <span className="font-bold text-green-600">{formatCLP(form.cantidad * form.precioUnitario)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveItem} className="bg-[#0f2040] hover:bg-slate-700">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
