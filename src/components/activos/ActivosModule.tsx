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
import { Textarea } from '@/components/ui/textarea'
import { Plus, Pencil, Trash2, Search, Download } from 'lucide-react'

interface Activo {
  id: string
  nombre: string
  categoria: string
  estado: string
  ubicacion: string | null
  serie: string | null
  fechaCompra: string | null
  costoCompra: number
  valorActual: number
  descripcion: string | null
  asignadoId: string | null
  asignado: { nombre: string } | null
}

const formatCLP = (n: number) => 
  '$' + new Intl.NumberFormat('es-CL').format(Math.round(n || 0))

const exportToCSV = (data: Activo[]) => {
  const headers = ['Nombre', 'Categoría', 'Estado', 'Ubicación', 'N° Serie', 'Fecha Compra', 'Costo Compra', 'Valor Actual', 'Asignado', 'Descripción']
  const rows = data.map(a => [
    a.nombre,
    a.categoria,
    a.estado,
    a.ubicacion || '',
    a.serie || '',
    a.fechaCompra || '',
    a.costoCompra,
    a.valorActual,
    a.asignado?.nombre || '',
    a.descripcion || ''
  ])
  
  const csvContent = '\uFEFF' + [headers, ...rows].map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `activos_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
}

const categoriaColors: Record<string, string> = {
  'Equipo': 'bg-blue-100 text-blue-700',
  'Herramienta': 'bg-amber-100 text-amber-700',
  'Vehículo': 'bg-purple-100 text-purple-700',
  'Mobiliario': 'bg-cyan-100 text-cyan-700',
  'Infraestructura': 'bg-slate-100 text-slate-700',
  'Tecnología': 'bg-green-100 text-green-700',
}

const estadoColors: Record<string, string> = {
  'Activo': 'bg-green-100 text-green-700',
  'Inactivo': 'bg-slate-100 text-slate-700',
  'En Reparación': 'bg-yellow-100 text-yellow-700',
  'Dado de Baja': 'bg-red-100 text-red-700',
}

export function ActivosModule() {
  const [activos, setActivos] = useState<Activo[]>([])
  const [personal, setPersonal] = useState<{ id: string; nombre: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingAct, setEditingAct] = useState<Activo | null>(null)
  const [formData, setFormData] = useState({
    nombre: '',
    categoria: 'Equipo',
    estado: 'Activo',
    ubicacion: '',
    serie: '',
    fechaCompra: '',
    costoCompra: 0,
    valorActual: 0,
    descripcion: '',
    asignadoId: 'none',
  })

  const fetchActivos = async (searchTerm = '') => {
    setLoading(true)
    try {
      const url = searchTerm ? `/api/activos?search=${encodeURIComponent(searchTerm)}` : '/api/activos'
      const res = await fetch(url)
      const data = await res.json()
      setActivos(data)
    } catch (error) {
      console.error('Error fetching activos:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    void (async () => {
      await fetchActivos()
    })()
    fetch('/api/personal').then(res => res.json()).then(setPersonal)
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => fetchActivos(search), 300)
    return () => clearTimeout(timeout)
  }, [search])

  const openDialog = (act?: Activo) => {
    if (act) {
      setEditingAct(act)
      setFormData({
        nombre: act.nombre,
        categoria: act.categoria,
        estado: act.estado,
        ubicacion: act.ubicacion || '',
        serie: act.serie || '',
        fechaCompra: act.fechaCompra || '',
        costoCompra: act.costoCompra,
        valorActual: act.valorActual,
        descripcion: act.descripcion || '',
        asignadoId: act.asignadoId || 'none',
      })
    } else {
      setEditingAct(null)
      setFormData({
        nombre: '',
        categoria: 'Equipo',
        estado: 'Activo',
        ubicacion: '',
        serie: '',
        fechaCompra: '',
        costoCompra: 0,
        valorActual: 0,
        descripcion: '',
        asignadoId: 'none',
      })
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.nombre.trim()) return

    const dataToSend = {
      ...formData,
      asignadoId: formData.asignadoId === 'none' ? null : formData.asignadoId,
    }

    try {
      if (editingAct) {
        await fetch(`/api/activos/${editingAct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend),
        })
      } else {
        await fetch('/api/activos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend),
        })
      }
      setDialogOpen(false)
      fetchActivos(search)
    } catch (error) {
      console.error('Error saving activo:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este activo?')) return
    try {
      await fetch(`/api/activos/${id}`, { method: 'DELETE' })
      fetchActivos(search)
    } catch (error) {
      console.error('Error deleting activo:', error)
    }
  }

  const totalValor = activos.reduce((sum, a) => sum + a.valorActual, 0)

  return (
    <div className="space-y-5">
      {/* Actions */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={() => exportToCSV(activos)}>
          <Download className="w-4 h-4 mr-1" /> Exportar
        </Button>
        <Button onClick={() => openDialog()}>
          <Plus className="w-4 h-4 mr-1" /> Nuevo
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="py-3 flex-row items-center justify-between">
          <CardTitle className="text-sm">Activos ({activos.length})</CardTitle>
          <div className="text-sm font-semibold">Valor Total: {formatCLP(totalValor)}</div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Nombre</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Categoría</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Estado</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Ubicación</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">N° Serie</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Costo</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Valor Actual</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Asignado</th>
                  <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="p-8 text-center text-slate-400">Cargando...</td></tr>
                ) : activos.length === 0 ? (
                  <tr><td colSpan={9} className="p-8 text-center text-slate-400">Sin activos</td></tr>
                ) : (
                  activos.map((act) => (
                    <tr key={act.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="p-3 font-semibold max-w-[200px] truncate" title={act.nombre}>{act.nombre}</td>
                      <td className="p-3">
                        <Badge className={categoriaColors[act.categoria] || 'bg-slate-100'}>{act.categoria}</Badge>
                      </td>
                      <td className="p-3">
                        <Badge className={estadoColors[act.estado] || 'bg-slate-100'}>{act.estado}</Badge>
                      </td>
                      <td className="p-3 text-xs text-slate-600 max-w-[150px] truncate" title={act.ubicacion || ''}>{act.ubicacion || '–'}</td>
                      <td className="p-3 font-mono text-xs whitespace-nowrap">{act.serie || '–'}</td>
                      <td className="p-3 font-mono text-xs whitespace-nowrap">{formatCLP(act.costoCompra)}</td>
                      <td className="p-3 font-mono text-xs whitespace-nowrap">{formatCLP(act.valorActual)}</td>
                      <td className="p-3 text-xs max-w-[150px] truncate" title={act.asignado?.nombre || ''}>{act.asignado?.nombre || '–'}</td>
                      <td className="p-3">
                        <div className="flex justify-center gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openDialog(act)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:text-red-700" onClick={() => handleDelete(act.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
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
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingAct ? 'Editar' : 'Nuevo'} Activo</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <Label>Nombre</Label>
                <Input className="w-full" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} />
              </div>
              <div className="space-y-2 min-w-0">
                <Label>Categoría</Label>
                <Select value={formData.categoria} onValueChange={(v) => setFormData({...formData, categoria: v})}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Equipo', 'Herramienta', 'Vehículo', 'Mobiliario', 'Infraestructura', 'Tecnología'].map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <Label>Estado</Label>
                <Select value={formData.estado} onValueChange={(v) => setFormData({...formData, estado: v})}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Activo', 'Inactivo', 'En Reparación', 'Dado de Baja'].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 min-w-0">
                <Label>Ubicación</Label>
                <Input className="w-full" value={formData.ubicacion} onChange={(e) => setFormData({...formData, ubicacion: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <Label>N° Serie</Label>
                <Input className="w-full" value={formData.serie} onChange={(e) => setFormData({...formData, serie: e.target.value})} />
              </div>
              <div className="space-y-2 min-w-0">
                <Label>Fecha Compra</Label>
                <Input className="w-full" type="date" value={formData.fechaCompra} onChange={(e) => setFormData({...formData, fechaCompra: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <Label>Costo Compra ($)</Label>
                <Input className="w-full text-right" type="number" value={formData.costoCompra} onChange={(e) => setFormData({...formData, costoCompra: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="space-y-2 min-w-0">
                <Label>Valor Actual ($)</Label>
                <Input className="w-full text-right" type="number" value={formData.valorActual} onChange={(e) => setFormData({...formData, valorActual: parseFloat(e.target.value) || 0})} />
              </div>
            </div>
            <div className="space-y-2 min-w-0">
              <Label>Asignado a</Label>
              <Select value={formData.asignadoId} onValueChange={(v) => setFormData({...formData, asignadoId: v})}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {personal.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 min-w-0">
              <Label>Descripción</Label>
              <Textarea className="w-full" value={formData.descripcion} onChange={(e) => setFormData({...formData, descripcion: e.target.value})} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
