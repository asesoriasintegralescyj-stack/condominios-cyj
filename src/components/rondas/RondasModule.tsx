'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search,
  Plus,
  MoreHorizontal,
  QrCode,
  MapPin,
  Clock,
  User,
  Download,
  Trash2,
  Eye,
  CheckCircle,
  Scan,
} from 'lucide-react'

interface Ronda {
  id: string
  nombre: string
  codigo: string
  ubicacion: string
  descripcion?: string | null
  activo: boolean
  condominioId?: string | null
  creadoPorNombre?: string | null
  createdAt: string
  _count?: { registros: number }
}

interface RegistroRonda {
  id: string
  rondaId: string
  usuarioId?: string | null
  usuarioNombre?: string | null
  fecha: string
  hora: string
  ubicacion?: string | null
  observaciones?: string | null
  latitud?: number | null
  longitud?: number | null
  createdAt: string
}

export function RondasModule() {
  const [rondas, setRondas] = useState<Ronda[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [registrosDialogOpen, setRegistrosDialogOpen] = useState(false)
  const [scanDialogOpen, setScanDialogOpen] = useState(false)
  const [selectedRonda, setSelectedRonda] = useState<Ronda | null>(null)
  const [registros, setRegistros] = useState<RegistroRonda[]>([])
  const [formData, setFormData] = useState({
    nombre: '',
    ubicacion: '',
    descripcion: ''
  })
  const [scanResult, setScanResult] = useState<string>('')

  const fetchRondas = async () => {
    try {
      const res = await fetch('/api/rondas')
      const data = await res.json()
      setRondas(data)
    } catch (error) {
      console.error('Error fetching rondas:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRondas()
  }, [])

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/rondas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      if (res.ok) {
        await fetchRondas()
        setDialogOpen(false)
        setFormData({ nombre: '', ubicacion: '', descripcion: '' })
      }
    } catch (error) {
      console.error('Error creating ronda:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta ronda?')) return
    
    try {
      await fetch(`/api/rondas/${id}`, { method: 'DELETE' })
      await fetchRondas()
    } catch (error) {
      console.error('Error deleting ronda:', error)
    }
  }

  const handleViewQR = (ronda: Ronda) => {
    setSelectedRonda(ronda)
    setQrDialogOpen(true)
  }

  const handleViewRegistros = async (ronda: Ronda) => {
    setSelectedRonda(ronda)
    try {
      const res = await fetch(`/api/rondas/${ronda.id}`)
      const data = await res.json()
      setRegistros(data.registros || [])
    } catch (error) {
      console.error('Error fetching registros:', error)
    }
    setRegistrosDialogOpen(true)
  }

  const handleScanQR = () => {
    setScanDialogOpen(true)
    setScanResult('')
  }

  const handleRegisterScan = async () => {
    if (!scanResult.trim()) return
    
    try {
      const res = await fetch('/api/rondas/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: scanResult.trim() })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        alert(`¡Ronda registrada exitosamente!\n${data.ronda?.nombre || ''}`)
        setScanDialogOpen(false)
        setScanResult('')
        fetchRondas()
      } else {
        alert(data.error || 'Error al registrar ronda')
      }
    } catch (error) {
      console.error('Error registering scan:', error)
      alert('Error al registrar ronda')
    }
  }

  const exportToCSV = () => {
    const headers = ['Nombre', 'Código', 'Ubicación', 'Estado', 'Registros', 'Fecha Creación']
    const rows = rondas.map(r => [
      r.nombre,
      r.codigo,
      r.ubicacion,
      r.activo ? 'Activo' : 'Inactivo',
      r._count?.registros || 0,
      new Date(r.createdAt).toLocaleDateString('es-CL')
    ])
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rondas_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const filteredRondas = rondas.filter(r => 
    r.nombre.toLowerCase().includes(search.toLowerCase()) ||
    r.codigo.toLowerCase().includes(search.toLowerCase()) ||
    r.ubicacion.toLowerCase().includes(search.toLowerCase())
  )

  // Generate QR code URL using a free QR API
  const getQRUrl = (codigo: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(codigo)}`
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <QrCode className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rondas.length}</p>
                <p className="text-sm text-gray-500">Total Rondas</p>
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
                <p className="text-2xl font-bold">{rondas.filter(r => r.activo).length}</p>
                <p className="text-sm text-gray-500">Activas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Scan className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rondas.reduce((acc, r) => acc + (r._count?.registros || 0), 0)}</p>
                <p className="text-sm text-gray-500">Registros Totales</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{new Set(rondas.map(r => r.ubicacion)).size}</p>
                <p className="text-sm text-gray-500">Ubicaciones</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar rondas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleScanQR}>
            <Scan className="w-4 h-4 mr-2" />
            Escanear QR
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Ronda
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Código QR</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Registros</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Cargando...
                  </TableCell>
                </TableRow>
              ) : filteredRondas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No hay rondas registradas
                  </TableCell>
                </TableRow>
              ) : (
                filteredRondas.map((ronda) => (
                  <TableRow key={ronda.id}>
                    <TableCell className="font-medium">{ronda.nombre}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {ronda.codigo}
                      </code>
                    </TableCell>
                    <TableCell>{ronda.ubicacion}</TableCell>
                    <TableCell>
                      <Badge variant={ronda.activo ? 'default' : 'secondary'}>
                        {ronda.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>{ronda._count?.registros || 0}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewQR(ronda)}>
                            <QrCode className="w-4 h-4 mr-2" />
                            Ver QR
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewRegistros(ronda)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Registros
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(ronda.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Ronda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre *</Label>
              <Input
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Ronda Perimetral Norte"
              />
            </div>
            <div>
              <Label>Ubicación *</Label>
              <Input
                value={formData.ubicacion}
                onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                placeholder="Ej: Edificio A, Piso 1"
              />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Descripción opcional..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!formData.nombre || !formData.ubicacion}>
              Crear Ronda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Código QR - {selectedRonda?.nombre}</DialogTitle>
          </DialogHeader>
          {selectedRonda && (
            <div className="flex flex-col items-center gap-4">
              <img 
                src={getQRUrl(selectedRonda.codigo)} 
                alt="QR Code" 
                className="w-64 h-64 border rounded-lg"
              />
              <div className="text-center">
                <p className="font-medium">{selectedRonda.nombre}</p>
                <p className="text-sm text-gray-500">{selectedRonda.ubicacion}</p>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded mt-2 block">
                  {selectedRonda.codigo}
                </code>
              </div>
              <Button 
                variant="outline" 
                onClick={() => {
                  const link = document.createElement('a')
                  link.href = getQRUrl(selectedRonda.codigo)
                  link.download = `qr_${selectedRonda.codigo}.png`
                  link.click()
                }}
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar QR
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Registros Dialog */}
      <Dialog open={registrosDialogOpen} onOpenChange={setRegistrosDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registros - {selectedRonda?.nombre}</DialogTitle>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Hora</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead>Observaciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registros.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                    No hay registros
                  </TableCell>
                </TableRow>
              ) : (
                registros.map((reg) => (
                  <TableRow key={reg.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        {reg.usuarioNombre || 'Desconocido'}
                      </div>
                    </TableCell>
                    <TableCell>{reg.fecha}</TableCell>
                    <TableCell>{reg.hora}</TableCell>
                    <TableCell>{reg.ubicacion || '-'}</TableCell>
                    <TableCell>{reg.observaciones || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {/* Scan QR Dialog */}
      <Dialog open={scanDialogOpen} onOpenChange={setScanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escanear Código QR</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              Ingrese el código de la ronda que desea registrar:
            </p>
            <Input
              value={scanResult}
              onChange={(e) => setScanResult(e.target.value)}
              placeholder="Ej: RONDA-ABC123DEF456"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScanDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRegisterScan} disabled={!scanResult.trim()}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
