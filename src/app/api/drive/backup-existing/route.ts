import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  getDriveClient, getRootFolders,
  createProjectFolderStructure, createOTFolderStructure, createSCFolderStructure,
  uploadFile, uploadBase64Image, parsePhotoArray,
} from '@/lib/google-drive'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// GET - Backup data to Google Drive
// ?type=proyectos | ots | scs | all
// ?offset=0&limit=10  (paginación para no exceder timeout)
export async function GET(req: NextRequest) {
  const t0 = Date.now()
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'all'
  const offset = parseInt(searchParams.get('offset') || '0', 10)
  const limit = parseInt(searchParams.get('limit') || '20', 10)
  const stats = { proyectos: 0, ots: 0, scs: 0, fotos: 0, errores: [] as string[] }

  try {
    const drive = await getDriveClient()
    const rootFolders = await getRootFolders()
    console.log(`[Backup] type=${type} offset=${offset} limit=${limit}`)

    // ════════════════════════════════════════════════════════════
    // 1. PROYECTOS
    // ════════════════════════════════════════════════════════════
    if (type === 'proyectos' || type === 'all') {
      const proyectos = await db.proyecto.findMany({
        include: { materiales: true, herramientas: true, tareas: true, personal: true, documentos: true, centroCosto: { select: { id: true, codigo: true, nombre: true } } },
        orderBy: { createdAt: 'desc' },
        skip: offset, take: limit,
      })
      console.log(`[Backup] ${proyectos.length} proyectos (offset=${offset})`)

      for (const p of proyectos) {
        try {
          const codigo = p.codigo || 'PROY-000'
          const nombre = p.nombre || 'Sin nombre'
          const fIds = await createProjectFolderStructure(codigo, nombre)

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
          const fa = parsePhotoArray(p.fotosAntes)
          for (let i = 0; i < fa.length; i++) {
            try { await uploadBase64Image(fa[i], `Foto ${i + 1}.jpg`, fIds.fotosAntes); stats.fotos++ }
            catch (e: any) { stats.errores.push(`Foto Antes ${i + 1} ${codigo}: ${e.message}`) }
          }

          // ── Fotos Despues ──
          const fd = parsePhotoArray(p.fotosDespues)
          for (let i = 0; i < fd.length; i++) {
            try { await uploadBase64Image(fd[i], `Foto ${i + 1}.jpg`, fIds.fotosDespues); stats.fotos++ }
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
    }

    // ════════════════════════════════════════════════════════════
    // 2. ORDENES DE TRABAJO
    // ════════════════════════════════════════════════════════════
    if (type === 'ots' || type === 'all') {
      const ots = await db.ordenTrabajo.findMany({
        include: { propiedad: { select: { id: true, nombre: true } }, asignado: { select: { id: true, nombre: true, cargo: true } }, centroCosto: { select: { id: true, codigo: true, nombre: true } }, materiales: true, herramientas: true, tareas: true, personalOT: true, documentos: true },
        orderBy: { createdAt: 'desc' },
        skip: offset, take: limit,
      })
      console.log(`[Backup] ${ots.length} OTs (offset=${offset})`)

      for (const ot of ots) {
        try {
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
          const fa = parsePhotoArray(ot.fotosAntes)
          for (let i = 0; i < fa.length; i++) {
            try { await uploadBase64Image(fa[i], `Foto ${i + 1}.jpg`, otFolders.fotosAntes); stats.fotos++ }
            catch (e: any) { stats.errores.push(`OT ${ot.otNum} antes ${i + 1}: ${e.message}`) }
          }

          // ── Fotos Despues ──
          const fd = parsePhotoArray(ot.fotosDespues)
          for (let i = 0; i < fd.length; i++) {
            try { await uploadBase64Image(fd[i], `Foto ${i + 1}.jpg`, otFolders.fotosDespues); stats.fotos++ }
            catch (e: any) { stats.errores.push(`OT ${ot.otNum} despues ${i + 1}: ${e.message}`) }
          }

          stats.ots++
        } catch (e: any) { console.error(`[Backup] OT ${ot.otNum}:`, e); stats.errores.push(`OT ${ot.otNum}: ${e.message}`) }
      }
    }

    // ════════════════════════════════════════════════════════════
    // 3. SOLICITUDES DE COMPRA
    // ════════════════════════════════════════════════════════════
    if (type === 'scs' || type === 'all') {
      // Primero obtener proyectos para el mapeo
      const proyectoMap: Record<string, { codigo: string; nombre: string; solicitudesId: string }> = {}
      if (type === 'scs') {
        const proys = await db.proyecto.findMany({ select: { id: true, codigo: true, nombre: true } })
        for (const pr of proys) {
          const fIds = await createProjectFolderStructure(pr.codigo || 'PROY-000', pr.nombre || 'Sin nombre')
          proyectoMap[pr.id] = { codigo: pr.codigo || 'PROY-000', nombre: pr.nombre || 'Sin nombre', solicitudesId: fIds.solicitudes }
        }
      }

      const scs = await db.solicitudCompra.findMany({
        orderBy: { createdAt: 'desc' },
        skip: offset, take: limit,
      })
      console.log(`[Backup] ${scs.length} SCs (offset=${offset})`)

      for (const sc of scs) {
        try {
          // Preparar datos SC
          let matsText = 'Sin materiales'
          if (sc.materiales) {
            try { const mats = JSON.parse(sc.materiales); if (Array.isArray(mats) && mats.length > 0) matsText = mats } catch { /* keep */ }
          }
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

          // SC con proyecto → JSON en la carpeta Solicitudes de Compra/ del proyecto
          const targetProject = sc.proyectoId ? proyectoMap[sc.proyectoId] : (sc.origenTipo === 'Proyecto' && sc.origenId ? proyectoMap[sc.origenId] : null)

          if (targetProject) {
            await uploadFile(`${sc.codigo} - (Portada) ${sc.titulo}.json`, JSON.stringify(scData, null, 2), 'application/json', targetProject.solicitudesId)
          } else {
            // SC sin proyecto → carpeta propia con JSON + Documentos/
            const scFolder = await createSCFolderStructure(sc.codigo, rootFolders.scSinProyecto)
            await uploadFile(`${sc.codigo} - (Portada) ${sc.titulo}.json`, JSON.stringify(scData, null, 2), 'application/json', scFolder.root)
          }

          stats.scs++
        } catch (e: any) { console.error(`[Backup] SC ${sc.codigo}:`, e); stats.errores.push(`SC ${sc.codigo}: ${e.message}`) }
      }
    }

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
    console.log(`[Backup] Completado en ${elapsed}s`, stats)
    return NextResponse.json({ success: true, message: `Backup tipo=${type} completado en ${elapsed}s`, stats, params: { type, offset, limit } })
  } catch (error: any) {
    console.error('[Backup] Error fatal:', error)
    return NextResponse.json({ success: false, error: error.message, stats }, { status: 500 })
  }
}