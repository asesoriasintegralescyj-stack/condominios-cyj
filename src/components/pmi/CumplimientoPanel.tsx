'use client'

/**
 * CumplimientoPanel — Panel de Control de Cumplimiento PMI
 *
 * Muestra el estado de cumplimiento del día actual (auto-actualizado a America/Santiago):
 *   - 4 KPIs: programadas / completadas / pendientes / % cumplimiento
 *   - Banner de alerta si hay LVs faltantes
 *   - Tabla con cada LV programada + estado (Completado / Pendiente) + hora registro
 *   - Botón "Enviar alerta ahora" → dispara el envío de correo al supervisor
 *
 * Solo admin/supervisor ven el botón de envío de alerta.
 */

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Mail,
  RefreshCw,
  Loader2,
  CalendarDays,
} from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from '@/hooks/use-session'
import { TableroIndicadores } from '@/components/ui/tablero-indicadores'
import { BADGE_FRECUENCIA } from '@/lib/pmi/lv-data'

interface LvEstado {
  id: string
  codigo: string
  nombre: string
  sector: string
  frecuencia: string
  responsable: string
  estado: 'Completado' | 'Pendiente'
  hora: string | null
  responsableEjecucion: string | null
  registroId: string | null
}

interface CumplimientoResponse {
  fecha: string
  totalProgramadas: number
  totalCompletadas: number
  totalFaltantes: number
  porcentaje: number
  lvs: LvEstado[]
}

