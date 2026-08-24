// Backup helpers - fire-and-forget para subida a Drive
// void backupProyectoToDrive(id) → no bloquea la respuesta

import { db } from './db'
import {
  createProjectFolderStructure, createOTFolderStructure, createSCFolderStructure,
  uploadFile, uploadBase64Image, getParentFolderId, getRootFolders, parsePhotoArray,
} from './google-drive'

// ════════════════════════════════════════════════════════════════
// PROYECTO
// ════════════════════════════════════════════════════════════════
export async function backupProyectoToDrive(proyectoId: string) {
  try {
    const p = await db.proyecto.findUnique({
      where: { id: proyectoId },
      include: { materiales: true, herramientas: true, tareas: true, personal: true, documentos: true, centroCosto: { select: { id: true, codigo: true, nombre: true } } },
    })
    if (!p) return
    const codigo = p.codigo || 'PROY-000'
    const fIds = await createProjectFolderStructure(codigo, p.nombre || 'Sin nombre')

    // Portada
    const data = {
      codigo, nombre: p.nombre, categoria: p.categoria, estado: p.estado, ubicacion: p.ubicacion,
      fechaInicio: p.fechaInicio, fechaFin: p.fechaFin, presProg: p.presProg, presUsado: p.presUsado,
      avance: p.avance, descripcion: p.descripcion, notas: p.notas, sector: p.sector,
      tipoReparacion: p.tipoReparacion, tipoTrabajo: p.tipoTrabajo, prioridad: p.prioridad,
      estadoAprobacion: p.estadoAprobacion, responsable: p.responsable, responsableExterno: p.responsableExterno,
      tiempoEstimado: p.tiempoEstimado, monto: p.monto, fechaInicioReal: p.fechaInicioReal,
      fechaFinReal: p.fechaFinReal, comentarios: p.comentarios, centroCosto: p.centroCosto,
      materiales: p.materiales, herramientas: p.herramientas, tareas: p.tareas, personal: p.personal,
      documentos: p.documentos.map(d => ({ nombre: d.nombre, tipo: d.tipo, descripcion: d.descripcion, fechaDoc: d.fechaDoc })),
      createdAt: p.createdAt, updatedAt: p.updatedAt,
    }
    await uploadFile(`${codigo} - (Portada) Datos del Proyecto.json`, JSON.stringify(data, null, 2), 'application/json', fIds.root)

    // Fotos
    const fa = parsePhotoArray(p.fotosAntes)
    for (let i = 0; i < fa.length; i++) try { await uploadBase64Image(fa[i], `Foto ${i + 1}.jpg`, fIds.fotosAntes) } catch {}
    const fd = parsePhotoArray(p.fotosDespues)
    for (let i = 0; i < fd.length; i++) try { await uploadBase64Image(fd[i], `Foto ${i + 1}.jpg`, fIds.fotosDespues) } catch {}

    // Documentos
    for (const doc of p.documentos) {
      try {
        if (!doc.archivo || (!doc.archivo.startsWith('data:') && doc.archivo.length < 200)) continue
        let b64 = doc.archivo, mime = 'application/octet-stream'
        if (b64.startsWith('data:')) { const m = b64.match(/^data:(\w+\/[\w+-]+);base64,/); if (m) mime = m[1]; b64 = b64.replace(/^data:\w+\/[\w+-]+;base64,/, '') }
        const ext = mime.includes('pdf') ? 'pdf' : mime.includes('image') ? 'jpg' : 'bin'
        await uploadFile(`${doc.nombre || 'Documento'}.${ext}`, Buffer.from(b64, 'base64'), mime, fIds.documentos)
      } catch {}
    }
    console.log(`[Backup] Proyecto ${codigo} OK`)
  } catch (e) { console.error(`[Backup] Proyecto ${proyectoId}:`, e) }
}

