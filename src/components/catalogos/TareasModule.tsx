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
import { Plus, Pencil, Trash2, Upload, Download, AlertCircle, CheckCircle, Search, Printer } from 'lucide-react'

interface CatTarea {
  id: string
  codigo: string | null
  nombre: string
  categoria: string
  frecuencia: string | null
  responsable: string | null
  prioridad: string
}

interface BulkResult {
  show: boolean
  total: number
  created: number
  updated: number
  skipped: number
  errors: string[]
}

const categoriaOptions = [
  'Electricidad',
  'Hidráulico',
  'Ascensores',
  'Gas',
  'Climatización',
  'Seguridad',
  'Infraestructura',
  'Áreas Verdes',
  'Limpieza',
  'Pintura',
  'General'
]

const frecuenciaOptions = [
  'Diaria',
  'Semanal',
  'Quincenal',
  'Mensual',
  'Bimestral',
  'Trimestral',
  'Semestral',
  'Anual'
]

const prioridadOptions = ['Urgente', 'Alta', 'Media', 'Baja']

const prioridadColors: Record<string, string> = {
  'Urgente': 'bg-red-100 text-red-700 border-red-200',
  'Alta': 'bg-orange-100 text-orange-700 border-orange-200',
  'Media': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Baja': 'bg-green-100 text-green-700 border-green-200',
}

const categoriaColors: Record<string, string> = {
  'Electricidad': 'bg-yellow-100 text-yellow-700',
  'Hidráulico': 'bg-blue-100 text-blue-700',
  'Ascensores': 'bg-purple-100 text-purple-700',
  'Gas': 'bg-red-100 text-red-700',
  'Climatización': 'bg-cyan-100 text-cyan-700',
  'Seguridad': 'bg-slate-100 text-slate-700',
  'Infraestructura': 'bg-amber-100 text-amber-700',
  'Áreas Verdes': 'bg-green-100 text-green-700',
  'Limpieza': 'bg-teal-100 text-teal-700',
  'Pintura': 'bg-pink-100 text-pink-700',
  'General': 'bg-gray-100 text-gray-700',
}

