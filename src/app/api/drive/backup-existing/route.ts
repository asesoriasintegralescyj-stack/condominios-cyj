import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  verifyDriveConfig,
  getDriveClient,
  getParentFolderId,
  listFolders,
  findOrCreateFolder,
  uploadFile,
  uploadBase64Image,
  parseFotos,
  findProjectFolder,
  findSCFolderInProject,
  findOTFolderInProject,
} from '@/lib/google-drive'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutos para respaldar todo

export async function GET() {
  if (!verifyDriveConfig()) {
    return NextResponse.json({ error: 'Google Drive no configurado. Faltan variables de entorno.' }, { status: 500 })
  }

  const stats = { proyectos: 0, ots: 0, scs: 0, fotos: 0, errores: 0 as number }
  const log: string[] = []
  const logIt = (msg: string) => { console.log(`[Backup] ${msg}`); log.push(msg) }

  try {
    const parentFolderId = getParentFolderId()
    logIt(`Carpeta padre: ${parentFolderId}`)

    // ══════════════════════════════════════════════════════════════════════════
    // 1. OBTENER TODOS LOS DATOS
    // ══════════════════════════════════════════════════════════════════════════

    // Proyectos con relaciones completas
    const proyectos = await db.proyecto.findMany({
      where: { OR: [{ condominioId: 'cmo9f3x7j0000ktyeb0rzhwt9' }, { condominioId: null }] },
      include: { materiales: true, herramientas: true, tareas: true, personal: true, documentos: true, centroCosto: { select: { id: true, codigo: true, nombre: true } } },
      orderBy: { createdAt: 'asc' },
    })
    logIt(`Proyectos encontrados: ${proyectos.length}`)

    // OTs con relaciones
    const ots = await db.ordenTrabajo.findMany({
      include: { materiales: true, herramientas: true, tareas: true, personalOT: true, propiedad: { select: { id: true, nombre: true } }, asignado: { select: { id: true, nombre: true, cargo: true } }, centroCosto: { select: { id: true, codigo: true, nombre: true } } },
      orderBy: { createdAt: 'asc' },
    })
    logIt(`OTs encontradas: ${ots.length}`)

    // Solicitudes de compra
    const scs = await db.solicitudCompra.findMany({
      orderBy: { createdAt: 'asc' },
    })
    logIt(`Solicitudes de compra: ${scs.length}`)

    // ══════════════════════════════════════════════════════════════════════════
    // 2. MAPA: SC/OT → Proyecto (para ubicarlas en la carpeta correcta)
    // ══════════════════════════════════════════════════════════════════════════

    // proyectoDriveMap: proyectoId → folderId en Drive
    const proyectoDriveMap: Record<string, string> = {}
    // proyectoCodigoMap: proyectoId → codigo
    const proyectoCodigoMap: Record<string, string> = {}
    // proyectoScFolderMap: proyectoId → scFolderId
    const proyectoScFolderMap: Record<string, string | null> = {}
    // proyectoOtFolderMap: proyectoId → otFolderId
    const proyectoOtFolderMap: Record<string, string | null> = {}

    // Obtener carpetas existentes en Drive
    const existingFolders = await listFolders(parentFolderId)
    logIt(`Carpetas existentes en Drive: ${existingFolders.length}`)

    // ══════════════════════════════════════════════════════════════════════════
    // 3. PROCESAR PROYECTOS: crear carpetas + subir datos + fotos
    // ══════════════════════════════════════════════════════════════════════════

    for (const p of proyectos) {
      const codigo = p.codigo || `SIN-CODIGO-${p.id.substring(0, 6)}`
      const folderName = `${codigo} - ${p.nombre}`.substring(0, 200)
      proyectoCodigoMap[p.id] = codigo

      try {
        // Buscar o crear carpeta del proyecto
        let proyectoFolderId = proyectoDriveMap[p.id]
        if (!proyectoFolderId) {
          const existing = existingFolders.find(f => f.name.startsWith(`${codigo} -`) || f.name.startsWith(`${codigo} `))
          if (existing) {
            proyectoFolderId = existing.id
          } else {
            proyectoFolderId = await findOrCreateFolder(folderName, parentFolderId)
          }
          if (proyectoFolderId) {
            proyectoDriveMap[p.id] = proyectoFolderId
          }
        }

        if (!proyectoFolderId) {
          logIt(`ERROR: No se pudo crear carpeta para ${codigo}`)
          stats.errores++
          continue
        }

        // Crear subcarpetas
        const scFolderId = await findOrCreateFolder('Solicitudes de Compra', proyectoFolderId)
        const docsFolderId = await findOrCreateFolder('Documentos', proyectoFolderId)
        const fotosFolderId = await findOrCreateFolder('Fotos', proyectoFolderId)
        const antesFolderId = fotosFolderId ? await findOrCreateFolder('Antes', fotosFolderId) : null
        const despuesFolderId = fotosFolderId ? await findOrCreateFolder('Despues', fotosFolderId) : null
        const otFolderId = await findOrCreateFolder('Ordenes de Trabajo', proyectoFolderId)

        proyectoScFolderMap[p.id] = scFolderId
        proyectoOtFolderMap[p.id] = otFolderId

        // Subir JSON del proyecto (sobrescribir si existe)
        const proyectoData = {
          codigo: p.codigo,
          nombre: p.nombre,
          categoria: p.categoria,
          estado: p.estado,
          ubicacion: p.ubicacion,
          fechaInicio: p.fechaInicio,
          fechaFin: p.fechaFin,
          presProg: p.presProg,
          presUsado: p.presUsado,
          avance: p.avance,
          descripcion: p.descripcion,
          notas: p.notas,
          sector: p.sector,
          tipoReparacion: p.tipoReparacion,
          tipoTrabajo: p.tipoTrabajo,
          prioridad: p.prioridad,
          estadoAprobacion: p.estadoAprobacion,
          responsable: p.responsable,
          responsableExterno: p.responsableExterno,
          tiempoEstimado: p.tiempoEstimado,
          monto: p.monto,
          fechaInicioReal: p.fechaInicioReal,
          fechaFinReal: p.fechaFinReal,
          comentarios: p.comentarios,
          centroCosto: p.centroCosto,
          materiales: p.materiales,
          herramientas: p.herramientas,
          tareas: p.tareas,
          personal: p.personal,
          documentosCount: p.documentos?.length || 0,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
          _backupDate: new Date().toISOString(),
        }
        await uploadFile(
          `${codigo} - Datos del Proyecto.json`,
          JSON.stringify(proyectoData, null, 2),
          'application/json',
          proyectoFolderId,
          `${codigo} - Datos del Proyecto.json`
        )

        // Subir fotos antes
        const fotosAntes = parseFotos(p.fotosAntes)
        if (antesFolderId && fotosAntes.length > 0) {
          for (let i = 0; i < fotosAntes.length; i++) {
            const ok = await uploadBase64Image(fotosAntes[i], `${codigo}_antes_${i + 1}`, antesFolderId)
            if (ok) stats.fotos++
          }
        }

        // Subir fotos después
        const fotosDespues = parseFotos(p.fotosDespues)
        if (despuesFolderId && fotosDespues.length > 0) {
          for (let i = 0; i < fotosDespues.length; i++) {
            const ok = await uploadBase64Image(fotosDespues[i], `${codigo}_despues_${i + 1}`, despuesFolderId)
            if (ok) stats.fotos++
          }
        }

        stats.proyectos++
        logIt(`Proyecto ${codigo} OK (fotos: ${fotosAntes.length} antes, ${fotosDespues.length} despues)`)
      } catch (e: any) {
        logIt(`ERROR proyecto ${codigo}: ${e.message}`)
        stats.errores++
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 4. PROCESAR OTs: ubicar en carpeta del proyecto o en raíz
    // ══════════════════════════════════════════════════════════════════════════

    for (const ot of ots) {
      try {
        // Determinar dónde va la OT: si tiene proyectoId, buscar su carpeta
        let otParentFolderId = parentFolderId // default: raíz
        // Buscar si esta OT está vinculada a un proyecto
        // OT NO tiene relación directa a Proyecto, pero puede tener centroCostoId
        // que coincida con el de un proyecto. Usamos una heurística: buscamos
        // si hay un proyecto con el mismo centroCosto.
        // Para simplificar, ponemos las OTs sin proyectoId en la raíz.
        // Si en el futuro se agrega proyectoId a OT, usarlo directamente.

        // Verificar si ya existe una carpeta para esta OT
        // (las OTs vinculadas a proyectos se crean DENTRO de la carpeta del proyecto)
        const otFolderName = ot.otNum
        let otFolderId = await findOrCreateFolder(otFolderName, otParentFolderId)
        if (!otFolderId) {
          logIt(`ERROR: No se pudo crear carpeta para OT ${ot.otNum}`)
          stats.errores++
          continue
        }

        // Crear subcarpetas de fotos
        const otAntesFolderId = await findOrCreateFolder('Fotos Antes', otFolderId)
        const otDespuesFolderId = await findOrCreateFolder('Fotos Despues', otFolderId)

        // Subir JSON de la OT
        const otData = {
          otNum: ot.otNum,
          titulo: ot.titulo,
          tipo: ot.tipo,
          prioridad: ot.prioridad,
          estado: ot.estado,
          ubicacion: ot.ubicacion,
          fechaInicio: ot.fechaInicio,
          fechaLimite: ot.fechaLimite,
          fechaInicioReal: ot.fechaInicioReal,
          fechaFinReal: ot.fechaFinReal,
          costoEstimado: ot.costoEstimado,
          costoReal: ot.costoReal,
          progreso: ot.progreso,
          descripcion: ot.descripcion,
          tiempoEst: ot.tiempoEst,
          tiempoReal: ot.tiempoReal,
          valorHora: ot.valorHora,
          estadoAprobacion: ot.estadoAprobacion,
          formaPago: ot.formaPago,
          notas: ot.notas?.replace(/\[IDEM:[^\]]+\]\s*/g, ''), // limpiar token de idempotencia
          propiedad: ot.propiedad,
          asignado: ot.asignado,
          centroCosto: ot.centroCosto,
          materiales: ot.materiales,
          herramientas: ot.herramientas,
          tareas: ot.tareas,
          personalOT: ot.personalOT,
          creadoPor: ot.creadoPorNombre,
          createdAt: ot.createdAt,
          updatedAt: ot.updatedAt,
          _backupDate: new Date().toISOString(),
        }
        await uploadFile(
          `${ot.otNum} - Datos OT.json`,
          JSON.stringify(otData, null, 2),
          'application/json',
          otFolderId,
          `${ot.otNum} - Datos OT.json`
        )

        // Subir fotos antes de la OT
        const fotosAntes = parseFotos(ot.fotosAntes)
        if (otAntesFolderId && fotosAntes.length > 0) {
          for (let i = 0; i < fotosAntes.length; i++) {
            const ok = await uploadBase64Image(fotosAntes[i], `${ot.otNum}_antes_${i + 1}`, otAntesFolderId)
            if (ok) stats.fotos++
          }
        }

        // Subir fotos después de la OT
        const fotosDespues = parseFotos(ot.fotosDespues)
        if (otDespuesFolderId && fotosDespues.length > 0) {
          for (let i = 0; i < fotosDespues.length; i++) {
            const ok = await uploadBase64Image(fotosDespues[i], `${ot.otNum}_despues_${i + 1}`, otDespuesFolderId)
            if (ok) stats.fotos++
          }
        }

        stats.ots++
        logIt(`OT ${ot.otNum} OK (fotos: ${fotosAntes.length} antes, ${fotosDespues.length} despues)`)
      } catch (e: any) {
        logIt(`ERROR OT ${ot.otNum}: ${e.message}`)
        stats.errores++
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 5. PROCESAR SOLICITUDES DE COMPRA: ubicar en carpeta del proyecto
    // ══════════════════════════════════════════════════════════════════════════

    for (const sc of scs) {
      try {
        // Determinar la carpeta de SC: buscar la carpeta del proyecto
        let scFolderId: string | null = null

        if (sc.origenTipo === 'Proyecto' && sc.origenId && proyectoScFolderMap[sc.origenId]) {
          scFolderId = proyectoScFolderMap[sc.origenId]
        } else if (sc.origenTipo === 'OT') {
          // Las SC de OT van en la raíz o buscar su proyecto
          // Primero buscar si la OT tiene un proyecto asociado
          scFolderId = null // Se pondrá en carpeta genérica
        }

        // Si no se encontró carpeta específica, crear una carpeta genérica de SCs
        if (!scFolderId) {
          scFolderId = await findOrCreateFolder('Solicitudes de Compra (Sin Proyecto)', parentFolderId)
        }

        if (!scFolderId) {
          logIt(`ERROR: No se pudo encontrar carpeta para SC ${sc.codigo}`)
          stats.errores++
          continue
        }

        // Generar TXT detallado de la SC
        const materiales = sc.materiales ? (() => { try { return JSON.parse(sc.materiales) } catch { return [] } })() : []
        const links = sc.links ? (() => { try { return JSON.parse(sc.links) } catch { return [] } })() : []

        let txtContent = `SOLICITUD DE COMPRA: ${sc.codigo}\n`
        txtContent += `${'='.repeat(60)}\n\n`
        txtContent += `Titulo: ${sc.titulo}\n`
        txtContent += `Descripcion: ${sc.descripcion || 'Sin descripcion'}\n\n`
        txtContent += `--- Estado y Prioridad ---\n`
        txtContent += `Estado: ${sc.estado}\n`
        txtContent += `Prioridad: ${sc.prioridad}\n`
        txtContent += `Etapa de Aprobacion: ${sc.etapaAprobacion}\n\n`
        txtContent += `--- Origen ---\n`
        txtContent += `Tipo de Origen: ${sc.origenTipo || 'Manual'}\n`
        txtContent += `Codigo Origen: ${sc.origenCodigo || 'N/A'}\n\n`
        txtContent += `--- Solicitante ---\n`
        txtContent += `Solicitado por: ${sc.solicitadoPor || 'N/A'}\n`
        txtContent += `Fecha Solicitud: ${sc.fechaSolicitud}\n`
        txtContent += `Fecha Esperada: ${sc.fechaEspera || 'N/A'}\n`
        txtContent += `Proveedor Sugerido: ${sc.proveedorSugerido || 'N/A'}\n\n`
        txtContent += `--- Materiales (${materiales.length}) ---\n`
        if (materiales.length > 0) {
          materiales.forEach((m: any, i: number) => {
            txtContent += `  ${i + 1}. ${m.nombre || m.descripcion || 'Sin nombre'}\n`
            txtContent += `     Cantidad: ${m.cantidad} ${m.unidad || 'unidad'}\n`
            txtContent += `     Precio Estimado: $${Number(m.precioEstimado || 0).toLocaleString('es-CL')}\n`
            txtContent += `     Total: $${Number(m.total || 0).toLocaleString('es-CL')}\n`
            if (m.mejorPrecio) txtContent += `     Mejor Precio: $${Number(m.mejorPrecio).toLocaleString('es-CL')} (${m.mejorTienda || 'N/A'})\n`
            if (m.mejorUrl) txtContent += `     Link: ${m.mejorUrl}\n`
          })
        } else {
          txtContent += `  (Sin materiales)\n`
        }
        txtContent += `\nTotal Estimado: $${Number(sc.totalEstimado || 0).toLocaleString('es-CL')}\n\n`
        if (links.length > 0) {
          txtContent += `--- Links de Compra ---\n`
          links.forEach((l: string, i: number) => {
            txtContent += `  ${i + 1}. ${l}\n`
          })
          txtContent += '\n'
        }
        txtContent += `--- Aprobacion ---\n`
        if (sc.supervisorAprobadorNombre) {
          txtContent += `Supervisor: ${sc.supervisorAprobadorNombre} - ${sc.supervisorFechaAprobacion || 'Pendiente'}\n`
          if (sc.supervisorObservaciones) txtContent += `  Obs: ${sc.supervisorObservaciones}\n`
        }
        if (sc.adminAprobadorNombre) {
          txtContent += `Admin: ${sc.adminAprobadorNombre} - ${sc.adminFechaAprobacion || 'Pendiente'}\n`
          if (sc.adminObservaciones) txtContent += `  Obs: ${sc.adminObservaciones}\n`
        }
        if (!sc.supervisorAprobadorNombre && !sc.adminAprobadorNombre) {
          txtContent += `  Pendiente de aprobacion\n`
        }
        txtContent += `\n--- Observaciones ---\n${sc.observaciones || 'Sin observaciones'}\n`
        txtContent += `\n--- Metadatos ---\n`
        txtContent += `Creado: ${sc.createdAt}\n`
        txtContent += `Actualizado: ${sc.updatedAt}\n`
        txtContent += `Backup: ${new Date().toISOString()}\n`

        await uploadFile(
          `${sc.codigo} - ${sc.titulo.replace(/[/\\]/g, '-')}.txt`,
          txtContent,
          'text/plain',
          scFolderId,
          `${sc.codigo} - *.txt` // sobrescribir cualquier version anterior del mismo SC
        )

        stats.scs++
        logIt(`SC ${sc.codigo} OK → carpeta ${scFolderId}`)
      } catch (e: any) {
        logIt(`ERROR SC ${sc.codigo}: ${e.message}`)
        stats.errores++
      }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 6. RESULTADO
    // ══════════════════════════════════════════════════════════════════════════

    return NextResponse.json({
      success: true,
      message: 'Backup completado',
      stats,
      log,
    })
  } catch (error: any) {
    console.error('[Backup] Error general:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stats,
      log,
    }, { status: 500 })
  }
}
