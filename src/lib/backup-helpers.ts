// Backup helper functions - fire-and-forget pattern for non-critical Drive uploads
// Usage: void backupProyectoToDrive(proyectoId) - runs in background, doesn't block response

import { db } from './db'
import {
  createProjectFolderStructure,
  createOTFolderStructure,
  uploadFile,
  uploadBase64Image,
  getParentFolderId,
  parsePhotoArray,
} from './google-drive'

// ============================================================
// BACKUP PROYECTO
// ============================================================

export async function backupProyectoToDrive(proyectoId: string) {
  try {
    const proyecto = await db.proyecto.findUnique({
      where: { id: proyectoId },
      include: {
        materiales: true,
        herramientas: true,
        tareas: true,
        personal: true,
        documentos: true,
        centroCosto: { select: { id: true, codigo: true, nombre: true } },
      },
    })
    if (!proyecto) return

    const codigo = proyecto.codigo || 'PROY-000'
    const nombre = proyecto.nombre || 'Sin nombre'
    const folderIds = await createProjectFolderStructure(codigo, nombre)

    // Upload project data JSON (portada)
    const projectData = {
      codigo, nombre,
      categoria: proyecto.categoria, estado: proyecto.estado,
      ubicacion: proyecto.ubicacion,
      fechaInicio: proyecto.fechaInicio, fechaFin: proyecto.fechaFin,
      presProg: proyecto.presProg, presUsado: proyecto.presUsado,
      avance: proyecto.avance, descripcion: proyecto.descripcion,
      notas: proyecto.notas, sector: proyecto.sector,
      tipoReparacion: proyecto.tipoReparacion, tipoTrabajo: proyecto.tipoTrabajo,
      prioridad: proyecto.prioridad, estadoAprobacion: proyecto.estadoAprobacion,
      responsable: proyecto.responsable, responsableExterno: proyecto.responsableExterno,
      tiempoEstimado: proyecto.tiempoEstimado, monto: proyecto.monto,
      fechaInicioReal: proyecto.fechaInicioReal, fechaFinReal: proyecto.fechaFinReal,
      comentarios: proyecto.comentarios, centroCosto: proyecto.centroCosto,
      materiales: proyecto.materiales, herramientas: proyecto.herramientas,
      tareas: proyecto.tareas, personal: proyecto.personal,
      documentos: proyecto.documentos.map((d) => ({
        nombre: d.nombre, tipo: d.tipo, descripcion: d.descripcion, fechaDoc: d.fechaDoc,
      })),
      createdAt: proyecto.createdAt, updatedAt: proyecto.updatedAt,
    }

    await uploadFile(
      `Datos del Proyecto - ${codigo}.json`,
      JSON.stringify(projectData, null, 2),
      'application/json',
      folderIds.root
    )

    // Upload fotosAntes
    const fotosAntes = parsePhotoArray(proyecto.fotosAntes)
    if (fotosAntes.length > 0 && folderIds.fotosAntes) {
      for (let i = 0; i < fotosAntes.length; i++) {
        try {
          await uploadBase64Image(fotosAntes[i], `Foto Antes ${i + 1}.jpg`, folderIds.fotosAntes)
        } catch (e) { console.warn(`[Backup] Foto Antes ${i + 1} failed for ${codigo}`) }
      }
    }

    // Upload fotosDespues
    const fotosDespues = parsePhotoArray(proyecto.fotosDespues)
    if (fotosDespues.length > 0 && folderIds.fotosDespues) {
      for (let i = 0; i < fotosDespues.length; i++) {
        try {
          await uploadBase64Image(fotosDespues[i], `Foto Despues ${i + 1}.jpg`, folderIds.fotosDespues)
        } catch (e) { console.warn(`[Backup] Foto Despues ${i + 1} failed for ${codigo}`) }
      }
    }

    // Upload documentos
    if (proyecto.documentos.length > 0 && folderIds.documentos) {
      for (const doc of proyecto.documentos) {
        try {
          if (doc.archivo && (doc.archivo.startsWith('data:') || doc.archivo.length > 200)) {
            let base64 = doc.archivo
            let mimeType = 'application/octet-stream'
            if (base64.startsWith('data:')) {
              const matches = base64.match(/^data:(\w+\/[\w+-]+);base64,/)
              if (matches) mimeType = matches[1]
              base64 = base64.replace(/^data:\w+\/[\w+-]+;base64,/, '')
            }
            const buffer = Buffer.from(base64, 'base64')
            const ext = mimeType.includes('pdf') ? 'pdf' : mimeType.includes('image') ? 'jpg' : 'bin'
            await uploadFile(`${doc.nombre || 'Documento'}.${ext}`, buffer, mimeType, folderIds.documentos)
          }
        } catch (e) { console.warn(`[Backup] Document failed for ${codigo}`) }
      }
    }

    console.log(`[Backup] Proyecto ${codigo} backed up to Drive`)
  } catch (error) {
    console.error(`[Backup] Error backing up proyecto ${proyectoId}:`, error)
  }
}

