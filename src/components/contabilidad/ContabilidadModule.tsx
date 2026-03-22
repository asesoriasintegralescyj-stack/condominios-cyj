'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Calculator,
  FileText,
  TrendingUp,
  TrendingDown,
  Scale,
  Eye
} from 'lucide-react'

interface AsientoContable {
  id: string
  numero: string
  fecha: string
  glosa: string
  tipo: string
  estado: string
  totalDebe: number
  totalHaber: number
  documento?: string
  documentoId?: string
  notas?: string
  createdAt: string
  detalles?: DetalleAsiento[]
}

interface DetalleAsiento {
  id: string
  glosa?: string
  debe: number
  haber: number
  cuenta: {
    codigo: string
    nombre: string
  }
}

interface CuentaContable {
  id: string
  codigo: string
  nombre: string
  tipo: string
  nivel: number
  saldo: number
  estado: string
}

const formatCLP = (n: number) => 
  '$' + new Intl.NumberFormat('es-CL').format(Math.round(n || 0))

const estadoColors: Record<string, string> = {
  'Pendiente': 'bg-amber-100 text-amber-700',
  'Aprobado': 'bg-green-100 text-green-700',
  'Anulado': 'bg-red-100 text-red-700',
}

const tipoColors: Record<string, string> = {
  'Normal': 'bg-slate-100 text-slate-700',
  'Apertura': 'bg-blue-100 text-blue-700',
  'Cierre': 'bg-purple-100 text-purple-700',
  'Ajuste': 'bg-orange-100 text-orange-700',
}

