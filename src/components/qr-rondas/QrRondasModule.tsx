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
  Car,
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

// ─── Utilidades de turno 4x4 ───
// Sistema de turnos:
//   - 4 días de trabajo, 4 días de descanso (ciclo de 8 días)
//   - Turno Día: 07:00 a 19:00
//   - Turno Noche: 19:00 a 07:00 del día siguiente
//   - Cambio de turno siempre a las 07:00 AM
//
// ANCHOR_DATE: fecha de inicio del primer ciclo (día 1 = primer día de trabajo).
// Ajustar según el calendario real del condominio.
const TURNO_ANCHOR_DATE = new Date('2025-01-06T07:00:00-04:00') // 6 enero 2025, primer día trabajo turno día
const CICLO_DIAS = 8 // 4 trabajo + 4 descanso

interface InfoTurno {
  esDiaDeTrabajo: boolean
  diaDelCiclo: number // 1-8
  turno: 'dia' | 'noche' | 'descanso'
  inicio: Date
  fin: Date
  label: string
}

/** Calcula la información del turno para una fecha dada (hora Chile). */
function calcularTurno(fecha: Date): InfoTurno {
  // Diferencia en milisegundos desde el anchor
  const diffMs = fecha.getTime() - TURNO_ANCHOR_DATE.getTime()
  const diffDias = Math.floor(diffMs / (24 * 60 * 60 * 1000))
  // diaDelCiclo: 1-8 (1-4 = trabajo, 5-8 = descanso)
  const diaDelCiclo = ((diffDias % CICLO_DIAS) + CICLO_DIAS) % CICLO_DIAS + 1
  const esDiaDeTrabajo = diaDelCiclo <= 4

  // Hora actual en Chile (sin zona horaria del objeto Date, calculada manualmente)
  const horaChileStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Santiago',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(fecha)
  const [hora, minuto] = horaChileStr.split(':').map(Number)
  const minutosActuales = hora * 60 + minuto

  // Turno día: 07:00 - 19:00 (420 - 1140 minutos)
  // Turno noche: 19:00 - 07:00 del día siguiente
  const esTurnoDia = minutosActuales >= 420 && minutosActuales < 1140 // 07:00 a 19:00

  // Calcular inicio y fin del turno actual
  const hoy = new Date(fecha)
  hoy.setHours(0, 0, 0, 0)

  if (esDiaDeTrabajo) {
    if (esTurnoDia) {
      // Turno día de hoy: 07:00 a 19:00
      const inicio = new Date(hoy)
      inicio.setHours(7, 0, 0, 0)
      const fin = new Date(hoy)
      fin.setHours(19, 0, 0, 0)
      return {
        esDiaDeTrabajo,
        diaDelCiclo,
        turno: 'dia',
        inicio,
        fin,
        label: `Turno Día (07:00 - 19:00)`,
      }
    } else {
      // Turno noche: si es antes de 07:00, pertenece al turno de noche que empezó ayer
      // si es después de 19:00, pertenece al turno de noche que termina mañana
      const inicio = new Date(hoy)
      const fin = new Date(hoy)
      if (minutosActuales < 420) {
        // Antes de 07:00 → turno noche empezó ayer 19:00, termina hoy 07:00
        inicio.setDate(inicio.getDate() - 1)
        inicio.setHours(19, 0, 0, 0)
        fin.setHours(7, 0, 0, 0)
      } else {
        // Después de 19:00 → turno noche empieza hoy 19:00, termina mañana 07:00
        inicio.setHours(19, 0, 0, 0)
        fin.setDate(fin.getDate() + 1)
        fin.setHours(7, 0, 0, 0)
      }
      return {
        esDiaDeTrabajo,
        diaDelCiclo,
        turno: 'noche',
        inicio,
        fin,
        label: `Turno Noche (19:00 - 07:00)`,
      }
    }
  } else {
    // Día de descanso — pero el guardia podría haber hecho escaneos antes de las 07:00
    // (fin del turno noche del día de trabajo anterior)
    if (minutosActuales < 420) {
      // Antes de 07:00 → todavía pertenece al turno noche del día anterior
      const inicio = new Date(hoy)
      inicio.setDate(inicio.getDate() - 1)
      inicio.setHours(19, 0, 0, 0)
      const fin = new Date(hoy)
      fin.setHours(7, 0, 0, 0)
      return {
        esDiaDeTrabajo: false,
        diaDelCiclo,
        turno: 'noche',
        inicio,
        fin,
        label: `Turno Noche (19:00 - 07:00) — día de descanso`,
      }
    }
    return {
      esDiaDeTrabajo,
      diaDelCiclo,
      turno: 'descanso',
      inicio: hoy,
      fin: hoy,
      label: `Día de descanso (día ${diaDelCiclo} del ciclo)`,
    }
  }
}

/** Devuelve el label legible del turno para mostrar en la UI. */
function labelTurno(info: InfoTurno): string {
  const inicioStr = new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(info.inicio)
  const finStr = new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(info.fin)
  return `${info.label} · ${inicioStr} a ${finStr}`
}

// ─── Componente principal ───

