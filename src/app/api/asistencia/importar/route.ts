/**
 * API para importar registros de asistencia.
 * Acepta 2 archivos:
 *   - horarios: HORARIOS TRABAJADORES.xlsx
 *   - registros: Registro asistencia .xls/.xlsx (del reloj control)
 *
 * Proceso:
 *   1. Parsea ambos archivos con xlsx
 *   2. Guarda horarios en HorarioTrabajador
 *   3. Guarda registros en RegistroAsistenciaReloj
 *   4. Calcula ciclo4x4Inicio para trabajadores 4x4
 *   5. Ejecuta el motor de análisis
 *   6. Guarda inasistencias/atrasos detectados en InasistenciaAtraso
 *   7. Devuelve resumen del análisis
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import {
  analizarAsistencia,
  parseHorariosExcel,
  parseRegistroAsistenciaExcel,
  calcularCiclo4x4Inicio,
} from '@/lib/asistencia-engine'

export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  // Solo admin y supervisor pueden importar
  if (session.user.rol !== 'admin' && session.user.rol !== 'supervisor') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const horariosFile = formData.get('horarios') as File | null
    const registrosFile = formData.get('registros') as File | null

    if (!horariosFile || !registrosFile) {
      return NextResponse.json(
        { error: 'Debe subir ambos archivos: horarios y registros de asistencia' },
        { status: 400 },
      )
    }

    // Leer archivos con xlsx
    const XLSX = await import('xlsx')
    const horariosBuffer = await horariosFile.arrayBuffer()
    const registrosBuffer = await registrosFile.arrayBuffer()

    const horariosWb = XLSX.read(horariosBuffer, { type: 'array' })
    const registrosWb = XLSX.read(registrosBuffer, { type: 'array' })

    // Parsear horarios
    const horariosSheet = horariosWb.Sheets[horariosWb.SheetNames[0]]
    const horariosRaw = XLSX.utils.sheet_to_json(horariosSheet)
    const horarios = parseHorariosExcel(horariosRaw as any[])

    // Parsear registros (saltar las 4 filas de metadata)
    const registrosSheet = registrosWb.Sheets[registrosWb.SheetNames[0]]
    const registrosRaw = XLSX.utils.sheet_to_json(registrosSheet, { range: 4 })
    const registros = parseRegistroAsistenciaExcel(registrosRaw as any[])

    if (horarios.length === 0) {
      return NextResponse.json({ error: 'No se encontraron horarios en el archivo' }, { status: 400 })
    }
    if (registros.length === 0) {
      return NextResponse.json({ error: 'No se encontraron registros de asistencia en el archivo' }, { status: 400 })
    }

    // Determinar rango de fechas de los registros (filtrar fechas inválidas como 1970)
    const fechas = registros
      .map((r) => r.fecha)
      .filter((f) => f && f >= '2000-01-01') // Ignorar fechas anteriores al año 2000
      .sort()
    if (fechas.length === 0) {
      return NextResponse.json({ error: 'No se encontraron fechas válidas en los registros' }, { status: 400 })
    }
    const fechaDesde = fechas[0]
    const fechaHasta = fechas[fechas.length - 1]

    // Calcular ciclo4x4Inicio para trabajadores 4x4
    for (const horario of horarios) {
      if (horario.tipoTurno === '4x4') {
        horario.ciclo4x4Inicio = calcularCiclo4x4Inicio(horario, registros)
      }
    }

    // Limpiar datos anteriores (en el rango de fechas)
    await db.registroAsistenciaReloj.deleteMany({
      where: { fecha: { gte: fechaDesde, lte: fechaHasta } },
    })
    await db.inasistenciaAtraso.deleteMany({
      where: { fecha: { gte: fechaDesde, lte: fechaHasta } },
    })

    // Guardar horarios (upsert por nombreTrabajador + turno)
    for (const horario of horarios) {
      await db.horarioTrabajador.upsert({
        where: {
          nombreTrabajador_turno: {
            nombreTrabajador: horario.nombreTrabajador,
            turno: horario.turno,
          },
        },
        update: {
          rut: horario.rut,
          tipoTurno: horario.tipoTurno,
          lunesInicio: horario.lunesInicio,
          lunesFin: horario.lunesFin,
          martesInicio: horario.martesInicio,
          martesFin: horario.martesFin,
          miercolesInicio: horario.miercolesInicio,
          miercolesFin: horario.miercolesFin,
          juevesInicio: horario.juevesInicio,
          juevesFin: horario.juevesFin,
          viernesInicio: horario.viernesInicio,
          viernesFin: horario.viernesFin,
          sabadoInicio: horario.sabadoInicio,
          sabadoFin: horario.sabadoFin,
          ciclo4x4Inicio: horario.ciclo4x4Inicio,
          ciclo4x4Turno: horario.ciclo4x4Turno,
        },
        create: {
          nombreTrabajador: horario.nombreTrabajador,
          rut: horario.rut,
          turno: horario.turno,
          tipoTurno: horario.tipoTurno,
          lunesInicio: horario.lunesInicio,
          lunesFin: horario.lunesFin,
          martesInicio: horario.martesInicio,
          martesFin: horario.martesFin,
          miercolesInicio: horario.miercolesInicio,
          miercolesFin: horario.miercolesFin,
          juevesInicio: horario.juevesInicio,
          juevesFin: horario.juevesFin,
          viernesInicio: horario.viernesInicio,
          viernesFin: horario.viernesFin,
          sabadoInicio: horario.sabadoInicio,
          sabadoFin: horario.sabadoFin,
          ciclo4x4Inicio: horario.ciclo4x4Inicio,
          ciclo4x4Turno: horario.ciclo4x4Turno,
        },
      })
    }

    // Guardar registros del reloj
    // (insertar en lotes de 100 para no saturar)
    const batchSize = 100
    for (let i = 0; i < registros.length; i += batchSize) {
      const batch = registros.slice(i, i + batchSize)
      await db.registroAsistenciaReloj.createMany({
        data: batch.map((r) => ({
          rut: r.rut,
          nombre: r.nombre,
          departamento: r.departamento,
          fechaHora: r.fechaHora,
          fecha: r.fecha,
          hora: r.hora,
          tipoRegistro: r.tipoRegistro,
        })),
      })
    }

    // Ejecutar análisis
    const resultado = analizarAsistencia(horarios, registros, fechaDesde, fechaHasta)

    // Guardar inasistencias detectadas
    for (const inas of resultado.inasistencias) {
      await db.inasistenciaAtraso.create({
        data: {
          nombreTrabajador: inas.nombreTrabajador,
          rut: inas.rut,
          departamento: inas.departamento,
          fecha: inas.fecha,
          diaSemana: inas.diaSemana,
          tipo: inas.tipo,
          horaEsperadaInicio: inas.horaEsperadaInicio,
          horaEsperadaFin: inas.horaEsperadaFin,
          horaRealInicio: inas.horaRealInicio,
          horaRealFin: inas.horaRealFin,
          minutosAtraso: inas.minutosAtraso,
          tipoTurno: inas.tipoTurno,
          estado: 'pendiente',
        },
      })
    }

    return NextResponse.json({
      success: true,
      message: `Importación completada. ${resultado.totalTrabajadores} trabajadores analizados.`,
      resumen: {
        totalTrabajadores: resultado.totalTrabajadores,
        totalDiasAnalizados: resultado.totalDiasAnalizados,
        totalAtrasos: resultado.totalAtrasos,
        totalAusencias: resultado.totalAusencias,
        totalSalidasTempranas: resultado.totalSalidasTempranas,
        totalDiasLibres: resultado.totalDiasLibres,
        totalDiasPresentes: resultado.totalDiasPresentes,
        fechaDesde,
        fechaHasta,
        registrosImportados: registros.length,
        horariosImportados: horarios.length,
      },
      resumenPorTrabajador: resultado.resumenPorTrabajador,
      inasistencias: resultado.inasistencias,
    })
  } catch (error) {
    console.error('Error importando asistencia:', error)
    return NextResponse.json(
      { error: 'Error al importar: ' + (error as Error).message },
      { status: 500 },
    )
  }
}

// GET - Obtener resumen del último análisis
export async function GET(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const fechaDesde = searchParams.get('fechaDesde') || ''
    const fechaHasta = searchParams.get('fechaHasta') || ''
    const estado = searchParams.get('estado') || ''

    const where: any = {}
    if (fechaDesde) where.fecha = { ...where.fecha, gte: fechaDesde }
    if (fechaHasta) where.fecha = { ...where.fecha, lte: fechaHasta }
    if (estado) where.estado = estado

    const inasistencias = await db.inasistenciaAtraso.findMany({
      where,
      include: {
        justificacion: true,
      },
      orderBy: [{ fecha: 'desc' }, { nombreTrabajador: 'asc' }],
    })

    // Estadísticas
    const stats = {
      total: inasistencias.length,
      atrasos: inasistencias.filter((i) => i.tipo === 'atraso').length,
      ausencias: inasistencias.filter((i) => i.tipo === 'ausencia').length,
      salidasTempranas: inasistencias.filter((i) => i.tipo === 'salida_temprana').length,
      colacionesExcedidas: inasistencias.filter((i) => i.tipo === 'colacion_excedida').length,
      pendientes: inasistencias.filter((i) => i.estado === 'pendiente').length,
      justificados: inasistencias.filter((i) => i.estado === 'justificado').length,
      aprobados: inasistencias.filter((i) => i.estado === 'aprobado').length,
      rechazados: inasistencias.filter((i) => i.estado === 'rechazado').length,
    }

    // Resumen por trabajador
    const porTrabajadorMap = new Map<string, any>()
    for (const inas of inasistencias) {
      const key = inas.nombreTrabajador
      if (!porTrabajadorMap.has(key)) {
        porTrabajadorMap.set(key, {
          nombre: inas.nombreTrabajador,
          departamento: inas.departamento,
          atrasos: 0,
          ausencias: 0,
          salidasTempranas: 0,
          colacionesExcedidas: 0,
          totalMinutosAtraso: 0,
          pendientes: 0,
          justificados: 0,
          aprobados: 0,
          rechazados: 0,
        })
      }
      const t = porTrabajadorMap.get(key)!
      if (inas.tipo === 'atraso') t.atrasos++
      if (inas.tipo === 'ausencia') t.ausencias++
      if (inas.tipo === 'salida_temprana') t.salidasTempranas++
      if (inas.tipo === 'colacion_excedida') t.colacionesExcedidas++
      t.totalMinutosAtraso += inas.minutosAtraso || 0
      if (inas.estado === 'pendiente') t.pendientes++
      if (inas.estado === 'justificado') t.justificados++
      if (inas.estado === 'aprobado') t.aprobados++
      if (inas.estado === 'rechazado') t.rechazados++
    }

    return NextResponse.json({
      inasistencias,
      stats,
      resumenPorTrabajador: Array.from(porTrabajadorMap.values()).sort(
        (a, b) => b.atrasos + b.ausencias - a.atrasos - a.ausencias,
      ),
    })
  } catch (error) {
    console.error('Error obteniendo análisis:', error)
    return NextResponse.json({ error: 'Error al obtener análisis' }, { status: 500 })
  }
}
