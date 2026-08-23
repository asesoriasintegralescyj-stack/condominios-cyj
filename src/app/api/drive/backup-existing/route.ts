import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  verifyDriveConfig,
  getDriveClient,
  getParentFolderId,
  listFolders,
  listFiles,
  findOrCreateFolder,
  uploadFile,
  uploadBase64Image,
  parseFotos,
  findProjectFolder,
} from '@/lib/google-drive'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// GET /api/drive/backup-existing?type=proyectos|ots|scs|all&limit=50
// Si no se pasa type, procesa todo pero en lotes pequeños
export async function GET(request: any) {
  if (!verifyDriveConfig()) {
    return NextResponse.json({ error: 'Google Drive no configurado.' }, { status: 500 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'all'
  const limit = parseInt(searchParams.get('limit') || '50')

  const stats = { proyectos: 0, ots: 0, scs: 0, fotos: 0, errores: 0 as number, omitidos: 0 }

  try {
    const parentFolderId = getParentFolderId()

    if (type === 'proyectos' || type === 'all') {
      await backupProyectos(parentFolderId, stats, limit)
    }
    if (type === 'ots' || type === 'all') {
      await backupOTs(parentFolderId, stats, limit)
    }
    if (type === 'scs' || type === 'all') {
      await backupSCs(parentFolderId, stats, limit)
    }

    return NextResponse.json({ success: true, type, stats })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, stats }, { status: 500 })
  }
}

// ─── Proyectos ──────────────────────────────────────────────────────────────
async function backupProyectos(parentFolderId: string, stats: any, limit: number) {
  const proyectos = await db.proyecto.findMany({
    where: { OR: [{ condominioId: 'cmo9f3x7j0000ktyeb0rzhwt9' }, { condominioId: null }] },
    include: { materiales: true, herramientas: true, tareas: true, personal: true, documentos: true, centroCosto: { select: { id: true, codigo: true, nombre: true } } },
    orderBy: { createdAt: 'asc' },
    take: limit,
  })

  for (const p of proyectos) {
    const codigo = p.codigo || `SIN-CODIGO-${p.id.substring(0, 6)}`
    try {
      let folderId = await findProjectFolder(codigo)
      if (!folderId) {
        folderId = await findOrCreateFolder(`${codigo} - ${p.nombre}`.substring(0, 200), parentFolderId)
      }
      if (!folderId) { stats.errores++; continue }

      // Crear subcarpetas
      const scId = await findOrCreateFolder('Solicitudes de Compra', folderId)
      const docsId = await findOrCreateFolder('Documentos', folderId)
      const fotosId = await findOrCreateFolder('Fotos', folderId)
      const antesId = fotosId ? await findOrCreateFolder('Antes', fotosId) : null
      const despuesId = fotosId ? await findOrCreateFolder('Despues', fotosId) : null
      await findOrCreateFolder('Ordenes de Trabajo', folderId)

      // Verificar si ya tiene JSON (incremental)
      const existingFiles = await listFiles(folderId)
      const hasJson = existingFiles.some(f => f.name.startsWith(`${codigo} - Datos del Proyecto`))
      
      const data = {
        codigo: p.codigo, nombre: p.nombre, categoria: p.categoria, estado: p.estado,
        ubicacion: p.ubicacion, descripcion: p.descripcion, avance: p.avance,
        presProg: p.presProg, presUsado: p.presUsado, monto: p.monto,
        sector: p.sector, tipoReparacion: p.tipoReparacion, tipoTrabajo: p.tipoTrabajo,
        prioridad: p.prioridad, estadoAprobacion: p.estadoAprobacion,
        responsable: p.responsable, responsableExterno: p.responsableExterno,
        centroCosto: p.centroCosto,
        materiales: p.materiales, herramientas: p.herramientas, tareas: p.tareas, personal: p.personal,
        documentosCount: p.documentos?.length || 0,
        createdAt: p.createdAt, updatedAt: p.updatedAt, _backupDate: new Date().toISOString(),
      }

      if (hasJson) {
        // Actualizar JSON existente
        await uploadFile(`${codigo} - Datos del Proyecto.json`, JSON.stringify(data, null, 2), 'application/json', folderId, `${codigo} - Datos del Proyecto.json`)
      } else {
        await uploadFile(`${codigo} - Datos del Proyecto.json`, JSON.stringify(data, null, 2), 'application/json', folderId)
      }

      // Fotos
      if (antesId) {
        const fa = parseFotos(p.fotosAntes)
        for (let i = 0; i < fa.length; i++) {
          if (await uploadBase64Image(fa[i], `${codigo}_antes_${i + 1}`, antesId)) stats.fotos++
        }
      }
      if (despuesId) {
        const fd = parseFotos(p.fotosDespues)
        for (let i = 0; i < fd.length; i++) {
          if (await uploadBase64Image(fd[i], `${codigo}_despues_${i + 1}`, despuesId)) stats.fotos++
        }
      }

      stats.proyectos++
    } catch (e: any) { console.error(`Error proyecto ${codigo}:`, e); stats.errores++ }
  }
}

// ─── OTs ────────────────────────────────────────────────────────────────────
async function backupOTs(parentFolderId: string, stats: any, limit: number) {
  const ots = await db.ordenTrabajo.findMany({
    include: { materiales: true, herramientas: true, tareas: true, personalOT: true,
      propiedad: { select: { id: true, nombre: true } }, asignado: { select: { id: true, nombre: true, cargo: true } },
      centroCosto: { select: { id: true, codigo: true, nombre: true } } },
    orderBy: { createdAt: 'asc' },
    take: limit,
  })

  for (const ot of ots) {
    try {
      // Buscar carpeta existente de la OT
      const drive = await getDriveClient()
      const res = await drive.files.list({
        q: `name = '${ot.otNum}' and '${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id)', pageSize: 1,
      })
      let otFolderId = res.data.files?.[0]?.id
      if (!otFolderId) {
        otFolderId = await findOrCreateFolder(ot.otNum, parentFolderId)
      }
      if (!otFolderId) { stats.errores++; continue }

      const antesId = await findOrCreateFolder('Fotos Antes', otFolderId)
      const despuesId = await findOrCreateFolder('Fotos Despues', otFolderId)

      // Verificar si ya tiene JSON
      const existingFiles = await listFiles(otFolderId)
      const hasJson = existingFiles.some(f => f.name.startsWith(`${ot.otNum} - Datos OT`))

      const data = {
        otNum: ot.otNum, titulo: ot.titulo, tipo: ot.tipo, prioridad: ot.prioridad,
        estado: ot.estado, ubicacion: ot.ubicacion, descripcion: ot.descripcion,
        costoEstimado: ot.costoEstimado, costoReal: ot.costoReal, progreso: ot.progreso,
        estadoAprobacion: ot.estadoAprobacion, formaPago: ot.formaPago,
        notas: ot.notas?.replace(/\[IDEM:[^\]]+\]\s*/g, ''),
        propiedad: ot.propiedad, asignado: ot.asignado, centroCosto: ot.centroCosto,
        materiales: ot.materiales, herramientas: ot.herramientas, tareas: ot.tareas, personalOT: ot.personalOT,
        creadoPor: ot.creadoPorNombre, createdAt: ot.createdAt, updatedAt: ot.updatedAt,
        _backupDate: new Date().toISOString(),
      }

      const jsonName = `${ot.otNum} - Datos OT.json`
      if (hasJson) {
        await uploadFile(jsonName, JSON.stringify(data, null, 2), 'application/json', otFolderId, jsonName)
      } else {
        await uploadFile(jsonName, JSON.stringify(data, null, 2), 'application/json', otFolderId)
      }

      // Fotos
      if (antesId) {
        const fa = parseFotos(ot.fotosAntes)
        for (let i = 0; i < fa.length; i++) {
          if (await uploadBase64Image(fa[i], `${ot.otNum}_antes_${i + 1}`, antesId)) stats.fotos++
        }
      }
      if (despuesId) {
        const fd = parseFotos(ot.fotosDespues)
        for (let i = 0; i < fd.length; i++) {
          if (await uploadBase64Image(fd[i], `${ot.otNum}_despues_${i + 1}`, despuesId)) stats.fotos++
        }
      }

      stats.ots++
    } catch (e: any) { console.error(`Error OT ${ot.otNum}:`, e); stats.errores++ }
  }
}

// ─── Solicitudes de Compra ──────────────────────────────────────────────────
async function backupSCs(parentFolderId: string, stats: any, limit: number) {
  const scs = await db.solicitudCompra.findMany({ orderBy: { createdAt: 'asc' }, take: limit })

  // Obtener carpetas de proyectos
  const projectFolders = await listFolders(parentFolderId)
  const proyectoCodigoToFolder: Record<string, string> = {}
  for (const f of projectFolders) {
    const match = f.name.match(/^(PROY-\d+)/)
    if (match) proyectoCodigoToFolder[match[1]] = f.id
  }

  // Carpeta genérica para SCs sin proyecto
  const genericScFolder = await findOrCreateFolder('Solicitudes de Compra (Sin Proyecto)', parentFolderId)

  for (const sc of scs) {
    try {
      let scFolderId: string | null = null

      if (sc.origenTipo === 'Proyecto' && sc.origenCodigo) {
        const match = sc.origenCodigo.match(/^(PROY-\d+)/)
        if (match) {
          const projectFolderId = proyectoCodigoToFolder[match[1]]
          if (projectFolderId) {
            scFolderId = await findOrCreateFolder('Solicitudes de Compra', projectFolderId)
          }
        }
      }
      if (!scFolderId) scFolderId = genericScFolder
      if (!scFolderId) { stats.errores++; continue }

      // Generar TXT
      const materiales = sc.materiales ? (() => { try { return JSON.parse(sc.materiales) } catch { return [] } })() : []
      const links = sc.links ? (() => { try { return JSON.parse(sc.links) } catch { return [] } })() : []

      let txt = `SOLICITUD DE COMPRA: ${sc.codigo}\n`
      txt += `${'='.repeat(60)}\n\n`
      txt += `Titulo: ${sc.titulo}\nDescripcion: ${sc.descripcion || 'Sin descripcion'}\n\n`
      txt += `Estado: ${sc.estado} | Prioridad: ${sc.prioridad}\n`
      txt += `Etapa: ${sc.etapaAprobacion}\n\n`
      txt += `Origen: ${sc.origenTipo || 'Manual'} (${sc.origenCodigo || 'N/A'})\n`
      txt += `Solicitado por: ${sc.solicitadoPor || 'N/A'}\n`
      txt += `Fecha: ${sc.fechaSolicitud}\n\n`
      txt += `--- Materiales (${materiales.length}) ---\n`
      materiales.forEach((m: any, i: number) => {
        txt += `  ${i + 1}. ${m.nombre || m.descripcion || 'Sin nombre'} - ${m.cantidad} ${m.unidad || 'u'} - $${Number(m.total || 0).toLocaleString('es-CL')}\n`
      })
      txt += `\nTotal: $${Number(sc.totalEstimado || 0).toLocaleString('es-CL')}\n`
      if (links.length) {
        txt += `\n--- Links ---\n`
        links.forEach((l: string, i: number) => { txt += `  ${i + 1}. ${l}\n` })
      }
      txt += `\nBackup: ${new Date().toISOString()}\n`

      await uploadFile(
        `${sc.codigo} - ${sc.titulo.replace(/[\\/]/g, '-')}.txt`,
        txt, 'text/plain', scFolderId,
        `${sc.codigo} - *.txt`
      )
      stats.scs++
    } catch (e: any) { console.error(`Error SC ${sc.codigo}:`, e); stats.errores++ }
  }
}
