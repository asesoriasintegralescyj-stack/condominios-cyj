/**
 * PDF generator for a single Proyecto.
 *
 * Generates a detailed PDF using jspdf + jspdf-autotable that includes:
 *  - Header (PROYECTO + código + fecha generación)
 *  - Nombre del proyecto
 *  - Info section (sector, tipo, prioridad, estado, aprobación, responsable,
 *    tiempo estimado, monto, fechas, avance, presupuestos)
 *  - Comentarios
 *  - Descripción
 *  - Materiales (con total)
 *  - Personal (con total)
 *  - Tareas
 *  - Herramientas
 *  - Resumen de costos
 *
 * Returns a Node Buffer suitable for use as a nodemailer attachment or as a
 * file inside a ZIP archive.
 */

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const EMPRESA = {
  condominio: 'Condominio LAGUNA NORTE',
  razonSocial: 'Asesorías Integrales CyJ',
  email: 'asesoriasintegralescyj@gmail.com',
}

function formatCLP(n: number): string {
  return '$' + new Intl.NumberFormat('es-CL').format(Math.round(n || 0))
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '–'
  try {
    const iso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) return d.toLocaleDateString('es-CL')
    return dateStr
  } catch {
    return dateStr || '–'
  }
}

export interface ProyectoPdfInput {
  id: string
  nombre: string
  categoria?: string | null
  estado?: string | null
  ubicacion?: string | null
  fechaInicio?: string | null
  fechaFin?: string | null
  presProg?: number
  presUsado?: number
  avance?: number
  descripcion?: string | null
  notas?: string | null
  sector?: string | null
  tipoReparacion?: string | null
  prioridad?: string | null
  estadoAprobacion?: string | null
  responsable?: string | null
  tiempoEstimado?: string | null
  monto?: number
  fechaInicioReal?: string | null
  fechaFinReal?: string | null
  comentarios?: string | null
  materiales?: Array<{ descripcion: string; cantidad: number; unidad?: string; precioUnit: number; total?: number }>
  personal?: Array<{ nombre: string; tipo?: string; cantidad: number; precioUnit: number; total?: number }>
  tareas?: Array<{ descripcion: string; cantidad: number; estado?: string }>
  herramientas?: Array<{ nombre: string; cantidad: number }>
}

