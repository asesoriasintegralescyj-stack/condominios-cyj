'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Plus, Pencil, Trash2, Search, Download, Package, Wrench, 
  CheckSquare, Users, FileText, Upload, Eye, X, Paperclip
} from 'lucide-react'

// Interfaces
interface ProyectoMaterial {
  id: string
  descripcion: string
  cantidad: number
  unidad: string
  precioUnit: number
  total: number
}

interface ProyectoHerramienta {
  id: string
  nombre: string
  cantidad: number
}

interface ProyectoTarea {
  id: string
  descripcion: string
  cantidad: number
  estado: string
}

interface ProyectoPersonal {
  id: string
  nombre: string
  tipo: string
  cantidad: number
  precioUnit: number
  total: number
}

interface ProyectoDocumento {
  id: string
  nombre: string
  tipo: string
  descripcion: string | null
  archivo: string
  fechaDoc: string | null
  createdAt: string
}

interface Proyecto {
  id: string
  nombre: string
  categoria: string
  estado: string
  ubicacion: string | null
  fechaInicio: string | null
  fechaFin: string | null
  presProg: number
  presUsado: number
  avance: number
  descripcion: string | null
  notas: string | null
  materiales: ProyectoMaterial[]
  herramientas: ProyectoHerramienta[]
  tareas: ProyectoTarea[]
  personal: ProyectoPersonal[]
  documentos: ProyectoDocumento[]
}

const formatCLP = (n: number) =>
  '$' + new Intl.NumberFormat('es-CL').format(Math.round(n || 0))

const formatDate = (d: string | null) => {
  if (!d) return '–'
  try {
    const [y, m, dd] = d.split('-')
    return `${dd}/${m}/${y}`
  } catch {
    return d
  }
}

// Parsear campos desde la descripcion y notas del proyecto (formato del PDF original)
function parseCampo(descripcion: string | null, notas: string | null, campo: string): string {
  const buscar = [descripcion, notas].filter(Boolean).join(' | ')
  const m = buscar.match(new RegExp(`${campo}:\\s*([^|]+)`, 'i'))
  return m ? m[1].trim() : '–'
}

