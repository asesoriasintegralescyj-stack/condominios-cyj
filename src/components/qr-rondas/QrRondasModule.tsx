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
  FileDown,
  FileSpreadsheet,
  FileText,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Car,
  Calendar,
  Users,
  Activity,
  TrendingUp,
  Link2,
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

interface PatenteRecord {
  id: string
  patente: string
  ubicacion: string
  entradaQrCode: string
  entradaAt: string
  salidaQrCode: string | null
  salidaAt: string | null
  scannedBy: string
  latitude: number | null
  longitude: number | null
  foto: string | null
  notes: string
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

function startOfDayCL(date: Date | string): Date {
  // Devuelve el Date UTC correspondiente al inicio (00:00:00.000) del día en Chile
  // para la fecha dada.
  //
  // Acepta:
  //   - Un string "YYYY-MM-DD" (recomendado cuando viene de <input type="date">),
  //     en cuyo caso se interpreta textualmente como esa fecha calendario en Chile.
  //   - Un objeto Date, en cuyo caso se convierte primero a la fecha calendario
  //     que ese instante representa en Chile.
  //
  // ⚠️ NO usar `new Date("2026-07-25")` antes de llamar a esta función: JavaScript
  // interpreta los strings date-only como UTC midnight, que en Chile (UTC-4)
  // corresponde al día anterior a las 20:00. Por eso el filtro "por fecha" antes
  // entregaba resultados del día anterior.
  const yyyymmdd =
    typeof date === 'string'
      ? date
      : formatDateInputCL(date)
  const [y, m, d] = yyyymmdd.split('-').map(Number)
  // Creamos un Date a las 12:00 UTC de ese día y vemos qué hora es en Chile
  const utcNoon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(utcNoon)
  const chileHour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0')
  const chileMin = Number(parts.find((p) => p.type === 'minute')?.value ?? '0')
  const chileMinutesFromMidnight = chileHour * 60 + chileMin
  // offset en minutos entre UTC y Chile (positivo: Chile está detrás de UTC)
  // 12:00 UTC = chileMinutesFromMidnight en Chile → offset = 12*60 - chileMinutesFromMidnight
  const offsetMin = 12 * 60 - chileMinutesFromMidnight
  // 00:00 Chile = 00:00 UTC + offsetMin minutos
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0) + offsetMin * 60 * 1000)
}

function endOfDayCL(date: Date | string): Date {
  // Devuelve el Date UTC correspondiente al final (23:59:59.999) del día en Chile
  const start = startOfDayCL(date)
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1)
}

