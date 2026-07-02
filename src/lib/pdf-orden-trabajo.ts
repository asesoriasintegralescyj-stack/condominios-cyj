/**
 * PDF generator for a single Orden de Trabajo (OT).
 *
 * Generates a detailed PDF using jspdf + jspdf-autotable that includes:
 *  - Header (ORDEN DE TRABAJO + OT# + fecha emisión)
 *  - Info empresa
 *  - Datos del trabajo (propósito, ubicación, tipo, prioridad, estado, vencimiento)
 *  - Control de tiempo (estimado, real, diferencia)
 *  - Descripción
 *  - Herramientas
 *  - Materiales (con total)
 *  - Personal (con total mano de obra)
 *  - Tareas
 *  - Resumen de costos (materiales + mano de obra + total)
 *  - Firmas
 *
 * Returns a Node Buffer suitable for use as a nodemailer attachment or as a
 * file inside a ZIP archive.
 */

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const EMPRESA = {
  nombre: 'Asesorías Integrales CyJ',
  razonSocial: 'Asesorías Integrales CyJ SpA',
  rut: '76.123.456-7',
  direccion: 'Av. La Montaña Norte 3650, Lampa',
  telefono: '+56 964 650 643',
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

function formatMinutes(mins: number): string {
  if (!mins) return '0 min'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h > 0 && m > 0) return `${h}h ${m}min`
  if (h > 0) return `${h}h`
  return `${m}min`
}

export interface OTPdfInput {
  otNum: string
  titulo: string
  tipo?: string | null
  prioridad?: string | null
  estado?: string | null
  ubicacion?: string | null
  propiedadNombre?: string | null
  asignadoNombre?: string | null
  fechaLimite?: string | null
  fechaInicioReal?: string | null
  fechaFinReal?: string | null
  costoEstimado?: number
  costoReal?: number
  progreso?: number
  descripcion?: string | null
  tiempoEst?: number
  tiempoReal?: number
  estadoAprobacion?: string | null
  formaPago?: string | null
  herramientas?: Array<{ nombre: string; cantidad: number }>
  materiales?: Array<{ descripcion: string; cantidad: number; unidad?: string; precioUnit: number; total?: number }>
  personalOT?: Array<{ nombre: string; tipo?: string; cantidad: number; precioUnit: number; horasTrabajadas?: number; total?: number }>
  tareas?: Array<{ descripcion: string; cantidad: number; estado?: string }>
}

