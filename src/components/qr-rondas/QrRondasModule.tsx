'use client'

/**
 * QrRondasModule — Módulo de Rondas QR de Guardias
 * Sistema de Gestión de Condominios (escritorio) — condominios-cyj
 *
 * Esta vista usa las MISMAS tablas compartidas (MovilQrLocation, MovilQrScan)
 * que la app móvil (laguna-norte-gestion). Por lo tanto:
 *   - Los QR creados aquí aparecen instantáneamente en la app móvil
 *   - Los escaneos que haga un guardia en la app móvil aparecen aquí en tiempo real
 *
 * Funcionalidades:
 *   - Pestaña "Ubicaciones": lista, crear, editar, eliminar, generar QR imprimible
 *   - Pestaña "Lecturas": historial de escaneos con filtros (ubicación, guardia, fecha)
 *   - Exportar PDF de QR individuales o en lote
 *   - Actualización automática cada 15s para ver nuevas lecturas
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { useSession } from '@/hooks/use-session'
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
  Clock,
  RefreshCw,
  Printer,
  MapPinned,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react'

// ─── Tipos ───

interface QrLocation {
  id: string
  name: string
  description: string
  location: string
  code: string
  active: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
  scanCount?: number
}

interface QrScan {
  id: string
  qrLocationId: string
  scannedBy: string
  profileId: string | null
  latitude: number | null
  longitude: number | null
  notes: string
  createdAt: string
  location: {
    id: string
    name: string
    location: string
    code: string
  } | null
}

// ─── Utilidades ───

/** Formatea una fecha ISO/timestamp en hora de Chile (America/Santiago). */
function formatDateTimeCL(iso: string | number | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(d)
    .replace(',', '')
}

