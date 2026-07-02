'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
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
import { Plus, Pencil, Trash2, Search, DollarSign, Upload, Download, FileSpreadsheet, Camera, X } from 'lucide-react'
import { useSession } from '@/hooks/use-session'
import { formatCLP } from '@/lib/utils'

interface Personal {
  id: string
  nombre: string
  rut: string | null
  cargo: string | null
  contrato: string
  afp: string
  salud: string
  mutual: string
  ccaf: string | null
  fechaIngreso: string | null
  sueldoBase: number
  movilizacion: number
  colacion: number
  viatico: number
  asigFamiliar: number
  estado: string
  email: string | null
  telefono: string | null
  foto: string | null
  notas: string | null
}

const contratoColors: Record<string, string> = {
  'Indefinido': 'bg-blue-100 text-blue-700',
  'Plazo Fijo': 'bg-yellow-100 text-yellow-700',
  'Por Obra': 'bg-purple-100 text-purple-700',
  'Part-Time': 'bg-cyan-100 text-cyan-700',
}

const estadoColors: Record<string, string> = {
  'Activo': 'bg-green-100 text-green-700',
  'Vacaciones': 'bg-cyan-100 text-cyan-700',
  'Licencia': 'bg-purple-100 text-purple-700',
  'Inactivo': 'bg-slate-100 text-slate-700',
}

