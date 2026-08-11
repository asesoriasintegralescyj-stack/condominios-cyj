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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Pencil, Trash2, Search, Download, Package, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { TableroIndicadores } from '@/components/ui/tablero-indicadores'
import { apiFetch } from '@/lib/api-client'

interface Proveedor {
  id: string
  razonSocial: string
  rut: string | null
  giro: string | null
  direccion: string | null
  comuna: string | null
  telCorp: string | null
  emailCorp: string | null
  web: string | null
  contacto: string | null
  cargo: string | null
  telDirecto: string | null
  emailContacto: string | null
  celular: string | null
  estado: string
  notas: string | null
}

const estadoColors: Record<string, string> = {
  'Activo': 'bg-green-100 text-green-700',
  'Inactivo': 'bg-slate-100 text-slate-700',
  'En revisión': 'bg-amber-100 text-amber-700',
}

export function ProveedoresModule() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProv, setEditingProv] = useState<Proveedor | null>(null)
  const [formData, setFormData] = useState({
    razonSocial: '',
    rut: '',
    giro: '',
    direccion: '',
    comuna: '',
    telCorp: '',
    emailCorp: '',
    web: '',
    contacto: '',
    cargo: '',
    telDirecto: '',
    emailContacto: '',
    celular: '',
    estado: 'Activo',
    notas: '',
  })

  const fetchProveedores = async (searchTerm = '') => {
    setLoading(true)
    try {
      const url = searchTerm ? `/api/proveedores?search=${encodeURIComponent(searchTerm)}` : '/api/proveedores'
      const json = await apiFetch<{ items?: Proveedor[] }>(url, {} as any)
      const data: Proveedor[] = Array.isArray(json?.items) ? json.items : Array.isArray(json) ? json : []
      setProveedores(data)
    } catch (error) {
      console.error('Error fetching proveedores:', error)
      setProveedores([])
    }
    setLoading(false)
  }

  useEffect(() => {
    void (async () => {
      await fetchProveedores()
    })()
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => fetchProveedores(search), 300)
    return () => clearTimeout(timeout)
  }, [search])

  const openDialog = (prov?: Proveedor) => {
    if (prov) {
      setEditingProv(prov)
      setFormData({
        razonSocial: prov.razonSocial,
        rut: prov.rut || '',
        giro: prov.giro || '',
        direccion: prov.direccion || '',
        comuna: prov.comuna || '',
        telCorp: prov.telCorp || '',
        emailCorp: prov.emailCorp || '',
        web: prov.web || '',
        contacto: prov.contacto || '',
        cargo: prov.cargo || '',
        telDirecto: prov.telDirecto || '',
        emailContacto: prov.emailContacto || '',
        celular: prov.celular || '',
        estado: prov.estado,
        notas: prov.notas || '',
      })
    } else {
      setEditingProv(null)
      setFormData({
        razonSocial: '',
        rut: '',
        giro: '',
        direccion: '',
        comuna: '',
        telCorp: '',
        emailCorp: '',
        web: '',
        contacto: '',
        cargo: '',
        telDirecto: '',
        emailContacto: '',
        celular: '',
        estado: 'Activo',
        notas: '',
      })
    }
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.razonSocial.trim()) return

    try {
      if (editingProv) {
        await fetch(`/api/proveedores/${editingProv.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      } else {
        await fetch('/api/proveedores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      }
      setDialogOpen(false)
      fetchProveedores(search)
    } catch (error) {
      console.error('Error saving proveedor:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este proveedor?')) return
    try {
      await fetch(`/api/proveedores/${id}`, { method: 'DELETE' })
      fetchProveedores(search)
    } catch (error) {
      console.error('Error deleting proveedor:', error)
    }
  }

  // Exportar a CSV
  const exportToCSV = () => {
    const headers = ['Razón Social', 'RUT', 'Giro', 'Dirección', 'Comuna', 'Tel. Corp.', 'Email Corp.', 'Web', 'Contacto', 'Cargo', 'Tel. Directo', 'Email Contacto', 'Celular', 'Estado']
    
    const rows = proveedores.map(p => [
      `"${p.razonSocial.replace(/"/g, '""')}"`,
      p.rut || '',
      `"${(p.giro || '').replace(/"/g, '""')}"`,
      `"${(p.direccion || '').replace(/"/g, '""')}"`,
      p.comuna || '',
      p.telCorp || '',
      p.emailCorp || '',
      p.web || '',
      `"${(p.contacto || '').replace(/"/g, '""')}"`,
      p.cargo || '',
      p.telDirecto || '',
      p.emailContacto || '',
      p.celular || '',
      p.estado
    ])
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `proveedores_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const activosCount = proveedores.filter(p => p.estado === 'Activo').length
  const inactivosCount = proveedores.filter(p => p.estado === 'Inactivo').length
  const enRevisionCount = proveedores.filter(p => p.estado === 'En revisión').length

  return (
    <div className="space-y-5">
      <TableroIndicadores
        cards={[
          { titulo: 'Total Proveedores', numero: proveedores.length, icon: <Package className="w-5 h-5" />, color: 'primary' },
          { titulo: 'Activos', numero: activosCount, icon: <CheckCircle className="w-5 h-5" />, color: 'verde' },
          { titulo: 'Inactivos', numero: inactivosCount, icon: <XCircle className="w-5 h-5" />, color: 'gris' },
          { titulo: 'En Revisión', numero: enRevisionCount, icon: <AlertTriangle className="w-5 h-5" />, color: 'naranja' },
        ]}
      />
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
        <Button variant="outline" onClick={exportToCSV}>
          <Download className="w-4 h-4 mr-1" /> Exportar CSV
        </Button>
        <Button onClick={() => openDialog()}>
          <Plus className="w-4 h-4 mr-1" /> Nuevo
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Proveedores ({proveedores.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Razón Social</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">RUT</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Giro</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Comuna</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Tel. Corp.</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Contacto</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Estado</th>
                  <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="p-8 text-center text-slate-400">Cargando...</td></tr>
                ) : proveedores.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-slate-400">Sin proveedores</td></tr>
                ) : (
                  proveedores.map((prov) => (
                    <tr key={prov.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="p-3 font-semibold max-w-[240px] truncate" title={prov.razonSocial}>{prov.razonSocial}</td>
                      <td className="p-3 font-mono text-xs whitespace-nowrap">{prov.rut || '–'}</td>
                      <td className="p-3 text-xs text-slate-600 max-w-[180px] truncate" title={prov.giro || ''}>{prov.giro || '–'}</td>
                      <td className="p-3 text-xs max-w-[120px] truncate" title={prov.comuna || ''}>{prov.comuna || '–'}</td>
                      <td className="p-3 text-xs whitespace-nowrap">{prov.telCorp || '–'}</td>
                      <td className="p-3 text-xs max-w-[150px] truncate" title={prov.contacto || ''}>{prov.contacto || '–'}</td>
                      <td className="p-3">
                        <Badge className={estadoColors[prov.estado] || 'bg-slate-100'}>{prov.estado}</Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openDialog(prov)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:text-red-700" onClick={() => handleDelete(prov.id)}>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProv ? 'Editar' : 'Nuevo'} Proveedor</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <Label>Razón Social</Label>
                <Input className="w-full" value={formData.razonSocial} onChange={(e) => setFormData({...formData, razonSocial: e.target.value})} />
              </div>
              <div className="space-y-2 min-w-0">
                <Label>RUT</Label>
                <Input className="w-full" placeholder="76.123.456-7" value={formData.rut} onChange={(e) => setFormData({...formData, rut: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <Label>Giro</Label>
                <Input className="w-full" value={formData.giro} onChange={(e) => setFormData({...formData, giro: e.target.value})} />
              </div>
              <div className="space-y-2 min-w-0">
                <Label>Dirección</Label>
                <Input className="w-full" value={formData.direccion} onChange={(e) => setFormData({...formData, direccion: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <Label>Comuna</Label>
                <Input className="w-full" value={formData.comuna} onChange={(e) => setFormData({...formData, comuna: e.target.value})} />
              </div>
              <div className="space-y-2 min-w-0">
                <Label>Tel. Corporativo</Label>
                <Input className="w-full" value={formData.telCorp} onChange={(e) => setFormData({...formData, telCorp: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <Label>Email Corporativo</Label>
                <Input className="w-full" type="email" value={formData.emailCorp} onChange={(e) => setFormData({...formData, emailCorp: e.target.value})} />
              </div>
              <div className="space-y-2 min-w-0">
                <Label>Página Web</Label>
                <Input className="w-full" value={formData.web} onChange={(e) => setFormData({...formData, web: e.target.value})} />
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="text-xs font-semibold text-slate-500 mb-3">PERSONA DE CONTACTO</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 min-w-0">
                  <Label>Contacto</Label>
                  <Input className="w-full" value={formData.contacto} onChange={(e) => setFormData({...formData, contacto: e.target.value})} />
                </div>
                <div className="space-y-2 min-w-0">
                  <Label>Cargo</Label>
                  <Input className="w-full" value={formData.cargo} onChange={(e) => setFormData({...formData, cargo: e.target.value})} />
                </div>
                <div className="space-y-2 min-w-0">
                  <Label>Tel. Directo</Label>
                  <Input className="w-full" value={formData.telDirecto} onChange={(e) => setFormData({...formData, telDirecto: e.target.value})} />
                </div>
                <div className="space-y-2 min-w-0">
                  <Label>Email Contacto</Label>
                  <Input className="w-full" type="email" value={formData.emailContacto} onChange={(e) => setFormData({...formData, emailContacto: e.target.value})} />
                </div>
                <div className="space-y-2 min-w-0">
                  <Label>Celular</Label>
                  <Input className="w-full" value={formData.celular} onChange={(e) => setFormData({...formData, celular: e.target.value})} />
                </div>
                <div className="space-y-2 min-w-0">
                  <Label>Estado</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={formData.estado} 
                    onChange={(e) => setFormData({...formData, estado: e.target.value})}
                  >
                    {['Activo', 'Inactivo', 'En revisión'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-2 min-w-0">
              <Label>Notas</Label>
              <Textarea className="w-full" value={formData.notas} onChange={(e) => setFormData({...formData, notas: e.target.value})} />
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
