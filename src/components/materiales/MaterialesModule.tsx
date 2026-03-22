'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Plus, Edit, Trash2, Package, Search, Upload, Download, AlertCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'

interface Material {
  id: string
  codigo: string
  nombre: string
  categoria: string
  unidad: string
  precioUnit: number
  stockActual: number
  stockMin: number
}

interface BulkMaterial {
  codigo: string
  nombre: string
  categoria: string
  unidad: string
  precioUnit: number
  stockActual: number
  stockMin: number
  _errors?: string[]
}

export function MaterialesModule() {
  const [materiales, setMateriales] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<Material | null>(null)
  const [search, setSearch] = useState('')
  
  // Bulk upload states
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [bulkData, setBulkData] = useState<BulkMaterial[]>([])
  const [bulkErrors, setBulkErrors] = useState<string[]>([])
  const [bulkUploading, setBulkUploading] = useState(false)
  const [bulkSuccess, setBulkSuccess] = useState(false)

  const [form, setForm] = useState({
    codigo: '',
    nombre: '',
    categoria: '',
    unidad: '',
    precioUnit: '',
    stockActual: '',
    stockMin: ''
  })

  const fetchMateriales = async () => {
    try {
      const res = await fetch('/api/catalogos/materiales')
      const data = await res.json()
      setMateriales(Array.isArray(data) ? data : data.data || [])
    } catch (error) {
      console.error('Error:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchMateriales()
   
  }, [])

  const openNew = () => {
    setEditando(null)
    setForm({
      codigo: '',
      nombre: '',
      categoria: '',
      unidad: '',
      precioUnit: '',
      stockActual: '',
      stockMin: ''
    })
    setDialogOpen(true)
  }

  const openEdit = (material: Material) => {
    setEditando(material)
    setForm({
      codigo: material.codigo,
      nombre: material.nombre,
      categoria: material.categoria,
      unidad: material.unidad,
      precioUnit: material.precioUnit.toString(),
      stockActual: material.stockActual.toString(),
      stockMin: material.stockMin?.toString() || ''
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    const payload = {
      ...form,
      precioUnit: parseFloat(form.precioUnit) || 0,
      stockActual: parseInt(form.stockActual) || 0,
      stockMin: parseInt(form.stockMin) || 0
    }

    try {
      if (editando) {
        await fetch(`/api/catalogos/materiales/${editando.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      } else {
        await fetch('/api/catalogos/materiales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }
      setDialogOpen(false)
      fetchMateriales()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este material?')) return
    try {
      await fetch(`/api/catalogos/materiales/${id}`, { method: 'DELETE' })
      fetchMateriales()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const formatCLP = (n: number) => 
    '$' + new Intl.NumberFormat('es-CL').format(n || 0)

  const filteredMateriales = materiales.filter(m => 
    m.nombre.toLowerCase().includes(search.toLowerCase()) ||
    m.codigo.toLowerCase().includes(search.toLowerCase()) ||
    m.categoria?.toLowerCase().includes(search.toLowerCase())
  )

  // Bulk upload functions
  const downloadTemplate = () => {
    const template = [
      {
        Codigo: 'MAT-001',
        Nombre: 'Cemento 25kg',
        Categoria: 'Construcción',
        Unidad: 'bolsa',
        Precio: '3500',
        StockActual: '100',
        StockMinimo: '20'
      }
    ]
    
    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla')
    XLSX.writeFile(wb, 'plantilla_materiales.xlsx')
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setBulkErrors([])
    setBulkData([])
    setBulkSuccess(false)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[]

      const validated: BulkMaterial[] = []
      const errors: string[] = []

      rows.forEach((row, index) => {
        const material: BulkMaterial = {
          codigo: row.Codigo || row.codigo || row.CÓDIGO || '',
          nombre: row.Nombre || row.nombre || row.NOMBRE || '',
          categoria: row.Categoria || row.categoria || row.CATEGORÍA || '',
          unidad: row.Unidad || row.unidad || row.UNIDAD || 'unidad',
          precioUnit: parseFloat(row.Precio || row.precio || row.PRECIO || 0),
          stockActual: parseInt(row.StockActual || row.stockActual || row.STOCK || 0),
          stockMin: parseInt(row.StockMinimo || row.stockMinimo || row.STOCKMIN || 0),
          _errors: []
        }

        // Validation
        if (!material.codigo) material._errors!.push('Código requerido')
        if (!material.nombre) material._errors!.push('Nombre requerido')
        if (isNaN(material.precioUnit)) material._errors!.push('Precio inválido')
        if (isNaN(material.stockActual)) material._errors!.push('Stock actual inválido')

        if (material._errors!.length > 0) {
          errors.push(`Fila ${index + 2}: ${material._errors!.join(', ')}`)
        } else {
          validated.push(material)
        }
      })

      setBulkErrors(errors)
      setBulkData(validated)
    } catch (error) {
      console.error('Error processing file:', error)
      setBulkErrors(['Error al procesar el archivo. Verifique el formato.'])
    }
  }

  const handleBulkUpload = async () => {
    if (bulkData.length === 0) return

    setBulkUploading(true)
    try {
      const response = await fetch('/api/catalogos/materiales/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bulkData)
      })

      const result = await response.json()

      if (response.ok) {
        setBulkSuccess(true)
        setBulkData([])
        fetchMateriales()
        toast.success(`${result.created || bulkData.length} materiales importados correctamente`)
        setTimeout(() => {
          setBulkDialogOpen(false)
          setBulkSuccess(false)
        }, 2000)
      } else {
        setBulkErrors([result.error || 'Error al importar materiales'])
      }
    } catch (error) {
      console.error('Error uploading:', error)
      setBulkErrors(['Error de conexión al importar materiales'])
    } finally {
      setBulkUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar materiales..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" /> Carga Masiva
          </Button>
          <Button onClick={openNew}>
            <Plus className="w-4 h-4 mr-2" /> Nuevo Material
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-3 text-xs font-bold text-slate-500 uppercase">Código</th>
                  <th className="text-left p-3 text-xs font-bold text-slate-500 uppercase">Nombre</th>
                  <th className="text-left p-3 text-xs font-bold text-slate-500 uppercase">Categoría</th>
                  <th className="text-left p-3 text-xs font-bold text-slate-500 uppercase">Unidad</th>
                  <th className="text-right p-3 text-xs font-bold text-slate-500 uppercase">Precio</th>
                  <th className="text-right p-3 text-xs font-bold text-slate-500 uppercase">Stock</th>
                  <th className="text-center p-3 text-xs font-bold text-slate-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredMateriales.map((mat) => (
                  <tr key={mat.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="p-3 font-mono text-xs font-bold text-[#0f2040]">{mat.codigo}</td>
                    <td className="p-3 font-medium">{mat.nombre}</td>
                    <td className="p-3 text-slate-600">{mat.categoria || '–'}</td>
                    <td className="p-3 text-slate-600">{mat.unidad}</td>
                    <td className="p-3 text-right font-medium">{formatCLP(mat.precioUnit)}</td>
                    <td className="p-3 text-right">
                      <Badge className={
                        mat.stockActual <= (mat.stockMin || 5) 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-green-100 text-green-700'
                      }>
                        {mat.stockActual}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(mat)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(mat.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {filteredMateriales.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-slate-500">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
            No se encontraron materiales
          </CardContent>
        </Card>
      )}

      {/* Dialog - New/Edit Material */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar' : 'Nuevo'} Material</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código</Label>
                <Input value={form.codigo} onChange={(e) => setForm({...form, codigo: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Unidad</Label>
                <Input value={form.unidad} onChange={(e) => setForm({...form, unidad: e.target.value})} placeholder="kg, m, un, etc" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={form.nombre} onChange={(e) => setForm({...form, nombre: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Input value={form.categoria} onChange={(e) => setForm({...form, categoria: e.target.value})} placeholder="Construcción, Electricidad, etc" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Precio Unitario</Label>
                <Input type="number" value={form.precioUnit} onChange={(e) => setForm({...form, precioUnit: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Stock Actual</Label>
                <Input type="number" value={form.stockActual} onChange={(e) => setForm({...form, stockActual: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Stock Mínimo</Label>
                <Input type="number" value={form.stockMin} onChange={(e) => setForm({...form, stockMin: e.target.value})} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog - Bulk Upload */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Carga Masiva de Materiales</DialogTitle>
            <DialogDescription>
              Importe múltiples materiales desde un archivo Excel
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Step 1: Download template */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Paso 1: Descargar plantilla</Label>
              <p className="text-xs text-slate-500">
                Descargue la plantilla Excel con el formato correcto para la importación
              </p>
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" /> Descargar Plantilla
              </Button>
            </div>

            {/* Step 2: Upload file */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Paso 2: Subir archivo</Label>
              <p className="text-xs text-slate-500">
                Seleccione el archivo Excel con los materiales a importar
              </p>
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
              />
            </div>

            {/* Errors */}
            {bulkErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                  <AlertCircle className="w-4 h-4" />
                  Errores encontrados
                </div>
                <ul className="text-sm text-red-600 space-y-1 max-h-32 overflow-y-auto">
                  {bulkErrors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Preview */}
            {bulkData.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  Vista previa ({bulkData.length} materiales)
                </Label>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="p-2 text-left">Código</th>
                        <th className="p-2 text-left">Nombre</th>
                        <th className="p-2 text-left">Categoría</th>
                        <th className="p-2 text-right">Precio</th>
                        <th className="p-2 text-right">Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkData.slice(0, 10).map((m, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2">{m.codigo}</td>
                          <td className="p-2">{m.nombre}</td>
                          <td className="p-2">{m.categoria || '-'}</td>
                          <td className="p-2 text-right">{formatCLP(m.precioUnit)}</td>
                          <td className="p-2 text-right">{m.stockActual}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {bulkData.length > 10 && (
                    <div className="p-2 text-center text-xs text-slate-500 bg-slate-50">
                      ... y {bulkData.length - 10} materiales más
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Success message */}
            {bulkSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2 text-green-700">
                <CheckCircle2 className="w-5 h-5" />
                Materiales importados correctamente
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setBulkDialogOpen(false)
              setBulkData([])
              setBulkErrors([])
              setBulkSuccess(false)
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleBulkUpload} 
              disabled={bulkData.length === 0 || bulkUploading || bulkSuccess}
            >
              {bulkUploading ? (
                <>
                  <div className="w-4 h-4 mr-2 animate-spin border-2 border-white border-t-transparent rounded-full" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Importar {bulkData.length} materiales
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