/** Devuelve la fecha de hoy en Chile como string "YYYY-MM-DD". */
function todayCL(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/** Devuelve la fecha de N días atrás en Chile como string "YYYY-MM-DD". */
function daysAgoCL(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

// ─── Componente principal ───

export function QrRondasModule() {
  const { user, isAdmin } = useSession()
  const isConserje = user?.rol === 'conserje'
  // Conserje siempre empieza en lecturas; admin en ubicaciones
  const [tab, setTab] = useState<'ubicaciones' | 'lecturas' | 'patentes' | 'ruta'>(isConserje ? 'lecturas' : 'ubicaciones')
  const [locations, setLocations] = useState<QrLocation[]>([])
  const [scans, setScans] = useState<QrScan[]>([])
  const [scansTotal, setScansTotal] = useState(0)
  const [loadingLocations, setLoadingLocations] = useState(true)
  const [loadingScans, setLoadingScans] = useState(true)
  const [refreshingLocations, setRefreshingLocations] = useState(false)
  const [refreshingScans, setRefreshingScans] = useState(false)
  const [deletingScanId, setDeletingScanId] = useState<string | null>(null)
  const [exportingPdf, setExportingPdf] = useState(false)

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

  // Ordenamiento de lecturas (por fecha o alfabético por guardia/ubicación)
  const [sortBy, setSortBy] = useState<'fecha' | 'guardia' | 'ubicacion'>('fecha')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Modal de informe (por día / rango / trabajador)
  const [showInformeModal, setShowInformeModal] = useState(false)
  const [informeTipo, setInformeTipo] = useState<'dia' | 'rango' | 'trabajador'>('dia')
  const [informeFecha, setInformeFecha] = useState<string>('')
  const [informeDesde, setInformeDesde] = useState<string>('')
  const [informeHasta, setInformeHasta] = useState<string>('')
  const [informeGuardia, setInformeGuardia] = useState<string>('all')
  const [generandoInforme, setGenerandoInforme] = useState(false)

  // Modal de QR
  const [showQrModal, setShowQrModal] = useState(false)
  const [qrModalLocation, setQrModalLocation] = useState<QrLocation | null>(null)
  const [qrModalImage, setQrModalImage] = useState<string>('')

  // Lista única de guardias para el filtro
  const [guardias, setGuardias] = useState<string[]>([])

  // ─── Estado de patentes vehiculares ───
  const [patentes, setPatentes] = useState<PatenteRecord[]>([])
  const [patentesTotal, setPatentesTotal] = useState(0)
  const [loadingPatentes, setLoadingPatentes] = useState(true)
  const [refreshingPatentes, setRefreshingPatentes] = useState(false)
  const [patentesSoloAbiertas, setPatentesSoloAbiertas] = useState(true)
  const [filterPatenteUbicacion, setFilterPatenteUbicacion] = useState<string>('all')

  // ─── Cargar patentes ───
  const fetchPatentes = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshingPatentes(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', '500')
      params.set('_t', String(Date.now()))
      if (patentesSoloAbiertas) params.set('soloAbiertas', 'true')
      if (filterPatenteUbicacion !== 'all') params.set('ubicacion', filterPatenteUbicacion)
      const res = await fetch(`/api/qr-rondas/patentes?${params.toString()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Error al cargar patentes')
      const data = await res.json()
      setPatentes(Array.isArray(data.patentes) ? data.patentes : [])
      setPatentesTotal(data.total || 0)
      if (isRefresh) toast.success(`${data.total || 0} patentes cargadas`)
    } catch (err) {
      console.error(err)
      toast.error('Error al cargar patentes')
    } finally {
      setLoadingPatentes(false)
      setRefreshingPatentes(false)
    }
  }, [patentesSoloAbiertas, filterPatenteUbicacion])

  useEffect(() => {
    fetchPatentes()
  }, [fetchPatentes])

  // Auto-refresh patentes cada 45s (stagger: lecturas=60s, patentes=45s)
  // AbortController previene fetches huérfanos al desmontar
  useEffect(() => {
    if (tab !== 'patentes') return
    const controller = new AbortController()
    const interval = setInterval(() => {
      controller.abort() // cancelar fetch anterior si aún está en vuelo
      fetchPatentes(false)
    }, 45000)
    return () => {
      clearInterval(interval)
      controller.abort()
    }
  }, [tab, fetchPatentes])

  // ─── Cargar ubicaciones ───
  const fetchLocations = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshingLocations(true)
    try {
      const res = await fetch('/api/qr-rondas/locations', { cache: 'no-store' })
      if (!res.ok) throw new Error('Error al cargar ubicaciones')
      const data = await res.json()
      if (data.error) {
        console.error('API error loading locations:', data.error)
        toast.error(`Error: ${data.error}`)
      }
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
      if (filterFromDate) {
        // Inicio del día seleccionado en zona horaria Chile (00:00:00 Chile).
        // Pasamos el string "YYYY-MM-DD" directamente a startOfDayCL para evitar
        // el bug de `new Date("YYYY-MM-DD")` que se interpreta como UTC midnight
        // y en Chile (UTC-4) cae en el día anterior.
        params.set('from', String(startOfDayCL(filterFromDate).getTime()))
      }
      if (filterToDate) {
        // Fin del día seleccionado en zona horaria Chile (23:59:59.999 Chile).
        // Misma razón: pasamos el string directamente.
        params.set('to', String(endOfDayCL(filterToDate).getTime()))
      }
      params.set('limit', '500')
      // cache: 'no-store' + timestamp para evitar cualquier caché del navegador
      params.set('_t', String(Date.now()))
      const res = await fetch(`/api/qr-rondas/scans?${params.toString()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Error al cargar lecturas')
      const data = await res.json()
      if (data.error) {
        console.error('API error loading scans:', data.error)
        toast.error(`Error: ${data.error}`)
      }
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

  // Auto-refresh lecturas cada 60s (optimizado: 60s para reducir carga BD Aiven,
  // stagger con patentes para evitar que coincidan las queries)
  // AbortController previene fetches huérfanos al desmontar
  useEffect(() => {
    if (tab !== 'lecturas') return
    const controller = new AbortController()
    const interval = setInterval(() => {
      controller.abort() // cancelar fetch anterior si aún está en vuelo
      fetchScans(false)
    }, 60000)
    return () => {
      clearInterval(interval)
      controller.abort()
    }
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

  // ─── Exportar PDF de lecturas ───
  // Genera un PDF con todas las lecturas filtradas (por fecha, guardia, etc.)
  const exportarPdf = async () => {
    if (scans.length === 0) {
      toast.error('No hay lecturas para exportar con los filtros actuales')
      return
    }
    setExportingPdf(true)
    try {
      // Importar jsPDF dinámicamente
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'mm', format: 'letter' })
      const pageWidth = 216 // Letter: 216mm
      const pageHeight = 279
      const margin = 15
      const contentWidth = pageWidth - margin * 2

      // ─── Encabezado ───
      doc.setFillColor(15, 32, 68) // azul corporativo #0f2044
      doc.rect(0, 0, pageWidth, 30, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Laguna Norte — Control de Rondas QR', margin, 13)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text('Reporte de lecturas de guardias', margin, 20)
      doc.text(`Generado: ${new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())}`, margin, 25)

      // ─── Información de filtros aplicados ───
      let y = 38
      doc.setTextColor(40, 40, 40)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Filtros aplicados:', margin, y)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      y += 5
      if (filterFromDate || filterToDate) {
        doc.text(`• Rango fechas: ${filterFromDate || '—'} a ${filterToDate || '—'}`, margin, y); y += 4
      }
      if (filterLocationId !== 'all') {
        const loc = locations.find((l) => l.id === filterLocationId)
        doc.text(`• Ubicación: ${loc ? loc.name : filterLocationId}`, margin, y); y += 4
      }
      if (filterGuardia !== 'all') {
        doc.text(`• Guardia: ${filterGuardia}`, margin, y); y += 4
      }
      doc.text(`• Total lecturas: ${scansTotal}`, margin, y); y += 8

      // ─── Tabla de lecturas ───
      // Encabezados
      const colFecha = margin
      const colUbicacion = margin + 35
      const colGuardia = margin + 95
      const colGps = margin + 135
      const colNotas = margin + 175

      doc.setFillColor(240, 240, 240)
      doc.rect(margin - 2, y - 4, contentWidth + 4, 7, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.text('Fecha y hora', colFecha, y)
      doc.text('Ubicación', colUbicacion, y)
      doc.text('Guardia', colGuardia, y)
      doc.text('GPS', colGps, y)
      doc.text('Notas', colNotas, y)
      y += 5

      // Filas
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      let rowCount = 0
      for (const scan of scans) {
        if (y > pageHeight - 20) {
          doc.addPage()
          y = margin
          // Repetir encabezados
          doc.setFillColor(240, 240, 240)
          doc.rect(margin - 2, y - 4, contentWidth + 4, 7, 'F')
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(8)
          doc.text('Fecha y hora', colFecha, y)
          doc.text('Ubicación', colUbicacion, y)
          doc.text('Guardia', colGuardia, y)
          doc.text('GPS', colGps, y)
          doc.text('Notas', colNotas, y)
          y += 5
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(7)
        }

        // Fila alterna (zebra)
        if (rowCount % 2 === 0) {
          doc.setFillColor(248, 248, 248)
          doc.rect(margin - 2, y - 3, contentWidth + 4, 5, 'F')
        }

        const fecha = formatDateTimeCL(scan.createdAt)
        const ubicacion = (scan.location?.name ?? '—').substring(0, 30)
        const codigo = scan.location?.code ?? ''
        const guardia = (scan.scannedBy || '—').substring(0, 20)
        const gps = scan.latitude != null && scan.longitude != null
          ? `${scan.latitude.toFixed(5)}, ${scan.longitude.toFixed(5)}`
          : 'Sin GPS'
        const notas = (scan.notes || '—').substring(0, 25)

        doc.text(fecha, colFecha, y)
        doc.text(ubicacion, colUbicacion, y)
        if (codigo) {
          doc.setFontSize(6)
          doc.setTextColor(100, 100, 100)
          doc.text(codigo, colUbicacion, y + 2.5)
          doc.setFontSize(7)
          doc.setTextColor(40, 40, 40)
        }
        doc.text(guardia, colGuardia, y)
        // GPS en verde si tiene, en ámbar si no
        if (gps !== 'Sin GPS') {
          doc.setTextColor(20, 120, 60)
        } else {
          doc.setTextColor(180, 120, 20)
        }
        doc.text(gps, colGps, y)
        doc.setTextColor(40, 40, 40)
        doc.text(notas, colNotas, y)

        y += 6
        rowCount++
      }

      // ─── Pie de página ───
      const totalPages = doc.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFontSize(7)
        doc.setTextColor(120, 120, 120)
        doc.text(
          `Laguna Norte · Condominio & Parque · Página ${i} de ${totalPages}`,
          pageWidth / 2,
          pageHeight - 8,
          { align: 'center' },
        )
      }

      // Generar nombre de archivo
      const fechaArchivo = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Santiago',
        year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(new Date()).replace(/-/g, '')
      doc.save(`Rondas-QR-Lecturas-${fechaArchivo}.pdf`)

      toast.success(`PDF generado: ${scans.length} lecturas`)
    } catch (err) {
      console.error('Error exportando PDF:', err)
      toast.error('Error al generar PDF')
    } finally {
      setExportingPdf(false)
    }
  }

  // ─── Exportar Excel de lecturas ───
  // Genera un .xlsx con todas las lecturas filtradas usando la librería xlsx.
  const exportarExcel = async () => {
    if (scans.length === 0) {
      toast.error('No hay lecturas para exportar con los filtros actuales')
      return
    }
    setExportingPdf(true)
    try {
      const XLSX = await import('xlsx')
      // Construir filas: ordenadas igual que la vista (respetar sortBy/sortDir)
      const rows = sortedScans.map((s, i) => ({
        '#': i + 1,
        'Fecha y hora': formatDateTimeCL(s.createdAt),
        'Ubicación': s.location?.name ?? '',
        'Código QR': s.location?.code ?? '',
        'Sector': s.location?.location ?? '',
        'Guardia': s.scannedBy || '',
        'Latitud': s.latitude ?? '',
        'Longitud': s.longitude ?? '',
        'GPS': (s.latitude != null && s.longitude != null) ? 'Sí' : 'No',
        'Notas': s.notes || '',
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      // Ajustar ancho de columnas
      const colWidths = [
        { wch: 5 },   // #
        { wch: 18 },  // Fecha
        { wch: 28 },  // Ubicación
        { wch: 16 },  // Código
        { wch: 22 },  // Sector
        { wch: 24 },  // Guardia
        { wch: 12 },  // Lat
        { wch: 12 },  // Lng
        { wch: 6 },   // GPS
        { wch: 30 },  // Notas
      ]
      ;(ws as any)['!cols'] = colWidths
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Lecturas')
      // Metadatos del archivo
      const fechaArchivo = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Santiago',
        year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(new Date()).replace(/-/g, '')
      const nombre = `Rondas-QR-Lecturas-${fechaArchivo}.xlsx`
      XLSX.writeFile(wb, nombre)
      toast.success(`Excel generado: ${scans.length} lecturas`)
    } catch (err) {
      console.error('Error exportando Excel:', err)
      toast.error('Error al generar Excel')
    } finally {
      setExportingPdf(false)
    }
  }

  // ─── Emitir informe (PDF) por día / rango / trabajador ───
  // Descarga lecturas directamente desde el servidor aplicando el criterio
  // elegido (sin depender de los filtros actuales de la tabla) y produce un
  // PDF resumen con totales y desglose por guardia/ubicación.
  const generarInforme = async () => {
    // Validaciones según tipo
    if (informeTipo === 'dia' && !informeFecha) {
      toast.error('Selecciona la fecha del informe')
      return
    }
    if (informeTipo === 'rango' && (!informeDesde || !informeHasta)) {
      toast.error('Selecciona fecha desde y hasta para el informe por rango')
      return
    }
    if (informeTipo === 'trabajador' && (informeGuardia === 'all' || !informeGuardia)) {
      toast.error('Selecciona el trabajador para el informe')
      return
    }

    setGenerandoInforme(true)
    try {
      const params = new URLSearchParams()
      params.set('limit', '2000')
      params.set('_t', String(Date.now()))

      let tituloCriterio = ''
      if (informeTipo === 'dia') {
        // Pasamos el string "YYYY-MM-DD" directamente para evitar el bug de
        // `new Date("YYYY-MM-DD")` interpretado como UTC midnight (día anterior
        // en Chile).
        params.set('from', String(startOfDayCL(informeFecha).getTime()))
        params.set('to', String(endOfDayCL(informeFecha).getTime()))
        tituloCriterio = `Día: ${informeFecha}`
      } else if (informeTipo === 'rango') {
        params.set('from', String(startOfDayCL(informeDesde).getTime()))
        params.set('to', String(endOfDayCL(informeHasta).getTime()))
        tituloCriterio = `Rango: ${informeDesde} a ${informeHasta}`
      } else {
        // trabajador
        params.set('scannedBy', informeGuardia)
        if (informeDesde) params.set('from', String(startOfDayCL(informeDesde).getTime()))
        if (informeHasta) params.set('to', String(endOfDayCL(informeHasta).getTime()))
        tituloCriterio = `Trabajador: ${informeGuardia}` +
          (informeDesde || informeHasta
            ? ` · ${informeDesde || '—'} a ${informeHasta || '—'}`
            : ' · Histórico')
      }

      const res = await fetch(`/api/qr-rondas/scans?${params.toString()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Error al descargar lecturas')
      const data = await res.json()
      const informeScans: QrScan[] = Array.isArray(data.scans) ? data.scans : []

      if (informeScans.length === 0) {
        toast.error('No hay lecturas para el criterio seleccionado')
        return
      }

      // Ordenar por fecha ascendente para el informe
      informeScans.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

      // Calcular resumen: total por guardia y por ubicación
      const porGuardia = new Map<string, number>()
      const porUbicacion = new Map<string, number>()
      const conGps = informeScans.filter((s) => s.latitude != null && s.longitude != null).length
      for (const s of informeScans) {
        const g = s.scannedBy || '(sin guardia)'
        porGuardia.set(g, (porGuardia.get(g) || 0) + 1)
        const u = s.location?.name ?? '(sin ubicación)'
        porUbicacion.set(u, (porUbicacion.get(u) || 0) + 1)
      }

      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'mm', format: 'letter' })
      const pageWidth = 216
      const pageHeight = 279
      const margin = 15
      const contentWidth = pageWidth - margin * 2

      // Encabezado
      doc.setFillColor(15, 32, 68)
      doc.rect(0, 0, pageWidth, 32, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Laguna Norte — Informe de Rondas QR', margin, 13)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(`Criterio: ${tituloCriterio}`, margin, 20)
      doc.text(`Generado: ${new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())}`, margin, 26)

      // Resumen
      let y = 42
      doc.setTextColor(40, 40, 40)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('Resumen', margin, y)
      y += 6
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text(`• Total de lecturas: ${informeScans.length}`, margin, y); y += 4
      doc.text(`• Con GPS: ${conGps} (${informeScans.length > 0 ? Math.round((conGps / informeScans.length) * 100) : 0}%)`, margin, y); y += 4
      doc.text(`• Guardias distintos: ${porGuardia.size}`, margin, y); y += 4
      doc.text(`• Ubicaciones registradas: ${porUbicacion.size}`, margin, y); y += 8

      // Desglose por guardia
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text('Desglose por trabajador', margin, y); y += 5
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      const guardiasOrdenados = Array.from(porGuardia.entries()).sort((a, b) => b[1] - a[1])
      for (const [g, n] of guardiasOrdenados) {
        if (y > pageHeight - 30) { doc.addPage(); y = margin }
        doc.text(`• ${g}: ${n} lectura(s)`, margin, y); y += 4
      }
      y += 4

      // Desglose por ubicación
      if (y > pageHeight - 40) { doc.addPage(); y = margin }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text('Desglose por ubicación', margin, y); y += 5
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      const ubicacionesOrdenadas = Array.from(porUbicacion.entries()).sort((a, b) => b[1] - a[1])
      for (const [u, n] of ubicacionesOrdenadas) {
        if (y > pageHeight - 30) { doc.addPage(); y = margin }
        doc.text(`• ${u}: ${n} lectura(s)`, margin, y); y += 4
      }
      y += 6

      // Detalle de lecturas (tabla)
      if (y > pageHeight - 30) { doc.addPage(); y = margin }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text('Detalle de lecturas', margin, y); y += 5

      const colFecha = margin
      const colUbicacion = margin + 35
      const colGuardia = margin + 95
      const colGps = margin + 145
      const colNotas = margin + 180

      doc.setFillColor(240, 240, 240)
      doc.rect(margin - 2, y - 4, contentWidth + 4, 7, 'F')
      doc.setFontSize(8)
      doc.text('Fecha y hora', colFecha, y)
      doc.text('Ubicación', colUbicacion, y)
      doc.text('Guardia', colGuardia, y)
      doc.text('GPS', colGps, y)
      doc.text('Notas', colNotas, y)
      y += 5

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      let rowCount = 0
      for (const scan of informeScans) {
        if (y > pageHeight - 20) {
          doc.addPage()
          y = margin
          doc.setFillColor(240, 240, 240)
          doc.rect(margin - 2, y - 4, contentWidth + 4, 7, 'F')
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(8)
          doc.text('Fecha y hora', colFecha, y)
          doc.text('Ubicación', colUbicacion, y)
          doc.text('Guardia', colGuardia, y)
          doc.text('GPS', colGps, y)
          doc.text('Notas', colNotas, y)
          y += 5
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(7)
        }
        if (rowCount % 2 === 0) {
          doc.setFillColor(248, 248, 248)
          doc.rect(margin - 2, y - 3, contentWidth + 4, 5, 'F')
        }
        const fecha = formatDateTimeCL(scan.createdAt)
        const ubicacion = (scan.location?.name ?? '—').substring(0, 30)
        const guardia = (scan.scannedBy || '—').substring(0, 20)
        const gps = scan.latitude != null && scan.longitude != null ? 'Sí' : 'No'
        const notas = (scan.notes || '—').substring(0, 25)
        doc.text(fecha, colFecha, y)
        doc.text(ubicacion, colUbicacion, y)
        doc.text(guardia, colGuardia, y)
        if (gps === 'Sí') {
          doc.setTextColor(20, 120, 60)
        } else {
          doc.setTextColor(180, 120, 20)
        }
        doc.text(gps, colGps, y)
        doc.setTextColor(40, 40, 40)
        doc.text(notas, colNotas, y)
        y += 6
        rowCount++
      }

      // Pie de página
      const totalPages = doc.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFontSize(7)
        doc.setTextColor(120, 120, 120)
        doc.text(
          `Laguna Norte · Condominio & Parque · Página ${i} de ${totalPages}`,
          pageWidth / 2,
          pageHeight - 8,
          { align: 'center' },
        )
      }

      const fechaArchivo = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Santiago',
        year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(new Date()).replace(/-/g, '')
      const sufijo = informeTipo === 'dia' ? 'dia' : informeTipo === 'rango' ? 'rango' : 'trabajador'
      doc.save(`Informe-Rondas-${sufijo}-${fechaArchivo}.pdf`)

      toast.success(`Informe generado: ${informeScans.length} lecturas`)
      setShowInformeModal(false)
    } catch (err) {
      console.error('Error generando informe:', err)
      toast.error('Error al generar el informe')
    } finally {
      setGenerandoInforme(false)
    }
  }

  // ─── Lecturas ordenadas según sortBy/sortDir ───
  const sortedScans = [...scans].sort((a, b) => {
    let cmp = 0
    if (sortBy === 'fecha') {
      cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    } else if (sortBy === 'guardia') {
      cmp = (a.scannedBy || '').localeCompare(b.scannedBy || '', 'es', { sensitivity: 'base' })
    } else if (sortBy === 'ubicacion') {
      cmp = (a.location?.name || '').localeCompare(b.location?.name || '', 'es', { sensitivity: 'base' })
    }
    return sortDir === 'asc' ? cmp : -cmp
  })

  const toggleSort = (col: 'fecha' | 'guardia' | 'ubicacion') => {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(col)
      setSortDir(col === 'fecha' ? 'desc' : 'asc')
    }
  }

  // ─── Métricas para el dashboard ───
  // Se calculan en base a los scans actualmente cargados (que respetan los
  // filtros de la pestaña Lecturas) más un fetch independiente para "hoy"
  // y "últimos 7 días" (no dependen del filtro actual).
  const [metricas, setMetricas] = useState<{
    hoy: number
    semana: number
    total: number
    guardiasActivos: number
    ubicacionesActivas: number
    patentesAdentro: number
    ultimaLectura: string | null
    ultimaLecturaFecha: string | null
  }>({
    hoy: 0, semana: 0, total: 0,
    guardiasActivos: 0, ubicacionesActivas: 0, patentesAdentro: 0,
    ultimaLectura: null, ultimaLecturaFecha: null,
  })

  useEffect(() => {
    // Cargar métricas independientes de los filtros actuales
    const cargarMetricas = async () => {
      try {
        const hoy = todayCL()
        const hace7d = daysAgoCL(7)
        const params = new URLSearchParams()
        params.set('from', String(startOfDayCL(hace7d).getTime()))
        params.set('to', String(endOfDayCL(hoy).getTime()))
        params.set('limit', '2000')
        params.set('_t', String(Date.now()))
        const res = await fetch(`/api/qr-rondas/scans?${params.toString()}`, { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        const ms: QrScan[] = Array.isArray(data.scans) ? data.scans : []

        // Lecturas hoy
        const inicioHoy = startOfDayCL(hoy).getTime()
        const finHoy = endOfDayCL(hoy).getTime()
        const lecturasHoy = ms.filter((s) => {
          const t = new Date(s.createdAt).getTime()
          return t >= inicioHoy && t <= finHoy
        }).length

        // Última lectura
        let ultima: QrScan | null = null
        for (const s of ms) {
          if (!ultima || new Date(s.createdAt).getTime() > new Date(ultima.createdAt).getTime()) {
            ultima = s
          }
        }

        // Guardias activos (que escanearon en los últimos 7 días)
        const guardiasSet = new Set<string>()
        for (const s of ms) {
          if (s.scannedBy) guardiasSet.add(s.scannedBy)
        }

        setMetricas({
          hoy: lecturasHoy,
          semana: ms.length,
          total: data.total || ms.length,
          guardiasActivos: guardiasSet.size,
          ubicacionesActivas: locations.filter((l) => l.active).length,
          patentesAdentro: patentes.filter((p) => !p.salidaAt).length,
          ultimaLectura: ultima
            ? `${ultima.scannedBy || '—'} · ${ultima.location?.name ?? '—'}`
            : null,
          ultimaLecturaFecha: ultima ? ultima.createdAt : null,
        })
      } catch (err) {
        console.error('Error cargando métricas:', err)
      }
    }
    cargarMetricas()
    // Refrescar métricas cada 30s con AbortController
    const controller = new AbortController()
    const id = setInterval(() => {
      controller.abort() // cancelar fetch anterior si aún está en vuelo
      cargarMetricas()
    }, 30000)
    return () => {
      clearInterval(id)
      controller.abort()
    }
  }, [locations, patentes])

  // ─── Acciones del dashboard (hipervínculos) ───
  // Cada tarjeta del dashboard aplica un filtro y cambia a la pestaña Lecturas.
  const verLecturasHoy = () => {
    const hoy = todayCL()
    setFilterFromDate(hoy)
    setFilterToDate(hoy)
    setFilterLocationId('all')
    setFilterGuardia('all')
    setTab('lecturas')
    toast.info(`Filtrando lecturas de hoy (${hoy})`)
  }

  const verLecturasSemana = () => {
    const hoy = todayCL()
    const hace7d = daysAgoCL(6) // últimos 7 días incluyendo hoy
    setFilterFromDate(hace7d)
    setFilterToDate(hoy)
    setFilterLocationId('all')
    setFilterGuardia('all')
    setTab('lecturas')
    toast.info(`Filtrando lecturas de los últimos 7 días (${hace7d} a ${hoy})`)
  }

  const verTodasLecturas = () => {
    setFilterFromDate('')
    setFilterToDate('')
    setFilterLocationId('all')
    setFilterGuardia('all')
    setTab('lecturas')
    toast.info('Mostrando todas las lecturas')
  }

  const verUltimaLectura = () => {
    if (!metricas.ultimaLecturaFecha) return
    const fecha = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Santiago',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date(metricas.ultimaLecturaFecha))
    setFilterFromDate(fecha)
    setFilterToDate(fecha)
    setFilterLocationId('all')
    setFilterGuardia('all')
    setTab('lecturas')
    toast.info(`Filtrando lecturas del día de la última lectura (${fecha})`)
  }

  const verUbicaciones = () => {
    setTab('ubicaciones')
  }

  const verPatentes = () => {
    setTab('patentes')
  }

  // ─── Render ───

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            {isConserje ? 'Control de Rondas — Vista Conserje' : 'Rondas QR de Guardias'}
          </h2>
          <p className="text-sm text-slate-500">
            {isConserje
              ? 'Visualiza las lecturas de los guardias y exporta reportes en PDF.'
              : 'Gestiona puntos de ronda y visualiza lecturas de guardias en tiempo real.'
            }
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => { fetchLocations(true); fetchScans(true); }}
            disabled={refreshingLocations || refreshingScans}
            title="Recargar ubicaciones y lecturas desde el servidor"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${(refreshingLocations || refreshingScans) ? 'animate-spin' : ''}`} />
            {(refreshingLocations || refreshingScans) ? 'Actualizando...' : 'Actualizar'}
          </Button>
          <Button
            variant="outline"
            onClick={exportarPdf}
            disabled={exportingPdf || scans.length === 0}
            title="Exportar PDF de las lecturas filtradas"
            className="border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            {exportingPdf ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <FileDown className="w-4 h-4 mr-1" />}
            {exportingPdf ? 'Generando...' : 'Exportar PDF'}
          </Button>
          <Button
            variant="outline"
            onClick={exportarExcel}
            disabled={exportingPdf || scans.length === 0}
            title="Exportar Excel (.xlsx) de las lecturas filtradas"
            className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            {exportingPdf ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-1" />}
            {exportingPdf ? 'Generando...' : 'Exportar Excel'}
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowInformeModal(true)}
            disabled={generandoInforme}
            title="Emitir informe por día, rango de fechas o trabajador"
            className="border-amber-200 text-amber-700 hover:bg-amber-50"
          >
            {generandoInforme ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <FileText className="w-4 h-4 mr-1" />}
            {generandoInforme ? 'Generando...' : 'Emitir Informe'}
          </Button>
          {!isConserje && (
            <>
              <Button variant="outline" onClick={printAllQrs} title="Imprimir todos los QR activos">
                <Printer className="w-4 h-4 mr-1" /> Imprimir todos
              </Button>
              <Button onClick={openCreateModal}>
                <Plus className="w-4 h-4 mr-1" /> Nueva ubicación
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ─── Dashboard interactivo (tarjetas tipo hipervínculo) ─── */}
      {/* Cada tarjeta es clickeable: aplica un filtro y/o cambia de pestaña */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Lecturas hoy */}
        <button
          type="button"
          onClick={verLecturasHoy}
          className="group text-left bg-white border border-slate-200 rounded-xl p-3 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300"
          title="Click para ver lecturas de hoy"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wide">Hoy</span>
            <Calendar className="w-3.5 h-3.5 text-blue-500 group-hover:text-blue-700" />
          </div>
          <div className="text-2xl font-bold text-slate-800 group-hover:text-blue-700">
            {metricas.hoy}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
            <Link2 className="w-2.5 h-2.5" />
            <span className="group-hover:text-blue-700">Ver lecturas de hoy</span>
          </div>
        </button>

        {/* Últimos 7 días */}
        <button
          type="button"
          onClick={verLecturasSemana}
          className="group text-left bg-white border border-slate-200 rounded-xl p-3 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-300"
          title="Click para ver lecturas de los últimos 7 días"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wide">7 días</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500 group-hover:text-emerald-700" />
          </div>
          <div className="text-2xl font-bold text-slate-800 group-hover:text-emerald-700">
            {metricas.semana}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
            <Link2 className="w-2.5 h-2.5" />
            <span className="group-hover:text-emerald-700">Última semana</span>
          </div>
        </button>

        {/* Total lecturas */}
        <button
          type="button"
          onClick={verTodasLecturas}
          className="group text-left bg-white border border-slate-200 rounded-xl p-3 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-300"
          title="Click para ver todas las lecturas"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wide">Total</span>
            <Activity className="w-3.5 h-3.5 text-indigo-500 group-hover:text-indigo-700" />
          </div>
          <div className="text-2xl font-bold text-slate-800 group-hover:text-indigo-700">
            {metricas.total}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
            <Link2 className="w-2.5 h-2.5" />
            <span className="group-hover:text-indigo-700">Ver todas</span>
          </div>
        </button>

        {/* Guardias activos */}
        <button
          type="button"
          onClick={verTodasLecturas}
          className="group text-left bg-white border border-slate-200 rounded-xl p-3 hover:border-purple-400 hover:shadow-md transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-300"
          title="Guardias que registraron lecturas en los últimos 7 días"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wide">Guardias</span>
            <Users className="w-3.5 h-3.5 text-purple-500 group-hover:text-purple-700" />
          </div>
          <div className="text-2xl font-bold text-slate-800 group-hover:text-purple-700">
            {metricas.guardiasActivos}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
            <Link2 className="w-2.5 h-2.5" />
            <span className="group-hover:text-purple-700">Activos 7 días</span>
          </div>
        </button>

        {/* Ubicaciones activas */}
        {!isConserje && (
          <button
            type="button"
            onClick={verUbicaciones}
            className="group text-left bg-white border border-slate-200 rounded-xl p-3 hover:border-teal-400 hover:shadow-md transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-300"
            title="Click para ver pestaña de ubicaciones QR"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wide">Ubicac.</span>
              <MapPin className="w-3.5 h-3.5 text-teal-500 group-hover:text-teal-700" />
            </div>
            <div className="text-2xl font-bold text-slate-800 group-hover:text-teal-700">
              {metricas.ubicacionesActivas}
            </div>
            <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
              <Link2 className="w-2.5 h-2.5" />
              <span className="group-hover:text-teal-700">Ver ubicaciones</span>
            </div>
          </button>
        )}

        {/* Patentes adentro */}
        <button
          type="button"
          onClick={verPatentes}
          className="group text-left bg-white border border-slate-200 rounded-xl p-3 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-300"
          title="Click para ver pestaña de patentes vehiculares"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wide">Patentes</span>
            <Car className="w-3.5 h-3.5 text-amber-500 group-hover:text-amber-700" />
          </div>
          <div className="text-2xl font-bold text-slate-800 group-hover:text-amber-700">
            {metricas.patentesAdentro}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
            <Link2 className="w-2.5 h-2.5" />
            <span className="group-hover:text-amber-700">Vehículos adentro</span>
          </div>
        </button>
      </div>

      {/* Última lectura — tarjeta adicional, ancha, tipo hipervínculo */}
      {metricas.ultimaLectura && (
        <button
          type="button"
          onClick={verUltimaLectura}
          className="group w-full text-left bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-xl p-3 hover:from-slate-700 hover:to-slate-600 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400"
          title="Click para filtrar por el día de la última lectura"
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
                <Clock className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wide">
                  Última lectura registrada
                </p>
                <p className="text-sm font-semibold">
                  {metricas.ultimaLectura}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] uppercase text-slate-400">Fecha y hora</p>
                <p className="text-sm font-mono">
                  {metricas.ultimaLecturaFecha
                    ? formatDateTimeCL(metricas.ultimaLecturaFecha)
                    : '—'}
                </p>
              </div>
              <div className="flex items-center gap-1 text-emerald-400 group-hover:text-emerald-300 text-xs">
                <Link2 className="w-3 h-3" />
                <span>Ver día</span>
              </div>
            </div>
          </div>
        </button>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'ubicaciones' | 'lecturas' | 'patentes' | 'ruta')}>
        <TabsList>
          {!isConserje && (
            <TabsTrigger value="ubicaciones">
              <MapPin className="w-4 h-4 mr-1" /> Ubicaciones ({locations.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="lecturas">
            <Clock className="w-4 h-4 mr-1" /> Lecturas ({scansTotal})
          </TabsTrigger>
          <TabsTrigger value="patentes">
            <Car className="w-4 h-4 mr-1" /> Patentes ({patentesTotal})
          </TabsTrigger>
          {isAdmin() && (
            <TabsTrigger value="ruta">
              <MapPinned className="w-4 h-4 mr-1" /> Ruta Guardia
            </TabsTrigger>
          )}
        </TabsList>

        {/* ─── Pestaña Ubicaciones (oculta para conserje) ─── */}
        {!isConserje && (
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
        )}

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
                        <TableHead className="min-w-[160px]">
                          <button
                            type="button"
                            onClick={() => toggleSort('fecha')}
                            className="inline-flex items-center gap-1 font-medium hover:text-blue-700 cursor-pointer"
                            title="Ordenar por fecha"
                          >
                            Fecha y hora
                            {sortBy === 'fecha' ? (
                              sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-slate-300" />
                            )}
                          </button>
                        </TableHead>
                        <TableHead className="min-w-[180px]">
                          <button
                            type="button"
                            onClick={() => toggleSort('ubicacion')}
                            className="inline-flex items-center gap-1 font-medium hover:text-blue-700 cursor-pointer"
                            title="Ordenar alfabéticamente por ubicación"
                          >
                            Ubicación
                            {sortBy === 'ubicacion' ? (
                              sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-slate-300" />
                            )}
                          </button>
                        </TableHead>
                        <TableHead className="min-w-[140px]">
                          <button
                            type="button"
                            onClick={() => toggleSort('guardia')}
                            className="inline-flex items-center gap-1 font-medium hover:text-blue-700 cursor-pointer"
                            title="Ordenar alfabéticamente por guardia"
                          >
                            Guardia
                            {sortBy === 'guardia' ? (
                              sortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3 text-slate-300" />
                            )}
                          </button>
                        </TableHead>
                        <TableHead className="min-w-[160px]">GPS</TableHead>
                        <TableHead>Notas</TableHead>
                        {isAdmin() && <TableHead className="w-[60px]">Acciones</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedScans.map((scan) => (
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

        {/* ─── Pestaña Patentes ─── */}
        <TabsContent value="patentes" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <div>
                    <Label className="text-xs">Ubicación</Label>
                    <Select value={filterPatenteUbicacion} onValueChange={setFilterPatenteUbicacion}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las ubicaciones</SelectItem>
                        {Array.from(new Set(locations
                          .filter(l => l.code.includes('ENTRADA-') || l.code.includes('SALIDA-'))
                          .map(l => l.code.match(/^QR-([A-ZÁÉÍÓÚÑ\s]+)-/)?.[1])
                          .filter(Boolean)
                        )).map((ubicacion) => (
                          <SelectItem key={ubicacion} value={ubicacion as string}>{ubicacion}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 mt-5">
                    <input
                      type="checkbox"
                      id="soloAbiertas"
                      checked={patentesSoloAbiertas}
                      onChange={(e) => setPatentesSoloAbiertas(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="soloAbiertas" className="cursor-pointer text-sm">
                      Solo adentro (sin salida)
                    </Label>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchPatentes(true)}
                  disabled={refreshingPatentes}
                >
                  <RefreshCw className={`w-3 h-3 mr-1 ${refreshingPatentes ? 'animate-spin' : ''}`} />
                  {refreshingPatentes ? 'Actualizando...' : 'Actualizar'}
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                Mostrando {patentes.length} de {patentesTotal} patentes ·
                {patentesSoloAbiertas ? ' solo vehiculos adentro' : ' todas, incluye salidas'} -
                Auto-actualización cada 15s
              </p>
            </CardContent>
          </Card>

          {loadingPatentes ? (
            <div className="flex items-center justify-center p-12">
              <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
              <span className="ml-2 text-slate-500">Cargando patentes...</span>
            </div>
          ) : patentes.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Car className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500">No hay patentes registradas con los filtros actuales</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[80px]">Foto</TableHead>
                        <TableHead className="min-w-[120px]">Ubicacion</TableHead>
                        <TableHead className="min-w-[140px]">Entrada</TableHead>
                        <TableHead className="min-w-[140px]">Salida</TableHead>
                        <TableHead className="min-w-[120px]">Guardia</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {patentes.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            {p.foto ? (
                              <img
                                src={p.foto}
                                alt="Foto"
                                loading="lazy"
                                decoding="async"
                                className="w-12 h-12 rounded-lg object-cover cursor-pointer hover:opacity-80"
                                onClick={() => window.open(p.foto, '_blank')}
                              />
                            ) : (
                              <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                                                                <Car className="w-5 h-5 text-slate-300" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-semibold text-sm">{p.ubicacion}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {formatDateTimeCL(p.entradaAt)}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {p.salidaAt ? formatDateTimeCL(p.salidaAt) : (
                              <span className="text-amber-500 font-bold">- Sin salida -</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{p.scannedBy || '-'}</TableCell>
                          <TableCell>
                            {p.salidaAt ? (
                              <Badge className="bg-slate-100 text-slate-600">Salio</Badge>
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-700">Adentro</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Pestaña Ruta Guardia (solo admin) ─── */}
        {isAdmin() && (
        <TabsContent value="ruta" className="space-y-4">
          <RutaGuardiaMap scans={scans} />
        </TabsContent>
        )}
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

      {/* ─── Modal Emitir Informe ─── */}
      <Dialog open={showInformeModal} onOpenChange={setShowInformeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-600" />
              Emitir Informe de Rondas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Selector de tipo de informe */}
            <div>
              <Label className="text-xs font-bold uppercase text-slate-500">Tipo de informe</Label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setInformeTipo('dia')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    informeTipo === 'dia'
                      ? 'bg-amber-50 border-amber-400 text-amber-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Por día
                </button>
                <button
                  type="button"
                  onClick={() => setInformeTipo('rango')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    informeTipo === 'rango'
                      ? 'bg-amber-50 border-amber-400 text-amber-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Por rango
                </button>
                <button
                  type="button"
                  onClick={() => setInformeTipo('trabajador')}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    informeTipo === 'trabajador'
                      ? 'bg-amber-50 border-amber-400 text-amber-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Trabajador
                </button>
              </div>
            </div>

            {/* Campos según tipo */}
            {informeTipo === 'dia' && (
              <div>
                <Label>Fecha del informe</Label>
                <Input
                  type="date"
                  value={informeFecha}
                  onChange={(e) => setInformeFecha(e.target.value)}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Genera un PDF con todas las lecturas registradas ese día (00:00 a 23:59 hora Chile).
                </p>
              </div>
            )}

            {informeTipo === 'rango' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Desde</Label>
                  <Input
                    type="date"
                    value={informeDesde}
                    onChange={(e) => setInformeDesde(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Hasta</Label>
                  <Input
                    type="date"
                    value={informeHasta}
                    onChange={(e) => setInformeHasta(e.target.value)}
                  />
                </div>
                <p className="col-span-2 text-xs text-slate-500">
                  Incluye todos los días desde el 00:00 de &quot;Desde&quot; hasta las 23:59 de &quot;Hasta&quot; (hora Chile).
                </p>
              </div>
            )}

            {informeTipo === 'trabajador' && (
              <>
                <div>
                  <Label>Trabajador / Guardia</Label>
                  <Select value={informeGuardia} onValueChange={setInformeGuardia}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un trabajador" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">— Selecciona —</SelectItem>
                      {guardias.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Desde (opcional)</Label>
                    <Input
                      type="date"
                      value={informeDesde}
                      onChange={(e) => setInformeDesde(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Hasta (opcional)</Label>
                    <Input
                      type="date"
                      value={informeHasta}
                      onChange={(e) => setInformeHasta(e.target.value)}
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  Si no seleccionas fechas, se generará el informe histórico completo del trabajador.
                </p>
              </>
            )}

            {/* Botón pre-llenar con hoy */}
            {informeTipo === 'dia' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInformeFecha(todayCL())}
                className="w-full"
              >
                <Calendar className="w-3 h-3 mr-1" /> Usar fecha de hoy ({todayCL()})
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInformeModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={generarInforme}
              disabled={generandoInforme}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {generandoInforme ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <FileText className="w-3 h-3 mr-1" />
                  Generar PDF
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Componente: RutaGuardiaMap ───
// Muestra un mapa interactivo con los puntos GPS de los escaneos del guardia.
// Usa OpenStreetMap (gratis, sin API key).

function RutaGuardiaMap({ scans }: { scans: QrScan[] }) {
  const [selectedGuardia, setSelectedGuardia] = useState<string>('all')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [puntosGps, setPuntosGps] = useState<Array<{id: string; name: string; code: string; gpsLat: number | null; gpsLng: number | null}>>([])
  const [editMode, setEditMode] = useState(false)
  const [mapaHtml, setMapaHtml] = useState<string>('')
  const [mapaLoading, setMapaLoading] = useState(false)

  // Cargar puntos GPS fijos (tambien recarga al salir del modo edicion)
  const cargarPuntosGps = useCallback(async () => {
    try {
      const res = await fetch('/api/qr-rondas/puntos-gps?_t=' + Date.now(), { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.puntos)) setPuntosGps(data.puntos)
      }
    } catch {}
  }, [])

  useEffect(() => {
    cargarPuntosGps()
  }, [cargarPuntosGps])

  // Al salir del modo edicion, recargar puntos GPS guardados
  const toggleEditMode = useCallback(() => {
    if (editMode) {
      // Saliendo del modo edicion → recargar
      cargarPuntosGps()
    }
    setEditMode(!editMode)
  }, [editMode, cargarPuntosGps])

  // Filtrar scans que tienen GPS
  const gpsScans = scans.filter(s => s.latitude != null && s.longitude != null)

  // Filtrar por guardia y fecha
  const filteredScans = gpsScans.filter(s => {
    if (selectedGuardia !== 'all' && s.scannedBy !== selectedGuardia) return false
    if (selectedDate) {
      const scanDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Santiago',
        year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(new Date(s.createdAt))
      if (scanDate !== selectedDate) return false
    }
    return true
  })

  // Ordenar por fecha
  const sortedScans = [...filteredScans].sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  // Lista unica de guardias
  const guardias = Array.from(new Set(gpsScans.map(s => s.scannedBy).filter(Boolean)))

  // Calcular centro del mapa
  const centerLat = sortedScans.length > 0
    ? sortedScans.reduce((sum, s) => sum + (s.latitude || 0), 0) / sortedScans.length
    : -33.3850
  const centerLng = sortedScans.length > 0
    ? sortedScans.reduce((sum, s) => sum + (s.longitude || 0), 0) / sortedScans.length
    : -70.5890

  // Generar URL de OpenStreetMap con marcadores y lineas
  // Usamos la API de staticmap de OSM o un iframe con leaflet

  // Construir parametros para el mapa
  const bbox = sortedScans.length > 0 ? (() => {
    const lats = sortedScans.map(s => s.latitude!)
    const lngs = sortedScans.map(s => s.longitude!)
    const minLat = Math.min(...lats) - 0.001
    const maxLat = Math.max(...lats) + 0.001
    const minLng = Math.min(...lngs) - 0.001
    const maxLng = Math.max(...lngs) + 0.001
    return `${minLng},${minLat},${maxLng},${maxLat}`
  })() : `${centerLng - 0.01},${centerLat - 0.01},${centerLng + 0.01},${centerLat + 0.01}`

  // Marcadores para el mapa (formato Leaflet)
  const markers = sortedScans.map((s, i) => ({
    lat: s.latitude!,
    lng: s.longitude!,
    num: i + 1,
    name: s.location?.name || 'Punto',
    time: formatDateTimeCL(s.createdAt),
    guardia: s.scannedBy,
  }))

  // Construir polyline para Leaflet
  const polyline = sortedScans.map(s => `[${s.latitude},${s.longitude}]`).join(',')

  // Puntos GPS para mapa editable
  const puntosParaEditar = puntosGps.map(p => ({
    id: p.id,
    name: p.name,
    code: p.code,
    lat: p.gpsLat,
    lng: p.gpsLng,
  }))

  // Cargar HTML del mapa via POST (evita URI_TOO_LONG con muchos puntos GPS)
  useEffect(() => {
    if (sortedScans.length === 0) {
      setMapaHtml('')
      return
    }

    let cancelled = false
    setMapaLoading(true)

    const loadMapa = async () => {
      try {
        if (editMode) {
          // Mapa editable: POST con puntos y ruta
          const res = await fetch('/api/qr-rondas/mapa-editable', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              puntos: puntosParaEditar,
              ruta: markers,
              center: `${centerLat},${centerLng}`
            })
          })
          if (res.ok && !cancelled) {
            const html = await res.text()
            setMapaHtml(html)
          }
        } else {
          // Mapa de ruta: POST con markers, polyline y fijos
          const res = await fetch('/api/qr-rondas/mapa', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              markers,
              polyline,
              fijos: puntosGps.filter(p => p.gpsLat != null && p.gpsLng != null),
              center: `${centerLat},${centerLng}`
            })
          })
          if (res.ok && !cancelled) {
            const html = await res.text()
            setMapaHtml(html)
          }
        }
      } catch (err) {
        console.error('Error cargando mapa:', err)
      } finally {
        if (!cancelled) setMapaLoading(false)
      }
    }

    loadMapa()
    return () => { cancelled = true }
  }, [sortedScans.length, editMode, centerLat, centerLng])

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-bold text-sm">Ruta del Guardia</h3>
              <p className="text-xs text-slate-500">
                {sortedScans.length} puntos con GPS · {guardias.length} guardia(s) · {puntosGps.length} puntos fijos
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={selectedGuardia} onValueChange={setSelectedGuardia}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todos los guardias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los guardias</SelectItem>
                  {guardias.map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-[150px]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {sortedScans.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <MapPinned className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500">No hay puntos GPS registrados con los filtros actuales</p>
            <p className="text-xs text-slate-400 mt-2">
              Los puntos GPS se registran automaticamente cuando el guardia escanea un QR de ronda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Boton editar posiciones */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleEditMode()}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              <MapPinned className="w-3 h-3 mr-1" />
              {editMode ? 'Ver ruta' : 'Editar posiciones GPS'}
            </Button>
          </div>

          {/* Mapa: iframe con srcdoc via POST (evita URI_TOO_LONG) */}
          <Card>
            <CardContent className="p-0 overflow-hidden">
              {mapaLoading ? (
                <div className="flex items-center justify-center" style={{ height: editMode ? '600px' : '500px' }}>
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-xs text-slate-400">Cargando mapa...</p>
                  </div>
                </div>
              ) : mapaHtml ? (
                <iframe
                  srcDoc={mapaHtml}
                  className="w-full"
                  style={{ height: editMode ? '600px' : '500px', border: 'none' }}
                  title={editMode ? "Editar puntos GPS" : "Mapa de ruta del guardia"}
                />
              ) : (
                <div className="flex items-center justify-center" style={{ height: editMode ? '600px' : '500px' }}>
                  <p className="text-sm text-slate-400">Error al cargar el mapa</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lista de puntos */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>Ubicacion</TableHead>
                      <TableHead className="min-w-[140px]">Hora</TableHead>
                      <TableHead>Guardia</TableHead>
                      <TableHead className="min-w-[160px]">Coordenadas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {markers.map((m, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">
                            {m.num}
                          </span>
                        </TableCell>
                        <TableCell className="font-semibold text-sm">{m.name}</TableCell>
                        <TableCell className="font-mono text-xs">{m.time}</TableCell>
                        <TableCell className="text-sm">{m.guardia}</TableCell>
                        <TableCell className="font-mono text-xs text-slate-500">
                          {m.lat.toFixed(5)}, {m.lng.toFixed(5)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
