/**
 * API para generar reporte de asistencia POR TRABAJADOR — Formato semanal.
 *
 * Formato (según imagen de referencia):
 * Por cada trabajador, por cada semana del mes:
 *   - Fila 1: Nombre | Turno | Fecha inicio semana | Horario esperado Lun-Sáb
 *   - Fila 2: (vacío) | Turno B | (vacío) | Horario esperado Lun-Sáb (si tiene turno B)
 *   - Fila 3: (vacío) | ANÁLISIS | (vacío) | Hora real registrada con colores:
 *       Verde (#C6E0B4) = OK (a tiempo)
 *       Amarillo (#FFFF00) = Atraso
 *       Rojo (#FFC7CE) = SIN REGISTRO / FALLA
 *       Gris = DÍA LIBRE
 *
 * GET ?formato=pdf|csv&fechaDesde=YYYY-MM-DD&fechaHasta=YYYY-MM-DD&trabajador=nombre
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

// Colores del reporte (RGB)
const COLOR_OK = [198, 224, 180]       // #C6E0B4 verde
const COLOR_ATRASO = [255, 255, 0]     // #FFFF00 amarillo
const COLOR_FALTA = [255, 199, 206]    // #FFC7CE rojo
const COLOR_LIBRE = [217, 217, 217]    // gris
const COLOR_SIN_REG = [255, 199, 206]  // rojo
const COLOR_HEADER = [15, 32, 64]      // azul corporativo
const COLOR_HEADER_YELLOW = [255, 192, 0] // amarillo header

function getDiaSemanaIdx(fechaStr: string): number {
  const [y, m, d] = fechaStr.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

function getLunesDeSemana(fechaStr: string): string {
  // Devuelve el lunes de la semana de la fecha dada
  const [y, m, d] = fechaStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const dia = date.getDay() // 0=Dom, 1=Lun, ..., 6=Sáb
  const diff = dia === 0 ? -6 : 1 - dia // Si es domingo, retroceder 6 días; si no, ir al lunes
  date.setDate(date.getDate() + diff)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function addDays(fechaStr: string, days: number): string {
  const [y, m, d] = fechaStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function formatFechaCorta(fechaStr: string): string {
  const [y, m, d] = fechaStr.split('-')
  return `${d}-${m}`
}

function normalize(s: string): string {
  return s.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()
}


function parseHoraStr(hora: string): number {
  const [h, m] = hora.split(':').map(Number)
  return h * 60 + m
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

    // Obtener horarios
    const horarios = await db.horarioTrabajador.findMany({
      orderBy: { nombreTrabajador: 'asc' },
    })

    let horariosFiltrados = horarios
    if (trabajadorFilter) {
      horariosFiltrados = horarios.filter((h) =>
        h.nombreTrabajador.toLowerCase().includes(trabajadorFilter.toLowerCase()),
      )
    }

    if (horariosFiltrados.length === 0) {
      return NextResponse.json({ error: 'No hay horarios cargados' }, { status: 400 })
    }

    // Obtener registros del reloj
    const registros = await db.registroAsistenciaReloj.findMany({
      where: { fecha: { gte: fechaDesde, lte: fechaHasta } },
      orderBy: { fechaHora: 'asc' },
    })

    // Obtener inasistencias
    const inasistencias = await db.inasistenciaAtraso.findMany({
      where: { fecha: { gte: fechaDesde, lte: fechaHasta } },
      include: { justificacion: true },
    })

    // Agrupar registros por trabajador y fecha
    const registrosMap = new Map<string, Map<string, { entradas: any[]; salidas: any[] }>>()
    for (const reg of registros) {
      const key = normalize(reg.nombre)
      if (!registrosMap.has(key)) registrosMap.set(key, new Map())
      const porFecha = registrosMap.get(key)!
      if (!porFecha.has(reg.fecha)) porFecha.set(reg.fecha, { entradas: [], salidas: [] })
      const grupo = porFecha.get(reg.fecha)!
      if (reg.tipoRegistro === 'Entrada') grupo.entradas.push(reg)
      else if (reg.tipoRegistro === 'Salida') grupo.salidas.push(reg)
    }

    // Agrupar inasistencias por trabajador y fecha
    const inasMap = new Map<string, Map<string, any>>()
    for (const inas of inasistencias) {
      const key = normalize(inas.nombreTrabajador)
      if (!inasMap.has(key)) inasMap.set(key, new Map())
      inasMap.get(key)!.set(inas.fecha, inas)
    }

    // Generar lista de semanas (lunes a sábado)
    const semanas: string[] = [] // fecha del lunes de cada semana
    let fechaActual = getLunesDeSemana(fechaDesde)
    while (fechaActual <= fechaHasta) {
      semanas.push(fechaActual)
      fechaActual = addDays(fechaActual, 7)
    }

    // ============================================
    // GENERAR PDF
    // ============================================
    if (formato === 'pdf') {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 8

      // Header corporativo
      doc.setFillColor(COLOR_HEADER[0], COLOR_HEADER[1], COLOR_HEADER[2])
      doc.rect(0, 0, pageWidth, 15, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text('Reporte de Asistencia — Condominio Laguna Norte', margin, 9)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.text(
        `Período: ${formatFechaCorta(fechaDesde)} al ${formatFechaCorta(fechaHasta)}  ·  Generado: ${new Date().toLocaleDateString('es-CL')}`,
        margin,
        13,
      )

      let yPos = 20

      // Columnas: Nombre | Turno | Semana | Lun | Mar | Mié | Jue | Vie | Sáb
      const colNombre = 45
      const colTurno = 20
      const colSemana = 22
      const colDia = (pageWidth - margin * 2 - colNombre - colTurno - colSemana) / 6
      const tableWidth = colNombre + colTurno + colSemana + colDia * 6

      // Agrupar horarios por trabajador (un trabajador puede tener TURNO A y TURNO B)
      const horariosPorTrabajador = new Map<string, any[]>()
      for (const h of horariosFiltrados) {
        const key = normalize(h.nombreTrabajador)
        if (!horariosPorTrabajador.has(key)) horariosPorTrabajador.set(key, [])
        horariosPorTrabajador.get(key)!.push(h)
      }

      // Por cada trabajador (con todos sus turnos)
      for (const [trabajadorKey, horariosTrabajador] of horariosPorTrabajador) {
        const horarioA = horariosTrabajador.find((h) => h.turno === 'TURNO A') || horariosTrabajador[0]
        const horarioB = horariosTrabajador.find((h) => h.turno === 'TURNO B')

        // Buscar registros del reloj para este trabajador
        const registrosTrabajador = registrosMap.get(trabajadorKey) || new Map()
        const inasistenciasTrabajador = inasMap.get(trabajadorKey) || new Map()

        // Buscar departamento
        let departamento = ''
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

        // Salto de pagina si no hay espacio
        if (yPos > pageHeight - 25) {
          doc.addPage()
          yPos = 15
        }

        // Nombre del trabajador (header)
        doc.setFillColor(COLOR_HEADER[0], COLOR_HEADER[1], COLOR_HEADER[2])
        doc.rect(margin, yPos, tableWidth, 6, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text(`${horarioA.nombreTrabajador}  -  ${departamento || ''}`, margin + 1, yPos + 4)
        yPos += 6

        // Por cada semana del mes
        for (const semanaInicio of semanas) {
          if (yPos > pageHeight - 20) {
            doc.addPage()
            yPos = 15
          }

          // Generar los 6 dias (Lun-Sab) de esta semana
          const diasSemana: string[] = []
          for (let i = 0; i < 6; i++) {
            diasSemana.push(addDays(semanaInicio, i))
          }

          // Verificar si hay datos en esta semana
          const tieneDatos = diasSemana.some((f) => f <= fechaHasta)
          if (!tieneDatos) continue

          // DETERMINAR TURNO ACTIVO para esta semana:
          // Buscar el primer registro de entrada de la semana y ver si coincide mas con A o B
          let turnoActivo = horarioA // por defecto A
          let turnoLabel = 'A'

          // Buscar primer registro de la semana
          let primerRegistroSemana: any = null
          for (const fechaDia of diasSemana) {
            if (fechaDia > fechaHasta) continue
            const grupo = registrosTrabajador.get(fechaDia)
            if (grupo && grupo.entradas.length > 0) {
              primerRegistroSemana = grupo.entradas[0]
              break
            }
          }

          if (primerRegistroSemana && horarioB) {
            // Comparar hora del registro con horarios de A y B
            const horaReal = parseHoraStr(primerRegistroSemana.hora)
            const inicioA = horarioA.lunesInicio ? parseHoraStr(horarioA.lunesInicio) : 9999
            const inicioB = horarioB.lunesInicio ? parseHoraStr(horarioB.lunesInicio) : 9999
            const diffA = Math.abs(horaReal - inicioA)
            const diffB = Math.abs(horaReal - inicioB)
            if (diffB < diffA) {
              turnoActivo = horarioB
              turnoLabel = 'B'
            } else {
              turnoActivo = horarioA
              turnoLabel = 'A'
            }
          }

          // Fila 1: Header de dias
          doc.setFillColor(COLOR_HEADER_YELLOW[0], COLOR_HEADER_YELLOW[1], COLOR_HEADER_YELLOW[2])
          doc.rect(margin, yPos, tableWidth, 5, 'F')
          doc.setTextColor(0, 0, 0)
          doc.setFontSize(6)
          doc.setFont('helvetica', 'bold')
          doc.text('Nombre', margin + 1, yPos + 3.5)
          doc.text('Turno', margin + colNombre + 1, yPos + 3.5)
          doc.text('Semana', margin + colNombre + colTurno + 1, yPos + 3.5)
          let xPos = margin + colNombre + colTurno + colSemana
          for (let i = 0; i < 6; i++) {
            const fechaDia = diasSemana[i]
            if (fechaDia > fechaHasta) {
              doc.text('-', xPos + 1, yPos + 3.5)
            } else {
              doc.text(`${DIAS_CORTOS[i + 1]} ${formatFechaCorta(fechaDia)}`, xPos + 1, yPos + 3.5)
            }
            xPos += colDia
          }
          yPos += 5

          // Fila 2: Horario esperado (del turno activo)
          doc.setFillColor(245, 245, 245)
          doc.rect(margin, yPos, tableWidth, 5, 'F')
          doc.setTextColor(40, 40, 40)
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(6)
          doc.text(horarioA.nombreTrabajador.substring(0, 25), margin + 1, yPos + 3.5)
          doc.text(`TURNO ${turnoLabel}`, margin + colNombre + 1, yPos + 3.5)
          doc.text(formatFechaCorta(semanaInicio), margin + colNombre + colTurno + 1, yPos + 3.5)
          xPos = margin + colNombre + colTurno + colSemana
          for (let i = 0; i < 6; i++) {
            const fechaDia = diasSemana[i]
            if (fechaDia > fechaHasta) {
              doc.text('-', xPos + 1, yPos + 3.5)
            } else {
              let horarioStr = 'Libre'
              const diaIdx = getDiaSemanaIdx(fechaDia)

              if (turnoActivo.tipoTurno === '4x4' && turnoActivo.ciclo4x4Inicio) {
                const [y, m, d] = turnoActivo.ciclo4x4Inicio.split('-').map(Number)
                const cicloInicio = new Date(y, m - 1, d)
                const [y2, m2, d2] = fechaDia.split('-').map(Number)
                const fechaDate = new Date(y2, m2 - 1, d2)
                const diffDays = Math.floor((fechaDate.getTime() - cicloInicio.getTime()) / (1000 * 60 * 60 * 24))
                const diaEnCiclo = ((diffDays % 8) + 8) % 8
                if (diaEnCiclo < 4) {
                  horarioStr = turnoActivo.ciclo4x4Turno === 'noche' ? '19:00-07:00' : '07:00-19:00'
                } else {
                  horarioStr = 'Libre'
                }
              } else {
                const horariosDia = [
                  null,
                  [turnoActivo.lunesInicio, turnoActivo.lunesFin],
                  [turnoActivo.martesInicio, turnoActivo.martesFin],
                  [turnoActivo.miercolesInicio, turnoActivo.miercolesFin],
                  [turnoActivo.juevesInicio, turnoActivo.juevesFin],
                  [turnoActivo.viernesInicio, turnoActivo.viernesFin],
                  [turnoActivo.sabadoInicio, turnoActivo.sabadoFin],
                ]
                const [ini, fin] = horariosDia[diaIdx] || [null, null]
                horarioStr = ini && fin ? `${ini}-${fin}` : 'Libre'
              }
              doc.text(horarioStr, xPos + 1, yPos + 3.5)
            }
            xPos += colDia
          }
          yPos += 5

          // Fila 3: ANALISIS (hora real registrada con colores)
          doc.text('', margin + 1, yPos + 3.5)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(40, 40, 40)
          doc.text('', margin + 1, yPos + 3.5)
          doc.setFont('helvetica', 'normal')
          doc.text('ANALISIS', margin + colNombre + 1, yPos + 3.5)
          xPos = margin + colNombre + colTurno + colSemana
          for (let i = 0; i < 6; i++) {
            const fechaDia = diasSemana[i]
            if (fechaDia > fechaHasta) {
              doc.setFillColor(240, 240, 240)
              doc.rect(xPos, yPos, colDia, 6, 'F')
              doc.text('-', xPos + 1, yPos + 4)
              xPos += colDia
              continue
            }

            // Obtener horario esperado del turno activo
            let esLibre = false
            let horarioInicio: string | null = null
            const diaIdx = getDiaSemanaIdx(fechaDia)

            if (turnoActivo.tipoTurno === '4x4' && turnoActivo.ciclo4x4Inicio) {
              const [y, m, d] = turnoActivo.ciclo4x4Inicio.split('-').map(Number)
              const cicloInicio = new Date(y, m - 1, d)
              const [y2, m2, d2] = fechaDia.split('-').map(Number)
              const fechaDate = new Date(y2, m2 - 1, d2)
              const diffDays = Math.floor((fechaDate.getTime() - cicloInicio.getTime()) / (1000 * 60 * 60 * 24))
              const diaEnCiclo = ((diffDays % 8) + 8) % 8
              if (diaEnCiclo < 4) {
                horarioInicio = turnoActivo.ciclo4x4Turno === 'noche' ? '19:00' : '07:00'
              } else {
                esLibre = true
              }
            } else {
              const horariosDia = [
                null,
                turnoActivo.lunesInicio,
                turnoActivo.martesInicio,
                turnoActivo.miercolesInicio,
                turnoActivo.juevesInicio,
                turnoActivo.viernesInicio,
                turnoActivo.sabadoInicio,
              ]
              horarioInicio = horariosDia[diaIdx] || null
              if (!horarioInicio) esLibre = true
            }

            // Obtener registro real
            const grupo = registrosTrabajador.get(fechaDia)
            const primeraEntrada = grupo?.entradas[0]
            const inas = inasistenciasTrabajador.get(fechaDia)

            // Determinar color y texto
            let color = COLOR_SIN_REG
            let texto = 'SIN REGISTRO'

            if (esLibre) {
              color = COLOR_LIBRE
              texto = 'Libre'
            } else if (primeraEntrada) {
              if (inas && inas.tipo === 'atraso') {
                color = COLOR_ATRASO
                texto = `${primeraEntrada.hora} (${inas.minutosAtraso}min)`
              } else if (inas && inas.tipo === 'salida_temprana') {
                color = COLOR_ATRASO
                texto = `${primeraEntrada.hora}`
              } else if (inas && inas.tipo === 'colacion_excedida') {
                color = COLOR_ATRASO
                texto = `${primeraEntrada.hora}`
              } else {
                color = COLOR_OK
                texto = primeraEntrada.hora
              }
            } else {
              color = COLOR_FALTA
              texto = 'FALLA'
            }

            // Pintar celda con color
            doc.setFillColor(color[0], color[1], color[2])
            doc.rect(xPos, yPos, colDia, 6, 'F')

            // Borde
            doc.setDrawColor(180, 180, 180)
            doc.setLineWidth(0.1)
            doc.rect(xPos, yPos, colDia, 6)

            // Texto
            doc.setFontSize(6)
            doc.setTextColor(0, 0, 0)
            doc.text(texto, xPos + 1, yPos + 4)

            // Justificacion si existe
            if (inas?.justificacion) {
              doc.setFontSize(4)
              doc.setTextColor(0, 0, 100)
              doc.text(inas.justificacion.tipoJustificacion.substring(0, 8), xPos + 1, yPos + 5.5)
              doc.setFontSize(6)
              doc.setTextColor(0, 0, 0)
            }

            xPos += colDia
          }
          yPos += 7

          // Linea separadora entre semanas
          doc.setDrawColor(200, 200, 200)
          doc.setLineWidth(0.2)
          doc.line(margin, yPos, margin + tableWidth, yPos)
          yPos += 2
        }

        // Espacio entre trabajadores
        yPos += 4
      }

      // Leyenda al final
      if (yPos > pageHeight - 20) {
        doc.addPage()
        yPos = 15
      }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(0, 0, 0)
      doc.text('Leyenda:', margin, yPos)
      yPos += 4

      const leyenda = [
        { color: COLOR_OK, label: 'OK — Presente y a tiempo' },
        { color: COLOR_ATRASO, label: 'Atraso — Entró tarde (con minutos)' },
        { color: COLOR_FALTA, label: 'FALLA — No registró entrada' },
        { color: COLOR_LIBRE, label: 'Libre — Día no laborable' },
      ]
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6)
      for (const item of leyenda) {
        doc.setFillColor(item.color[0], item.color[1], item.color[2])
        doc.rect(margin, yPos - 3, 4, 3, 'F')
        doc.setDrawColor(150, 150, 150)
        doc.rect(margin, yPos - 3, 4, 3)
        doc.text(item.label, margin + 6, yPos - 0.5)
        yPos += 4
      }

      const pdfBuffer = doc.output('arraybuffer')
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="reporte_asistencia_${fechaDesde}_${fechaHasta}.pdf"`,
        },
      })
    }

    // ============================================
    // CSV
    // ============================================
    if (formato === 'csv') {
      const headers = [
        'Trabajador', 'Turno', 'Semana', 'Día', 'Fecha',
        'Horario Esperado', 'Horario Registro', 'Estado', 'Minutos Atraso',
        'Justificación', 'Estado Justificación',
      ]

      const rows: any[] = []
      for (const horario of horariosFiltrados) {
        const nombreNorm = normalize(horario.nombreTrabajador)
        const registrosTrabajador = registrosMap.get(nombreNorm) || new Map()
        const inasistenciasTrabajador = inasMap.get(nombreNorm) || new Map()

        for (const semanaInicio of semanas) {
          for (let i = 0; i < 6; i++) {
            const fechaDia = addDays(semanaInicio, i)
            if (fechaDia > fechaHasta) continue

            const grupo = registrosTrabajador.get(fechaDia)
            const primeraEntrada = grupo?.entradas[0]
            const inas = inasistenciasTrabajador.get(fechaDia)

            let horarioEsperado = 'Libre'
            let esLibre = false
            const diaIdx = getDiaSemanaIdx(fechaDia)

            if (horario.tipoTurno === '4x4' && horario.ciclo4x4Inicio) {
              const [y, m, d] = horario.ciclo4x4Inicio.split('-').map(Number)
              const cicloInicio = new Date(y, m - 1, d)
              const [y2, m2, d2] = fechaDia.split('-').map(Number)
              const fechaDate = new Date(y2, m2 - 1, d2)
              const diffDays = Math.floor((fechaDate.getTime() - cicloInicio.getTime()) / (1000 * 60 * 60 * 24))
              const diaEnCiclo = ((diffDays % 8) + 8) % 8
              if (diaEnCiclo < 4) {
                horarioEsperado = horario.ciclo4x4Turno === 'noche' ? '19:00-07:00' : '07:00-19:00'
              } else {
                esLibre = true
                horarioEsperado = 'Libre'
              }
            } else {
              const horariosDia = [null, horario.lunesInicio, horario.martesInicio, horario.miercolesInicio, horario.juevesInicio, horario.viernesInicio, horario.sabadoInicio]
              const horariosFinDia = [null, horario.lunesFin, horario.martesFin, horario.miercolesFin, horario.juevesFin, horario.viernesFin, horario.sabadoFin]
              const ini = horariosDia[diaIdx]
              const fin = horariosFinDia[diaIdx]
              if (ini && fin) {
                horarioEsperado = `${ini}-${fin}`
              } else {
                esLibre = true
                horarioEsperado = 'Libre'
              }
            }

            let estado = 'SIN_REGISTRO'
            let minutosAtraso = 0
            if (esLibre) {
              estado = 'LIBRE'
            } else if (primeraEntrada) {
              if (inas && inas.tipo === 'atraso') {
                estado = 'ATRASO'
                minutosAtraso = inas.minutosAtraso || 0
              } else if (inas && inas.tipo === 'salida_temprana') {
                estado = 'SALIDA_TEMPRANA'
                minutosAtraso = inas.minutosAtraso || 0
              } else {
                estado = 'OK'
              }
            } else {
              estado = 'FALTA'
            }

            rows.push([
              horario.nombreTrabajador,
              horario.turno,
              formatFechaCorta(semanaInicio),
              DIAS_CORTOS[diaIdx],
              fechaDia,
              horarioEsperado,
              primeraEntrada?.hora || '',
              estado,
              minutosAtraso,
              inas?.justificacion?.tipoJustificacion || '',
              inas?.justificacion?.estado || '',
            ])
          }
        }
      }

      const csv = [headers, ...rows]
        .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
        .join('\n')

      return new NextResponse('\ufeff' + csv, {
        headers: {
          'Content-Type': 'text/csv;charset=utf-8',
          'Content-Disposition': `attachment; filename="reporte_asistencia_${fechaDesde}_${fechaHasta}.csv"`,
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
