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
  Layers,
  FileDown,
  ExternalLink,
  Camera,
  Clock,
  Footprints,
  CalendarDays,
  Calendar,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import QRCode from 'qrcode'
import { useSession } from '@/hooks/use-session'
import { TableroIndicadores } from '@/components/ui/tablero-indicadores'

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
const QR_COLOR = '#0f2044'

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
  const { user } = useSession()
  const isGuardia = user?.rol === 'guardia'
  const [rondas, setRondas] = useState<Ronda[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [registrosDialogOpen, setRegistrosDialogOpen] = useState(false)
  const [scanDialogOpen, setScanDialogOpen] = useState(false)
  const [cameraScanOpen, setCameraScanOpen] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [recentScans, setRecentScans] = useState<Array<{
    id: string
    nombre: string
    etapa: string
    post: string
    fecha: string
    hora: string
    status: 'success' | 'error'
    errorMsg?: string
  }>>([])
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

  // Filtros de registros
  const [registroFiltroFechaDesde, setRegistroFiltroFechaDesde] = useState('')
  const [registroFiltroFechaHasta, setRegistroFiltroFechaHasta] = useState('')
  const [registroFiltroPersonal, setRegistroFiltroPersonal] = useState('')

  // Registros filtrados
  const registrosFiltrados = useMemo(() => {
    let lista = registros
    if (registroFiltroFechaDesde) {
      lista = lista.filter((r) => r.fecha >= registroFiltroFechaDesde)
    }
    if (registroFiltroFechaHasta) {
      lista = lista.filter((r) => r.fecha <= registroFiltroFechaHasta)
    }
    if (registroFiltroPersonal.trim()) {
      const q = registroFiltroPersonal.toLowerCase()
      lista = lista.filter((r) => (r.usuarioNombre || '').toLowerCase().includes(q))
    }
    return lista
  }, [registros, registroFiltroFechaDesde, registroFiltroFechaHasta, registroFiltroPersonal])

  // Exportar registros a CSV
  const exportarRegistrosCSV = () => {
    const headers = ['Ronda', 'Usuario', 'Fecha', 'Hora', 'Ubicacion', 'Latitud', 'Longitud', 'Observaciones']
    const rows = registrosFiltrados.map((r) => [
      selectedRonda?.nombre || '',
      r.usuarioNombre || 'Desconocido',
      r.fecha,
      r.hora,
      r.ubicacion || '',
      r.latitud ?? '',
      r.longitud ?? '',
      r.observaciones || '',
    ])
    const csv = [headers, ...rows]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `registros_rondas_${selectedRonda?.codigo || 'todas'}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`CSV exportado: ${registrosFiltrados.length} registro(s)`)
  }

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
    // Auto-refresh cada 30 segundos para mantener los contadores actualizados
    // con las lecturas del guardia en tiempo real
    const interval = setInterval(() => {
      fetchRondas()
    }, 30000)
    return () => clearInterval(interval)
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
    setRegistrosDialogOpen(true)
    await fetchRegistros(ronda.id)
  }

  // Función separada para poder reutilizar en el auto-refresh
  const fetchRegistros = async (rondaId: string) => {
    try {
      const res = await fetch(`/api/rondas/${rondaId}`)
      const data = await res.json()
      setRegistros(data.registros || [])
    } catch (error) {
      console.error('Error fetching registros:', error)
    }
  }

  // Auto-refresh del diálogo de registros cada 15 segundos cuando está abierto
  useEffect(() => {
    if (registrosDialogOpen && selectedRonda) {
      const interval = setInterval(() => {
        fetchRegistros(selectedRonda.id)
      }, 15000)
      return () => clearInterval(interval)
    }
  }, [registrosDialogOpen, selectedRonda])

  const handleScanQR = () => {
    // Abrir el escáner con cámara (no el diálogo manual)
    setCameraScanOpen(true)
  }

  /**
   * Maneja un QR detectado por la cámara (o ingresado manualmente).
   * Llama a /api/rondas/registrar y registra la ronda con fecha/hora actuales.
   * El cooldown del mismo código lo maneja el escáner interno.
   */
  const handleCameraScan = async (text: string) => {
    setRegistering(true)
    try {
      const res = await fetch('/api/rondas/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: text }),
      })
      const data = await res.json()

      if (res.ok) {
        const etapa = data.ronda?.etapa || ''
        const post = data.ronda?.post || ''
        const fecha = data.registro?.fecha || new Date().toISOString().split('T')[0]
        const hora = data.registro?.hora || new Date().toTimeString().split(' ')[0].substring(0, 5)

        // Agregar al feed de registros recientes
        setRecentScans((prev) => [
          {
            id: crypto.randomUUID(),
            nombre: data.ronda?.nombre || 'Ronda',
            etapa,
            post,
            fecha,
            hora,
            status: 'success' as const,
          },
          ...prev,
        ].slice(0, 10))

        toast.success(
          `✓ Ronda registrada — ${data.ronda?.nombre || ''}${etapa ? ` · Etapa ${etapa}` : ''}${post ? ` · Posto #${post}` : ''}`,
          { duration: 4000 },
        )

        // Refrescar la lista para actualizar contadores
        fetchRondas()
      } else {
        // Error: registrar en feed con status error
        setRecentScans((prev) => [
          {
            id: crypto.randomUUID(),
            nombre: text.substring(0, 60),
            etapa: '',
            post: '',
            fecha: new Date().toISOString().split('T')[0],
            hora: new Date().toTimeString().split(' ')[0].substring(0, 5),
            status: 'error' as const,
            errorMsg: data.error || 'Error al registrar',
          },
          ...prev,
        ].slice(0, 10))

        toast.error(data.error || 'Error al registrar ronda')
      }
    } catch (error) {
      console.error('Error registering scan:', error)
      toast.error('Error de conexión al registrar ronda')
    } finally {
      setRegistering(false)
    }
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
        doc.setFillColor(15, 32, 64) // #0f2044
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

  const hoyStr = new Date().toISOString().split('T')[0]
  const hoyCount = registros.filter((r) => r.fecha === hoyStr).length
  const inicioSemana = new Date()
  inicioSemana.setDate(inicioSemana.getDate() - 6)
  const inicioSemanaStr = inicioSemana.toISOString().split('T')[0]
  const semanaCount = registros.filter((r) => r.fecha >= inicioSemanaStr).length

  return (
    <div className="space-y-6">
      <TableroIndicadores
        columnas={6}
        cards={[
          { titulo: 'Total Rondas', numero: rondas.length, icon: <QrCode className="w-5 h-5" />, color: 'purpura' },
          { titulo: 'Rondas Activas', numero: activasCount, icon: <MapPin className="w-5 h-5" />, color: 'azul' },
          { titulo: 'Total Registros', numero: totalRegistros, icon: <Footprints className="w-5 h-5" />, color: 'primary' },
          { titulo: 'Hoy', numero: hoyCount, icon: <Calendar className="w-5 h-5" />, color: 'verde' },
          { titulo: 'Esta Semana', numero: semanaCount, icon: <CalendarDays className="w-5 h-5" />, color: 'cyan' },
          { titulo: 'Etapas', numero: etapasCount, icon: <Layers className="w-5 h-5" />, color: 'naranja' },
        ]}
      />
      {/* Banner para guardia */}
      {isGuardia && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-400/30 flex items-center justify-center shrink-0">
                <Camera className="w-5 h-5 text-amber-700" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900">Modo Guardia</h3>
                <p className="text-sm text-amber-800 mt-0.5">
                  Presiona <strong>Registrar Ronda</strong> para abrir la cámara y escanear los QR de los postos.
                  Se registrará automáticamente la fecha, hora y etapa de cada posto escaneado.
                </p>
              </div>
              <Button
                onClick={() => setCameraScanOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
              >
                <Camera className="w-4 h-4 mr-2" />
                Registrar Ronda
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feed de registros recientes (solo después de escanear) */}
      {recentScans.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[#0f2044] flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Registros de esta sesión
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRecentScans([])}
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Limpiar
              </Button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recentScans.map((scan) => (
                <div
                  key={scan.id}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border ${
                    scan.status === 'success'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    scan.status === 'success' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {scan.status === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-green-700" />
                    ) : (
                      <X className="w-4 h-4 text-red-700" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {scan.status === 'success' ? scan.nombre : 'Código no reconocido'}
                    </div>
                    {scan.status === 'success' ? (
                      <div className="text-xs text-gray-600 flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        {scan.etapa && <span>Etapa: <strong>{scan.etapa}</strong></span>}
                        {scan.post && <span>Posto: <strong>#{scan.post}</strong></span>}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {scan.fecha}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {scan.hora}
                        </span>
                      </div>
                    ) : (
                      <div className="text-xs text-red-700 mt-0.5">
                        {scan.errorMsg || 'Error desconocido'} — Código: {scan.nombre}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
          <Button onClick={handleScanQR} className="bg-[#0f2044] hover:bg-[#1a3155]">
            <Camera className="w-4 h-4 mr-2" />
            Registrar Ronda
          </Button>
          {!isGuardia && (
            <>
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
            </>
          )}
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
                          <TableCell colSpan={7} className="font-semibold text-[#0f2044] py-2">
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
                                  disabled={isGuardia}
                                >
                                  <QrCode className="w-4 h-4 mr-1" />
                                  Ver QR
                                </Button>
                              </TableCell>
                              <TableCell className="text-center">
                                {ronda._count?.registros || 0}
                              </TableCell>
                              <TableCell className="text-right">
                                {!isGuardia && (
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
                                )}
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
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registros — {selectedRonda?.nombre}</DialogTitle>
          </DialogHeader>

          {/* Filtros y exportación */}
          <div className="flex flex-wrap items-end gap-3 mb-3">
            <div>
              <Label className="text-[10px] text-gray-500">Desde</Label>
              <Input
                type="date"
                value={registroFiltroFechaDesde}
                onChange={(e) => setRegistroFiltroFechaDesde(e.target.value)}
                className="h-8 text-xs w-[140px]"
              />
            </div>
            <div>
              <Label className="text-[10px] text-gray-500">Hasta</Label>
              <Input
                type="date"
                value={registroFiltroFechaHasta}
                onChange={(e) => setRegistroFiltroFechaHasta(e.target.value)}
                className="h-8 text-xs w-[140px]"
              />
            </div>
            <div>
              <Label className="text-[10px] text-gray-500">Personal</Label>
              <Input
                placeholder="Nombre..."
                value={registroFiltroPersonal}
                onChange={(e) => setRegistroFiltroPersonal(e.target.value)}
                className="h-8 text-xs w-[150px]"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => exportarRegistrosCSV()}
              disabled={registrosFiltrados.length === 0}
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Exportar CSV
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Usuario</TableHead>
                  <TableHead className="min-w-[90px]">Fecha</TableHead>
                  <TableHead className="min-w-[70px]">Hora</TableHead>
                  <TableHead className="min-w-[150px]">Ubicación</TableHead>
                  <TableHead className="min-w-[100px]">GPS</TableHead>
                  <TableHead className="min-w-[100px]">Observaciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                      No hay registros con los filtros seleccionados
                    </TableCell>
                  </TableRow>
                ) : (
                  registrosFiltrados.map((reg) => (
                    <TableRow key={reg.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          {reg.usuarioNombre || 'Desconocido'}
                        </div>
                      </TableCell>
                      <TableCell>{reg.fecha}</TableCell>
                      <TableCell>{reg.hora}</TableCell>
                      <TableCell className="text-xs">{reg.ubicacion || '-'}</TableCell>
                      <TableCell className="text-xs">
                        {reg.latitud != null && reg.longitud != null ? (
                          <a
                            href={`https://www.google.com/maps?q=${reg.latitud},${reg.longitud}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {reg.latitud.toFixed(5)}, {reg.longitud.toFixed(5)}
                          </a>
                        ) : (
                          <span className="text-gray-400">Sin GPS</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{reg.observaciones || '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {registrosFiltrados.length > 0 && (
            <p className="text-xs text-gray-500 text-right">
              {registrosFiltrados.length} registro(s) de {registros.length} total
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Scan QR Dialog (ingreso manual — fallback) */}
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

      {/* Camera Scanner Dialog */}
      <Dialog open={cameraScanOpen} onOpenChange={(open) => {
        setCameraScanOpen(open)
        if (!open) setRegistering(false)
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-[#0f2044]" />
              Registrar Ronda — Escaneo QR
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Apunta la cámara al QR del posto. Se registrará automáticamente con fecha y hora actuales.
              Puedes escanear varios postos en secuencia sin cerrar esta ventana.
            </p>
            {/* El escáner de cámara está en la página dedicada del guardia /rondas-guardia */}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCameraScanOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