function formatDateInputCL(date: Date): string {
  // YYYY-MM-DD para inputs <input type=date> en zona Chile
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function startOfDayCL(date: Date): number {
  // Devuelve el timestamp UTC correspondiente al inicio del día Chile
  const yyyymmdd = formatDateInputCL(date)
  // 00:00 hora Chile = 04:00 UTC (Chile está en UTC-4 invierno / UTC-3 verano)
  // Para simplificar y ser consistente, obtenemos el inicio del día via Date.UTC
  // y le restamos el offset de Chile. Pero como el offset varía, mejor usar
  // el string YYYY-MM-DD y dejar que el servidor lo interprete como "ese día en Chile".
  const [y, m, d] = yyyymmdd.split('-').map(Number)
  // Creamos una fecha en UTC al mediodía para evitar offsets de timezone
  return Date.UTC(y, m - 1, d, 12, 0, 0)
}

// ─── Componente principal ───

export function QrRondasModule() {
  const { isAdmin } = useSession()
  const [tab, setTab] = useState<'ubicaciones' | 'lecturas'>('ubicaciones')
  const [locations, setLocations] = useState<QrLocation[]>([])
  const [scans, setScans] = useState<QrScan[]>([])
  const [scansTotal, setScansTotal] = useState(0)
  const [loadingLocations, setLoadingLocations] = useState(true)
  const [loadingScans, setLoadingScans] = useState(true)
  const [refreshingLocations, setRefreshingLocations] = useState(false)
  const [refreshingScans, setRefreshingScans] = useState(false)
  const [deletingScanId, setDeletingScanId] = useState<string | null>(null)

  // Formulario de ubicación
  const [showFormModal, setShowFormModal] = useState(false)
  const [editingLocation, setEditingLocation] = useState<QrLocation | null>(null)
  const [formName, setFormName] = useState('')
  const [formCode, setFormCode] = useState('')
  const [formLocation, setFormLocation] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formActive, setFormActive] = useState(true)
  const [savingLocation, setSavingLocation] = useState(false)

  // Vista previa de QR
  const [qrPreview, setQrPreview] = useState<string>('')

  // Filtros de lecturas
  const [filterLocationId, setFilterLocationId] = useState<string>('all')
  const [filterGuardia, setFilterGuardia] = useState<string>('all')
  const [filterFromDate, setFilterFromDate] = useState<string>('')
  const [filterToDate, setFilterToDate] = useState<string>('')

  // Modal de QR
  const [showQrModal, setShowQrModal] = useState(false)
  const [qrModalLocation, setQrModalLocation] = useState<QrLocation | null>(null)
  const [qrModalImage, setQrModalImage] = useState<string>('')

  // Lista única de guardias para el filtro
  const [guardias, setGuardias] = useState<string[]>([])

  // ─── Cargar ubicaciones ───
  const fetchLocations = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshingLocations(true)
    try {
      const res = await fetch('/api/qr-rondas/locations', { cache: 'no-store' })
      if (!res.ok) throw new Error('Error al cargar ubicaciones')
      const data = await res.json()
      setLocations(Array.isArray(data) ? data : [])
      if (isRefresh) toast.success(`${Array.isArray(data) ? data.length : 0} ubicaciones cargadas`)
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar ubicaciones QR')
    } finally {
      setLoadingLocations(false)
      setRefreshingLocations(false)
    }
  }, [])

  // ─── Cargar escaneos ───
  const fetchScans = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshingScans(true)
    try {
      const params = new URLSearchParams()
      if (filterLocationId !== 'all') params.set('qrLocationId', filterLocationId)
      if (filterGuardia !== 'all') params.set('scannedBy', filterGuardia)
      if (filterFromDate) params.set('from', String(startOfDayCL(new Date(filterFromDate))))
      if (filterToDate) {
        // Fin del día: +1 día
        const end = new Date(filterToDate)
        end.setDate(end.getDate() + 1)
        params.set('to', String(startOfDayCL(end)))
      }
      params.set('limit', '500')
      // cache: 'no-store' + timestamp para evitar cualquier caché del navegador
      params.set('_t', String(Date.now()))
      const res = await fetch(`/api/qr-rondas/scans?${params.toString()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Error al cargar lecturas')
      const data = await res.json()
      const newScans = Array.isArray(data.scans) ? data.scans : []
      const newTotal = data.total || 0
      setScans(newScans)
      setScansTotal(newTotal)
      // Extraer guardias únicos para el filtro
      const uniqueGuardias = Array.from(
        new Set(newScans.map((s: QrScan) => s.scannedBy).filter(Boolean)),
      ) as string[]
      setGuardias(uniqueGuardias.sort())
      if (isRefresh) toast.success(`${newTotal} lecturas cargadas`)
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar lecturas')
    } finally {
      setLoadingScans(false)
      setRefreshingScans(false)
    }
  }, [filterLocationId, filterGuardia, filterFromDate, filterToDate])

  useEffect(() => {
    fetchLocations()
  }, [fetchLocations])

  useEffect(() => {
    fetchScans()
  }, [fetchScans])

  // Auto-refresh lecturas cada 15s (silencioso, sin toast ni spinner)
  useEffect(() => {
    if (tab !== 'lecturas') return
    const interval = setInterval(() => { fetchScans(false) }, 15000)
    return () => clearInterval(interval)
  }, [tab, fetchScans])

  // ─── Abrir modal de crear/editar ───
  const openCreateModal = () => {
    setEditingLocation(null)
    setFormName('')
    setFormCode('')
    setFormLocation('')
    setFormDescription('')
    setFormActive(true)
    setQrPreview('')
    setShowFormModal(true)
  }

  const openEditModal = (loc: QrLocation) => {
    setEditingLocation(loc)
    setFormName(loc.name)
    setFormCode(loc.code)
    setFormLocation(loc.location)
    setFormDescription(loc.description)
    setFormActive(loc.active)
    setQrPreview('')
    setShowFormModal(true)
  }

  // ─── Vista previa del QR ───
  useEffect(() => {
    if (!formCode.trim()) {
      setQrPreview('')
      return
    }
    let cancelled = false
    fetch(`/api/qr-rondas/generate?code=${encodeURIComponent(formCode.trim())}&size=256`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.dataUrl) setQrPreview(data.dataUrl)
      })
      .catch(() => { /* ignore */ })
    return () => { cancelled = true }
  }, [formCode])

  // ─── Guardar ubicación ───
  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }
    if (!formCode.trim()) {
      toast.error('El código QR es obligatorio')
      return
    }
    setSavingLocation(true)
    try {
      const payload = {
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        location: formLocation.trim(),
        description: formDescription.trim(),
        active: formActive,
      }
      const url = editingLocation
        ? `/api/qr-rondas/locations/${editingLocation.id}`
        : '/api/qr-rondas/locations'
      const method = editingLocation ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al guardar')
      }
      toast.success(editingLocation ? 'Ubicación actualizada' : 'Ubicación creada')
      setShowFormModal(false)
      fetchLocations()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSavingLocation(false)
    }
  }

  // ─── Eliminar (desactivar) ubicación ───
  const handleDelete = async (loc: QrLocation) => {
    if (!confirm(`¿Eliminar la ubicación "${loc.name}"? Se mantendrá el historial de escaneos pero la ubicación quedará inactiva.`)) {
      return
    }
    try {
      const res = await fetch(`/api/qr-rondas/locations/${loc.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')
      toast.success('Ubicación eliminada')
      fetchLocations()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar')
    }
  }

  // ─── Eliminar un escaneo individual (solo admin) ───
  const handleDeleteScan = async (scan: QrScan) => {
    if (!isAdmin()) {
      toast.error('Solo el administrador puede eliminar lecturas')
      return
    }
    const guardiaName = scan.scannedBy || '(sin guardia)'
    const fecha = formatDateTimeCL(scan.createdAt)
    if (!confirm(`¿Eliminar esta lectura?\n\nGuardia: ${guardiaName}\nFecha: ${fecha}\nUbicación: ${scan.location?.name ?? '—'}\n\nEsta acción no se puede deshacer.`)) {
      return
    }
    setDeletingScanId(scan.id)
    try {
      const res = await fetch(`/api/qr-rondas/scans/${scan.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al eliminar')
      }
      toast.success('Lectura eliminada')
      // Refrescar lista (silencioso)
      fetchScans(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar lectura')
    } finally {
      setDeletingScanId(null)
    }
  }

  // ─── Eliminar todas las lecturas de prueba (solo admin) ───
  // Se consideran "de prueba" los escaneos cuyo scannedBy contenga palabras
  // como TEST, PRUEBA, TEST-FINAL, etc., o que no tengan profileId válido.
  const handleDeleteTestScans = async () => {
    if (!isAdmin()) {
      toast.error('Solo el administrador puede eliminar lecturas')
      return
    }
    const testKeywords = ['TEST', 'PRUEBA', 'TEST-FINAL', 'TEST-SISTEMA', 'TEST-VERIFICACION', 'TEST-DIRECT']
    const testScans = scans.filter((s) => {
      const name = (s.scannedBy || '').toUpperCase()
      return testKeywords.some((k) => name.includes(k))
    })
    if (testScans.length === 0) {
      toast.info('No se encontraron lecturas de prueba (TEST, PRUEBA, etc.)')
      return
    }
    if (!confirm(`¿Eliminar ${testScans.length} lectura(s) de prueba?\n\nSe eliminarán las lecturas cuyo guardia contenga: TEST, PRUEBA, TEST-FINAL, etc.\n\nEsta acción no se puede deshacer.`)) {
      return
    }
    let deleted = 0
    let failed = 0
    for (const s of testScans) {
      try {
        const res = await fetch(`/api/qr-rondas/scans/${s.id}`, { method: 'DELETE' })
        if (res.ok) deleted++
        else failed++
      } catch {
        failed++
      }
    }
    toast.success(`${deleted} lectura(s) de prueba eliminada(s)${failed > 0 ? `, ${failed} fallida(s)` : ''}`)
    fetchScans(false)
  }

  // ─── Ver QR grande ───
  const openQrModal = async (loc: QrLocation) => {
    setQrModalLocation(loc)
    setQrModalImage('')
    setShowQrModal(true)
    try {
      const res = await fetch(`/api/qr-rondas/generate?code=${encodeURIComponent(loc.code)}&size=512`)
      const data = await res.json()
      setQrModalImage(data.dataUrl || '')
    } catch {
      toast.error('Error al generar QR')
    }
  }

  // ─── Descargar QR individual ───
  const downloadQr = async (loc: QrLocation) => {
    try {
      const res = await fetch(`/api/qr-rondas/generate?code=${encodeURIComponent(loc.code)}&size=512`)
      const data = await res.json()
      if (!data.dataUrl) throw new Error('Sin imagen')
      const link = document.createElement('a')
      link.href = data.dataUrl
      link.download = `QR-${loc.code}-${loc.name}.png`
      link.click()
      toast.success('QR descargado')
    } catch (err) {
      toast.error('Error al descargar QR')
    }
  }

  // ─── Imprimir QR ───
  const printQr = async (loc: QrLocation) => {
    try {
      const res = await fetch(`/api/qr-rondas/generate?code=${encodeURIComponent(loc.code)}&size=512`)
      const data = await res.json()
      if (!data.dataUrl) throw new Error('Sin imagen')
      const w = window.open('', '_blank', 'width=600,height=800')
      if (!w) {
        toast.error('Bloqueado: permite popups para imprimir')
        return
      }
      w.document.write(`
        <html>
          <head>
            <title>QR - ${loc.name}</title>
            <style>
              @page { size: letter; margin: 2cm; }
              body { font-family: -apple-system, system-ui, sans-serif; text-align: center; padding: 2cm 0; }
              .qr { max-width: 60mm; margin: 0 auto; }
              .qr img { width: 100%; height: auto; }
              h1 { font-size: 18pt; margin: 12mm 0 2mm; color: #0f2044; }
              .code { font-size: 12pt; color: #555; font-family: monospace; margin-bottom: 2mm; }
              .location { font-size: 11pt; color: #777; }
            </style>
          </head>
          <body>
            <div class="qr"><img src="${data.dataUrl}" /></div>
            <h1>${loc.name}</h1>
            <div class="code">${loc.code}</div>
            ${loc.location ? `<div class="location">${loc.location}</div>` : ''}
            <script>window.onload = () => { window.print(); };</script>
          </body>
        </html>
      `)
      w.document.close()
    } catch (err) {
      toast.error('Error al imprimir QR')
    }
  }

  // ─── Imprimir todos los QR ───
  const printAllQrs = async () => {
    const active = locations.filter((l) => l.active)
    if (active.length === 0) {
      toast.error('No hay ubicaciones activas')
      return
    }
    toast.info(`Generando ${active.length} códigos QR...`)
    try {
      const items: { name: string; code: string; location: string; dataUrl: string }[] = []
      for (const loc of active) {
        const res = await fetch(`/api/qr-rondas/generate?code=${encodeURIComponent(loc.code)}&size=512`)
        const data = await res.json()
        if (data.dataUrl) {
          items.push({ name: loc.name, code: loc.code, location: loc.location, dataUrl: data.dataUrl })
        }
      }
      if (items.length === 0) {
        toast.error('No se pudieron generar los QR')
        return
      }
      const w = window.open('', '_blank', 'width=900,height=700')
      if (!w) {
        toast.error('Bloqueado: permite popups para imprimir')
        return
      }
      const cells = items.map((item, i) => `
        <div class="cell" style="page-break-inside: avoid;">
          <img src="${item.dataUrl}" />
          <div class="name">${item.name}</div>
          <div class="code">${item.code}</div>
          ${item.location ? `<div class="location">${item.location}</div>` : ''}
        </div>
      `).join('')
      w.document.write(`
        <html>
          <head>
            <title>QR Rondas - Lote</title>
            <style>
              @page { size: letter; margin: 1cm; }
              body { font-family: -apple-system, system-ui, sans-serif; padding: 0; margin: 0; }
              .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8mm; padding: 1cm; }
              .cell { text-align: center; border: 1px solid #ddd; padding: 5mm; border-radius: 3mm; page-break-inside: avoid; }
              .cell img { width: 50mm; height: 50mm; }
              .name { font-size: 10pt; font-weight: 700; margin-top: 3mm; color: #0f2044; }
              .code { font-size: 9pt; color: #555; font-family: monospace; }
              .location { font-size: 8pt; color: #777; }
              h1 { text-align: center; padding: 5mm; margin: 0; background: #0f2044; color: white; font-size: 14pt; }
            </style>
          </head>
          <body>
            <h1>Códigos QR · Rondas de Guardias · Laguna Norte</h1>
            <div class="grid">${cells}</div>
            <script>window.onload = () => { setTimeout(() => window.print(), 500); };</script>
          </body>
        </html>
      `)
      w.document.close()
    } catch (err) {
      toast.error('Error al generar lote de QR')
    }
  }

  // ─── Render ───

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Rondas QR de Guardias</h2>
          <p className="text-sm text-slate-500">
            Gestiona puntos de ronda y visualiza lecturas de guardias en tiempo real.
            Comparte la misma base de datos que la app móvil.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => { fetchLocations(true); fetchScans(true); }}
            disabled={refreshingLocations || refreshingScans}
            title="Recargar ubicaciones y lecturas desde el servidor"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${(refreshingLocations || refreshingScans) ? 'animate-spin' : ''}`} />
            {(refreshingLocations || refreshingScans) ? 'Actualizando...' : 'Actualizar todo'}
          </Button>
          <Button variant="outline" onClick={printAllQrs} title="Imprimir todos los QR activos">
            <Printer className="w-4 h-4 mr-1" /> Imprimir todos
          </Button>
          <Button onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-1" /> Nueva ubicación
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'ubicaciones' | 'lecturas')}>
        <TabsList>
          <TabsTrigger value="ubicaciones">
            <MapPin className="w-4 h-4 mr-1" /> Ubicaciones ({locations.length})
          </TabsTrigger>
          <TabsTrigger value="lecturas">
            <Clock className="w-4 h-4 mr-1" /> Lecturas ({scansTotal})
          </TabsTrigger>
        </TabsList>

        {/* ─── Pestaña Ubicaciones ─── */}
        <TabsContent value="ubicaciones" className="space-y-4">
          {loadingLocations ? (
            <div className="flex items-center justify-center p-12">
              <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
              <span className="ml-2 text-slate-500">Cargando ubicaciones...</span>
            </div>
          ) : locations.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <MapPin className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500 mb-3">No hay ubicaciones QR creadas</p>
                <Button onClick={openCreateModal}>
                  <Plus className="w-4 h-4 mr-1" /> Crear primera ubicación
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {locations.map((loc) => (
                <Card key={loc.id} className={loc.active ? '' : 'opacity-60'}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{loc.name}</CardTitle>
                        {loc.location && (
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" /> {loc.location}
                          </p>
                        )}
                      </div>
                      {loc.active ? (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Activa</Badge>
                      ) : (
                        <Badge variant="secondary">Inactiva</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <code className="px-2 py-1 bg-slate-100 rounded font-mono">{loc.code}</code>
                      <span className="text-slate-500">{loc.scanCount || 0} lecturas</span>
                    </div>
                    {loc.description && (
                      <p className="text-xs text-slate-500 line-clamp-2">{loc.description}</p>
                    )}
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => openQrModal(loc)}>
                        <Eye className="w-3 h-3 mr-1" /> Ver QR
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => downloadQr(loc)} title="Descargar PNG">
                        <Download className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => printQr(loc)} title="Imprimir">
                        <Printer className="w-3 h-3" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="ghost">
                            <MoreHorizontal className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => openEditModal(loc)}>
                            <Search className="w-3 h-3 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(loc)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-3 h-3 mr-2" /> Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── Pestaña Lecturas ─── */}
        <TabsContent value="lecturas" className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">Ubicación</Label>
                  <Select value={filterLocationId} onValueChange={setFilterLocationId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las ubicaciones</SelectItem>
                      {locations.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id}>
                          {loc.name} ({loc.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Guardia</Label>
                  <Select value={filterGuardia} onValueChange={setFilterGuardia}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los guardias</SelectItem>
                      {guardias.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Desde</Label>
                  <Input
                    type="date"
                    value={filterFromDate}
                    onChange={(e) => setFilterFromDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Hasta</Label>
                  <Input
                    type="date"
                    value={filterToDate}
                    onChange={(e) => setFilterToDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-between items-center mt-3 flex-wrap gap-2">
                <p className="text-xs text-slate-500">
                  Mostrando {scans.length} de {scansTotal} lecturas · Actualización automática cada 15s
                </p>
                <div className="flex gap-2">
                  {isAdmin() && scans.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeleteTestScans}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                      title="Eliminar lecturas de prueba (TEST, PRUEBA, etc.)"
                    >
                      <Trash2 className="w-3 h-3 mr-1" /> Eliminar pruebas
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchScans(true)}
                    disabled={refreshingScans}
                  >
                    <RefreshCw className={`w-3 h-3 mr-1 ${refreshingScans ? 'animate-spin' : ''}`} />
                    {refreshingScans ? 'Actualizando...' : 'Actualizar'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabla de lecturas */}
          {loadingScans ? (
            <div className="flex items-center justify-center p-12">
              <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
              <span className="ml-2 text-slate-500">Cargando lecturas...</span>
            </div>
          ) : scans.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Clock className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500">No hay lecturas registradas con los filtros actuales</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[160px]">Fecha y hora</TableHead>
                        <TableHead className="min-w-[180px]">Ubicación</TableHead>
                        <TableHead className="min-w-[140px]">Guardia</TableHead>
                        <TableHead className="min-w-[160px]">GPS</TableHead>
                        <TableHead>Notas</TableHead>
                        {isAdmin() && <TableHead className="w-[60px]">Acciones</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scans.map((scan) => (
                        <TableRow key={scan.id}>
                          <TableCell className="font-mono text-xs">
                            {formatDateTimeCL(scan.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-sm">
                              {scan.location?.name ?? '—'}
                            </div>
                            {scan.location?.code && (
                              <code className="text-[10px] text-slate-500">{scan.location.code}</code>
                            )}
                            {scan.location?.location && (
                              <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-2.5 h-2.5" /> {scan.location.location}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-sm font-medium">
                              <User className="w-3 h-3 text-slate-400" />
                              {scan.scannedBy || '—'}
                            </div>
                          </TableCell>
                          <TableCell>
                            {scan.latitude != null && scan.longitude != null ? (
                              <a
                                href={`https://www.openstreetmap.org/?mlat=${scan.latitude}&mlon=${scan.longitude}#map=18/${scan.latitude}/${scan.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 hover:underline"
                                title="Abrir en OpenStreetMap"
                              >
                                <MapPinned className="w-3 h-3" />
                                {scan.latitude.toFixed(5)}, {scan.longitude.toFixed(5)}
                              </a>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-500">
                                <AlertCircle className="w-3 h-3" /> Sin GPS
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {scan.notes || '—'}
                          </TableCell>
                          {isAdmin() && (
                            <TableCell>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteScan(scan)}
                                disabled={deletingScanId === scan.id}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                title="Eliminar lectura"
                              >
                                {deletingScanId === scan.id ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3 h-3" />
                                )}
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Modal Crear/Editar ─── */}
      <Dialog open={showFormModal} onOpenChange={setShowFormModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? 'Editar ubicación QR' : 'Nueva ubicación QR'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nombre *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ej: Portería Principal"
              />
            </div>
            <div>
              <Label>Código QR *</Label>
              <Input
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                placeholder="Ej: QR-PORTERIA-01"
                className="font-mono"
              />
              <p className="text-xs text-slate-500 mt-1">
                Este código se codifica en el QR. Debe ser único.
              </p>
            </div>
            <div>
              <Label>Ubicación / Sector</Label>
              <Input
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="Ej: Entrada Norte - Sector A"
              />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Detalles adicionales..."
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={formActive}
                onChange={(e) => setFormActive(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="active" className="cursor-pointer">Activa</Label>
            </div>
            {qrPreview && (
              <div className="text-center">
                <p className="text-xs text-slate-500 mb-2">Vista previa del QR</p>
                <div className="inline-block p-3 bg-white border-2 border-slate-200 rounded-lg">
                  <img src={qrPreview} alt="QR" className="w-40 h-40" />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFormModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={savingLocation}>
              {savingLocation ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Modal Ver QR ─── */}
      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" /> {qrModalLocation?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="text-center">
            {qrModalImage ? (
              <div className="inline-block p-4 bg-white border-2 border-slate-200 rounded-lg">
                <img src={qrModalImage} alt="QR" className="w-64 h-64" />
              </div>
            ) : (
              <div className="w-64 h-64 mx-auto flex items-center justify-center">
                <RefreshCw className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            )}
            {qrModalLocation && (
              <>
                <code className="block mt-3 text-sm font-mono">{qrModalLocation.code}</code>
                {qrModalLocation.location && (
                  <p className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1">
                    <MapPin className="w-3 h-3" /> {qrModalLocation.location}
                  </p>
                )}
              </>
            )}
            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => qrModalLocation && downloadQr(qrModalLocation)}>
                <Download className="w-3 h-3 mr-1" /> Descargar
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => qrModalLocation && printQr(qrModalLocation)}>
                <Printer className="w-3 h-3 mr-1" /> Imprimir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
