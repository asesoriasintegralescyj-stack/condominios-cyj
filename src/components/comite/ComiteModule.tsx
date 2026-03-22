'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  Plus, Pencil, Trash2, Search, Users, UserCog, Calendar, 
  FileText, Clock, MapPin, CheckCircle, XCircle, AlertCircle,
  UserCheck, Building2, Camera, X
} from 'lucide-react'
import { useAppStore } from '@/lib/store'

// ============================================
// INTERFACES
// ============================================
interface MiembroComite {
  id: string
  nombre: string
  cargo: string
  unidad: string | null
  rut: string | null
  telefono: string | null
  email: string | null
  foto: string | null
  fechaInicio: string | null
  fechaFin: string | null
  estado: string
  notas: string | null
}

interface SesionComite {
  id: string
  titulo: string
  tipo: string
  fecha: string
  hora: string | null
  lugar: string | null
  estado: string
  ordenDia: string | null
  acuerdos: string | null
  asistentes: string | null
  acta: string | null
  quorum: number
  notas: string | null
}

// ============================================
// CONSTANTS
// ============================================
const CARGOS = ['Presidente', 'Vicepresidente', 'Secretario', 'Tesorero', 'Vocal'] as const

const cargoColors: Record<string, string> = {
  'Presidente': 'bg-amber-100 text-amber-700 border-amber-200',
  'Vicepresidente': 'bg-blue-100 text-blue-700 border-blue-200',
  'Secretario': 'bg-green-100 text-green-700 border-green-200',
  'Tesorero': 'bg-purple-100 text-purple-700 border-purple-200',
  'Vocal': 'bg-slate-100 text-slate-700 border-slate-200',
}

const cargoIcons: Record<string, React.ReactNode> = {
  'Presidente': <UserCheck className="w-3 h-3" />,
  'Vicepresidente': <UserCog className="w-3 h-3" />,
  'Secretario': <FileText className="w-3 h-3" />,
  'Tesorero': <Building2 className="w-3 h-3" />,
  'Vocal': <Users className="w-3 h-3" />,
}

const estadoColors: Record<string, string> = {
  'Activo': 'bg-green-100 text-green-700',
  'Inactivo': 'bg-slate-100 text-slate-700',
}

const tipoSesionColors: Record<string, string> = {
  'Ordinaria': 'bg-blue-100 text-blue-700',
  'Extraordinaria': 'bg-amber-100 text-amber-700',
}

const estadoSesionColors: Record<string, string> = {
  'Programada': 'bg-blue-100 text-blue-700',
  'Realizada': 'bg-green-100 text-green-700',
  'Cancelada': 'bg-red-100 text-red-700',
}

const estadoSesionIcons: Record<string, React.ReactNode> = {
  'Programada': <Clock className="w-3 h-3" />,
  'Realizada': <CheckCircle className="w-3 h-3" />,
  'Cancelada': <XCircle className="w-3 h-3" />,
}

// ============================================
// HELPER FUNCTIONS
// ============================================
const formatDate = (d: string | null) => {
  if (!d) return '–'
  try {
    const [y, m, dd] = d.split('-')
    return `${dd}/${m}/${y}`
  } catch {
    return d
  }
}

const formatDateTime = (fecha: string, hora: string | null) => {
  const f = formatDate(fecha)
  return hora ? `${f} - ${hora}` : f
}

