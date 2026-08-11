'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { formatCLP } from '@/lib/utils'
import {
  Wrench,
  Clock,
  CheckCircle,
  AlertTriangle,
  ShoppingCart,
  Shield,
  Users,
  Package,
  DollarSign,
  ArrowRight,
  FileText,
  FileWarning,
} from 'lucide-react'
import { TableroIndicadores, type IndicadorCard } from '@/components/ui/tablero-indicadores'

interface DashboardStats {
  totalPersonal: number
  totalActivos: number
  valorActivos: number
  saldoCaja: number
  otPendientes: number
  otEnProgreso: number
  otCompletadas: number
  otPendientesAprobacion: number
  otAprobadas: number
  otRechazadas: number
  scTotal: number
  scSolicitadas: number
  scEnProceso: number
  scCompradas: number
  scRechazadas: number
  scMontoTotal: number
}

interface SolicitudReciente {
  id: string
  codigo: string
  titulo: string
  estado: string
  prioridad: string
  totalEstimado: number
  emailEnviado: boolean
  createdAt: string
  origenCodigo: string | null
}

interface OrdenTrabajo {
  id: string
  otNum: string
  titulo: string
  prioridad: string
  estado: string
  fechaLimite: string | null
}

interface CumplimientoStats {
  total: number
  completados: number
  pendientes: number
  enProceso: number
  vencidos: number
  porVencer: number
  porcentajeGeneral: number
}

interface DashboardData {
  stats: DashboardStats
  solicitudesRecientes: SolicitudReciente[]
  recentOT: OrdenTrabajo[]
  cumplimientoStats: CumplimientoStats
}

// Estados badge (igual que Cumplimiento)
const ESTADO_BADGES: Record<string, string> = {
  Pendiente: 'bg-slate-100 text-slate-700',
  Completado: 'bg-green-100 text-green-700',
  'En Progreso': 'bg-blue-100 text-blue-700',
  Solicitado: 'bg-blue-100 text-blue-700',
  Comprado: 'bg-green-100 text-green-700',
  Rechazado: 'bg-red-100 text-red-700',
}

const PRIORIDAD_BADGES: Record<string, string> = {
  Urgente: 'bg-red-100 text-red-700',
  Alta: 'bg-amber-100 text-amber-700',
  Media: 'bg-slate-100 text-slate-700',
  Baja: 'bg-slate-100 text-slate-700',
}