export function PersonalModule() {
  const [personal, setPersonal] = useState<Personal[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importStatus, setImportStatus] = useState<{ loading: boolean; message: string }>({ loading: false, message: '' })
  const [editingPer, setEditingPer] = useState<Personal | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // CSV Bulk upload
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [bulkData, setBulkData] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{success: number, errors: string[]} | null>(null)
  
  const { hasPermission } = useSession()
  const canEdit = hasPermission('personal.editar')
  
  const [formData, setFormData] = useState({
    nombre: '',
    rut: '',
    cargo: '',
    contrato: 'Indefinido',
    afp: 'ProVida',
    salud: 'Fonasa',
    mutual: 'IST',
    ccaf: '',
    fechaIngreso: new Date().toISOString().split('T')[0],
    sueldoBase: 0,
    movilizacion: 0,
    colacion: 0,
    viatico: 0,
    asigFamiliar: 0,
    estado: 'Activo',
    email: '',
    telefono: '',
    foto: '',
    notas: '',
  })
  const photoInputRef = useRef<HTMLInputElement>(null)

  const fetchPersonal = async (searchTerm = '') => {
    setLoading(true)
    try {
      const url = searchTerm ? `/api/personal?search=${encodeURIComponent(searchTerm)}` : '/api/personal'
      const res = await fetch(url)
      const data = await res.json()
      setPersonal(data)
    } catch (error) {
      console.error('Error fetching personal:', error)
    }
    setLoading(false)
  }

  useEffect(() => {
    void (async () => {
      await fetchPersonal()
    })()
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => fetchPersonal(search), 300)
    return () => clearTimeout(timeout)
  }, [search])

  const openDialog = (per?: Personal) => {
    if (per) {
      setEditingPer(per)
      setFormData({
        nombre: per.nombre,
        rut: per.rut || '',
        cargo: per.cargo || '',
        contrato: per.contrato,
        afp: per.afp,
        salud: per.salud,
        mutual: per.mutual,
        ccaf: per.ccaf || '',
        fechaIngreso: per.fechaIngreso || new Date().toISOString().split('T')[0],
        sueldoBase: per.sueldoBase,
        movilizacion: per.movilizacion,
        colacion: per.colacion,
        viatico: per.viatico,
        asigFamiliar: per.asigFamiliar,
        estado: per.estado,
        email: per.email || '',
        telefono: per.telefono || '',
        foto: per.foto || '',
        notas: per.notas || '',
      })
    } else {
      setEditingPer(null)
      setFormData({
        nombre: '',
        rut: '',
        cargo: '',
        contrato: 'Indefinido',
        afp: 'ProVida',
        salud: 'Fonasa',
        mutual: 'IST',
        ccaf: '',
        fechaIngreso: new Date().toISOString().split('T')[0],
        sueldoBase: 0,
        movilizacion: 0,
        colacion: 0,
        viatico: 0,
        asigFamiliar: 0,
        estado: 'Activo',
        email: '',
        telefono: '',
        foto: '',
        notas: '',
      })
    }
    setDialogOpen(true)
  }

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
      setFormData({ ...formData, foto: base64 })
    }
    reader.readAsDataURL(file)
  }

  const removePhoto = () => {
    setFormData({ ...formData, foto: '' })
    if (photoInputRef.current) {
      photoInputRef.current.value = ''
    }
  }

  const handleSave = async () => {
    if (!formData.nombre.trim()) return

    try {
      if (editingPer) {
        await fetch(`/api/personal/${editingPer.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      } else {
        await fetch('/api/personal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
      }
      setDialogOpen(false)
      fetchPersonal(search)
    } catch (error) {
      console.error('Error saving personal:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este empleado?')) return
    try {
      await fetch(`/api/personal/${id}`, { method: 'DELETE' })
      fetchPersonal(search)
    } catch (error) {
      console.error('Error deleting personal:', error)
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
      const response = await fetch('/api/import/personal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personal: jsonData }),
      })

      const result = await response.json()

      if (result.success) {
        setImportStatus({ 
          loading: false, 
          message: result.mensaje 
        })
        fetchPersonal()
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
      const res = await fetch('/api/personal/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: bulkData }),
      })
      const result = await res.json()
      setUploadResult(result)
      if (result.success > 0) {
        fetchPersonal()
      }
    } catch (error) {
      console.error('Error uploading personal:', error)
      setUploadResult({ success: 0, errors: ['Error de conexión'] })
    }
    setUploading(false)
  }

  // Export function
  const exportPersonal = () => {
    const header = 'nombre,rut,cargo,contrato,afp,salud,mutual,ccaf,sueldoBase,movilizacion,colacion,estado,telefono,email\n'
    const rows = personal.map(p => 
      `"${p.nombre}","${p.rut || ''}","${p.cargo || ''}","${p.contrato}","${p.afp}","${p.salud}","${p.mutual}","${p.ccaf || ''}",${p.sueldoBase},${p.movilizacion},${p.colacion},"${p.estado}","${p.telefono || ''}","${p.email || ''}"`
    ).join('\n')
    
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'personal.csv'
    a.click()
    URL.revokeObjectURL(url)
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
        <Button variant="outline" onClick={exportPersonal}>
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

      {/* Table */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Personal ({personal.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <p className="md:hidden text-xs text-slate-400 text-center py-1">← Desliza horizontalmente para ver más →</p>
          <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Nombre</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">RUT</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Cargo</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Contrato</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">AFP</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Sueldo Base</th>
                  <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Estado</th>
                  <th className="text-center p-3 text-[10px] font-bold text-slate-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="p-8 text-center text-slate-400">Cargando...</td></tr>
                ) : personal.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-slate-400">Sin personal</td></tr>
                ) : (
                  personal.map((per) => (
                    <tr key={per.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="p-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="h-7 w-7 shrink-0">
                            {per.foto ? (
                              <Image unoptimized src={per.foto} alt={`Foto de ${per.nombre}`} width={28} height={28} className="h-7 w-7 rounded-full object-cover" />
                            ) : (
                            <AvatarFallback className="bg-[#0f2040] text-white text-xs font-bold">
                              {per.nombre.charAt(0)}
                            </AvatarFallback>
                            )}
                          </Avatar>
                          <span className="font-semibold truncate" title={per.nombre}>{per.nombre}</span>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-xs whitespace-nowrap">{per.rut || '–'}</td>
                      <td className="p-3 max-w-[150px] truncate" title={per.cargo || ''}>{per.cargo || '–'}</td>
                      <td className="p-3">
                        <Badge className={contratoColors[per.contrato] || 'bg-slate-100'}>{per.contrato}</Badge>
                      </td>
                      <td className="p-3 text-xs whitespace-nowrap">{per.afp}</td>
                      <td className="p-3 font-mono text-xs whitespace-nowrap">{formatCLP(per.sueldoBase)}</td>
                      <td className="p-3">
                        <Badge className={estadoColors[per.estado] || 'bg-slate-100'}>{per.estado}</Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-center gap-1">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7 text-amber-600 hover:text-amber-700" 
                            title="Descargar Liquidación"
                            onClick={() => {
                              window.open(`/api/pdf/liquidacion/${per.id}`, '_blank')
                            }}
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openDialog(per)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:text-red-700" onClick={() => handleDelete(per.id)}>
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

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Importar Personal desde Excel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-slate-50 p-4 rounded-lg text-sm">
              <p className="font-semibold mb-2">Formato esperado del archivo Excel:</p>
              <ul className="text-xs text-slate-600 space-y-1">
                <li>• <strong>Nombre:</strong> Nombre completo</li>
                <li>• <strong>RUT:</strong> RUT del empleado</li>
                <li>• <strong>Cargo:</strong> Cargo del empleado</li>
                <li>• <strong>Contrato:</strong> Indefinido, Plazo Fijo, etc.</li>
                <li>• <strong>AFP:</strong> AFP del empleado</li>
                <li>• <strong>Salud:</strong> Fonasa, Isapre, etc.</li>
                <li>• <strong>Sueldo:</strong> Sueldo base</li>
                <li>• <strong>Estado:</strong> Activo, Vacaciones, etc.</li>
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

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPer ? 'Editar' : 'Nuevo'} Empleado</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <Label>Nombre Completo</Label>
                <Input className="w-full" value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} />
              </div>
              <div className="space-y-2 min-w-0">
                <Label>RUT</Label>
                <Input className="w-full" value={formData.rut} onChange={(e) => setFormData({...formData, rut: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <Label>Cargo</Label>
                <Input className="w-full" value={formData.cargo} onChange={(e) => setFormData({...formData, cargo: e.target.value})} />
              </div>
              <div className="space-y-2 min-w-0">
                <Label>Contrato</Label>
                <Select value={formData.contrato} onValueChange={(v) => setFormData({...formData, contrato: v})}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Indefinido', 'Plazo Fijo', 'Por Obra', 'Part-Time'].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <Label>Fecha Ingreso</Label>
                <Input className="w-full" type="date" value={formData.fechaIngreso} onChange={(e) => setFormData({...formData, fechaIngreso: e.target.value})} />
              </div>
              <div className="space-y-2 min-w-0">
                <Label>Estado</Label>
                <Select value={formData.estado} onValueChange={(v) => setFormData({...formData, estado: v})}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Activo', 'Vacaciones', 'Licencia', 'Inactivo'].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="text-xs font-semibold text-slate-500 mb-3">REMUNERACIÓN</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 min-w-0">
                  <Label>Sueldo Base ($)</Label>
                  <Input className="w-full text-right" type="number" value={formData.sueldoBase} onChange={(e) => setFormData({...formData, sueldoBase: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="space-y-2 min-w-0">
                  <Label>Movilización ($)</Label>
                  <Input className="w-full text-right" type="number" value={formData.movilizacion} onChange={(e) => setFormData({...formData, movilizacion: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="space-y-2 min-w-0">
                  <Label>Colación ($)</Label>
                  <Input className="w-full text-right" type="number" value={formData.colacion} onChange={(e) => setFormData({...formData, colacion: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="space-y-2 min-w-0">
                  <Label>Viático ($)</Label>
                  <Input className="w-full text-right" type="number" value={formData.viatico} onChange={(e) => setFormData({...formData, viatico: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="space-y-2 min-w-0">
                  <Label>Asignación Familiar ($)</Label>
                  <Input className="w-full text-right" type="number" value={formData.asigFamiliar} onChange={(e) => setFormData({...formData, asigFamiliar: parseFloat(e.target.value) || 0})} />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="text-xs font-semibold text-slate-500 mb-3">PREVISIÓN</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 min-w-0">
                  <Label>AFP</Label>
                  <Select value={formData.afp} onValueChange={(v) => setFormData({...formData, afp: v})}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['ProVida', 'Cuprum', 'Habitat', 'Capital', 'Planvital', 'Modelo', 'Uno'].map(a => (
                        <SelectItem key={a} value={a}>{a}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 min-w-0">
                  <Label>Salud</Label>
                  <Select value={formData.salud} onValueChange={(v) => setFormData({...formData, salud: v})}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['Fonasa', 'Cruz del Norte', 'Banmédica', 'Colmena', 'Consalud', 'Vida Tres', 'MasVida'].map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 min-w-0">
                  <Label>Mutual</Label>
                  <Select value={formData.mutual} onValueChange={(v) => setFormData({...formData, mutual: v})}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['IST', 'ACHS', 'Mutual de Seguridad', 'CChC'].map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 min-w-0">
                  <Label>CCAF</Label>
                  <Input className="w-full" value={formData.ccaf} onChange={(e) => setFormData({...formData, ccaf: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="text-xs font-semibold text-slate-500 mb-3">CONTACTO</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 min-w-0">
                  <Label>Teléfono</Label>
                  <Input className="w-full" value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})} />
                </div>
                <div className="space-y-2 min-w-0">
                  <Label>Email</Label>
                  <Input className="w-full" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Foto del empleado */}
            <div className="border-t pt-4">
              <div className="text-xs font-semibold text-slate-500 mb-3">FOTOGRAFÍA</div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    {formData.foto ? (
                      <Image unoptimized src={formData.foto} alt="Foto del empleado" width={80} height={80} className="h-20 w-20 rounded-full object-cover" />
                    ) : (
                      <AvatarFallback className="bg-[#0f2040] text-white text-2xl font-bold">
                        {formData.nombre ? formData.nombre.charAt(0).toUpperCase() : '?'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  {formData.foto && (
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
                    {formData.foto ? 'Cambiar foto' : 'Subir foto'}
                  </Button>
                  <p className="text-xs text-slate-500 mt-1">JPG, PNG. Máximo 2MB</p>
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

      {/* Bulk CSV Upload Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Carga Masiva de Personal (CSV)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-slate-50 p-3 rounded-lg text-sm">
              <p className="font-semibold mb-2">Formato CSV (una línea por empleado):</p>
              <code className="text-xs bg-white p-2 rounded block">
                nombre,rut,cargo,contrato,afp,salud,mutual,ccaf,sueldoBase,movilizacion,colacion,estado,telefono,email
              </code>
              <p className="text-xs text-slate-500 mt-2">
                Ejemplo: Juan Pérez,12.345.678-9,Conserje,Indefinido,ProVida,Fonasa,IST,,500000,30000,30000,Activo,+56912345678,juan@email.com
              </p>
            </div>
            <div className="space-y-2 min-w-0">
              <Label>Datos CSV</Label>
              <Textarea
                className="w-full font-mono text-sm"
                value={bulkData}
                onChange={(e) => setBulkData(e.target.value)}
                placeholder="nombre,rut,cargo,contrato,afp,salud,mutual,ccaf,sueldoBase,movilizacion,colacion,estado,telefono,email&#10;Juan Pérez,12.345.678-9,Conserje,Indefinido,ProVida,Fonasa,IST,,500000,30000,30000,Activo,+56912345678,juan@email.com"
                rows={10}
              />
            </div>
            {uploadResult && (
              <div className={`p-3 rounded ${uploadResult.success > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                <p className="font-semibold">{uploadResult.success} empleados importados correctamente</p>
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
