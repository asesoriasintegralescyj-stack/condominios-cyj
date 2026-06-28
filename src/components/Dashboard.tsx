'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/lib/store'
import { formatCLP } from '@/lib/utils'
import {
  Home,
  Wrench,
  AlertTriangle,
  Shield,
  CheckCircle,
  Clock,
  FileWarning,
  FileText,
  ArrowRight
} from 'lucide-react'

interface DashboardStats {
  totalPropiedades: number
  totalPersonal: number
  totalActivos: number
  valorActivos: number
  saldoCaja: number
  saldoInicialCaja: number
  otPendientes: number
  otEnProgreso: number
  otCompletadas: number
  otPendientesAprobacion: number
  otAprobadas: number
  otRechazadas: number
}

interface EstadoPropiedades {
  Ocupado: number
  Disponible: number
  Arriendo: number
  Venta: number
  Mantenimiento: number
}

interface OrdenTrabajo {
  id: string
  otNum: string
  titulo: string
  prioridad: string
  estado: string
  fechaLimite: string | null
}

interface CumplimientoItem {
  id: string
  titulo: string
  fechaVencimiento: string | null
  categoria: string
  estado: string
}

interface CumplimientoStats {
  total: number
  completados: number
  pendientes: number
  enProceso: number
  vencidos: number
  porVencer: number
  obligatorios: number
  opcionales: number
  porcentajeGeneral: number
  porCategoria: {
    Legal: CumplimientoItem[]
    Seguridad: CumplimientoItem[]
    Reglamentario: CumplimientoItem[]
    Interno: CumplimientoItem[]
    Financiero: CumplimientoItem[]
  }
  proximosVencer: CumplimientoItem[]
  itemsVencidos: CumplimientoItem[]
}

interface DashboardData {
  stats: DashboardStats
  estadoPropiedades: EstadoPropiedades
  recentOT: OrdenTrabajo[]
  centrosConGasto: Array<{
    id: string
    nombre: string
    presupuesto: number
    gastado: number
    porcentaje: number
  }>
  cumplimientoStats: CumplimientoStats
}

const formatDate = (d: string | null) => {
  if (!d) return '–'
  try {
    const [y, m, dd] = d.split('-')
    return `${dd}/${m}/${y}`
  } catch {
    return d
  }
}

