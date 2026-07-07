import { NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'

/**
 * ENDPOINT DE EXPORTACIÓN COMPLETA de la app móvil.
 *
 * Devuelve TODA la información en un solo JSON:
 * - Órdenes de Trabajo (con fotos antes/después en base64)
 * - Personal completo
 * - Estadísticas
 *
 * Uso: GET /api/movil/exportar
 * Devuelve: JSON con todo, listo para descargar como archivo.
 */
export async function GET() {
  try {
    // 1. Obtener todas las OT con sus fotos
    const ots = await withRetry(() =>
      db.ordenTrabajo.findMany({
        orderBy: { createdAt: 'desc' },
        take: 500,
      })
    )

    // 2. Obtener todo el personal
    const personal = await withRetry(() =>
      db.personal.findMany({
        orderBy: { nombre: 'asc' },
      })
    )

    // 3. Procesar OTs con fotos decodificadas
    const otsProcesadas = ots.map(ot => {
      let fotosAntes: string[] = []
      let fotosDespues: string[] = []

      try {
        if (ot.fotosAntes) fotosAntes = JSON.parse(ot.fotosAntes)
      } catch {}
      try {
        if (ot.fotosDespues) fotosDespues = JSON.parse(ot.fotosDespues)
      } catch {}

      return {
        id: ot.id,
        otNum: ot.otNum,
        titulo: ot.titulo,
        tipo: ot.tipo,
        prioridad: ot.prioridad,
        estado: ot.estado,
        ubicacion: ot.ubicacion,
        descripcion: ot.descripcion,
        fechaInicio: ot.fechaInicio,
        fechaLimite: ot.fechaLimite,
        fechaInicioReal: ot.fechaInicioReal,
        fechaFinReal: ot.fechaFinReal,
        progreso: ot.progreso,
        notas: ot.notas,
        estadoAprobacion: ot.estadoAprobacion,
        fotosAntes: fotosAntes,
        fotosDespues: fotosDespues,
        totalFotosAntes: fotosAntes.length,
        totalFotosDespues: fotosDespues.length,
        asignadoId: ot.asignadoId,
        createdAt: ot.createdAt.toISOString(),
        updatedAt: ot.updatedAt.toISOString(),
      }
    })

    // 4. Procesar personal
    const personalProcesado = personal.map(p => ({
      id: p.id,
      nombre: p.nombre,
      rut: p.rut,
      cargo: p.cargo,
      contrato: p.contrato,
      afp: p.afp,
      salud: p.salud,
      mutual: p.mutual,
      fechaIngreso: p.fechaIngreso,
      sueldoBase: p.sueldoBase,
      movilizacion: p.movilizacion,
      colacion: p.colacion,
      estado: p.estado,
      email: p.email,
      telefono: p.telefono,
      foto: p.foto,
    }))

    // 5. Estadísticas
    const totalFotosAntes = otsProcesadas.reduce((s, o) => s + o.fotosAntes.length, 0)
    const totalFotosDespues = otsProcesadas.reduce((s, o) => s + o.fotosDespues.length, 0)
    const totalFotos = totalFotosAntes + totalFotosDespues

    // Calcular tamaño aproximado de fotos
    let tamañoFotosMB = 0
    for (const ot of otsProcesadas) {
      for (const f of [...ot.fotosAntes, ...ot.fotosDespues]) {
        tamañoFotosMB += f.length
      }
    }
    tamañoFotosMB = Math.round((tamañoFotosMB / (1024 * 1024)) * 100) / 100

    const resultado = {
      metadata: {
        fecha_exportacion: new Date().toISOString(),
        sistema: 'Laguna Norte - App Móvil + Sistema de Escritorio',
        version: '1.0',
        descripcion: 'Exportación completa de datos: OT con fotos, personal, estadísticas',
      },
      estadisticas: {
        total_ots: otsProcesadas.length,
        total_personal: personalProcesado.length,
        total_fotos_antes: totalFotosAntes,
        total_fotos_despues: totalFotosDespues,
        total_fotos: totalFotos,
        tamaño_fotos_mb: tamañoFotosMB,
        ots_por_estado: {
          Pendiente: otsProcesadas.filter(o => o.estado === 'Pendiente').length,
          'En Progreso': otsProcesadas.filter(o => o.estado === 'En Progreso').length,
          Completado: otsProcesadas.filter(o => o.estado === 'Completado').length,
          Cancelado: otsProcesadas.filter(o => o.estado === 'Cancelado').length,
        },
      },
      ordenes_trabajo: otsProcesadas,
      personal: personalProcesado,
    }

    return NextResponse.json(resultado, {
      headers: {
        'Content-Disposition': `attachment; filename="exportacion_laguna_norte_${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (error) {
    console.error('Error exportando datos:', error)
    return NextResponse.json(
      { error: 'Error exportando datos', detalle: String(error) },
      { status: 500 }
    )
  }
}