function extraerNumProyecto(nombre: string): string {
  const m = nombre.match(/#(\d+)/)
  return m ? m[1] : '–'
}

function extraerDescripcion(nombre: string): string {
  // Quitar el "#NN - " del inicio
  return nombre.replace(/^#\d+\s*-\s*/, '')
}

// Colores por estado
const estadoBadgeColors: Record<string, string> = {
  'Planificado': 'bg-blue-100 text-blue-700 border-blue-200',
  'En Ejecución': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Completado': 'bg-green-100 text-green-700 border-green-200',
  'Cancelado': 'bg-red-100 text-red-700 border-red-200',
  'Pausado': 'bg-slate-100 text-slate-700 border-slate-200',
}

const aprobacionColors: Record<string, string> = {
  'Aprobado': 'text-green-600 font-medium',
  'En espera': 'text-orange-500 font-medium',
  'Aprobado por Supervisor': 'text-blue-600 font-medium',
}

const prioridadColors: Record<string, string> = {
  'Alta': 'bg-red-100 text-red-700',
  'Media': 'bg-yellow-100 text-yellow-700',
  'Baja': 'bg-green-100 text-green-700',
}

const exportToCSV = (data: Proyecto[]) => {
  const headers = ['Nombre', 'Categoría', 'Estado', 'Ubicación', 'Fecha Inicio', 'Fecha Fin', 'Pres. Programado', 'Pres. Usado', 'Avance %', 'Descripción', 'Notas']
  const rows = data.map(p => [
    p.nombre,
    p.categoria,
    p.estado,
    p.ubicacion || '',
    p.fechaInicio || '',
    p.fechaFin || '',
    p.presProg,
    p.presUsado,
    p.avance,
    p.descripcion || '',
    p.notas || ''
  ])
  
  const csvContent = '\uFEFF' + [headers, ...rows].map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `proyectos_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
}

const categoriaColors: Record<string, string> = {
  'Áreas Verdes': 'bg-green-100 text-green-700',
  'Eléctrico': 'bg-yellow-100 text-yellow-700',
  'Sanitario': 'bg-blue-100 text-blue-700',
  'Infraestructura': 'bg-slate-100 text-slate-700',
  'Seguridad': 'bg-purple-100 text-purple-700',
  'Administración': 'bg-cyan-100 text-cyan-700',
}

const estadoColors: Record<string, string> = {
  'Planificado': 'bg-blue-100 text-blue-700',
  'En Ejecución': 'bg-yellow-100 text-yellow-700',
  'Completado': 'bg-green-100 text-green-700',
  'Cancelado': 'bg-red-100 text-red-700',
  'Pausado': 'bg-slate-100 text-slate-700',
}

const tareaEstadoColors: Record<string, string> = {
  'Pendiente': 'bg-yellow-100 text-yellow-700',
  'En Progreso': 'bg-blue-100 text-blue-700',
  'Completado': 'bg-green-100 text-green-700',
}

const documentoTipoColors: Record<string, string> = {
  'cotizacion': 'bg-blue-100 text-blue-700',
  'respaldo': 'bg-green-100 text-green-700',
  'contrato': 'bg-purple-100 text-purple-700',
  'factura': 'bg-orange-100 text-orange-700',
  'otro': 'bg-slate-100 text-slate-700',
}

export function ProyectosModule() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [editingProy, setEditingProy] = useState<Proyecto | null>(null)
  const [selectedProy, setSelectedProy] = useState<Proyecto | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    categoria: 'General',
    estado: 'Planificado',
    ubicacion: '',
    fechaInicio: '',
    fechaFin: '',
    presProg: 0,
    presUsado: 0,
    avance: 0,
    descripcion: '',
    notas: '',
  })
  
  // Resources state
  const [materiales, setMateriales] = useState<ProyectoMaterial[]>([])
  const [herramientas, setHerramientas] = useState<ProyectoHerramienta[]>([])
  const [tareas, setTareas] = useState<ProyectoTarea[]>([])
  const [personal, setPersonal] = useState<ProyectoPersonal[]>([])
  const [documentos, setDocumentos] = useState<ProyectoDocumento[]>([])

  const fetchProyectos = async (searchTerm = '') => {
    setLoading(true)
    try {
      const url = searchTerm ? `/api/proyectos?search=${encodeURIComponent(searchTerm)}` : '/api/proyectos'
      const res = await fetch(url)
      const data = await res.json()
      // Ensure data is always an array
      setProyectos(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching proyectos:', error)
      setProyectos([])
    }
    setLoading(false)
  }

  useEffect(() => {
    void (async () => {
      await fetchProyectos()
    })()
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => fetchProyectos(search), 300)
    return () => clearTimeout(timeout)
  }, [search])

  const openDialog = (proy?: Proyecto) => {
    if (proy) {
      setEditingProy(proy)
      setFormData({
        nombre: proy.nombre,
        categoria: proy.categoria,
        estado: proy.estado,
        ubicacion: proy.ubicacion || '',
        fechaInicio: proy.fechaInicio || '',
        fechaFin: proy.fechaFin || '',
        presProg: proy.presProg,
        presUsado: proy.presUsado,
        avance: proy.avance,
        descripcion: proy.descripcion || '',
        notas: proy.notas || '',
      })
      setMateriales(proy.materiales || [])
      setHerramientas(proy.herramientas || [])
      setTareas(proy.tareas || [])
      setPersonal(proy.personal || [])
      setDocumentos(proy.documentos || [])
    } else {
      setEditingProy(null)
      setFormData({
        nombre: '',
        categoria: 'General',
        estado: 'Planificado',
        ubicacion: '',
        fechaInicio: '',
        fechaFin: '',
        presProg: 0,
        presUsado: 0,
        avance: 0,
        descripcion: '',
        notas: '',
      })
      setMateriales([])
      setHerramientas([])
      setTareas([])
      setPersonal([])
      setDocumentos([])
    }
    setDialogOpen(true)
  }

  const openDetailDialog = (proy: Proyecto) => {
    setSelectedProy(proy)
    setDetailDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.nombre.trim()) return

    // Calcular presupuesto usado basado en materiales y personal
    const costoMateriales = materiales.reduce((sum, m) => sum + (m.total || m.cantidad * m.precioUnit), 0)
    const costoPersonal = personal.reduce((sum, p) => sum + (p.total || p.precioUnit * p.cantidad), 0)
    const presUsadoCalculado = costoMateriales + costoPersonal

    const dataToSend = {
      ...formData,
      presUsado: presUsadoCalculado,
      materiales,
      herramientas,
      tareas,
      personal,
      documentos,
    }

    try {
      if (editingProy) {
        await fetch(`/api/proyectos/${editingProy.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend),
        })
      } else {
        await fetch('/api/proyectos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSend),
        })
      }
      setDialogOpen(false)
      fetchProyectos(search)
    } catch (error) {
      console.error('Error saving proyecto:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este proyecto y todos sus recursos asociados?')) return
    try {
      await fetch(`/api/proyectos/${id}`, { method: 'DELETE' })
      fetchProyectos(search)
    } catch (error) {
      console.error('Error deleting proyecto:', error)
    }
  }

  // Material handlers
  const addMaterial = () => {
    setMateriales([...materiales, {
      id: `temp-${Date.now()}`,
      descripcion: '',
      cantidad: 1,
      unidad: 'unidad',
      precioUnit: 0,
      total: 0
    }])
  }

  const updateMaterial = (index: number, field: string, value: string | number) => {
    const updated = [...materiales]
    updated[index] = { ...updated[index], [field]: value }
    if (field === 'cantidad' || field === 'precioUnit') {
      updated[index].total = updated[index].cantidad * updated[index].precioUnit
    }
    setMateriales(updated)
  }

  const removeMaterial = (index: number) => {
    setMateriales(materiales.filter((_, i) => i !== index))
  }

  // Herramienta handlers
  const addHerramienta = () => {
    setHerramientas([...herramientas, {
      id: `temp-${Date.now()}`,
      nombre: '',
      cantidad: 1
    }])
  }

  const updateHerramienta = (index: number, field: string, value: string | number) => {
    const updated = [...herramientas]
    updated[index] = { ...updated[index], [field]: value }
    setHerramientas(updated)
  }

  const removeHerramienta = (index: number) => {
    setHerramientas(herramientas.filter((_, i) => i !== index))
  }

  // Tarea handlers
  const addTarea = () => {
    setTareas([...tareas, {
      id: `temp-${Date.now()}`,
      descripcion: '',
      cantidad: 1,
      estado: 'Pendiente'
    }])
  }

  const updateTarea = (index: number, field: string, value: string | number) => {
    const updated = [...tareas]
    updated[index] = { ...updated[index], [field]: value }
    setTareas(updated)
  }

  const removeTarea = (index: number) => {
    setTareas(tareas.filter((_, i) => i !== index))
  }

  // Personal handlers
  const addPersonal = () => {
    setPersonal([...personal, {
      id: `temp-${Date.now()}`,
      nombre: '',
      tipo: 'Interno',
      cantidad: 1,
      precioUnit: 0,
      total: 0
    }])
  }

  const updatePersonal = (index: number, field: string, value: string | number) => {
    const updated = [...personal]
    updated[index] = { ...updated[index], [field]: value }
    updated[index].total = updated[index].precioUnit * updated[index].cantidad
    setPersonal(updated)
  }

  const removePersonal = (index: number) => {
    setPersonal(personal.filter((_, i) => i !== index))
  }

  // Documento handlers
  const addDocumento = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = () => {
          const base64 = reader.result as string
          setDocumentos([...documentos, {
            id: `temp-${Date.now()}`,
            nombre: file.name,
            tipo: 'cotizacion',
            descripcion: '',
            archivo: base64,
            fechaDoc: new Date().toISOString().split('T')[0],
            createdAt: new Date().toISOString()
          }])
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }

  const updateDocumento = (index: number, field: string, value: string) => {
    const updated = [...documentos]
    updated[index] = { ...updated[index], [field]: value }
    setDocumentos(updated)
  }

  const removeDocumento = (index: number) => {
    setDocumentos(documentos.filter((_, i) => i !== index))
  }

  const viewDocumento = (doc: ProyectoDocumento) => {
    const newWindow = window.open()
    if (newWindow) {
      if (doc.archivo.startsWith('data:application/pdf') || doc.archivo.startsWith('data:image')) {
        newWindow.document.write(`<iframe src="${doc.archivo}" style="width:100%;height:100%;border:none;"></iframe>`)
      } else {
        newWindow.document.write(`<iframe src="${doc.archivo}" style="width:100%;height:100%;border:none;"></iframe>`)
      }
    }
  }

  // Calcular totales
  const totalMateriales = materiales.reduce((sum, m) => sum + (m.total || m.cantidad * m.precioUnit), 0)
  const totalPersonal = personal.reduce((sum, p) => sum + (p.total || p.precioUnit * p.cantidad), 0)
  const granTotal = totalMateriales + totalPersonal

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
        <Button variant="outline" onClick={() => exportToCSV(proyectos)}>
          <Download className="w-4 h-4 mr-1" /> Exportar
        </Button>
        <Button onClick={() => openDialog()}>
          <Plus className="w-4 h-4 mr-1" /> Nuevo Proyecto
        </Button>
      </div>

      {/* Table - Formato PDF: # | Descripción | Sector | Tipo | Prior. | Etapa | Estado | Aprobación | Responsable | T.E. | Monto | Inicio | Término | Adj. | Acc. */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Planificación de Mantención — Tabla de Tareas ({proyectos.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs whitespace-nowrap" style={{ minWidth: '1600px' }}>
              <thead>
                <tr className="border-b bg-[#0f2040] text-white">
                  <th className="text-center p-2 text-[10px] font-bold uppercase" style={{ width: '40px' }}>#</th>
                  <th className="text-left p-2 text-[10px] font-bold uppercase" style={{ minWidth: '200px' }}>Descripción</th>
                  <th className="text-left p-2 text-[10px] font-bold uppercase" style={{ minWidth: '100px' }}>Sector</th>
                  <th className="text-left p-2 text-[10px] font-bold uppercase" style={{ minWidth: '100px' }}>Tipo</th>
                  <th className="text-center p-2 text-[10px] font-bold uppercase" style={{ width: '60px' }}>Prior.</th>
                  <th className="text-left p-2 text-[10px] font-bold uppercase" style={{ minWidth: '120px' }}>Etapa</th>
                  <th className="text-center p-2 text-[10px] font-bold uppercase" style={{ minWidth: '90px' }}>Estado</th>
                  <th className="text-left p-2 text-[10px] font-bold uppercase" style={{ minWidth: '120px' }}>Aprobación</th>
                  <th className="text-left p-2 text-[10px] font-bold uppercase" style={{ minWidth: '100px' }}>Responsable</th>
                  <th className="text-center p-2 text-[10px] font-bold uppercase" style={{ width: '60px' }}>T.E.</th>
                  <th className="text-right p-2 text-[10px] font-bold uppercase" style={{ minWidth: '90px' }}>Monto</th>
                  <th className="text-center p-2 text-[10px] font-bold uppercase" style={{ width: '80px' }}>Inicio</th>
                  <th className="text-center p-2 text-[10px] font-bold uppercase" style={{ width: '80px' }}>Término</th>
                  <th className="text-center p-2 text-[10px] font-bold uppercase" style={{ width: '40px' }}>Adj.</th>
                  <th className="text-center p-2 text-[10px] font-bold uppercase" style={{ width: '70px' }}>Acc.</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={15} className="p-8 text-center text-slate-400">Cargando...</td></tr>
                ) : !proyectos || proyectos.length === 0 ? (
                  <tr><td colSpan={15} className="p-8 text-center text-slate-400">Sin proyectos</td></tr>
                ) : (
                  proyectos.map((proy, idx) => {
                    const prioridad = parseCampo(proy.descripcion, proy.notas, 'Prioridad')
                    const etapa = parseCampo(proy.descripcion, proy.notas, 'Etapa')
                    const responsable = parseCampo(proy.descripcion, proy.notas, 'Responsable')
                    const te = parseCampo(proy.descripcion, proy.notas, 'Tiempo estimado')
                    const aprobacion = parseCampo(proy.descripcion, proy.notas, 'Aprobación')
                    const adjuntos = parseCampo(proy.descripcion, proy.notas, 'Adjuntos')
                    return (
                      <tr key={proy.id} className={`border-b last:border-0 hover:bg-blue-50 cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`} onClick={() => openDetailDialog(proy)}>
                        <td className="text-center p-2 font-bold text-[#0f2040]">{extraerNumProyecto(proy.nombre)}</td>
                        <td className="p-2 font-medium max-w-[250px] truncate" title={extraerDescripcion(proy.nombre)}>{extraerDescripcion(proy.nombre)}</td>
                        <td className="p-2 text-slate-600">{proy.ubicacion || '–'}</td>
                        <td className="p-2 text-slate-600">{proy.categoria}</td>
                        <td className="text-center p-2">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${prioridadColors[prioridad] || 'bg-slate-100 text-slate-600'}`}>{prioridad}</span>
                        </td>
                        <td className="p-2 text-slate-600">{etapa}</td>
                        <td className="text-center p-2">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${estadoBadgeColors[proy.estado] || 'bg-slate-100 text-slate-600'}`}>{proy.estado}</span>
                        </td>
                        <td className="p-2">
                          <span className={`text-[10px] ${aprobacionColors[aprobacion] || 'text-slate-500'}`}>{aprobacion}</span>
                        </td>
                        <td className="p-2 text-slate-600">{responsable}</td>
                        <td className="text-center p-2 text-slate-500">{te}</td>
                        <td className="text-right p-2 font-mono font-medium">{proy.presProg > 0 ? formatCLP(proy.presProg) : '–'}</td>
                        <td className="text-center p-2 text-slate-500">{formatDate(proy.fechaInicio)}</td>
                        <td className="text-center p-2 text-slate-500">{formatDate(proy.fechaFin)}</td>
                        <td className="text-center p-2">
                          {adjuntos !== '–' ? (
                            <span className="inline-flex items-center gap-0.5 text-blue-600">
                              <Paperclip className="w-3 h-3" />{adjuntos}
                            </span>
                          ) : '–'}
                        </td>
                        <td className="p-2" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-center gap-0.5">
                            <Button size="icon" variant="ghost" className="h-7 w-7" title="Editar" aria-label="Editar" onClick={() => openDialog(proy)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:text-red-700" title="Eliminar" aria-label="Eliminar" onClick={() => handleDelete(proy.id)}>
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

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{selectedProy?.nombre}</DialogTitle>
          </DialogHeader>
          {selectedProy && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="min-w-0">
                  <Label className="text-xs text-slate-500">Categoría</Label>
                  <Badge className={categoriaColors[selectedProy.categoria] || 'bg-slate-100'}>{selectedProy.categoria}</Badge>
                </div>
                <div className="min-w-0">
                  <Label className="text-xs text-slate-500">Estado</Label>
                  <Badge className={estadoColors[selectedProy.estado] || 'bg-slate-100'}>{selectedProy.estado}</Badge>
                </div>
                <div className="min-w-0">
                  <Label className="text-xs text-slate-500">Presupuesto Programado</Label>
                  <p className="font-bold truncate">{formatCLP(selectedProy.presProg)}</p>
                </div>
                <div className="min-w-0">
                  <Label className="text-xs text-slate-500">Presupuesto Usado</Label>
                  <p className="font-bold text-red-600 truncate">{formatCLP(selectedProy.presUsado)}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-xs text-slate-500">Avance</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={selectedProy.avance} className="h-2 flex-1" />
                  <span className="font-bold">{selectedProy.avance}%</span>
                </div>
              </div>

              {selectedProy.descripcion && (
                <div>
                  <Label className="text-xs text-slate-500">Descripción</Label>
                  <p className="text-sm bg-slate-50 p-3 rounded">{selectedProy.descripcion}</p>
                </div>
              )}

              <Separator />

              {/* Recursos del proyecto */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-slate-50 p-3 rounded min-w-0">
                  <Package className="w-5 h-5 mx-auto mb-1 text-slate-500" />
                  <div className="text-lg font-bold">{selectedProy.materiales?.length || 0}</div>
                  <div className="text-xs text-slate-500">Materiales</div>
                </div>
                <div className="bg-slate-50 p-3 rounded min-w-0">
                  <Wrench className="w-5 h-5 mx-auto mb-1 text-slate-500" />
                  <div className="text-lg font-bold">{selectedProy.herramientas?.length || 0}</div>
                  <div className="text-xs text-slate-500">Herramientas</div>
                </div>
                <div className="bg-slate-50 p-3 rounded min-w-0">
                  <CheckSquare className="w-5 h-5 mx-auto mb-1 text-slate-500" />
                  <div className="text-lg font-bold">{selectedProy.tareas?.length || 0}</div>
                  <div className="text-xs text-slate-500">Tareas</div>
                </div>
                <div className="bg-slate-50 p-3 rounded min-w-0">
                  <FileText className="w-5 h-5 mx-auto mb-1 text-slate-500" />
                  <div className="text-lg font-bold">{selectedProy.documentos?.length || 0}</div>
                  <div className="text-xs text-slate-500">Documentos</div>
                </div>
              </div>

              {/* Documentos adjuntos */}
              {selectedProy.documentos && selectedProy.documentos.length > 0 && (
                <div>
                  <Label className="text-xs text-slate-500 mb-2 block">Documentos Adjuntos</Label>
                  <div className="space-y-2">
                    {selectedProy.documentos.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between bg-slate-50 p-2 rounded gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
                          <div className="min-w-0 flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium truncate">{doc.nombre}</span>
                            <Badge className={`${documentoTipoColors[doc.tipo] || 'bg-slate-100'}`}>
                              {doc.tipo}
                            </Badge>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => viewDocumento(doc)} className="shrink-0">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>Cerrar</Button>
            <Button onClick={() => { setDetailDialogOpen(false); openDialog(selectedProy!); }}>Editar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{editingProy ? 'Editar' : 'Nuevo'} Proyecto</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid grid-cols-6 w-full h-9">
              <TabsTrigger value="general" className="text-xs">General</TabsTrigger>
              <TabsTrigger value="materiales" className="text-xs">Materiales</TabsTrigger>
              <TabsTrigger value="herramientas" className="text-xs">Herramientas</TabsTrigger>
              <TabsTrigger value="tareas" className="text-xs">Tareas</TabsTrigger>
              <TabsTrigger value="personal" className="text-xs">Personal</TabsTrigger>
              <TabsTrigger value="documentos" className="text-xs">Adjuntos</TabsTrigger>
            </TabsList>
            
            <div className="py-4">
              {/* General Tab */}
              <TabsContent value="general" className="space-y-4 mt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 min-w-0">
                    <Label>Nombre</Label>
                    <Input value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} className="w-full" />
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label>Categoría</Label>
                    <Select value={formData.categoria} onValueChange={(v) => setFormData({...formData, categoria: v})}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['Áreas Verdes', 'Eléctrico', 'Sanitario', 'Infraestructura', 'Seguridad', 'Administración', 'Otro'].map(c => (
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
                        {['Planificado', 'En Ejecución', 'Completado', 'Cancelado', 'Pausado'].map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label>Ubicación</Label>
                    <Input value={formData.ubicacion} onChange={(e) => setFormData({...formData, ubicacion: e.target.value})} className="w-full" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 min-w-0">
                    <Label>Presupuesto Programado ($)</Label>
                    <Input type="number" value={formData.presProg} onChange={(e) => setFormData({...formData, presProg: parseFloat(e.target.value) || 0})} className="w-full text-right" />
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label>Presupuesto Usado (calculado) ($)</Label>
                    <Input type="number" value={granTotal} disabled className="w-full bg-slate-100 text-right" />
                    <p className="text-xs text-slate-500">Se calcula automáticamente desde materiales y personal</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Avance: {formData.avance}%</Label>
                  <input type="range" min="0" max="100" value={formData.avance} onChange={(e) => setFormData({...formData, avance: parseInt(e.target.value)})} className="w-full" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 min-w-0">
                    <Label>Fecha Inicio</Label>
                    <Input type="date" value={formData.fechaInicio} onChange={(e) => setFormData({...formData, fechaInicio: e.target.value})} className="w-full" />
                  </div>
                  <div className="space-y-2 min-w-0">
                    <Label>Fecha Fin</Label>
                    <Input type="date" value={formData.fechaFin} onChange={(e) => setFormData({...formData, fechaFin: e.target.value})} className="w-full" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Textarea value={formData.descripcion} onChange={(e) => setFormData({...formData, descripcion: e.target.value})} className="w-full" />
                </div>
                <div className="space-y-2">
                  <Label>Notas</Label>
                  <Textarea value={formData.notas} onChange={(e) => setFormData({...formData, notas: e.target.value})} className="w-full" />
                </div>
              </TabsContent>

              {/* Materiales Tab */}
              <TabsContent value="materiales" className="space-y-4 mt-0">
                <div className="flex justify-between items-center">
                  <Label>Materiales</Label>
                  <Button size="sm" onClick={addMaterial}><Plus className="w-4 h-4 mr-1" /> Agregar</Button>
                </div>
                {materiales.length > 0 ? (
                  <div className="space-y-2">
                    {/* Header */}
                    <div className="grid grid-cols-12 gap-2 px-2 pb-1 border-b">
                      <div className="col-span-4 text-[10px] font-bold text-slate-500 uppercase">Descripción</div>
                      <div className="col-span-2 text-[10px] font-bold text-slate-500 uppercase">Cantidad</div>
                      <div className="col-span-2 text-[10px] font-bold text-slate-500 uppercase">Unidad</div>
                      <div className="col-span-2 text-[10px] font-bold text-slate-500 uppercase text-right">Precio Unit.</div>
                      <div className="col-span-1 text-[10px] font-bold text-slate-500 uppercase text-right">Total</div>
                      <div className="col-span-1"></div>
                    </div>
                    {materiales.map((m, i) => (
                      <div key={m.id} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded">
                        <div className="col-span-4 min-w-0">
                          <Input value={m.descripcion} onChange={(e) => updateMaterial(i, 'descripcion', e.target.value)} className="h-8 w-full" placeholder="Descripción" />
                        </div>
                        <div className="col-span-2 min-w-0">
                          <Input type="number" value={m.cantidad} onChange={(e) => updateMaterial(i, 'cantidad', parseFloat(e.target.value) || 0)} className="h-8 w-full text-right" placeholder="0" />
                        </div>
                        <div className="col-span-2 min-w-0">
                          <Input value={m.unidad} onChange={(e) => updateMaterial(i, 'unidad', e.target.value)} className="h-8 w-full" placeholder="unidad" />
                        </div>
                        <div className="col-span-2 min-w-0">
                          <Input type="number" value={m.precioUnit} onChange={(e) => updateMaterial(i, 'precioUnit', parseFloat(e.target.value) || 0)} className="h-8 w-full text-right" placeholder="$0" />
                        </div>
                        <div className="col-span-1 min-w-0">
                          <div className="h-8 px-1 py-1.5 bg-slate-200 rounded text-xs font-bold text-right truncate">{formatCLP(m.total)}</div>
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => removeMaterial(i)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-end pt-2 border-t">
                      <div className="text-sm font-bold">Total Materiales: <span className="text-red-600">{formatCLP(totalMateriales)}</span></div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Sin materiales agregados</p>
                  </div>
                )}
              </TabsContent>

              {/* Herramientas Tab */}
              <TabsContent value="herramientas" className="space-y-4 mt-0">
                <div className="flex justify-between items-center">
                  <Label>Herramientas</Label>
                  <Button size="sm" onClick={addHerramienta}><Plus className="w-4 h-4 mr-1" /> Agregar</Button>
                </div>
                {herramientas.length > 0 ? (
                  <div className="space-y-2">
                    {herramientas.map((h, i) => (
                      <div key={h.id} className="grid grid-cols-6 gap-3 items-end bg-slate-50 p-2 rounded">
                        <div className="col-span-4 min-w-0">
                          <Label className="text-[10px]">Nombre</Label>
                          <Input value={h.nombre} onChange={(e) => updateHerramienta(i, 'nombre', e.target.value)} className="h-8 w-full" />
                        </div>
                        <div className="col-span-1 min-w-0">
                          <Label className="text-[10px]">Cantidad</Label>
                          <Input type="number" value={h.cantidad} onChange={(e) => updateHerramienta(i, 'cantidad', parseInt(e.target.value) || 1)} className="h-8 w-full text-center" />
                        </div>
                        <div className="col-span-1 min-w-0 flex justify-center items-end pb-0.5">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => removeHerramienta(i)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Wrench className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Sin herramientas agregadas</p>
                  </div>
                )}
              </TabsContent>

              {/* Tareas Tab */}
              <TabsContent value="tareas" className="space-y-4 mt-0">
                <div className="flex justify-between items-center">
                  <Label>Tareas</Label>
                  <Button size="sm" onClick={addTarea}><Plus className="w-4 h-4 mr-1" /> Agregar</Button>
                </div>
                {tareas.length > 0 ? (
                  <div className="space-y-2">
                    {tareas.map((t, i) => (
                      <div key={t.id} className="grid grid-cols-6 gap-3 items-end bg-slate-50 p-2 rounded">
                        <div className="col-span-3 min-w-0">
                          <Label className="text-[10px]">Descripción</Label>
                          <Input value={t.descripcion} onChange={(e) => updateTarea(i, 'descripcion', e.target.value)} className="h-8 w-full" />
                        </div>
                        <div className="col-span-1 min-w-0">
                          <Label className="text-[10px]">Cantidad</Label>
                          <Input type="number" value={t.cantidad} onChange={(e) => updateTarea(i, 'cantidad', parseInt(e.target.value) || 1)} className="h-8 w-full text-center" />
                        </div>
                        <div className="col-span-1 min-w-0">
                          <Label className="text-[10px]">Estado</Label>
                          <Select value={t.estado} onValueChange={(v) => updateTarea(i, 'estado', v)}>
                            <SelectTrigger className="h-8 w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {['Pendiente', 'En Progreso', 'Completado'].map(s => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-1 min-w-0 flex justify-center items-end pb-0.5">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => removeTarea(i)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <CheckSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Sin tareas agregadas</p>
                  </div>
                )}
              </TabsContent>

              {/* Personal Tab */}
              <TabsContent value="personal" className="space-y-4 mt-0">
                <div className="flex justify-between items-center">
                  <Label>Personal</Label>
                  <Button size="sm" onClick={addPersonal}><Plus className="w-4 h-4 mr-1" /> Agregar</Button>
                </div>
                {personal.length > 0 ? (
                  <div className="space-y-2">
                    {/* Header */}
                    <div className="grid grid-cols-12 gap-2 px-2 pb-1 border-b">
                      <div className="col-span-3 text-[10px] font-bold text-slate-500 uppercase">Nombre</div>
                      <div className="col-span-2 text-[10px] font-bold text-slate-500 uppercase">Tipo</div>
                      <div className="col-span-2 text-[10px] font-bold text-slate-500 uppercase text-right">Cantidad</div>
                      <div className="col-span-2 text-[10px] font-bold text-slate-500 uppercase text-right">Precio Unit.</div>
                      <div className="col-span-2 text-[10px] font-bold text-slate-500 uppercase text-right">Total</div>
                      <div className="col-span-1"></div>
                    </div>
                    {personal.map((p, i) => (
                      <div key={p.id} className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded">
                        <div className="col-span-3 min-w-0">
                          <Input value={p.nombre} onChange={(e) => updatePersonal(i, 'nombre', e.target.value)} className="h-8 w-full" placeholder="Nombre" />
                        </div>
                        <div className="col-span-2 min-w-0">
                          <Select value={p.tipo} onValueChange={(v) => updatePersonal(i, 'tipo', v)}>
                            <SelectTrigger className="h-8 w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Interno">Interno</SelectItem>
                              <SelectItem value="Externo">Externo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2 min-w-0">
                          <Input type="number" value={p.cantidad} onChange={(e) => updatePersonal(i, 'cantidad', parseInt(e.target.value) || 1)} className="h-8 w-full text-right" placeholder="1" />
                        </div>
                        <div className="col-span-2 min-w-0">
                          <Input type="number" value={p.precioUnit} onChange={(e) => updatePersonal(i, 'precioUnit', parseFloat(e.target.value) || 0)} className="h-8 w-full text-right" placeholder="$0" />
                        </div>
                        <div className="col-span-2 min-w-0">
                          <div className="h-8 px-2 py-1.5 bg-slate-200 rounded text-xs font-bold text-right truncate">{formatCLP(p.total)}</div>
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => removePersonal(i)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-end pt-2 border-t">
                      <div className="text-sm font-bold">Total Personal: <span className="text-red-600">{formatCLP(totalPersonal)}</span></div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Sin personal agregado</p>
                  </div>
                )}
              </TabsContent>

              {/* Documentos Tab */}
              <TabsContent value="documentos" className="space-y-4 mt-0">
                <div className="flex justify-between items-center">
                  <Label>Documentos Adjuntos (Cotizaciones, Respaldos, etc.)</Label>
                  <Button size="sm" onClick={addDocumento}><Upload className="w-4 h-4 mr-1" /> Subir Archivo</Button>
                </div>
                {documentos.length > 0 ? (
                  <div className="space-y-2">
                    {documentos.map((d, i) => (
                      <div key={d.id} className="bg-slate-50 p-3 rounded">
                        <div className="grid grid-cols-12 gap-3 items-end">
                          <div className="col-span-4 min-w-0">
                            <Label className="text-[10px]">Nombre del archivo</Label>
                            <Input value={d.nombre} onChange={(e) => updateDocumento(i, 'nombre', e.target.value)} className="h-8 w-full" />
                          </div>
                          <div className="col-span-2 min-w-0">
                            <Label className="text-[10px]">Tipo</Label>
                            <Select value={d.tipo} onValueChange={(v) => updateDocumento(i, 'tipo', v)}>
                              <SelectTrigger className="h-8 w-full"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cotizacion">Cotización</SelectItem>
                                <SelectItem value="respaldo">Respaldo</SelectItem>
                                <SelectItem value="contrato">Contrato</SelectItem>
                                <SelectItem value="factura">Factura</SelectItem>
                                <SelectItem value="otro">Otro</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-4 min-w-0">
                            <Label className="text-[10px]">Descripción</Label>
                            <Input value={d.descripcion || ''} onChange={(e) => updateDocumento(i, 'descripcion', e.target.value)} className="h-8 w-full" />
                          </div>
                          <div className="col-span-1 min-w-0 flex justify-center items-end pb-0.5">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => viewDocumento(d)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="col-span-1 min-w-0 flex justify-center items-end pb-0.5">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => removeDocumento(i)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Sin documentos adjuntos</p>
                    <p className="text-xs mt-1">Sube cotizaciones, respaldos, contratos, facturas u otros documentos</p>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>

          {/* Resumen de totales */}
          <div className="bg-slate-50 p-4 rounded-lg border mt-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <span className="text-xs text-slate-500">Total Materiales</span>
                <p className="font-bold text-slate-700">{formatCLP(totalMateriales)}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Total Personal</span>
                <p className="font-bold text-slate-700">{formatCLP(totalPersonal)}</p>
              </div>
              <div>
                <span className="text-xs text-slate-500">Gran Total</span>
                <p className="font-bold text-red-600 text-lg">{formatCLP(granTotal)}</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar Proyecto</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