// ════════════════════════════════════════════════════════════════
// ORDEN DE TRABAJO
// ════════════════════════════════════════════════════════════════
export async function backupOTToDrive(otId: string) {
  try {
    const ot = await db.ordenTrabajo.findUnique({
      where: { id: otId },
      include: { propiedad: { select: { id: true, nombre: true } }, asignado: { select: { id: true, nombre: true, cargo: true } }, centroCosto: { select: { id: true, codigo: true, nombre: true } }, materiales: true, herramientas: true, tareas: true, personalOT: true, documentos: true },
    })
    if (!ot) return

    // OT siempre va a la carpeta raíz "Ordenes de Trabajo/"
    const rootFolders = await getRootFolders()
    const fIds = await createOTFolderStructure(ot.otNum, rootFolders.ots)

    // Portada
    const data = {
      otNum: ot.otNum, titulo: ot.titulo, tipo: ot.tipo, prioridad: ot.prioridad, estado: ot.estado,
      ubicacion: ot.ubicacion, fechaInicio: ot.fechaInicio, fechaLimite: ot.fechaLimite,
      fechaInicioReal: ot.fechaInicioReal, fechaFinReal: ot.fechaFinReal,
      costoEstimado: ot.costoEstimado, costoReal: ot.costoReal, progreso: ot.progreso,
      descripcion: ot.descripcion, tiempoEst: ot.tiempoEst, tiempoReal: ot.tiempoReal,
      valorHora: ot.valorHora, notas: ot.notas, estadoAprobacion: ot.estadoAprobacion, formaPago: ot.formaPago,
      propiedad: ot.propiedad, asignado: ot.asignado, centroCosto: ot.centroCosto,
      materiales: ot.materiales, herramientas: ot.herramientas, tareas: ot.tareas, personal: ot.personalOT,
      documentos: ot.documentos.map(d => ({ nombre: d.nombre, tipo: d.tipo })),
      creadoPor: ot.creadoPorNombre, createdAt: ot.createdAt, updatedAt: ot.updatedAt,
    }
    await uploadFile(`${ot.otNum} - (Portada) Datos OT.json`, JSON.stringify(data, null, 2), 'application/json', fIds.root)

    // Fotos
    const fa = parsePhotoArray(ot.fotosAntes)
    for (let i = 0; i < fa.length; i++) try { await uploadBase64Image(fa[i], `Foto ${i + 1}.jpg`, fIds.fotosAntes) } catch {}
    const fd = parsePhotoArray(ot.fotosDespues)
    for (let i = 0; i < fd.length; i++) try { await uploadBase64Image(fd[i], `Foto ${i + 1}.jpg`, fIds.fotosDespues) } catch {}

    console.log(`[Backup] OT ${ot.otNum} OK`)
  } catch (e) { console.error(`[Backup] OT ${otId}:`, e) }
}

// ════════════════════════════════════════════════════════════════
// SOLICITUD DE COMPRA
// ════════════════════════════════════════════════════════════════
export async function backupSolicitudToDrive(scId: string) {
  try {
    const sc = await db.solicitudCompra.findUnique({ where: { id: scId } })
    if (!sc) return

    // Preparar datos
    let matsText = 'Sin materiales'
    if (sc.materiales) { try { const m = JSON.parse(sc.materiales); if (Array.isArray(m) && m.length > 0) matsText = m } catch { /* keep */ } }
    let linksArr: string[] = []
    if (sc.links) { try { const l = JSON.parse(sc.links); if (Array.isArray(l)) linksArr = l } catch { /* keep */ } }

    const scData = {
      codigo: sc.codigo, titulo: sc.titulo, descripcion: sc.descripcion, estado: sc.estado,
      prioridad: sc.prioridad, moneda: sc.moneda, totalEstimado: sc.totalEstimado,
      solicitadoPor: sc.solicitadoPor, fechaSolicitud: sc.fechaSolicitud, fechaEspera: sc.fechaEspera,
      proveedorSugerido: sc.proveedorSugerido, observaciones: sc.observaciones,
      origenTipo: sc.origenTipo, origenCodigo: sc.origenCodigo,
      etapaAprobacion: sc.etapaAprobacion,
      supervisorAprobador: sc.supervisorAprobadorNombre, supervisorFecha: sc.supervisorFechaAprobacion,
      supervisorObs: sc.supervisorObservaciones,
      adminAprobador: sc.adminAprobadorNombre, adminFecha: sc.adminFechaAprobacion,
      adminObs: sc.adminObservaciones,
      materiales: matsText, links: linksArr,
      createdAt: sc.createdAt, updatedAt: sc.updatedAt,
    }

    const jsonStr = JSON.stringify(scData, null, 2)

    if (sc.proyectoId) {
      // SC con proyecto → JSON en la carpeta Solicitudes de Compra/ del proyecto
      const proy = await db.proyecto.findUnique({ where: { id: sc.proyectoId }, select: { codigo: true, nombre: true } })
      if (proy) {
        const fIds = await createProjectFolderStructure(proy.codigo || 'PROY-000', proy.nombre || 'Sin nombre')
        await uploadFile(`${sc.codigo} - (Portada) ${sc.titulo}.json`, jsonStr, 'application/json', fIds.solicitudes)
      }
    } else {
      // SC sin proyecto → carpeta propia con JSON + Documentos/
      const scFolder = await createSCFolderStructure(sc.codigo, (await getRootFolders()).scSinProyecto)
      await uploadFile(`${sc.codigo} - (Portada) ${sc.titulo}.json`, jsonStr, 'application/json', scFolder.root)
    }

    console.log(`[Backup] SC ${sc.codigo} OK`)
  } catch (e) { console.error(`[Backup] SC ${scId}:`, e) }
}
