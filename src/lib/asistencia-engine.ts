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
  // Marcas del reloj (4 marcas: 1a entrada, 1a salida, 2a entrada, 2a salida)
  primeraEntrada?: string | null
  primeraSalida?: string | null   // salida a colacion
  segundaEntrada?: string | null  // regreso de colacion
  segundaSalida?: string | null   // fin de jornada
  minutosColacion?: number | null // tiempo real de colacion (1a salida -> 2a entrada)
}

// ============================================
// Helpers
// ============================================

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

function getDiaSemana(fecha: Date): string {
  return DIAS_SEMANA[fecha.getDay()]
}

function getDiaSemanaFromStr(fechaStr: string): string {
  const [y, m, d] = fechaStr.split('-').map(Number)
  return DIAS_SEMANA[new Date(y, m - 1, d).getDay()]
}

function parseHora(horaStr: string): number {
  // "07:30" → 450 (minutos desde medianoche)
  const [h, m] = horaStr.split(':').map(Number)
  return h * 60 + m
}

function formatHora(minutos: number): string {
  const h = Math.floor(minutos / 60) % 24
  const m = minutos % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function fechaStrToDate(fechaStr: string): Date {
  const [y, m, d] = fechaStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function addDays(fechaStr: string, days: number): string {
  const d = fechaStrToDate(fechaStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

// Normaliza nombre para comparación (mayúsculas, sin espacios extra, sin acentos)
function normalizeName(nombre: string): string {
  return (nombre || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Genera un conjunto de "tokens" de búsqueda (palabras de 3+ caracteres)
function getNameTokens(nombre: string): string[] {
  const norm = normalizeName(nombre)
  return norm.split(' ').filter((t) => t.length > 2)
}

// ============================================
// Obtener horario esperado para un día específico (turno fijo)
// ============================================

function getHorarioEsperadoFijo(horario: HorarioTrabajador, fechaStr: string): {
  inicio: string | null
  fin: string | null
  esLibre: boolean
} {
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
      // Por defecto libre (a menos que el horario diga lo contrario)
      return { inicio: null, fin: null, esLibre: true }
  }

  if (!inicio || !fin) {
    return { inicio: null, fin: null, esLibre: true }
  }
  return { inicio, fin, esLibre: false }
}

// ============================================
// Obtener horario esperado para 4x4
// ============================================

function getHorarioEsperado4x4(horario: HorarioTrabajador, fechaStr: string): {
  inicio: string | null
  fin: string | null
  esLibre: boolean
} {
  if (!horario.ciclo4x4Inicio) {
    // Si no hay fecha de inicio del ciclo, no podemos calcular
    return { inicio: null, fin: null, esLibre: false }
  }

  const cicloInicio = fechaStrToDate(horario.ciclo4x4Inicio)
  const fechaActual = fechaStrToDate(fechaStr)
  const diffMs = fechaActual.getTime() - cicloInicio.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  // Ciclo de 8 días: 4 trabajo + 4 libres
  const diaEnCiclo = ((diffDays % 8) + 8) % 8

  if (diaEnCiclo < 4) {
    // Día de trabajo
    if (horario.ciclo4x4Turno === 'noche') {
      return { inicio: '19:00', fin: '07:00', esLibre: false }
    } else {
      return { inicio: '07:00', fin: '19:00', esLibre: false }
    }
  } else {
    // Día libre
    return { inicio: null, fin: null, esLibre: true }
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

  // 1. Coincidencia exacta normalizada
  if (n1 === n2) return true

  // 2. Coincidencia por tokens (todos los tokens del mas corto estan en el mas largo)
  const tokens1 = getNameTokens(nombreHorario)
  const tokens2 = getNameTokens(nombreRegistro)
  const shorter = tokens1.length <= tokens2.length ? tokens1 : tokens2
  const longer = tokens1.length <= tokens2.length ? tokens2 : tokens1
  const allShorterInLonger = shorter.every((t) => longer.includes(t))
  if (allShorterInLonger && shorter.length >= 2) return true

  // 3. Coincidencia por ultimos 2 tokens (apellidos)
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

const TOLERANCIA_MINUTOS = 5

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


function getLunesDeSemana(fechaStr: string): string {
  const [y, m, d] = fechaStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const dia = date.getDay()
  const diff = dia === 0 ? -6 : 1 - dia
  date.setDate(date.getDate() + diff)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function analizarAsistencia(
  horarios: HorarioTrabajador[],
  registros: RegistroReloj[],
  fechaDesde: string,
  fechaHasta: string
): ResultadoAnalisis {
  const inasistencias: InasistenciaDetectada[] = []
  const resumenPorTrabajador: ResultadoAnalisis['resumenPorTrabajador'] = []

  // Agrupar registros por trabajador (nombre normalizado) y por fecha
  const registrosPorTrabajador = new Map<string, RegistroReloj[]>()
  for (const reg of registros) {
    const key = normalizeName(reg.nombre)
    if (!registrosPorTrabajador.has(key)) {
      registrosPorTrabajador.set(key, [])
    }
    registrosPorTrabajador.get(key)!.push(reg)
  }

  // Generar lista de fechas en el rango
  const fechas: string[] = []
  let fechaActual = fechaDesde
  while (fechaActual <= fechaHasta) {
    fechas.push(fechaActual)
    fechaActual = addDays(fechaActual, 1)
  }

  let totalDiasAnalizados = 0
  let totalAtrasos = 0
  let totalAusencias = 0
  let totalSalidasTempranas = 0
  let totalDiasLibres = 0
  let totalDiasPresentes = 0
  let totalColacionesExcedidas = 0

  // Agrupar horarios por trabajador (un trabajador puede tener TURNO A y TURNO B)
  const horariosPorTrabajador = new Map<string, HorarioTrabajador[]>()
  for (const h of horarios) {
    const key = normalizeName(h.nombreTrabajador)
    if (!horariosPorTrabajador.has(key)) horariosPorTrabajador.set(key, [])
    horariosPorTrabajador.get(key)!.push(h)
  }

  // Para cada trabajador (con todos sus turnos agrupados)
  for (const [trabajadorKey, turnosTrabajador] of horariosPorTrabajador) {
    const horarioA = turnosTrabajador.find((h) => h.turno === 'TURNO A') || turnosTrabajador[0]
    const horarioB = turnosTrabajador.find((h) => h.turno === 'TURNO B')

    // Buscar registros que coincidan con este trabajador
    let registrosMatch = registrosPorTrabajador.get(trabajadorKey) || []
    if (registrosMatch.length === 0) {
      for (const [key, regs] of registrosPorTrabajador.entries()) {
        if (regs.length > 0 && matchTrabajador(horarioA.nombreTrabajador, regs[0].nombre)) {
          registrosMatch = regs
          break
        }
      }
    }

    // Agrupar registros por fecha, ordenados por hora
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

    // Agrupar fechas por semana (lunes a sabado)
    const semanasMap = new Map<string, string[]>()
    for (const fecha of fechas) {
      const lunes = getLunesDeSemana(fecha)
      if (!semanasMap.has(lunes)) semanasMap.set(lunes, [])
      semanasMap.get(lunes)!.push(fecha)
    }

    // Por cada semana, determinar el turno activo
    for (const [, fechasSemana] of semanasMap) {
      // Buscar el primer registro de entrada de la semana
      let primerRegistroSemana: RegistroReloj | null = null
      for (const fecha of fechasSemana) {
        const grupo = registrosPorFecha.get(fecha)
        if (grupo && grupo.entradas.length > 0) {
          primerRegistroSemana = grupo.entradas[0]
          break
        }
      }

      // Determinar turno activo comparando el primer registro con A y B
      let turnoActivo = horarioA
      if (primerRegistroSemana && horarioB) {
        const horaReal = parseHora(primerRegistroSemana.hora)
        const inicioA = horarioA.lunesInicio ? parseHora(horarioA.lunesInicio) : 9999
        const inicioB = horarioB.lunesInicio ? parseHora(horarioB.lunesInicio) : 9999
        const diffA = Math.abs(horaReal - inicioA)
        const diffB = Math.abs(horaReal - inicioB)
        if (diffB < diffA) {
          turnoActivo = horarioB
        }
      }

      // Analizar cada fecha de la semana con el turno activo
      for (const fecha of fechasSemana) {
        totalDiasAnalizados++

        let horarioEsperado: { inicio: string | null; fin: string | null; esLibre: boolean }
        if (turnoActivo.tipoTurno === '4x4') {
          horarioEsperado = getHorarioEsperado4x4(turnoActivo, fecha)
        } else {
          horarioEsperado = getHorarioEsperadoFijo(turnoActivo, fecha)
        }

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
          if (horarioEsperado.inicio === '19:00' && horaRealMin < 12 * 60) {
            minutosAtraso = 0
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

          if (primeraSalida && segundaEntrada) {
            const minSalidaColacion = parseHora(primeraSalida.hora)
            const minRegresoColacion = parseHora(segundaEntrada.hora)
            let minutosColacion = minRegresoColacion - minSalidaColacion
            if (minutosColacion < 0) minutosColacion += 24 * 60
            if (minutosColacion > 65) {
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

          if (segundaSalida && horarioEsperado.fin) {
            const horaSalidaReal = parseHora(segundaSalida.hora)
            const horaSalidaEsperada = parseHora(horarioEsperado.fin)
            let minutosSalidaTemprana = horaSalidaEsperada - horaSalidaReal
            if (horarioEsperado.fin === '07:00' && horaSalidaReal > 12 * 60) {
              minutosSalidaTemprana = 0
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
    totalTrabajadores: horarios.length,
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
// Parser de archivo Excel de horarios
// ============================================

export function parseHorariosExcel(data: any[]): HorarioTrabajador[] {
  const horarios: HorarioTrabajador[] = []
  let currentNombre = ''

  for (const row of data) {
    // Ffill nombre (NaN → usar el anterior)
    if (row.Nombre && String(row.Nombre).trim() !== 'nan') {
      currentNombre = String(row.Nombre).trim()
    }

    if (!currentNombre) continue

    const turno = String(row.Turno || '').trim()
    if (!turno) continue

    // Parsear "07:00 a 15:00" → inicio=07:00, fin=15:00
    const parseHoras = (val: any): { inicio: string | null; fin: string | null } => {
      if (!val || String(val).trim() === 'nan' || String(val).trim() === 'Libre') {
        return { inicio: null, fin: null }
      }
      const str = String(val).trim()
      const m = str.match(/(\d{1,2}:\d{2})\s*a\s*(\d{1,2}:\d{2})/)
      if (m) {
        return { inicio: m[1], fin: m[2] }
      }
      return { inicio: null, fin: null }
    }

    // Detectar si es 4x4
    const tipoTurno = String(row.Lunes || '').includes('4x4') ? '4x4' : 'fijo'

    // Para 4x4, extraer el turno (dia/noche) del horario
    let ciclo4x4Turno: string | null = null
    if (tipoTurno === '4x4') {
      const str = String(row.Lunes || '')
      if (str.startsWith('19:00')) {
        ciclo4x4Turno = 'noche'
      } else if (str.startsWith('07:00')) {
        ciclo4x4Turno = 'dia'
      }
    }

    const lunes = parseHoras(row.Lunes)
    const martes = parseHoras(row.Martes)
    const miercoles = parseHoras(row.Miércoles)
    const jueves = parseHoras(row.Jueves)
    const viernes = parseHoras(row.Viernes)
    const sabado = parseHoras(row.Sábado)

    horarios.push({
      nombreTrabajador: currentNombre,
      turno,
      tipoTurno,
      lunesInicio: lunes.inicio,
      lunesFin: lunes.fin,
      martesInicio: martes.inicio,
      martesFin: martes.fin,
      miercolesInicio: miercoles.inicio,
      miercolesFin: miercoles.fin,
      juevesInicio: jueves.inicio,
      juevesFin: jueves.fin,
      viernesInicio: viernes.inicio,
      viernesFin: viernes.fin,
      sabadoInicio: sabado.inicio,
      sabadoFin: sabado.fin,
      ciclo4x4Turno,
      // ciclo4x4Inicio se calculará después (basado en el primer registro de entrada)
    })
  }

  return horarios
}

// ============================================
// Parser de archivo Excel/XLS de registro de asistencia del reloj
// ============================================

export function parseRegistroAsistenciaExcel(data: any[]): RegistroReloj[] {
  const registros: RegistroReloj[] = []

  for (const row of data) {
    if (!row.Nombre || !row['Fecha/Hora']) continue

    let fechaHora: Date

    // Detectar si Fecha/Hora es un número (formato serial de Excel) o un string/Date
    const raw = row['Fecha/Hora']
    if (raw instanceof Date) {
      fechaHora = raw
    } else if (typeof raw === 'number') {
      // Excel serial date: días desde 1899-12-30
      // Excel epoch = 1899-12-30 = 25569 días antes de 1970-01-01
      const excelEpoch = new Date(1899, 11, 30)
      fechaHora = new Date(excelEpoch.getTime() + raw * 24 * 60 * 60 * 1000)
    } else if (typeof raw === 'string') {
      // Probar formatos comunes: "2026-06-30 19:16:35", "30/06/2026 19:16:35"
      fechaHora = new Date(raw)
      if (isNaN(fechaHora.getTime())) {
        // Probar formato DD/MM/YYYY HH:MM:SS
        const m = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/)
        if (m) {
          fechaHora = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]), Number(m[4]), Number(m[5]), Number(m[6]))
        }
      }
    } else {
      continue
    }

    if (isNaN(fechaHora.getTime())) continue

    // Formatear fecha y hora usando métodos locales (no UTC) para evitar desfase
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
      fechaHora,
      fecha,
      hora,
      tipoRegistro: row['Tipo registro'] ? String(row['Tipo registro']).trim() : null,
      departamento: row.Departamento ? String(row.Departamento).trim() : null,
    })
  }

  return registros
}

// ============================================
// Calcular ciclo4x4Inicio basado en el primer registro de entrada
// ============================================

export function calcularCiclo4x4Inicio(
  horario: HorarioTrabajador,
  registros: RegistroReloj[]
): string | null {
  if (horario.tipoTurno !== '4x4') return null

  // Buscar el primer registro de entrada de este trabajador
  const nombreNorm = normalizeName(horario.nombreTrabajador)
  const registrosTrabajador = registros.filter((r) => {
    if (normalizeName(r.nombre) === nombreNorm) return true
    return matchTrabajador(horario.nombreTrabajador, r.nombre)
  })

  // Ordenar por fecha
  registrosTrabajador.sort((a, b) => a.fechaHora.getTime() - b.fechaHora.getTime())

  // Buscar el primer día con entrada
  const primerRegistro = registrosTrabajador.find((r) => r.tipoRegistro === 'Entrada')
  if (!primerRegistro) return null

  // El ciclo inicia en ese día (es el primer día de trabajo del ciclo 4x4)
  return primerRegistro.fecha
}
