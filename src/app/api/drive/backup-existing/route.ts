import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  getDriveClient, getRootFolders, getParentFolderId,
  createProjectFolderStructure, createOTFolderStructure, createSCFolderStructure,
  uploadFile, uploadBase64Image, parsePhotoArray,
} from '@/lib/google-drive'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// GET - Backup ALL existing data to Google Drive with correct structure
// Condominios CYJ/
// ├── Proyectos/PROY-001 - Nombre/  (portada JSON + fotos + docs + SCs + OTs)
// ├── Ordenes de Trabajo/OT-0001/  (solo OTs huérfanas)
// └── Solicitudes de Compra (Sin Proyecto)/SC-0001/
export async function GET() {
  const t0 = Date.now()
  const stats = { proyectos: 0, ots: 0, otsEnProyecto: 0, scs: 0, scsEnProyecto: 0, fotos: 0, errores: [] as string[] }

  try {
    const drive = await getDriveClient()
    const rootFolders = await getRootFolders()
    console.log(`[Backup] Inicio. Root folders: Proyectos=${rootFolders.proyectos}, OTs=${rootFolders.ots}, SCs=${rootFolders.scSinProyecto}`)

    // ════════════════════════════════════════════════════════════
    // 1. PROYECTOS
    // ════════════════════════════════════════════════════════════
    const proyectos = await db.proyecto.findMany({
      where: { OR: [{ condominioId: 'cmo9f3x7j0000ktyeb0rzhwt9' }, { condominioId: null }] },
      include: { materiales: true, herramientas: true, tareas: true, personal: true, documentos: true, centroCosto: { select: { id: true, codigo: true, nombre: true } } },
      orderBy: { createdAt: 'desc' },
    })
    console.log(`[Backup] ${proyectos.length} proyectos`)

    const proyectoDriveMap: Record<string, Record<string, string>> = {}

    for (const p of proyectos) {
      try {
        const codigo = p.codigo || 'PROY-000'
        const nombre = p.nombre || 'Sin nombre'
        const fIds = await createProjectFolderStructure(codigo, nombre)
        proyectoDriveMap[p.id] = fIds

        // ── Portada JSON ──
        const data = {
          codigo, nombre, categoria: p.categoria, estado: p.estado, ubicacion: p.ubicacion,
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

        // ── Fotos Antes ──
        for (let i = 0; i < parsePhotoArray(p.fotosAntes).length; i++) {
          try { await uploadBase64Image(parsePhotoArray(p.fotosAntes)[i], `Foto ${i + 1}.jpg`, fIds.fotosAntes); stats.fotos++ }
          catch (e: any) { stats.errores.push(`Foto Antes ${i + 1} ${codigo}: ${e.message}`) }
        }

        // ── Fotos Despues ──
        for (let i = 0; i < parsePhotoArray(p.fotosDespues).length; i++) {
          try { await uploadBase64Image(parsePhotoArray(p.fotosDespues)[i], `Foto ${i + 1}.jpg`, fIds.fotosDespues); stats.fotos++ }
          catch (e: any) { stats.errores.push(`Foto Despues ${i + 1} ${codigo}: ${e.message}`) }
        }

        // ── Documentos ──
        for (const doc of p.documentos) {
          try {
            if (!doc.archivo || (!doc.archivo.startsWith('data:') && doc.archivo.length < 200)) continue
            let b64 = doc.archivo, mime = 'application/octet-stream'
            if (b64.startsWith('data:')) { const m = b64.match(/^data:(\w+\/[\w+-]+);base64,/); if (m) mime = m[1]; b64 = b64.replace(/^data:\w+\/[\w+-]+;base64,/, '') }
            const ext = mime.includes('pdf') ? 'pdf' : mime.includes('image') ? 'jpg' : 'bin'
            await uploadFile(`${doc.nombre || 'Documento'}.${ext}`, Buffer.from(b64, 'base64'), mime, fIds.documentos)
          } catch (e: any) { stats.errores.push(`Doc ${doc.nombre} ${codigo}: ${e.message}`) }
        }

        stats.proyectos++
      } catch (e: any) { console.error(`[Backup] Proyecto ${p.codigo}:`, e); stats.errores.push(`Proyecto ${p.codigo}: ${e.message}`) }
    }

    // ════════════════════════════════════════════════════════════
    // 2. ORDENES DE TRABAJO (todas van a "Ordenes de Trabajo/" raíz)
    //    Nota: OT no tiene proyectoId en el schema
    // ════════════════════════════════════════════════════════════
    const ots = await db.ordenTrabajo.findMany({
      include: { propiedad: { select: { id: true, nombre: true } }, asignado: { select: { id: true, nombre: true, cargo: true } }, centroCosto: { select: { id: true, codigo: true, nombre: true } }, materiales: true, herramientas: true, tareas: true, personalOT: true, documentos: true },
      orderBy: { createdAt: 'desc' },
    })
    console.log(`[Backup] ${ots.length} OTs`)

    for (const ot of ots) {
      try {
        // Todas las OTs van a la carpeta raíz "Ordenes de Trabajo/"
        const otFolders = await createOTFolderStructure(ot.otNum, rootFolders.ots)

        // ── Portada JSON ──
        const otData = {
          otNum: ot.otNum, titulo: ot.titulo, tipo: ot.tipo, prioridad: ot.prioridad,
          estado: ot.estado, ubicacion: ot.ubicacion, fechaInicio: ot.fechaInicio,
          fechaLimite: ot.fechaLimite, fechaInicioReal: ot.fechaInicioReal,
          fechaFinReal: ot.fechaFinReal, costoEstimado: ot.costoEstimado, costoReal: ot.costoReal,
          progreso: ot.progreso, descripcion: ot.descripcion, tiempoEst: ot.tiempoEst,
          tiempoReal: ot.tiempoReal, valorHora: ot.valorHora, notas: ot.notas,
          estadoAprobacion: ot.estadoAprobacion, formaPago: ot.formaPago,
          propiedad: ot.propiedad, asignado: ot.asignado, centroCosto: ot.centroCosto,
          materiales: ot.materiales, herramientas: ot.herramientas, tareas: ot.tareas,
          personal: ot.personalOT, documentos: ot.documentos.map(d => ({ nombre: d.nombre, tipo: d.tipo })),
          creadoPor: ot.creadoPorNombre, createdAt: ot.createdAt, updatedAt: ot.updatedAt,
        }
        await uploadFile(`${ot.otNum} - (Portada) Datos OT.json`, JSON.stringify(otData, null, 2), 'application/json', otFolders.root)

        // ── Fotos Antes ──
        for (let i = 0; i < parsePhotoArray(ot.fotosAntes).length; i++) {
          try { await uploadBase64Image(parsePhotoArray(ot.fotosAntes)[i], `Foto ${i + 1}.jpg`, otFolders.fotosAntes); stats.fotos++ }
          catch (e: any) { stats.errores.push(`OT ${ot.otNum} antes ${i + 1}: ${e.message}`) }
        }

        // ── Fotos Despues ──
        for (let i = 0; i < parsePhotoArray(ot.fotosDespues).length; i++) {
          try { await uploadBase64Image(parsePhotoArray(ot.fotosDespues)[i], `Foto ${i + 1}.jpg`, otFolders.fotosDespues); stats.fotos++ }
          catch (e: any) { stats.errores.push(`OT ${ot.otNum} despues ${i + 1}: ${e.message}`) }
        }

        stats.ots++
      } catch (e: any) { console.error(`[Backup] OT ${ot.otNum}:`, e); stats.errores.push(`OT ${ot.otNum}: ${e.message}`) }
    }

    // ════════════════════════════════════════════════════════════
    // 3. SOLICITUDES DE COMPRA
    // ════════════════════════════════════════════════════════════
    const scs = await db.solicitudCompra.findMany({ orderBy: { createdAt: 'desc' } })
    console.log(`[Backup] ${scs.length} SCs`)

    for (const sc of scs) {
      try {
        let targetFolderId: string
        if (sc.origenTipo === 'Proyecto' && sc.origenId && proyectoDriveMap[sc.origenId]) {
          // SC con proyecto → va a Solicitudes de Compra/ del proyecto (TXT directo)
          targetFolderId = proyectoDriveMap[sc.origenId].solicitudes
          stats.scsEnProyecto++
        } else {
          // SC sin proyecto → va a carpeta propia bajo "Solicitudes de Compra (Sin Proyecto)/"
          const scFolder = await createSCFolderStructure(sc.codigo, rootFolders.scSinProyecto)
          targetFolderId = scFolder.root
        }

        // ── Generar TXT ──
        let matsText = 'Sin materiales'
        if (sc.materiales) {
          try {
            const mats = JSON.parse(sc.materiales)
            if (Array.isArray(mats) && mats.length > 0) matsText = mats.map((m: any, i: number) => `${i + 1}. ${m.nombre || m.descripcion || 'N/A'} | Cant: ${m.cantidad} ${m.unidad || ''} | P.Unit: $${m.precioEstimado || 0} | Total: $${m.total || 0}`).join('\n')
          } catch { /* keep */ }
        }
        let linksText = 'Sin links'
        if (sc.links) { try { const l = JSON.parse(sc.links); if (Array.isArray(l) && l.length > 0) linksText = l.join('\n') } catch { /* keep */ } }

        const txt = [
          `SOLICITUD DE COMPRA`, `${'='.repeat(50)}`,
          `Codigo: ${sc.codigo}`, `Titulo: ${sc.titulo}`, `Estado: ${sc.estado}`, `Prioridad: ${sc.prioridad}`,
          `Etapa Aprobacion: ${sc.etapaAprobacion || 'N/A'}`,
          '', 'Descripcion:', sc.descripcion || 'Sin descripcion',
          '', 'Materiales:', matsText,
          '', `Total Estimado: $${sc.totalEstimado || 0}`,
          `Solicitado Por: ${sc.solicitadoPor || 'N/A'}`,
          `Fecha Solicitud: ${sc.fechaSolicitud || 'N/A'}`, `Fecha Esperada: ${sc.fechaEspera || 'N/A'}`,
          `Proveedor Sugerido: ${sc.proveedorSugerido || 'N/A'}`,
          `Origen: ${sc.origenTipo || 'Manual'} ${sc.origenCodigo ? `(${sc.origenCodigo})` : ''}`,
          '', 'Observaciones:', sc.observaciones || 'Sin observaciones',
          '', `Aprobacion Supervisor: ${sc.supervisorAprobadorNombre || 'Pendiente'} ${sc.supervisorFechaAprobacion ? `- ${new Date(sc.supervisorFechaAprobacion).toLocaleDateString('es-CL')}` : ''}`,
          `Aprobacion Admin: ${sc.adminAprobadorNombre || 'Pendiente'} ${sc.adminFechaAprobacion ? `- ${new Date(sc.adminFechaAprobacion).toLocaleDateString('es-CL')}` : ''}`,
          '', 'Links de compra:', linksText,
          '', `Creado: ${sc.createdAt}`, `Actualizado: ${sc.updatedAt}`,
        ].join('\n')

        await uploadFile(`${sc.codigo} - ${sc.titulo}.txt`, txt, 'text/plain', targetFolderId)
        stats.scs++
      } catch (e: any) { console.error(`[Backup] SC ${sc.codigo}:`, e); stats.errores.push(`SC ${sc.codigo}: ${e.message}`) }
    }

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
    console.log(`[Backup] Completado en ${elapsed}s`, stats)
    return NextResponse.json({ success: true, message: `Backup completado en ${elapsed}s`, stats })
  } catch (error: any) {
    console.error('[Backup] Error fatal:', error)
    return NextResponse.json({ success: false, error: error.message, stats }, { status: 500 })
  }
}
