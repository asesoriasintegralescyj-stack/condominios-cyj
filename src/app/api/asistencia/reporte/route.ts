/**
 * API para generar reporte de asistencia.
 * GET ?formato=pdf|csv&fechaDesde=YYYY-MM-DD&fechaHasta=YYYY-MM-DD&trabajador=nombre
 *
 * Devuelve el reporte como descarga directa.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const formato = searchParams.get('formato') || 'csv'
    const fechaDesde = searchParams.get('fechaDesde') || ''
    const fechaHasta = searchParams.get('fechaHasta') || ''
    const trabajadorFilter = searchParams.get('trabajador') || ''
    const estadoFilter = searchParams.get('estado') || ''

    const where: any = {}
    if (fechaDesde) where.fecha = { ...where.fecha, gte: fechaDesde }
    if (fechaHasta) where.fecha = { ...where.fecha, lte: fechaHasta }
    if (trabajadorFilter) where.nombreTrabajador = { contains: trabajadorFilter, mode: 'insensitive' }
    if (estadoFilter) where.estado = estadoFilter

    const inasistencias = await db.inasistenciaAtraso.findMany({
      where,
      include: { justificacion: true },
      orderBy: [{ nombreTrabajador: 'asc' }, { fecha: 'asc' }],
    })

    if (inasistencias.length === 0) {
      return NextResponse.json(
        { error: 'No hay datos para el reporte con los filtros seleccionados' },
        { status: 400 },
      )
    }

    // ============================================
    // CSV
    // ============================================
    if (formato === 'csv') {
      const headers = [
        'Trabajador',
        'RUT',
        'Departamento',
        'Fecha',
        'Día',
        'Tipo',
        'Hora Esperada Inicio',
        'Hora Real Inicio',
        'Hora Esperada Fin',
        'Hora Real Fin',
        'Minutos Atraso',
        'Tipo Turno',
        'Estado',
        'Tipo Justificación',
        'Supervisor',
        'Observaciones Supervisor',
        'Admin Revisor',
        'Observaciones Admin',
      ]

      const rows = inasistencias.map((i) => [
        i.nombreTrabajador,
        i.rut || '',
        i.departamento || '',
        i.fecha,
        i.diaSemana,
        i.tipo,
        i.horaEsperadaInicio || '',
        i.horaRealInicio || '',
        i.horaEsperadaFin || '',
        i.horaRealFin || '',
        i.minutosAtraso || 0,
        i.tipoTurno || '',
        i.estado,
        i.justificacion?.tipoJustificacion || '',
        i.justificacion?.supervisorNombre || '',
        i.justificacion?.observaciones || '',
        i.justificacion?.adminNombre || '',
        i.justificacion?.adminObservaciones || '',
      ])

      const csv = [headers, ...rows]
        .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\n')

      return new NextResponse('\ufeff' + csv, {
        headers: {
          'Content-Type': 'text/csv;charset=utf-8',
          'Content-Disposition': `attachment; filename="reporte_asistencia_${fechaDesde || 'todas'}_${fechaHasta || 'fechas'}.csv"`,
        },
      })
    }

    // ============================================
    // PDF
    // ============================================
    if (formato === 'pdf') {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 10

      // Header corporativo
      doc.setFillColor(15, 32, 64)
      doc.rect(0, 0, pageWidth, 20, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('Reporte de Asistencia — Condominio Laguna Norte', margin, 12)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.text(
        `Generado: ${new Date().toLocaleString('es-CL')}  ·  ${inasistencias.length} registro(s)`,
        margin,
        17,
      )

      // Filtros
      let yPos = 26
      doc.setTextColor(80, 80, 80)
      doc.setFontSize(8)
      const filtrosText = [
        `Desde: ${fechaDesde || '—'}`,
        `Hasta: ${fechaHasta || '—'}`,
        `Trabajador: ${trabajadorFilter || 'Todos'}`,
        `Estado: ${estadoFilter || 'Todos'}`,
      ].join('   ·   ')
      doc.text(filtrosText, margin, yPos)
      yPos += 8

      // Resumen
      doc.setFillColor(245, 245, 245)
      doc.rect(margin, yPos, pageWidth - margin * 2, 10, 'F')
      doc.setTextColor(15, 32, 64)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      const totalAtrasos = inasistencias.filter((i) => i.tipo === 'atraso').length
      const totalAusencias = inasistencias.filter((i) => i.tipo === 'ausencia').length
      const totalSalidas = inasistencias.filter((i) => i.tipo === 'salida_temprana').length
      const totalPendientes = inasistencias.filter((i) => i.estado === 'pendiente').length
      const totalAprobados = inasistencias.filter((i) => i.estado === 'aprobado').length
      doc.text(
        `TOTAL: ${inasistencias.length}  |  Atrasos: ${totalAtrasos}  |  Ausencias: ${totalAusencias}  |  Salidas tempranas: ${totalSalidas}  |  Pendientes: ${totalPendientes}  |  Aprobados: ${totalAprobados}`,
        margin + 2,
        yPos + 6,
      )
      yPos += 14

      // Tabla
      const headers = ['Trabajador', 'Fecha', 'Día', 'Tipo', 'Esperada', 'Real', 'Min', 'Estado', 'Justificación']
      const colWidths = [50, 22, 18, 22, 22, 22, 12, 22, 60]

      // Cabecera
      doc.setFillColor(15, 32, 64)
      doc.rect(margin, yPos, colWidths.reduce((a, b) => a + b, 0), 6, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      let xPos = margin + 1
      headers.forEach((h, i) => {
        doc.text(h, xPos, yPos + 4)
        xPos += colWidths[i]
      })
      yPos += 6

      // Filas
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(40, 40, 40)
      doc.setFontSize(6)

      inasistencias.forEach((i, idx) => {
        if (yPos > 190) {
          doc.addPage()
          yPos = 20
        }
        if (idx % 2 === 0) {
          doc.setFillColor(245, 247, 250)
          doc.rect(margin, yPos, colWidths.reduce((a, b) => a + b, 0), 5, 'F')
        }
        const rowData = [
          i.nombreTrabajador.substring(0, 30),
          i.fecha,
          i.diaSemana.substring(0, 3),
          i.tipo === 'atraso' ? 'Atraso' : i.tipo === 'ausencia' ? 'Ausencia' : 'Salida temp.',
          i.horaEsperadaInicio || '—',
          i.horaRealInicio || '—',
          String(i.minutosAtraso || 0),
          i.estado,
          i.justificacion ? `${i.justificacion.tipoJustificacion}: ${i.justificacion.observaciones || ''}`.substring(0, 35) : '—',
        ]
        xPos = margin + 1
        rowData.forEach((cell, ci) => {
          doc.text(String(cell), xPos, yPos + 3.5)
          xPos += colWidths[ci]
        })
        yPos += 5
      })

      // Resumen por trabajador (nueva página)
      doc.addPage()
      yPos = 26
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(15, 32, 64)
      doc.text('Resumen por Trabajador', margin, yPos)
      yPos += 8

      // Agrupar por trabajador
      const porTrabajador = new Map<string, any>()
      for (const i of inasistencias) {
        if (!porTrabajador.has(i.nombreTrabajador)) {
          porTrabajador.set(i.nombreTrabajador, {
            nombre: i.nombreTrabajador,
            departamento: i.departamento,
            atrasos: 0,
            ausencias: 0,
            salidasTempranas: 0,
            pendientes: 0,
            aprobados: 0,
            rechazados: 0,
            totalMinutos: 0,
          })
        }
        const t = porTrabajador.get(i.nombreTrabajador)!
        if (i.tipo === 'atraso') t.atrasos++
        if (i.tipo === 'ausencia') t.ausencias++
        if (i.tipo === 'salida_temprana') t.salidasTempranas++
        if (i.estado === 'pendiente') t.pendientes++
        if (i.estado === 'aprobado') t.aprobados++
        if (i.estado === 'rechazado') t.rechazados++
        t.totalMinutos += i.minutosAtraso || 0
      }

      const resHeaders = ['Trabajador', 'Departamento', 'Atrasos', 'Ausencias', 'Sal. Temp.', 'Pend.', 'Aprob.', 'Rech.', 'Min total']
      const resWidths = [50, 40, 18, 18, 18, 15, 15, 15, 18]

      doc.setFillColor(15, 32, 64)
      doc.rect(margin, yPos, resWidths.reduce((a, b) => a + b, 0), 6, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(7)
      xPos = margin + 1
      resHeaders.forEach((h, i) => {
        doc.text(h, xPos, yPos + 4)
        xPos += resWidths[i]
      })
      yPos += 6

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(40, 40, 40)
      doc.setFontSize(6)

      for (const [nombre, t] of porTrabajador) {
        if (yPos > 190) {
          doc.addPage()
          yPos = 20
        }
        const rowData = [
          nombre.substring(0, 30),
          (t.departamento || '').substring(0, 22),
          String(t.atrasos),
          String(t.ausencias),
          String(t.salidasTempranas),
          String(t.pendientes),
          String(t.aprobados),
          String(t.rechazados),
          String(t.totalMinutos),
        ]
        if ((yPos / 6) % 2 === 0) {
          doc.setFillColor(245, 247, 250)
          doc.rect(margin, yPos, resWidths.reduce((a, b) => a + b, 0), 5, 'F')
        }
        xPos = margin + 1
        rowData.forEach((cell, ci) => {
          doc.text(String(cell), xPos, yPos + 3.5)
          xPos += resWidths[ci]
        })
        yPos += 5
      }

      const pdfBuffer = doc.output('arraybuffer')
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="reporte_asistencia_${fechaDesde || 'todas'}_${fechaHasta || 'fechas'}.pdf"`,
        },
      })
    }

    return NextResponse.json({ error: 'Formato no soportado' }, { status: 400 })
  } catch (error) {
    console.error('Error generando reporte:', error)
    return NextResponse.json({ error: 'Error al generar reporte' }, { status: 500 })
  }
}
