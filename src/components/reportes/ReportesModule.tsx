'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Home,
  User,
  Package,
  Wrench,
  Building2,
  PiggyBank,
  Printer,
  DraftingCompass,
  Search,
  QrCode,
  ShoppingCart,
  Calendar,
  ClipboardCheck,
  Database,
  FileCheck,
  RefreshCw,
  CheckCircle,
  Settings,
  BookOpen,
  BarChart3,
  Car,
  Eye,
  Loader2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

function escapeHtml(str: string | null | undefined): string {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const reportTypes = [
  { icon: Home, title: 'Propiedades', desc: 'Lista completa de unidades (usado por OT)', endpoint: 'propiedades', grupo: 'Operativo' },
  { icon: User, title: 'Personal', desc: 'Nómina completa del personal', endpoint: 'personal', grupo: 'Operativo' },
  { icon: Package, title: 'Activos', desc: 'Inventario con valorización', endpoint: 'activos', grupo: 'Operativo' },
  { icon: Wrench, title: 'Órdenes de Trabajo', desc: 'Todas las OT registradas', endpoint: 'ot', grupo: 'Operativo' },
  { icon: CheckCircle, title: 'Aprobaciones OT', desc: 'OT pendientes de aprobación', endpoint: 'aprobacionesot', grupo: 'Operativo' },
  { icon: Building2, title: 'Proveedores', desc: 'Directorio de proveedores', endpoint: 'proveedores', grupo: 'Operativo' },
  { icon: PiggyBank, title: 'Centro de Costos', desc: 'Ejecución presupuestaria', endpoint: 'centrocostos', grupo: 'Operativo' },
  { icon: DraftingCompass, title: 'Proyectos', desc: 'Estado de proyectos activos', endpoint: 'proyectos', grupo: 'Operativo' },
  { icon: Search, title: 'Inspecciones', desc: 'Resultados de inspecciones', endpoint: 'inspecciones', grupo: 'Operativo' },
  { icon: ShoppingCart, title: 'Solicitudes de Compra', desc: 'Estado de solicitudes', endpoint: 'solicitudescompra', grupo: 'Operativo' },
  { icon: Calendar, title: 'Asistencia', desc: 'Control de asistencia del personal', endpoint: 'asistencia', grupo: 'Operativo' },
  { icon: Package, title: 'Inventario', desc: 'Movimientos de inventario', endpoint: 'inventario', grupo: 'Operativo' },
  { icon: Car, title: 'Patentes Vehiculares', desc: 'Registro de entrada/salida vehicular', endpoint: 'patentes', grupo: 'Rondas QR' },
  { icon: QrCode, title: 'Rondas QR', desc: 'Registros de escaneos de guardias', endpoint: 'rondas', grupo: 'Rondas QR' },
  { icon: ClipboardCheck, title: 'PMI', desc: 'Listas de Verificación del Plan de Mantenimiento', endpoint: 'pmi', grupo: 'Rondas QR' },
  { icon: FileCheck, title: 'Cumplimiento', desc: 'Cumplimiento legal y normativo', endpoint: 'cumplimiento', grupo: 'Cumplimiento' },
  { icon: Wrench, title: 'Materiales', desc: 'Catálogo de materiales', endpoint: 'materiales', grupo: 'Catálogos' },
  { icon: Wrench, title: 'Tareas', desc: 'Catálogo de tareas', endpoint: 'tareas', grupo: 'Catálogos' },
  { icon: Wrench, title: 'Herramientas', desc: 'Catálogo de herramientas', endpoint: 'herramientas', grupo: 'Catálogos' },
  { icon: BarChart3, title: 'Auditoría', desc: 'Registro de movimientos del sistema', endpoint: 'auditoria', grupo: 'Sistema' },
]

const GRUPO_COLORS: Record<string, string> = {
  Operativo: 'bg-blue-50 border-blue-200',
  'Rondas QR': 'bg-purple-50 border-purple-200',
  Cumplimiento: 'bg-green-50 border-green-200',
  Catálogos: 'bg-slate-50 border-slate-200',
  Sistema: 'bg-amber-50 border-amber-200',
}

export function ReportesModule() {
  const [loading, setLoading] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [previewData, setPreviewData] = useState<{ tipo: string; data: any[] } | null>(null)
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')

  useEffect(() => {
    setLastRefresh(new Date())
  }, [])

  const buildUrl = (endpoint: string) => {
    const params = new URLSearchParams()
    if (fechaDesde) params.append('from', new Date(fechaDesde).getTime().toString())
    if (fechaHasta) {
      const d = new Date(fechaHasta)
      d.setHours(23, 59, 59, 999)
      params.append('to', d.getTime().toString())
    }
    return `/api/reportes?tipo=${endpoint}${params.toString() ? '&' + params.toString() : ''}`
  }

  const handleExport = async (endpoint: string) => {
    setLoading(endpoint)
    try {
      const res = await fetch(buildUrl(endpoint), { cache: 'no-store' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || `Error al generar reporte de ${endpoint}`)
        return
      }
      const data = await res.json()

      if (!Array.isArray(data) || data.length === 0) {
        toast.info(`No hay datos disponibles para el reporte de ${endpoint}`)
        return
      }

      // Generate HTML report
      const html = generateReportHTML(endpoint, data)

      // Open in new window for printing
      const w = window.open('', '_blank', 'width=960,height=720')
      if (!w) {
        toast.error('Habilita ventanas emergentes para ver el reporte')
        return
      }
      w.document.open()
      w.document.write(html)
      w.document.close()
      w.onload = () => setTimeout(() => w.print(), 400)
      toast.success(`Reporte de ${endpoint} generado con ${data.length} registros`)
      setLastRefresh(new Date())
    } catch (error) {
      console.error('Error generating report:', error)
      toast.error('Error de conexión al generar el reporte')
    } finally {
      setLoading(null)
    }
  }

  const handlePreview = async (endpoint: string) => {
    setLoading(endpoint)
    try {
      const res = await fetch(buildUrl(endpoint), { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (!Array.isArray(data) || data.length === 0) {
        toast.info('Este reporte no tiene datos con los filtros actuales')
        setPreviewData(null)
        return
      }
      setPreviewData({ tipo: endpoint, data })
      toast.success(`${data.length} registro(s) cargados`)
      setLastRefresh(new Date())
    } catch (e) {
      console.error(e)
      toast.error('Error al cargar vista previa')
    } finally {
      setLoading(null)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      if (previewData?.tipo) {
        const res = await fetch(buildUrl(previewData.tipo), { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data)) {
            setPreviewData({ tipo: previewData.tipo, data })
          }
        }
      }
      setLastRefresh(new Date())
      toast.success('Datos actualizados')
    } catch {
      toast.error('Error al actualizar')
    } finally {
      setRefreshing(false)
    }
  }

  const grupos = Array.from(new Set(reportTypes.map((r) => r.grupo)))

  return (
    <div className="space-y-5">
      {/* Header + acciones */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#0f2044] flex items-center gap-2">
            <FileCheck className="w-5 h-5" />
            Reportes del Sistema
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            {reportTypes.length} reportes disponibles · Última actualización:{' '}
            {lastRefresh ? lastRefresh.toLocaleTimeString('es-CL') : '—'}
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={refreshing}
          className="bg-[#0f2044] hover:bg-[#0a1628]"
          size="sm"
        >
          {refreshing ? (
            <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Actualizando...</>
          ) : (
            <><RefreshCw className="w-4 h-4 mr-2" /> Actualizar datos</>
          )}
        </Button>
      </div>

      {/* Filtros de fecha */}
      <Card className="border-slate-200">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs">Fecha desde (opcional)</Label>
              <Input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-[160px] h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Fecha hasta (opcional)</Label>
              <Input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-[160px] h-8 text-xs"
              />
            </div>
            {(fechaDesde || fechaHasta) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFechaDesde('')
                  setFechaHasta('')
                }}
                className="h-8 text-xs"
              >
                Limpiar fechas
              </Button>
            )}
            <div className="text-xs text-slate-500 ml-auto">
              <Calendar className="w-3 h-3 inline mr-1" />
              Aplica a reportes de rondas, patentes, asistencia, inventario, auditoría
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tarjetas de reporte agrupadas */}
      {grupos.map((grupo) => (
        <div key={grupo}>
          <h3 className="text-xs font-bold text-[#0f2044] uppercase tracking-wider mb-2 flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
            {grupo}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {reportTypes
              .filter((r) => r.grupo === grupo)
              .map((report) => {
                const isLoading = loading === report.endpoint
                return (
                  <Card
                    key={report.endpoint}
                    className={`${GRUPO_COLORS[grupo] || 'bg-white'} transition-all hover:shadow-md`}
                  >
                    <CardContent className="p-4 flex items-start gap-3">
                      <div className="w-11 h-11 bg-white rounded-lg flex items-center justify-center shrink-0 border border-slate-200">
                        {isLoading ? (
                          <Loader2 className="w-5 h-5 text-[#0f2044] animate-spin" />
                        ) : (
                          <report.icon className="w-5 h-5 text-[#0f2044]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-[#0f2044]">{report.title}</div>
                        <div className="text-xs text-slate-600 mt-0.5">{report.desc}</div>
                        <div className="flex gap-1.5 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handlePreview(report.endpoint)}
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                              <Eye className="w-3 h-3 mr-1" />
                            )}
                            Ver
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-amber-600 hover:bg-amber-700"
                            onClick={() => handleExport(report.endpoint)}
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                              <Printer className="w-3 h-3 mr-1" />
                            )}
                            Exportar
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
          </div>
        </div>
      ))}

      {/* Vista previa */}
      {previewData && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-sm text-[#0f2044] flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Vista previa: {previewData.tipo}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {previewData.data.length} registro(s) · Clic en "Exportar" para imprimir o guardar como PDF
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 h-7 text-xs"
                  onClick={() => handleExport(previewData.tipo)}
                >
                  <Printer className="w-3 h-3 mr-1" /> Exportar a PDF
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => setPreviewData(null)}
                >
                  <X className="w-3 h-3 mr-1" /> Cerrar
                </Button>
              </div>
            </div>
            <PreviewTable tipo={previewData.tipo} data={previewData.data} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============================================
// Vista previa inline (tabla simple)
// ============================================
function PreviewTable({ tipo, data }: { tipo: string; data: any[] }) {
  if (!data || data.length === 0) {
    return <div className="text-center text-slate-500 py-6">Sin datos</div>
  }
  const cols = Object.keys(data[0]).filter((k) => {
    const v = data[0][k]
    return (
      v !== null &&
      v !== undefined &&
      typeof v !== 'object' &&
      !k.endsWith('Fmt') &&
      k !== 'id'
    )
  })
  return (
    <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-[420px] overflow-y-auto">
      <table className="w-full text-xs">
        <thead className="bg-slate-100 sticky top-0">
          <tr>
            {cols.map((c) => (
              <th key={c} className="px-2 py-1.5 text-left font-bold text-slate-700">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 100).map((row, i) => (
            <tr key={i} className="border-t border-slate-100">
              {cols.map((c) => (
                <td key={c} className="px-2 py-1.5 text-slate-700 max-w-[200px] truncate">
                  {String(row[c] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > 100 && (
        <div className="text-center text-xs text-slate-500 py-2 bg-slate-50">
          Mostrando primeros 100 de {data.length} registros. Exporta para ver todos.
        </div>
      )}
    </div>
  )
}

function generateReportHTML(tipo: string, data: any[]): string {
  const formatCLP = (n: number) => '$' + new Intl.NumberFormat('es-CL').format(Math.round(n || 0))
  const formatDate = (d: string | null) => {
    if (!d) return '–'
    try {
      const [y, m, dd] = d.split('-')
      return `${dd}/${m}/${y}`
    } catch { return d }
  }

  // Map endpoint → human-readable title for the report header
  const REPORT_TITLES: Record<string, string> = {
    propiedades: 'Propiedades',
    personal: 'Personal',
    activos: 'Activos',
    ot: 'Órdenes de Trabajo',
    aprobacionesot: 'Aprobaciones OT',
    proveedores: 'Proveedores',
    centrocostos: 'Centro de Costos',
    proyectos: 'Proyectos',
    inspecciones: 'Inspecciones',
    rondas: 'Rondas QR (escaneos de guardias)',
    solicitudescompra: 'Solicitudes de Compra',
    asistencia: 'Asistencia',
    auditoria: 'Auditoría del Sistema',
    patentes: 'Patentes Vehiculares',
    pmi: 'PMI — Listas de Verificación del Plan de Mantenimiento Integral',
    cumplimiento: 'Cumplimiento Legal',
    inventario: 'Movimientos de Inventario',
    materiales: 'Catálogo de Materiales',
    tareas: 'Catálogo de Tareas',
    herramientas: 'Catálogo de Herramientas',
  }
  const reportTitle = REPORT_TITLES[tipo] || tipo

  const header = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Reporte - ${reportTitle}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; font-size: 11px; padding: 24px; color: #000; }
        h1 { color: #0f2044; font-size: 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th { background: #0f2044; color: white; padding: 7px 8px; font-size: 10px; text-align: left; }
        td { padding: 6px 8px; border-bottom: 1px solid #e8ecf0; font-size: 10.5px; }
        tr:nth-child(even) td { background: #f8fafc; }
        .header { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; border-bottom: 3px solid #f0a500; padding-bottom: 14px; }
        .logo { width: 46px; height: 46px; background: #0f2044; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; }
        .footer { margin-top: 14px; font-size: 9px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">🏘️</div>
        <div>
          <h1>Condominio Laguna Norte</h1>
          <p style="font-size:11px;color:#64748b">Reporte de <b>${reportTitle}</b> – ${new Date().toLocaleDateString('es-CL')}</p>
          <p style="font-size:9px;color:#94a3b8;margin-top:2px">${data.length} registro(s)</p>
        </div>
      </div>
  `

  const footer = `<div class="footer">Generado: ${new Date().toLocaleString('es-CL')} · Reporte: ${reportTitle}</div></body></html>`

  let tableContent = ''

  switch (tipo) {
    case 'propiedades':
      tableContent = `
        <table>
          <thead><tr><th>Nombre</th><th>Tipo</th><th>Estado</th><th>Dirección</th><th>Hab.</th><th>Baños</th><th>m²</th><th>Precio</th><th>Contacto</th></tr></thead>
          <tbody>
            ${data.map((p: any) => `<tr>
              <td><b>${escapeHtml(p.nombre)}</b></td><td>${escapeHtml(p.tipo)}</td><td>${escapeHtml(p.estado)}</td>
              <td>${escapeHtml(p.direccion) || '–'}</td><td>${p.habitaciones}</td><td>${p.banos}</td><td>${p.mts2}</td>
              <td>${formatCLP(p.precio)}</td><td>${escapeHtml(p.contacto) || '–'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      `
      break
    case 'personal':
      tableContent = `
        <table>
          <thead><tr><th>Nombre</th><th>RUT</th><th>Cargo</th><th>Contrato</th><th>AFP</th><th>Salud</th><th>Sueldo Base</th><th>Estado</th></tr></thead>
          <tbody>
            ${data.map((p: any) => `<tr>
              <td><b>${escapeHtml(p.nombre)}</b></td><td>${escapeHtml(p.rut) || '–'}</td><td>${escapeHtml(p.cargo) || '–'}</td>
              <td>${escapeHtml(p.contrato)}</td><td>${escapeHtml(p.afp)}</td><td>${escapeHtml(p.salud)}</td>
              <td style="text-align:right">${formatCLP(p.sueldoBase)}</td><td>${escapeHtml(p.estado)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      `
      break
    case 'activos':
      tableContent = `
        <table>
          <thead><tr><th>Nombre</th><th>Categoría</th><th>Estado</th><th>Ubicación</th><th>N° Serie</th><th>Costo</th><th>Valor Actual</th></tr></thead>
          <tbody>
            ${data.map((a: any) => `<tr>
              <td><b>${escapeHtml(a.nombre)}</b></td><td>${escapeHtml(a.categoria)}</td><td>${escapeHtml(a.estado)}</td>
              <td>${escapeHtml(a.ubicacion) || '–'}</td><td>${escapeHtml(a.serie) || '–'}</td>
              <td style="text-align:right">${formatCLP(a.costoCompra)}</td>
              <td style="text-align:right">${formatCLP(a.valorActual)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
        <div style="margin-top:10px;text-align:right;font-weight:bold">Valor Total: ${formatCLP(data.reduce((s: number, a: any) => s + (a.valorActual || 0), 0))}</div>
      `
      break
    case 'ot':
      tableContent = `
        <table>
          <thead><tr><th>N°</th><th>Título</th><th>Tipo</th><th>Prioridad</th><th>Estado</th><th>Ubicación</th><th>Asignado</th><th>Costo</th></tr></thead>
          <tbody>
            ${data.map((o: any) => `<tr>
              <td>${escapeHtml(o.otNum || o.numero)}</td><td><b>${escapeHtml(o.titulo)}</b></td>
              <td>${escapeHtml(o.tipo)}</td><td>${escapeHtml(o.prioridad)}</td><td>${escapeHtml(o.estado)}</td>
              <td>${escapeHtml(o.ubicacion) || '–'}</td><td>${escapeHtml(o.asignadoA || o.asignado) || '–'}</td>
              <td style="text-align:right">${formatCLP(o.costoEstimado || o.costoReal || 0)}</td>
            </tr>`).join('')}
          </tbody>
        </table>`
      break
    case 'proveedores':
      tableContent = `
        <table>
          <thead><tr><th>Nombre / Razón Social</th><th>RUT</th><th>Contacto</th><th>Teléfono</th><th>Email</th><th>Categoría</th></tr></thead>
          <tbody>
            ${data.map((p: any) => `<tr>
              <td><b>${escapeHtml(p.nombre)}</b></td><td>${escapeHtml(p.rut) || '–'}</td>
              <td>${escapeHtml(p.contacto) || '–'}</td><td>${escapeHtml(p.telefono) || '–'}</td>
              <td>${escapeHtml(p.email) || '–'}</td><td>${escapeHtml(p.categoria) || '–'}</td>
            </tr>`).join('')}
          </tbody>
        </table>`
      break
    case 'centrocostos':
      tableContent = `
        <table>
          <thead><tr><th>Código</th><th>Nombre</th><th>Presupuesto</th><th>Gastado</th><th>Saldo</th><th>Estado</th></tr></thead>
          <tbody>
            ${data.map((c: any) => `<tr>
              <td>${escapeHtml(c.codigo)}</td><td><b>${escapeHtml(c.nombre)}</b></td>
              <td style="text-align:right">${formatCLP(c.presupuesto)}</td>
              <td style="text-align:right">${formatCLP(c.gastado)}</td>
              <td style="text-align:right">${formatCLP((c.presupuesto || 0) - (c.gastado || 0))}</td>
              <td>${escapeHtml(c.estado) || '–'}</td>
            </tr>`).join('')}
          </tbody>
        </table>`
      break
    case 'proyectos':
      tableContent = `
        <table>
          <thead><tr><th>Nombre</th><th>Estado</th><th>Encargado</th><th>Inicio</th><th>Plazo</th><th>Presupuesto</th></tr></thead>
          <tbody>
            ${data.map((p: any) => `<tr>
              <td><b>${escapeHtml(p.nombre)}</b></td><td>${escapeHtml(p.estado)}</td>
              <td>${escapeHtml(p.encargado) || '–'}</td><td>${formatDate(p.fechaInicio)}</td>
              <td>${formatDate(p.fechaLimite)}</td><td style="text-align:right">${formatCLP(p.presupuesto)}</td>
            </tr>`).join('')}
          </tbody>
        </table>`
      break
    case 'inspecciones':
      tableContent = `
        <table>
          <thead><tr><th>Título</th><th>Tipo</th><th>Estado</th><th>Inspector</th><th>Fecha</th><th>Ubicación</th></tr></thead>
          <tbody>
            ${data.map((i: any) => `<tr>
              <td><b>${escapeHtml(i.titulo)}</b></td><td>${escapeHtml(i.tipo)}</td><td>${escapeHtml(i.estado)}</td>
              <td>${escapeHtml(i.inspector)}</td>
              <td>${formatDate(i.fecha)}</td><td>${escapeHtml(i.ubicacion) || '–'}</td>
            </tr>`).join('')}
          </tbody>
        </table>`
      break
    case 'rondas':
      tableContent = `
        <table>
          <thead><tr><th>Ubicación</th><th>Guardia</th><th>Fecha/Hora</th><th>GPS</th></tr></thead>
          <tbody>
            ${data.map((r: any) => `<tr>
              <td>${escapeHtml(r.location?.name || r.ubicacion || '–')}</td>
              <td>${escapeHtml(r.scannedBy || r.guardia)}</td>
              <td>${r.createdAt ? new Date(r.createdAt).toLocaleString('es-CL') : '–'}</td>
              <td>${r.latitude ? r.latitude.toFixed(5) + ', ' + r.longitude.toFixed(5) : '–'}</td>
            </tr>`).join('')}
          </tbody>
        </table>`
      break
    case 'solicitudescompra':
      tableContent = `
        <table>
          <thead><tr><th>N°</th><th>Solicitante</th><th>Concepto</th><th>Monto</th><th>Estado</th><th>Fecha</th></tr></thead>
          <tbody>
            ${data.map((s: any) => `<tr>
              <td>${escapeHtml(s.numero || s.id?.slice(-6))}</td><td>${escapeHtml(s.solicitante || s.creadoPor)}</td>
              <td><b>${escapeHtml(s.concepto || s.descripcion)}</b></td>
              <td style="text-align:right">${formatCLP(s.monto || s.montoEstimado)}</td>
              <td>${escapeHtml(s.estado)}</td><td>${formatDate(s.fecha || s.createdAt)}</td>
            </tr>`).join('')}
          </tbody>
        </table>`
      break
    case 'asistencia':
      tableContent = `
        <table>
          <thead><tr><th>Nombre</th><th>Fecha</th><th>Entrada</th><th>Salida</th><th>Horas</th><th>Estado</th></tr></thead>
          <tbody>
            ${data.map((a: any) => `<tr>
              <td><b>${escapeHtml(a.nombre || a.personal)}</b></td><td>${formatDate(a.fecha)}</td>
              <td>${escapeHtml(a.horaEntrada) || '–'}</td><td>${escapeHtml(a.horaSalida) || '–'}</td>
              <td>${escapeHtml(a.horasTrabajadas) || '–'}</td><td>${escapeHtml(a.estado)}</td>
            </tr>`).join('')}
          </tbody>
        </table>`
      break
    case 'auditoria':
      tableContent = `
        <table>
          <thead><tr><th>Fecha/Hora</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>Detalle</th></tr></thead>
          <tbody>
            ${(Array.isArray(data) ? data : []).map((a: any) => `<tr>
              <td>${a.createdAt ? new Date(a.createdAt).toLocaleString('es-CL') : '–'}</td>
              <td>${escapeHtml(a.userId || a.usuarioNombre || a.performedBy || '–')}</td>
              <td><b>${escapeHtml(a.accion || a.action)}</b></td>
              <td>${escapeHtml(a.entidad || a.entidadTipo || '–')}</td>
              <td>${escapeHtml(a.datosDespues || a.datos || a.changes || '').substring(0, 100)}</td>
            </tr>`).join('')}
          </tbody>
        </table>`
      break
    case 'patentes':
      tableContent = `
        <table>
          <thead><tr><th>Patente</th><th>Ubicación</th><th>Guardia</th><th>Entrada</th><th>Salida</th><th>Estado</th></tr></thead>
          <tbody>
            ${(Array.isArray(data) ? data : []).map((p: any) => `<tr>
              <td><b>${escapeHtml(p.patente)}</b></td>
              <td>${escapeHtml(p.ubicacion)}</td>
              <td>${escapeHtml(p.scannedBy)}</td>
              <td>${p.entradaAt ? new Date(p.entradaAt).toLocaleString('es-CL') : '–'}</td>
              <td>${p.salidaAt ? new Date(p.salidaAt).toLocaleString('es-CL') : '–'}</td>
              <td>${p.salidaAt ? 'Salida' : 'Adentro'}</td>
            </tr>`).join('')}
          </tbody>
        </table>`
      break
    case 'aprobacionesot':
      tableContent = `
        <table>
          <thead><tr><th>N° OT</th><th>Título</th><th>Prioridad</th><th>Estado</th><th>Solicitante</th><th>Fecha</th></tr></thead>
          <tbody>
            ${(Array.isArray(data) ? data : []).map((a: any) => `<tr>
              <td>${escapeHtml(a.otNum || a.numero || '–')}</td>
              <td><b>${escapeHtml(a.titulo)}</b></td>
              <td>${escapeHtml(a.prioridad)}</td>
              <td>${escapeHtml(a.estado)}</td>
              <td>${escapeHtml(a.solicitante || a.asignadoA || '–')}</td>
              <td>${a.createdAt ? new Date(a.createdAt).toLocaleString('es-CL') : '–'}</td>
            </tr>`).join('')}
          </tbody>
        </table>`
      break
    case 'pmi':
      tableContent = `
        <table>
          <thead><tr><th>Código LV</th><th>Nombre / Elemento</th><th>Sector</th><th>Frecuencia</th><th>Responsable</th><th>Ítems</th><th>Estado</th></tr></thead>
          <tbody>
            ${(Array.isArray(data) ? data : []).map((p: any) => `<tr>
              <td><b>${escapeHtml(p.codigo || '–')}</b></td>
              <td><b>${escapeHtml(p.nombre || p.elemento)}</b></td>
              <td>${escapeHtml(p.sector || p.categoria || '–')}</td>
              <td>${escapeHtml(p.frecuencia || '–')}</td>
              <td>${escapeHtml(p.responsable || '–')}</td>
              <td style="text-align:center">${p.cantidadItems ?? '–'}</td>
              <td>${p.activa === false ? 'Inactiva' : 'Activa'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
        <p style="margin-top:10px;font-size:10px;color:#64748b;">
          <b>PMI — Plan de Mantenimiento Integral.</b> Listas de Verificación (LV) activas en el sistema.
          Cada LV agrupa los ítems de control que el personal debe ejecutar según la frecuencia indicada.
        </p>`
      break
    case 'cumplimiento':
      tableContent = `
        <table>
          <thead><tr><th>Nombre</th><th>Categoría</th><th>Estado</th><th>Responsable</th><th>Vencimiento</th></tr></thead>
          <tbody>
            ${(Array.isArray(data) ? data : []).map((c: any) => `<tr>
              <td><b>${escapeHtml(c.nombre || c.titulo)}</b></td>
              <td>${escapeHtml(c.categoria)}</td>
              <td>${escapeHtml(c.estado || c.estadoCumplimiento)}</td>
              <td>${escapeHtml(c.responsable)}</td>
              <td>${c.vencimiento || c.fechaVencimiento ? new Date(c.vencimiento || c.fechaVencimiento).toLocaleDateString('es-CL') : '–'}</td>
            </tr>`).join('')}
          </tbody>
        </table>`
      break
    case 'inventario':
      tableContent = `
        <table>
          <thead><tr><th>Producto</th><th>Tipo Movimiento</th><th>Cantidad</th><th>Bodega</th><th>Responsable</th><th>Fecha</th></tr></thead>
          <tbody>
            ${(Array.isArray(data) ? data : []).map((i: any) => `<tr>
              <td><b>${escapeHtml(i.producto || i.nombre || i.material)}</b></td>
              <td>${escapeHtml(i.tipoMovimiento || i.tipo)}</td>
              <td>${i.cantidad || '–'}</td>
              <td>${escapeHtml(i.bodega || i.ubicacion)}</td>
              <td>${escapeHtml(i.responsable || i.usuario)}</td>
              <td>${i.fecha || i.createdAt ? new Date(i.fecha || i.createdAt).toLocaleString('es-CL') : '–'}</td>
            </tr>`).join('')}
          </tbody>
        </table>`
      break
    case 'materiales':
      tableContent = `
        <table>
          <thead><tr><th>Código</th><th>Nombre</th><th>Unidad</th><th>Stock</th><th>Precio Unitario</th><th>Categoría</th></tr></thead>
          <tbody>
            ${(Array.isArray(data) ? data : []).map((m: any) => `<tr>
              <td>${escapeHtml(m.codigo)}</td>
              <td><b>${escapeHtml(m.nombre)}</b></td>
              <td>${escapeHtml(m.unidad)}</td>
              <td>${m.stock || m.stockActual || '–'}</td>
              <td style="text-align:right">${formatCLP(m.precioUnitario || m.precio)}</td>
              <td>${escapeHtml(m.categoria)}</td>
            </tr>`).join('')}
          </tbody>
        </table>`
      break
    case 'tareas':
      tableContent = `
        <table>
          <thead><tr><th>Nombre</th><th>Categoría</th><th>Descripción</th><th>Frecuencia</th><th>Activo</th></tr></thead>
          <tbody>
            ${(Array.isArray(data) ? data : []).map((t: any) => `<tr>
              <td><b>${escapeHtml(t.nombre)}</b></td>
              <td>${escapeHtml(t.categoria)}</td>
              <td>${escapeHtml((t.descripcion || '').substring(0, 80))}</td>
              <td>${escapeHtml(t.frecuencia)}</td>
              <td>${t.activo !== false ? 'Sí' : 'No'}</td>
            </tr>`).join('')}
          </tbody>
        </table>`
      break
    case 'herramientas':
      tableContent = `
        <table>
          <thead><tr><th>Código</th><th>Nombre</th><th>Categoría</th><th>Ubicación</th><th>Estado</th></tr></thead>
          <tbody>
            ${(Array.isArray(data) ? data : []).map((h: any) => `<tr>
              <td>${escapeHtml(h.codigo)}</td>
              <td><b>${escapeHtml(h.nombre)}</b></td>
              <td>${escapeHtml(h.categoria)}</td>
              <td>${escapeHtml(h.ubicacion)}</td>
              <td>${escapeHtml(h.estado)}</td>
            </tr>`).join('')}
          </tbody>
        </table>`
      break
    default:
      tableContent = '<p style="text-align:center;color:#94a3b8;padding:20px">Reporte no disponible</p>'
  }

  return header + tableContent + footer
}
