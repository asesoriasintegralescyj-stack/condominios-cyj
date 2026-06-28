'use client'

import { Card, CardContent } from '@/components/ui/card'
import { 
  Home, 
  Users, 
  User, 
  Package, 
  Wrench, 
  Building2, 
  Receipt, 
  PiggyBank,
  Printer
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
  { icon: Users, title: 'Residentes', desc: 'Directorio de residentes', endpoint: 'residentes' },
  { icon: User, title: 'Personal', desc: 'Nómina completa', endpoint: 'personal' },
  { icon: Package, title: 'Activos', desc: 'Inventario con valorización', endpoint: 'activos' },
  { icon: Wrench, title: 'Órdenes de Trabajo', desc: 'Todas las OT', endpoint: 'ot' },
  { icon: Building2, title: 'Proveedores', desc: 'Directorio de proveedores', endpoint: 'proveedores' },
  { icon: Receipt, title: 'Gastos', desc: 'Rendición de gastos', endpoint: 'gastos' },
  { icon: PiggyBank, title: 'Centro de Costos', desc: 'Ejecución presupuestaria', endpoint: 'centrocostos' },
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
              <report.icon className="w-6 h-6 text-[#0f2040]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-[#0f2040]">{report.title}</div>
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
        h1 { color: #0f2040; font-size: 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th { background: #0f2040; color: white; padding: 7px 8px; font-size: 10px; text-align: left; }
        td { padding: 6px 8px; border-bottom: 1px solid #e8ecf0; font-size: 10.5px; }
        tr:nth-child(even) td { background: #f8fafc; }
        .header { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; border-bottom: 3px solid #f0a500; padding-bottom: 14px; }
        .logo { width: 46px; height: 46px; background: #0f2040; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; }
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
    case 'residentes':
      tableContent = `
        <table>
          <thead><tr><th>Nombre</th><th>RUT</th><th>Unidad</th><th>Tipo</th><th>Estado</th><th>Teléfono</th><th>Email</th><th>Ingreso</th></tr></thead>
          <tbody>
            ${data.map((r: any) => `<tr>
              <td><b>${escapeHtml(r.nombre)}</b></td><td>${escapeHtml(r.rut) || '–'}</td><td>${escapeHtml(r.unidad) || '–'}</td>
              <td>${escapeHtml(r.tipo)}</td><td>${escapeHtml(r.estado)}</td><td>${escapeHtml(r.telefono) || '–'}</td>
              <td>${escapeHtml(r.email) || '–'}</td><td>${formatDate(r.fechaIngreso)}</td>
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
    case 'gastos':
      tableContent = `
        <table>
          <thead><tr><th>N° Doc.</th><th>Fecha</th><th>Descripción</th><th>Categoría</th><th>Centro Costo</th><th>Monto</th><th>Estado</th></tr></thead>
          <tbody>
            ${data.map((g: any) => `<tr>
              <td>${escapeHtml(g.nDoc) || '–'}</td><td>${formatDate(g.fecha)}</td><td>${escapeHtml(g.descripcion)}</td>
              <td>${escapeHtml(g.categoria)}</td><td>${escapeHtml(g.centroCosto) || '–'}</td>
              <td style="text-align:right;font-weight:bold">${formatCLP(g.monto)}</td><td>${escapeHtml(g.estado)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
        <div style="margin-top:10px;text-align:right;font-weight:bold">Total: ${formatCLP(data.reduce((s: number, g: any) => s + (g.monto || 0), 0))}</div>
      `
      break
    default:
      tableContent = '<p style="text-align:center;color:#94a3b8;padding:20px">Reporte no disponible</p>'
  }

  return header + tableContent + footer
}
