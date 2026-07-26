'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ClipboardCheck,
  Download,
  CheckCircle2,
  Eye,
  Save,
  AlertCircle,
  Loader2,
  User,
  MapPin,
  Clock,
  Printer,
  Pencil,
  CheckCheck,
  RotateCcw,
  X,
  Plus,
  Trash2,
  Upload,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'
import { imprimirPDFDoc } from '@/lib/utils'
import { useSession } from '@/hooks/use-session'
import { TableroIndicadores } from '@/components/ui/tablero-indicadores'
import {
  BADGE_FRECUENCIA,
  DOT_FRECUENCIA,
} from '@/lib/pmi/lv-data'
import { CumplimientoPanel } from '@/components/pmi/CumplimientoPanel'

// ============================================
// Tipos
// ============================================
interface LVSeccion {
  seccion: string
  titulo: string
  items: string[]
}

interface LV {
  id: string
  codigo: string
  nombre: string
  sector: string
  frecuencia: string
  responsable: string
  personalRequerido?: string | null
  descripcion?: string | null
  items: LVSeccion[]
  activa: boolean
}

interface LVCalendario {
  id: string
  codigo: string
  nombre: string
  sector: string
  frecuencia: string
  responsable: string
}

interface RegistroLV {
  id: string
  lvId: string
  fecha: string
  estado: string
  responsableEjecucion?: string | null
}

interface CalendarioResponse {
  mes: string
  calendario: Record<string, LVCalendario[]>
  registros: Record<string, RegistroLV[]>
  totalLvs: number
  totalDiasConLVs: number
}

// ============================================
// Constantes
// ============================================
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

// Fecha "Hoy" — se calcula dinámicamente en zona America/Santiago (UTC-4)
// para que el calendario y las LVs reflejen siempre el día actual real.
function fechaSantiagoDate(): Date {
  const ahora = new Date()
  // UTC-4 (Chile continental, horario estándar — DST desactivado desde 2015)
  const tzOffset = -4 * 60
  return new Date(ahora.getTime() + tzOffset * 60 * 1000)
}