export function ContabilidadModule() {
  const [asientos, setAsientos] = useState<AsientoContable[]>([])
  const [cuentas, setCuentas] = useState<CuentaContable[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detalleDialogOpen, setDetalleDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedAsiento, setSelectedAsiento] = useState<AsientoContable | null>(null)
  const [stats, setStats] = useState({
    totalAsientos: 0,
    totalDebe: 0,
    totalHaber: 0,
    pendientes: 0
  })

  // Form state
  const [formData, setFormData] = useState({
    numero: '',
    fecha: '',
    glosa: '',
    tipo: 'Normal',
    documento: '',
    notas: ''
  })

  // Detalles del asiento
  const [detalles, setDetalles] = useState<DetalleAsiento[]>([])
  const [nuevoDetalle, setNuevoDetalle] = useState({
    cuentaId: '',
    glosa: '',
    debe: 0,
    haber: 0
  })

  const fetchData = async () => {
    try {
      const [asientosRes, cuentasRes] = await Promise.all([
        fetch('/api/contabilidad/asientos'),
        fetch('/api/contabilidad/cuentas')
      ])
      
      const asientosData = await asientosRes.json()
      const cuentasData = await cuentasRes.json()
      
      setAsientos(asientosData.asientos || [])
      setCuentas(cuentasData.cuentas || [])
      setStats(asientosData.stats || stats)
    } catch (error) {
      console.error('Error fetching contabilidad:', error)
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

      if (selectedAsiento) {
        await fetch(`/api/contabilidad/asientos/${selectedAsiento.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      } else {
        await fetch('/api/contabilidad/asientos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }

      setDialogOpen(false)
      resetForm()
      fetchData()
    } catch (error) {
      console.error('Error saving asiento:', error)
    }
  }

  const handleDelete = async () => {
    if (!selectedAsiento) return
    try {
      await fetch(`/api/contabilidad/asientos/${selectedAsiento.id}`, { method: 'DELETE' })
      setDeleteDialogOpen(false)
      setSelectedAsiento(null)
      fetchData()
    } catch (error) {
      console.error('Error deleting asiento:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      numero: '',
      fecha: '',
      glosa: '',
      tipo: 'Normal',
      documento: '',
      notas: ''
    })
    setDetalles([])
    setSelectedAsiento(null)
  }

  const agregarDetalle = () => {
    if (nuevoDetalle.cuentaId && (nuevoDetalle.debe > 0 || nuevoDetalle.haber > 0)) {
      const cuenta = cuentas.find(c => c.id === nuevoDetalle.cuentaId)
      setDetalles([...detalles, { 
        ...nuevoDetalle, 
        id: Date.now().toString(),
        cuenta: { codigo: cuenta?.codigo || '', nombre: cuenta?.nombre || '' }
      }])
      setNuevoDetalle({ cuentaId: '', glosa: '', debe: 0, haber: 0 })
    }
  }

  const eliminarDetalle = (id: string) => {
    setDetalles(detalles.filter(d => d.id !== id))
  }

  const calcularTotales = () => {
    const totalDebe = detalles.reduce((sum, d) => sum + d.debe, 0)
    const totalHaber = detalles.reduce((sum, d) => sum + d.haber, 0)
    return { totalDebe, totalHaber }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Cargando...</div>
  }

  const totales = calcularTotales()

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Total Asientos</p>
                <p className="text-2xl font-bold text-slate-800">{stats.totalAsientos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Total Débitos</p>
                <p className="text-lg font-bold text-green-600">{formatCLP(stats.totalDebe)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Total Créditos</p>
                <p className="text-lg font-bold text-red-600">{formatCLP(stats.totalHaber)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Calculator className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase">Pendientes</p>
                <p className="text-2xl font-bold text-amber-600">{stats.pendientes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="asientos" className="space-y-4">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="asientos">Asientos Contables</TabsTrigger>
          <TabsTrigger value="cuentas">Plan de Cuentas</TabsTrigger>
        </TabsList>

        <TabsContent value="asientos" className="space-y-4">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800">Asientos Contables</h2>
            <Button 
              onClick={() => { resetForm(); setDialogOpen(true); }}
              className="bg-[#0f2040] hover:bg-[#1a3155]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Asiento
            </Button>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Nº Asiento</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Fecha</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Glosa</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Tipo</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-500 uppercase text-right">Debe</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-500 uppercase text-right">Haber</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Estado</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {asientos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-slate-400">
                        No hay asientos contables registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    asientos.map((asiento) => (
                      <TableRow key={asiento.id} className="hover:bg-slate-50">
                        <TableCell className="font-mono font-medium">{asiento.numero}</TableCell>
                        <TableCell>{asiento.fecha}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{asiento.glosa}</TableCell>
                        <TableCell>
                          <Badge className={tipoColors[asiento.tipo] || 'bg-slate-100'}>
                            {asiento.tipo}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCLP(asiento.totalDebe)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-red-600">
                          {formatCLP(asiento.totalHaber)}
                        </TableCell>
                        <TableCell>
                          <Badge className={estadoColors[asiento.estado] || 'bg-slate-100'}>
                            {asiento.estado}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => { setSelectedAsiento(asiento); setDetalleDialogOpen(true); }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => { setSelectedAsiento(asiento); setDeleteDialogOpen(true); }}
                              className="text-red-600"
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
        </TabsContent>

        <TabsContent value="cuentas" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800">Plan de Cuentas</h2>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Código</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Nombre</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Tipo</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Nivel</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-500 uppercase text-right">Saldo</TableHead>
                    <TableHead className="text-[10px] font-bold text-slate-500 uppercase">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cuentas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                        No hay cuentas contables registradas
                      </TableCell>
                    </TableRow>
                  ) : (
                    cuentas.map((cuenta) => (
                      <TableRow key={cuenta.id} className="hover:bg-slate-50">
                        <TableCell className="font-mono font-medium">{cuenta.codigo}</TableCell>
                        <TableCell className={cuenta.nivel > 1 ? 'pl-8' : 'font-medium'}>
                          {cuenta.nombre}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{cuenta.tipo}</Badge>
                        </TableCell>
                        <TableCell className="text-center">{cuenta.nivel}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCLP(cuenta.saldo)}
                        </TableCell>
                        <TableCell>
                          <Badge className={cuenta.estado === 'Activa' ? 'bg-green-100 text-green-700' : 'bg-slate-100'}>
                            {cuenta.estado}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedAsiento ? 'Editar Asiento' : 'Nuevo Asiento Contable'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-4 py-4">
            <div className="space-y-2">
              <Label>Número</Label>
              <Input
                value={formData.numero}
                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                placeholder="AS-0001"
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={formData.tipo}
                onValueChange={(v) => setFormData({ ...formData, tipo: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Apertura">Apertura</SelectItem>
                  <SelectItem value="Cierre">Cierre</SelectItem>
                  <SelectItem value="Ajuste">Ajuste</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Glosa</Label>
            <Textarea
              value={formData.glosa}
              onChange={(e) => setFormData({ ...formData, glosa: e.target.value })}
              placeholder="Descripción del asiento..."
              rows={2}
            />
          </div>

          {/* Detalles */}
          <div className="border-t pt-4 mt-4">
            <h3 className="font-semibold mb-4">Detalle del Asiento</h3>
            
            <div className="grid grid-cols-5 gap-2 mb-4">
              <Select
                value={nuevoDetalle.cuentaId}
                onValueChange={(v) => setNuevoDetalle({ ...nuevoDetalle, cuentaId: v })}
              >
                <SelectTrigger className="col-span-2">
                  <SelectValue placeholder="Seleccionar cuenta..." />
                </SelectTrigger>
                <SelectContent>
                  {cuentas.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.codigo} - {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Glosa"
                value={nuevoDetalle.glosa}
                onChange={(e) => setNuevoDetalle({ ...nuevoDetalle, glosa: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Debe"
                value={nuevoDetalle.debe || ''}
                onChange={(e) => setNuevoDetalle({ ...nuevoDetalle, debe: parseFloat(e.target.value) || 0 })}
              />
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Haber"
                  value={nuevoDetalle.haber || ''}
                  onChange={(e) => setNuevoDetalle({ ...nuevoDetalle, haber: parseFloat(e.target.value) || 0 })}
                />
                <Button onClick={agregarDetalle} type="button">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Glosa</TableHead>
                  <TableHead className="text-right">Debe</TableHead>
                  <TableHead className="text-right">Haber</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detalles.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono">{d.cuenta.codigo}</TableCell>
                    <TableCell>{d.cuenta.nombre}</TableCell>
                    <TableCell>{d.glosa}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {d.debe > 0 ? formatCLP(d.debe) : ''}
                    </TableCell>
                    <TableCell className="text-right font-medium text-red-600">
                      {d.haber > 0 ? formatCLP(d.haber) : ''}
                    </TableCell>
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

            <div className="mt-4 p-4 bg-slate-50 rounded-lg grid grid-cols-3 gap-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-green-700">Total Debe:</span>
                <span className="text-lg font-bold text-green-600">{formatCLP(totales.totalDebe)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-red-700">Total Haber:</span>
                <span className="text-lg font-bold text-red-600">{formatCLP(totales.totalHaber)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold">Diferencia:</span>
                <span className={`text-lg font-bold ${totales.totalDebe === totales.totalHaber ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCLP(Math.abs(totales.totalDebe - totales.totalHaber))}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              className="bg-[#0f2040]"
              disabled={totales.totalDebe !== totales.totalHaber}
            >
              {selectedAsiento ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detalleDialogOpen} onOpenChange={setDetalleDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Asiento: {selectedAsiento?.numero}</DialogTitle>
          </DialogHeader>
          
          {selectedAsiento && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm text-slate-500">Fecha</p>
                  <p className="font-medium">{selectedAsiento.fecha}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Tipo</p>
                  <Badge className={tipoColors[selectedAsiento.tipo]}>{selectedAsiento.tipo}</Badge>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Estado</p>
                  <Badge className={estadoColors[selectedAsiento.estado]}>{selectedAsiento.estado}</Badge>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500 mb-1">Glosa</p>
                <p className="font-medium">{selectedAsiento.glosa}</p>
              </div>

              {selectedAsiento.detalles && selectedAsiento.detalles.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Cuenta</TableHead>
                      <TableHead className="text-right">Debe</TableHead>
                      <TableHead className="text-right">Haber</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedAsiento.detalles.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-mono">{d.cuenta.codigo}</TableCell>
                        <TableCell>{d.cuenta.nombre}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {d.debe > 0 ? formatCLP(d.debe) : ''}
                        </TableCell>
                        <TableCell className="text-right font-medium text-red-600">
                          {d.haber > 0 ? formatCLP(d.haber) : ''}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-slate-50 font-bold">
                      <TableCell colSpan={2}>TOTALES</TableCell>
                      <TableCell className="text-right text-green-600">{formatCLP(selectedAsiento.totalDebe)}</TableCell>
                      <TableCell className="text-right text-red-600">{formatCLP(selectedAsiento.totalHaber)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este asiento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el asiento {selectedAsiento?.numero}.
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
