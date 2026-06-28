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
import { Plus, Pencil, Trash2, Search, Eye, Camera, X } from 'lucide-react'

interface Inspeccion {
  id: string
  titulo: string
  tipo: string
  estado: string
  fecha: string | null
  hora: string | null
  ubicacion: string | null
  asignado: string | null
  descripcion: string | null
  recurrente: boolean
  notas: string | null
  fotosAntes: string | null
  fotosDurante: string | null
  fotosDespues: string | null
  fotos: string | null
}

// Safely parse a JSON array stored as a String? column.
const parseFotoArray = (raw: string | null): string[] => {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const formatDate = (d: string | null) => {
  if (!d) return '–'
  try {
    const [y, m, dd] = d.split('-')
    return `${dd}/${m}/${y}`
  } catch {
    return d
  }
}

const tipoColors: Record<string, string> = {
  'Mantenimiento': 'bg-orange-100 text-orange-700',
  'Seguridad': 'bg-purple-100 text-purple-700',
  'Eléctrica': 'bg-yellow-100 text-yellow-700',
  'Sanitaria': 'bg-blue-100 text-blue-700',
  'Estructural': 'bg-slate-100 text-slate-700',
  'General': 'bg-cyan-100 text-cyan-700',
}

const estadoColors: Record<string, string> = {
  'Planificado': 'bg-blue-100 text-blue-700',
  'En Progreso': 'bg-yellow-100 text-yellow-700',
  'Completado': 'bg-green-100 text-green-700',
  'Cancelado': 'bg-red-100 text-red-700',
}

export function InspeccionesModule() {
  const [inspecciones, setInspecciones] = useState<Inspeccion[]>([])
  const [personal, setPersonal] = useState<{ id: string; nombre: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [editingInsp, setEditingInsp] = useState<Inspeccion | null>(null)
  const [viewingInsp, setViewingInsp] = useState<Inspeccion | null>(null)
  const [formData, setFormData] = useState({
    titulo: '',
    tipo: 'Mantenimiento',
    estado: 'Planificado',
    fecha: new Date().toISOString().split('T')[0],
    hora: '',
    ubicacion: '',
    asignado: 'none',
    descripcion: '',
    recurrente: false,
    notas: '',
  })
  const [fotos, setFotos] = useState<string[]>([])

  const fetchInspecciones = async (searchTerm = '') => {
    setLoading(true)
    try {
      const url = searchTerm ? `/api/inspecciones?search=${encodeURIComponent(searchTerm)}` : '/api/inspecciones'
      const res = await fetch(url)
      const data = await res.json()
      setInspecciones(data)
    } catch (error) {
      console.error('Error fetching inspecciones:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    void (async () => {
      await fetchInspecciones()
    })()
    fetch('/api/personal').then(res => res.json()).then(setPersonal)
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => fetchInspecciones(search), 300)
    return () => clearTimeout(timeout)
  }, [search])

  const openDialog = (insp?: Inspeccion) => {
    if (insp) {
      setEditingInsp(insp)
      setFormData({
        titulo: insp.titulo,
        tipo: insp.tipo,
        estado: insp.estado,
        fecha: insp.fecha || new Date().toISOString().split('T')[0],
        hora: insp.hora || '',
        ubicacion: insp.ubicacion || '',
        asignado: insp.asignado || 'none',
        descripcion: insp.descripcion || '',
        recurrente: insp.recurrente,
        notas: insp.notas || '',
      })
      setFotos(parseFotoArray(insp.fotos))
    } else {
      setEditingInsp(null)
      setFormData({
        titulo: '',
        tipo: 'Mantenimiento',
        estado: 'Planificado',
        fecha: new Date().toISOString().split('T')[0],
        hora: '',
        ubicacion: '',
        asignado: 'none',
        descripcion: '',
        recurrente: false,
        notas: '',
      })
      setFotos([])
    }
    setDialogOpen(true)
  }

  const handleAddFotos = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFotos(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const handleSave = async () => {
    if (!formData.titulo.trim()) return

    const dataToSend = {
      ...formData,
      asignado: formData.asignado === 'none' ? null : formData.asignado,
      fotos,
    }

    try {
      if (editingInsp) {
        await fetch(`/api/inspecciones/${editingInsp.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend),
        })
      } else {
        await fetch('/api/inspecciones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend),
        })
      }
      setDialogOpen(false)
      fetchInspecciones(search)
    } catch (error) {
      console.error('Error saving inspeccion:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta inspección?')) return
    try {
      await fetch(`/api/inspecciones/${id}`, { method: 'DELETE' })
      fetchInspecciones(search)
    } catch (error) {
      console.error('Error deleting inspeccion:', error)
    }
  }

  const countPhotos = (insp: Inspeccion) => {
    const antes = parseFotoArray(insp.fotosAntes).length
    const durante = parseFotoArray(insp.fotosDurante).length
    const despues = parseFotoArray(insp.fotosDespues).length
    const generales = parseFotoArray(insp.fotos).length
    return antes + durante + despues + generales
  }

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
        <Button onClick={() => openDialog()}>
          <Plus className="w-4 h-4 mr-1" /> Nueva Inspección
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Inspecciones ({inspecciones.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Título</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Tipo</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Estado</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Ubicación</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Asignado</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Fecha</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Hora</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Fotos</th>
                  <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="p-8 text-center text-slate-400">Cargando...</td></tr>
                ) : inspecciones.length === 0 ? (
                  <tr><td colSpan={9} className="p-8 text-center text-slate-400">Sin inspecciones</td></tr>
                ) : (
                  inspecciones.map((insp) => (
                    <tr key={insp.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="p-3 font-semibold max-w-[200px] truncate" title={insp.titulo}>{insp.titulo}</td>
                      <td className="p-3">
                        <Badge className={tipoColors[insp.tipo] || 'bg-slate-100'}>{insp.tipo}</Badge>
                      </td>
                      <td className="p-3">
                        <Badge className={estadoColors[insp.estado] || 'bg-slate-100'}>{insp.estado}</Badge>
                      </td>
                      <td className="p-3 text-xs max-w-[150px] truncate" title={insp.ubicacion || ''}>{insp.ubicacion || '–'}</td>
                      <td className="p-3 text-xs max-w-[150px] truncate" title={insp.asignado || ''}>{insp.asignado || '–'}</td>
                      <td className="p-3 text-xs">{formatDate(insp.fecha)}</td>
                      <td className="p-3 text-xs">{insp.hora || '–'}</td>
                      <td className="p-3 text-xs">{countPhotos(insp)} 📷</td>
                      <td className="p-3">
                        <div className="flex justify-center gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setViewingInsp(insp); setViewDialogOpen(true); }}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openDialog(insp)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:text-red-700" onClick={() => handleDelete(insp.id)}>
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
            <DialogTitle>{editingInsp ? 'Editar' : 'Nueva'} Inspección</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2 min-w-0">
              <Label>Título</Label>
              <Input className="w-full" value={formData.titulo} onChange={(e) => setFormData({...formData, titulo: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <Label>Tipo</Label>
                <Select value={formData.tipo} onValueChange={(v) => setFormData({...formData, tipo: v})}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Mantenimiento', 'Seguridad', 'Eléctrica', 'Sanitaria', 'Estructural', 'General', 'Otra'].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 min-w-0">
                <Label>Estado</Label>
                <Select value={formData.estado} onValueChange={(v) => setFormData({...formData, estado: v})}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Planificado', 'En Progreso', 'Completado', 'Cancelado'].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <Label>Fecha</Label>
                <Input type="date" value={formData.fecha} onChange={(e) => setFormData({...formData, fecha: e.target.value})} />
              </div>
              <div className="space-y-2 min-w-0">
                <Label>Hora</Label>
                <Input type="time" value={formData.hora} onChange={(e) => setFormData({...formData, hora: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <Label>Ubicación</Label>
                <Input value={formData.ubicacion} onChange={(e) => setFormData({...formData, ubicacion: e.target.value})} />
              </div>
              <div className="space-y-2 min-w-0">
                <Label>Asignado a</Label>
                <Select value={formData.asignado} onValueChange={(v) => setFormData({...formData, asignado: v})}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin asignar</SelectItem>
                    {personal.map(p => (
                      <SelectItem key={p.id} value={p.nombre}>{p.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2 min-w-0">
              <Label>Descripción</Label>
              <Textarea className="w-full" value={formData.descripcion} onChange={(e) => setFormData({...formData, descripcion: e.target.value})} />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={formData.recurrente} onChange={(e) => setFormData({...formData, recurrente: e.target.checked})} className="rounded" />
              Evento recurrente
            </label>
            <div className="space-y-2 min-w-0">
              <Label>Notas</Label>
              <Textarea className="w-full" value={formData.notas} onChange={(e) => setFormData({...formData, notas: e.target.value})} />
            </div>

            {/* Fotos */}
            <div className="space-y-2 min-w-0">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-orange-500" />
                  Fotos ({fotos.length})
                </Label>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      handleAddFotos(e.target.files)
                      e.target.value = ''
                    }}
                  />
                  <Button size="sm" variant="outline" type="button" asChild>
                    <span><Plus className="w-3.5 h-3.5 mr-1" /> Agregar Foto</span>
                  </Button>
                </label>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {fotos.map((foto, i) => (
                  <div key={i} className="relative group aspect-square bg-slate-100 rounded-lg overflow-hidden border-2 border-orange-200 min-w-0">
                    <img src={foto} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      aria-label="Eliminar foto"
                      onClick={() => setFotos(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {fotos.length === 0 && (
                  <div className="col-span-full py-6 text-center text-slate-500 border-2 border-dashed rounded-lg min-w-0">
                    <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Sin fotos adjuntas</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Inspección: {viewingInsp?.titulo}</DialogTitle>
          </DialogHeader>
          {viewingInsp && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Tipo</div>
                  <Badge className={tipoColors[viewingInsp.tipo]}>{viewingInsp.tipo}</Badge>
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Estado</div>
                  <Badge className={estadoColors[viewingInsp.estado]}>{viewingInsp.estado}</Badge>
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Fecha/Hora</div>
                  <div className="text-sm truncate">{formatDate(viewingInsp.fecha)} {viewingInsp.hora}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Asignado</div>
                  <div className="text-sm truncate">{viewingInsp.asignado || '–'}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Ubicación</div>
                  <div className="text-sm truncate">{viewingInsp.ubicacion || '–'}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Fotos</div>
                  <div className="text-sm">{countPhotos(viewingInsp)} 📷</div>
                </div>
              </div>
              {viewingInsp.descripcion && (
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Descripción</div>
                  <p className="text-sm text-slate-600">{viewingInsp.descripcion}</p>
                </div>
              )}
              {viewingInsp.notas && (
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Notas</div>
                  <p className="text-sm text-slate-600">{viewingInsp.notas}</p>
                </div>
              )}
              {parseFotoArray(viewingInsp.fotos).length > 0 && (
                <div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase mb-2">Fotos ({parseFotoArray(viewingInsp.fotos).length})</div>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                    {parseFotoArray(viewingInsp.fotos).map((foto, i) => (
                      <div key={i} className="aspect-square bg-slate-100 rounded-lg overflow-hidden border-2 border-orange-200 min-w-0">
                        <img src={foto} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>Cerrar</Button>
            <Button onClick={() => { setViewDialogOpen(false); openDialog(viewingInsp!); }}>Editar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
