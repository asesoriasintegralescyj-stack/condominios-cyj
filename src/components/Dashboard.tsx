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
  azul: '#0d6efd',
  verde: '#198754',
  naranja: '#fd7e14',
  rojo: '#dc3545',
  grisOscuro: '#212529',
  grisMedio: '#6c757d',
  grisClaro: '#e9ecef',
  fondoGris: '#f8f9fa',
  blanco: '#ffffff',
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
      className="rounded-lg p-5 transition-all hover:shadow-lg hover:-translate-y-0.5 cursor-pointer group relative overflow-hidden"
      style={{
        backgroundColor: bgColor || '#ffffff',
        border: `1px solid ${colors.grisClaro}`,
        borderTop: `4px solid ${color}`,
      }}
    >
      {/* Decoración: círculo de color semi-transparente en esquina */}
      <div
        aria-hidden="true"
        className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-10 transition-opacity group-hover:opacity-20 pointer-events-none z-0"
        style={{ backgroundColor: color }}
      />

      <div className="flex items-center gap-2 mb-2 relative z-10 min-w-0">
        <span style={{ color }} className="shrink-0">{icon}</span>
        <span className="text-sm font-normal truncate" style={{ color: colors.grisMedio }}>{titulo}</span>
      </div>
      <div className="text-3xl font-bold relative z-10 truncate" style={{ color }}>
        {numero}
      </div>
      {subtitulo && (
        <div className="text-xs mt-1 relative z-10 truncate" style={{ color: colors.grisMedio }}>{subtitulo}</div>
      )}
      {onClick && (
        <div className="flex items-center gap-1 mt-2 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity relative z-10" style={{ color }}>
          Ver detalles <ArrowRight className="w-3 h-3" />
        </div>
      )}
    </div>
  )
}

