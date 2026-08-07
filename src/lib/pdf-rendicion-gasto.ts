/**
 * PDF generator for Rendición de Gastos.
 *
 * Generates a professional PDF using jspdf + jspdf-autotable that includes:
 *  - Header (RENDICIÓN DE GASTOS + código + período)
 *  - Info empresa
 *  - Datos de la rendición (responsable, concepto, estado, fechas)
 *  - Tabla de boletas con detalle (descripción, monto, comprobante, etc.)
 *  - Resumen de montos (total gastado vs asignado)
 *  - Observaciones
 *
 * Returns a Node Buffer suitable for use as a nodemailer attachment.
 */

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const EMPRESA = {
  nombre: 'Asesorías Integrales CyJ',
  direccion: 'Av. La Montaña Norte 3650, Lampa',
  telefono: '+56 964 650 643',
  email: 'asesoriasintegralescyj@gmail.com',
}

function formatCLP(n: number): string {
  return '$' + new Intl.NumberFormat('es-CL').format(Math.round(n || 0))
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  try {
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
      const [y, m, d] = dateStr.split('-')
      return `${d}/${m}/${y}`
    }
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) return d.toLocaleDateString('es-CL')
    return dateStr
  } catch {
    return dateStr || '-'
  }
}

export interface BoletaPdfRow {
  descripcion: string
  monto: number
  fecha: string | null
  nDocumento: string | null
  proveedor: string | null
  centroCosto?: string | null
  categoria?: string | null
  notas: string | null
  tieneComprobante: boolean
  tieneDocumento: boolean
}

/** Sanitize text for jsPDF (helvetica/latin1 only - replace accents and special chars) */
function sanitize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritics
    .replace(/\u00d1/g, 'N')       // Ñ -> N
    .replace(/\u00f1/g, 'n')       // ñ -> n
    .replace(/[^\x20-\x7E]/g, '')  // Remove any remaining non-ASCII
}

export interface RendicionPdfInput {
  codigo: string
  periodo: string
  concepto: string
  descripcion?: string | null
  estado: string
  montoTotal: number
  montoAsignado: number
  fechaRendicion: string | null
  fechaAprobacion: string | null
  aprobadoPorNombre?: string | null
  responsableNombre?: string | null
  responsableCargo?: string | null
  observaciones?: string | null
  motivoRechazo?: string | null
  boletas: BoletaPdfRow[]
}