function ProgressBar({ completadas, total, label, color = 'bg-slate-500' }: { completadas: number; total: number; label: string; color?: string }) {
  const pct = total > 0 ? Math.round((completadas / total) * 100) : 0
  return (
    <div className="bg-white rounded-md border border-slate-200 p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-slate-600">
          {completadas} de {total} {label}
        </span>
        <span className="text-xs font-bold text-blue-700">{pct}%</span>
      </div>
      <div className="w-full rounded-full h-2 overflow-hidden bg-slate-200">
        <div
          className={`h-2 rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function Dashboard() {
  const { setCurrentModule } = useAppStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = () => {
      fetch('/api/dashboard')
        .then(res => {
          if (!res.ok) throw new Error(`Error del servidor (${res.status})`)
          return res.json()
        })
        .then(d => { setData(d); setLoading(false) })
        .catch(err => {
          console.error('Error al cargar dashboard:', err)
          setLoading(false)
        })
    }
    fetchData()
    const controller = new AbortController()
    const interval = setInterval(() => {
      controller.abort()
      fetchData()
    }, 300000) // 5 min (optimizado BD)
    return () => {
      clearInterval(interval)
      controller.abort()
    }
  }, [])

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-6 bg-slate-200 rounded w-64 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="bg-white rounded-md border border-slate-200 p-3 animate-pulse">
              <div className="h-3 bg-slate-200 rounded w-2/3 mb-1.5"></div>
              <div className="h-5 bg-slate-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null

  const { stats, solicitudesRecientes, recentOT, cumplimientoStats } = data

  const totalOT = stats.otPendientes + stats.otEnProgreso + stats.otCompletadas
  const totalSC = stats.scTotal || 1

  return (
    <div className="space-y-5">
      {/* Título */}
      <div className="flex items-center justify-between gap-3 min-w-0">
        <h1 className="text-lg font-semibold text-[#0f2044] truncate">
          Panel de Control — LAGUNA NORTE
        </h1>
      </div>

      {/* Fila 1: Órdenes de Trabajo */}
      <div>
        <h2 className="text-xs font-semibold mb-1.5 uppercase tracking-wide text-slate-600">Órdenes de Trabajo</h2>
        <TableroIndicadores
          cards={[
            { titulo: 'Total OT', numero: totalOT, icon: <Wrench className="w-5 h-5" />, color: 'gris', subtitulo: 'Todas las órdenes', onClick: () => setCurrentModule('ot') },
            { titulo: 'Pendientes', numero: stats.otPendientes, icon: <AlertTriangle className="w-5 h-5" />, color: 'naranja', subtitulo: `${stats.otPendientesAprobacion} por aprobar`, onClick: () => setCurrentModule('ot') },
            { titulo: 'En Progreso', numero: stats.otEnProgreso, icon: <Clock className="w-5 h-5" />, color: 'azul', subtitulo: 'En ejecución', onClick: () => setCurrentModule('ot') },
            { titulo: 'Completadas', numero: stats.otCompletadas, icon: <CheckCircle className="w-5 h-5" />, color: 'verde', subtitulo: 'Terminadas', onClick: () => setCurrentModule('ot') },
          ]}
        />
      </div>

      {/* Fila 2: Solicitudes de Compra */}
      <div>
        <h2 className="text-xs font-semibold mb-1.5 uppercase tracking-wide text-slate-600">Solicitudes de Compra</h2>
        <TableroIndicadores
          cards={[
            { titulo: 'Total Solicitudes', numero: stats.scTotal, icon: <ShoppingCart className="w-5 h-5" />, color: 'gris', subtitulo: `Monto: ${formatCLP(stats.scMontoTotal)}`, onClick: () => setCurrentModule('solicitudescompra') },
            { titulo: 'Solicitadas', numero: stats.scSolicitadas, icon: <Clock className="w-5 h-5" />, color: 'naranja', subtitulo: `${Math.round(stats.scSolicitadas / totalSC * 100)}% del total`, onClick: () => setCurrentModule('solicitudescompra') },
            { titulo: 'En Proceso', numero: stats.scEnProceso, icon: <AlertTriangle className="w-5 h-5" />, color: 'azul', subtitulo: `${Math.round(stats.scEnProceso / totalSC * 100)}% del total`, onClick: () => setCurrentModule('solicitudescompra') },
            { titulo: 'Compradas', numero: stats.scCompradas, icon: <CheckCircle className="w-5 h-5" />, color: 'verde', subtitulo: `${Math.round(stats.scCompradas / totalSC * 100)}% del total`, onClick: () => setCurrentModule('solicitudescompra') },
          ]}
        />
      </div>

      {/* Fila 3: Recursos y Cumplimiento */}
      <div>
        <h2 className="text-xs font-semibold mb-1.5 uppercase tracking-wide text-slate-600">Recursos y Cumplimiento</h2>
        <TableroIndicadores
          cards={[
            { titulo: 'Personal Activo', numero: stats.totalPersonal, icon: <Users className="w-5 h-5" />, color: 'azul', subtitulo: 'Empleados', onClick: () => setCurrentModule('personal') },
            { titulo: 'Activos', numero: stats.totalActivos, icon: <Package className="w-5 h-5" />, color: 'gris', subtitulo: `Valor: ${formatCLP(stats.valorActivos)}`, onClick: () => setCurrentModule('activos') },
            { titulo: 'Cumplimiento Legal', numero: `${cumplimientoStats.porcentajeGeneral}%`, icon: <Shield className="w-5 h-5" />, color: cumplimientoStats.porcentajeGeneral >= 80 ? 'verde' : 'naranja', subtitulo: `${cumplimientoStats.completados} de ${cumplimientoStats.total} documentos`, onClick: () => setCurrentModule('cumplimiento') },
            { titulo: 'Caja Chica', numero: formatCLP(stats.saldoCaja), icon: <DollarSign className="w-5 h-5" />, color: 'verde', subtitulo: 'Saldo disponible', onClick: () => setCurrentModule('centrocostos') },
          ]}
        />
      </div>

      {/* Barras de progreso */}
      <ProgressBar
        completadas={stats.otCompletadas}
        total={totalOT}
        label="OT completadas"
        color="bg-blue-500"
      />
      <ProgressBar
        completadas={cumplimientoStats.completados}
        total={cumplimientoStats.total}
        label="documentos cumplidos"
        color="bg-green-500"
      />

      {/* Sección: OT Recientes + Solicitudes Recientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* OT Recientes */}
        <div className="bg-white rounded-md border border-slate-200 p-3 overflow-hidden min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-700 min-w-0">
              <Wrench className="w-4 h-4 shrink-0" />
              <span className="truncate">OT Recientes</span>
            </h3>
            <button
              onClick={() => setCurrentModule('ot')}
              className="text-xs font-medium flex items-center gap-1 hover:underline text-blue-700 shrink-0"
            >
              Ver todas <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-1.5">
            {recentOT.slice(0, 5).map((ot) => (
              <div key={ot.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-200 last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-mono font-bold text-slate-700 shrink-0">{ot.otNum}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${ESTADO_BADGES[ot.estado] || 'bg-slate-100 text-slate-700'}`}>
                      {ot.estado}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5 truncate">{ot.titulo}</div>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${PRIORIDAD_BADGES[ot.prioridad] || 'bg-slate-100 text-slate-700'}`}>
                  {ot.prioridad}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Solicitudes de Compra Recientes */}
        <div className="bg-white rounded-md border border-slate-200 p-3 overflow-hidden min-w-0">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-700 min-w-0">
              <ShoppingCart className="w-4 h-4 shrink-0" />
              <span className="truncate">Solicitudes de Compra Recientes</span>
            </h3>
            <button
              onClick={() => setCurrentModule('solicitudescompra')}
              className="text-xs font-medium flex items-center gap-1 hover:underline text-blue-700 shrink-0"
            >
              Ver todas <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-1.5">
            {solicitudesRecientes.length === 0 ? (
              <p className="text-xs text-center py-3 text-slate-500">No hay solicitudes</p>
            ) : (
              solicitudesRecientes.map((sc) => (
                <div key={sc.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-200 last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-mono font-bold text-slate-700 shrink-0">{sc.codigo}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${ESTADO_BADGES[sc.estado] || 'bg-slate-100 text-slate-700'}`}>
                        {sc.estado}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5 truncate">{sc.titulo}</div>
                  </div>
                  <div className="text-right shrink-0 ml-2 min-w-0">
                    <div className="text-xs font-bold text-slate-700 truncate">
                      {formatCLP(sc.totalEstimado)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer info */}
      <div className="text-xs text-center text-slate-500">
        Condominio LAGUNA NORTE · Sistema de Gestión · Asesorías Integrales CyJ
      </div>
    </div>
  )
}