function formatFechaLarga(fechaISO: string): string {
  const [a, m, d] = fechaISO.split('-').map(Number)
  const date = new Date(Date.UTC(a, m - 1, d, 12, 0, 0))
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${dias[date.getUTCDay()]} ${d} de ${meses[date.getUTCMonth()]} de ${a}`
}

export function CumplimientoPanel() {
  const { user } = useSession()
  const [data, setData] = useState<CumplimientoResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null)

  const puedeEnviarAlerta = user?.rol === 'admin' || user?.rol === 'supervisor'

  const cargar = useCallback(async (showToast = false) => {
    try {
      setLoading(true)
      const res = await fetch('/api/pmi/cumplimiento', { cache: 'no-store' })
      if (!res.ok) throw new Error('Error al cargar cumplimiento')
      const json = await res.json()
      setData(json)
      setUltimaActualizacion(new Date())
      if (showToast) toast.success('Cumplimiento actualizado')
    } catch (err) {
      console.error('Error:', err)
      if (showToast) toast.error('Error al cargar cumplimiento')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargar()
    // Auto-refresh cada 5 minutos
    const controller = new AbortController()
    const id = setInterval(() => {
      controller.abort()
      cargar()
    }, 5 * 60 * 1000)
    return () => {
      clearInterval(id)
      controller.abort()
    }
  }, [cargar])

  const enviarAlerta = async () => {
    if (!data || data.totalFaltantes === 0) {
      toast.info('No hay LVs faltantes para reportar')
      return
    }
    try {
      setEnviando(true)
      const res = await fetch('/api/pmi/cumplimiento/alerta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha: data.fecha }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al enviar')
      if (json.enviado) {
        toast.success(
          `✉ Alerta enviada: From asesoriasintegralescyj@gmail.com → To operaciones.lagunanorte@gmail.com (Cc: administracionlagunanorte@gmail.com)`,
          { duration: 6000 },
        )
      } else {
        toast.warning(`No se envió: ${json.error || 'razón desconocida'}`)
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`)
    } finally {
      setEnviando(false)
    }
  }

  if (loading && !data) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400 mr-2" />
          <span className="text-sm text-slate-500">Cargando cumplimiento del día…</span>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-slate-500">
          No se pudo cargar el cumplimiento.
        </CardContent>
      </Card>
    )
  }

  const porcentajeColor =
    data.porcentaje >= 90 ? 'verde' : data.porcentaje >= 60 ? 'amber' : 'rojo'

  return (
    <Card className="border-2 border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#0f2044]" />
            Control de Cumplimiento PMI
          </CardTitle>
          <div className="flex items-center gap-2">
            {ultimaActualizacion && (
              <span className="text-xs text-slate-500">
                Actualizado: {ultimaActualizacion.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => cargar(true)}
              disabled={loading}
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          📅 {formatFechaLarga(data.fecha)} · Fecha auto-actualizada (America/Santiago)
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <TableroIndicadores
          columnas={4}
          cards={[
            {
              titulo: 'Programadas hoy',
              numero: data.totalProgramadas,
              icon: <CalendarDays className="w-4 h-4" />,
              color: 'azul',
              subtitulo: 'Según frecuencia',
            },
            {
              titulo: 'Completadas',
              numero: data.totalCompletadas,
              icon: <CheckCircle2 className="w-4 h-4" />,
              color: 'verde',
              subtitulo: 'Con registro',
            },
            {
              titulo: 'Pendientes',
              numero: data.totalFaltantes,
              icon: <AlertCircle className="w-4 h-4" />,
              color: 'rojo',
              subtitulo: 'Sin registro',
            },
            {
              titulo: '% Cumplimiento',
              numero: `${data.porcentaje}%`,
              icon: <Clock className="w-4 h-4" />,
              color: porcentajeColor,
              subtitulo: 'Meta ≥ 90%',
            },
          ]}
        />

        {data.totalFaltantes > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div className="text-sm text-red-800">
                <strong>🚨 Alerta de incumplimiento:</strong> Hay{' '}
                <strong>{data.totalFaltantes} Lista(s) de Verificación</strong> que le correspondían al día{' '}
                <strong>{data.fecha.split('-').reverse().join('-')}</strong> y aún no han sido registradas.
              </div>
              {puedeEnviarAlerta && (
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                  onClick={enviarAlerta}
                  disabled={enviando}
                >
                  {enviando ? (
                    <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Enviando…</>
                  ) : (
                    <><Mail className="w-3 h-3 mr-1" /> Enviar alerta al supervisor</>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}

        {data.totalFaltantes === 0 && data.totalProgramadas > 0 && (
          <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded text-sm text-green-800">
            <CheckCircle2 className="w-4 h-4 inline mr-1" />
            <strong>¡Cumplimiento completo!</strong> Todas las LVs programadas para hoy han sido registradas.
          </div>
        )}

        {data.totalProgramadas === 0 ? (
          <div className="text-center py-8 text-sm text-slate-500">
            No hay LVs programadas para hoy según las frecuencias configuradas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200 bg-slate-50">
                  <th className="text-left py-2 px-3 font-semibold text-slate-600 text-xs uppercase">Código</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-600 text-xs uppercase">Nombre LV</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-600 text-xs uppercase">Sector</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-600 text-xs uppercase">Frecuencia</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-600 text-xs uppercase">Responsable</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-600 text-xs uppercase">Hora reg.</th>
                  <th className="text-left py-2 px-3 font-semibold text-slate-600 text-xs uppercase">Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.lvs.map(lv => (
                  <tr key={lv.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-3 font-mono font-semibold text-[#0f2044] text-xs">{lv.codigo}</td>
                    <td className="py-2 px-3 text-slate-700">{lv.nombre}</td>
                    <td className="py-2 px-3 text-slate-500 text-xs">{lv.sector}</td>
                    <td className="py-2 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border ${BADGE_FRECUENCIA[lv.frecuencia] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {lv.frecuencia}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-500 text-xs">{lv.responsable}</td>
                    <td className="py-2 px-3 text-slate-700 text-xs">
                      {lv.hora || <span className="text-red-600 font-semibold">— Sin registro —</span>}
                    </td>
                    <td className="py-2 px-3">
                      {lv.estado === 'Completado' ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200 hover:bg-green-100">COMPLETADO</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">PENDIENTE</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {puedeEnviarAlerta && (
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-900 mt-2">
            <p className="font-semibold mb-1">📧 Configuración de alertas automáticas</p>
            <ul className="space-y-0.5 ml-4 list-disc">
              <li><strong>Envío automático:</strong> todos los días a las <strong>08:00 AM</strong> (hora Santiago)</li>
              <li><strong>Remitente (From):</strong> asesoriasintegralescyj@gmail.com</li>
              <li><strong>Destinatario (To):</strong> operaciones.lagunanorte@gmail.com</li>
              <li><strong>Con copia (Cc):</strong> administracionlagunanorte@gmail.com</li>
              <li><strong>Asunto:</strong> ⚠ FALTA CUMPLIMIENTO PMI — [fecha] (N LVs pendientes)</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
