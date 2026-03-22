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
import { Plus, Pencil, Trash2, Search } from 'lucide-react'

interface Propiedad {
  id: string
  nombre: string
  tipo: string
  estado: string
  direccion: string | null
  habitaciones: number
  banos: number
  mts2: number
  precio: number
  contacto: string | null
  telefono: string | null
  email: string | null
  notas: string | null
}

const formatCLP = (n: number) => 
  '$' + new Intl.NumberFormat('es-CL').format(Math.round(n || 0))

const tipoColors: Record<string, string> = {
  'Casa': 'bg-blue-100 text-blue-700',
  'Departamento': 'bg-purple-100 text-purple-700',
  'Local Comercial': 'bg-orange-100 text-orange-700',
  'Bodega': 'bg-slate-100 text-slate-700',
  'Estacionamiento': 'bg-cyan-100 text-cyan-700',
}

const estadoColors: Record<string, string> = {
  'Disponible': 'bg-green-100 text-green-700',
  'Ocupado': 'bg-red-100 text-red-700',
  'Arriendo': 'bg-purple-100 text-purple-700',
  'Venta': 'bg-orange-100 text-orange-700',
  'Mantenimiento': 'bg-yellow-100 text-yellow-700',
  'Reservado': 'bg-blue-100 text-blue-700',
}

export function CondominioModule() {
  const [propiedades, setPropiedades] = useState<Propiedad[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProp, setEditingProp] = useState<Propiedad | null>(null)
  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'Casa',
    estado: 'Disponible',
    direccion: '',
    habitaciones: 0,
    banos: 0,
    mts2: 0,
    precio: 0,
    contacto: '',
    telefono: '',
    email: '',
    notas: '',
  })

  const fetchPropiedades = async (searchTerm = '') => {
    setLoading(true)
    try {
      const url = searchTerm ? `/api/propiedades?search=${encodeURIComponent(searchTerm)}` : '/api/propiedades'
      const res = await fetch(url)
      const data = await res.json()
      setPropiedades(data)
    } catch (error) {
      console.error('Error fetching propiedades:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    void (async () => {
      await fetchPropiedades()
    })()
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => fetchPropiedades(search), 300)
    return () => clearTimeout(timeout)
  }, [search])

  const openDialog = (prop?: Propiedad) => {
    if (prop) {
      setEditingProp(prop)
      setFormData({
        nombre: prop.nombre,
        tipo: prop.tipo,
        estado: prop.estado,
        direccion: prop.direccion || '',
        habitaciones: prop.habitaciones,
        banos: prop.banos,
        mts2: prop.mts2,
        precio: prop.precio,
        contacto: prop.contacto || '',
        telefono: prop.telefono || '',
        email: prop.email || '',
        notas: prop.notas || '',
      })
    } else {
      setEditingProp(null)
      setFormData({
        nombre: '',
        tipo: 'Casa',
        estado: 'Disponible',
        direccion: '',
        habitaciones: 0,
        banos: 0,
        mts2: 0,
        precio: 0,
        contacto: '',
        telefono: '',
        email: '',
        notas: '',
      })
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.nombre.trim()) return

    try {
      if (editingProp) {
        await fetch(`/api/propiedades/${editingProp.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      } else {
        await fetch('/api/propiedades', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      }
      setDialogOpen(false)
      fetchPropiedades(search)
    } catch (error) {
      console.error('Error saving propiedad:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta propiedad?')) return
    try {
      await fetch(`/api/propiedades/${id}`, { method: 'DELETE' })
      fetchPropiedades(search)
    } catch (error) {
      console.error('Error deleting propiedad:', error)
    }
  }

  // Stats
  const stats = {
    Ocupado: propiedades.filter(p => p.estado === 'Ocupado').length,
    Disponible: propiedades.filter(p => p.estado === 'Disponible').length,
    Arriendo: propiedades.filter(p => p.estado === 'Arriendo').length,
    Venta: propiedades.filter(p => p.estado === 'Venta').length,
    Mantenimiento: propiedades.filter(p => p.estado === 'Mantenimiento').length,
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        {Object.entries(stats).map(([estado, count]) => (
          <Card key={estado} className="p-3">
            <div className="text-[10px] text-slate-500 font-semibold uppercase">{estado}</div>
            <div className="text-xl font-bold text-[#0f2040]">{count}</div>
          </Card>
        ))}
      </div>

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
        <Button onClick={() => openDialog()}>
          <Plus className="w-4 h-4 mr-1" /> Nueva
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Propiedades ({propiedades.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Nombre</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Tipo</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Estado</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Dirección</th>
                  <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Hab.</th>
                  <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Baños</th>
                  <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">m²</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Precio</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Contacto</th>
                  <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="p-8 text-center text-slate-400">Cargando...</td></tr>
                ) : propiedades.length === 0 ? (
                  <tr><td colSpan={10} className="p-8 text-center text-slate-400">Sin propiedades</td></tr>
                ) : (
                  propiedades.map((prop) => (
                    <tr key={prop.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="p-3 font-semibold">{prop.nombre}</td>
                      <td className="p-3">
                        <Badge className={tipoColors[prop.tipo] || 'bg-slate-100'}>{prop.tipo}</Badge>
                      </td>
                      <td className="p-3">
                        <Badge className={estadoColors[prop.estado] || 'bg-slate-100'}>{prop.estado}</Badge>
                      </td>
                      <td className="p-3 text-xs text-slate-600">{prop.direccion || '–'}</td>
                      <td className="p-3 text-center">{prop.habitaciones || '–'}</td>
                      <td className="p-3 text-center">{prop.banos || '–'}</td>
                      <td className="p-3 text-center">{prop.mts2 || '–'}</td>
                      <td className="p-3 font-mono text-xs">{prop.precio ? formatCLP(prop.precio) : '–'}</td>
                      <td className="p-3 text-xs">{prop.contacto || '–'}</td>
                      <td className="p-3">
                        <div className="flex justify-center gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openDialog(prop)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:text-red-700" onClick={() => handleDelete(prop.id)}>
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
            <DialogTitle>{editingProp ? 'Editar' : 'Nueva'} Propiedad</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre/Número</Label>
                <Input value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={formData.tipo} onValueChange={(v) => setFormData({...formData, tipo: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Casa', 'Departamento', 'Local Comercial', 'Bodega', 'Estacionamiento'].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={formData.estado} onValueChange={(v) => setFormData({...formData, estado: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Disponible', 'Ocupado', 'Arriendo', 'Venta', 'Mantenimiento', 'Reservado'].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Precio ($)</Label>
                <Input type="number" value={formData.precio} onChange={(e) => setFormData({...formData, precio: parseFloat(e.target.value) || 0})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input value={formData.direccion} onChange={(e) => setFormData({...formData, direccion: e.target.value})} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Habitaciones</Label>
                <Input type="number" value={formData.habitaciones} onChange={(e) => setFormData({...formData, habitaciones: parseInt(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>Baños</Label>
                <Input type="number" value={formData.banos} onChange={(e) => setFormData({...formData, banos: parseInt(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>m²</Label>
                <Input type="number" value={formData.mts2} onChange={(e) => setFormData({...formData, mts2: parseFloat(e.target.value) || 0})} />
              </div>
            </div>
            <div className="border-t pt-4">
              <div className="text-xs font-semibold text-slate-500 mb-2">CONTACTO</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input value={formData.contacto} onChange={(e) => setFormData({...formData, contacto: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea value={formData.notas} onChange={(e) => setFormData({...formData, notas: e.target.value})} />
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
