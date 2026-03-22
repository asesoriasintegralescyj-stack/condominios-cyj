import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import jsPDF from 'jspdf'

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
function formatDate(dateStr: string | null) {
  if (!dateStr) return '–'
  try {
    const [y, m, d] = dateStr.split('-')
    return `${d}/${m}/${y}`
  } catch {
    return dateStr
  }
}

// ============================================
// GET - Generar PDF de Carta de Cobranza
// ============================================
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const carta = await db.cartaCobranza.findUnique({
      where: { id },
      include: {
        residente: true
      }
    })

    if (!carta) {
      return NextResponse.json({ error: 'Carta no encontrada' }, { status: 404 })
    }

    // Crear PDF
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' })
    const pageWidth = doc.internal.pageSize.getWidth()
    let y = 15

    // Header con logo/empresa
    doc.setFillColor(15, 32, 64)
    doc.rect(0, 0, pageWidth, 25, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(EMPRESA.nombre, 10, 10)

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(EMPRESA.direccion, 10, 16)
    doc.text(`Tel: ${EMPRESA.telefono} | Email: ${EMPRESA.email}`, 10, 21)

    // Tipo de carta (esquina superior derecha)
    const tipoColors: Record<string, [number, number, number]> = {
      'Recordatorio': [59, 130, 246],
      'Aviso': [245, 158, 11],
      'UltimoAviso': [249, 115, 22],
      'CobroJudicial': [220, 38, 38]
    }
    const color = tipoColors[carta.tipo] || [100, 100, 100]
    
    doc.setFillColor(color[0], color[1], color[2])
    doc.roundedRect(pageWidth - 55, 5, 45, 15, 2, 2, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text(carta.tipo.toUpperCase().replace('ULTIMO', 'ÚLTIMO '), pageWidth - 32.5, 14, { align: 'center' })

    y = 35

    // Fecha y número de carta
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Santiago, ${new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, 10, y)
    doc.text(`Carta N°: ${carta.numeroCarta}`, pageWidth - 10, y, { align: 'right' })

    y += 12

    // Datos del destinatario
    doc.setFillColor(245, 245, 245)
    doc.rect(10, y, pageWidth - 20, 20, 'F')

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('DESTINATARIO:', 12, y + 6)

    doc.setFont('helvetica', 'normal')
    doc.text(`${carta.residente?.nombre || ''} ${carta.residente?.apellido || ''}`, 12, y + 11)
    doc.text(`Unidad: ${carta.residente?.unidad || '-'}`, 12, y + 16)

    if (carta.residente?.email) {
      doc.text(`Email: ${carta.residente.email}`, 100, y + 11)
    }
    if (carta.residente?.telefono) {
      doc.text(`Tel: ${carta.residente.telefono}`, 100, y + 16)
    }

    y += 28

    // Asunto
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('ASUNTO:', 10, y)
    doc.setFont('helvetica', 'normal')
    doc.text(carta.asunto, 30, y)

    y += 10

    // Línea separadora
    doc.setDrawColor(200, 200, 200)
    doc.line(10, y, pageWidth - 10, y)

    y += 8

    // Contenido de la carta
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    
    // Dividir el contenido en líneas
    const lineHeight = 5
    const maxWidth = pageWidth - 20
    const lines = doc.splitTextToSize(carta.contenido, maxWidth)
    
    doc.text(lines, 10, y)
    y += lines.length * lineHeight + 10

    // Pie de página con método de envío
    y = doc.internal.pageSize.getHeight() - 35

    doc.setDrawColor(200, 200, 200)
    doc.line(10, y, pageWidth - 10, y)

    y += 5

    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text(`Método de envío: ${carta.metodoEnvio}`, 10, y + 5)
    doc.text(`Estado: ${carta.estado}`, 10, y + 10)
    
    if (carta.fechaEnvio) {
      doc.text(`Fecha de envío: ${formatDate(carta.fechaEnvio)}`, 10, y + 15)
    }

    // Sello/Firma
    doc.setDrawColor(0, 0, 0)
    doc.line(pageWidth - 70, y + 5, pageWidth - 20, y + 5)
    doc.setFontSize(8)
    doc.setTextColor(0, 0, 0)
    doc.text('Administración', pageWidth - 45, y + 10, { align: 'center' })
    doc.text(EMPRESA.nombre, pageWidth - 45, y + 15, { align: 'center' })

    // Footer
    y = doc.internal.pageSize.getHeight() - 10
    doc.setFillColor(245, 245, 245)
    doc.rect(0, y - 5, pageWidth, 15, 'F')
    
    doc.setTextColor(100, 100, 100)
    doc.setFontSize(7)
    doc.text(EMPRESA.nombre + ' | ' + EMPRESA.direccion + ' | Tel: ' + EMPRESA.telefono, pageWidth / 2, y + 3, { align: 'center' })

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="carta-${carta.tipo.toLowerCase()}-${carta.residente?.unidad || 'residente'}-${carta.numeroCarta}.pdf"`
      }
    })
  } catch (error) {
    console.error('Error generando PDF:', error)
    return NextResponse.json({ error: 'Error generando PDF' }, { status: 500 })
  }
}
