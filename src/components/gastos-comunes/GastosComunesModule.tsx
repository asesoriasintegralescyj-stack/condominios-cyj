'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  Plus, 
  Pencil, 
  Trash2, 
  Calendar, 
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

interface GastoComun {
  id: string
  periodo: string
  fechaEmision: string
  fechaVencimiento: string
  estado: string
  totalGastos: number
  totalCobrar: number
  montoPorUnidad: number
  notas?: string
  createdAt: string
  detalles?: DetalleGastoComun[]
  pagos?: PagoGastoComun[]
}

interface DetalleGastoComun {
  id: string
  concepto: string
  categoria: string
  monto: number
  centroCosto?: string
  notas?: string
}

interface PagoGastoComun {
  id: string
  monto: number
  fechaPago: string
  metodo: string
  estado: string
  residente?: { nombre: string; unidad?: string }
}

const formatCLP = (n: number) => 
  '$' + new Intl.NumberFormat('es-CL').format(Math.round(n || 0))

const estadoColors: Record<string, string> = {
  'Pendiente': 'bg-amber-100 text-amber-700',
  'Pagado': 'bg-green-100 text-green-700',
  'Vencido': 'bg-red-100 text-red-700',
  'Parcial': 'bg-blue-100 text-blue-700',
}

export function GastosComunesModule() {
  const [gastos, setGastos] = useState<GastoComun[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detalleDialogOpen, setDetalleDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedGasto, setSelectedGasto] = useState<GastoComun | null>(null)
  const [stats, setStats] = useState({
    totalPeriodos: 0,
    totalCobrado: 0,
    totalPendiente: 0,
    totalVencido: 0
  })

  // Form state
  const [formData, setFormData] = useState({
    periodo: '',
    fechaEmision: '',
    fechaVencimiento: '',
    totalGastos: 0,
    totalCobrar: 0,
    montoPorUnidad: 0,
    notas: ''
  })

  // Detalle form
  const [detalles, setDetalles] = useState<DetalleGastoComun[]>([])
  const [nuevoDetalle, setNuevoDetalle] = useState({
    concepto: '',
    categoria: 'General',
    monto: 0,
    centroCosto: '',
    notas: ''
  })

  const fetchData = async () => {
    try {
      const res = await fetch('/api/gastos-comunes')
      const data = await res.json()
      setGastos(data.gastos || [])
      setStats(data.stats || stats)
    } catch (error) {
      console.error('Error fetching gastos comunes:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSubmit = async () => {
    try {
      const payload = {
        ...formData,
        detalles: detalles
      }

      if (selectedGasto) {
        await fetch(`/api/gastos-comunes/${selectedGasto.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      } else {
        await fetch('/api/gastos-comunes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }

      setDialogOpen(false)
      resetForm()
      fetchData()
    } catch (error) {
      console.error('Error saving gasto comun:', error)
    }
  }

  const handleDelete = async () => {
    if (!selectedGasto) return
    try {
      await fetch(`/api/gastos-comunes/${selectedGasto.id}`, { method: 'DELETE' })
      setDeleteDialogOpen(false)
      setSelectedGasto(null)
      fetchData()
    } catch (error) {
      console.error('Error deleting gasto comun:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      periodo: '',
      fechaEmision: '',
      fechaVencimiento: '',
      totalGastos: 0,
      totalCobrar: 0,
      montoPorUnidad: 0,
      notas: ''
    })
    setDetalles([])
    setSelectedGasto(null)
  }

  const openEditDialog = (gasto: GastoComun) => {
    setSelectedGasto(gasto)
    setFormData({
      periodo: gasto.periodo,
      fechaEmision: gasto.fechaEmision,
      fechaVencimiento: gasto.fechaVencimiento,
      totalGastos: gasto.totalGastos,
      totalCobrar: gasto.totalCobrar,
      montoPorUnidad: gasto.montoPorUnidad,
      notas: gasto.notas || ''
    })
    setDetalles(gasto.detalles || [])
    setDialogOpen(true)
  }

  const agregarDetalle = () => {
    if (nuevoDetalle.concepto && nuevoDetalle.monto > 0) {
      setDetalles([...detalles, { ...nuevoDetalle, id: Date.now().toString() }])
      const nuevoTotal = detalles.reduce((sum, d) => sum + d.monto, 0) + nuevoDetalle.monto
      setFormData(prev => ({ ...prev, totalGastos: nuevoTotal, totalCobrar: nuevoTotal }))
      setNuevoDetalle({ concepto: '', categoria: 'General', monto: 0, centroCosto: '', notas: '' })
    }
  }

  const eliminarDetalle = (id: string) => {
    const nuevosDetalles = detalles.filter(d => d.id !== id)
    setDetalles(nuevosDetalles)
    const nuevoTotal = nuevosDetalles.reduce((sum, d) => sum + d.monto, 0)
    setFormData(prev => ({ ...prev, totalGastos: nuevoTotal, totalCobrar: nuevoTotal }))
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Cargando...</div>
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Períodos</p>
                <p className="text-2xl font-bold text-slate-800">{stats.totalPeriodos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Total Cobrado</p>
                <p className="text-lg font-bold text-green-600">{formatCLP(stats.totalCobrado)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Pendiente</p>
                <p className="text-lg font-bold text-amber-600">{formatCLP(stats.totalPendiente)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Vencido</p>
                <p className="text-lg font-bold text-red-600">{formatCLP(stats.totalVencido)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-800">Gastos Comunes Mensuales</h2>
        <Button 
          onClick={() => { resetForm(); setDialogOpen(true); }}
          className="bg-[#0f2040] hover:bg-[#1a3155]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Período
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Período</TableHead>
                <TableHead className="text-[10px] font-bold text-slate-500 uppercase">F. Emisión</TableHead>
                <TableHead className="text-[10px] font-bold text-slate-500 uppercase">F. Vencimiento</TableHead>
                <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Total Gastos</TableHead>
                <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Monto/Unidad</TableHead>
                <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Estado</TableHead>
                <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gastos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                    No hay gastos comunes registrados
                  </TableCell>
                </TableRow>
              ) : (
                gastos.map((gasto) => (
                  <TableRow key={gasto.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium">{gasto.periodo}</TableCell>
                    <TableCell>{gasto.fechaEmision}</TableCell>
                    <TableCell>{gasto.fechaVencimiento}</TableCell>
                    <TableCell className="font-medium">{formatCLP(gasto.totalGastos)}</TableCell>
                    <TableCell>{formatCLP(gasto.montoPorUnidad)}</TableCell>
                    <TableCell>
                      <Badge className={estadoColors[gasto.estado] || 'bg-slate-100'}>
                        {gasto.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => { setSelectedGasto(gasto); setDetalleDialogOpen(true); }}
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openEditDialog(gasto)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => { setSelectedGasto(gasto); setDeleteDialogOpen(true); }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedGasto ? 'Editar Gasto Común' : 'Nuevo Gasto Común'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Período</Label>
              <Input
                type="month"
                value={formData.periodo}
                onChange={(e) => setFormData({ ...formData, periodo: e.target.value })}
                placeholder="2024-01"
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha Emisión</Label>
              <Input
                type="date"
                value={formData.fechaEmision}
                onChange={(e) => setFormData({ ...formData, fechaEmision: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha Vencimiento</Label>
              <Input
                type="date"
                value={formData.fechaVencimiento}
                onChange={(e) => setFormData({ ...formData, fechaVencimiento: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Monto por Unidad</Label>
              <Input
                type="number"
                value={formData.montoPorUnidad}
                onChange={(e) => setFormData({ ...formData, montoPorUnidad: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Detalles */}
          <div className="border-t pt-4 mt-4">
            <h3 className="font-semibold mb-4">Detalle de Gastos</h3>
            
            <div className="grid grid-cols-4 gap-2 mb-4">
              <Input
                placeholder="Concepto"
                value={nuevoDetalle.concepto}
                onChange={(e) => setNuevoDetalle({ ...nuevoDetalle, concepto: e.target.value })}
              />
              <Select
                value={nuevoDetalle.categoria}
                onValueChange={(v) => setNuevoDetalle({ ...nuevoDetalle, categoria: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Personal">Personal</SelectItem>
                  <SelectItem value="Servicios">Servicios</SelectItem>
                  <SelectItem value="Mantenimiento">Mantenimiento</SelectItem>
                  <SelectItem value="Administración">Administración</SelectItem>
                  <SelectItem value="Seguridad">Seguridad</SelectItem>
                  <SelectItem value="General">General</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Monto"
                value={nuevoDetalle.monto || ''}
                onChange={(e) => setNuevoDetalle({ ...nuevoDetalle, monto: parseFloat(e.target.value) || 0 })}
              />
              <Button onClick={agregarDetalle} type="button">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detalles.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.concepto}</TableCell>
                    <TableCell>{d.categoria}</TableCell>
                    <TableCell className="text-right">{formatCLP(d.monto)}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => eliminarDetalle(d.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 p-4 bg-slate-50 rounded-lg flex justify-between items-center">
              <span className="font-semibold">Total Gastos:</span>
              <span className="text-xl font-bold">{formatCLP(formData.totalGastos)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} className="bg-[#0f2040]">
              {selectedGasto ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalle Dialog */}
      <Dialog open={detalleDialogOpen} onOpenChange={setDetalleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle: {selectedGasto?.periodo}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500">Total Gastos</p>
                <p className="text-lg font-bold">{formatCLP(selectedGasto?.totalGastos || 0)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Monto por Unidad</p>
                <p className="text-lg font-bold">{formatCLP(selectedGasto?.montoPorUnidad || 0)}</p>
              </div>
            </div>

            {selectedGasto?.detalles && selectedGasto.detalles.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Desglose</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Concepto</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedGasto.detalles.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>{d.concepto}</TableCell>
                        <TableCell>{d.categoria}</TableCell>
                        <TableCell className="text-right">{formatCLP(d.monto)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este gasto común?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el período {selectedGasto?.periodo} 
              y todos sus detalles asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
