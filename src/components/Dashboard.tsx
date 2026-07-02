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
  FileCheck,
  Users,
  Package,
  DollarSign,
  ArrowRight,
} from 'lucide-react'

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

// ====== STYLES ======
const colors = {
  azul: '#1e40af',        // azul oscuro profesional
  azulMedio: '#2563eb',
  verde: '#15803d',       // verde oscuro profesional
  verdeMedio: '#16a34a',
  naranja: '#c2410c',     // naranja oscuro profesional
  naranjaMedio: '#ea580c',
  rojo: '#b91c1c',        // rojo oscuro profesional
  rojoMedio: '#dc2626',
  grisOscuro: '#1e293b',
  grisMedio: '#475569',
  grisClaro: '#e2e8f0',
  fondoGris: '#f1f5f9',
  blanco: '#ffffff',
}

// Tonos pastel más oscuros (fondos de tarjetas con mejor contraste)
const pastel = {
  azul: '#dbeafe',        // azul pastel oscuro
  verde: '#dcfce7',       // verde pastel oscuro
  naranja: '#fed7aa',     // naranja pastel oscuro
  rojo: '#fecaca',        // rojo pastel oscuro
  gris: '#e2e8f0',        // gris pastel oscuro
  amarillo: '#fde68a',    // amarillo pastel oscuro
  purpura: '#e9d5ff',     // purpura pastel oscuro
  cyan: '#cffafe',        // cyan pastel oscuro
}

interface CardConfig {
  titulo: string
  numero: number | string
  icon: React.ReactNode
  color: string
  bgColor?: string
  subtitulo?: string
  onClick?: () => void
}

function MetricCard({ titulo, numero, icon, color, bgColor, subtitulo, onClick }: CardConfig) {
  return (
    <div
      onClick={onClick}
      className="rounded-md p-3 transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer group relative overflow-hidden"
      style={{
        backgroundColor: bgColor || '#ffffff',
        border: `1px solid ${colors.grisClaro}`,
        borderLeft: `3px solid ${color}`,
      }}
    >
      {/* Decoración: barra superior sutil */}
      <div
        aria-hidden="true"
        className="absolute top-0 right-0 w-12 h-12 rounded-bl-full opacity-20 transition-opacity group-hover:opacity-30 pointer-events-none z-0"
        style={{ backgroundColor: color }}
      />

      <div className="flex items-center gap-1.5 mb-1 relative z-10 min-w-0">
        <span style={{ color }} className="shrink-0">{icon}</span>
        <span className="text-xs font-medium truncate" style={{ color: colors.grisMedio }}>{titulo}</span>
      </div>
      <div className="text-xl font-bold relative z-10 truncate leading-tight" style={{ color }}>
        {numero}
      </div>
      {subtitulo && (
        <div className="text-[10px] mt-0.5 relative z-10 truncate" style={{ color: colors.grisMedio }}>{subtitulo}</div>
      )}
      {onClick && (
        <div className="flex items-center gap-1 mt-1 text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity relative z-10" style={{ color }}>
          Ver detalles <ArrowRight className="w-2.5 h-2.5" />
        </div>
      )}
    </div>
  )
}