export function generateProyectoPdfBuffer(input: ProyectoPdfInput): Buffer {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 12
  let y = 14

  // ---------- Header ----------
  doc.setFillColor(15, 32, 64) // #0f2040
  doc.rect(margin, y, pageWidth - margin * 2, 18, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  const codigoProy = `PROY-${input.id.slice(-4).toUpperCase()}`
  doc.text(`PROYECTO ${codigoProy}`, margin + 4, y + 8)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Generado: ${new Date().toLocaleString('es-CL')}`, pageWidth - margin - 4, y + 8, { align: 'right' })
  doc.setFontSize(8)
  doc.text(EMPRESA.condominio, pageWidth - margin - 4, y + 14, { align: 'right' })
  y += 22

  // ---------- Nombre ----------
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 32, 64)
  const nombreLines = doc.splitTextToSize(input.nombre || '–', pageWidth - margin * 2)
  doc.text(nombreLines, margin, y)
  y += nombreLines.length * 5 + 2

  // ---------- Info section ----------
  const infoRows: [string, string][] = [
    ['Sector', input.sector || input.ubicacion || '–'],
    ['Tipo', input.tipoReparacion || input.categoria || '–'],
    ['Prioridad', input.prioridad || '–'],
    ['Estado', input.estado || '–'],
    ['Aprobación', input.estadoAprobacion || '–'],
    ['Responsable', input.responsable || '–'],
    ['Tiempo Estimado', input.tiempoEstimado || '–'],
    ['Monto', (input.monto || input.presProg || 0) > 0 ? formatCLP(input.monto || input.presProg || 0) : '–'],
    ['Fecha Inicio', formatDate(input.fechaInicio)],
    ['Fecha Término', formatDate(input.fechaFin)],
    ['Inicio Real', formatDate(input.fechaInicioReal)],
    ['Fin Real', formatDate(input.fechaFinReal)],
    ['Avance', `${input.avance ?? 0}%`],
    ['Pres. Programado', input.presProg ? formatCLP(input.presProg) : '–'],
    ['Pres. Usado', input.presUsado ? formatCLP(input.presUsado) : '–'],
  ]

  autoTable(doc, {
    startY: y,
    body: infoRows,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 32, 64] },
      1: { cellWidth: 'auto' },
    },
    margin: { left: margin, right: margin },
  })
  y = (doc as any).lastAutoTable.finalY + 4

  // ---------- Comentarios ----------
  if (input.comentarios) {
    if (y > pageHeight - 30) { doc.addPage(); y = 14 }
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 32, 64)
    doc.text('Comentarios:', margin, y + 3)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(20, 20, 20)
    const cLines = doc.splitTextToSize(input.comentarios, pageWidth - margin * 2)
    doc.text(cLines, margin, y + 8)
    y += 8 + cLines.length * 4 + 2
  }

  // ---------- Descripción ----------
  if (input.descripcion) {
    if (y > pageHeight - 30) { doc.addPage(); y = 14 }
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 32, 64)
    doc.text('Descripción:', margin, y + 3)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(20, 20, 20)
    const dLines = doc.splitTextToSize(input.descripcion, pageWidth - margin * 2)
    doc.text(dLines, margin, y + 8)
    y += 8 + dLines.length * 4 + 2
  }

  // ---------- Materiales ----------
  const materiales = input.materiales || []
  const totalMateriales = materiales.reduce(
    (sum, m) => sum + (m.total || m.cantidad * m.precioUnit || 0),
    0
  )

  if (y > pageHeight - 40) { doc.addPage(); y = 14 }
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 32, 64)
  doc.text(`Materiales (${materiales.length})`, margin, y + 3)
  y += 6

  if (materiales.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['#', 'Descripción', 'Cant.', 'Unidad', 'P. Unit', 'Total']],
      body: materiales.map((m, i) => [
        String(i + 1),
        m.descripcion,
        String(m.cantidad),
        m.unidad || 'unidad',
        formatCLP(m.precioUnit),
        formatCLP(m.total || m.cantidad * m.precioUnit || 0),
      ]),
      foot: [['', 'TOTAL', '', '', '', formatCLP(totalMateriales)]],
      theme: 'grid',
      headStyles: { fillColor: [15, 32, 64], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 32, 64], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 1.5 },
      margin: { left: margin, right: margin },
    })
    y = (doc as any).lastAutoTable.finalY + 4
  } else {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    doc.text('Sin materiales registrados', margin, y + 3)
    y += 8
  }

  // ---------- Personal ----------
  const personal = input.personal || []
  const totalPersonal = personal.reduce(
    (sum, p) => sum + (p.total || p.precioUnit * p.cantidad || 0),
    0
  )

  if (y > pageHeight - 40) { doc.addPage(); y = 14 }
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 32, 64)
  doc.text(`Personal (${personal.length})`, margin, y + 3)
  y += 6

  if (personal.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['#', 'Nombre', 'Tipo', 'Cant.', '$ Unit', 'Total']],
      body: personal.map((p, i) => [
        String(i + 1),
        p.nombre,
        p.tipo || 'Interno',
        String(p.cantidad),
        formatCLP(p.precioUnit),
        formatCLP(p.total || p.precioUnit * p.cantidad || 0),
      ]),
      foot: [['', 'TOTAL', '', '', '', formatCLP(totalPersonal)]],
      theme: 'grid',
      headStyles: { fillColor: [15, 32, 64], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 32, 64], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 1.5 },
      margin: { left: margin, right: margin },
    })
    y = (doc as any).lastAutoTable.finalY + 4
  } else {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    doc.text('Sin personal registrado', margin, y + 3)
    y += 8
  }

  // ---------- Tareas ----------
  const tareas = input.tareas || []
  if (y > pageHeight - 40) { doc.addPage(); y = 14 }
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 32, 64)
  doc.text(`Tareas (${tareas.length})`, margin, y + 3)
  y += 6

  if (tareas.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['#', 'Descripción', 'Cant.', 'Estado']],
      body: tareas.map((t, i) => [String(i + 1), t.descripcion, String(t.cantidad), t.estado || 'Pendiente']),
      theme: 'grid',
      headStyles: { fillColor: [15, 32, 64], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 1.5 },
      margin: { left: margin, right: margin },
    })
    y = (doc as any).lastAutoTable.finalY + 4
  } else {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    doc.text('Sin tareas registradas', margin, y + 3)
    y += 8
  }

  // ---------- Herramientas ----------
  const herramientas = input.herramientas || []
  if (y > pageHeight - 30) { doc.addPage(); y = 14 }
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 32, 64)
  doc.text(`Herramientas (${herramientas.length})`, margin, y + 3)
  y += 6

  if (herramientas.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['#', 'Nombre', 'Cant.']],
      body: herramientas.map((h, i) => [String(i + 1), h.nombre, String(h.cantidad)]),
      theme: 'grid',
      headStyles: { fillColor: [15, 32, 64], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 1.5 },
      margin: { left: margin, right: margin },
    })
    y = (doc as any).lastAutoTable.finalY + 4
  } else {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    doc.text('Sin herramientas registradas', margin, y + 3)
    y += 8
  }

  // ---------- Resumen de costos ----------
  if (y > pageHeight - 40) { doc.addPage(); y = 14 }
  doc.setFillColor(241, 245, 249)
  doc.rect(margin, y, pageWidth - margin * 2, 22, 'F')
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 32, 64)
  doc.text('RESUMEN DE COSTOS', margin + 4, y + 6)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(20, 20, 20)
  doc.text('Materiales:', margin + 4, y + 12)
  doc.text(formatCLP(totalMateriales), margin + 50, y + 12)
  doc.text('Mano de Obra:', margin + 4, y + 17)
  doc.text(formatCLP(totalPersonal), margin + 50, y + 17)

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(200, 0, 0)
  doc.setFontSize(11)
  doc.text('TOTAL PROYECTO:', pageWidth - margin - 60, y + 14)
  doc.text(formatCLP(totalMateriales + totalPersonal), pageWidth - margin - 4, y + 14, { align: 'right' })

  if (input.presProg && input.presProg > 0) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(80, 80, 80)
    const usado = totalMateriales + totalPersonal
    const pct = ((usado / input.presProg) * 100).toFixed(1)
    doc.text(`Presupuesto: ${formatCLP(input.presProg)} · Usado: ${pct}%`, pageWidth - margin - 4, y + 19, { align: 'right' })
  }
  y += 26

  return Buffer.from(doc.output('arraybuffer'))
}