// ============================================================
// BACKUP ORDEN DE TRABAJO
// ============================================================

export async function backupOTToDrive(otId: string) {
  try {
    const ot = await db.ordenTrabajo.findUnique({
      where: { id: otId },
      include: {
        propiedad: { select: { id: true, nombre: true } },
        asignado: { select: { id: true, nombre: true, cargo: true } },
        centroCosto: { select: { id: true, codigo: true, nombre: true } },
        materiales: true, herramientas: true, tareas: true, personalOT: true, documentos: true,
      },
    })
    if (!ot) return

    // OT folders go in the root parent folder (OT has no proyectoId relation)
    let parentFolderId = getParentFolderId()

    const otTitulo = (ot.titulo || 'Sin titulo').substring(0, 60)
    const otFolders = await createOTFolderStructure(ot.otNum, otTitulo, parentFolderId)

    // Upload OT data JSON
    const otData = {
      otNum: ot.otNum, titulo: ot.titulo, tipo: ot.tipo,
      prioridad: ot.prioridad, estado: ot.estado, ubicacion: ot.ubicacion,
      fechaInicio: ot.fechaInicio, fechaLimite: ot.fechaLimite,
      fechaInicioReal: ot.fechaInicioReal, fechaFinReal: ot.fechaFinReal,
      costoEstimado: ot.costoEstimado, costoReal: ot.costoReal,
      progreso: ot.progreso, descripcion: ot.descripcion,
      tiempoEst: ot.tiempoEst, tiempoReal: ot.tiempoReal,
      valorHora: ot.valorHora, notas: ot.notas,
      estadoAprobacion: ot.estadoAprobacion, formaPago: ot.formaPago,
      propiedad: ot.propiedad, asignado: ot.asignado, centroCosto: ot.centroCosto,
      materiales: ot.materiales, herramientas: ot.herramientas,
      tareas: ot.tareas, personal: ot.personalOT,
      documentos: ot.documentos.map((d) => ({ nombre: d.nombre, tipo: d.tipo })),
      creadoPor: ot.creadoPorNombre,
      createdAt: ot.createdAt, updatedAt: ot.updatedAt,
    }

    await uploadFile(
      `Datos OT - ${ot.otNum}.json`,
      JSON.stringify(otData, null, 2),
      'application/json',
      otFolders.root
    )

    // Upload fotos
    const fotosAntes = parsePhotoArray(ot.fotosAntes)
    if (fotosAntes.length > 0 && otFolders.fotos) {
      for (let i = 0; i < fotosAntes.length; i++) {
        try { await uploadBase64Image(fotosAntes[i], `Antes ${i + 1}.jpg`, otFolders.fotos) }
        catch (e) { console.warn(`[Backup] OT ${ot.otNum} foto antes ${i + 1} failed`) }
      }
    }

    const fotosDespues = parsePhotoArray(ot.fotosDespues)
    if (fotosDespues.length > 0 && otFolders.fotos) {
      for (let i = 0; i < fotosDespues.length; i++) {
        try { await uploadBase64Image(fotosDespues[i], `Despues ${i + 1}.jpg`, otFolders.fotos) }
        catch (e) { console.warn(`[Backup] OT ${ot.otNum} foto despues ${i + 1} failed`) }
      }
    }

    console.log(`[Backup] OT ${ot.otNum} backed up to Drive`)
  } catch (error) {
    console.error(`[Backup] Error backing up OT ${otId}:`, error)
  }
}