function ProgressBar({ completadas, total, label }: { completadas: number; total: number; label: string }) {
  const pct = total > 0 ? Math.round((completadas / total) * 100) : 0
  return (
    <div className="bg-white rounded-md border p-3" style={{ borderColor: colors.grisClaro }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs" style={{ color: colors.grisMedio }}>
          {completadas} de {total} {label}
        </span>
        <span className="text-xs font-bold" style={{ color: colors.azul }}>{pct}%</span>
      </div>
      <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ backgroundColor: colors.grisClaro }}>
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: colors.azul }}
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
        .then(res => res.json())
        .then(d => { setData(d); setLoading(false) })
        .catch(() => setLoading(false))
    }
    fetchData()
    // Auto-refresh cada 2 minutos
    const interval = setInterval(fetchData, 120000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 bg-gray-200 rounded w-64 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="bg-white rounded-md border p-3 animate-pulse" style={{ borderColor: colors.grisClaro }}>
              <div className="h-3 bg-gray-200 rounded w-2/3 mb-1.5"></div>
              <div className="h-5 bg-gray-200 rounded w-1/2"></div>
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
    <div className="space-y-4">
      {/* Título */}
      <div className="flex items-center justify-between gap-3 min-w-0">
        <h1 className="text-sm sm:text-lg font-semibold truncate" style={{ color: colors.azul }}>
          Panel de Control — LAGUNA NORTE
        </h1>
      </div>

      {/* Fila 1: Órdenes de Trabajo (4 cards clickeables) */}
      <div>
        <h2 className="text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: colors.grisMedio }}>Órdenes de Trabajo</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            titulo="Total OT"
            numero={totalOT}
            icon={<Wrench className="w-3.5 h-3.5" />}
            color={colors.grisOscuro}
            bgColor={pastel.gris}
            subtitulo="Todas las órdenes"
            onClick={() => setCurrentModule('ot')}
          />
          <MetricCard
            titulo="Pendientes"
            numero={stats.otPendientes}
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
            color={colors.naranja}
            bgColor={pastel.naranja}
            subtitulo={`${stats.otPendientesAprobacion} por aprobar`}
            onClick={() => setCurrentModule('ot')}
          />
          <MetricCard
            titulo="En Progreso"
            numero={stats.otEnProgreso}
            icon={<Clock className="w-3.5 h-3.5" />}
            color={colors.azul}
            bgColor={pastel.azul}
            subtitulo="En ejecución"
            onClick={() => setCurrentModule('ot')}
          />
          <MetricCard
            titulo="Completadas"
            numero={stats.otCompletadas}
            icon={<CheckCircle className="w-3.5 h-3.5" />}
            color={colors.verde}
            bgColor={pastel.verde}
            subtitulo="Terminadas"
            onClick={() => setCurrentModule('ot')}
          />
        </div>
      </div>

      {/* Fila 2: Solicitudes de Compra (4 cards clickeables) */}
      <div>
        <h2 className="text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: colors.grisMedio }}>Solicitudes de Compra</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            titulo="Total Solicitudes"
            numero={stats.scTotal}
            icon={<ShoppingCart className="w-3.5 h-3.5" />}
            color={colors.grisOscuro}
            bgColor={pastel.gris}
            subtitulo={`Monto: ${formatCLP(stats.scMontoTotal)}`}
            onClick={() => setCurrentModule('solicitudescompra')}
          />
          <MetricCard
            titulo="Solicitadas"
            numero={stats.scSolicitadas}
            icon={<Clock className="w-3.5 h-3.5" />}
            color={colors.naranja}
            bgColor={pastel.naranja}
            subtitulo={`${Math.round(stats.scSolicitadas / totalSC * 100)}% del total`}
            onClick={() => setCurrentModule('solicitudescompra')}
          />
          <MetricCard
            titulo="En Proceso"
            numero={stats.scEnProceso}
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
            color={colors.azul}
            bgColor={pastel.azul}
            subtitulo={`${Math.round(stats.scEnProceso / totalSC * 100)}% del total`}
            onClick={() => setCurrentModule('solicitudescompra')}
          />
          <MetricCard
            titulo="Compradas"
            numero={stats.scCompradas}
            icon={<CheckCircle className="w-3.5 h-3.5" />}
            color={colors.verde}
            bgColor={pastel.verde}
            subtitulo={`${Math.round(stats.scCompradas / totalSC * 100)}% del total`}
            onClick={() => setCurrentModule('solicitudescompra')}
          />
        </div>
      </div>

      {/* Fila 3: Recursos y Cumplimiento (4 cards clickeables) */}
      <div>
        <h2 className="text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: colors.grisMedio }}>Recursos y Cumplimiento</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            titulo="Personal Activo"
            numero={stats.totalPersonal}
            icon={<Users className="w-3.5 h-3.5" />}
            color={colors.azul}
            bgColor={pastel.azul}
            subtitulo="Empleados"
            onClick={() => setCurrentModule('personal')}
          />
          <MetricCard
            titulo="Activos"
            numero={stats.totalActivos}
            icon={<Package className="w-3.5 h-3.5" />}
            color={colors.grisOscuro}
            bgColor={pastel.gris}
            subtitulo={`Valor: ${formatCLP(stats.valorActivos)}`}
            onClick={() => setCurrentModule('activos')}
          />
          <MetricCard
            titulo="Cumplimiento Legal"
            numero={`${cumplimientoStats.porcentajeGeneral}%`}
            icon={<Shield className="w-3.5 h-3.5" />}
            color={cumplimientoStats.porcentajeGeneral >= 80 ? colors.verde : colors.naranja}
            bgColor={cumplimientoStats.porcentajeGeneral >= 80 ? pastel.verde : pastel.naranja}
            subtitulo={`${cumplimientoStats.completados} de ${cumplimientoStats.total} documentos`}
            onClick={() => setCurrentModule('cumplimiento')}
          />
          <MetricCard
            titulo="Caja Chica"
            numero={formatCLP(stats.saldoCaja)}
            icon={<DollarSign className="w-3.5 h-3.5" />}
            color={colors.verde}
            bgColor={pastel.verde}
            subtitulo="Saldo disponible"
            onClick={() => setCurrentModule('centrocostos')}
          />
        </div>
      </div>

      {/* Barra de progreso OT */}
      <ProgressBar
        completadas={stats.otCompletadas}
        total={totalOT}
        label="OT completadas"
      />

      {/* Barra de progreso Cumplimiento */}
      <ProgressBar
        completadas={cumplimientoStats.completados}
        total={cumplimientoStats.total}
        label="documentos cumplidos"
      />

      {/* Sección: OT Recientes + Solicitudes Recientes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* OT Recientes */}
        <div className="bg-white rounded-md border p-3 overflow-hidden min-w-0" style={{ borderColor: colors.grisClaro }}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-xs font-semibold flex items-center gap-1.5 min-w-0" style={{ color: colors.grisOscuro }}>
              <Wrench className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">OT Recientes</span>
            </h3>
            <button
              onClick={() => setCurrentModule('ot')}
              className="text-[11px] font-medium flex items-center gap-1 hover:underline shrink-0"
              style={{ color: colors.azul }}
            >
              Ver todas <ArrowRight className="w-2.5 h-2.5" />
            </button>
          </div>
          <div className="space-y-1.5">
            {recentOT.slice(0, 5).map((ot) => (
              <div key={ot.id} className="flex items-center justify-between gap-2 py-1.5 border-b last:border-0" style={{ borderColor: colors.grisClaro }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[11px] font-mono font-bold shrink-0" style={{ color: colors.grisOscuro }}>{ot.otNum}</span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
                      style={{
                        backgroundColor: ot.estado === 'Completado' ? pastel.verde : ot.estado === 'Pendiente' ? pastel.amarillo : pastel.azul,
                        color: ot.estado === 'Completado' ? colors.verde : ot.estado === 'Pendiente' ? colors.naranja : colors.azul,
                      }}
                    >
                      {ot.estado}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5 truncate">{ot.titulo}</div>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0" style={{
                  backgroundColor: ot.prioridad === 'Urgente' ? pastel.rojo : ot.prioridad === 'Alta' ? pastel.amarillo : pastel.gris,
                  color: ot.prioridad === 'Urgente' ? colors.rojo : ot.prioridad === 'Alta' ? colors.naranja : colors.grisMedio,
                }}>
                  {ot.prioridad}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Solicitudes de Compra Recientes */}
        <div className="bg-white rounded-md border p-3 overflow-hidden min-w-0" style={{ borderColor: colors.grisClaro }}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-xs font-semibold flex items-center gap-1.5 min-w-0" style={{ color: colors.grisOscuro }}>
              <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Solicitudes de Compra Recientes</span>
            </h3>
            <button
              onClick={() => setCurrentModule('solicitudescompra')}
              className="text-[11px] font-medium flex items-center gap-1 hover:underline shrink-0"
              style={{ color: colors.azul }}
            >
              Ver todas <ArrowRight className="w-2.5 h-2.5" />
            </button>
          </div>
          <div className="space-y-1.5">
            {solicitudesRecientes.length === 0 ? (
              <p className="text-xs text-center py-3" style={{ color: colors.grisMedio }}>No hay solicitudes</p>
            ) : (
              solicitudesRecientes.map((sc) => (
                <div key={sc.id} className="flex items-center justify-between gap-2 py-1.5 border-b last:border-0" style={{ borderColor: colors.grisClaro }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[11px] font-mono font-bold shrink-0" style={{ color: colors.grisOscuro }}>{sc.codigo}</span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
                        style={{
                          backgroundColor: sc.estado === 'Solicitado' ? pastel.azul : sc.estado === 'Comprado' ? pastel.verde : pastel.rojo,
                          color: sc.estado === 'Solicitado' ? colors.azul : sc.estado === 'Comprado' ? colors.verde : colors.rojo,
                        }}
                      >
                        {sc.estado}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5 truncate">{sc.titulo}</div>
                  </div>
                  <div className="text-right shrink-0 ml-2 min-w-0">
                    <div className="text-xs font-bold truncate" style={{ color: colors.grisOscuro }}>
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
      <div className="text-[11px] text-center" style={{ color: colors.grisMedio }}>
        Condominio LAGUNA NORTE · Sistema de Gestión · Asesorías Integrales CyJ
      </div>
    </div>
  )
}