export function ComiteModule() {
  const { currentCondominio } = useAppStore()
  
  // ============================================
  // STATE
  // ============================================
  const [miembros, setMiembros] = useState<MiembroComite[]>([])
  const [sesiones, setSesiones] = useState<SesionComite[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filters
  const [searchMiembro, setSearchMiembro] = useState('')
  const [filterCargo, setFilterCargo] = useState('todos')
  const [filterEstado, setFilterEstado] = useState('todos')
  
  const [searchSesion, setSearchSesion] = useState('')
  const [filterTipoSesion, setFilterTipoSesion] = useState('todos')
  const [filterEstadoSesion, setFilterEstadoSesion] = useState('todos')
  
  // Dialogs
  const [miembroDialogOpen, setMiembroDialogOpen] = useState(false)
  const [sesionDialogOpen, setSesionDialogOpen] = useState(false)
  const [editingMiembro, setEditingMiembro] = useState<MiembroComite | null>(null)
  const [editingSesion, setEditingSesion] = useState<SesionComite | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteType, setDeleteType] = useState<'miembro' | 'sesion'>('miembro')
  const [deleteId, setDeleteId] = useState<string>('')
  
  // Form data
  const [miembroForm, setMiembroForm] = useState({
    nombre: '',
    cargo: 'Vocal',
    unidad: '',
    rut: '',
    telefono: '',
    email: '',
    foto: '',
    fechaInicio: '',
    fechaFin: '',
    estado: 'Activo',
    notas: '',
  })
  const photoInputRef = useRef<HTMLInputElement>(null)
  
  const [sesionForm, setSesionForm] = useState({
    titulo: '',
    tipo: 'Ordinaria',
    fecha: new Date().toISOString().split('T')[0],
    hora: '',
    lugar: '',
    estado: 'Programada',
    ordenDia: '',
    acuerdos: '',
    asistentes: '',
    acta: '',
    quorum: 0,
    notas: '',
  })

  // ============================================
  // FETCH FUNCTIONS
  // ============================================
  const fetchMiembros = async () => {
    try {
      const params = new URLSearchParams()
      if (currentCondominio?.id) params.append('condominioId', currentCondominio.id)
      if (searchMiembro) params.append('search', searchMiembro)
      if (filterCargo !== 'todos') params.append('cargo', filterCargo)
      if (filterEstado !== 'todos') params.append('estado', filterEstado)
      
      const res = await fetch(`/api/comite?${params.toString()}`)
      const data = await res.json()
      setMiembros(data)
    } catch (error) {
      console.error('Error fetching miembros:', error)
    }
  }

  const fetchSesiones = async () => {
    try {
      const params = new URLSearchParams()
      if (currentCondominio?.id) params.append('condominioId', currentCondominio.id)
      if (searchSesion) params.append('search', searchSesion)
      if (filterTipoSesion !== 'todos') params.append('tipo', filterTipoSesion)
      if (filterEstadoSesion !== 'todos') params.append('estado', filterEstadoSesion)
      
      const res = await fetch(`/api/comite/sesiones?${params.toString()}`)
      const data = await res.json()
      setSesiones(data)
    } catch (error) {
      console.error('Error fetching sesiones:', error)
    }
  }

  const fetchAll = async () => {
    setLoading(true)
    await Promise.all([fetchMiembros(), fetchSesiones()])
    setLoading(false)
  }

  useEffect(() => {
    void (async () => {
      await fetchAll()
    })()
  }, [currentCondominio])

  useEffect(() => {
    const timeout = setTimeout(() => fetchMiembros(), 300)
    return () => clearTimeout(timeout)
  }, [searchMiembro, filterCargo, filterEstado])

  useEffect(() => {
    const timeout = setTimeout(() => fetchSesiones(), 300)
    return () => clearTimeout(timeout)
  }, [searchSesion, filterTipoSesion, filterEstadoSesion])

  // ============================================
  // COMPUTED VALUES
  // ============================================
  const stats = useMemo(() => {
    const totalMiembros = miembros.length
    const activos = miembros.filter(m => m.estado === 'Activo').length
    const inactivos = miembros.filter(m => m.estado === 'Inactivo').length
    
    const totalSesiones = sesiones.length
    const programadas = sesiones.filter(s => s.estado === 'Programada').length
    const realizadas = sesiones.filter(s => s.estado === 'Realizada').length
    const canceladas = sesiones.filter(s => s.estado === 'Cancelada').length
    
    const porCargo = CARGOS.reduce((acc, cargo) => {
      acc[cargo] = miembros.filter(m => m.cargo === cargo && m.estado === 'Activo').length
      return acc
    }, {} as Record<string, number>)
    
    return {
      totalMiembros,
      activos,
      inactivos,
      totalSesiones,
      programadas,
      realizadas,
      canceladas,
      porCargo,
    }
  }, [miembros, sesiones])

  const proximaSesion = useMemo(() => {
    const hoy = new Date().toISOString().split('T')[0]
    return sesiones
      .filter(s => s.estado === 'Programada' && s.fecha >= hoy)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))[0]
  }, [sesiones])

  // ============================================
  // HANDLERS
  // ============================================
  // Handle photo selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('El archivo es demasiado grande. Máximo 2MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setMiembroForm({ ...miembroForm, foto: base64 })
    }
    reader.readAsDataURL(file)
  }

  const removePhoto = () => {
    setMiembroForm({ ...miembroForm, foto: '' })
    if (photoInputRef.current) {
      photoInputRef.current.value = ''
    }
  }

  const openMiembroDialog = (miembro?: MiembroComite) => {
    if (miembro) {
      setEditingMiembro(miembro)
      setMiembroForm({
        nombre: miembro.nombre,
        cargo: miembro.cargo,
        unidad: miembro.unidad || '',
        rut: miembro.rut || '',
        telefono: miembro.telefono || '',
        email: miembro.email || '',
        foto: miembro.foto || '',
        fechaInicio: miembro.fechaInicio || '',
        fechaFin: miembro.fechaFin || '',
        estado: miembro.estado,
        notas: miembro.notas || '',
      })
    } else {
      setEditingMiembro(null)
      setMiembroForm({
        nombre: '',
        cargo: 'Vocal',
        unidad: '',
        rut: '',
        telefono: '',
        email: '',
        foto: '',
        fechaInicio: '',
        fechaFin: '',
        estado: 'Activo',
        notas: '',
      })
    }
    setMiembroDialogOpen(true)
  }

  const openSesionDialog = (sesion?: SesionComite) => {
    if (sesion) {
      setEditingSesion(sesion)
      setSesionForm({
        titulo: sesion.titulo,
        tipo: sesion.tipo,
        fecha: sesion.fecha,
        hora: sesion.hora || '',
        lugar: sesion.lugar || '',
        estado: sesion.estado,
        ordenDia: sesion.ordenDia || '',
        acuerdos: sesion.acuerdos || '',
        asistentes: sesion.asistentes || '',
        acta: sesion.acta || '',
        quorum: sesion.quorum,
        notas: sesion.notas || '',
      })
    } else {
      setEditingSesion(null)
      setSesionForm({
        titulo: '',
        tipo: 'Ordinaria',
        fecha: new Date().toISOString().split('T')[0],
        hora: '',
        lugar: '',
        estado: 'Programada',
        ordenDia: '',
        acuerdos: '',
        asistentes: '',
        acta: '',
        quorum: 0,
        notas: '',
      })
    }
    setSesionDialogOpen(true)
  }

  const handleSaveMiembro = async () => {
    if (!miembroForm.nombre.trim()) return
    
    try {
      const data = {
        ...miembroForm,
        condominioId: currentCondominio?.id,
      }
      
      if (editingMiembro) {
        await fetch(`/api/comite/${editingMiembro.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
      } else {
        await fetch('/api/comite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
      }
      
      setMiembroDialogOpen(false)
      fetchMiembros()
    } catch (error) {
      console.error('Error saving miembro:', error)
    }
  }

  const handleSaveSesion = async () => {
    if (!sesionForm.titulo.trim() || !sesionForm.fecha) return
    
    try {
      const data = {
        ...sesionForm,
        condominioId: currentCondominio?.id,
      }
      
      if (editingSesion) {
        await fetch(`/api/comite/sesiones/${editingSesion.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
      } else {
        await fetch('/api/comite/sesiones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
      }
      
      setSesionDialogOpen(false)
      fetchSesiones()
    } catch (error) {
      console.error('Error saving sesion:', error)
    }
  }

  const handleDelete = async () => {
    try {
      if (deleteType === 'miembro') {
        await fetch(`/api/comite/${deleteId}`, { method: 'DELETE' })
        fetchMiembros()
      } else {
        await fetch(`/api/comite/sesiones/${deleteId}`, { method: 'DELETE' })
        fetchSesiones()
      }
    } catch (error) {
      console.error('Error deleting:', error)
    }
    setDeleteDialogOpen(false)
  }

  const openDeleteDialog = (type: 'miembro' | 'sesion', id: string) => {
    setDeleteType(type)
    setDeleteId(id)
    setDeleteDialogOpen(true)
  }

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="space-y-5">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 opacity-80" />
              <div>
                <p className="text-xs opacity-80">Total Miembros</p>
                <p className="text-xl font-bold">{stats.totalMiembros}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 opacity-80" />
              <div>
                <p className="text-xs opacity-80">Activos</p>
                <p className="text-xl font-bold">{stats.activos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 opacity-80" />
              <div>
                <p className="text-xs opacity-80">Sesiones</p>
                <p className="text-xl font-bold">{stats.totalSesiones}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 opacity-80" />
              <div>
                <p className="text-xs opacity-80">Programadas</p>
                <p className="text-xl font-bold">{stats.programadas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 opacity-80" />
              <div>
                <p className="text-xs opacity-80">Realizadas</p>
                <p className="text-xl font-bold">{stats.realizadas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 opacity-80" />
              <div>
                <p className="text-xs opacity-80">Canceladas</p>
                <p className="text-xl font-bold">{stats.canceladas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Por Cargo Stats */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Miembros por Cargo (Activos)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {CARGOS.map(cargo => (
              <Badge 
                key={cargo} 
                variant="outline" 
                className={`${cargoColors[cargo]} px-3 py-1 flex items-center gap-1`}
              >
                {cargoIcons[cargo]}
                {cargo}: {stats.porCargo[cargo]}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Próxima Sesión */}
      {proximaSesion && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-blue-600 font-medium">Próxima Sesión</p>
                <p className="font-semibold">{proximaSesion.titulo}</p>
                <p className="text-sm text-slate-600">
                  {formatDateTime(proximaSesion.fecha, proximaSesion.hora)}
                  {proximaSesion.lugar && ` - ${proximaSesion.lugar}`}
                </p>
              </div>
              <Badge className={tipoSesionColors[proximaSesion.tipo]}>
                {proximaSesion.tipo}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="miembros" className="space-y-4">
        <TabsList>
          <TabsTrigger value="miembros" className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            Miembros del Comité
          </TabsTrigger>
          <TabsTrigger value="sesiones" className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            Sesiones de Comité
          </TabsTrigger>
        </TabsList>

        {/* Miembros Tab */}
        <TabsContent value="miembros" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar miembro..."
                value={searchMiembro}
                onChange={(e) => setSearchMiembro(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterCargo} onValueChange={setFilterCargo}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los cargos</SelectItem>
                {CARGOS.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Activo">Activo</SelectItem>
                <SelectItem value="Inactivo">Inactivo</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => openMiembroDialog()}>
              <Plus className="w-4 h-4 mr-1" /> Nuevo Miembro
            </Button>
          </div>

          {/* Miembros Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-50 z-10">
                    <tr className="border-b">
                      <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Nombre</th>
                      <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Cargo</th>
                      <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Unidad</th>
                      <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">RUT</th>
                      <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Contacto</th>
                      <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Período</th>
                      <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Estado</th>
                      <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={8} className="p-8 text-center text-slate-400">Cargando...</td></tr>
                    ) : miembros.length === 0 ? (
                      <tr><td colSpan={8} className="p-8 text-center text-slate-400">Sin miembros del comité</td></tr>
                    ) : (
                      miembros.map((m) => (
                        <tr key={m.id} className="border-b last:border-0 hover:bg-slate-50">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7">
                                {m.foto ? (
                                  <img src={m.foto} alt={m.nombre} className="h-7 w-7 rounded-full object-cover" />
                                ) : (
                                  <AvatarFallback className="bg-[#0f2040] text-white text-xs font-bold">
                                    {m.nombre.charAt(0)}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <span className="font-semibold">{m.nombre}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge className={`${cargoColors[m.cargo]} flex items-center gap-1 w-fit`}>
                              {cargoIcons[m.cargo]}
                              {m.cargo}
                            </Badge>
                          </td>
                          <td className="p-3 font-medium">{m.unidad || '–'}</td>
                          <td className="p-3 font-mono text-xs">{m.rut || '–'}</td>
                          <td className="p-3">
                            <div className="text-xs">
                              <div>{m.telefono || '–'}</div>
                              <div className="text-slate-500">{m.email || ''}</div>
                            </div>
                          </td>
                          <td className="p-3 text-xs">
                            <div>{formatDate(m.fechaInicio) || '–'}</div>
                            <div className="text-slate-500">hasta {formatDate(m.fechaFin) || '–'}</div>
                          </td>
                          <td className="p-3">
                            <Badge className={estadoColors[m.estado]}>{m.estado}</Badge>
                          </td>
                          <td className="p-3">
                            <div className="flex justify-center gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openMiembroDialog(m)}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-7 w-7 text-red-600 hover:text-red-700" 
                                onClick={() => openDeleteDialog('miembro', m.id)}
                              >
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
        </TabsContent>

        {/* Sesiones Tab */}
        <TabsContent value="sesiones" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar sesión..."
                value={searchSesion}
                onChange={(e) => setSearchSesion(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterTipoSesion} onValueChange={setFilterTipoSesion}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Ordinaria">Ordinaria</SelectItem>
                <SelectItem value="Extraordinaria">Extraordinaria</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterEstadoSesion} onValueChange={setFilterEstadoSesion}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Programada">Programada</SelectItem>
                <SelectItem value="Realizada">Realizada</SelectItem>
                <SelectItem value="Cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => openSesionDialog()}>
              <Plus className="w-4 h-4 mr-1" /> Nueva Sesión
            </Button>
          </div>

          {/* Sesiones List */}
          <div className="grid gap-3">
            {loading ? (
              <Card><CardContent className="p-8 text-center text-slate-400">Cargando...</CardContent></Card>
            ) : sesiones.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-slate-400">Sin sesiones de comité</CardContent></Card>
            ) : (
              sesiones.map((s) => (
                <Card key={s.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg">
                          <Calendar className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{s.titulo}</h3>
                            <Badge className={tipoSesionColors[s.tipo]}>{s.tipo}</Badge>
                            <Badge className={`${estadoSesionColors[s.estado]} flex items-center gap-1`}>
                              {estadoSesionIcons[s.estado]}
                              {s.estado}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-slate-600">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDateTime(s.fecha, s.hora)}
                            </span>
                            {s.lugar && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {s.lugar}
                              </span>
                            )}
                            {s.quorum > 0 && (
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                Quórum: {s.quorum}%
                              </span>
                            )}
                          </div>
                          {s.ordenDia && (
                            <div className="mt-2 text-xs text-slate-500">
                              <span className="font-medium">Orden del día: </span>
                              {s.ordenDia.substring(0, 100)}...
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openSesionDialog(s)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-red-600 hover:text-red-700" 
                          onClick={() => openDeleteDialog('sesion', s.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Miembro Dialog */}
      <Dialog open={miembroDialogOpen} onOpenChange={setMiembroDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingMiembro ? 'Editar' : 'Nuevo'} Miembro del Comité</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre Completo *</Label>
                <Input 
                  value={miembroForm.nombre} 
                  onChange={(e) => setMiembroForm({...miembroForm, nombre: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Cargo *</Label>
                <Select value={miembroForm.cargo} onValueChange={(v) => setMiembroForm({...miembroForm, cargo: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CARGOS.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unidad</Label>
                <Input 
                  placeholder="Ej: A-101" 
                  value={miembroForm.unidad} 
                  onChange={(e) => setMiembroForm({...miembroForm, unidad: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>RUT</Label>
                <Input 
                  placeholder="12.345.678-9" 
                  value={miembroForm.rut} 
                  onChange={(e) => setMiembroForm({...miembroForm, rut: e.target.value})} 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input 
                  value={miembroForm.telefono} 
                  onChange={(e) => setMiembroForm({...miembroForm, telefono: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input 
                  type="email" 
                  value={miembroForm.email} 
                  onChange={(e) => setMiembroForm({...miembroForm, email: e.target.value})} 
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Fecha Inicio</Label>
                <Input 
                  type="date" 
                  value={miembroForm.fechaInicio} 
                  onChange={(e) => setMiembroForm({...miembroForm, fechaInicio: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha Fin</Label>
                <Input 
                  type="date" 
                  value={miembroForm.fechaFin} 
                  onChange={(e) => setMiembroForm({...miembroForm, fechaFin: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={miembroForm.estado} onValueChange={(v) => setMiembroForm({...miembroForm, estado: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Activo">Activo</SelectItem>
                    <SelectItem value="Inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Foto del miembro */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  {miembroForm.foto ? (
                    <img src={miembroForm.foto} alt="Foto" className="h-20 w-20 rounded-full object-cover" />
                  ) : (
                    <AvatarFallback className="bg-[#0f2040] text-white text-2xl font-bold">
                      {miembroForm.nombre ? miembroForm.nombre.charAt(0).toUpperCase() : '?'}
                    </AvatarFallback>
                  )}
                </Avatar>
                {miembroForm.foto && (
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  ref={photoInputRef}
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => photoInputRef.current?.click()}
                  className="w-full"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {miembroForm.foto ? 'Cambiar foto' : 'Subir foto'}
                </Button>
                <p className="text-xs text-slate-500 mt-1">JPG, PNG. Máximo 2MB</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea 
                value={miembroForm.notas} 
                onChange={(e) => setMiembroForm({...miembroForm, notas: e.target.value})} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMiembroDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveMiembro}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sesion Dialog */}
      <Dialog open={sesionDialogOpen} onOpenChange={setSesionDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSesion ? 'Editar' : 'Nueva'} Sesión de Comité</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Título *</Label>
                <Input 
                  value={sesionForm.titulo} 
                  onChange={(e) => setSesionForm({...sesionForm, titulo: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={sesionForm.tipo} onValueChange={(v) => setSesionForm({...sesionForm, tipo: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ordinaria">Ordinaria</SelectItem>
                    <SelectItem value="Extraordinaria">Extraordinaria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Fecha *</Label>
                <Input 
                  type="date" 
                  value={sesionForm.fecha} 
                  onChange={(e) => setSesionForm({...sesionForm, fecha: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input 
                  type="time" 
                  value={sesionForm.hora} 
                  onChange={(e) => setSesionForm({...sesionForm, hora: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={sesionForm.estado} onValueChange={(v) => setSesionForm({...sesionForm, estado: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Programada">Programada</SelectItem>
                    <SelectItem value="Realizada">Realizada</SelectItem>
                    <SelectItem value="Cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lugar</Label>
                <Input 
                  placeholder="Ej: Sala de Reuniones" 
                  value={sesionForm.lugar} 
                  onChange={(e) => setSesionForm({...sesionForm, lugar: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <Label>Quórum (%)</Label>
                <Input 
                  type="number" 
                  min="0" 
                  max="100" 
                  value={sesionForm.quorum} 
                  onChange={(e) => setSesionForm({...sesionForm, quorum: parseInt(e.target.value) || 0})} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Orden del Día</Label>
              <Textarea 
                placeholder="Puntos a tratar en la sesión..."
                value={sesionForm.ordenDia} 
                onChange={(e) => setSesionForm({...sesionForm, ordenDia: e.target.value})} 
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Acuerdos</Label>
              <Textarea 
                placeholder="Acuerdos tomados en la sesión..."
                value={sesionForm.acuerdos} 
                onChange={(e) => setSesionForm({...sesionForm, acuerdos: e.target.value})} 
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Asistentes</Label>
              <Textarea 
                placeholder="Lista de asistentes..."
                value={sesionForm.asistentes} 
                onChange={(e) => setSesionForm({...sesionForm, asistentes: e.target.value})} 
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Acta</Label>
              <Textarea 
                placeholder="Texto del acta de la sesión..."
                value={sesionForm.acta} 
                onChange={(e) => setSesionForm({...sesionForm, acta: e.target.value})} 
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea 
                value={sesionForm.notas} 
                onChange={(e) => setSesionForm({...sesionForm, notas: e.target.value})} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSesionDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveSesion}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Confirmar Eliminación
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de que desea eliminar este {deleteType === 'miembro' ? 'miembro' : 'sesión'}? 
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
