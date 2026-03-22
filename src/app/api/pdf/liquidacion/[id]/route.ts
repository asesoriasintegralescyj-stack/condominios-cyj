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
  email: 'contacto@cyjcondominios.cl',
  web: 'www.cyjcondominios.cl'
}

// Tasas de descuento
const TASAS = {
  afp: 0.1145,
  salud: 0.07,
  cesantia: 0.006,
  gratificacionLegal: 0.25
}

function formatCLP(n: number) {
  return '$' + new Intl.NumberFormat('es-CL').format(Math.round(n || 0))
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '–'
  try {
    const [y, m, d] = dateStr.split('-')
    return `${d}/${m}/${y}`
  } catch {
    return dateStr
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const personal = await db.personal.findUnique({
      where: { id }
    })

    if (!personal) {
      return NextResponse.json({ error: 'Personal no encontrado' }, { status: 404 })
    }

    const now = new Date()
    const periodo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const nombrePeriodo = now.toLocaleDateString('es-CL', { month: 'short', year: 'numeric' }).toUpperCase()
    const numLiquidacion = `L-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}-${now.getFullYear().toString().slice(-2)}`

    // Cálculos
    const sueldoBase = personal.sueldoBase || 0
    const movilizacion = personal.movilizacion || 0
    const colacion = personal.colacion || 0
    const viatico = personal.viatico || 0
    const asigFamiliar = personal.asigFamiliar || 0
    const gratificacion = Math.min(sueldoBase * TASAS.gratificacionLegal, 150000)
    const totalImponible = sueldoBase + gratificacion
    const totalNoImponible = movilizacion + colacion + viatico + asigFamiliar
    const totalHaberes = totalImponible + totalNoImponible
    const descuentoAFP = totalImponible * TASAS.afp
    const descuentoSalud = totalImponible * TASAS.salud
    const seguroCesantia = totalImponible * TASAS.cesantia
    let impuestoUnico = 0
    const sueldoTributable = totalImponible - descuentoAFP - descuentoSalud
    if (sueldoTributable > 1500000) {
      impuestoUnico = (sueldoTributable - 1500000) * 0.04
    }
    const totalDescuentos = descuentoAFP + descuentoSalud + seguroCesantia + impuestoUnico
    const sueldoLiquido = totalHaberes - totalDescuentos

    // Crear PDF
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
    const pageWidth = doc.internal.pageSize.getWidth()
    let y = 10

    // Header con fondo amarillo
    doc.setFillColor(255, 193, 7)
    doc.rect(10, y, pageWidth - 20, 22, 'F')
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('REMUNERACIÓN', pageWidth / 2, y + 8, { align: 'center' })
    doc.setFontSize(12)
    doc.text('LIQUIDACIÓN DE SUELDO', pageWidth / 2, y + 16, { align: 'center' })

    y += 26

    // Info empresa
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(EMPRESA.nombre, 10, y)
    doc.text(`N° ${numLiquidacion}`, pageWidth - 10, y, { align: 'right' })
    y += 4
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(EMPRESA.razonSocial, 10, y)
    doc.text(`PERIODO: ${nombrePeriodo}`, pageWidth - 10, y, { align: 'right' })
    y += 4
    doc.text(`RUT: ${EMPRESA.rut}`, 10, y)
    y += 4
    doc.text(EMPRESA.direccion, 10, y)
    y += 4
    doc.text(`Tel: ${EMPRESA.telefono} | Email: ${EMPRESA.email}`, 10, y)
    y += 6

    // Sección trabajador
    doc.setFillColor(15, 32, 64)
    doc.rect(10, y, pageWidth - 20, 6, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('INFORMACIÓN DEL TRABAJADOR', 12, y + 4)
    y += 8

    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)

    autoTable(doc, {
      startY: y,
      head: [],
      body: [
        ['Nombre:', personal.nombre, 'RUT:', personal.rut || '–'],
        ['Cargo:', personal.cargo || '–', 'Contrato:', personal.contrato],
        ['Trabaja desde:', formatDate(personal.fechaIngreso), 'Email:', personal.email || '–'],
        ['AFP:', personal.afp, 'Salud:', personal.salud],
        ['Mutual:', personal.mutual, 'CCAF:', personal.ccaf || '–']
      ],
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 1 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 30 },
        1: { cellWidth: 55 },
        2: { fontStyle: 'bold', cellWidth: 30 },
        3: { cellWidth: 55 }
      },
      margin: { left: 10, right: 10 }
    })
    y = (doc as any).lastAutoTable.finalY + 3

    // Detalles
    doc.setFillColor(15, 32, 64)
    doc.rect(10, y, pageWidth - 20, 6, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.text('DETALLES', 12, y + 4)
    y += 8
    doc.setTextColor(0, 0, 0)

    autoTable(doc, {
      startY: y,
      head: [],
      body: [
        ['Días Base:', '30', 'Ausencias:', '0', 'Días Trabajados:', '30'],
        ['UTM:', formatCLP(65000), 'UF:', formatCLP(38000), 'Cargas:', '0']
      ],
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 1 },
      margin: { left: 10, right: 10 }
    })
    y = (doc as any).lastAutoTable.finalY + 3

    // Haberes
    doc.setFillColor(15, 32, 64)
    doc.rect(10, y, pageWidth - 20, 6, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.text('HABERES', 12, y + 4)
    y += 8
    doc.setTextColor(0, 0, 0)

    autoTable(doc, {
      startY: y,
      head: [['Descripción', 'Monto']],
      body: [
        ['Sueldo Base', formatCLP(sueldoBase)],
        ['Gratificación Legal', formatCLP(gratificacion)],
        ['Movilización', formatCLP(movilizacion)],
        ['Colación', formatCLP(colacion)],
        ['Viático', formatCLP(viatico)],
        ['Asignación Familiar', formatCLP(asigFamiliar)]
      ],
      foot: [['TOTAL HABERES', formatCLP(totalHaberes)]],
      theme: 'striped',
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      footStyles: { fillColor: [255, 193, 7], textColor: [0, 0, 0], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 50, halign: 'right' } },
      margin: { left: 10, right: 10 }
    })
    y = (doc as any).lastAutoTable.finalY + 3

    // Descuentos
    doc.setFillColor(15, 32, 64)
    doc.rect(10, y, pageWidth - 20, 6, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.text('DESCUENTOS LEGALES', 12, y + 4)
    y += 8
    doc.setTextColor(0, 0, 0)

    autoTable(doc, {
      startY: y,
      head: [['Descripción', 'Monto']],
      body: [
        [`AFP (${(TASAS.afp * 100).toFixed(2)}%)`, formatCLP(descuentoAFP)],
        [`Salud (${(TASAS.salud * 100).toFixed(2)}%)`, formatCLP(descuentoSalud)],
        ['Seguro de Cesantía', formatCLP(seguroCesantia)],
        ['Impuesto Único', formatCLP(impuestoUnico)]
      ],
      foot: [['TOTAL DESCUENTOS', formatCLP(totalDescuentos)]],
      theme: 'striped',
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      footStyles: { fillColor: [220, 53, 69], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 50, halign: 'right' } },
      margin: { left: 10, right: 10 }
    })
    y = (doc as any).lastAutoTable.finalY + 3

    // Resumen final
    doc.setFillColor(255, 193, 7)
    doc.rect(10, y, pageWidth - 20, 12, 'F')
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('SUELDO LÍQUIDO A PAGAR:', 15, y + 8)
    doc.text(formatCLP(sueldoLiquido), pageWidth - 15, y + 8, { align: 'right' })
    y += 18

    // Firmas
    doc.line(30, y + 12, 90, y + 12)
    doc.line(pageWidth - 90, y + 12, pageWidth - 30, y + 12)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text('Firma Empleador', 60, y + 16, { align: 'center' })
    doc.text('RECIBÍ CONFORME', pageWidth - 60, y + 16, { align: 'center' })
    y += 22

    doc.setFontSize(7)
    doc.setTextColor(100, 100, 100)
    doc.text('Declaro haber recibido el monto indicado en esta liquidación, el cual corresponde a mi remuneración', pageWidth / 2, y, { align: 'center' })
    doc.text('íntegra por el período señalado, sin perjuicio de los descuentos legales correspondientes.', pageWidth / 2, y + 4, { align: 'center' })

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="liquidacion-${personal.nombre.replace(/\s+/g, '-')}-${periodo}.pdf"`
      }
    })
  } catch (error) {
    console.error('Error generando PDF:', error)
    return NextResponse.json({ error: 'Error generando PDF' }, { status: 500 })
  }
}
