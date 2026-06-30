'use client'

import { Fragment, useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
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
import {
  Search,
  Plus,
  MoreHorizontal,
  QrCode,
  MapPin,
  User,
  Download,
  Trash2,
  Eye,
  CheckCircle,
  Scan,
  Layers,
  FileDown,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import QRCode from 'qrcode'

interface Ronda {
  id: string
  nombre: string
  codigo: string
  ubicacion: string
  descripcion?: string | null
  activo: boolean
  qrCodigo?: string | null
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

// Etapas conocidas del Condominio Laguna Norte (8 etapas × 4 postos = 32 rondas)
const ETAPAS_NOMBRES: Record<string, string> = {
  ALBATROS: 'Albatros',
  BANDURRIAS: 'Bandurrias',
  BECACINAS: 'Becacinas',
  CANQUEN: 'Canquén',
  FAISANES: 'Faisanes',
  FLAMENCOS: 'Flamencos',
  GARZAS: 'Garzas',
  GAVIOTAS: 'Gaviotas',
}

// Orden canónico de las etapas
const ETAPAS_ORDER = Object.keys(ETAPAS_NOMBRES)

// Color corporativo para los QR
const QR_COLOR = '#0f2040'

/**
 * Extrae { etapa, post } desde la URL del qrCodigo.
 * Soporta URLs completas (https://condominios-cyj.vercel.app/ronda/ALBATROS/1)
 * y paths relativos (/ronda/ALBATROS/1).
 */
function extractEtapaPost(qrCodigo?: string | null): { etapa: string; post: string } | null {
  if (!qrCodigo) return null
  try {
    let parts: string[]
    if (qrCodigo.startsWith('http')) {
      const url = new URL(qrCodigo)
      parts = url.pathname.split('/').filter(Boolean)
    } else {
      parts = qrCodigo.split('/').filter(Boolean)
    }
    if (parts.length >= 3 && parts[0].toLowerCase() === 'ronda') {
      return { etapa: parts[1].toUpperCase(), post: parts[2] }
    }
  } catch {
    return null
  }
  return null
}

function getEtapaKey(ronda: Ronda): string {
  const ep = extractEtapaPost(ronda.qrCodigo)
  if (ep) return ep.etapa
  // Fallback: usar la ubicación en mayúsculas o "OTRAS"
  return ronda.ubicacion?.trim()?.toUpperCase() || 'OTRAS'
}

function getPostNumber(ronda: Ronda): string | null {
  return extractEtapaPost(ronda.qrCodigo)?.post || null
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
    descripcion: '',
  })
  const [scanResult, setScanResult] = useState<string>('')
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [qrLoading, setQrLoading] = useState(false)
  const [downloadingAll, setDownloadingAll] = useState(false)

  const fetchRondas = async () => {
    try {
      const res = await fetch('/api/rondas')
      const data = await res.json()
      setRondas(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching rondas:', error)
      toast.error('Error al cargar rondas')
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
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        toast.success('Ronda creada exitosamente')
        await fetchRondas()
        setDialogOpen(false)
        setFormData({ nombre: '', ubicacion: '', descripcion: '' })
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Error al crear ronda')
      }
    } catch (error) {
      console.error('Error creating ronda:', error)
      toast.error('Error al crear ronda')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Está seguro de eliminar esta ronda?')) return

    try {
      await fetch(`/api/rondas/${id}`, { method: 'DELETE' })
      toast.success('Ronda eliminada')
      await fetchRondas()
    } catch (error) {
      console.error('Error deleting ronda:', error)
      toast.error('Error al eliminar ronda')
    }
  }

  // Genera un QR como data URL usando el paquete `qrcode`
  const generateQR = async (text: string): Promise<string> => {
    return await QRCode.toDataURL(text, {
      width: 300,
      margin: 1,
      color: { dark: QR_COLOR, light: '#ffffff' },
    })
  }

  const handleViewQR = async (ronda: Ronda) => {
    setSelectedRonda(ronda)
    setQrDialogOpen(true)
    setQrLoading(true)
    setQrDataUrl('')
    try {
      const data = ronda.qrCodigo || ronda.codigo
      const url = await generateQR(data)
      setQrDataUrl(url)
    } catch (error) {
      console.error('Error generating QR:', error)
      toast.error('Error al generar QR')
    } finally {
      setQrLoading(false)
    }
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
        body: JSON.stringify({ codigo: scanResult.trim() }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(`¡Ronda registrada! ${data.ronda?.nombre || ''}`)
        setScanDialogOpen(false)
        setScanResult('')
        fetchRondas()
      } else {
        toast.error(data.error || 'Error al registrar ronda')
      }
    } catch (error) {
      console.error('Error registering scan:', error)
      toast.error('Error al registrar ronda')
    }
  }

  const exportToCSV = () => {
    const headers = ['Nombre', 'Código', 'Ubicación', 'Estado', 'QR', 'Registros', 'Fecha Creación']
    const rows = rondas.map((r) => [
      r.nombre,
      r.codigo,
      r.ubicacion,
      r.activo ? 'Activo' : 'Inactivo',
      r.qrCodigo || '',
      r._count?.registros || 0,
      new Date(r.createdAt).toLocaleDateString('es-CL'),
    ])

    const csv = [headers, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rondas_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exportado')
  }

  const downloadQRPng = async (ronda: Ronda) => {
    try {
      const data = ronda.qrCodigo || ronda.codigo
      const url = await generateQR(data)
      const a = document.createElement('a')
      a.href = url
      a.download = `qr_${ronda.codigo}.png`
      a.click()
      toast.success('QR descargado')
    } catch (error) {
      console.error('Error downloading QR:', error)
      toast.error('Error al descargar QR')
    }
  }

  const openRondaPage = (ronda: Ronda) => {
    const ep = extractEtapaPost(ronda.qrCodigo)
    if (ep) {
      window.open(`/ronda/${ep.etapa}/${ep.post}`, '_blank')
      return
    }
    if (ronda.qrCodigo && ronda.qrCodigo.startsWith('http')) {
      window.open(ronda.qrCodigo, '_blank')
      return
    }
    toast.error('Esta ronda no tiene URL pública asociada')
  }

  /**
   * Genera un PDF con todos los QR de las rondas (6×6 cm cada uno).
   * Usa dynamic import de `jspdf` y `qrcode` para no inflar el bundle inicial.
   */
  const downloadAllQRsPDF = async () => {
    if (rondas.length === 0) {
      toast.error('No hay rondas para exportar')
      return
    }
    setDownloadingAll(true)
    try {
      const { default: jsPDF } = await import('jspdf')

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth() // 210 mm A4
      const pageHeight = doc.internal.pageSize.getHeight() // 297 mm A4
      const margin = 15
      const qrSize = 60 // 6 cm
      const labelGap = 2
      const rowGap = 8
      const cols = 3
      const colWidth = (pageWidth - margin * 2) / cols
      const cellHeight = qrSize + 14 // QR + etiqueta (2 líneas + sub-línea)
      const startY = margin + 18 // espacio para header

      const drawHeader = (pageNumber: number) => {
        doc.setFillColor(15, 32, 64) // #0f2040
        doc.rect(0, 0, pageWidth, 18, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text('Códigos QR — Rondas', margin, 12)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text(
          `Generado: ${new Date().toLocaleString('es-CL')}  ·  Total: ${rondas.length} rondas  ·  Página ${pageNumber}`,
          margin,
          16,
        )
      }

      drawHeader(1)

      let col = 0
      let row = 0
      let pageNumber = 1

      for (let i = 0; i < rondas.length; i++) {
        const ronda = rondas[i]
        const data = ronda.qrCodigo || ronda.codigo

        const x = margin + col * colWidth
        const y = startY + row * (cellHeight + rowGap)

        // Centrar QR dentro de su columna
        const qrX = x + (colWidth - qrSize) / 2

        try {
          const dataUrl = await QRCode.toDataURL(data, {
            width: 300,
            margin: 1,
            color: { dark: QR_COLOR, light: '#ffffff' },
          })
          doc.addImage(dataUrl, 'PNG', qrX, y, qrSize, qrSize)
        } catch (err) {
          console.error('Error generando QR para', ronda.codigo, err)
          // Dibujar placeholder si falla
          doc.setDrawColor(200)
          doc.rect(qrX, y, qrSize, qrSize)
          doc.setTextColor(150)
          doc.setFontSize(8)
          doc.text('QR no disponible', qrX + 5, y + qrSize / 2)
        }

        // Etiqueta bajo el QR
        let labelY = y + qrSize + labelGap + 4
        doc.setTextColor(15, 32, 64)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        const labelLines = doc.splitTextToSize(ronda.nombre, colWidth - 4)
        doc.text(labelLines.slice(0, 2), x + 2, labelY)
        labelY += labelLines.slice(0, 2).length * 4

        // Sub-etiqueta con etapa / posto
        const ep = extractEtapaPost(ronda.qrCodigo)
        if (ep) {
          const etapaNombre = ETAPAS_NOMBRES[ep.etapa] || ep.etapa
          doc.setFontSize(7)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(100)
          doc.text(`${etapaNombre} · Posto #${ep.post}`, x + 2, labelY)
        }

        col++
        if (col >= cols) {
          col = 0
          row++
          // Salto de página si no caben más filas
          if (startY + (row + 1) * (cellHeight + rowGap) > pageHeight - margin) {
            doc.addPage()
            pageNumber++
            drawHeader(pageNumber)
            row = 0
          }
        }
      }

      doc.save(`rondas_qr_${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success(`PDF con ${rondas.length} QR generado`)
    } catch (error) {
      console.error('Error generando PDF:', error)
      toast.error('Error al generar PDF')
    } finally {
      setDownloadingAll(false)
    }
  }

  // Agrupar rondas por etapa (orden canónico)
  const groupedRondas = useMemo(() => {
    const groups: Record<string, Ronda[]> = {}
    for (const r of rondas) {
      const key = getEtapaKey(r)
      if (!groups[key]) groups[key] = []
      groups[key].push(r)
    }
    // Ordenar rondas dentro de cada grupo por número de posto
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => {
        const pa = parseInt(getPostNumber(a) || '0', 10)
        const pb = parseInt(getPostNumber(b) || '0', 10)
        return pa - pb
      })
    }
    // Ordenar grupos: primero etapas conocidas (en orden canónico), luego otras alfabéticamente
    const known = ETAPAS_ORDER.filter((k) => groups[k])
    const others = Object.keys(groups)
      .filter((k) => !ETAPAS_ORDER.includes(k))
      .sort((a, b) => a.localeCompare(b))
    return [...known, ...others].map((key) => ({ etapa: key, rondas: groups[key] }))
  }, [rondas])

  const filteredGroupedRondas = useMemo(() => {
    if (!search.trim()) return groupedRondas
    const q = search.toLowerCase()
    return groupedRondas
      .map((g) => ({
        ...g,
        rondas: g.rondas.filter(
          (r) =>
            r.nombre.toLowerCase().includes(q) ||
            r.codigo.toLowerCase().includes(q) ||
            r.ubicacion.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.rondas.length > 0)
  }, [groupedRondas, search])

  const totalRegistros = rondas.reduce((acc, r) => acc + (r._count?.registros || 0), 0)
  const activasCount = rondas.filter((r) => r.activo).length
  const etapasCount = groupedRondas.length

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
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
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activasCount}</p>
                <p className="text-sm text-gray-500">Activas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                <Scan className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalRegistros}</p>
                <p className="text-sm text-gray-500">Registros Totales</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{etapasCount}</p>
                <p className="text-sm text-gray-500">Etapas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar rondas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleScanQR}>
            <Scan className="w-4 h-4 mr-2" />
            Escanear QR
          </Button>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button
            variant="outline"
            onClick={downloadAllQRsPDF}
            disabled={downloadingAll || rondas.length === 0}
          >
            <FileDown className="w-4 h-4 mr-2" />
            {downloadingAll ? 'Generando PDF...' : 'Descargar Todos los QR'}
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Ronda
          </Button>
        </div>
      </div>

      {/* Mobile hint */}
      <p className="text-xs text-gray-500 md:hidden">
        💡 Desliza la tabla horizontalmente para ver todas las columnas →
      </p>

      {/* Table grouped by etapa */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Nombre</TableHead>
                  <TableHead className="min-w-[140px]">Código</TableHead>
                  <TableHead className="min-w-[160px]">Ubicación</TableHead>
                  <TableHead className="min-w-[100px]">Estado</TableHead>
                  <TableHead className="min-w-[110px]">QR</TableHead>
                  <TableHead className="min-w-[90px] text-center">Registros</TableHead>
                  <TableHead className="min-w-[80px] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : filteredGroupedRondas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No hay rondas registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGroupedRondas.map((group) => {
                    const etapaNombre = ETAPAS_NOMBRES[group.etapa] || group.etapa
                    return (
                      <Fragment key={group.etapa}>
                        {/* Fila separadora de etapa */}
                        <TableRow className="bg-slate-50 hover:bg-slate-50 border-y border-slate-200">
                          <TableCell colSpan={7} className="font-semibold text-[#0f2040] py-2">
                            <div className="flex items-center gap-2">
                              <Layers className="w-4 h-4" />
                              Etapa {etapaNombre}
                              <Badge variant="secondary" className="ml-1">
                                {group.rondas.length} rondas
                              </Badge>
                            </div>
                          </TableCell>
                        </TableRow>
                        {group.rondas.map((ronda) => {
                          const ep = extractEtapaPost(ronda.qrCodigo)
                          return (
                            <TableRow key={ronda.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                  <div>
                                    <div>{ronda.nombre}</div>
                                    {ep && (
                                      <span className="block text-xs text-gray-500">
                                        Posto #{ep.post}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                  {ronda.codigo}
                                </code>
                              </TableCell>
                              <TableCell className="text-sm">{ronda.ubicacion}</TableCell>
                              <TableCell>
                                <Badge variant={ronda.activo ? 'default' : 'secondary'}>
                                  {ronda.activo ? 'Activo' : 'Inactivo'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewQR(ronda)}
                                >
                                  <QrCode className="w-4 h-4 mr-1" />
                                  Ver QR
                                </Button>
                              </TableCell>
                              <TableCell className="text-center">
                                {ronda._count?.registros || 0}
                              </TableCell>
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
                                    <DropdownMenuItem onClick={() => openRondaPage(ronda)}>
                                      <ExternalLink className="w-4 h-4 mr-2" />
                                      Abrir página
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
                          )
                        })}
                      </Fragment>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
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
            <DialogTitle>Código QR — {selectedRonda?.nombre}</DialogTitle>
          </DialogHeader>
          {selectedRonda && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-64 h-64 border rounded-lg flex items-center justify-center bg-white">
                {qrLoading ? (
                  <p className="text-sm text-gray-500">Generando QR...</p>
                ) : qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrDataUrl} alt="QR Code" className="w-full h-full p-2" />
                ) : (
                  <p className="text-sm text-gray-500">Sin QR</p>
                )}
              </div>
              <div className="text-center w-full">
                <p className="font-medium">{selectedRonda.nombre}</p>
                <p className="text-sm text-gray-500">{selectedRonda.ubicacion}</p>
                <div className="mt-2 p-2 bg-gray-100 rounded text-xs break-all">
                  <code>{selectedRonda.qrCodigo || selectedRonda.codigo}</code>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 w-full">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => downloadQRPng(selectedRonda)}
                  disabled={qrLoading}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar QR
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => openRondaPage(selectedRonda)}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir página
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Registros Dialog */}
      <Dialog open={registrosDialogOpen} onOpenChange={setRegistrosDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registros — {selectedRonda?.nombre}</DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto">
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
          </div>
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
