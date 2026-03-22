'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Plus, Pencil, Trash2, Upload, Download, FileSpreadsheet } from 'lucide-react'
import { useSession } from '@/hooks/use-session'

interface CatMaterial {
  id: string
  nombre: string
  unidad: string
  precioUnit: number
  categoria: string
}

interface CatTarea {
  id: string
  nombre: string
  categoria: string
}

const formatCLP = (n: number) => 
  '$' + new Intl.NumberFormat('es-CL').format(Math.round(n || 0))

export function CatalogosModule() {
  const [materiales, setMateriales] = useState<CatMaterial[]>([])
  const [tareas, setTareas] = useState<CatTarea[]>([])
  const [loading, setLoading] = useState(true)

  // Dialogs
  const [matDialogOpen, setMatDialogOpen] = useState(false)
  const [tarDialogOpen, setTarDialogOpen] = useState(false)
  const [editingMat, setEditingMat] = useState<CatMaterial | null>(null)
  const [editingTar, setEditingTar] = useState<CatTarea | null>(null)

  // Bulk upload
  const [bulkMatDialogOpen, setBulkMatDialogOpen] = useState(false)
  const [bulkTarDialogOpen, setBulkTarDialogOpen] = useState(false)
  const [bulkMatData, setBulkMatData] = useState('')
  const [bulkTarData, setBulkTarData] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{success: number, errors: string[]} | null>(null)
  
  const { hasPermission } = useSession()
  const canEdit = hasPermission('catalogos.editar')

  // Forms
  const [matForm, setMatForm] = useState({ nombre: '', unidad: 'unidad', precioUnit: 0, categoria: 'General' })
  const [tarForm, setTarForm] = useState({ nombre: '', categoria: 'General' })

  const fetchData = async () => {
    setLoading(true)
    try {
      const [matRes, tarRes] = await Promise.all([
        fetch('/api/catalogos/materiales'),
        fetch('/api/catalogos/tareas'),
      ])
      setMateriales(await matRes.json())
      setTareas(await tarRes.json())
    } catch (error) {
      console.error('Error fetching catalogos:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    void (async () => {
      await fetchData()
    })()
  }, [])

  // Materials
  const openMatDialog = (mat?: CatMaterial) => {
    if (mat) {
      setEditingMat(mat)
      setMatForm({ nombre: mat.nombre, unidad: mat.unidad, precioUnit: mat.precioUnit, categoria: mat.categoria })
    } else {
      setEditingMat(null)
      setMatForm({ nombre: '', unidad: 'unidad', precioUnit: 0, categoria: 'General' })
    }
    setMatDialogOpen(true)
  }

  const saveMat = async () => {
    if (!matForm.nombre.trim()) return
    try {
      if (editingMat) {
        await fetch(`/api/catalogos/materiales/${editingMat.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(matForm),
        })
      } else {
        await fetch('/api/catalogos/materiales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(matForm),
        })
      }
      setMatDialogOpen(false)
      fetchData()
    } catch (error) {
      console.error('Error saving material:', error)
    }
  }

  const deleteMat = async (id: string) => {
    if (!confirm('¿Eliminar este material?')) return
    try {
      await fetch(`/api/catalogos/materiales/${id}`, { method: 'DELETE' })
      fetchData()
    } catch (error) {
      console.error('Error deleting material:', error)
    }
  }

  // Tasks
  const openTarDialog = (tar?: CatTarea) => {
    if (tar) {
      setEditingTar(tar)
      setTarForm({ nombre: tar.nombre, categoria: tar.categoria })
    } else {
      setEditingTar(null)
      setTarForm({ nombre: '', categoria: 'General' })
    }
    setTarDialogOpen(true)
  }

  const saveTar = async () => {
    if (!tarForm.nombre.trim()) return
    try {
      if (editingTar) {
        await fetch(`/api/catalogos/tareas/${editingTar.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tarForm),
        })
      } else {
        await fetch('/api/catalogos/tareas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tarForm),
        })
      }
      setTarDialogOpen(false)
      fetchData()
    } catch (error) {
      console.error('Error saving tarea:', error)
    }
  }

  const deleteTar = async (id: string) => {
    if (!confirm('¿Eliminar esta tarea?')) return
    try {
      await fetch(`/api/catalogos/tareas/${id}`, { method: 'DELETE' })
      fetchData()
    } catch (error) {
      console.error('Error deleting tarea:', error)
    }
  }

  // Bulk upload materials
  const handleBulkMatUpload = async () => {
    if (!bulkMatData.trim()) return
    setUploading(true)
    setUploadResult(null)
    
    try {
      const res = await fetch('/api/catalogos/materiales/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: bulkMatData }),
      })
      const result = await res.json()
      setUploadResult(result)
      if (result.success > 0) {
        fetchData()
      }
    } catch (error) {
      console.error('Error uploading materials:', error)
      setUploadResult({ success: 0, errors: ['Error de conexión'] })
    }
    setUploading(false)
  }

  // Bulk upload tasks
  const handleBulkTarUpload = async () => {
    if (!bulkTarData.trim()) return
    setUploading(true)
    setUploadResult(null)
    
    try {
      const res = await fetch('/api/catalogos/tareas/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: bulkTarData }),
      })
      const result = await res.json()
      setUploadResult(result)
      if (result.success > 0) {
        fetchData()
      }
    } catch (error) {
      console.error('Error uploading tasks:', error)
      setUploadResult({ success: 0, errors: ['Error de conexión'] })
    }
    setUploading(false)
  }

  // Export functions
  const exportMateriales = () => {
    const header = 'nombre,categoria,unidad,precioUnit\n'
    const rows = materiales.map(m => 
      `"${m.nombre}","${m.categoria}","${m.unidad}",${m.precioUnit}`
    ).join('\n')
    downloadFile(header + rows, 'materiales.csv', 'text/csv')
  }

  const exportTareas = () => {
    const header = 'nombre,categoria\n'
    const rows = tareas.map(t => 
      `"${t.nombre}","${t.categoria}"`
    ).join('\n')
    downloadFile(header + rows, 'tareas.csv', 'text/csv')
  }

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Cargando catálogos...</div>
  }

  return (
    <div className="space-y-5">
      {/* Materials Card */}
      <Card>
        <CardHeader className="py-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">🧱 Catálogo de Materiales ({materiales.length})</CardTitle>
          <div className="flex gap-2">
            {canEdit && (
              <>
                <Button size="sm" variant="outline" onClick={exportMateriales}>
                  <Download className="w-3.5 h-3.5 mr-1" /> Exportar
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setBulkMatData(''); setUploadResult(null); setBulkMatDialogOpen(true) }}>
                  <Upload className="w-3.5 h-3.5 mr-1" /> Carga Masiva
                </Button>
                <Button size="sm" onClick={() => openMatDialog()}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Agregar
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Nombre</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Categoría</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Unidad</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">P.Unit.</th>
                  {canEdit && <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase"></th>}
                </tr>
              </thead>
              <tbody>
                {materiales.length === 0 ? (
                  <tr><td colSpan={5} className="p-6 text-center text-slate-400 text-xs">Sin materiales</td></tr>
                ) : (
                  materiales.map((m) => (
                    <tr key={m.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="p-3 font-semibold">{m.nombre}</td>
                      <td className="p-3"><Badge variant="outline" className="text-[10px]">{m.categoria}</Badge></td>
                      <td className="p-3 text-xs">{m.unidad}</td>
                      <td className="p-3 font-mono text-xs">{formatCLP(m.precioUnit)}</td>
                      {canEdit && (
                        <td className="p-3">
                          <div className="flex justify-center gap-1">
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openMatDialog(m)}><Pencil className="w-3 h-3" /></Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-red-600" onClick={() => deleteMat(m.id)}><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Card */}
      <Card>
        <CardHeader className="py-3 flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">✅ Catálogo de Tareas ({tareas.length})</CardTitle>
          <div className="flex gap-2">
            {canEdit && (
              <>
                <Button size="sm" variant="outline" onClick={exportTareas}>
                  <Download className="w-3.5 h-3.5 mr-1" /> Exportar
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setBulkTarData(''); setUploadResult(null); setBulkTarDialogOpen(true) }}>
                  <Upload className="w-3.5 h-3.5 mr-1" /> Carga Masiva
                </Button>
                <Button size="sm" onClick={() => openTarDialog()}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Agregar
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Nombre</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Categoría</th>
                  {canEdit && <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase"></th>}
                </tr>
              </thead>
              <tbody>
                {tareas.length === 0 ? (
                  <tr><td colSpan={3} className="p-6 text-center text-slate-400 text-xs">Sin tareas</td></tr>
                ) : (
                  tareas.map((t) => (
                    <tr key={t.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="p-3 font-semibold">{t.nombre}</td>
                      <td className="p-3"><Badge variant="outline" className="text-[10px]">{t.categoria}</Badge></td>
                      {canEdit && (
                        <td className="p-3">
                          <div className="flex justify-center gap-1">
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => openTarDialog(t)}><Pencil className="w-3 h-3" /></Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6 text-red-600" onClick={() => deleteTar(t.id)}><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Material Dialog */}
      <Dialog open={matDialogOpen} onOpenChange={setMatDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingMat ? 'Editar' : 'Nuevo'} Material</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2"><Label>Nombre</Label><Input value={matForm.nombre} onChange={(e) => setMatForm({...matForm, nombre: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Categoría</Label><Input value={matForm.categoria} onChange={(e) => setMatForm({...matForm, categoria: e.target.value})} /></div>
              <div className="space-y-2"><Label>Unidad</Label>
                <Select value={matForm.unidad} onValueChange={(v) => setMatForm({...matForm, unidad: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['unidad', 'metro', 'm²', 'm³', 'kilo', 'saco', 'litro', 'galón', 'caja', 'rollo'].map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Precio Unitario ($)</Label><Input type="number" value={matForm.precioUnit} onChange={(e) => setMatForm({...matForm, precioUnit: parseFloat(e.target.value) || 0})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMatDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveMat}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tarea Dialog */}
      <Dialog open={tarDialogOpen} onOpenChange={setTarDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editingTar ? 'Editar' : 'Nueva'} Tarea</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2"><Label>Nombre</Label><Input value={tarForm.nombre} onChange={(e) => setTarForm({...tarForm, nombre: e.target.value})} /></div>
            <div className="space-y-2"><Label>Categoría</Label><Input value={tarForm.categoria} onChange={(e) => setTarForm({...tarForm, categoria: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveTar}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Material Upload Dialog */}
      <Dialog open={bulkMatDialogOpen} onOpenChange={setBulkMatDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Carga Masiva de Materiales
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-slate-50 p-3 rounded-lg text-sm">
              <p className="font-semibold mb-2">Formato CSV (una línea por material):</p>
              <code className="text-xs bg-white p-2 rounded block">
                nombre,categoria,unidad,precioUnit
              </code>
              <p className="text-xs text-slate-500 mt-2">
                Ejemplo: Cemento,Construcción,saco,4500
              </p>
            </div>
            <div className="space-y-2">
              <Label>Datos CSV</Label>
              <Textarea 
                value={bulkMatData} 
                onChange={(e) => setBulkMatData(e.target.value)}
                placeholder="nombre,categoria,unidad,precioUnit&#10;Cemento,Construcción,saco,4500&#10;Arena,Construcción,m3,25000"
                rows={10}
                className="font-mono text-sm"
              />
            </div>
            {uploadResult && (
              <div className={`p-3 rounded ${uploadResult.success > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                <p className="font-semibold">{uploadResult.success} materiales importados correctamente</p>
                {uploadResult.errors.length > 0 && (
                  <ul className="text-sm mt-1">
                    {uploadResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkMatDialogOpen(false)}>Cerrar</Button>
            <Button onClick={handleBulkMatUpload} disabled={uploading || !bulkMatData.trim()}>
              {uploading ? 'Importando...' : 'Importar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Task Upload Dialog */}
      <Dialog open={bulkTarDialogOpen} onOpenChange={setBulkTarDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Carga Masiva de Tareas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-slate-50 p-3 rounded-lg text-sm">
              <p className="font-semibold mb-2">Formato CSV (una línea por tarea):</p>
              <code className="text-xs bg-white p-2 rounded block">
                nombre,categoria
              </code>
              <p className="text-xs text-slate-500 mt-2">
                Ejemplo: Revisión eléctrica,Eléctrico
              </p>
            </div>
            <div className="space-y-2">
              <Label>Datos CSV</Label>
              <Textarea 
                value={bulkTarData} 
                onChange={(e) => setBulkTarData(e.target.value)}
                placeholder="nombre,categoria&#10;Revisión eléctrica,Eléctrico&#10;Limpieza canaletas,Mantenimiento"
                rows={10}
                className="font-mono text-sm"
              />
            </div>
            {uploadResult && (
              <div className={`p-3 rounded ${uploadResult.success > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                <p className="font-semibold">{uploadResult.success} tareas importadas correctamente</p>
                {uploadResult.errors.length > 0 && (
                  <ul className="text-sm mt-1">
                    {uploadResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkTarDialogOpen(false)}>Cerrar</Button>
            <Button onClick={handleBulkTarUpload} disabled={uploading || !bulkTarData.trim()}>
              {uploading ? 'Importando...' : 'Importar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
