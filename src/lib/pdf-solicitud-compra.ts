/**
 * PDF generator for Solicitud de Compra.
 *
 * Generates a professional PDF using jspdf + jspdf-autotable that includes:
 *  - Header (SOLICITUD DE COMPRA + código + fecha)
 *  - Info section (titulo, descripcion, prioridad, estado, solicitadoPor,
 *    fechaEspera, proveedorSugerido, observaciones)
 *  - Origen info (Proyecto / OT + codigo) if available
 *  - Materiales table (# | Nombre | Cantidad | Unidad | P. Estimado | Total)
 *  - Total estimado at the bottom
 *  - If the solicitud was generated from a Proyecto/OT with fotosAntes /
 *    fotosDespues, those base64 images are embedded at the end of the PDF
 *  - Footer: "Condominio LAGUNA NORTE · Asesorías Integrales CyJ"
 *
 * Works in the Node.js runtime (server-side) since jspdf v4 supports it.
 */

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// Re-export the same interface so callers can import everything from one place
export interface MaterialSolicitud {
  nombre: string
  cantidad: number
  unidad: string
  precioEstimado: number
  total: number
}

export interface PdfSolicitudCompraInput {
  codigo: string
  titulo: string
  descripcion?: string | null
  prioridad: string
  estado: string
  materiales: MaterialSolicitud[]
  totalEstimado: number
  solicitadoPor?: string | null
  fechaSolicitud?: string | null
  fechaEspera?: string | null
  proveedorSugerido?: string | null
  observaciones?: string | null
  origenTipo?: string | null
  origenCodigo?: string | null
  // Optional photos (base64 data URLs) coming from the origin proyecto/OT
  fotosAntes?: string[]
  fotosDespues?: string[]
  // Optional list of cotizaciones/links from the origin project
  cotizacionesLinks?: string[]
  // Optional: dynamic purchase links added to the SC
  links?: string[]
  // Optional: linkCompra URLs extracted from the origin project's materiales
  materialesLinks?: string[]
}

const EMPRESA = {
  condominio: 'Condominio LAGUNA NORTE',
  razonSocial: 'Asesorías Integrales CyJ',
  email: 'asesoriasintegralescyj@gmail.com',
}

function formatCLP(n: number): string {
  const rounded = Math.round(n || 0)
  return `$${rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '–'
  try {
    // Try ISO date first (YYYY-MM-DD)
    const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (isoMatch) {
      return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`
    }
    // Otherwise assume it's already a localized string or a Date-parseable value
    const d = new Date(dateStr)
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('es-CL')
    }
    return dateStr
  } catch {
    return dateStr
  }
}

/**
 * Extracts the MIME type and raw base64 data from a data URL.
 * Returns null if the input is not a valid data URL.
 */
function parseDataUrl(
  dataUrl: string
): { mime: string; base64: string } | null {
  try {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
    if (!match) return null
    return { mime: match[1], base64: match[2] }
  } catch {
    return null
  }
}

/**
 * Maps a MIME type to the image format expected by jsPDF.addImage.
 * Defaults to PNG for unknown image/* types.
 */
function mimeToImageFormat(mime: string): 'PNG' | 'JPEG' | 'JPG' {
  if (mime === 'image/jpeg') return 'JPEG'
  if (mime === 'image/jpg') return 'JPG'
  return 'PNG'
}

/**
 * Generates a PDF for a Solicitud de Compra and returns it as a Node Buffer
 * suitable for use as a nodemailer attachment.
 */
