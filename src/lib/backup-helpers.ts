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

    let targetFolderId: string
    if (sc.origenTipo === 'Proyecto' && sc.origenId) {
      const proy = await db.proyecto.findUnique({ where: { id: sc.origenId }, select: { codigo: true, nombre: true } })
      if (proy) {
        const fIds = await createProjectFolderStructure(proy.codigo || 'PROY-000', proy.nombre || 'Sin nombre')
        targetFolderId = fIds.solicitudes
      } else { targetFolderId = (await getRootFolders()).scSinProyecto }
    } else {
      const scF = await createSCFolderStructure(sc.codigo, (await getRootFolders()).scSinProyecto)
      targetFolderId = scF.root
    }

    let matsText = 'Sin materiales'
    if (sc.materiales) { try { const m = JSON.parse(sc.materiales); if (Array.isArray(m) && m.length > 0) matsText = m.map((x: any, i: number) => `${i + 1}. ${x.nombre || x.descripcion || 'N/A'} | Cant: ${x.cantidad} ${x.unidad || ''} | P.Unit: $${x.precioEstimado || 0} | Total: $${x.total || 0}`).join('\n') } catch {} }
    let linksText = 'Sin links'
    if (sc.links) { try { const l = JSON.parse(sc.links); if (Array.isArray(l) && l.length > 0) linksText = l.join('\n') } catch {} }

    const txt = [
      `SOLICITUD DE COMPRA`, `${'='.repeat(50)}`,
      `Codigo: ${sc.codigo}`, `Titulo: ${sc.titulo}`, `Estado: ${sc.estado}`, `Prioridad: ${sc.prioridad}`,
      `Etapa Aprobacion: ${sc.etapaAprobacion || 'N/A'}`,
      '', 'Descripcion:', sc.descripcion || 'Sin descripcion', '', 'Materiales:', matsText,
      '', `Total Estimado: $${sc.totalEstimado || 0}`, `Solicitado Por: ${sc.solicitadoPor || 'N/A'}`,
      `Fecha Solicitud: ${sc.fechaSolicitud || 'N/A'}`, `Fecha Esperada: ${sc.fechaEspera || 'N/A'}`,
      `Proveedor Sugerido: ${sc.proveedorSugerido || 'N/A'}`,
      `Origen: ${sc.origenTipo || 'Manual'} ${sc.origenCodigo ? `(${sc.origenCodigo})` : ''}`,
      '', 'Observaciones:', sc.observaciones || 'Sin observaciones',
      '', `Aprobacion Supervisor: ${sc.supervisorAprobadorNombre || 'Pendiente'} ${sc.supervisorFechaAprobacion ? `- ${new Date(sc.supervisorFechaAprobacion).toLocaleDateString('es-CL')}` : ''}`,
      `Aprobacion Admin: ${sc.adminAprobadorNombre || 'Pendiente'} ${sc.adminFechaAprobacion ? `- ${new Date(sc.adminFechaAprobacion).toLocaleDateString('es-CL')}` : ''}`,
      '', 'Links de compra:', linksText, '', `Creado: ${sc.createdAt}`, `Actualizado: ${sc.updatedAt}`,
    ].join('\n')

    await uploadFile(`${sc.codigo} - ${sc.titulo}.txt`, txt, 'text/plain', targetFolderId)
    console.log(`[Backup] SC ${sc.codigo} OK`)
  } catch (e) { console.error(`[Backup] SC ${scId}:`, e) }
}
