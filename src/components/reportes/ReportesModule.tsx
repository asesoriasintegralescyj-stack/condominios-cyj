'use client'

import { Card, CardContent } from '@/components/ui/card'
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
  ClipboardCheck
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
  { icon: Home, title: 'Propiedades', desc: 'Lista completa de unidades', endpoint: 'propiedades' },
  { icon: User, title: 'Personal', desc: 'Nómina completa', endpoint: 'personal' },
  { icon: Package, title: 'Activos', desc: 'Inventario con valorización', endpoint: 'activos' },
  { icon: Wrench, title: 'Órdenes de Trabajo', desc: 'Todas las OT', endpoint: 'ot' },
  { icon: Building2, title: 'Proveedores', desc: 'Directorio de proveedores', endpoint: 'proveedores' },
  { icon: PiggyBank, title: 'Centro de Costos', desc: 'Ejecución presupuestaria', endpoint: 'centrocostos' },
  { icon: DraftingCompass, title: 'Proyectos', desc: 'Estado de proyectos activos', endpoint: 'proyectos' },
  { icon: Search, title: 'Inspecciones', desc: 'Resultados de inspecciones', endpoint: 'inspecciones' },
  { icon: QrCode, title: 'Rondas QR', desc: 'Registros de escaneos de guardias', endpoint: 'rondas' },
  { icon: ShoppingCart, title: 'Solicitudes de Compra', desc: 'Estado de solicitudes', endpoint: 'solicitudescompra' },
  { icon: Calendar, title: 'Asistencia', desc: 'Control de asistencia del personal', endpoint: 'asistencia' },
  { icon: ClipboardCheck, title: 'Auditoría', desc: 'Registro de movimientos del sistema', endpoint: 'auditoria' },
]

export function ReportesModule() {
  const handleExport = async (endpoint: string) => {
    try {
      const res = await fetch(`/api/reportes?tipo=${endpoint}`)
      const data = await res.json()
      
      // Generate HTML report
      const html = generateReportHTML(endpoint, data)
      
      // Open in new window for printing
      const w = window.open('', '_blank', 'width=960,height=720')
      if (!w) {
        toast.error('Habilita ventanas emergentes')
        return
      }
      w.document.open()
      w.document.write(html)
      w.document.close()
      w.onload = () => setTimeout(() => w.print(), 400)
    } catch (error) {
      console.error('Error generating report:', error)
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {reportTypes.map((report) => (
        <Card 
          key={report.endpoint}
          className="cursor-pointer transition-all hover:shadow-lg hover:border-amber-300"
          onClick={() => handleExport(report.endpoint)}
        >
          <CardContent className="p-4 flex items-start gap-4">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
              <report.icon className="w-6 h-6 text-[#0f2044]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-[#0f2044]">{report.title}</div>
              <div className="text-xs text-slate-500 mt-0.5">{report.desc}</div>
              <div className="flex items-center gap-1 mt-3 text-xs text-amber-600 font-semibold">
                <Printer className="w-3.5 h-3.5" /> Exportar →
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
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

  const header = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Reporte - ${tipo}</title>
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
          <p style="font-size:11px;color:#64748b">Reporte de ${tipo} – ${new Date().toLocaleDateString('es-CL')}</p>
        </div>
      </div>
  `

  const footer = `<div class="footer">Generado: ${new Date().toLocaleString('es-CL')}</div></body></html>`

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
    default:
      tableContent = '<p style="text-align:center;color:#94a3b8;padding:20px">Reporte no disponible</p>'
  }

  return header + tableContent + footer
}