export function generateSolicitudCompraPdfBuffer(
  input: PdfSolicitudCompraInput
): Buffer {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 12
  let y = 14

  // ============================================
  // Header
  // ============================================
  doc.setFillColor(15, 32, 64) // #0f2040
  doc.rect(margin, y, pageWidth - margin * 2, 18, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(15)
  doc.setFont('helvetica', 'bold')
  doc.text('SOLICITUD DE COMPRA', margin + 4, y + 8)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(input.codigo, margin + 4, y + 14)
  doc.setFontSize(9)
  doc.text(
    `Fecha: ${formatDate(input.fechaSolicitud)}`,
    pageWidth - margin - 4,
    y + 8,
    { align: 'right' }
  )
  doc.text(EMPRESA.condominio, pageWidth - margin - 4, y + 14, {
    align: 'right',
  })
  y += 22

  // ============================================
  // Info section
  // ============================================
  const infoRows: [string, string][] = [
    ['Título', input.titulo || '–'],
    ['Estado', input.estado || '–'],
    ['Prioridad', input.prioridad || '–'],
  ]
  if (input.solicitadoPor) {
    infoRows.push(['Solicitado por', input.solicitadoPor])
  }
  if (input.origenTipo && input.origenCodigo) {
    infoRows.push(['Origen', `${input.origenTipo} - ${input.origenCodigo}`])
  } else if (input.origenTipo) {
    infoRows.push(['Origen', input.origenTipo])
  }
  if (input.fechaEspera) {
    infoRows.push(['Fecha esperada', formatDate(input.fechaEspera)])
  }
  if (input.proveedorSugerido) {
    infoRows.push(['Proveedor sugerido', input.proveedorSugerido])
  }

  autoTable(doc, {
    startY: y,
    body: infoRows,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
    columnStyles: {
      0: {
        cellWidth: 45,
        fontStyle: 'bold',
        fillColor: [241, 245, 249], // slate-100
        textColor: [15, 32, 64],
      },
      1: { cellWidth: 'auto' },
    },
    margin: { left: margin, right: margin },
  })
  y = (doc as any).lastAutoTable.finalY + 4

  // Descripción
  if (input.descripcion) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 32, 64)
    doc.text('Descripción:', margin, y + 3)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(20, 20, 20)
    const descLines = doc.splitTextToSize(input.descripcion, pageWidth - margin * 2)
    doc.text(descLines, margin, y + 8)
    y += 8 + descLines.length * 4 + 2
  }

  // ============================================
  // Materiales table
  // ============================================
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 32, 64)
  doc.text('Materiales solicitados', margin, y + 4)
  y += 6

  const matBody = (input.materiales || []).map((m, i) => [
    String(i + 1),
    m.nombre || '',
    String(m.cantidad ?? 0),
    m.unidad || 'unidad',
    formatCLP(m.precioEstimado),
    formatCLP(m.total),
  ])

  autoTable(doc, {
    startY: y,
    head: [['#', 'Nombre', 'Cantidad', 'Unidad', 'P. Estimado', 'Total']],
    body: matBody.length > 0 ? matBody : [['', '(Sin materiales)', '', '', '', '']],
    theme: 'striped',
    styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
    headStyles: { fillColor: [15, 32, 64], textColor: 255, fontSize: 9 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 30, halign: 'right' },
      5: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  })
  y = (doc as any).lastAutoTable.finalY + 2

  // Total estimado
  doc.setFillColor(254, 243, 199) // amber-100
  doc.rect(margin, y, pageWidth - margin * 2, 8, 'F')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(180, 83, 9)
  doc.text('TOTAL ESTIMADO:', margin + 3, y + 5.5)
  doc.text(formatCLP(input.totalEstimado), pageWidth - margin - 3, y + 5.5, {
    align: 'right',
  })
  y += 12

  // Observaciones
  if (input.observaciones) {
    if (y > pageHeight - 40) {
      doc.addPage()
      y = 14
    }
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(180, 83, 9)
    doc.text('Observaciones:', margin, y + 3)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(20, 20, 20)
    const obsLines = doc.splitTextToSize(
      input.observaciones,
      pageWidth - margin * 2
    )
    doc.text(obsLines, margin, y + 8)
    y += 8 + obsLines.length * 4 + 2
  }

  // ============================================
  // Links de Compra (links dinámicos + materialesLinks)
  // ============================================
  const renderLinksSection = (
    title: string,
    sectionLinks: string[] | undefined
  ) => {
    if (!sectionLinks || sectionLinks.length === 0) return
    if (y > pageHeight - 30) {
      doc.addPage()
      y = 14
    }
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 32, 64)
    doc.text(title, margin, y + 4)
    y += 8
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(20, 20, 20)
    let linkY = y
    for (const link of sectionLinks) {
      if (linkY > pageHeight - 16) {
        doc.addPage()
        linkY = 14
      }
      const label = '🔗 Click aquí para comprar'
      const urlLines = doc.splitTextToSize(link, pageWidth - margin * 2 - 50)
      const blockH = Math.max(6, urlLines.length * 4 + 2)
      doc.setTextColor(13, 110, 253) // #0d6efd
      doc.textWithLink(label, margin, linkY, { url: link })
      doc.setTextColor(120, 120, 120)
      doc.setFontSize(8)
      doc.text(urlLines, margin, linkY + 4)
      doc.setFontSize(9)
      linkY += blockH + 2
    }
    y = linkY + 2
  }

  renderLinksSection('Links de Compra', input.links)
  renderLinksSection('Links de los Materiales', input.materialesLinks)

  // ============================================
  // Cotizaciones links (from origin proyecto)
  // ============================================
  if (input.cotizacionesLinks && input.cotizacionesLinks.length > 0) {
    if (y > pageHeight - 30) {
      doc.addPage()
      y = 14
    }
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 32, 64)
    doc.text('Cotizaciones adjuntas (links):', margin, y + 3)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(20, 20, 20)
    let linkY = y + 8
    for (const link of input.cotizacionesLinks) {
      const lines = doc.splitTextToSize(`• ${link}`, pageWidth - margin * 2)
      doc.text(lines, margin, linkY)
      linkY += lines.length * 4
    }
    y = linkY + 2
  }

  // ============================================
  // Fotos (desde proyecto/OT origen)
  // ============================================
  const renderPhotoSection = (
    title: string,
    photos: string[] | undefined
  ) => {
    if (!photos || photos.length === 0) return
    if (y > pageHeight - 40) {
      doc.addPage()
      y = 14
    }
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 32, 64)
    doc.text(title, margin, y + 4)
    y += 8

    const imgW = (pageWidth - margin * 2 - 6) / 3 // 3 per row, 3mm gap
    const imgH = imgW * 0.75 // 4:3 aspect
    let rowStartY = y

    photos.forEach((photo, idx) => {
      const col = idx % 3
      const row = Math.floor(idx / 3)
      const x = margin + col * (imgW + 3)
      const py = rowStartY + row * (imgH + 3)

      // Add page break if needed
      if (py + imgH > pageHeight - 14) {
        doc.addPage()
        rowStartY = 14
        // Reset row counter — start fresh on new page
        // (we re-iterate below in the new page; for simplicity we just
        // place remaining photos sequentially from the top)
        const newX = margin
        const newY = rowStartY
        try {
          const parsed = parseDataUrl(photo)
          if (parsed) {
            doc.addImage(
              parsed.base64,
              mimeToImageFormat(parsed.mime),
              newX,
              newY,
              imgW,
              imgH
            )
          }
        } catch (err) {
          console.warn('[PDF Solicitud] addImage failed:', err)
        }
        rowStartY = newY + imgH + 3
        return
      }

      try {
        const parsed = parseDataUrl(photo)
        if (parsed) {
          doc.addImage(
            parsed.base64,
            mimeToImageFormat(parsed.mime),
            x,
            py,
            imgW,
            imgH
          )
        }
      } catch (err) {
        console.warn('[PDF Solicitud] addImage failed:', err)
      }
    })

    // Advance y past the last row
    const totalRows = Math.ceil(photos.length / 3)
    y = rowStartY + totalRows * (imgH + 3) + 4
  }

  renderPhotoSection('Fotos Antes', input.fotosAntes)
  renderPhotoSection('Fotos Después', input.fotosDespues)

  // ============================================
  // Footer (on every page)
  // ============================================
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(120, 120, 120)
    doc.setFont('helvetica', 'normal')
    const footerText = `${EMPRESA.condominio} · ${EMPRESA.razonSocial}  |  ${EMPRESA.email}`
    doc.text(footerText, pageWidth / 2, pageHeight - 6, { align: 'center' })
    doc.text(`Pág. ${i}/${pageCount}`, pageWidth - margin, pageHeight - 6, {
      align: 'right',
    })
  }

  // Output as Buffer (Node environment)
  const arrayBuffer = doc.output('arraybuffer')
  return Buffer.from(arrayBuffer)
}