export function generateOrdenTrabajoPdfBuffer(input: OTPdfInput): Buffer {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let y = 10

  // ---------- Header amarillo ----------
  doc.setFillColor(255, 193, 7)
  doc.rect(10, y, pageWidth - 20, 12, 'F')
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('ORDEN DE TRABAJO', pageWidth / 2, y + 8, { align: 'center' })
  y += 16

  // ---------- Info empresa ----------
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(EMPRESA.nombre, 10, y)
  y += 4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(EMPRESA.direccion, 10, y)
  y += 4
  doc.text(`Tel: ${EMPRESA.telefono}`, 10, y)
  y += 4
  doc.text(`Email: ${EMPRESA.email}`, 10, y)
  y += 6

  // ---------- Info documento (derecha) ----------
  const col2X = pageWidth - 80
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Fecha emisión:', col2X, y - 18)
  doc.text('N° OT:', col2X, y - 13)
  doc.text('Asignado a:', col2X, y - 8)

  doc.setFont('helvetica', 'normal')
  doc.text(new Date().toLocaleDateString('es-CL'), pageWidth - 10, y - 18, { align: 'right' })
  doc.text(input.otNum, pageWidth - 10, y - 13, { align: 'right' })
  doc.text(input.asignadoNombre || 'N/A', pageWidth - 10, y - 8, { align: 'right' })

  // ---------- Datos del trabajo ----------
  doc.setFillColor(15, 32, 64)
  doc.rect(10, y, pageWidth - 20, 6, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('DATOS DEL TRABAJO', 12, y + 4)
  y += 8
  doc.setTextColor(0, 0, 0)

  autoTable(doc, {
    startY: y,
    body: [
      ['Propósito:', input.titulo || '–'],
      ['Ubicación:', input.ubicacion || input.propiedadNombre || '–'],
      ['Tipo:', input.tipo || '–', 'Prioridad:', input.prioridad || '–', 'Estado:', input.estado || '–'],
      ['Vencimiento:', formatDate(input.fechaLimite), 'Costo Est.:', formatCLP(input.costoEstimado || 0), 'Progreso:', `${input.progreso || 0}%`],
      ['Aprobación:', input.estadoAprobacion || '–', 'Forma de Pago:', input.formaPago || '–', '', ''],
    ],
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 1 },
    margin: { left: 10, right: 10 },
  })
  y = (doc as any).lastAutoTable.finalY + 3

  // ---------- Fechas reales ----------
  if (input.fechaInicioReal || input.fechaFinReal) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('Fechas Reales:', 10, y)
    doc.setFont('helvetica', 'normal')
    doc.text(`Inicio: ${formatDate(input.fechaInicioReal)} - Fin: ${formatDate(input.fechaFinReal)}`, 35, y)
    y += 5
  }

  // ---------- Control de tiempo ----------
  doc.setFillColor(240, 248, 255)
  doc.rect(10, y, pageWidth - 20, 16, 'F')
  doc.setDrawColor(100, 149, 237)
  doc.rect(10, y, pageWidth - 20, 16, 'S')

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 100)
  doc.text('CONTROL DE TIEMPO', 12, y + 4)

  doc.setTextColor(0, 0, 0)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Estimado:', 12, y + 11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 100, 200)
  doc.text(formatMinutes(input.tiempoEst || 0), 35, y + 11)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  doc.text('Real:', 70, y + 11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 150, 100)
  doc.text(formatMinutes(input.tiempoReal || 0), 85, y + 11)

  const diff = (input.tiempoReal || 0) - (input.tiempoEst || 0)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  doc.text('Diferencia:', 130, y + 11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(diff > 0 ? 200 : 0, diff > 0 ? 0 : 150, 0)
  doc.text((diff > 0 ? '+' : '') + formatMinutes(diff), 155, y + 11)
  y += 20

  // ---------- Descripción ----------
  if (input.descripcion) {
    if (y > pageHeight - 30) { doc.addPage(); y = 14 }
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('Descripción:', 10, y)
    doc.setFont('helvetica', 'normal')
    const descLines = doc.splitTextToSize(input.descripcion, pageWidth - 30)
    doc.text(descLines, 10, y + 4)
    y += 4 + descLines.length * 3 + 3
  }

  // ---------- Herramientas ----------
  if (y > pageHeight - 30) { doc.addPage(); y = 14 }
  doc.setFillColor(255, 193, 7)
  doc.rect(10, y, pageWidth - 20, 5, 'F')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('HERRAMIENTAS', 12, y + 3.5)
  y += 6

  const herramientas = input.herramientas || []
  if (herramientas.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Descripción', 'Cant.']],
      body: herramientas.map((h) => [h.nombre, String(h.cantidad)]),
      theme: 'plain',
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7 },
      styles: { fontSize: 8, cellPadding: 1 },
      columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 25, halign: 'center' } },
      margin: { left: 10, right: 10 },
    })
    y = (doc as any).lastAutoTable.finalY + 2
  } else {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('Sin herramientas registradas', 12, y + 3)
    y += 6
  }

  // ---------- Materiales ----------
  if (y > pageHeight - 30) { doc.addPage(); y = 14 }
  doc.setFillColor(255, 193, 7)
  doc.rect(10, y, pageWidth - 20, 5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.text('MATERIALES', 12, y + 3.5)
  y += 6

  const materiales = input.materiales || []
  const totalMateriales = materiales.reduce(
    (sum, m) => sum + (m.total || m.cantidad * m.precioUnit || 0),
    0
  )
  if (materiales.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Descripción', 'Cant.', 'Unidad', 'P. Unit.', 'Total']],
      body: materiales.map((m) => [
        m.descripcion,
        String(m.cantidad),
        m.unidad || 'unidad',
        formatCLP(m.precioUnit),
        formatCLP(m.total || m.cantidad * m.precioUnit || 0),
      ]),
      foot: [['TOTAL MATERIALES:', '', '', '', formatCLP(totalMateriales)]],
      theme: 'plain',
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7 },
      footStyles: { fillColor: [255, 193, 7], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 1 },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 30, halign: 'right' },
      },
      margin: { left: 10, right: 10 },
    })
    y = (doc as any).lastAutoTable.finalY + 2
  } else {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('Sin materiales registrados', 12, y + 3)
    y += 6
  }

  // ---------- Personal ----------
  if (y > pageHeight - 30) { doc.addPage(); y = 14 }
  doc.setFillColor(255, 193, 7)
  doc.rect(10, y, pageWidth - 20, 5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.text('PERSONAL', 12, y + 3.5)
  y += 6

  const personalOT = input.personalOT || []
  const totalPersonal = personalOT.reduce(
    (sum, p) => sum + (p.total || p.precioUnit * (p.horasTrabajadas || 0) * p.cantidad || 0),
    0
  )
  if (personalOT.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Nombre', 'Tipo', 'Cant.', '$ Hora', 'Horas', 'Total']],
      body: personalOT.map((p) => [
        p.nombre,
        p.tipo || 'Interno',
        String(p.cantidad),
        formatCLP(p.precioUnit),
        String(p.horasTrabajadas || 0),
        formatCLP(p.total || p.precioUnit * (p.horasTrabajadas || 0) * p.cantidad || 0),
      ]),
      foot: [['TOTAL MANO DE OBRA:', '', '', '', '', formatCLP(totalPersonal)]],
      theme: 'plain',
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7 },
      footStyles: { fillColor: [255, 193, 7], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8 },
      styles: { fontSize: 8, cellPadding: 1 },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 22, halign: 'center' },
        2: { cellWidth: 18, halign: 'center' },
        3: { cellWidth: 28, halign: 'right' },
        4: { cellWidth: 18, halign: 'center' },
        5: { cellWidth: 32, halign: 'right' },
      },
      margin: { left: 10, right: 10 },
    })
    y = (doc as any).lastAutoTable.finalY + 2
  } else {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('Sin personal registrado', 12, y + 3)
    y += 6
  }

  // ---------- Tareas ----------
  if (y > pageHeight - 30) { doc.addPage(); y = 14 }
  doc.setFillColor(255, 193, 7)
  doc.rect(10, y, pageWidth - 20, 5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.text('LISTA DE TAREAS', 12, y + 3.5)
  y += 6

  const tareas = input.tareas || []
  if (tareas.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Descripción', 'Cant.', 'Estado']],
      body: tareas.map((t) => [t.descripcion, String(t.cantidad), t.estado || 'Pendiente']),
      theme: 'plain',
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7 },
      styles: { fontSize: 8, cellPadding: 1 },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 30, halign: 'center' },
      },
      margin: { left: 10, right: 10 },
    })
    y = (doc as any).lastAutoTable.finalY + 2
  } else {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('Sin tareas registradas', 12, y + 3)
    y += 6
  }

  // ---------- Resumen de costos ----------
  if (y > pageHeight - 30) { doc.addPage(); y = 14 }
  doc.setFillColor(245, 245, 245)
  doc.rect(10, y, pageWidth - 20, 12, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  doc.text('Materiales:', 12, y + 5)
  doc.text(formatCLP(totalMateriales), 50, y + 5)
  doc.text('Mano de Obra:', 90, y + 5)
  doc.text(formatCLP(totalPersonal), 130, y + 5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('TOTAL OT:', 160, y + 5)
  doc.setTextColor(200, 0, 0)
  doc.text(formatCLP(totalMateriales + totalPersonal || input.costoReal || input.costoEstimado || 0), 185, y + 5, { align: 'right' })
  y += 16

  // ---------- Firmas ----------
  if (y > pageHeight - 30) { doc.addPage(); y = 14 }
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.line(30, y + 10, 90, y + 10)
  doc.line(pageWidth - 90, y + 10, pageWidth - 30, y + 10)
  doc.text('Firma Responsable:', 60, y + 15, { align: 'center' })
  doc.text('RECIBÍ CONFORME:', pageWidth - 60, y + 15, { align: 'center' })

  return Buffer.from(doc.output('arraybuffer'))
}
