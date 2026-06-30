/**
 * API para generar reporte de asistencia POR TRABAJADOR.
 *
 * Formato del reporte:
 *   Por cada trabajador:
 *     - Nombre del trabajador (header)
 *     - Tabla con todos los días del rango:
 *       Fecha | Día | Horario Esperado | Horario Registro | Estado (con color)
 *     - Estados: BIEN (verde), ATRASO (amarillo), INASISTENCIA (rojo), DÍA LIBRE (gris), SALIDA TEMPRANA (naranja)
 *     - Justificación (si existe)
 *
 * GET ?formato=pdf|csv&fechaDesde=YYYY-MM-DD&fechaHasta=YYYY-MM-DD&trabajador=nombre
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'

// Colores para el PDF
const COLORS = {
  BIEN: { fill: [209, 250, 229], text: [22, 163, 74] },         // verde
  ATRASO: { fill: [254, 243, 199], text: [146, 64, 14] },       // amarillo
  INASISTENCIA: { fill: [254, 226, 226], text: [153, 27, 27] }, // rojo
  SALIDA_TEMPRANA: { fill: [255, 237, 213], text: [154, 52, 18] }, // naranja
  DIA_LIBRE: { fill: [241, 245, 249], text: [100, 116, 139] },  // gris
  SIN_REGISTRO: { fill: [248, 250, 252], text: [148, 163, 184] },
}

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

function getDiaSemana(fechaStr: string): string {
  const [y, m, d] = fechaStr.split('-').map(Number)
  return DIAS_SEMANA[new Date(y, m - 1, d).getDay()]
}

function formatFecha(fechaStr: string): string {
  const [y, m, d] = fechaStr.split('-')
  return `${d}-${m}`
}

function addDays(fechaStr: string, days: number): string {
  const [y, m, d] = fechaStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

export async function GET(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const formato = searchParams.get('formato') || 'pdf'
    const fechaDesde = searchParams.get('fechaDesde') || ''
    const fechaHasta = searchParams.get('fechaHasta') || ''
    const trabajadorFilter = searchParams.get('trabajador') || ''

    if (!fechaDesde || !fechaHasta) {
      return NextResponse.json(
        { error: 'Debe especificar fechaDesde y fechaHasta' },
        { status: 400 },
      )
    }

    // Obtener todos los horarios
    const horarios = await db.horarioTrabajador.findMany({
      orderBy: { nombreTrabajador: 'asc' },
    })

    // Filtrar por trabajador si se especifica
    let horariosFiltrados = horarios
    if (trabajadorFilter) {
      horariosFiltrados = horarios.filter((h) =>
        h.nombreTrabajador.toLowerCase().includes(trabajadorFilter.toLowerCase()),
      )
    }

    if (horariosFiltrados.length === 0) {
      return NextResponse.json(
        { error: 'No hay horarios cargados. Importa los archivos primero.' },
        { status: 400 },
      )
    }

    // Obtener todos los registros del reloj en el rango
    const registros = await db.registroAsistenciaReloj.findMany({
      where: { fecha: { gte: fechaDesde, lte: fechaHasta } },
      orderBy: { fechaHora: 'asc' },
    })

    // Obtener todas las inasistencias/atrasos en el rango
    const inasistencias = await db.inasistenciaAtraso.findMany({
      where: { fecha: { gte: fechaDesde, lte: fechaHasta } },
      include: { justificacion: true },
    })

    // Agrupar registros por trabajador (nombre normalizado) y fecha
    const registrosMap = new Map<string, Map<string, { entradas: any[]; salidas: any[] }>>()

    const normalize = (s: string) =>
      s.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()

    for (const reg of registros) {
      const key = normalize(reg.nombre)
      if (!registrosMap.has(key)) {
        registrosMap.set(key, new Map())
      }
      const porFecha = registrosMap.get(key)!
      if (!porFecha.has(reg.fecha)) {
        porFecha.set(reg.fecha, { entradas: [], salidas: [] })
      }
      const grupo = porFecha.get(reg.fecha)!
      if (reg.tipoRegistro === 'Entrada') {
        grupo.entradas.push(reg)
      } else if (reg.tipoRegistro === 'Salida') {
        grupo.salidas.push(reg)
      }
    }

    // Agrupar inasistencias por trabajador y fecha
    const inasistenciasMap = new Map<string, Map<string, any>>()
    for (const inas of inasistencias) {
      const key = normalize(inas.nombreTrabajador)
      if (!inasistenciasMap.has(key)) {
        inasistenciasMap.set(key, new Map())
      }
      inasistenciasMap.get(key)!.set(inas.fecha, inas)
    }

    // Generar lista de fechas
    const fechas: string[] = []
    let fechaActual = fechaDesde
    while (fechaActual <= fechaHasta) {
      fechas.push(fechaActual)
      fechaActual = addDays(fechaActual, 1)
    }

    // Construir datos por trabajador
    const trabajadoresData: Array<{
      nombre: string
      departamento?: string | null
      turno: string
      tipoTurno: string
      dias: Array<{
        fecha: string
        diaSemana: string
        horarioEsperado: string
        horarioRegistro: string
        estado: string // BIEN, ATRASO, INASISTENCIA, SALIDA_TEMPRANA, DIA_LIBRE, SIN_REGISTRO
        minutosAtraso: number
        justificacion?: any
      }>
    }> = []

    for (const horario of horariosFiltrados) {
      const nombreNorm = normalize(horario.nombreTrabajador)
      const registrosTrabajador = registrosMap.get(nombreNorm) || new Map()
      const inasistenciasTrabajador = inasistenciasMap.get(nombreNorm) || new Map()

      // Buscar departamento del primer registro
      let departamento: string | null = null
      for (const [, grupo] of registrosTrabajador) {
        if (grupo.entradas[0]?.departamento) {
          departamento = grupo.entradas[0].departamento
          break
        }
        if (grupo.salidas[0]?.departamento) {
          departamento = grupo.salidas[0].departamento
          break
        }
      }

      const dias: any[] = []

      for (const fecha of fechas) {
        const diaSemana = getDiaSemana(fecha)

        // Obtener horario esperado
        let horarioInicio: string | null = null
        let horarioFin: string | null = null
        let esLibre = false

        if (horario.tipoTurno === '4x4' && horario.ciclo4x4Inicio) {
          // Calcular día del ciclo 4x4
          const [y, m, d] = horario.ciclo4x4Inicio.split('-').map(Number)
          const cicloInicio = new Date(y, m - 1, d)
          const [y2, m2, d2] = fecha.split('-').map(Number)
          const fechaDate = new Date(y2, m2 - 1, d2)
          const diffDays = Math.floor((fechaDate.getTime() - cicloInicio.getTime()) / (1000 * 60 * 60 * 24))
          const diaEnCiclo = ((diffDays % 8) + 8) % 8
          if (diaEnCiclo < 4) {
            if (horario.ciclo4x4Turno === 'noche') {
              horarioInicio = '19:00'
              horarioFin = '07:00'
            } else {
              horarioInicio = '07:00'
              horarioFin = '19:00'
            }
          } else {
            esLibre = true
          }
        } else {
          // Turno fijo
          switch (diaSemana) {
            case 'Lunes': horarioInicio = horario.lunesInicio; horarioFin = horario.lunesFin; break
            case 'Martes': horarioInicio = horario.martesInicio; horarioFin = horario.martesFin; break
            case 'Miércoles': horarioInicio = horario.miercolesInicio; horarioFin = horario.miercolesFin; break
            case 'Jueves': horarioInicio = horario.juevesInicio; horarioFin = horario.juevesFin; break
            case 'Viernes': horarioInicio = horario.viernesInicio; horarioFin = horario.viernesFin; break
            case 'Sábado': horarioInicio = horario.sabadoInicio; horarioFin = horario.sabadoFin; break
            case 'Domingo': esLibre = true; break
          }
          if (!horarioInicio) esLibre = true
        }

        const horarioEsperado = esLibre ? 'Libre' : (horarioInicio && horarioFin ? `${horarioInicio} - ${horarioFin}` : '—')

        // Obtener registros reales
        const grupo = registrosTrabajador.get(fecha)
        const primeraEntrada = grupo?.entradas[0]
        const ultimaSalida = grupo?.salidas[grupo.salidas.length - 1]
        const horarioRegistro = primeraEntrada
          ? `${primeraEntrada.hora}${ultimaSalida ? ' - ' + ultimaSalida.hora : ''}`
          : '—'

        // Determinar estado
        let estado = 'SIN_REGISTRO'
        let minutosAtraso = 0

        if (esLibre) {
          estado = 'DIA_LIBRE'
        } else if (primeraEntrada) {
          // Hay entrada → verificar si es atraso
          const inas = inasistenciasTrabajador.get(fecha)
          if (inas) {
            if (inas.tipo === 'atraso') {
              estado = 'ATRASO'
              minutosAtraso = inas.minutosAtraso || 0
            } else if (inas.tipo === 'salida_temprana') {
              estado = 'SALIDA_TEMPRANA'
              minutosAtraso = inas.minutosAtraso || 0
            } else {
              estado = 'BIEN'
            }
          } else {
            estado = 'BIEN'
          }
        } else {
          // No hay entrada en día laborable
          const inas = inasistenciasTrabajador.get(fecha)
          if (inas && inas.tipo === 'ausencia') {
            estado = 'INASISTENCIA'
          } else {
            estado = 'INASISTENCIA'
          }
        }

        // Justificación
        const inas = inasistenciasTrabajador.get(fecha)
        const justificacion = inas?.justificacion || undefined

        dias.push({
          fecha,
          diaSemana,
          horarioEsperado,
          horarioRegistro,
          estado,
          minutosAtraso,
          justificacion,
        })
      }

      trabajadoresData.push({
        nombre: horario.nombreTrabajador,
        departamento,
        turno: horario.turno,
        tipoTurno: horario.tipoTurno,
        dias,
      })
    }

    // ============================================
    // GENERAR PDF
    // ============================================
    if (formato === 'pdf') {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 10
      const contentWidth = pageWidth - margin * 2

      // Header corporativo
      doc.setFillColor(15, 32, 64)
      doc.rect(0, 0, pageWidth, 18, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(13)
      doc.setFont('helvetica', 'bold')
      doc.text('Reporte de Asistencia por Trabajador', margin, 11)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(
        `Condominio Laguna Norte  ·  ${formatFecha(fechaDesde)} al ${formatFecha(fechaHasta)}  ·  Generado: ${new Date().toLocaleDateString('es-CL')}`,
        margin,
        16,
      )

      let yPos = 24

      // Por cada trabajador
      for (const trabajador of trabajadoresData) {
        // Salto de página si no hay espacio suficiente (mínimo 40mm para header + al menos 2 filas)
        if (yPos > pageHeight - 50) {
          doc.addPage()
          yPos = 20
        }

        // Header del trabajador
        doc.setFillColor(15, 32, 64)
        doc.rect(margin, yPos, contentWidth, 7, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text(
          `${trabajador.nombre}  —  ${trabajador.turno} (${trabajador.tipoTurno})${trabajador.departamento ? '  —  ' + trabajador.departamento : ''}`,
          margin + 1,
          yPos + 5,
        )
        yPos += 7

        // Cabecera de tabla
        const colWidths = [16, 20, 35, 35, 30, 45]
        const tableWidth = colWidths.reduce((a, b) => a + b, 0)
        const tableX = margin + (contentWidth - tableWidth) / 2 // centrar

        doc.setFillColor(241, 245, 249)
        doc.rect(tableX, yPos, tableWidth, 5, 'F')
        doc.setTextColor(15, 32, 64)
        doc.setFontSize(6)
        doc.setFont('helvetica', 'bold')
        const headers = ['Fecha', 'Día', 'Horario Trab.', 'Horario Reg.', 'Estado', 'Justificación']
        let xPos = tableX + 1
        headers.forEach((h, i) => {
          doc.text(h, xPos, yPos + 3.5)
          xPos += colWidths[i]
        })
        yPos += 5

        // Filas de días
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6)

        for (const dia of trabajador.dias) {
          // Salto de página
          if (yPos > pageHeight - 15) {
            doc.addPage()
            yPos = 20
          }

          // Color de fondo según estado
          const color = COLORS[dia.estado as keyof typeof COLORS] || COLORS.SIN_REGISTRO
          doc.setFillColor(color.fill[0], color.fill[1], color.fill[2])
          doc.rect(tableX, yPos, tableWidth, 5, 'F')

          // Bordes
          doc.setDrawColor(200, 200, 200)
          doc.setLineWidth(0.1)
          doc.rect(tableX, yPos, tableWidth, 5)

          // Texto
          doc.setTextColor(color.text[0], color.text[1], color.text[2])

          const estadoLabel =
            dia.estado === 'BIEN' ? 'BIEN' :
            dia.estado === 'ATRASO' ? `ATRASO (${dia.minutosAtraso}min)` :
            dia.estado === 'INASISTENCIA' ? 'INASISTENCIA' :
            dia.estado === 'SALIDA_TEMPRANA' ? 'SALIDA TEMP.' :
            dia.estado === 'DIA_LIBRE' ? 'DÍA LIBRE' : 'SIN REGISTRO'

          const justText = dia.justificacion
            ? `${dia.justificacion.tipoJustificacion}${dia.justificacion.estado === 'aprobado' ? ' (OK)' : dia.justificacion.estado === 'rechazado' ? ' (RECH.)' : ''}`
            : ''

          const rowData = [
            formatFecha(dia.fecha),
            dia.diaSemana.substring(0, 3),
            dia.horarioEsperado,
            dia.horarioRegistro,
            estadoLabel,
            justText,
          ]
          xPos = tableX + 1
          rowData.forEach((cell, i) => {
            doc.text(String(cell).substring(0, colWidths[i] / 1.8), xPos, yPos + 3.5)
            xPos += colWidths[i]
          })
          yPos += 5
        }

        // Resumen del trabajador
        const totalBien = trabajador.dias.filter((d) => d.estado === 'BIEN').length
        const totalAtrasos = trabajador.dias.filter((d) => d.estado === 'ATRASO').length
        const totalAusencias = trabajador.dias.filter((d) => d.estado === 'INASISTENCIA').length
        const totalLibres = trabajador.dias.filter((d) => d.estado === 'DIA_LIBRE').length
        const totalSalidas = trabajador.dias.filter((d) => d.estado === 'SALIDA_TEMPRANA').length
        const totalMinutos = trabajador.dias.reduce((acc, d) => acc + (d.minutosAtraso || 0), 0)

        yPos += 2
        doc.setFillColor(245, 245, 245)
        doc.rect(tableX, yPos, tableWidth, 5, 'F')
        doc.setTextColor(40, 40, 40)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(6)
        doc.text(
          `Resumen: BIEN=${totalBien}  ATRASOS=${totalAtrasos}  AUSENCIAS=${totalAusencias}  SAL.TEMP=${totalSalidas}  LIBRES=${totalLibres}  MIN.TOTAL=${totalMinutos}`,
          tableX + 1,
          yPos + 3.5,
        )
        yPos += 10
      }

      // Leyenda de colores al final
      if (yPos > pageHeight - 30) {
        doc.addPage()
        yPos = 20
      }
      yPos += 5
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(15, 32, 64)
      doc.text('Leyenda:', margin, yPos)
      yPos += 5

      const leyenda = [
        { label: 'BIEN — Presente y a tiempo', color: COLORS.BIEN },
        { label: 'ATRASO — Entró tarde (más de 5 min)', color: COLORS.ATRASO },
        { label: 'INASISTENCIA — No registró entrada', color: COLORS.INASISTENCIA },
        { label: 'SALIDA TEMP. — Salió antes de hora', color: COLORS.SALIDA_TEMPRANA },
        { label: 'DÍA LIBRE — No le toca trabajar', color: COLORS.DIA_LIBRE },
      ]
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      for (const item of leyenda) {
        doc.setFillColor(item.color.fill[0], item.color.fill[1], item.color.fill[2])
        doc.rect(margin, yPos - 3, 4, 4, 'F')
        doc.setTextColor(item.color.text[0], item.color.text[1], item.color.text[2])
        doc.text(item.label, margin + 6, yPos)
        yPos += 5
      }

      const pdfBuffer = doc.output('arraybuffer')
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="reporte_asistencia_por_trabajador_${fechaDesde}_${fechaHasta}.pdf"`,
        },
      })
    }

    // ============================================
    // GENERAR CSV
    // ============================================
    if (formato === 'csv') {
      const headers = [
        'Trabajador',
        'Departamento',
        'Turno',
        'Fecha',
        'Día',
        'Horario Esperado',
        'Horario Registro',
        'Estado',
        'Minutos Atraso',
        'Justificación',
        'Estado Justificación',
        'Supervisor',
        'Admin Revisor',
      ]

      const rows: any[] = []
      for (const t of trabajadoresData) {
        for (const d of t.dias) {
          rows.push([
            t.nombre,
            t.departamento || '',
            t.turno,
            d.fecha,
            d.diaSemana,
            d.horarioEsperado,
            d.horarioRegistro,
            d.estado,
            d.minutosAtraso || 0,
            d.justificacion?.tipoJustificacion || '',
            d.justificacion?.estado || '',
            d.justificacion?.supervisorNombre || '',
            d.justificacion?.adminNombre || '',
          ])
        }
      }

      const csv = [headers, ...rows]
        .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\n')

      return new NextResponse('\ufeff' + csv, {
        headers: {
          'Content-Type': 'text/csv;charset=utf-8',
          'Content-Disposition': `attachment; filename="reporte_asistencia_por_trabajador_${fechaDesde}_${fechaHasta}.csv"`,
        },
      })
    }

    return NextResponse.json({ error: 'Formato no soportado' }, { status: 400 })
  } catch (error) {
    console.error('Error generando reporte:', error)
    return NextResponse.json(
      { error: 'Error al generar reporte: ' + (error as Error).message },
      { status: 500 },
    )
  }
}
