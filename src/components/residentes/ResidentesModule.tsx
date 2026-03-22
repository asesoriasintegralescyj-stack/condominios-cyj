'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import { Plus, Pencil, Trash2, Search, Home, Upload, Download, AlertCircle, FileSpreadsheet } from 'lucide-react'
import { useSession } from '@/hooks/use-session'

interface Residente {
  id: string
  nombre: string
  apellido?: string | null
  rut: string | null
  unidad: string | null
  etapa: string | null
  tipo: string
  telefono: string | null
  email: string | null
  fechaIngreso: string | null
  estado: string
  vehiculos?: string | null
  notas: string | null
}

const tipoColors: Record<string, string> = {
  'Residente': 'bg-blue-100 text-blue-700',
  'Propietario': 'bg-green-100 text-green-700',
  'Arrendatario': 'bg-purple-100 text-purple-700',
  'Visita': 'bg-slate-100 text-slate-700',
}

const estadoColors: Record<string, string> = {
  'Activo': 'bg-green-100 text-green-700',
  'Moroso': 'bg-red-100 text-red-700',
  'Vacaciones': 'bg-cyan-100 text-cyan-700',
  'Licencia': 'bg-purple-100 text-purple-700',
  'Inactivo': 'bg-slate-100 text-slate-700',
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

// Extraer letra de unidad (ej: "A-101" -> "A", "B-201" -> "B")
const extractLetraUnidad = (unidad: string | null): string => {
  if (!unidad) return ''
  const match = unidad.match(/^([A-Za-z])/)
  return match ? match[1].toUpperCase() : ''
}

export function ResidentesModule() {
  const [residentes, setResidentes] = useState<Residente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterLetra, setFilterLetra] = useState('todas')
  const [filterEtapa, setFilterEtapa] = useState('todas')
  const [filterTipo, setFilterTipo] = useState('todos')
  const [filterEstado, setFilterEstado] = useState('todos')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importStatus, setImportStatus] = useState<{ loading: boolean; message: string }>({ loading: false, message: '' })
  const [editingRes, setEditingRes] = useState<Residente | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // CSV Bulk upload
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [bulkData, setBulkData] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{success: number, errors: string[]} | null>(null)
  
  const { hasPermission } = useSession()
  const canEdit = hasPermission('residentes.editar')
  
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    rut: '',
    unidad: '',
    etapa: '',
    tipo: 'Residente',
    telefono: '',
    email: '',
    fechaIngreso: new Date().toISOString().split('T')[0],
    estado: 'Activo',
    vehiculos: '',
    notas: '',
  })

  const fetchResidentes = async (searchTerm = '') => {
    setLoading(true)
    try {
      const url = searchTerm ? `/api/residentes?search=${encodeURIComponent(searchTerm)}` : '/api/residentes'
      const res = await fetch(url)
      const data = await res.json()
      setResidentes(data)
    } catch (error) {
      console.error('Error fetching residentes:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    void (async () => {
      await fetchResidentes()
    })()
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => fetchResidentes(search), 300)
    return () => clearTimeout(timeout)
  }, [search])

  // Obtener etapas únicas
  const etapasUnicas = useMemo(() => {
    const etapas = new Set<string>()
    residentes.forEach(r => {
      if (r.etapa) etapas.add(r.etapa)
    })
    return Array.from(etapas).sort()
  }, [residentes])

  // Obtener letras únicas de unidades
  const letrasUnicas = useMemo(() => {
    const letras = new Set<string>()
    residentes.forEach(r => {
      const letra = extractLetraUnidad(r.unidad)
      if (letra) letras.add(letra)
    })
    return Array.from(letras).sort()
  }, [residentes])

  // Filtrar residentes
  const residentesFiltrados = useMemo(() => {
    return residentes.filter(r => {
      const matchLetra = filterLetra === 'todas' || extractLetraUnidad(r.unidad) === filterLetra
      const matchEtapa = filterEtapa === 'todas' || r.etapa === filterEtapa
      const matchTipo = filterTipo === 'todos' || r.tipo === filterTipo
      const matchEstado = filterEstado === 'todos' || r.estado === filterEstado
      return matchLetra && matchEtapa && matchTipo && matchEstado
    })
  }, [residentes, filterLetra, filterEtapa, filterTipo, filterEstado])

  // Estadísticas por etapa
  const statsPorEtapa = useMemo(() => {
    const stats: Record<string, number> = {}
    residentes.forEach(r => {
      const etapa = r.etapa || 'Sin Etapa'
      stats[etapa] = (stats[etapa] || 0) + 1
    })
    return stats
  }, [residentes])

  // Estadísticas por letra
  const statsPorLetra = useMemo(() => {
    const stats: Record<string, number> = {}
    residentes.forEach(r => {
      const letra = extractLetraUnidad(r.unidad) || 'Sin Letra'
      stats[letra] = (stats[letra] || 0) + 1
    })
    return stats
  }, [residentes])

  const openDialog = (res?: Residente) => {
    if (res) {
      setEditingRes(res)
      setFormData({
        nombre: res.nombre,
        apellido: res.apellido || '',
        rut: res.rut || '',
        unidad: res.unidad || '',
        etapa: res.etapa || '',
        tipo: res.tipo,
        telefono: res.telefono || '',
        email: res.email || '',
        fechaIngreso: res.fechaIngreso || new Date().toISOString().split('T')[0],
        estado: res.estado,
        vehiculos: res.vehiculos || '',
        notas: res.notas || '',
      })
    } else {
      setEditingRes(null)
      setFormData({
        nombre: '',
        apellido: '',
        rut: '',
        unidad: '',
        etapa: '',
        tipo: 'Residente',
        telefono: '',
        email: '',
        fechaIngreso: new Date().toISOString().split('T')[0],
        estado: 'Activo',
        vehiculos: '',
        notas: '',
      })
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.nombre.trim()) return

    try {
      if (editingRes) {
        await fetch(`/api/residentes/${editingRes.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      } else {
        await fetch('/api/residentes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      }
      setDialogOpen(false)
      fetchResidentes(search)
    } catch (error) {
      console.error('Error saving residente:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este residente?')) return
    try {
      await fetch(`/api/residentes/${id}`, { method: 'DELETE' })
      fetchResidentes(search)
    } catch (error) {
      console.error('Error deleting residente:', error)
    }
  }

  // Importar desde Excel
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImportStatus({ loading: true, message: 'Procesando archivo...' })

    try {
      // Leer archivo Excel usando SheetJS (dinámico)
      const XLSX = await import('xlsx')
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      // Enviar al API
      const response = await fetch('/api/import/residentes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ residentes: jsonData }),
      })

      const result = await response.json()

      if (result.success) {
        setImportStatus({ 
          loading: false, 
          message: result.mensaje 
        })
        fetchResidentes()
      } else {
        setImportStatus({ 
          loading: false, 
          message: `Error: ${result.error}` 
        })
      }
    } catch (error) {
      console.error('Error importing:', error)
      setImportStatus({ 
        loading: false, 
        message: 'Error al procesar el archivo' 
      })
    }

    // Limpiar input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // CSV Bulk upload
  const handleBulkUpload = async () => {
    if (!bulkData.trim()) return
    setUploading(true)
    setUploadResult(null)
    
    try {
      const res = await fetch('/api/residentes/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: bulkData }),
      })
      const result = await res.json()
      setUploadResult(result)
      if (result.success > 0) {
        fetchResidentes()
      }
    } catch (error) {
      console.error('Error uploading residentes:', error)
      setUploadResult({ success: 0, errors: ['Error de conexión'] })
    }
    setUploading(false)
  }

  // Export function
  const exportResidentes = () => {
    const header = 'nombre,apellido,rut,unidad,etapa,tipo,telefono,email,estado\n'
    const rows = residentes.map(r => 
      `"${r.nombre}","${r.apellido || ''}","${r.rut || ''}","${r.unidad || ''}","${r.etapa || ''}","${r.tipo}","${r.telefono || ''}","${r.email || ''}","${r.estado}"`
    ).join('\n')
    
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'residentes.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      {/* Stats por Etapa */}
      {etapasUnicas.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-600">Por Etapa</h3>
          <div className="flex gap-2 flex-wrap">
            {etapasUnicas.map(etapa => (
              <Card 
                key={etapa} 
                className={`px-3 py-2 cursor-pointer transition-all ${
                  filterEtapa === etapa ? 'ring-2 ring-amber-500 bg-amber-50' : 'hover:bg-slate-50'
                }`}
                onClick={() => setFilterEtapa(filterEtapa === etapa ? 'todas' : etapa)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-emerald-500 text-white text-xs font-bold flex items-center justify-center">
                    {etapa.charAt(0)}
                  </div>
                  <span className="text-sm font-medium">{etapa}</span>
                  <Badge variant="secondary" className="text-xs">{statsPorEtapa[etapa] || 0}</Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Stats por Letra de Unidad */}
      {letrasUnicas.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-600">Por Letra de Unidad</h3>
          <div className="flex gap-2 flex-wrap">
            {letrasUnicas.map(letra => (
              <Card 
                key={letra} 
                className={`px-3 py-2 cursor-pointer transition-all ${
                  filterLetra === letra ? 'ring-2 ring-amber-500 bg-amber-50' : 'hover:bg-slate-50'
                }`}
                onClick={() => setFilterLetra(filterLetra === letra ? 'todas' : letra)}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[#0f2040] text-white text-xs font-bold flex items-center justify-center">
                    {letra}
                  </div>
                  <span className="text-sm font-semibold">{statsPorLetra[letra] || 0}</span>
                </div>
              </Card>
            ))}
            {statsPorLetra['Sin Letra'] > 0 && (
              <Card 
                className={`px-3 py-2 cursor-pointer transition-all ${
                  filterLetra === 'Sin Letra' ? 'ring-2 ring-amber-500 bg-amber-50' : 'hover:bg-slate-50'
                }`}
                onClick={() => setFilterLetra(filterLetra === 'Sin Letra' ? 'todas' : 'Sin Letra')}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-slate-300 text-slate-600 text-xs font-bold flex items-center justify-center">
                    ?
                  </div>
                  <span className="text-sm font-semibold">{statsPorLetra['Sin Letra']}</span>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            {['Residente', 'Propietario', 'Arrendatario', 'Visita'].map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {['Activo', 'Moroso', 'Vacaciones', 'Licencia', 'Inactivo'].map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportResidentes}>
          <Download className="w-4 h-4 mr-1" /> Exportar
        </Button>
        <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
          <Upload className="w-4 h-4 mr-1" /> Importar Excel
        </Button>
        <Button variant="outline" onClick={() => { setBulkData(''); setUploadResult(null); setBulkDialogOpen(true) }}>
          <FileSpreadsheet className="w-4 h-4 mr-1" /> Carga Masiva CSV
        </Button>
        <Button onClick={() => openDialog()}>
          <Plus className="w-4 h-4 mr-1" /> Nuevo
        </Button>
      </div>

      {/* Conteo de filtros activos */}
      {(filterLetra !== 'todas' || filterEtapa !== 'todas' || filterTipo !== 'todos' || filterEstado !== 'todos') && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Mostrando {residentesFiltrados.length} de {residentes.length} residentes</span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs"
            onClick={() => {
              setFilterLetra('todas')
              setFilterEtapa('todas')
              setFilterTipo('todos')
              setFilterEstado('todos')
            }}
          >
            Limpiar filtros
          </Button>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Residentes ({residentesFiltrados.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="border-b">
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Nombre</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">RUT</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Unidad</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Etapa</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Tipo</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Estado</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Teléfono</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Email</th>
                  <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="p-8 text-center text-slate-400">Cargando...</td></tr>
                ) : residentesFiltrados.length === 0 ? (
                  <tr><td colSpan={9} className="p-8 text-center text-slate-400">Sin residentes</td></tr>
                ) : (
                  residentesFiltrados.map((res) => {
                    const letraUnidad = extractLetraUnidad(res.unidad)
                    
                    return (
                      <tr key={res.id} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="bg-[#0f2040] text-white text-xs font-bold">
                                {res.nombre.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-semibold">{res.nombre}</span>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-xs">{res.rut || '–'}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {letraUnidad && (
                              <div className="w-5 h-5 rounded bg-[#0f2040] text-white text-[10px] font-bold flex items-center justify-center">
                                {letraUnidad}
                              </div>
                            )}
                            <span className="font-semibold">{res.unidad || '–'}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          {res.etapa ? (
                            <Badge className="bg-emerald-100 text-emerald-700">{res.etapa}</Badge>
                          ) : '–'}
                        </td>
                        <td className="p-3">
                          <Badge className={tipoColors[res.tipo] || 'bg-slate-100'}>{res.tipo}</Badge>
                        </td>
                        <td className="p-3">
                          <Badge className={estadoColors[res.estado] || 'bg-slate-100'}>{res.estado}</Badge>
                        </td>
                        <td className="p-3 text-xs">{res.telefono || '–'}</td>
                        <td className="p-3 text-xs">{res.email || '–'}</td>
                        <td className="p-3">
                          <div className="flex justify-center gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openDialog(res)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:text-red-700" onClick={() => handleDelete(res.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
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

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingRes ? 'Editar' : 'Nuevo'} Residente</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Apellido</Label>
                <Input value={formData.apellido} onChange={(e) => setFormData({...formData, apellido: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>RUT</Label>
                <Input placeholder="12.345.678-9" value={formData.rut} onChange={(e) => setFormData({...formData, rut: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Unidad</Label>
                <Input value={formData.unidad} onChange={(e) => setFormData({...formData, unidad: e.target.value})} placeholder="Ej: A-101" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Etapa</Label>
                <Select value={formData.etapa || ''} onValueChange={(v) => setFormData({...formData, etapa: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    {etapasUnicas.map(e => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                    <SelectItem value="">Sin etapa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={formData.tipo} onValueChange={(v) => setFormData({...formData, tipo: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Residente', 'Propietario', 'Arrendatario', 'Visita'].map(t => (
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
                    {['Activo', 'Moroso', 'Vacaciones', 'Licencia', 'Inactivo'].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha Ingreso</Label>
                <Input type="date" value={formData.fechaIngreso} onChange={(e) => setFormData({...formData, fechaIngreso: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Vehículos</Label>
              <Input value={formData.vehiculos} onChange={(e) => setFormData({...formData, vehiculos: e.target.value})} placeholder="Patentes o descripción" />
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

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Importar Residentes desde Excel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-slate-50 p-4 rounded-lg text-sm">
              <p className="font-semibold mb-2">Formato esperado del archivo Excel:</p>
              <ul className="text-xs text-slate-600 space-y-1">
                <li>• <strong>Nombre:</strong> Nombre del residente</li>
                <li>• <strong>Apellidos:</strong> Apellidos</li>
                <li>• <strong>RUT:</strong> RUT del residente</li>
                <li>• <strong>Casa_Depto:</strong> Número de unidad</li>
                <li>• <strong>Etapa:</strong> Etapa del condominio</li>
                <li>• <strong>Telefono:</strong> Teléfono de contacto</li>
                <li>• <strong>Tipo_Residente:</strong> Propietario, Arrendatario, etc.</li>
              </ul>
            </div>
            
            <input
              type="file"
              accept=".xlsx,.xls"
              ref={fileInputRef}
              onChange={handleImport}
              className="hidden"
            />
            
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={importStatus.loading}
              className="w-full"
            >
              {importStatus.loading ? (
                <>Procesando...</>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Seleccionar archivo Excel
                </>
              )}
            </Button>
            
            {importStatus.message && (
              <div className={`p-3 rounded-lg text-sm ${
                importStatus.message.includes('Error') 
                  ? 'bg-red-50 text-red-700' 
                  : 'bg-green-50 text-green-700'
              }`}>
                {importStatus.message}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setImportDialogOpen(false)
              setImportStatus({ loading: false, message: '' })
            }}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk CSV Upload Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Carga Masiva de Residentes (CSV)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-slate-50 p-3 rounded-lg text-sm">
              <p className="font-semibold mb-2">Formato CSV (una línea por residente):</p>
              <code className="text-xs bg-white p-2 rounded block">
                nombre,apellido,rut,unidad,etapa,tipo,telefono,email,estado
              </code>
              <p className="text-xs text-slate-500 mt-2">
                Ejemplo: Juan,Pérez,12.345.678-9,A-101,BANDURRIAS,Propietario,+56912345678,juan@email.com,Activo
              </p>
            </div>
            <div className="space-y-2">
              <Label>Datos CSV</Label>
              <Textarea 
                value={bulkData} 
                onChange={(e) => setBulkData(e.target.value)}
                placeholder="nombre,apellido,rut,unidad,etapa,tipo,telefono,email,estado&#10;Juan,Pérez,12.345.678-9,A-101,BANDURRIAS,Propietario,+56912345678,juan@email.com,Activo"
                rows={10}
                className="font-mono text-sm"
              />
            </div>
            {uploadResult && (
              <div className={`p-3 rounded ${uploadResult.success > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                <p className="font-semibold">{uploadResult.success} residentes importados correctamente</p>
                {uploadResult.errors.length > 0 && (
                  <ul className="text-sm mt-1">
                    {uploadResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>Cerrar</Button>
            <Button onClick={handleBulkUpload} disabled={uploading || !bulkData.trim()}>
              {uploading ? 'Importando...' : 'Importar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
