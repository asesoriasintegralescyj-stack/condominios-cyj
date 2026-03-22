'use client'

import { useState, useEffect, useCallback } from 'react'
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
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Edit, Trash2, ClipboardList, Search } from 'lucide-react'

interface Tarea {
  id: string
  codigo: string
  nombre: string
  categoria: string
  tipoMantencion: string
  frecuencia: string
  prioridad: string
  descripcion?: string
}

export function TareasModule() {
  const [tareas, setTareas] = useState<Tarea[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editando, setEditando] = useState<Tarea | null>(null)
  const [search, setSearch] = useState('')

  const [form, setForm] = useState({
    codigo: '',
    nombre: '',
    categoria: '',
    tipoMantencion: '',
    frecuencia: '',
    prioridad: 'Media',
    descripcion: ''
  })

  const fetchTareas = useCallback(async () => {
    try {
      const res = await fetch('/api/catalogos/tareas')
      const data = await res.json()
      setTareas(Array.isArray(data) ? data : data.data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchTareas()
  }, [fetchTareas])

  const openNew = () => {
    setEditando(null)
    setForm({
      codigo: '',
      nombre: '',
      categoria: '',
      tipoMantencion: '',
      frecuencia: '',
      prioridad: 'Media',
      descripcion: ''
    })
    setDialogOpen(true)
  }

  const openEdit = (tarea: Tarea) => {
    setEditando(tarea)
    setForm({
      codigo: tarea.codigo,
      nombre: tarea.nombre,
      categoria: tarea.categoria || '',
      tipoMantencion: tarea.tipoMantencion || '',
      frecuencia: tarea.frecuencia || '',
      prioridad: tarea.prioridad || 'Media',
      descripcion: tarea.descripcion || ''
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    try {
      if (editando) {
        await fetch(`/api/catalogos/tareas/${editando.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        })
      } else {
        await fetch('/api/catalogos/tareas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        })
      }
      setDialogOpen(false)
      fetchTareas()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta tarea?')) return
    try {
      await fetch(`/api/catalogos/tareas/${id}`, { method: 'DELETE' })
      fetchTareas()
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'Urgente':
        return 'bg-red-100 text-red-700'
      case 'Alta':
        return 'bg-orange-100 text-orange-700'
      case 'Media':
        return 'bg-yellow-100 text-yellow-700'
      case 'Baja':
        return 'bg-green-100 text-green-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const filteredTareas = tareas.filter(t => 
    t.nombre.toLowerCase().includes(search.toLowerCase()) ||
    t.codigo.toLowerCase().includes(search.toLowerCase()) ||
    t.categoria?.toLowerCase().includes(search.toLowerCase())
  )

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
            placeholder="Buscar tareas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" /> Nueva Tarea
        </Button>
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
                  <th className="text-left p-3 text-xs font-bold text-slate-500 uppercase">Tipo</th>
                  <th className="text-left p-3 text-xs font-bold text-slate-500 uppercase">Frecuencia</th>
                  <th className="text-left p-3 text-xs font-bold text-slate-500 uppercase">Prioridad</th>
                  <th className="text-center p-3 text-xs font-bold text-slate-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredTareas.map((tarea) => (
                  <tr key={tarea.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="p-3 font-mono text-xs font-bold text-[#0f2040]">{tarea.codigo}</td>
                    <td className="p-3 font-medium">{tarea.nombre}</td>
                    <td className="p-3 text-slate-600">{tarea.categoria || '–'}</td>
                    <td className="p-3 text-slate-600">{tarea.tipoMantencion || '–'}</td>
                    <td className="p-3 text-slate-600">{tarea.frecuencia || '–'}</td>
                    <td className="p-3">
                      <Badge className={getPrioridadColor(tarea.prioridad)}>
                        {tarea.prioridad || 'Media'}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(tarea)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(tarea.id)}>
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

      {filteredTareas.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-slate-500">
            <ClipboardList className="w-12 h-12 mx-auto mb-2 opacity-50" />
            No se encontraron tareas
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editando ? 'Editar' : 'Nueva'} Tarea</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código</Label>
                <Input value={form.codigo} onChange={(e) => setForm({...form, codigo: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select value={form.prioridad} onValueChange={(v) => setForm({...form, prioridad: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Urgente">Urgente</SelectItem>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Media">Media</SelectItem>
                    <SelectItem value="Baja">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={form.nombre} onChange={(e) => setForm({...form, nombre: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Input value={form.categoria} onChange={(e) => setForm({...form, categoria: e.target.value})} placeholder="Limpieza, Mantenimiento, etc" />
              </div>
              <div className="space-y-2">
                <Label>Tipo Mantención</Label>
                <Input value={form.tipoMantencion} onChange={(e) => setForm({...form, tipoMantencion: e.target.value})} placeholder="Preventiva, Correctiva" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Frecuencia</Label>
              <Input value={form.frecuencia} onChange={(e) => setForm({...form, frecuencia: e.target.value})} placeholder="Diaria, Semanal, Mensual, etc" />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input value={form.descripcion} onChange={(e) => setForm({...form, descripcion: e.target.value})} />
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
