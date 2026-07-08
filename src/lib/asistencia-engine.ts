/**
 * Motor de análisis de asistencia.
 * Compara horarios esperados con registros reales del reloj control.
 * Detecta: atrasos, ausencias, salidas tempranas.
 * Maneja turnos fijos (Lun-Sáb) y turnos 4x4 (4 días trabajo + 4 libres).
 */

// ============================================
// Tipos
// ============================================

interface HorarioTrabajador {
  nombreTrabajador: string
  rut?: string | null
  turno: string
  tipoTurno: string // 'fijo' | '4x4'
  lunesInicio?: string | null
  lunesFin?: string | null
  martesInicio?: string | null
  martesFin?: string | null
  miercolesInicio?: string | null
  miercolesFin?: string | null
  juevesInicio?: string | null
  juevesFin?: string | null
  viernesInicio?: string | null
  viernesFin?: string | null
  sabadoInicio?: string | null
  sabadoFin?: string | null
  ciclo4x4Inicio?: string | null
  ciclo4x4Turno?: string | null // 'dia' | 'noche'
}

interface RegistroReloj {
  nombre: string
  rut?: string | null
  fechaHora: Date
  fecha: string // YYYY-MM-DD
  hora: string  // HH:MM
  tipoRegistro: string | null // 'Entrada' | 'Salida'
  departamento?: string | null
}

interface InasistenciaDetectada {
  nombreTrabajador: string
  rut?: string | null
  departamento?: string | null
  fecha: string
  diaSemana: string
  tipo: 'atraso' | 'ausencia' | 'salida_temprana' | 'colacion_excedida'
  horaEsperadaInicio?: string | null
  horaEsperadaFin?: string | null
  horaRealInicio?: string | null
  horaRealFin?: string | null
  minutosAtraso: number
  tipoTurno: string
  primeraEntrada?: string | null
  primeraSalida?: string | null
  segundaEntrada?: string | null
  segundaSalida?: string | null
  minutosColacion?: number | null
}

interface HorarioEsperado {
  inicio: string | null
  fin: string | null
  esLibre: boolean
  esNoche: boolean
}

export interface HorarioTrabajadorInput {
  nombreTrabajador: string
  rut?: string | null
  turno: string
  tipoTurno: string
  lunesInicio?: string | null
  lunesFin?: string | null
  martesInicio?: string | null
  martesFin?: string | null
  miercolesInicio?: string | null
  miercolesFin?: string | null
  juevesInicio?: string | null
  juevesFin?: string | null
  viernesInicio?: string | null
  viernesFin?: string | null
  sabadoInicio?: string | null
  sabadoFin?: string | null
  ciclo4x4Inicio?: string | null
  ciclo4x4Turno?: string | null
}

export interface RegistroRelojInput {
  nombre: string
  rut?: string | null
  fechaHora: Date
  fecha: string
  hora: string
  tipoRegistro: string | null
  departamento?: string | null
}

export interface ResultadoAnalisis {
  totalTrabajadores: number
  totalDiasAnalizados: number
  totalAtrasos: number
  totalAusencias: number
  totalSalidasTempranas: number
  totalDiasLibres: number
  totalDiasPresentes: number
  totalColacionesExcedidas: number
  inasistencias: InasistenciaDetectada[]
  resumenPorTrabajador: Array<{
    nombre: string
    departamento?: string | null
    diasPresentes: number
    atrasos: number
    ausencias: number
    salidasTempranas: number
    colacionesExcedidas: number
    diasLibres: number
    totalMinutosAtraso: number
  }>
}

// ============================================
// Helpers
// ============================================

const TOLERANCIA_MINUTOS = 5