export function TareasModule() {
  const [tareas, setTareas] = useState<CatTarea[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoriaFilter, setCategoriaFilter] = useState('')
  const [prioridadFilter, setPrioridadFilter] = useState('')

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<CatTarea | null>(null)

  // Form
  const [form, setForm] = useState({ 
    codigo: '', 
    nombre: '', 
    categoria: 'General',
    frecuencia: '',
    responsable: '',
    prioridad: 'Media'
  })

  // Bulk upload state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (categoriaFilter) params.append('categoria', categoriaFilter)
      if (prioridadFilter) params.append('prioridad', prioridadFilter)
      
      const url = params.toString() ? `/api/catalogos/tareas?${params.toString()}` : '/api/catalogos/tareas'
      const res = await fetch(url)
      setTareas(await res.json())
    } catch (error) {
      console.error('Error fetching tareas:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    void (async () => {
      await fetchData()
    })()
  }, [categoriaFilter, prioridadFilter])

  // Filter by search
  const filteredTareas = tareas.filter(t => 
    t.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.codigo && t.codigo.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (t.responsable && t.responsable.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const openDialog = (item?: CatTarea) => {
    if (item) {
      setEditingItem(item)
      setForm({ 
        codigo: item.codigo || '', 
        nombre: item.nombre, 
        categoria: item.categoria,
        frecuencia: item.frecuencia || '',
        responsable: item.responsable || '',
        prioridad: item.prioridad
      })
    } else {
      setEditingItem(null)
      setForm({ 
        codigo: '', 
        nombre: '', 
        categoria: 'General',
        frecuencia: '',
        responsable: '',
        prioridad: 'Media'
      })
    }
    setDialogOpen(true)
  }

  const saveItem = async () => {
    if (!form.nombre.trim()) return
    try {
      if (editingItem) {
        await fetch(`/api/catalogos/tareas/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      } else {
        await fetch('/api/catalogos/tareas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      }
      setDialogOpen(false)
      fetchData()
    } catch (error) {
      console.error('Error saving tarea:', error)
    }
  }

  const deleteItem = async (id: string) => {
    if (!confirm('¿Eliminar esta tarea?')) return
    try {
      await fetch(`/api/catalogos/tareas/${id}`, { method: 'DELETE' })
      fetchData()
    } catch (error) {
      console.error('Error deleting tarea:', error)
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
          
          const response = await fetch('/api/catalogos/tareas/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tareas: jsonData }),
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
        Codigo: 'TAR-001', 
        Nombre: 'Revisión sistema eléctrico general', 
        Categoria: 'Electricidad',
        Frecuencia: 'Mensual',
        Responsable: 'Juan Pérez',
        Prioridad: 'Alta'
      },
      { 
        Codigo: 'TAR-002', 
        Nombre: 'Revisión tableros eléctricos principales', 
        Categoria: 'Electricidad',
        Frecuencia: 'Mensual',
        Responsable: 'Juan Pérez',
        Prioridad: 'Alta'
      },
    ]
    
    import('xlsx').then(XLSX => {
      const ws = XLSX.utils.json_to_sheet(templateData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Tareas')
      XLSX.writeFile(wb, 'plantilla_tareas.xlsx')
    })
  }

  // Export to printable view
  const handlePrint = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Catálogo de Tareas - Asesorías Integrales CyJ</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #0f2040; margin-bottom: 10px; }
          h2 { color: #666; font-size: 14px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background: #0f2040; color: white; }
          tr:nth-child(even) { background: #f9f9f9; }
          .footer { margin-top: 20px; font-size: 10px; color: #999; text-align: center; }
        </style>
      </head>
      <body>
        <h1>Asesorías Integrales CyJ</h1>
        <h2>Catálogo de Tareas - ${new Date().toLocaleDateString('es-CL')}</h2>
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Frecuencia</th>
              <th>Responsable</th>
              <th>Prioridad</th>
            </tr>
          </thead>
          <tbody>
            ${filteredTareas.map(t => `
              <tr>
                <td>${t.codigo || ''}</td>
                <td>${t.nombre}</td>
                <td>${t.categoria}</td>
                <td>${t.frecuencia || ''}</td>
                <td>${t.responsable || ''}</td>
                <td>${t.prioridad}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          Generado el ${new Date().toLocaleString('es-CL')} | Total: ${filteredTareas.length} tareas
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

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Cargando tareas...</div>
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
        <CardHeader className="py-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">✅ Tareas - Condominio Laguna Norte ({filteredTareas.length})</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button variant="outline" size="sm" onClick={downloadTemplate}>
                  <Download className="w-3.5 h-3.5 mr-1" /> Plantilla
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={bulkUploading}
                >
                  {bulkUploading ? (
                    <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mr-1" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 mr-1" />
                  )}
                  Cargar
                </Button>
                <Button size="sm" onClick={() => openDialog()}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Agregar
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por código, nombre o responsable..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  {categoriaOptions.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={prioridadFilter} onValueChange={setPrioridadFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Prioridad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  {prioridadOptions.map(pri => (
                    <SelectItem key={pri} value={pri}>{pri}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[calc(100vh-380px)] overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-[#0f2040] sticky top-0">
                  <th className="text-left p-3 text-[10px] font-bold text-white uppercase">Código</th>
                  <th className="text-left p-3 text-[10px] font-bold text-white uppercase">Nombre</th>
                  <th className="text-left p-3 text-[10px] font-bold text-white uppercase">Categoría</th>
                  <th className="text-left p-3 text-[10px] font-bold text-white uppercase">Frecuencia</th>
                  <th className="text-left p-3 text-[10px] font-bold text-white uppercase">Responsable</th>
                  <th className="text-left p-3 text-[10px] font-bold text-white uppercase">Prioridad</th>
                  <th className="text-center p-3 text-[10px] font-bold text-white uppercase"></th>
                </tr>
              </thead>
              <tbody>
                {filteredTareas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400 text-xs">
                      {searchTerm || categoriaFilter || prioridadFilter ? 'No se encontraron tareas' : 'Sin tareas'}
                    </td>
                  </tr>
                ) : (
                  filteredTareas.map((t) => (
                    <tr key={t.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="p-3 font-mono text-xs">{t.codigo || '–'}</td>
                      <td className="p-3 font-semibold">{t.nombre}</td>
                      <td className="p-3">
                        <Badge variant="outline" className={`text-[10px] ${categoriaColors[t.categoria] || 'bg-gray-100 text-gray-700'}`}>
                          {t.categoria}
                        </Badge>
                      </td>
                      <td className="p-3 text-xs">{t.frecuencia || '–'}</td>
                      <td className="p-3 text-xs">{t.responsable || '–'}</td>
                      <td className="p-3">
                        <Badge className={`text-[10px] ${prioridadColors[t.prioridad] || 'bg-gray-100 text-gray-700'}`}>
                          {t.prioridad}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center gap-1">
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openDialog(t)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-red-600" onClick={() => deleteItem(t.id)}>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar' : 'Nueva'} Tarea</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código</Label>
                <Input 
                  placeholder="TAR-001"
                  value={form.codigo} 
                  onChange={(e) => setForm({...form, codigo: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select value={form.prioridad} onValueChange={(v) => setForm({...form, prioridad: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {prioridadOptions.map(pri => (
                      <SelectItem key={pri} value={pri}>{pri}</SelectItem>
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
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={form.categoria} onValueChange={(v) => setForm({...form, categoria: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categoriaOptions.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Frecuencia</Label>
                <Select value={form.frecuencia} onValueChange={(v) => setForm({...form, frecuencia: v})}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {frecuenciaOptions.map(freq => (
                      <SelectItem key={freq} value={freq}>{freq}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Responsable</Label>
              <Input 
                placeholder="Nombre del responsable"
                value={form.responsable} 
                onChange={(e) => setForm({...form, responsable: e.target.value})} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveItem}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