function fechaSantiagoStr(d: Date): string {
  // Extraer YYYY-MM-DD del Date ya ajustado a Santiago
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const TODAY = fechaSantiagoDate()
const TODAY_STR = fechaSantiagoStr(TODAY)

// ============================================
// Utilidades
// ============================================
function formatDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatFechaLarga(fechaStr: string): string {
  const [y, m, d] = fechaStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  return `${dias[date.getDay()]}, ${d} de ${MESES[m - 1]} de ${y}`
}

// ============================================
// Componente principal
// ============================================
export function PMIModule() {
  const { user, isAdmin } = useSession()
  const esAdmin = isAdmin()

  // Estado de calendario — mes inicial = mes actual (zona Santiago)
  const [mesActual, setMesActual] = useState<Date>(new Date(TODAY.getUTCFullYear(), TODAY.getUTCMonth(), 1))
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>(TODAY_STR)

  // Datos
  const [calendario, setCalendario] = useState<CalendarioResponse | null>(null)
  const [lvs, setLvs] = useState<LV[]>([])
  const [loading, setLoading] = useState(true)
  const [cargandoSeed, setCargandoSeed] = useState(false)

  // Dialog de detalle
  const [lvDetalle, setLvDetalle] = useState<LV | null>(null)
  const [dialogDetalleOpen, setDialogDetalleOpen] = useState(false)
  const [itemsCompletados, setItemsCompletados] = useState<Set<string>>(new Set())
  const [observaciones, setObservaciones] = useState('')
  const [guardandoRegistro, setGuardandoRegistro] = useState(false)
  // PDF de respaldo obligatorio para completar la LV
  const [pdfRespaldoUrl, setPdfRespaldoUrl] = useState<string>('')
  const [pdfRespaldoNombre, setPdfRespaldoNombre] = useState<string>('')

  // Dialog de edición de LV
  const [lvEditando, setLvEditando] = useState<LV | null>(null)
  const [dialogEditarOpen, setDialogEditarOpen] = useState(false)
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)

  // Operación masiva
  const [procesandoMasivo, setProcesandoMasivo] = useState(false)

  // Cargar LVs (para el dialog)
  const cargarLvs = useCallback(async () => {
    try {
      const res = await fetch('/api/pmi')
      if (res.ok) {
        const data = await res.json()
        setLvs(data)
      }
    } catch (e) {
      console.error('Error cargando LVs:', e)
    }
  }, [])

  // Cargar calendario
  const cargarCalendario = useCallback(async () => {
    const mesStr = `${mesActual.getFullYear()}-${String(mesActual.getMonth() + 1).padStart(2, '0')}`
    try {
      const res = await fetch(`/api/pmi/calendario?mes=${mesStr}`)
      if (res.ok) {
        const data = await res.json()
        setCalendario(data)
      }
    } catch (e) {
      console.error('Error cargando calendario:', e)
    } finally {
      setLoading(false)
    }
  }, [mesActual])

  // Carga inicial
  useEffect(() => {
    cargarLvs()
    cargarCalendario()
  }, [cargarLvs, cargarCalendario])

  // Auto-refresh cada 60s
  useEffect(() => {
    const id = setInterval(() => {
      cargarLvs()
      cargarCalendario()
    }, 300000) // 5 min (optimizado BD)
    return () => clearInterval(id)
  }, [cargarLvs, cargarCalendario])

  // Navegación del calendario
  const mesAnterior = () => {
    setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() - 1, 1))
  }
  const mesSiguiente = () => {
    setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 1))
  }
  const irHoy = () => {
    setMesActual(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1))
    setFechaSeleccionada(TODAY_STR)
  }

  // ===== Construir grid del calendario =====
  const diasDelMes = useMemo(() => {
    const anio = mesActual.getFullYear()
    const mes = mesActual.getMonth()
    const primerDia = new Date(anio, mes, 1)
    const ultimoDia = new Date(anio, mes + 1, 0)

    // Lunes=0, Domingo=6 (convertir de getDay: Dom=0, Lun=1, ...)
    const primerDiaSemana = (primerDia.getDay() + 6) % 7
    const totalDias = ultimoDia.getDate()

    const celdas: (Date | null)[] = []
    // Rellenar celdas vacías al inicio
    for (let i = 0; i < primerDiaSemana; i++) celdas.push(null)
    // Días del mes
    for (let d = 1; d <= totalDias; d++) celdas.push(new Date(anio, mes, d))
    // Rellenar hasta completar la última semana
    while (celdas.length % 7 !== 0) celdas.push(null)

    return celdas
  }, [mesActual])

  // LVs del día seleccionado
  const lvsDelDia = useMemo(() => {
    if (!calendario?.calendario) return []
    return calendario.calendario[fechaSeleccionada] || []
  }, [calendario, fechaSeleccionada])

  // Registros del día seleccionado
  const registrosDelDia = useMemo(() => {
    if (!calendario?.registros) return []
    return calendario.registros[fechaSeleccionada] || []
  }, [calendario, fechaSeleccionada])

  // ===== Acciones =====
  const ejecutarSeed = async () => {
    if (!esAdmin) return
    setCargandoSeed(true)
    try {
      const res = await fetch('/api/pmi/seed', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast.success(
          `PMI cargado: ${data.creadas} nuevas, ${data.actualizadas} actualizadas, ${data.errores} errores`,
        )
        await cargarLvs()
        await cargarCalendario()
      } else {
        toast.error(data.error || 'Error al cargar PMI')
      }
    } catch (e) {
      console.error(e)
      toast.error('Error de conexión al cargar PMI')
    } finally {
      setCargandoSeed(false)
    }
  }

  const abrirDetalle = (lvCal: LVCalendario) => {
    const lvCompleta = lvs.find(l => l.id === lvCal.id)
    if (!lvCompleta) {
      toast.error('LV no encontrada, recargando...')
      cargarLvs()
      return
    }
    setLvDetalle(lvCompleta)
    setItemsCompletados(new Set())
    setObservaciones('')
    setPdfRespaldoUrl('')
    setPdfRespaldoNombre('')
    setDialogDetalleOpen(true)
  }

  const toggleItem = (seccion: string, idx: number) => {
    const key = `${seccion}-${idx}`
    setItemsCompletados(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // ===== Subir PDF de respaldo (base64 data URL) =====
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast.error('Solo se permiten archivos PDF')
      e.target.value = ''
      return
    }
    // Máximo 10 MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El PDF es demasiado grande. Máximo 10 MB.')
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setPdfRespaldoUrl(base64)
      setPdfRespaldoNombre(file.name)
      toast.success(`PDF cargado: ${file.name} (${(file.size / 1024).toFixed(0)} KB)`)
    }
    reader.onerror = () => toast.error('Error al leer el PDF')
    reader.readAsDataURL(file)
  }

  const handleRemovePdf = () => {
    setPdfRespaldoUrl('')
    setPdfRespaldoNombre('')
  }

  const guardarRegistro = async () => {
    if (!lvDetalle) return
    // Validación client-side: PDF obligatorio para completar
    if (!pdfRespaldoUrl) {
      toast.error('📎 Para completar la LV es obligatorio subir un PDF de respaldo.')
      return
    }
    setGuardandoRegistro(true)
    try {
      const res = await fetch('/api/pmi/registros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lvId: lvDetalle.id,
          fecha: fechaSeleccionada,
          hora: new Date().toTimeString().substring(0, 5),
          responsableEjecucion: user?.nombre || 'Sistema',
          estado: 'Completado',
          observaciones,
          itemsCompletados: Array.from(itemsCompletados),
          pdfRespaldoUrl,
          pdfRespaldoNombre,
        }),
      })
      if (res.ok) {
        toast.success(`Registro guardado: ${lvDetalle.codigo}`)
        setDialogDetalleOpen(false)
        setLvDetalle(null)
        setPdfRespaldoUrl('')
        setPdfRespaldoNombre('')
        await cargarCalendario()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Error al guardar registro')
      }
    } catch (e) {
      console.error(e)
      toast.error('Error de conexión')
    } finally {
      setGuardandoRegistro(false)
    }
  }

  const marcarCompletadaRapido = async (lvCal: LVCalendario) => {
    try {
      const res = await fetch('/api/pmi/registros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lvId: lvCal.id,
          fecha: fechaSeleccionada,
          hora: new Date().toTimeString().substring(0, 5),
          responsableEjecucion: user?.nombre || 'Sistema',
          estado: 'Completado',
          itemsCompletados: [],
        }),
      })
      if (res.ok) {
        toast.success(`${lvCal.codigo} marcada como completada`)
        await cargarCalendario()
      } else {
        toast.error('Error al marcar como completada')
      }
    } catch (e) {
      console.error(e)
      toast.error('Error de conexión')
    }
  }

  // ===== Marcar/desmarcar como pendiente una LV individual =====
  const desmarcarLV = async (lvCal: LVCalendario) => {
    const registro = registrosDelDia.find(r => r.lvId === lvCal.id)
    if (!registro) {
      toast.info('Esta LV no tiene registro para desmarcar')
      return
    }
    try {
      const res = await fetch(`/api/pmi/registros/${registro.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'Pendiente' }),
      })
      if (res.ok) {
        toast.success(`${lvCal.codigo} marcada como pendiente`)
        await cargarCalendario()
      } else {
        toast.error('Error al desmarcar')
      }
    } catch (e) {
      console.error(e)
      toast.error('Error de conexión')
    }
  }

  // ===== Operación masiva: marcar todas como completadas =====
  const marcarTodasCompletadas = async () => {
    if (lvsDelDia.length === 0) return
    setProcesandoMasivo(true)
    try {
      const res = await fetch('/api/pmi/registros/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: fechaSeleccionada,
          accion: 'completar',
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`${data.afectados} LVs marcadas como completadas`)
        await cargarCalendario()
      } else {
        toast.error(data.error || 'Error en operación masiva')
      }
    } catch (e) {
      console.error(e)
      toast.error('Error de conexión')
    } finally {
      setProcesandoMasivo(false)
    }
  }

  // ===== Operación masiva: marcar todas como pendientes =====
  const marcarTodasPendientes = async () => {
    if (lvsDelDia.length === 0) return
    setProcesandoMasivo(true)
    try {
      const res = await fetch('/api/pmi/registros/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: fechaSeleccionada,
          accion: 'desmarcar',
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`${data.afectados} LVs marcadas como pendientes`)
        await cargarCalendario()
      } else {
        toast.error(data.error || 'Error en operación masiva')
      }
    } catch (e) {
      console.error(e)
      toast.error('Error de conexión')
    } finally {
      setProcesandoMasivo(false)
    }
  }

  // ===== Imprimir LV individual (formato checklist con logo) =====
  const imprimirLV = async (lv: LV) => {
    try {
      const { default: jsPDF } = await import('jspdf')
      // Orientación landscape para tener más ancho y caber en una hoja
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      let y = 8

      // ===== Cargar logo desde /logo.png =====
      let logoDataUrl: string | null = null
      try {
        const logoRes = await fetch('/logo.png')
        if (logoRes.ok) {
          const blob = await logoRes.blob()
          logoDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(blob)
          })
        }
      } catch {}

      // ===== Header corporativo =====
      doc.setFillColor(15, 32, 68)
      doc.rect(0, 0, pageWidth, 18, 'F')

      // Logo en esquina superior derecha (dentro del header azul)
      if (logoDataUrl) {
        try {
          // Logo blanco sobre fondo azul: usar formato PNG con fondo transparente/blanco
          // Tamaño: 30mm de ancho, proporcional
          const logoW = 30
          const logoH = 12
          doc.addImage(logoDataUrl, 'PNG', pageWidth - logoW - 5, 3, logoW, logoH)
        } catch (e) {
          console.warn('No se pudo agregar el logo:', e)
        }
      }

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('ASESORÍAS INTEGRALES CyJ', 8, 7)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.text('Condominio Laguna Norte · Lampa, Santiago · Gestión Profesional de Condominios', 8, 12)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(lv.codigo, pageWidth / 2, 7, { align: 'center' })
      doc.setFontSize(6)
      doc.setFont('helvetica', 'normal')
      doc.text(`Versión 1.0 | ${new Date().getFullYear()}`, pageWidth / 2, 12, { align: 'center' })
      doc.setTextColor(0, 0, 0)
      y = 22

      // ===== Título de la LV (en dos líneas si es necesario) =====
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(15, 32, 68)
      const tituloLines = doc.splitTextToSize(lv.nombre, pageWidth - 20)
      doc.text(tituloLines, pageWidth / 2, y, { align: 'center' })
      y += tituloLines.length * 4 + 1
      doc.setTextColor(0, 0, 0)

      // ===== Info en una sola línea compacta =====
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      const fechaCorta = fechaSeleccionada.split('-').reverse().join('/')
      const infoLine = `Sector: ${lv.sector}   |   Frecuencia: ${lv.frecuencia}   |   Responsable: ${lv.responsable}   |   Fecha: ${fechaCorta}   |   Turno: __________   |   Hora: __________`
      const infoLines = doc.splitTextToSize(infoLine, pageWidth - 20)
      doc.text(infoLines, pageWidth / 2, y, { align: 'center' })
      y += infoLines.length * 3.5 + 2

      // Línea separadora
      doc.setDrawColor(15, 32, 68)
      doc.setLineWidth(0.4)
      doc.line(8, y, pageWidth - 8, y)
      y += 3

      // ===== Calcular dimensiones para tabla de checklist =====
      // Columnas: Ítem (ancho grande) | OK | NO OK | N/A | Observación
      const colItemX = 8
      const colItemW = pageWidth * 0.55 // 55% del ancho para el ítem
      const colOkX = colItemX + colItemW
      const colOkW = 15
      const colNoOkX = colOkX + colOkW
      const colNoOkW = 15
      const colNaX = colNoOkX + colNoOkW
      const colNaW = 12
      const colObsX = colNaX + colNaW
      const colObsW = pageWidth - colObsX - 8

      // Función para dibujar header de columnas
      const drawColHeader = () => {
        doc.setFillColor(15, 32, 68)
        doc.rect(colItemX, y - 3, colItemW, 5, 'F')
        doc.rect(colOkX, y - 3, colOkW, 5, 'F')
        doc.rect(colNoOkX, y - 3, colNoOkW, 5, 'F')
        doc.rect(colNaX, y - 3, colNaW, 5, 'F')
        doc.rect(colObsX, y - 3, colObsW, 5, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(6)
        doc.setFont('helvetica', 'bold')
        doc.text('ÍTEM DE VERIFICACIÓN', colItemX + 1, y + 0.5)
        doc.text('OK', colOkX + colOkW / 2, y + 0.5, { align: 'center' })
        doc.text('NO OK', colNoOkX + colNoOkW / 2, y + 0.5, { align: 'center' })
        doc.text('N/A', colNaX + colNaW / 2, y + 0.5, { align: 'center' })
        doc.text('OBSERVACIÓN', colObsX + 1, y + 0.5)
        doc.setTextColor(0, 0, 0)
        y += 5
      }

      drawColHeader()

      // ===== Secciones e items con checklist =====
      doc.setFontSize(7)
      for (const seccion of lv.items) {
        // Verificar si quedaba poco espacio para la sección + al menos un ítem
        if (y > pageHeight - 25) {
          doc.addPage()
          y = 8
          drawColHeader()
        }

        // Fila de título de sección
        doc.setFillColor(241, 245, 249)
        doc.rect(colItemX, y - 3, pageWidth - 16, 4.5, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(15, 32, 68)
        doc.setFontSize(7)
        doc.text(`${seccion.seccion}. ${seccion.titulo}`, colItemX + 1, y + 0.3)
        doc.setTextColor(0, 0, 0)
        y += 5

        // Items
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6.5)
        for (const item of seccion.items) {
          if (y > pageHeight - 15) {
            doc.addPage()
            y = 8
            drawColHeader()
          }

          // Calcular alto de la fila según el texto
          const itemLines = doc.splitTextToSize(item, colItemW - 3)
          const rowH = Math.max(4.5, itemLines.length * 3 + 1.5)

          // Bordes de la fila (líneas sutiles)
          doc.setDrawColor(220, 220, 220)
          doc.setLineWidth(0.1)
          doc.line(colItemX, y - 3 + rowH, pageWidth - 8, y - 3 + rowH)
          doc.line(colOkX, y - 3, colOkX, y - 3 + rowH)
          doc.line(colNoOkX, y - 3, colNoOkX, y - 3 + rowH)
          doc.line(colNaX, y - 3, colNaX, y - 3 + rowH)
          doc.line(colObsX, y - 3, colObsX, y - 3 + rowH)

          // Texto del ítem
          doc.text(itemLines, colItemX + 1, y - 1)

          // Casillas de verificación (cuadros vacíos para marcar a mano)
          doc.setDrawColor(80, 80, 80)
          doc.setLineWidth(0.3)
          const boxSize = 3.5
          // OK
          doc.rect(colOkX + (colOkW - boxSize) / 2, y - 3 + (rowH - boxSize) / 2, boxSize, boxSize)
          // NO OK
          doc.rect(colNoOkX + (colNoOkW - boxSize) / 2, y - 3 + (rowH - boxSize) / 2, boxSize, boxSize)
          // N/A
          doc.rect(colNaX + (colNaW - boxSize) / 2, y - 3 + (rowH - boxSize) / 2, boxSize, boxSize)

          y += rowH
        }
        y += 1.5
      }

      // ===== Observaciones (compacto, 2 líneas) =====
      if (y > pageHeight - 20) {
        doc.addPage()
        y = 8
      }
      y += 2
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(15, 32, 68)
      doc.text('Observaciones / Acciones Correctivas:', 8, y)
      doc.setTextColor(0, 0, 0)
      y += 3
      doc.setDrawColor(150, 150, 150)
      doc.setLineWidth(0.2)
      for (let i = 0; i < 2; i++) {
        doc.line(8, y, pageWidth - 8, y)
        y += 4
      }
      y += 3

      // ===== Firmas (compacto) =====
      if (y > pageHeight - 15) {
        doc.addPage()
        y = 8
      }
      const firmY = Math.max(y + 5, pageHeight - 18)
      doc.setDrawColor(0, 0, 0)
      doc.setLineWidth(0.3)
      doc.line(20, firmY, 110, firmY)
      doc.line(pageWidth - 110, firmY, pageWidth - 20, firmY)
      doc.setFontSize(6.5)
      doc.setFont('helvetica', 'normal')
      doc.text('Operario Responsable', 65, firmY + 3, { align: 'center' })
      doc.text('Supervisor / Jefe de Mantenimiento', pageWidth - 65, firmY + 3, { align: 'center' })
      doc.text('Nombre · Firma · RUT · Fecha', 65, firmY + 6, { align: 'center' })
      doc.text('Nombre · Firma · RUT · Fecha', pageWidth - 65, firmY + 6, { align: 'center' })

      // ===== Footer =====
      doc.setFontSize(6)
      doc.setTextColor(120, 120, 120)
      doc.text(
        `Elaborado por Asesorías Integrales CyJ · Uso Interno · Generado el ${new Date().toLocaleString('es-CL')}`,
        pageWidth / 2,
        pageHeight - 3,
        { align: 'center' },
      )

      // Abrir diálogo de impresión
      doc.autoPrint()
      imprimirPDFDoc(doc, `LV-${lv.codigo}.pdf`)
      toast.success(`Preparando impresión de ${lv.codigo}`)
    } catch (e) {
      console.error(e)
      toast.error('Error al generar PDF para impresión')
    }
  }

  // ===== Abrir dialog de edición de LV =====
  const abrirEdicion = (lv: LV) => {
    setLvEditando(JSON.parse(JSON.stringify(lv))) // clon profundo
    setDialogEditarOpen(true)
  }

  // ===== Guardar edición de LV =====
  const guardarEdicion = async () => {
    if (!lvEditando) return
    setGuardandoEdicion(true)
    try {
      const res = await fetch(`/api/pmi/${lvEditando.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: lvEditando.codigo,
          nombre: lvEditando.nombre,
          sector: lvEditando.sector,
          frecuencia: lvEditando.frecuencia,
          responsable: lvEditando.responsable,
          personalRequerido: lvEditando.personalRequerido,
          descripcion: lvEditando.descripcion,
          items: lvEditando.items,
          activa: lvEditando.activa,
        }),
      })
      if (res.ok) {
        toast.success(`${lvEditando.codigo} actualizada`)
        setDialogEditarOpen(false)
        setLvEditando(null)
        await cargarLvs()
        await cargarCalendario()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Error al guardar')
      }
    } catch (e) {
      console.error(e)
      toast.error('Error de conexión')
    } finally {
      setGuardandoEdicion(false)
    }
  }

  // ===== Helpers de edición de items =====
  const editarItem = (sIdx: number, iIdx: number, valor: string) => {
    if (!lvEditando) return
    const nuevo = { ...lvEditando, items: [...lvEditando.items] }
    nuevo.items[sIdx] = { ...nuevo.items[sIdx], items: [...nuevo.items[sIdx].items] }
    nuevo.items[sIdx].items[iIdx] = valor
    setLvEditando(nuevo)
  }

  const eliminarItem = (sIdx: number, iIdx: number) => {
    if (!lvEditando) return
    const nuevo = { ...lvEditando, items: [...lvEditando.items] }
    nuevo.items[sIdx] = { ...nuevo.items[sIdx], items: nuevo.items[sIdx].items.filter((_, i) => i !== iIdx) }
    setLvEditando(nuevo)
  }

  const agregarItem = (sIdx: number) => {
    if (!lvEditando) return
    const nuevo = { ...lvEditando, items: [...lvEditando.items] }
    nuevo.items[sIdx] = { ...nuevo.items[sIdx], items: [...nuevo.items[sIdx].items, 'Nuevo ítem'] }
    setLvEditando(nuevo)
  }

  const editarTituloSeccion = (sIdx: number, valor: string) => {
    if (!lvEditando) return
    const nuevo = { ...lvEditando, items: [...lvEditando.items] }
    nuevo.items[sIdx] = { ...nuevo.items[sIdx], titulo: valor }
    setLvEditando(nuevo)
  }

  const agregarSeccion = () => {
    if (!lvEditando) return
    const nuevaLetra = String.fromCharCode(65 + lvEditando.items.length) // A, B, C, ...
    setLvEditando({
      ...lvEditando,
      items: [...lvEditando.items, { seccion: nuevaLetra, titulo: 'Nueva sección', items: ['Nuevo ítem'] }],
    })
  }

  const eliminarSeccion = (sIdx: number) => {
    if (!lvEditando) return
    setLvEditando({
      ...lvEditando,
      items: lvEditando.items.filter((_, i) => i !== sIdx),
    })
  }

  const exportarPDFDia = async () => {
    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      let y = 20

      // Header
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('PMI - Listas de Verificación del día', pageWidth / 2, y, { align: 'center' })
      y += 8

      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.text(formatFechaLarga(fechaSeleccionada), pageWidth / 2, y, { align: 'center' })
      y += 10

      if (lvsDelDia.length === 0) {
        y += 10
        doc.setFontSize(12)
        doc.text('No hay LVs programadas para este día.', pageWidth / 2, y, { align: 'center' })
      } else {
        for (const lv of lvsDelDia) {
          if (y > 270) {
            doc.addPage()
            y = 20
          }

          // Cuadro por LV
          doc.setDrawColor(15, 32, 68)
          doc.setFillColor(245, 247, 250)
          doc.roundedRect(15, y - 4, pageWidth - 30, 22, 2, 2, 'FD')

          doc.setFontSize(11)
          doc.setFont('helvetica', 'bold')
          doc.text(`${lv.codigo} - ${lv.nombre}`, 18, y + 2)

          doc.setFontSize(9)
          doc.setFont('helvetica', 'normal')
          doc.text(`Sector: ${lv.sector}`, 18, y + 7)
          doc.text(`Frecuencia: ${lv.frecuencia}`, 18, y + 12)
          doc.text(`Responsable: ${lv.responsable}`, pageWidth / 2 + 5, y + 7)

          const tieneRegistro = registrosDelDia.some(r => r.lvId === lv.id)
          const estado = tieneRegistro ? 'Completada' : 'Pendiente'
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(tieneRegistro ? 22 : 200, tieneRegistro ? 100 : 80, 50)
          doc.text(`Estado: ${estado}`, pageWidth / 2 + 5, y + 12)
          doc.setTextColor(0, 0, 0)

          y += 26
        }
      }

      // Footer
      doc.setFontSize(8)
      doc.setFont('helvetica', 'italic')
      doc.text(
        `Asesorías Integrales CyJ · PMI Laguna Norte · Generado el ${new Date().toLocaleString('es-CL')}`,
        pageWidth / 2,
        285,
        { align: 'center' },
      )

      doc.save(`PMI_${fechaSeleccionada}.pdf`)
      toast.success('PDF exportado')
    } catch (e) {
      console.error(e)
      toast.error('Error al generar PDF')
    }
  }

  // ===== Stats =====
  const totalLVsMes = useMemo(() => {
    if (!calendario?.calendario) return 0
    return Object.values(calendario.calendario).reduce((acc, lvs) => acc + lvs.length, 0)
  }, [calendario])

  const totalCompletadasHoy = useMemo(() => {
    return registrosDelDia.filter(r => r.estado === 'Completado').length
  }, [registrosDelDia])

  const totalPendientesHoy = lvsDelDia.length - totalCompletadasHoy

  const totalLVsActivas = lvs.filter(l => l.activa).length

  return (
    <div className="space-y-5">
      <TableroIndicadores
        columnas={4}
        cards={[
          {
            titulo: 'LVs Activas',
            numero: totalLVsActivas,
            icon: <ClipboardCheck className="w-4 h-4" />,
            color: 'azul',
            subtitulo: 'Total PMI',
          },
          {
            titulo: 'LVs Hoy',
            numero: lvsDelDia.length,
            icon: <CalendarDays className="w-4 h-4" />,
            color: 'verde',
            subtitulo: formatFechaLarga(fechaSeleccionada).split(',')[0],
          },
          {
            titulo: 'Completadas Hoy',
            numero: totalCompletadasHoy,
            icon: <CheckCircle2 className="w-4 h-4" />,
            color: 'cyan',
            subtitulo: `${totalPendientesHoy} pendientes`,
          },
          {
            titulo: 'LVs del Mes',
            numero: totalLVsMes,
            icon: <ClipboardCheck className="w-4 h-4" />,
            color: 'purpura',
            subtitulo: `${calendario?.totalDiasConLVs || 0} días activos`,
          },
        ]}
      />

      {/* Botones superiores */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {esAdmin && (
            <Button
              onClick={ejecutarSeed}
              disabled={cargandoSeed}
              className="bg-[#0f2044] hover:bg-[#0a1628]"
              size="sm"
            >
              {cargandoSeed ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ClipboardCheck className="w-4 h-4 mr-2" />
              )}
              Cargar LVs del PMI
            </Button>
          )}
          <Button
            onClick={exportarPDFDia}
            variant="outline"
            size="sm"
            disabled={lvsDelDia.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar PDF del día
          </Button>
        </div>

        {lvs.length === 0 && esAdmin && (
          <div className="flex items-center gap-2 text-amber-600 text-sm">
            <AlertCircle className="w-4 h-4" />
            No hay LVs cargadas. Clic en "Cargar LVs del PMI" para inicializar.
          </div>
        )}
      </div>

      {/* ===== Control de Cumplimiento PMI (panel auto-actualizado) ===== */}
      <CumplimientoPanel />


      {/* Layout 2 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* ===== Calendario (3/5 = 60%) ===== */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-[#0f2044]" />
                {MESES[mesActual.getMonth()]} {mesActual.getFullYear()}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={mesAnterior} className="h-8 w-8">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={irHoy} className="h-8 text-xs">
                  Hoy
                </Button>
                <Button variant="ghost" size="icon" onClick={mesSiguiente} className="h-8 w-8">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Header días */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DIAS_SEMANA.map(d => (
                <div key={d} className="text-center text-[11px] font-semibold text-slate-500 py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Grid de días */}
            {loading ? (
              <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Cargando calendario...
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1">
                {diasDelMes.map((fecha, i) => {
                  if (!fecha) return <div key={i} className="aspect-square" />
                  const fechaStr = formatDate(fecha)
                  const lvsHoy = calendario?.calendario?.[fechaStr] || []
                  const registrosHoy = calendario?.registros?.[fechaStr] || []
                  const completadas = registrosHoy.filter(r => r.estado === 'Completado').length
                  const todasCompletadas = lvsHoy.length > 0 && completadas === lvsHoy.length
                  const esHoy = fechaStr === TODAY_STR
                  const esSeleccionada = fechaStr === fechaSeleccionada

                  // Frecuencias únicas para mostrar puntos
                  const frecuencias = Array.from(new Set(lvsHoy.map(l => l.frecuencia)))

                  return (
                    <button
                      key={i}
                      onClick={() => setFechaSeleccionada(fechaStr)}
                      className={`
                        aspect-square rounded-md border text-left p-1 transition-all relative
                        ${esSeleccionada ? 'border-[#0f2044] bg-blue-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}
                        ${esHoy ? 'ring-2 ring-amber-400 ring-offset-1' : ''}
                      `}
                    >
                      <div className="flex items-start justify-between">
                        <span
                          className={`text-xs font-medium ${esHoy ? 'text-amber-600 font-bold' : 'text-slate-700'}`}
                        >
                          {fecha.getDate()}
                        </span>
                        {todasCompletadas && (
                          <CheckCircle2 className="w-3 h-3 text-green-500" />
                        )}
                      </div>

                      {/* Puntos de frecuencias */}
                      {lvsHoy.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-1">
                          {frecuencias.slice(0, 5).map(freq => (
                            <span
                              key={freq}
                              className={`w-1.5 h-1.5 rounded-full ${DOT_FRECUENCIA[freq] || 'bg-slate-400'}`}
                              title={freq}
                            />
                          ))}
                          {lvsHoy.length > 5 && (
                            <span className="text-[8px] text-slate-500">+{lvsHoy.length - 5}</span>
                          )}
                        </div>
                      )}

                      {lvsHoy.length > 0 && (
                        <div className="absolute bottom-0.5 right-1 text-[8px] text-slate-500 font-medium">
                          {lvsHoy.length}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Leyenda */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Frecuencias
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {Object.entries(DOT_FRECUENCIA).map(([freq, color]) => (
                  <div key={freq} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${color}`} />
                    <span className="text-[10px] text-slate-600">{freq}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ===== Panel del día seleccionado (2/5 = 40%) ===== */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base">
                {fechaSeleccionada === TODAY_STR ? 'Hoy - ' : ''}
                {formatFechaLarga(fechaSeleccionada)}
              </CardTitle>
              {lvsDelDia.length > 0 && (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={marcarTodasCompletadas}
                    disabled={procesandoMasivo}
                    className="h-7 text-[10px] bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                    title="Marcar todas las LVs del día como completadas"
                  >
                    {procesandoMasivo ? (
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <CheckCheck className="w-3 h-3 mr-1" />
                    )}
                    Todas OK
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={marcarTodasPendientes}
                    disabled={procesandoMasivo}
                    className="h-7 text-[10px] bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                    title="Marcar todas las LVs del día como pendientes"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Todas Pend.
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto">
            {lvsDelDia.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <CalendarDays className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">No hay LVs programadas para este día</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lvsDelDia.map(lv => {
                  const registro = registrosDelDia.find(r => r.lvId === lv.id)
                  const completada = registro?.estado === 'Completado'
                  const lvCompleta = lvs.find(l => l.id === lv.id)
                  return (
                    <div
                      key={lv.id}
                      className={`rounded-lg border p-3 transition-all ${
                        completada
                          ? 'border-green-200 bg-green-50/50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-bold text-[#0f2044] font-mono">
                              {lv.codigo}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1.5 py-0 ${BADGE_FRECUENCIA[lv.frecuencia] || ''}`}
                            >
                              {lv.frecuencia}
                            </Badge>
                            {completada && (
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-green-100 text-green-700 border-green-200">
                                <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                                OK
                              </Badge>
                            )}
                          </div>
                          <h4 className="text-sm font-medium text-slate-800 leading-tight">
                            {lv.nombre}
                          </h4>
                        </div>
                      </div>

                      <div className="space-y-1 text-[11px] text-slate-500 mb-3">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{lv.sector}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{lv.responsable}</span>
                        </div>
                        {registro && (
                          <div className="flex items-center gap-1 text-green-600">
                            <Clock className="w-3 h-3" />
                            <span>Completada por {registro.responsableEjecucion || 'N/A'}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-1.5 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => abrirDetalle(lv)}
                          className="h-7 text-[11px] flex-1"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Detalles
                        </Button>
                        {lvCompleta && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => imprimirLV(lvCompleta)}
                            className="h-7 text-[11px] px-2"
                            title="Imprimir LV en formato checklist"
                          >
                            <Printer className="w-3 h-3" />
                          </Button>
                        )}
                        {lvCompleta && esAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => abrirEdicion(lvCompleta)}
                            className="h-7 text-[11px] px-2"
                            title="Editar LV"
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                        )}
                        {!completada ? (
                          <Button
                            size="sm"
                            onClick={() => marcarCompletadaRapido(lv)}
                            className="h-7 text-[11px] bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            OK
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => desmarcarLV(lv)}
                            className="h-7 text-[11px] bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                            title="Marcar como pendiente"
                          >
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Desmarcar
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ===== Dialog de detalle ===== */}
      <Dialog open={dialogDetalleOpen} onOpenChange={setDialogDetalleOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono text-[#0f2044]">{lvDetalle?.codigo}</span>
                  <span className="text-base font-semibold">{lvDetalle?.nombre}</span>
                </DialogTitle>
                <DialogDescription>
                  {lvDetalle?.sector} · {lvDetalle?.frecuencia} · Responsable: {lvDetalle?.responsable}
                </DialogDescription>
              </div>
              <div className="flex gap-1 shrink-0">
                {lvDetalle && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => imprimirLV(lvDetalle)}
                    title="Imprimir LV"
                  >
                    <Printer className="w-4 h-4 mr-1" />
                    Imprimir
                  </Button>
                )}
                {lvDetalle && esAdmin && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      abrirEdicion(lvDetalle)
                      setDialogDetalleOpen(false)
                    }}
                    title="Editar LV"
                  >
                    <Pencil className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-2">
            {lvDetalle?.descripcion && (
              <div className="text-sm text-slate-600 italic bg-slate-50 p-3 rounded-md">
                {lvDetalle.descripcion}
              </div>
            )}

            {lvDetalle?.items.map((seccion, sIdx) => (
              <div key={sIdx} className="border border-slate-200 rounded-md">
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#0f2044] text-white text-xs font-bold flex items-center justify-center">
                      {seccion.seccion}
                    </span>
                    <h5 className="text-sm font-semibold text-slate-800">{seccion.titulo}</h5>
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  {seccion.items.map((item, iIdx) => {
                    const key = `${seccion.seccion}-${iIdx}`
                    const checked = itemsCompletados.has(key)
                    return (
                      <div key={iIdx} className="flex items-start gap-2">
                        <Checkbox
                          id={`item-${sIdx}-${iIdx}`}
                          checked={checked}
                          onCheckedChange={() => toggleItem(seccion.seccion, iIdx)}
                          className="mt-0.5"
                        />
                        <label
                          htmlFor={`item-${sIdx}-${iIdx}`}
                          className={`text-sm cursor-pointer flex-1 ${checked ? 'line-through text-slate-400' : 'text-slate-700'}`}
                        >
                          {item}
                        </label>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-200">
            <div>
              <Label htmlFor="obs" className="text-xs">Observaciones</Label>
              <Textarea
                id="obs"
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
                placeholder="Observaciones del responsable..."
                rows={2}
                className="mt-1"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                {itemsCompletados.size} de{' '}
                {lvDetalle?.items.reduce((acc, s) => acc + s.items.length, 0) || 0} ítems completados
              </span>
            </div>
          </div>

          {/* ===== PDF de respaldo OBLIGATORIO ===== */}
          <div className="space-y-2 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <Label className="text-xs flex items-center gap-1">
                <FileText className="w-3 h-3" />
                PDF de respaldo <span className="text-red-600">*</span>
              </Label>
              <span className="text-[10px] text-slate-400">Obligatorio · máx 10 MB</span>
            </div>
            {pdfRespaldoUrl ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-md p-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-green-700 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-green-800 truncate">{pdfRespaldoNombre}</p>
                    <p className="text-[10px] text-green-600">PDF cargado ✓</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <a
                    href={pdfRespaldoUrl}
                    download={pdfRespaldoNombre}
                    className="text-xs text-blue-600 hover:underline px-2"
                  >
                    Ver
                  </a>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                    onClick={handleRemovePdf}
                    type="button"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <label
                htmlFor="pdf-upload"
                className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-md p-4 cursor-pointer hover:border-[#0f2044] hover:bg-slate-50 transition-colors"
              >
                <Upload className="w-5 h-5 text-slate-400 mb-1" />
                <span className="text-xs text-slate-600 font-medium">Haz clic para subir un PDF</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Solo archivos .pdf · máximo 10 MB</span>
                <input
                  id="pdf-upload"
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={handlePdfUpload}
                />
              </label>
            )}
            <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded p-1.5">
              ⚠ El PDF de respaldo es <strong>obligatorio</strong> para completar la Lista de Verificación.
              Sin PDF, el registro no se puede guardar.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogDetalleOpen(false)}
              disabled={guardandoRegistro}
            >
              Cancelar
            </Button>
            <Button
              onClick={guardarRegistro}
              disabled={guardandoRegistro}
              className="bg-green-600 hover:bg-green-700"
            >
              {guardandoRegistro ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Guardar registro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog de edición de LV ===== */}
      <Dialog open={dialogEditarOpen} onOpenChange={setDialogEditarOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-[#0f2044]" />
              <span className="font-mono text-[#0f2044]">{lvEditando?.codigo}</span>
              <span className="text-base font-semibold">Editar LV</span>
            </DialogTitle>
            <DialogDescription>
              Modifique los campos y los ítems de verificación. Los cambios se aplican inmediatamente.
            </DialogDescription>
          </DialogHeader>

          {lvEditando && (
            <div className="flex-1 overflow-y-auto space-y-4 py-2">
              {/* Campos principales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-md">
                <div>
                  <Label className="text-xs">Código</Label>
                  <input
                    type="text"
                    value={lvEditando.codigo}
                    onChange={e => setLvEditando({ ...lvEditando, codigo: e.target.value })}
                    className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md"
                  />
                </div>
                <div>
                  <Label className="text-xs">Nombre</Label>
                  <input
                    type="text"
                    value={lvEditando.nombre}
                    onChange={e => setLvEditando({ ...lvEditando, nombre: e.target.value })}
                    className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md"
                  />
                </div>
                <div>
                  <Label className="text-xs">Sector</Label>
                  <input
                    type="text"
                    value={lvEditando.sector}
                    onChange={e => setLvEditando({ ...lvEditando, sector: e.target.value })}
                    className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md"
                  />
                </div>
                <div>
                  <Label className="text-xs">Frecuencia</Label>
                  <select
                    value={lvEditando.frecuencia}
                    onChange={e => setLvEditando({ ...lvEditando, frecuencia: e.target.value })}
                    className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md bg-white"
                  >
                    {['Diaria', 'Semanal', 'Quincenal', 'Mensual', 'Trimestral', 'Semestral', 'Anual'].map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs">Responsable</Label>
                  <input
                    type="text"
                    value={lvEditando.responsable}
                    onChange={e => setLvEditando({ ...lvEditando, responsable: e.target.value })}
                    className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md"
                  />
                </div>
                <div>
                  <Label className="text-xs">Personal requerido</Label>
                  <input
                    type="text"
                    value={lvEditando.personalRequerido || ''}
                    onChange={e => setLvEditando({ ...lvEditando, personalRequerido: e.target.value })}
                    className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs">Descripción</Label>
                  <Textarea
                    value={lvEditando.descripcion || ''}
                    onChange={e => setLvEditando({ ...lvEditando, descripcion: e.target.value })}
                    rows={2}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Secciones e items editables */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-slate-700">
                    Secciones de verificación ({lvEditando.items.length})
                  </h4>
                  <Button size="sm" variant="outline" onClick={agregarSeccion} className="h-7 text-xs">
                    <Plus className="w-3 h-3 mr-1" />
                    Agregar sección
                  </Button>
                </div>

                {lvEditando.items.map((seccion, sIdx) => (
                  <div key={sIdx} className="border border-slate-200 rounded-md">
                    <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#0f2044] text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {seccion.seccion}
                      </span>
                      <input
                        type="text"
                        value={seccion.titulo}
                        onChange={e => editarTituloSeccion(sIdx, e.target.value)}
                        className="flex-1 px-2 py-1 text-sm font-semibold border border-slate-200 rounded bg-white"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => eliminarSeccion(sIdx)}
                        className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                        title="Eliminar sección"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="p-3 space-y-1.5">
                      {seccion.items.map((item, iIdx) => (
                        <div key={iIdx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={item}
                            onChange={e => editarItem(sIdx, iIdx, e.target.value)}
                            className="flex-1 px-2 py-1 text-sm border border-slate-200 rounded"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => eliminarItem(sIdx, iIdx)}
                            className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                            title="Eliminar ítem"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => agregarItem(sIdx)}
                        className="h-7 text-xs text-blue-600 hover:bg-blue-50"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Agregar ítem
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogEditarOpen(false)}
              disabled={guardandoEdicion}
            >
              Cancelar
            </Button>
            <Button
              onClick={guardarEdicion}
              disabled={guardandoEdicion}
              className="bg-[#0f2044] hover:bg-[#0a1628]"
            >
              {guardandoEdicion ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
