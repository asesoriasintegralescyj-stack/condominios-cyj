'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
import { Plus, Pencil, Trash2 } from 'lucide-react'

interface CentroCosto {
  id: string
  nombre: string
  descripcion: string | null
  presupuesto: number
  estado: string
}

interface Gasto {
  centroCosto: string | null
  monto: number
}

const formatCLP = (n: number) => 
  '$' + new Intl.NumberFormat('es-CL').format(Math.round(n || 0))

const estadoColors: Record<string, string> = {
  'Activo': 'bg-green-100 text-green-700',
  'Inactivo': 'bg-slate-100 text-slate-700',
  'Cerrado': 'bg-red-100 text-red-700',
}

export function CentroCostoModule() {
  const [centros, setCentros] = useState<CentroCosto[]>([])
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCentro, setEditingCentro] = useState<CentroCosto | null>(null)
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    presupuesto: 0,
    estado: 'Activo',
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const [centrosRes, gastosRes] = await Promise.all([
        fetch('/api/centros-costo'),
        fetch('/api/gastos'),
      ])
      setCentros(await centrosRes.json())
      setGastos(await gastosRes.json())
    } catch (error) {
      console.error('Error fetching data:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    void (async () => {
      await fetchData()
    })()
  }, [])

  const openDialog = (centro?: CentroCosto) => {
    if (centro) {
      setEditingCentro(centro)
      setFormData({
        nombre: centro.nombre,
        descripcion: centro.descripcion || '',
        presupuesto: centro.presupuesto,
        estado: centro.estado,
      })
    } else {
      setEditingCentro(null)
      setFormData({
        nombre: '',
        descripcion: '',
        presupuesto: 0,
        estado: 'Activo',
      })
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.nombre.trim()) return

    try {
      if (editingCentro) {
        await fetch(`/api/centros-costo/${editingCentro.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      } else {
        await fetch('/api/centros-costo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      }
      setDialogOpen(false)
      fetchData()
    } catch (error) {
      console.error('Error saving centro:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este centro de costo?')) return
    try {
      await fetch(`/api/centros-costo/${id}`, { method: 'DELETE' })
      fetchData()
    } catch (error) {
      console.error('Error deleting centro:', error)
    }
  }

  const getGastado = (nombre: string) => {
    return gastos
      .filter(g => g.centroCosto === nombre)
      .reduce((sum, g) => sum + g.monto, 0)
  }

  const totalPresupuesto = centros.reduce((sum, c) => sum + c.presupuesto, 0)
  const totalGastado = gastos.reduce((sum, g) => sum + g.monto, 0)

  return (
    <div className="space-y-5">
      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={() => openDialog()}>
          <Plus className="w-4 h-4 mr-1" /> Nuevo Centro
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Centros de Costo ({centros.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Nombre</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Descripción</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Presupuesto</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Gastado</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Disponible</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Uso %</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Estado</th>
                  <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="p-8 text-center text-slate-400">Cargando...</td></tr>
                ) : centros.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-slate-400">Sin centros de costo</td></tr>
                ) : (
                  centros.map((centro) => {
                    const gastado = getGastado(centro.nombre)
                    const disponible = centro.presupuesto - gastado
                    const porcentaje = centro.presupuesto > 0 ? Math.round((gastado / centro.presupuesto) * 100) : 0
                    return (
                      <tr key={centro.id} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="p-3 font-semibold">{centro.nombre}</td>
                        <td className="p-3 text-xs text-slate-600">{centro.descripcion || '–'}</td>
                        <td className="p-3 font-mono text-xs">{formatCLP(centro.presupuesto)}</td>
                        <td className="p-3 font-mono text-xs text-red-600">{formatCLP(gastado)}</td>
                        <td className={`p-3 font-mono text-xs ${disponible < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCLP(disponible)}
                        </td>
                        <td className="p-3 min-w-[100px]">
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={porcentaje} 
                              className={`h-1.5 flex-1 ${porcentaje > 90 ? '[&>div]:bg-red-500' : porcentaje > 70 ? '[&>div]:bg-amber-500' : ''}`}
                            />
                            <span className="text-[10px] text-slate-500">{porcentaje}%</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge className={estadoColors[centro.estado] || 'bg-slate-100'}>{centro.estado}</Badge>
                        </td>
                        <td className="p-3">
                          <div className="flex justify-center gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openDialog(centro)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:text-red-700" onClick={() => handleDelete(centro.id)}>
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
          <div className="p-3 border-t flex justify-end gap-5 text-sm">
            <span>Presupuesto total: <b>{formatCLP(totalPresupuesto)}</b></span>
            <span>Total gastado: <b className="text-red-600">{formatCLP(totalGastado)}</b></span>
          </div>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCentro ? 'Editar' : 'Nuevo'} Centro de Costo</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input value={formData.descripcion} onChange={(e) => setFormData({...formData, descripcion: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Presupuesto ($)</Label>
                <Input type="number" value={formData.presupuesto} onChange={(e) => setFormData({...formData, presupuesto: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={formData.estado} onValueChange={(v) => setFormData({...formData, estado: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Activo', 'Inactivo', 'Cerrado'].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