const getDaysUntilExpiry = (fechaVencimiento: string | null) => {
  if (!fechaVencimiento) return null
  const hoy = new Date()
  const vencimiento = new Date(fechaVencimiento)
  const diff = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

const priorityColors: Record<string, string> = {
  'Urgente': 'bg-red-100 text-red-700',
  'Alta': 'bg-orange-100 text-orange-700',
  'Media': 'bg-yellow-100 text-yellow-700',
  'Baja': 'bg-green-100 text-green-700',
}

const estadoColors: Record<string, string> = {
  'Pendiente': 'bg-yellow-100 text-yellow-700',
  'En Progreso': 'bg-blue-100 text-blue-700',
  'Completado': 'bg-green-100 text-green-700',
  'Cancelado': 'bg-red-100 text-red-700',
}

const categoriaColors: Record<string, string> = {
  'Legal': 'bg-rose-100 text-rose-700',
  'Seguridad': 'bg-amber-100 text-amber-700',
  'Reglamentario': 'bg-blue-100 text-blue-700',
  'Interno': 'bg-slate-100 text-slate-700',
  'Financiero': 'bg-green-100 text-green-700',
}

export function Dashboard() {
  const { setCurrentModule } = useAppStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(d => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-slate-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-slate-200 rounded w-3/4"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!data) return null

  const { stats, estadoPropiedades, recentOT, centrosConGasto, cumplimientoStats } = data

  return (
    <div className="space-y-5">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl mb-1">🏠</div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Unidades</div>
            <div className="text-2xl font-bold text-[#0f2040]">{stats.totalPropiedades}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl mb-1">🔧</div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">OT Pendientes</div>
            <div className="text-2xl font-bold text-amber-600">{stats.otPendientes}</div>
          </CardContent>
        </Card>
        <Card className={`${stats.otPendientesAprobacion > 0 ? 'border-orange-300 bg-orange-50' : ''}`}>
          <CardContent className="p-4">
            <div className="text-2xl mb-1">✅</div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Por Aprobar</div>
            <div className="text-2xl font-bold text-orange-600">{stats.otPendientesAprobacion}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl mb-1">💰</div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">Caja Chica</div>
            <div className="text-base font-bold text-[#0f2040]">{formatCLP(stats.saldoCaja)}</div>
          </CardContent>
        </Card>
      </div>

      {/* OT Stats - Segunda fila */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-yellow-600" />
              <div>
                <div className="text-[10px] text-yellow-600 font-semibold uppercase">OT Pendientes</div>
                <div className="text-xl font-bold text-yellow-700">{stats.otPendientes}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Wrench className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-[10px] text-blue-600 font-semibold uppercase">En Progreso</div>
                <div className="text-xl font-bold text-blue-700">{stats.otEnProgreso}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200 cursor-pointer hover:bg-orange-100 transition-colors" onClick={() => setCurrentModule('aprobaciones')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-orange-600" />
              <div>
                <div className="text-[10px] text-orange-600 font-semibold uppercase">Por Aprobar</div>
                <div className="text-xl font-bold text-orange-700">{stats.otPendientesAprobacion}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-[10px] text-green-600 font-semibold uppercase">Aprobadas</div>
                <div className="text-xl font-bold text-green-700">{stats.otAprobadas}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cumplimiento Legal - Resumen */}
      <Card className="border-l-4 border-l-amber-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-600" />
              Cumplimiento Legal (Ley 21.442)
            </span>
            <button 
              onClick={() => setCurrentModule('cumplimiento')}
              className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              Ver todo <ArrowRight className="w-3 h-3" />
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Porcentaje General */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-lg">
              <div className="text-4xl font-bold mb-1" style={{
                color: cumplimientoStats.porcentajeGeneral >= 80 ? '#16a34a' :
                       cumplimientoStats.porcentajeGeneral >= 50 ? '#ca8a04' : '#dc2626'
              }}>
                {cumplimientoStats.porcentajeGeneral}%
              </div>
              <div className="text-xs text-slate-500 font-medium">Cumplimiento General</div>
              <Progress 
                value={cumplimientoStats.porcentajeGeneral} 
                className="h-2 w-full mt-2"
              />
            </div>

            {/* Estados */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Completados</span>
                </div>
                <span className="font-bold text-green-700">{cumplimientoStats.completados}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm">Pendientes</span>
                </div>
                <span className="font-bold text-yellow-700">{cumplimientoStats.pendientes}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="text-sm">En Proceso</span>
                </div>
                <span className="font-bold text-blue-700">{cumplimientoStats.enProceso}</span>
              </div>
            </div>

            {/* Alertas */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-200">
                <div className="flex items-center gap-2">
                  <FileWarning className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium">Vencidos</span>
                </div>
                <Badge className="bg-red-100 text-red-700">{cumplimientoStats.vencidos}</Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-orange-50 rounded border border-orange-200">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-medium">Por Vencer (30 días)</span>
                </div>
                <Badge className="bg-orange-100 text-orange-700">{cumplimientoStats.porVencer}</Badge>
              </div>
              {cumplimientoStats.itemsVencidos.length > 0 && (
                <div className="text-xs text-red-600 mt-1">
                  ⚠️ {cumplimientoStats.itemsVencidos.length} items requieren atención urgente
                </div>
              )}
            </div>

            {/* Por Categoría */}
            <div className="space-y-1">
              {Object.entries(cumplimientoStats.porCategoria).map(([cat, items]) => {
                const itemsList = items as CumplimientoItem[]
                if (itemsList.length === 0) return null
                const completados = itemsList.filter(i => i.estado === 'Completado').length
                const pct = itemsList.length > 0 ? Math.round(completados / itemsList.length * 100) : 0
                return (
                  <div key={cat} className="flex items-center justify-between text-xs p-1.5 bg-slate-50 rounded">
                    <div className="flex items-center gap-2">
                      <Badge className={categoriaColors[cat] || 'bg-slate-100'} variant="outline">
                        {cat}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={pct} className="h-1.5 w-10" />
                      <span className="font-medium w-8 text-right">{pct}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Items próximos a vencer */}
          {cumplimientoStats.proximosVencer.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <div className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Próximos a Vencer
              </div>
              <div className="flex flex-wrap gap-2">
                {cumplimientoStats.proximosVencer.slice(0, 4).map(item => {
                  const dias = getDaysUntilExpiry(item.fechaVencimiento)
                  return (
                    <div key={item.id} className="flex items-center gap-2 text-xs bg-amber-50 px-2 py-1 rounded border border-amber-200">
                      <Badge className={categoriaColors[item.categoria] || 'bg-slate-100'} variant="outline">
                        {item.categoria}
                      </Badge>
                      <span className="font-medium">{item.titulo}</span>
                      <span className="text-amber-700 font-bold">
                        {dias !== null ? `${dias} días` : ''}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* OT Recientes */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Wrench className="w-4 h-4" /> OT Recientes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">N° OT</th>
                    <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Título</th>
                    <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Prioridad</th>
                    <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">Estado</th>
                    <th className="text-left p-3 text-[10px] font-bold text-slate-500 uppercase">F. Límite</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOT.length > 0 ? (
                    recentOT.map((ot) => (
                      <tr key={ot.id} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="p-3 font-mono text-xs font-bold text-[#0f2040]">{ot.otNum}</td>
                        <td className="p-3 font-medium">{ot.titulo}</td>
                        <td className="p-3">
                          <Badge className={priorityColors[ot.prioridad] || 'bg-slate-100'}>
                            {ot.prioridad}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge className={estadoColors[ot.estado] || 'bg-slate-100'}>
                            {ot.estado}
                          </Badge>
                        </td>
                        <td className="p-3 text-xs text-slate-600">{formatDate(ot.fechaLimite)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        Sin órdenes de trabajo
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Right Side */}
        <div className="space-y-5">
          {/* Estado Unidades */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Home className="w-4 h-4" /> Estado Unidades
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(estadoPropiedades).map(([estado, count]) => 
                count > 0 && (
                  <div key={estado} className="flex items-center justify-between py-1 border-b last:border-0">
                    <Badge className={
                      estado === 'Ocupado' ? 'bg-red-100 text-red-700' :
                      estado === 'Disponible' ? 'bg-green-100 text-green-700' :
                      estado === 'Arriendo' ? 'bg-purple-100 text-purple-700' :
                      estado === 'Venta' ? 'bg-orange-100 text-orange-700' :
                      'bg-yellow-100 text-yellow-700'
                    }>
                      {estado}
                    </Badge>
                    <span className="font-bold text-[#0f2040]">{count}</span>
                  </div>
                )
              )}
            </CardContent>
          </Card>

          {/* Centro de Costos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Centros de Costo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {centrosConGasto.slice(0, 4).map((cc) => (
                <div key={cc.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium">{cc.nombre}</span>
                    <span className={cc.porcentaje > 90 ? 'text-red-600 font-bold' : 'text-slate-600'}>
                      {cc.porcentaje}%
                    </span>
                  </div>
                  <Progress value={cc.porcentaje} className="h-1.5" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