// ============================================================
// BACKUP SOLICITUD DE COMPRA
// ============================================================

export async function backupSolicitudToDrive(scId: string) {
  try {
    const sc = await db.solicitudCompra.findUnique({ where: { id: scId } })
    if (!sc) return

    // Determine parent folder
    let scFolderId = getParentFolderId()
    if (sc.origenTipo === 'Proyecto' && sc.origenId) {
      const proyecto = await db.proyecto.findUnique({
        where: { id: sc.origenId },
        select: { codigo: true, nombre: true },
      })
      if (proyecto) {
        const folderIds = await createProjectFolderStructure(
          proyecto.codigo || 'PROY-000',
          proyecto.nombre || 'Sin nombre'
        )
        scFolderId = folderIds.solicitudes
      }
    }

    // Parse materiales
    let materialesText = 'Sin materiales'
    if (sc.materiales) {
      try {
        const mats = JSON.parse(sc.materiales)
        if (Array.isArray(mats) && mats.length > 0) {
          materialesText = mats
            .map((m: any, i: number) =>
              `${i + 1}. ${m.nombre || m.descripcion || 'N/A'} | Cant: ${m.cantidad} ${m.unidad || ''} | P.Unit: $${m.precioEstimado || 0} | Total: $${m.total || 0}`
            )
            .join('\n')
        }
      } catch { /* keep default */ }
    }

    // Parse links
    let linksText = 'Sin links'
    if (sc.links) {
      try {
        const links = JSON.parse(sc.links)
        if (Array.isArray(links) && links.length > 0) linksText = links.join('\n')
      } catch { /* keep default */ }
    }

    const txt = [
      `SOLICITUD DE COMPRA`,
      `${'='.repeat(50)}`,
      `Codigo: ${sc.codigo}`, `Titulo: ${sc.titulo}`,
      `Estado: ${sc.estado}`, `Prioridad: ${sc.prioridad}`,
      `Etapa Aprobacion: ${sc.etapaAprobacion || 'N/A'}`,
      '', `Descripcion:`, `${sc.descripcion || 'Sin descripcion'}`,
      '', `Materiales:`, `${materialesText}`,
      '', `Total Estimado: $${sc.totalEstimado || 0}`,
      `Solicitado Por: ${sc.solicitadoPor || 'N/A'}`,
      `Fecha Solicitud: ${sc.fechaSolicitud || 'N/A'}`,
      `Fecha Esperada: ${sc.fechaEspera || 'N/A'}`,
      `Proveedor Sugerido: ${sc.proveedorSugerido || 'N/A'}`,
      `Origen: ${sc.origenTipo || 'Manual'} ${sc.origenCodigo ? `(${sc.origenCodigo})` : ''}`,
      '', `Observaciones:`, `${sc.observaciones || 'Sin observaciones'}`,
      '', `Aprobacion Supervisor: ${sc.supervisorAprobadorNombre || 'Pendiente'} ${sc.supervisorFechaAprobacion ? `- ${new Date(sc.supervisorFechaAprobacion).toLocaleDateString('es-CL')}` : ''}`,
      `Aprobacion Admin: ${sc.adminAprobadorNombre || 'Pendiente'} ${sc.adminFechaAprobacion ? `- ${new Date(sc.adminFechaAprobacion).toLocaleDateString('es-CL')}` : ''}`,
      '', `Links de compra:`, linksText,
      '', `Creado: ${sc.createdAt}`, `Actualizado: ${sc.updatedAt}`,
    ].join('\n')

    await uploadFile(
      `SC ${sc.codigo} - ${sc.titulo}.txt`,
      txt,
      'text/plain',
      scFolderId
    )

    console.log(`[Backup] SC ${sc.codigo} backed up to Drive`)
  } catch (error) {
    console.error(`[Backup] Error backing up SC ${scId}:`, error)
  }
}