function fechaStrToDate(fechaStr: string): Date {
  const [y, m, d] = fechaStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function getDiaSemanaFromStr(fechaStr: string): string {
  const [y, m, d] = fechaStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  return dias[date.getDay()]
}

function parseHora(horaStr: string): number {
  if (!horaStr) return -1
  const parts = horaStr.split(':')
  if (parts.length < 2) return -1
  const h = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  if (isNaN(h) || isNaN(m)) return -1
  return h * 60 + m
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function getNameTokens(name: string): string[] {
  return normalizeName(name).split(' ').filter((t) => t.length > 1)
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function dateToFechaStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Calcula la diferencia en días entre dos fechas (sin contar horas).
 * Usa mediodía para evitar problemas de DST.
 */
function diffDays(fechaInicio: Date, fechaActual: Date): number {
  const inicio = new Date(fechaInicio.getFullYear(), fechaInicio.getMonth(), fechaInicio.getDate())
  const actual = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), fechaActual.getDate())
  const diffMs = actual.getTime() - inicio.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

function getLunesDeSemana(fechaStr: string): string {
  const [y, m, d] = fechaStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const dia = date.getDay()
  const diff = dia === 0 ? -6 : 1 - dia
  const lunes = addDays(date, diff)
  return dateToFechaStr(lunes)
}

// ============================================
// Obtener horario esperado para un día específico (turno fijo)
// ============================================

function getHorarioEsperadoFijo(horario: HorarioTrabajador, fechaStr: string): HorarioEsperado {
  const dia = getDiaSemanaFromStr(fechaStr)
  let inicio: string | null = null
  let fin: string | null = null

  switch (dia) {
    case 'Lunes':
      inicio = horario.lunesInicio || null
      fin = horario.lunesFin || null
      break
    case 'Martes':
      inicio = horario.martesInicio || null
      fin = horario.martesFin || null
      break
    case 'Miércoles':
      inicio = horario.miercolesInicio || null
      fin = horario.miercolesFin || null
      break
    case 'Jueves':
      inicio = horario.juevesInicio || null
      fin = horario.juevesFin || null
      break
    case 'Viernes':
      inicio = horario.viernesInicio || null
      fin = horario.viernesFin || null
      break
    case 'Sábado':
      inicio = horario.sabadoInicio || null
      fin = horario.sabadoFin || null
      break
    case 'Domingo':
      return { inicio: null, fin: null, esLibre: true, esNoche: false }
  }

  if (!inicio || !fin) {
    return { inicio: null, fin: null, esLibre: true, esNoche: false }
  }
  // Detectar si es turno noche (inicio > fin, ej: 19:00 - 07:00)
  const esNoche = parseHora(inicio) > parseHora(fin)
  return { inicio, fin, esLibre: false, esNoche }
}

// ============================================
// Obtener horario esperado para 4x4
// ============================================

function getHorarioEsperado4x4(horario: HorarioTrabajador, fechaStr: string): HorarioEsperado {
  if (!horario.ciclo4x4Inicio) {
    // Si no hay fecha de inicio del ciclo, asumir día de trabajo con horario por defecto
    // para no marcar ausencia injustificada
    if (horario.ciclo4x4Turno === 'noche') {
      return { inicio: '19:00', fin: '07:00', esLibre: false, esNoche: true }
    } else {
      return { inicio: '07:00', fin: '19:00', esLibre: false, esNoche: false }
    }
  }

  const cicloInicio = fechaStrToDate(horario.ciclo4x4Inicio)
  const fechaActual = fechaStrToDate(fechaStr)
  const diasDiff = diffDays(cicloInicio, fechaActual)

  // Ciclo de 8 días: 4 trabajo + 4 libres
  // Usar módulo con manejo de negativos
  const diaEnCiclo = ((diasDiff % 8) + 8) % 8

  if (diaEnCiclo < 4) {
    // Día de trabajo
    if (horario.ciclo4x4Turno === 'noche') {
      // Turno noche: 19:00 a 07:00 del día siguiente
      return { inicio: '19:00', fin: '07:00', esLibre: false, esNoche: true }
    } else {
      // Turno día: 07:00 a 19:00
      return { inicio: '07:00', fin: '19:00', esLibre: false, esNoche: false }
    }
  } else {
    // Día libre
    return { inicio: null, fin: null, esLibre: true, esNoche: false }
  }
}

// ============================================
// Emparejar trabajador de horario con trabajador de registro
// ============================================

function matchTrabajador(
  nombreHorario: string,
  nombreRegistro: string
): boolean {
  const n1 = normalizeName(nombreHorario)
  const n2 = normalizeName(nombreRegistro)

  if (n1 === n2) return true

  const tokens1 = getNameTokens(nombreHorario)
  const tokens2 = getNameTokens(nombreRegistro)
  const shorter = tokens1.length <= tokens2.length ? tokens1 : tokens2
  const longer = tokens1.length <= tokens2.length ? tokens2 : tokens1
  const allShorterInLonger = shorter.every((t) => longer.includes(t))
  if (allShorterInLonger && shorter.length >= 2) return true

  if (tokens1.length >= 2 && tokens2.length >= 2) {
    const apellidos1 = tokens1.slice(-2).join(' ')
    const apellidos2 = tokens2.slice(-2).join(' ')
    if (apellidos1 === apellidos2) return true
  }

  return false
}

// ============================================
// Análisis principal
// ============================================

export function analizarAsistencia(
  horariosInput: HorarioTrabajadorInput[],
  registrosInput: RegistroRelojInput[],
  fechaDesde: string,
  fechaHasta: string
): ResultadoAnalisis {
  const horarios: HorarioTrabajador[] = horariosInput.map((h) => ({ ...h }))
  const registros: RegistroReloj[] = registrosInput.map((r) => ({ ...r }))

  const inasistencias: InasistenciaDetectada[] = []

  // Generar lista de fechas
  const fechas: string[] = []
  let fechaActual = fechaStrToDate(fechaDesde)
  const fechaFin = fechaStrToDate(fechaHasta)
  while (fechaActual <= fechaFin) {
    fechas.push(dateToFechaStr(fechaActual))
    fechaActual = addDays(fechaActual, 1)
  }

  let totalDiasAnalizados = 0
  let totalAtrasos = 0
  let totalAusencias = 0
  let totalSalidasTempranas = 0
  let totalDiasLibres = 0
  let totalDiasPresentes = 0
  let totalColacionesExcedidas = 0

  // Agrupar horarios por trabajador
  const horariosPorTrabajador = new Map<string, HorarioTrabajador[]>()
  for (const h of horarios) {
    const key = normalizeName(h.nombreTrabajador)
    if (!horariosPorTrabajador.has(key)) horariosPorTrabajador.set(key, [])
    horariosPorTrabajador.get(key)!.push(h)
  }

  // Agrupar registros por trabajador
  const registrosPorTrabajador = new Map<string, RegistroReloj[]>()
  for (const r of registros) {
    const key = normalizeName(r.nombre)
    if (!registrosPorTrabajador.has(key)) registrosPorTrabajador.set(key, [])
    registrosPorTrabajador.get(key)!.push(r)
  }

  const resumenPorTrabajador: ResultadoAnalisis['resumenPorTrabajador'] = []

  for (const [trabajadorKey, turnosTrabajador] of horariosPorTrabajador) {
    const horarioA = turnosTrabajador.find((h) => h.turno === 'TURNO A') || turnosTrabajador[0]
    const horarioB = turnosTrabajador.find((h) => h.turno === 'TURNO B')

    // Buscar registros que coincidan
    let registrosMatch = registrosPorTrabajador.get(trabajadorKey) || []
    if (registrosMatch.length === 0) {
      for (const [key, regs] of registrosPorTrabajador.entries()) {
        if (regs.length > 0 && matchTrabajador(horarioA.nombreTrabajador, regs[0].nombre)) {
          registrosMatch = regs
          break
        }
      }
    }

    // Agrupar registros por fecha
    const registrosPorFecha = new Map<string, { entradas: RegistroReloj[]; salidas: RegistroReloj[] }>()
    for (const reg of registrosMatch) {
      if (!registrosPorFecha.has(reg.fecha)) {
        registrosPorFecha.set(reg.fecha, { entradas: [], salidas: [] })
      }
      const grupo = registrosPorFecha.get(reg.fecha)!
      if (reg.tipoRegistro === 'Entrada') {
        grupo.entradas.push(reg)
      } else if (reg.tipoRegistro === 'Salida') {
        grupo.salidas.push(reg)
      }
    }
    for (const [, grupo] of registrosPorFecha) {
      grupo.entradas.sort((a, b) => a.fechaHora.getTime() - b.fechaHora.getTime())
      grupo.salidas.sort((a, b) => a.fechaHora.getTime() - b.fechaHora.getTime())
    }

    let diasPresentes = 0
    let atrasos = 0
    let ausencias = 0
    let salidasTempranas = 0
    let colacionesExcedidas = 0
    let diasLibres = 0
    let totalMinutosAtraso = 0
    const departamento = registrosMatch[0]?.departamento || null

    // Para 4x4: NO agrupar por semana, analizar día por día
    // Para fijo: agrupar por semana para determinar turno A/B
    const es4x4 = horarioA.tipoTurno === '4x4'

    if (es4x4) {
      // === Análisis día por día para 4x4 ===
      for (const fecha of fechas) {
        totalDiasAnalizados++

        const horarioEsperado = getHorarioEsperado4x4(horarioA, fecha)

        if (horarioEsperado.esLibre || !horarioEsperado.inicio) {
          diasLibres++
          totalDiasLibres++
          continue
        }

        const grupo = registrosPorFecha.get(fecha)
        // Para turno noche, también buscar registros del día anterior que cricen medianoche
        let entradas = grupo?.entradas || []
        let salidas = grupo?.salidas || []

        // Si es turno noche (19:00 - 07:00), la salida puede estar registrada al día siguiente
        if (horarioEsperado.esNoche) {
          const fechaSiguiente = dateToFechaStr(addDays(fechaStrToDate(fecha), 1))
          const grupoSiguiente = registrosPorFecha.get(fechaSiguiente)
          if (grupoSiguiente) {
            // Las salidas tempranas del día siguiente (antes de las 12:00) son del turno noche
            const salidasMananaSiguiente = grupoSiguiente.salidas.filter(s => parseHora(s.hora) < 12 * 60)
            salidas = [...salidas, ...salidasMananaSiguiente]
            // Las entradas tempranas del día siguiente también pueden ser del turno noche
            const entradasMananaSiguiente = grupoSiguiente.entradas.filter(e => parseHora(e.hora) < 12 * 60)
            entradas = [...entradas, ...entradasMananaSiguiente]
          }
        }

        entradas.sort((a, b) => a.fechaHora.getTime() - b.fechaHora.getTime())
        salidas.sort((a, b) => a.fechaHora.getTime() - b.fechaHora.getTime())

        const primeraEntrada = entradas[0]
        const ultimaSalida = salidas[salidas.length - 1]

        if (!primeraEntrada) {
          ausencias++
          totalAusencias++
          inasistencias.push({
            nombreTrabajador: horarioA.nombreTrabajador,
            rut: horarioA.rut,
            departamento,
            fecha,
            diaSemana: getDiaSemanaFromStr(fecha),
            tipo: 'ausencia',
            horaEsperadaInicio: horarioEsperado.inicio,
            horaEsperadaFin: horarioEsperado.fin,
            horaRealInicio: null,
            horaRealFin: null,
            minutosAtraso: 0,
            tipoTurno: '4x4',
            primeraEntrada: null,
            primeraSalida: null,
            segundaEntrada: null,
            segundaSalida: null,
            minutosColacion: null,
          })
        } else {
          diasPresentes++
          totalDiasPresentes++

          const horaRealMin = parseHora(primeraEntrada.hora)
          const horaEsperadaMin = parseHora(horarioEsperado.inicio)

          // Para turno noche: si la entrada esperada es 19:00 y la real es después de medianoche
          // (ej: 00:30), significa que llegó tarde al turno que empezó a las 19:00
          let minutosAtraso: number
          if (horarioEsperado.esNoche && horaRealMin < 12 * 60) {
            // Entrada después de medianoche para turno que empezó a las 19:00
            // Calcular atraso desde 19:00 del día anterior
            minutosAtraso = (horaRealMin + 24 * 60) - horaEsperadaMin
          } else {
            minutosAtraso = horaRealMin - horaEsperadaMin
          }

          if (minutosAtraso > TOLERANCIA_MINUTOS) {
            atrasos++
            totalAtrasos++
            totalMinutosAtraso += minutosAtraso
            inasistencias.push({
              nombreTrabajador: horarioA.nombreTrabajador,
              rut: horarioA.rut,
              departamento,
              fecha,
              diaSemana: getDiaSemanaFromStr(fecha),
              tipo: 'atraso',
              horaEsperadaInicio: horarioEsperado.inicio,
              horaEsperadaFin: horarioEsperado.fin,
              horaRealInicio: primeraEntrada.hora,
              horaRealFin: ultimaSalida?.hora || null,
              minutosAtraso,
              tipoTurno: '4x4',
              primeraEntrada: primeraEntrada.hora,
              primeraSalida: salidas[0]?.hora || null,
              segundaEntrada: entradas[1]?.hora || null,
              segundaSalida: ultimaSalida?.hora || null,
              minutosColacion: null,
            })
          }

          // Salida temprana
          if (ultimaSalida && horarioEsperado.fin) {
            const horaSalidaReal = parseHora(ultimaSalida.hora)
            const horaSalidaEsperada = parseHora(horarioEsperado.fin)

            let minutosSalidaTemprana: number
            if (horarioEsperado.esNoche) {
              // Turno noche: fin 07:00 del día siguiente
              // Si la salida real es antes de medianoche (ej: 23:00), se fue temprano
              if (horaSalidaReal > 12 * 60) {
                // Salida antes de medianoche = muy temprano
                minutosSalidaTemprana = (horaSalidaEsperada + 24 * 60) - horaSalidaReal
              } else {
                // Salida después de medianoche = comparar con 07:00
                minutosSalidaTemprana = horaSalidaEsperada - horaSalidaReal
              }
            } else {
              // Turno día: comparación normal
              minutosSalidaTemprana = horaSalidaEsperada - horaSalidaReal
            }

            if (minutosSalidaTemprana > TOLERANCIA_MINUTOS) {
              salidasTempranas++
              totalSalidasTempranas++
              inasistencias.push({
                nombreTrabajador: horarioA.nombreTrabajador,
                rut: horarioA.rut,
                departamento,
                fecha,
                diaSemana: getDiaSemanaFromStr(fecha),
                tipo: 'salida_temprana',
                horaEsperadaInicio: horarioEsperado.inicio,
                horaEsperadaFin: horarioEsperado.fin,
                horaRealInicio: primeraEntrada.hora,
                horaRealFin: ultimaSalida.hora,
                minutosAtraso: minutosSalidaTemprana,
                tipoTurno: '4x4',
                primeraEntrada: primeraEntrada.hora,
                primeraSalida: salidas[0]?.hora || null,
                segundaEntrada: entradas[1]?.hora || null,
                segundaSalida: ultimaSalida.hora,
                minutosColacion: null,
              })
            }
          }
        }
      }
    } else {
      // === Análisis por semana para turno fijo ===
      const semanasMap = new Map<string, string[]>()
      for (const fecha of fechas) {
        const lunes = getLunesDeSemana(fecha)
        if (!semanasMap.has(lunes)) semanasMap.set(lunes, [])
        semanasMap.get(lunes)!.push(fecha)
      }

      for (const [, fechasSemana] of semanasMap) {
        // Determinar turno activo (A o B)
        let turnoActivo = horarioA
        if (horarioB) {
          let primerRegistroSemana: RegistroReloj | null = null
          for (const fecha of fechasSemana) {
            const grupo = registrosPorFecha.get(fecha)
            if (grupo && grupo.entradas.length > 0) {
              primerRegistroSemana = grupo.entradas[0]
              break
            }
          }
          if (primerRegistroSemana) {
            const horaReal = parseHora(primerRegistroSemana.hora)
            const inicioA = horarioA.lunesInicio ? parseHora(horarioA.lunesInicio) : 9999
            const inicioB = horarioB.lunesInicio ? parseHora(horarioB.lunesInicio) : 9999
            const diffA = Math.abs(horaReal - inicioA)
            const diffB = Math.abs(horaReal - inicioB)
            if (diffB < diffA) {
              turnoActivo = horarioB
            }
          }
        }

        for (const fecha of fechasSemana) {
          totalDiasAnalizados++

          const horarioEsperado = getHorarioEsperadoFijo(turnoActivo, fecha)

          if (horarioEsperado.esLibre || !horarioEsperado.inicio) {
            diasLibres++
            totalDiasLibres++
            continue
          }

          const grupo = registrosPorFecha.get(fecha)
          const primeraEntrada = grupo?.entradas[0]
          const primeraSalida = grupo?.salidas[0]
          const segundaEntrada = grupo?.entradas[1]
          const segundaSalida = grupo?.salidas[grupo.salidas.length - 1]

          if (!primeraEntrada) {
            ausencias++
            totalAusencias++
            inasistencias.push({
              nombreTrabajador: horarioA.nombreTrabajador,
              rut: horarioA.rut,
              departamento,
              fecha,
              diaSemana: getDiaSemanaFromStr(fecha),
              tipo: 'ausencia',
              horaEsperadaInicio: horarioEsperado.inicio,
              horaEsperadaFin: horarioEsperado.fin,
              horaRealInicio: null,
              horaRealFin: null,
              minutosAtraso: 0,
              tipoTurno: turnoActivo.tipoTurno,
              primeraEntrada: null,
              primeraSalida: null,
              segundaEntrada: null,
              segundaSalida: null,
              minutosColacion: null,
            })
          } else {
            diasPresentes++
            totalDiasPresentes++

            const horaRealMin = parseHora(primeraEntrada.hora)
            const horaEsperadaMin = parseHora(horarioEsperado.inicio)

            let minutosAtraso = horaRealMin - horaEsperadaMin

            // Para turno noche fijo: si la entrada esperada es 19:00 y la real es después de medianoche
            if (horarioEsperado.esNoche && horaRealMin < 12 * 60) {
              minutosAtraso = (horaRealMin + 24 * 60) - horaEsperadaMin
            }

            if (minutosAtraso > TOLERANCIA_MINUTOS) {
              atrasos++
              totalAtrasos++
              totalMinutosAtraso += minutosAtraso
              inasistencias.push({
                nombreTrabajador: horarioA.nombreTrabajador,
                rut: horarioA.rut,
                departamento,
                fecha,
                diaSemana: getDiaSemanaFromStr(fecha),
                tipo: 'atraso',
                horaEsperadaInicio: horarioEsperado.inicio,
                horaEsperadaFin: horarioEsperado.fin,
                horaRealInicio: primeraEntrada.hora,
                horaRealFin: segundaSalida?.hora || null,
                minutosAtraso,
                tipoTurno: turnoActivo.tipoTurno,
                primeraEntrada: primeraEntrada.hora,
                primeraSalida: primeraSalida?.hora || null,
                segundaEntrada: segundaEntrada?.hora || null,
                segundaSalida: segundaSalida?.hora || null,
                minutosColacion: null,
              })
            }

            // Colación (solo turnos fijos)
            if (primeraSalida && segundaEntrada) {
              const minSalidaColacion = parseHora(primeraSalida.hora)
              const minRegresoColacion = parseHora(segundaEntrada.hora)
              let minutosColacion = minRegresoColacion - minSalidaColacion
              if (minutosColacion < 0) minutosColacion += 24 * 60
              if (minutosColacion > 65 && minutosColacion < 240) {
                colacionesExcedidas++
                totalColacionesExcedidas++
                inasistencias.push({
                  nombreTrabajador: horarioA.nombreTrabajador,
                  rut: horarioA.rut,
                  departamento,
                  fecha,
                  diaSemana: getDiaSemanaFromStr(fecha),
                  tipo: 'colacion_excedida',
                  horaEsperadaInicio: horarioEsperado.inicio,
                  horaEsperadaFin: horarioEsperado.fin,
                  horaRealInicio: primeraEntrada.hora,
                  horaRealFin: segundaSalida?.hora || null,
                  minutosAtraso: minutosColacion - 60,
                  tipoTurno: turnoActivo.tipoTurno,
                  primeraEntrada: primeraEntrada.hora,
                  primeraSalida: primeraSalida.hora,
                  segundaEntrada: segundaEntrada.hora,
                  segundaSalida: segundaSalida?.hora || null,
                  minutosColacion,
                })
              }
            }

            // Salida temprana
            if (segundaSalida && horarioEsperado.fin) {
              const horaSalidaReal = parseHora(segundaSalida.hora)
              const horaSalidaEsperada = parseHora(horarioEsperado.fin)

              let minutosSalidaTemprana: number
              if (horarioEsperado.esNoche) {
                // Turno noche: fin al día siguiente
                if (horaSalidaReal > 12 * 60) {
                  minutosSalidaTemprana = (horaSalidaEsperada + 24 * 60) - horaSalidaReal
                } else {
                  minutosSalidaTemprana = horaSalidaEsperada - horaSalidaReal
                }
              } else {
                minutosSalidaTemprana = horaSalidaEsperada - horaSalidaReal
              }

              if (minutosSalidaTemprana > TOLERANCIA_MINUTOS) {
                salidasTempranas++
                totalSalidasTempranas++
                inasistencias.push({
                  nombreTrabajador: horarioA.nombreTrabajador,
                  rut: horarioA.rut,
                  departamento,
                  fecha,
                  diaSemana: getDiaSemanaFromStr(fecha),
                  tipo: 'salida_temprana',
                  horaEsperadaInicio: horarioEsperado.inicio,
                  horaEsperadaFin: horarioEsperado.fin,
                  horaRealInicio: primeraEntrada.hora,
                  horaRealFin: segundaSalida.hora,
                  minutosAtraso: minutosSalidaTemprana,
                  tipoTurno: turnoActivo.tipoTurno,
                  primeraEntrada: primeraEntrada.hora,
                  primeraSalida: primeraSalida?.hora || null,
                  segundaEntrada: segundaEntrada?.hora || null,
                  segundaSalida: segundaSalida.hora,
                  minutosColacion: null,
                })
              }
            }
          }
        }
      }
    }

    resumenPorTrabajador.push({
      nombre: horarioA.nombreTrabajador,
      departamento,
      diasPresentes,
      atrasos,
      ausencias,
      salidasTempranas,
      colacionesExcedidas,
      diasLibres,
      totalMinutosAtraso,
    })
  }

  return {
    totalTrabajadores: resumenPorTrabajador.length,
    totalDiasAnalizados,
    totalAtrasos,
    totalAusencias,
    totalSalidasTempranas,
    totalDiasLibres,
    totalDiasPresentes,
    totalColacionesExcedidas,
    inasistencias,
    resumenPorTrabajador,
  }
}

// ============================================
// Parser de archivo Excel de horarios de trabajadores
// ============================================

export function parseHorariosExcel(data: any[]): HorarioTrabajadorInput[] {
  const horarios: HorarioTrabajadorInput[] = []
  let currentNombre = ''

  for (const row of data) {
    if (row.Nombre && String(row.Nombre).trim() !== 'nan') {
      currentNombre = String(row.Nombre).trim()
    }
    if (!currentNombre) continue
    const turno = String(row.Turno || '').trim()
    if (!turno) continue

    const parseHoras = (val: any): { inicio: string | null; fin: string | null } => {
      if (!val || String(val).trim() === 'nan' || String(val).trim() === 'Libre') {
        return { inicio: null, fin: null }
      }
      const str = String(val).trim()
      const m = str.match(/(\d{1,2}:\d{2})\s*a\s*(\d{1,2}:\d{2})/)
      if (m) return { inicio: m[1], fin: m[2] }
      return { inicio: null, fin: null }
    }

    const tipoTurno = String(row.Lunes || '').includes('4x4') ? '4x4' : 'fijo'

    let ciclo4x4Turno: string | null = null
    if (tipoTurno === '4x4') {
      const str = String(row.Lunes || '')
      if (str.startsWith('19:00')) ciclo4x4Turno = 'noche'
      else if (str.startsWith('07:00')) ciclo4x4Turno = 'dia'
    }

    const lunes = parseHoras(row.Lunes)
    const martes = parseHoras(row.Martes)
    const miercoles = parseHoras(row.Miércoles)
    const jueves = parseHoras(row.Jueves)
    const viernes = parseHoras(row.Viernes)
    const sabado = parseHoras(row.Sábado)

    horarios.push({
      nombreTrabajador: currentNombre, turno, tipoTurno,
      lunesInicio: lunes.inicio, lunesFin: lunes.fin,
      martesInicio: martes.inicio, martesFin: martes.fin,
      miercolesInicio: miercoles.inicio, miercolesFin: miercoles.fin,
      juevesInicio: jueves.inicio, juevesFin: jueves.fin,
      viernesInicio: viernes.inicio, viernesFin: viernes.fin,
      sabadoInicio: sabado.inicio, sabadoFin: sabado.fin,
      ciclo4x4Turno,
    })
  }
  return horarios
}

// ============================================
// Parser de archivo Excel/XLS de registro de asistencia
// ============================================

export function parseRegistroAsistenciaExcel(data: any[]): RegistroRelojInput[] {
  const registros: RegistroRelojInput[] = []
  for (const row of data) {
    if (!row.Nombre || !row['Fecha/Hora']) continue
    let fechaHora: Date
    const raw = row['Fecha/Hora']
    if (raw instanceof Date) {
      fechaHora = raw
    } else if (typeof raw === 'number') {
      const excelEpoch = new Date(1899, 11, 30)
      fechaHora = new Date(excelEpoch.getTime() + raw * 24 * 60 * 60 * 1000)
    } else if (typeof raw === 'string') {
      fechaHora = new Date(raw)
      if (isNaN(fechaHora.getTime())) {
        const m = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/)
        if (m) fechaHora = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4]), Number(m[5]), Number(m[6]))
      }
    } else continue
    if (isNaN(fechaHora.getTime())) continue

    const yyyy = fechaHora.getFullYear()
    const mm = String(fechaHora.getMonth() + 1).padStart(2, '0')
    const dd = String(fechaHora.getDate()).padStart(2, '0')
    const fecha = `${yyyy}-${mm}-${dd}`
    const hh = String(fechaHora.getHours()).padStart(2, '0')
    const min = String(fechaHora.getMinutes()).padStart(2, '0')
    const hora = `${hh}:${min}`

    registros.push({
      nombre: String(row.Nombre).trim(),
      rut: row.RUT ? String(row.RUT).trim() : null,
      fechaHora, fecha, hora,
      tipoRegistro: row['Tipo registro'] ? String(row['Tipo registro']).trim() : null,
      departamento: row.Departamento ? String(row.Departamento).trim() : null,
    })
  }
  return registros
}