export function generateRendicionGastoPdfBuffer(input: RendicionPdfInput): Buffer {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let y = 10

  // ---------- Header azul ----------
  doc.setFillColor(15, 32, 64) // #0f2040
  doc.rect(10, y, pageWidth - 20, 14, 'F')
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('RENDICION DE GASTOS', pageWidth / 2, y + 9, { align: 'center' })
  y += 18

  // ---------- Info empresa ----------
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(EMPRESA.nombre, 10, y)
  y += 4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(80, 80, 80)
  doc.text(EMPRESA.direccion, 10, y)
  y += 4
  doc.text(`Tel: ${EMPRESA.telefono} | ${EMPRESA.email}`, 10, y)
  y += 8

  // ---------- Datos principales ----------
  const cols = [10, pageWidth / 2 + 2]
  const estadoColor: Record<string, [number, number, number]> = {
    'Borrador': [100, 100, 100],
    'En Revision': [245, 158, 11],
    'En Revisión': [245, 158, 11],
    'Aprobada': [22, 163, 74],
    'Rechazada': [220, 38, 38],
  }

  function addField(label: string, value: string, row: number, col: number) {
    const x = cols[col]
    const cy = y + row * 6
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(60, 60, 60)
    doc.text(label, x, cy)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    const maxWidth = pageWidth / 2 - 16
    const lines = doc.splitTextToSize(sanitize(String(value || '-')), maxWidth)
    doc.text(lines[0], x + 36, cy)
  }

  addField('Codigo:', input.codigo, 0, 0)
  addField('Periodo:', input.periodo, 0, 1)
  addField('Responsable:', `${sanitize(input.responsableNombre || '-')}${input.responsableCargo ? ` (${sanitize(input.responsableCargo)})` : ''}`, 1, 0)
  addField('Estado:', sanitize(input.estado), 1, 1)
  addField('Concepto:', sanitize(input.concepto), 2, 0)
  addField('Monto Total:', formatCLP(input.montoTotal), 2, 1)

  // Color del estado
  const ec = estadoColor[input.estado] || [0, 0, 0]
  doc.setTextColor(ec[0], ec[1], ec[2])
  doc.setFont('helvetica', 'bold')
  doc.text(sanitize(input.estado), cols[1] + 36, y + 6)

  y += 22

  // Linea separadora
  doc.setDrawColor(200, 200, 200)
  doc.line(10, y, pageWidth - 10, y)
  y += 4

  // ---------- Tabla de boletas ----------
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 32, 64)
  doc.text(`Detalle de Gastos (${input.boletas.length} item${input.boletas.length !== 1 ? 's' : ''})`, 10, y)
  y += 6

  if (input.boletas.length > 0) {
    const tableBody = input.boletas.map((b, i) => [
      i + 1,
      sanitize(b.descripcion || '-'),
      sanitize(b.proveedor || '-'),
      sanitize(b.nDocumento || '-'),
      sanitize(b.centroCosto || '-'),
      sanitize(b.categoria || '-'),
      formatCLP(b.monto),
      b.tieneComprobante ? 'Si' : 'No',
      b.tieneDocumento ? 'Si' : 'No',
    ])

    autoTable(doc, {
      startY: y,
      head: [['#', 'Descripcion', 'Proveedor', 'N Doc', 'Centro Costo', 'Categoria', 'Monto', 'Compr.', 'Doc.']],
      body: tableBody,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2, textColor: [30, 30, 30] },
      headStyles: {
        fillColor: [15, 32, 64],
        textColor: [255, 255, 255],
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        6: { halign: 'right', cellWidth: 22 },
        7: { halign: 'center', cellWidth: 12 },
        8: { halign: 'center', cellWidth: 12 },
      },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: 10, right: 10 },
    })

    y = (doc as any).lastAutoTable.finalY + 4
  } else {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(120, 120, 120)
    doc.text('No hay boletas registradas en esta rendicion.', 10, y + 4)
    y += 10
  }

  // ---------- Resumen de montos ----------
  const montoRestante = input.montoAsignado - input.montoTotal
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 32, 64)

  // Check if we need a new page
  if (y > pageHeight - 50) {
    doc.addPage()
    y = 20
  }

  doc.text('Resumen', 10, y)
  y += 6

  const resumenData = [
    ['Monto Asignado', formatCLP(input.montoAsignado)],
    ['Total Gastos', formatCLP(input.montoTotal)],
    ['Saldo', formatCLP(Math.max(0, montoRestante))],
  ]

  autoTable(doc, {
    startY: y,
    body: resumenData,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50, textColor: [60, 60, 60] },
      1: { halign: 'right', cellWidth: 40 },
    },
    margin: { left: 10, right: 10 },
  })

  y = (doc as any).lastAutoTable.finalY + 6

  // ---------- Observaciones ----------
  if (input.observaciones || input.motivoRechazo) {
    if (y > pageHeight - 40) {
      doc.addPage()
      y = 20
    }

    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 32, 64)
    doc.text('Observaciones', 10, y)
    y += 6

    if (input.observaciones) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(60, 60, 60)
      const obsLines = doc.splitTextToSize(sanitize(input.observaciones), pageWidth - 30)
      doc.text(obsLines, 14, y)
      y += obsLines.length * 4 + 2
    }

    if (input.motivoRechazo) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(220, 38, 38)
      doc.text('Motivo de Rechazo:', 14, y)
      y += 4
      doc.setFont('helvetica', 'normal')
      const rejLines = doc.splitTextToSize(sanitize(input.motivoRechazo), pageWidth - 30)
      doc.text(rejLines, 14, y)
      y += rejLines.length * 4 + 2
    }
  }

  // ---------- Footer ----------
  if (y > pageHeight - 30) {
    doc.addPage()
    y = pageHeight - 30
  }

  const now = new Date()
  const fechaStr = now.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const horaStr = now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })

  doc.setDrawColor(200, 200, 200)
  doc.line(10, y, pageWidth - 10, y)
  y += 5
  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  doc.text(`Documento generado el ${fechaStr} a las ${horaStr} | ${EMPRESA.nombre}`, 10, y)
  y += 3
  doc.text('Sistema de Gestion de Condominios Laguna Norte', 10, y)

  // ---------- Aprobado por ----------
  if (input.aprobadoPorNombre && (input.estado === 'Aprobada' || input.estado === 'Rechazada')) {
    y += 12
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(60, 60, 60)
    const accionText = input.estado === 'Aprobada' ? 'APROBADO POR' : 'RECHAZADO POR'
    doc.text(accionText, 10, y)
    y += 4
    doc.setFont('helvetica', 'normal')
    doc.text(sanitize(input.aprobadoPorNombre), 10, y)
    if (input.fechaAprobacion) {
      y += 4
      doc.setFontSize(7)
      doc.setTextColor(120, 120, 120)
      doc.text(`Fecha: ${formatDate(input.fechaAprobacion)}`, 10, y)
    }
  }

  return Buffer.from(doc.output('arraybuffer'))
}
