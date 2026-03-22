import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ============================================
// CONFIGURACIÓN DE LA EMPRESA
// ============================================
const EMPRESA = {
  nombre: 'Asesorías Integrales CyJ',
  razonSocial: 'Asesorías Integrales CyJ SpA',
  rut: '76.123.456-7',
  direccion: 'Av. La Montaña Norte 3650, Lampa',
  telefono: '+56 964 650 643',
  email: 'contacto@cyjcondominios.cl'
}

// ============================================
// HELPER FUNCTIONS
// ============================================
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

function formatPeriodo(periodo: string) {
  try {
    const [year, month] = periodo.split('-')
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    return `${meses[parseInt(month) - 1]} ${year}`
  } catch {
    return periodo
  }
}

// ============================================
// GET - Generar PDF de Estado de Cuenta
// ============================================
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const estadoCuenta = await db.estadoCuenta.findUnique({
      where: { id },
      include: {
        residente: true,
        detalles: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!estadoCuenta) {
      return NextResponse.json({ error: 'Estado de cuenta no encontrado' }, { status: 404 })
    }

    // Crear PDF
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
    const pageWidth = doc.internal.pageSize.getWidth()
    let y = 10

    // Header con color
    doc.setFillColor(15, 32, 64)
    doc.rect(0, 0, pageWidth, 30, 'F')

    // Logo/Nombre de empresa
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(EMPRESA.nombre, 10, 12)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(EMPRESA.direccion, 10, 18)
    doc.text(`Tel: ${EMPRESA.telefono} | Email: ${EMPRESA.email}`, 10, 23)

    // Título del documento
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('ESTADO DE CUENTA', pageWidth - 10, 12, { align: 'right' })

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Período: ${formatPeriodo(estadoCuenta.periodo)}`, pageWidth - 10, 18, { align: 'right' })
    doc.text(`Fecha: ${formatDate(estadoCuenta.fechaGeneracion)}`, pageWidth - 10, 23, { align: 'right' })

    y = 40

    // Datos del residente
    doc.setFillColor(240, 240, 240)
    doc.rect(10, y, pageWidth - 20, 20, 'F')

    doc.setTextColor(0, 0, 0)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('DATOS DEL RESIDENTE', 12, y + 6)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(`Nombre: ${estadoCuenta.residente?.nombre || '-'} ${estadoCuenta.residente?.apellido || ''}`, 12, y + 12)
    doc.text(`Unidad: ${estadoCuenta.residente?.unidad || '-'}`, 120, y + 12)

    if (estadoCuenta.residente?.email) {
      doc.text(`Email: ${estadoCuenta.residente.email}`, 12, y + 17)
    }

    y += 25

    // Resumen financiero
    doc.setFillColor(255, 193, 7)
    doc.rect(10, y, pageWidth - 20, 8, 'F')
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(0, 0, 0)
    doc.text('RESUMEN FINANCIERO', 12, y + 5.5)
    y += 12

    // Tabla de resumen
    autoTable(doc, {
      startY: y,
      head: [],
      body: [
        ['Saldo Anterior', formatCLP(estadoCuenta.saldoAnterior)],
        ['Cargos del Mes', formatCLP(estadoCuenta.cargosMes)],
        ['Pagos del Mes', formatCLP(estadoCuenta.pagosMes)],
        ['Intereses por Mora', formatCLP(estadoCuenta.interesesMora)],
      ],
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 40, halign: 'right' }
      },
      margin: { left: 10, right: 10 }
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 3

    // Total a pagar
    doc.setFillColor(220, 53, 69)
    doc.rect(10, y, pageWidth - 20, 10, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL A PAGAR:', 15, y + 7)
    doc.text(formatCLP(estadoCuenta.totalPagar), pageWidth - 15, y + 7, { align: 'right' })

    y += 15

    // Detalle de movimientos
    if (estadoCuenta.detalles && estadoCuenta.detalles.length > 0) {
      doc.setFillColor(15, 32, 64)
      doc.rect(10, y, pageWidth - 20, 8, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('DETALLE DE MOVIMIENTOS', 12, y + 5.5)
      y += 12

      autoTable(doc, {
        startY: y,
        head: [['Fecha', 'Tipo', 'Concepto', 'Monto']],
        body: estadoCuenta.detalles.map(d => [
          formatDate(d.fecha),
          d.tipo,
          d.concepto,
          formatCLP(d.monto)
        ]),
        theme: 'striped',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 9, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 30 },
          2: { cellWidth: 70 },
          3: { cellWidth: 35, halign: 'right' }
        },
        margin: { left: 10, right: 10 }
      })
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5
    }

    // Fecha de vencimiento
    if (estadoCuenta.fechaVencimiento) {
      y += 5
      doc.setTextColor(220, 53, 69)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text(`Fecha de Vencimiento: ${formatDate(estadoCuenta.fechaVencimiento)}`, 10, y)
      y += 5
    }

    // Instrucciones de pago
    y += 10
    doc.setFillColor(240, 248, 255)
    doc.rect(10, y, pageWidth - 20, 25, 'F')
    doc.setDrawColor(100, 149, 237)
    doc.rect(10, y, pageWidth - 20, 25, 'S')

    doc.setTextColor(0, 0, 100)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('INSTRUCCIONES DE PAGO', 12, y + 6)

    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text('• Realice su pago antes de la fecha de vencimiento para evitar intereses.', 12, y + 12)
    doc.text('• Transferencia electrónica: Banco Estado - Cuenta Corriente 12345678', 12, y + 17)
    doc.text('• Email para confirmación de pago: pagos@cyjcondominios.cl', 12, y + 22)

    // Footer
    y = doc.internal.pageSize.getHeight() - 20
    doc.setDrawColor(200, 200, 200)
    doc.line(10, y, pageWidth - 10, y)

    doc.setTextColor(100, 100, 100)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(EMPRESA.nombre, 10, y + 6)
    doc.text(`Generado el ${new Date().toLocaleDateString('es-CL')} a las ${new Date().toLocaleTimeString('es-CL')}`, pageWidth - 10, y + 6, { align: 'right' })

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="estado-cuenta-${estadoCuenta.residente?.unidad || 'residente'}-${estadoCuenta.periodo}.pdf"`
      }
    })
  } catch (error) {
    console.error('Error generando PDF:', error)
    return NextResponse.json({ error: 'Error generando PDF' }, { status: 500 })
  }
}