export function QrRondasModule() {
  const { user, isAdmin } = useSession()
  const isConserje = user?.rol === 'conserje'
  // Conserje siempre empieza en lecturas; admin en ubicaciones
  const [tab, setTab] = useState<'ubicaciones' | 'lecturas' | 'patentes'>(isConserje ? 'lecturas' : 'ubicaciones')
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

  // Turno actual (calculado automáticamente, pero el conserje puede sobreescribirlo)
  const [turnoActual, setTurnoActual] = useState<InfoTurno>(() => calcularTurno(new Date()))
  const [usarTurnoAuto, setUsarTurnoAuto] = useState(true)

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

  // Auto-refresh patentes cada 15s
  useEffect(() => {
    if (tab !== 'patentes') return
    const interval = setInterval(() => { fetchPatentes(false) }, 15000)
    return () => clearInterval(interval)
  }, [tab, fetchPatentes])

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

  // ─── Aplicar turno actual a los filtros ───
  // Cuando el conserje hace click en "Ver turno actual", se cargan las
  // fechas desde/hasta según el turno calculado.
  const aplicarTurnoAFiltros = (info: InfoTurno) => {
    setFilterFromDate(formatDateInputCL(info.inicio))
    setFilterToDate(formatDateInputCL(info.fin))
    // Limpiar otros filtros para ver todos los guardias y ubicaciones del turno
    setFilterLocationId('all')
    setFilterGuardia('all')
  }

  // ─── Exportar PDF de lecturas ───
  // Genera un PDF con todas las lecturas filtradas (por turno, fecha, guardia, etc.)
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

      // ─── Información del turno/filtros ───
      let y = 38
      doc.setTextColor(40, 40, 40)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Filtros aplicados:', margin, y)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      y += 5
      doc.text(`• Turno: ${labelTurno(turnoActual)}`, margin, y); y += 4
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
      const turnoLabel = turnoActual.turno === 'dia' ? 'dia' : turnoActual.turno === 'noche' ? 'noche' : 'custom'
      doc.save(`Rondas-QR-${turnoLabel}-${fechaArchivo}.pdf`)

      toast.success(`PDF generado: ${scans.length} lecturas`)
    } catch (err) {
      console.error('Error exportando PDF:', err)
      toast.error('Error al generar PDF')
    } finally {
      setExportingPdf(false)
    }
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

      {/* ─── Panel de turno actual (visible para todos, destacado para conserje) ─── */}
      <Card className={isConserje ? 'border-blue-300 bg-blue-50/50' : ''}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <p className="text-xs font-bold text-slate-500 uppercase mb-1">Turno actual</p>
              <p className="text-sm font-bold text-slate-800">{labelTurno(turnoActual)}</p>
              <p className="text-xs text-slate-500 mt-1">
                Día {turnoActual.diaDelCiclo} del ciclo de 8 días (4 trabajo + 4 descanso) ·
                {turnoActual.esDiaDeTrabajo ? ' día de trabajo' : ' día de descanso'}
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const t = calcularTurno(new Date())
                  setTurnoActual(t)
                  aplicarTurnoAFiltros(t)
                  setUsarTurnoAuto(true)
                }}
                title="Cargar el turno actual en los filtros"
              >
                <Clock className="w-3 h-3 mr-1" /> Ver turno actual
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  // Turno día de hoy
                  const hoy = new Date()
                  hoy.setHours(7, 0, 0, 0)
                  const fin = new Date(hoy)
                  fin.setHours(19, 0, 0, 0)
                  const t: InfoTurno = {
                    esDiaDeTrabajo: true, diaDelCiclo: 1, turno: 'dia',
                    inicio: hoy, fin, label: 'Turno Día (07:00 - 19:00)',
                  }
                  setTurnoActual(t)
                  aplicarTurnoAFiltros(t)
                  setUsarTurnoAuto(false)
                }}
              >
                Turno Día
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  // Turno noche: 19:00 hoy a 07:00 mañana
                  const inicio = new Date()
                  inicio.setHours(19, 0, 0, 0)
                  const fin = new Date(inicio)
                  fin.setDate(fin.getDate() + 1)
                  fin.setHours(7, 0, 0, 0)
                  const t: InfoTurno = {
                    esDiaDeTrabajo: true, diaDelCiclo: 1, turno: 'noche',
                    inicio, fin, label: 'Turno Noche (19:00 - 07:00)',
                  }
                  setTurnoActual(t)
                  aplicarTurnoAFiltros(t)
                  setUsarTurnoAuto(false)
                }}
              >
                Turno Noche
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'ubicaciones' | 'lecturas' | 'patentes')}>
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
                        <TableHead className="min-w-[100px]">Patente</TableHead>
                        <TableHead className="min-w-[120px]">Ubicación</TableHead>
                        <TableHead className="min-w-[140px]">Entrada</TableHead>
                        <TableHead className="min-w-[140px]">Salida</TableHead>
                        <TableHead className="min-w-[120px]">Guardia</TableHead>
                        <TableHead className="min-w-[140px]">GPS Entrada</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {patentes.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <span className="font-mono font-black text-sm bg-slate-100 px-2 py-1 rounded">
                              {p.patente}
                            </span>
                          </TableCell>
                          <TableCell className="font-semibold text-sm">{p.ubicacion}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {formatDateTimeCL(p.entradaAt)}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {p.salidaAt ? formatDateTimeCL(p.salidaAt) : (
                              <span className="text-amber-500 font-bold">— Sin salida —</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{p.scannedBy || '—'}</TableCell>
                          <TableCell>
                            {p.latitude != null && p.longitude != null ? (
                              <a
                                href={`https://www.openstreetmap.org/?mlat=${p.latitude}&mlon=${p.longitude}#map=18/${p.latitude}/${p.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline"
                              >
                                <MapPinned className="w-3 h-3" />
                                {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}
                              </a>
                            ) : (
                              <span className="text-xs text-amber-500">Sin GPS</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {p.salidaAt ? (
                              <Badge className="bg-slate-100 text-slate-600">Salió</Badge>
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