// ============================================
// Calcular ciclo4x4Inicio basado en el primer registro
// ============================================

export function calcularCiclo4x4Inicio(
  horario: HorarioTrabajadorInput,
  registros: RegistroRelojInput[]
): string | null {
  if (horario.tipoTurno !== '4x4') return null

  const nombreNorm = normalizeName(horario.nombreTrabajador)
  const registrosTrabajador = registros.filter((r) => {
    if (normalizeName(r.nombre) === nombreNorm) return true
    return matchTrabajador(horario.nombreTrabajador, r.nombre)
  })

  registrosTrabajador.sort((a, b) => a.fechaHora.getTime() - b.fechaHora.getTime())

  const primerEntrada = registrosTrabajador.find((r) => r.tipoRegistro === 'Entrada')
  if (primerEntrada) {
    if (horario.ciclo4x4Turno === 'noche') {
      const primerSalidaMatutina = registrosTrabajador.find(
        (r) => r.tipoRegistro === 'Salida' && r.hora < '12:00'
      )
      if (primerSalidaMatutina && primerSalidaMatutina.fecha < primerEntrada.fecha) {
        const [y, m, d] = primerSalidaMatutina.fecha.split('-').map(Number)
        const fechaAnterior = new Date(y, m - 1, d - 1)
        return dateToFechaStr(fechaAnterior)
      }
    }
    return primerEntrada.fecha
  }

  const primerRegistro = registrosTrabajador[0]
  if (primerRegistro) {
    if (horario.ciclo4x4Turno === 'noche') {
      const [y, m, d] = primerRegistro.fecha.split('-').map(Number)
      const fechaAnterior = new Date(y, m - 1, d - 1)
      return dateToFechaStr(fechaAnterior)
    }
    return primerRegistro.fecha
  }
  return null
}
