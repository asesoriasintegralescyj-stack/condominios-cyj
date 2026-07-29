import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const EMPRESA = {
  nombre: 'Asesorias Integrales CyJ',
  razonSocial: 'Asesorias Integrales CyJ SpA',
  rut: '76.123.456-7',
  direccion: 'Av. La Montana Norte 3650, Lampa',
  telefono: '+56 964 650 643',
  email: 'contacto@cyjcondominios.cl',
}

function formatCLP(n: number) {
  return '$' + new Intl.NumberFormat('es-CL').format(Math.round(n || 0))
}

function formatDate(dateStr: string | Date | null) {
  if (!dateStr) return '-'
  try {
    const d = new Date(dateStr)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  } catch {
    return String(dateStr)
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (!hasPermission(session.user.rol, 'rendiciongastos.ver')) {
    return apiError('Sin permisos', 403)
  }

  try {
    const { id } = await params
    const rendicion = await db.rendicionGasto.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, nombre: true, apellido: true, email: true } },
        condominio: { select: { id: true, nombre: true } },
        centroCosto: { select: { id: true, codigo: true, nombre: true } },
        items: {
          include: { categoriaGasto: { select: { id: true, nombre: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!rendicion) return apiError('Rendicion no encontrada', 404)

    if (
      session.user.rol !== 'admin' &&
      session.user.rol !== 'supervisor' &&
      rendicion.userId !== session.userId
    ) {
      return apiError('Sin permisos', 403)
    }

    const doc = new jsPDF('p', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 15
    let y = margin

    doc.setFillColor(15, 32, 68)
    doc.rect(0, 0, pageWidth, 30, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Rendicion de Gastos', margin, 14)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Nro: ${rendicion.numeroRendicion}   |   Fecha: ${formatDate(rendicion.createdAt)}`, margin, 22)
    doc.setFontSize(8)
    doc.text(EMPRESA.razonSocial, pageWidth - margin, 14, { align: 'right' })
    doc.text(`RUT: ${EMPRESA.rut}`, pageWidth - margin, 20, { align: 'right' })

    y = 40

    doc.setTextColor(0, 0, 0)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Informacion General', margin, y)
    y += 2
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, y, pageWidth - margin, y)
    y += 7

    const userName = `${rendicion.user.nombre}${rendicion.user.apellido ? ' ' + rendicion.user.apellido : ''}`
    const infoData: [string, string][] = [
      ['Titulo', rendicion.titulo],
      ['Estado', rendicion.estado],
      ['Usuario', userName],
      ['Condominio', rendicion.condominio?.nombre || '-'],
      ['Centro de Costo', rendicion.centroCosto ? `${rendicion.centroCosto.codigo} - ${rendicion.centroCosto.nombre}` : '-'],
    ]
    if (rendicion.descripcion) {
      infoData.push(['Descripcion', rendicion.descripcion])
    }
    if (rendicion.notaRevision) {
      infoData.push(['Nota Revision', rendicion.notaRevision])
    }

    doc.setFontSize(9)
    for (const [label, value] of infoData) {
      doc.setFont('helvetica', 'bold')
      doc.text(`${label}:`, margin, y)
      doc.setFont('helvetica', 'normal')
      const lines = doc.splitTextToSize(String(value), pageWidth - margin * 2 - 35)
      doc.text(lines[0], margin + 35, y)
      y += Math.max(6, lines.length * 5)
    }

    y += 5

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Detalle de Gastos', margin, y)
    y += 2
    doc.line(margin, y, pageWidth - margin, y)
    y += 3

    const tableBody = rendicion.items.map((item, idx) => [
      String(idx + 1),
      item.descripcion,
      item.categoriaGasto?.nombre || item.categoria || '-',
      item.numeroBoleta || '-',
      formatDate(item.fechaGasto),
      formatCLP(item.montoRendir),
    ])

    autoTable(doc, {
      startY: y,
      head: [['#', 'Descripcion', 'Categoria', 'Nro Boleta', 'Fecha', 'Monto']],
      body: tableBody,
      foot: [['', '', '', '', 'TOTAL', formatCLP(rendicion.montoTotal)]],
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: {
        fillColor: [15, 32, 68],
        textColor: 255,
        fontStyle: 'bold',
      },
      footStyles: {
        fillColor: [240, 240, 240],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'right',
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 'auto' },
        5: { halign: 'right', cellWidth: 28 },
      },
      theme: 'grid',
    })

    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      const pageHeight = doc.internal.pageSize.getHeight()
      doc.setFontSize(7)
      doc.setTextColor(150, 150, 150)
      doc.text(
        `Generado: ${new Date().toLocaleString('es-CL')}  |  ${EMPRESA.razonSocial}  |  Pagina ${i} de ${pageCount}`,
        pageWidth / 2,
        pageHeight - 8,
        { align: 'center' }
      )
    }

    const pdfBytes = doc.output('arraybuffer')
    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${rendicion.numeroRendicion}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generando PDF:', error)
    return apiError('Error al generar PDF', 500)
  }
}
