import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Configuración de la empresa
const EMPRESA = {
  nombre: 'Asesorías Integrales CyJ',
  razonSocial: 'Asesorías Integrales CyJ SpA',
  rut: '76.123.456-7',
  direccion: 'Av. La Montaña Norte 3650, Lampa',
  telefono: '+56 964 650 643',
  email: 'contacto@cyjcondominios.cl'
}

function formatCLP(n: number) {
  return '$' + new Intl.NumberFormat('es-CL').format(Math.round(n || 0))
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '–'
  try {
    const [y, m, d] = dateStr.split('-')
    return `${d}/${m}/${y}`
  } catch {
    return dateStr
  }
}

function formatMinutes(mins: number) {
  if (!mins) return '0 min'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h > 0 && m > 0) return `${h}h ${m}min`
  if (h > 0) return `${h}h`
  return `${m}min`
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const ot = await db.ordenTrabajo.findUnique({
      where: { id },
      include: {
        propiedad: true,
        asignado: true,
        materiales: true,
        herramientas: true,
        tareas: true,
        personalOT: true
      }
    })

    if (!ot) {
      return NextResponse.json({ error: 'Orden de trabajo no encontrada' }, { status: 404 })
    }

    const now = new Date()
    const fechaEmision = now.toLocaleDateString('es-CL')

    // Crear PDF
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
    const pageWidth = doc.internal.pageSize.getWidth()
    let y = 10

    // Header amarillo
    doc.setFillColor(255, 193, 7)
    doc.rect(10, y, pageWidth - 20, 12, 'F')
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('ORDEN DE TRABAJO', pageWidth / 2, y + 8, { align: 'center' })
    y += 16

    // Info empresa
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

    // Info documento (derecha)
    const col2X = pageWidth - 80
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('Fecha emisión:', col2X, y - 18)
    doc.text('N° OT:', col2X, y - 13)
    doc.text('Asignado a:', col2X, y - 8)
    
    doc.setFont('helvetica', 'normal')
    doc.text(fechaEmision, pageWidth - 10, y - 18, { align: 'right' })
    doc.text(ot.otNum, pageWidth - 10, y - 13, { align: 'right' })
    doc.text(ot.asignado?.nombre || 'N/A', pageWidth - 10, y - 8, { align: 'right' })

    // Datos del trabajo
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
      head: [],
      body: [
        ['Propósito:', ot.titulo],
        ['Ubicación:', ot.ubicacion || ot.propiedad?.nombre || '–'],
        ['Tipo:', ot.tipo, 'Prioridad:', ot.prioridad, 'Estado:', ot.estado],
        ['Vencimiento:', formatDate(ot.fechaLimite), 'Costo Est.:', formatCLP(ot.costoEstimado), 'Progreso:', `${ot.progreso}%`]
      ],
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 1 },
      margin: { left: 10, right: 10 }
    })
    y = (doc as any).lastAutoTable.finalY + 3

    // Fechas reales
    if (ot.fechaInicioReal || ot.fechaFinReal) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('Fechas Reales:', 10, y)
      doc.setFont('helvetica', 'normal')
      doc.text(`Inicio: ${formatDate(ot.fechaInicioReal)} - Fin: ${formatDate(ot.fechaFinReal)}`, 35, y)
      y += 5
    }

    // TIEMPO - Sección destacada
    doc.setFillColor(240, 248, 255)
    doc.rect(10, y, pageWidth - 20, 16, 'F')
    doc.setDrawColor(100, 149, 237)
    doc.rect(10, y, pageWidth - 20, 16, 'S')
    
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 100)
    doc.text('⏱ CONTROL DE TIEMPO', 12, y + 4)
    
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    
    // Tiempo estimado
    doc.setFont('helvetica', 'normal')
    doc.text('Estimado:', 12, y + 11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 100, 200)
    doc.text(formatMinutes(ot.tiempoEst), 35, y + 11)
    
    // Tiempo real
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text('Real:', 70, y + 11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 150, 100)
    doc.text(formatMinutes(ot.tiempoReal), 85, y + 11)
    
    // Diferencia
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)
    doc.text('Diferencia:', 130, y + 11)
    doc.setFont('helvetica', 'bold')
    const diff = ot.tiempoReal - ot.tiempoEst
    doc.setTextColor(diff > 0 ? 200 : 0, diff > 0 ? 0 : 150, 0)
    doc.text((diff > 0 ? '+' : '') + formatMinutes(diff), 155, y + 11)
    
    y += 20

    // Descripción
    if (ot.descripcion) {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 0, 0)
      doc.text('Descripción:', 10, y)
      doc.setFont('helvetica', 'normal')
      const descLines = doc.splitTextToSize(ot.descripcion, pageWidth - 30)
      doc.text(descLines, 10, y + 4)
      y += 4 + descLines.length * 3 + 3
    }

    // Detalle de recursos y tareas
    doc.setFillColor(15, 32, 64)
    doc.rect(10, y, pageWidth - 20, 6, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.text('DETALLE DE RECURSOS Y TAREAS', 12, y + 4)
    y += 8
    doc.setTextColor(0, 0, 0)

    // Herramientas
    doc.setFillColor(255, 193, 7)
    doc.rect(10, y, pageWidth - 20, 5, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('HERRAMIENTAS', 12, y + 3.5)
    y += 6

    if (ot.herramientas.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Descripción', 'Cant.', 'CUMPLE', 'NO CUMPLE']],
        body: ot.herramientas.map(h => [h.nombre, String(h.cantidad), '', '']),
        theme: 'plain',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7 },
        styles: { fontSize: 8, cellPadding: 1 },
        columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 20, halign: 'center' }, 2: { cellWidth: 25, halign: 'center' }, 3: { cellWidth: 25, halign: 'center' } },
        margin: { left: 10, right: 10 }
      })
      y = (doc as any).lastAutoTable.finalY + 2
    } else {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('Sin herramientas registradas', 12, y + 3)
      y += 6
    }

    // Materiales
    doc.setFillColor(255, 193, 7)
    doc.rect(10, y, pageWidth - 20, 5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.text('MATERIALES', 12, y + 3.5)
    y += 6

    if (ot.materiales.length > 0) {
      const totalMateriales = ot.materiales.reduce((sum, m) => sum + (m.total || m.cantidad * m.precioUnit), 0)
      
      autoTable(doc, {
        startY: y,
        head: [['Descripción', 'Cant.', 'Unidad', 'P. Unit.', 'Total']],
        body: ot.materiales.map(m => [
          m.descripcion,
          String(m.cantidad),
          m.unidad || 'unidad',
          formatCLP(m.precioUnit),
          formatCLP(m.total || m.cantidad * m.precioUnit)
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
          4: { cellWidth: 30, halign: 'right' } 
        },
        margin: { left: 10, right: 10 }
      })
      y = (doc as any).lastAutoTable.finalY + 2
    } else {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('Sin materiales registrados', 12, y + 3)
      y += 6
    }

    // Personal
    doc.setFillColor(255, 193, 7)
    doc.rect(10, y, pageWidth - 20, 5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.text('PERSONAL', 12, y + 3.5)
    y += 6

    if (ot.personalOT.length > 0) {
      const totalPersonal = ot.personalOT.reduce((sum, p) => sum + (p.total || p.precioUnit * p.horasTrabajadas * p.cantidad), 0)
      
      autoTable(doc, {
        startY: y,
        head: [['Nombre', 'Tipo', 'Cant.', '$ Hora', 'Horas', 'Total']],
        body: ot.personalOT.map(p => [
          p.nombre,
          p.tipo,
          String(p.cantidad),
          formatCLP(p.precioUnit),
          String(p.horasTrabajadas || 0),
          formatCLP(p.total || p.precioUnit * p.horasTrabajadas * p.cantidad)
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
          5: { cellWidth: 32, halign: 'right' }
        },
        margin: { left: 10, right: 10 }
      })
      y = (doc as any).lastAutoTable.finalY + 2
    } else {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('Sin personal registrado', 12, y + 3)
      y += 6
    }

    // Lista de tareas
    doc.setFillColor(255, 193, 7)
    doc.rect(10, y, pageWidth - 20, 5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.text('LISTA DE TAREAS', 12, y + 3.5)
    y += 6

    if (ot.tareas.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Descripción', 'Cant.', 'Estado', 'CUMPLE', 'NO CUMPLE']],
        body: ot.tareas.map(t => [t.descripcion, String(t.cantidad), t.estado, '', '']),
        theme: 'plain',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 7 },
        styles: { fontSize: 8, cellPadding: 1 },
        columnStyles: { 
          0: { cellWidth: 80 }, 
          1: { cellWidth: 18, halign: 'center' },
          2: { cellWidth: 27, halign: 'center' }, 
          3: { cellWidth: 22, halign: 'center' }, 
          4: { cellWidth: 22, halign: 'center' } 
        },
        margin: { left: 10, right: 10 }
      })
      y = (doc as any).lastAutoTable.finalY + 2
    } else {
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('Sin tareas registradas', 12, y + 3)
      y += 6
    }

    // Totales
    const totalMateriales = ot.materiales.reduce((sum, m) => sum + (m.total || m.cantidad * m.precioUnit), 0)
    const totalPersonal = ot.personalOT.reduce((sum, p) => sum + (p.total || p.precioUnit * p.horasTrabajadas * p.cantidad), 0)
    const granTotal = totalMateriales + totalPersonal

    // Resumen de costos
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
    doc.text(formatCLP(granTotal || ot.costoReal || ot.costoEstimado), 185, y + 5, { align: 'right' })
    
    y += 16

    // Firmas
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    
    doc.line(30, y + 10, 90, y + 10)
    doc.line(pageWidth - 90, y + 10, pageWidth - 30, y + 10)
    
    doc.text('Firma Responsable:', 60, y + 15, { align: 'center' })
    doc.text('RECIBÍ CONFORME:', pageWidth - 60, y + 15, { align: 'center' })

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="OT-${ot.otNum}.pdf"`
      }
    })
  } catch (error) {
    console.error('Error generando PDF:', error)
    return NextResponse.json({ error: 'Error generando PDF' }, { status: 500 })
  }
}