function ProgressBar({ completadas, total, label }: { completadas: number; total: number; label: string }) {
  const pct = total > 0 ? Math.round((completadas / total) * 100) : 0
  return (
    <div className="bg-white rounded-lg border p-5" style={{ borderColor: colors.grisClaro }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm" style={{ color: colors.grisMedio }}>
          {completadas} de {total} {label}
        </span>
        <span className="text-sm font-bold" style={{ color: colors.azul }}>{pct}%</span>
      </div>
      <div className="w-full rounded-full h-2 overflow-hidden" style={{ backgroundColor: colors.grisClaro }}>
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: colors.grisOscuro }}
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
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-7 bg-gray-200 rounded w-64 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg border p-5 animate-pulse" style={{ borderColor: colors.grisClaro }}>
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
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
        <h1 className="text-base sm:text-xl font-semibold truncate" style={{ color: colors.azul }}>
          Panel de Control — LAGUNA NORTE
        </h1>
      </div>

      {/* Fila 1: Órdenes de Trabajo (4 cards clickeables) */}
      <div>
        <h2 className="text-sm font-semibold mb-2" style={{ color: colors.grisMedio }}>ÓRDENES DE TRABAJO</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            titulo="Total OT"
            numero={totalOT}
            icon={<Wrench className="w-4 h-4" />}
            color={colors.grisOscuro}
            bgColor="#f8f9fa"
            subtitulo="Todas las órdenes"
            onClick={() => setCurrentModule('ot')}
          />
          <MetricCard
            titulo="Pendientes"
            numero={stats.otPendientes}
            icon={<AlertTriangle className="w-4 h-4" />}
            color={colors.naranja}
            bgColor="#fff5ec"
            subtitulo={`${stats.otPendientesAprobacion} por aprobar`}
            onClick={() => setCurrentModule('ot')}
          />
          <MetricCard
            titulo="En Progreso"
            numero={stats.otEnProgreso}
            icon={<Clock className="w-4 h-4" />}
            color={colors.azul}
            bgColor="#eef5ff"
            subtitulo="En ejecución"
            onClick={() => setCurrentModule('ot')}
          />
          <MetricCard
            titulo="Completadas"
            numero={stats.otCompletadas}
            icon={<CheckCircle className="w-4 h-4" />}
            color={colors.verde}
            bgColor="#eaf7f0"
            subtitulo="Terminadas"
            onClick={() => setCurrentModule('ot')}
          />
        </div>
      </div>

      {/* Fila 2: Solicitudes de Compra (4 cards clickeables) */}
      <div>
        <h2 className="text-sm font-semibold mb-2" style={{ color: colors.grisMedio }}>SOLICITUDES DE COMPRA</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            titulo="Total Solicitudes"
            numero={stats.scTotal}
            icon={<ShoppingCart className="w-4 h-4" />}
            color={colors.grisOscuro}
            bgColor="#f8f9fa"
            subtitulo={`Monto: ${formatCLP(stats.scMontoTotal)}`}
            onClick={() => setCurrentModule('solicitudescompra')}
          />
          <MetricCard
            titulo="Solicitadas"
            numero={stats.scSolicitadas}
            icon={<Clock className="w-4 h-4" />}
            color={colors.naranja}
            bgColor="#fff5ec"
            subtitulo={`${Math.round(stats.scSolicitadas / totalSC * 100)}% del total`}
            onClick={() => setCurrentModule('solicitudescompra')}
          />
          <MetricCard
            titulo="En Proceso"
            numero={stats.scEnProceso}
            icon={<AlertTriangle className="w-4 h-4" />}
            color={colors.azul}
            bgColor="#eef5ff"
            subtitulo={`${Math.round(stats.scEnProceso / totalSC * 100)}% del total`}
            onClick={() => setCurrentModule('solicitudescompra')}
          />
          <MetricCard
            titulo="Compradas"
            numero={stats.scCompradas}
            icon={<CheckCircle className="w-4 h-4" />}
            color={colors.verde}
            bgColor="#eaf7f0"
            subtitulo={`${Math.round(stats.scCompradas / totalSC * 100)}% del total`}
            onClick={() => setCurrentModule('solicitudescompra')}
          />
        </div>
      </div>

      {/* Fila 3: Recursos y Cumplimiento (4 cards clickeables) */}
      <div>
        <h2 className="text-sm font-semibold mb-2" style={{ color: colors.grisMedio }}>RECURSOS Y CUMPLIMIENTO</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            titulo="Personal Activo"
            numero={stats.totalPersonal}
            icon={<Users className="w-4 h-4" />}
            color={colors.azul}
            bgColor="#eef5ff"
            subtitulo="Empleados"
            onClick={() => setCurrentModule('personal')}
          />
          <MetricCard
            titulo="Activos"
            numero={stats.totalActivos}
            icon={<Package className="w-4 h-4" />}
            color={colors.grisOscuro}
            bgColor="#f8f9fa"
            subtitulo={`Valor: ${formatCLP(stats.valorActivos)}`}
            onClick={() => setCurrentModule('activos')}
          />
          <MetricCard
            titulo="Cumplimiento Legal"
            numero={`${cumplimientoStats.porcentajeGeneral}%`}
            icon={<Shield className="w-4 h-4" />}
            color={cumplimientoStats.porcentajeGeneral >= 80 ? colors.verde : colors.naranja}
            bgColor={cumplimientoStats.porcentajeGeneral >= 80 ? "#eaf7f0" : "#fff5ec"}
            subtitulo={`${cumplimientoStats.completados} de ${cumplimientoStats.total} documentos`}
            onClick={() => setCurrentModule('cumplimiento')}
          />
          <MetricCard
            titulo="Caja Chica"
            numero={formatCLP(stats.saldoCaja)}
            icon={<DollarSign className="w-4 h-4" />}
            color={colors.verde}
            bgColor="#eaf7f0"
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* OT Recientes */}
        <div className="bg-white rounded-lg border p-5 overflow-hidden min-w-0" style={{ borderColor: colors.grisClaro }}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 min-w-0" style={{ color: colors.grisOscuro }}>
              <Wrench className="w-4 h-4 shrink-0" />
              <span className="truncate">OT Recientes</span>
            </h3>
            <button
              onClick={() => setCurrentModule('ot')}
              className="text-xs font-medium flex items-center gap-1 hover:underline shrink-0"
              style={{ color: colors.azul }}
            >
              Ver todas <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {recentOT.slice(0, 5).map((ot) => (
              <div key={ot.id} className="flex items-center justify-between gap-2 py-2 border-b last:border-0" style={{ borderColor: colors.grisClaro }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-mono font-bold shrink-0" style={{ color: colors.grisOscuro }}>{ot.otNum}</span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
                      style={{
                        backgroundColor: ot.estado === 'Completado' ? '#d1e7dd' : ot.estado === 'Pendiente' ? '#fff3cd' : '#cfe2ff',
                        color: ot.estado === 'Completado' ? colors.verde : ot.estado === 'Pendiente' ? colors.naranja : colors.azul,
                      }}
                    >
                      {ot.estado}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5 truncate">{ot.titulo}</div>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0" style={{
                  backgroundColor: ot.prioridad === 'Urgente' ? '#f8d7da' : ot.prioridad === 'Alta' ? '#fff3cd' : '#e2e3e5',
                  color: ot.prioridad === 'Urgente' ? colors.rojo : ot.prioridad === 'Alta' ? colors.naranja : colors.grisMedio,
                }}>
                  {ot.prioridad}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Solicitudes de Compra Recientes */}
        <div className="bg-white rounded-lg border p-5 overflow-hidden min-w-0" style={{ borderColor: colors.grisClaro }}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 min-w-0" style={{ color: colors.grisOscuro }}>
              <ShoppingCart className="w-4 h-4 shrink-0" />
              <span className="truncate">Solicitudes de Compra Recientes</span>
            </h3>
            <button
              onClick={() => setCurrentModule('solicitudescompra')}
              className="text-xs font-medium flex items-center gap-1 hover:underline shrink-0"
              style={{ color: colors.azul }}
            >
              Ver todas <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-2">
            {solicitudesRecientes.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: colors.grisMedio }}>No hay solicitudes</p>
            ) : (
              solicitudesRecientes.map((sc) => (
                <div key={sc.id} className="flex items-center justify-between gap-2 py-2 border-b last:border-0" style={{ borderColor: colors.grisClaro }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-mono font-bold shrink-0" style={{ color: colors.grisOscuro }}>{sc.codigo}</span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0"
                        style={{
                          backgroundColor: sc.estado === 'Solicitado' ? '#cfe2ff' : sc.estado === 'Comprado' ? '#d1e7dd' : '#f8d7da',
                          color: sc.estado === 'Solicitado' ? colors.azul : sc.estado === 'Comprado' ? colors.verde : colors.rojo,
                        }}
                      >
                        {sc.estado}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5 truncate">{sc.titulo}</div>
                  </div>
                  <div className="text-right shrink-0 ml-2 min-w-0">
                    <div className="text-sm font-bold truncate" style={{ color: colors.grisOscuro }}>
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
      <div className="text-xs text-center" style={{ color: colors.grisMedio }}>
        Condominio LAGUNA NORTE · Sistema de Gestión · Asesorías Integrales CyJ
      </div>
    </div>
  )
}
