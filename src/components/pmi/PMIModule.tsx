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
} from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from '@/hooks/use-session'
import { TableroIndicadores } from '@/components/ui/tablero-indicadores'
import {
  BADGE_FRECUENCIA,
  DOT_FRECUENCIA,
} from '@/lib/pmi/lv-data'

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

// Fecha "Hoy" fija según requerimiento del enunciado (6 de julio 2026)
const TODAY = new Date(2026, 6, 6) // 6 = julio (0-indexed)
const TODAY_STR = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, '0')}-${String(TODAY.getDate()).padStart(2, '0')}`

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

  // Estado de calendario
  const [mesActual, setMesActual] = useState<Date>(new Date(2026, 6, 1)) // julio 2026
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
    }, 60_000)
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

  const guardarRegistro = async () => {
    if (!lvDetalle) return
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
        }),
      })
      if (res.ok) {
        toast.success(`Registro guardado: ${lvDetalle.codigo}`)
        setDialogDetalleOpen(false)
        setLvDetalle(null)
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
            <CardTitle className="text-base">
              {fechaSeleccionada === TODAY_STR ? 'Hoy - ' : ''}
              {formatFechaLarga(fechaSeleccionada)}
            </CardTitle>
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
                          <div className="flex items-center gap-2 mb-1">
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

                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => abrirDetalle(lv)}
                          className="h-7 text-[11px] flex-1"
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Ver detalles
                        </Button>
                        {!completada && (
                          <Button
                            size="sm"
                            onClick={() => marcarCompletadaRapido(lv)}
                            className="h-7 text-[11px] bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Marcar OK
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
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono text-[#0f2044]">{lvDetalle?.codigo}</span>
              <span className="text-base font-semibold">{lvDetalle?.nombre}</span>
            </DialogTitle>
            <DialogDescription>
              {lvDetalle?.sector} · {lvDetalle?.frecuencia} · Responsable: {lvDetalle?.responsable}
            </DialogDescription>
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
    </div>
  )
}
