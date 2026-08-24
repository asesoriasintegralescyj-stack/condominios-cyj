import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  getDriveClient,
  getParentFolderId,
  createProjectFolderStructure,
  createOTFolderStructure,
  uploadFile,
  uploadBase64Image,
  parsePhotoArray,
} from '@/lib/google-drive'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes for large backups

// GET - Backup all existing data to Google Drive
export async function GET() {
  const startTime = Date.now()
  const stats = { projects: 0, ots: 0, scs: 0, photos: 0, errors: [] as string[] }

  try {
    // 1. Verify Drive is configured
    const drive = await getDriveClient()
    const parentFolderId = getParentFolderId()
    console.log('[Backup] Starting full backup to Drive parent:', parentFolderId)

    // ================================================================
    // 2. FETCH ALL PROJECTS (with full details for backup)
    // ================================================================
    const proyectos = await db.proyecto.findMany({
      where: {
        OR: [{ condominioId: 'cmo9f3x7j0000ktyeb0rzhwt9' }, { condominioId: null }],
      },
      include: {
        materiales: true,
        herramientas: true,
        tareas: true,
        personal: true,
        documentos: true,
        centroCosto: { select: { id: true, codigo: true, nombre: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    console.log(`[Backup] Found ${proyectos.length} projects`)

    // Build a map of proyectoId -> Drive folder IDs
    const proyectoDriveMap: Record<string, Record<string, string>> = {}

    // ================================================================
    // 3. PROCESS EACH PROJECT: create folders + upload data + photos
    // ================================================================
    for (const proyecto of proyectos) {
      try {
        const codigo = proyecto.codigo || 'PROY-000'
        const nombre = proyecto.nombre || 'Sin nombre'

        // Create folder structure
        const folderIds = await createProjectFolderStructure(codigo, nombre)
        proyectoDriveMap[proyecto.id] = folderIds

        // Upload project data as JSON (portada/resumen)
        const projectData = {
          codigo,
          nombre,
          categoria: proyecto.categoria,
          estado: proyecto.estado,
          ubicacion: proyecto.ubicacion,
          fechaInicio: proyecto.fechaInicio,
          fechaFin: proyecto.fechaFin,
          presProg: proyecto.presProg,
          presUsado: proyecto.presUsado,
          avance: proyecto.avance,
          descripcion: proyecto.descripcion,
          notas: proyecto.notas,
          sector: proyecto.sector,
          tipoReparacion: proyecto.tipoReparacion,
          tipoTrabajo: proyecto.tipoTrabajo,
          prioridad: proyecto.prioridad,
          estadoAprobacion: proyecto.estadoAprobacion,
          responsable: proyecto.responsable,
          responsableExterno: proyecto.responsableExterno,
          tiempoEstimado: proyecto.tiempoEstimado,
          monto: proyecto.monto,
          fechaInicioReal: proyecto.fechaInicioReal,
          fechaFinReal: proyecto.fechaFinReal,
          comentarios: proyecto.comentarios,
          centroCosto: proyecto.centroCosto,
          materiales: proyecto.materiales,
          herramientas: proyecto.herramientas,
          tareas: proyecto.tareas,
          personal: proyecto.personal,
          documentos: proyecto.documentos.map((d) => ({
            nombre: d.nombre,
            tipo: d.tipo,
            descripcion: d.descripcion,
            fechaDoc: d.fechaDoc,
            // Not including archivo (base64) to keep JSON small
          })),
          createdAt: proyecto.createdAt,
          updatedAt: proyecto.updatedAt,
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
              await uploadBase64Image(
                fotosAntes[i],
                `Foto Antes ${i + 1}.jpg`,
                folderIds.fotosAntes
              )
              stats.photos++
            } catch (err: any) {
              stats.errors.push(`Photo Antes ${i + 1} for ${codigo}: ${err.message}`)
            }
          }
        }

        // Upload fotosDespues
        const fotosDespues = parsePhotoArray(proyecto.fotosDespues)
        if (fotosDespues.length > 0 && folderIds.fotosDespues) {
          for (let i = 0; i < fotosDespues.length; i++) {
            try {
              await uploadBase64Image(
                fotosDespues[i],
                `Foto Despues ${i + 1}.jpg`,
                folderIds.fotosDespues
              )
              stats.photos++
            } catch (err: any) {
              stats.errors.push(`Photo Despues ${i + 1} for ${codigo}: ${err.message}`)
            }
          }
        }

        // Upload documentos (PDFs, cotizaciones, etc.)
        if (proyecto.documentos.length > 0 && folderIds.documentos) {
          for (const doc of proyecto.documentos) {
            try {
              if (doc.archivo) {
                // Check if it's base64 or URL
                if (doc.archivo.startsWith('data:') || doc.archivo.startsWith('/9j/') || doc.archivo.startsWith('iVBOR')) {
                  let base64 = doc.archivo
                  let mimeType = doc.tipo === 'cotizacion' ? 'application/pdf' : 'application/octet-stream'
                  if (base64.startsWith('data:')) {
                    const matches = base64.match(/^data:(\w+\/[\w+-]+);base64,/)
                    if (matches) mimeType = matches[1]
                    base64 = base64.replace(/^data:\w+\/[\w+-]+;base64,/, '')
                  }
                  const buffer = Buffer.from(base64, 'base64')
                  const ext = mimeType.includes('pdf') ? 'pdf' : mimeType.includes('image') ? 'jpg' : 'bin'
                  await uploadFile(
                    `${doc.nombre || 'Documento'}.${ext}`,
                    buffer,
                    mimeType,
                    folderIds.documentos
                  )
                }
              }
            } catch (err: any) {
              stats.errors.push(`Document for ${codigo}: ${err.message}`)
            }
          }
        }

        stats.projects++
      } catch (err: any) {
        console.error(`[Backup] Error processing project ${proyecto.codigo}:`, err)
        stats.errors.push(`Project ${proyecto.codigo}: ${err.message}`)
      }
    }

    // ================================================================
    // 4. FETCH ALL OTs and backup them
    // ================================================================
    const ordenes = await db.ordenTrabajo.findMany({
      include: {
        propiedad: { select: { id: true, nombre: true } },
        asignado: { select: { id: true, nombre: true, cargo: true } },
        centroCosto: { select: { id: true, codigo: true, nombre: true } },
        materiales: true,
        herramientas: true,
        tareas: true,
        personalOT: true,
        documentos: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    console.log(`[Backup] Found ${ordenes.length} OTs`)

    for (const ot of ordenes) {
      try {
        // OT folders go in the root parent folder (OT has no proyectoId relation)
        const parentFolderIdOT = parentFolderId

        const otTitulo = (ot.titulo || 'Sin titulo').substring(0, 60)
        const otFolders = await createOTFolderStructure(ot.otNum, otTitulo, parentFolderIdOT)

        // Upload OT data as JSON
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
          notas: ot.notas,
          estadoAprobacion: ot.estadoAprobacion,
          formaPago: ot.formaPago,
          propiedad: ot.propiedad,
          asignado: ot.asignado,
          centroCosto: ot.centroCosto,
          materiales: ot.materiales,
          herramientas: ot.herramientas,
          tareas: ot.tareas,
          personal: ot.personalOT,
          documentos: ot.documentos.map((d) => ({
            nombre: d.nombre,
            tipo: d.tipo,
          })),
          creadoPor: ot.creadoPorNombre,
          createdAt: ot.createdAt,
          updatedAt: ot.updatedAt,
        }

        await uploadFile(
          `Datos OT - ${ot.otNum}.json`,
          JSON.stringify(otData, null, 2),
          'application/json',
          otFolders.root
        )

        // Upload OT fotosAntes
        const fotosAntes = parsePhotoArray(ot.fotosAntes)
        if (fotosAntes.length > 0 && otFolders.fotos) {
          for (let i = 0; i < fotosAntes.length; i++) {
            try {
              await uploadBase64Image(
                fotosAntes[i],
                `Antes ${i + 1}.jpg`,
                otFolders.fotos
              )
              stats.photos++
            } catch (err: any) {
              stats.errors.push(`OT ${ot.otNum} Photo Antes ${i + 1}: ${err.message}`)
            }
          }
        }

        // Upload OT fotosDespues
        const fotosDespues = parsePhotoArray(ot.fotosDespues)
        if (fotosDespues.length > 0 && otFolders.fotos) {
          for (let i = 0; i < fotosDespues.length; i++) {
            try {
              await uploadBase64Image(
                fotosDespues[i],
                `Despues ${i + 1}.jpg`,
                otFolders.fotos
              )
              stats.photos++
            } catch (err: any) {
                stats.errors.push(`OT ${ot.otNum} Photo Despues ${i + 1}: ${err.message}`)
              }
            }
          }

        // Upload OT documentos (if any with base64)
        for (const doc of ot.documentos) {
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
              await uploadFile(
                `${doc.nombre || 'Documento'}.${ext}`,
                buffer,
                mimeType,
                otFolders.root
              )
            }
          } catch (err: any) {
            stats.errors.push(`OT ${ot.otNum} Doc ${doc.nombre}: ${err.message}`)
          }
        }

        stats.ots++
      } catch (err: any) {
        console.error(`[Backup] Error processing OT ${ot.otNum}:`, err)
        stats.errors.push(`OT ${ot.otNum}: ${err.message}`)
      }
    }

    // ================================================================
    // 5. FETCH ALL SOLICITUDES DE COMPRA and backup them as TXT
    // ================================================================
    const solicitudes = await db.solicitudCompra.findMany({
      orderBy: { createdAt: 'desc' },
    })

    console.log(`[Backup] Found ${solicitudes.length} solicitudes de compra`)

    for (const sc of solicitudes) {
      try {
        // Determine parent folder: inside project folder if origenTipo=Proyecto, else root
        let scFolderId = parentFolderId
        if (sc.origenTipo === 'Proyecto' && sc.origenId && proyectoDriveMap[sc.origenId]) {
          scFolderId = proyectoDriveMap[sc.origenId].solicitudes
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

        // Build TXT content
        const txt = [
          `SOLICITUD DE COMPRA`,
          `${'='.repeat(50)}`,
          `Codigo: ${sc.codigo}`,
          `Titulo: ${sc.titulo}`,
          `Estado: ${sc.estado}`,
          `Prioridad: ${sc.prioridad}`,
          `Etapa Aprobacion: ${sc.etapaAprobacion || 'N/A'}`,
          ``,
          `Descripcion:`,
          `${sc.descripcion || 'Sin descripcion'}`,
          ``,
          `Materiales:`,
          `${materialesText}`,
          ``,
          `Total Estimado: $${sc.totalEstimado || 0}`,
          `Solicitado Por: ${sc.solicitadoPor || 'N/A'}`,
          `Fecha Solicitud: ${sc.fechaSolicitud || 'N/A'}`,
          `Fecha Esperada: ${sc.fechaEspera || 'N/A'}`,
          `Proveedor Sugerido: ${sc.proveedorSugerido || 'N/A'}`,
          `Origen: ${sc.origenTipo || 'Manual'} ${sc.origenCodigo ? `(${sc.origenCodigo})` : ''}`,
          ``,
          `Observaciones:`,
          `${sc.observaciones || 'Sin observaciones'}`,
          ``,
          `Aprobacion Supervisor: ${sc.supervisorAprobadorNombre || 'Pendiente'} ${sc.supervisorFechaAprobacion ? `- ${new Date(sc.supervisorFechaAprobacion).toLocaleDateString('es-CL')}` : ''}`,
          `Aprobacion Admin: ${sc.adminAprobadorNombre || 'Pendiente'} ${sc.adminFechaAprobacion ? `- ${new Date(sc.adminFechaAprobacion).toLocaleDateString('es-CL')}` : ''}`,
          ``,
          `Links de compra:`,
          (() => { try { const links = JSON.parse(sc.links || '[]'); return Array.isArray(links) && links.length > 0 ? links.join('\n') : 'Sin links'; } catch { return 'Sin links'; } })(),
          ``,
          `Creado: ${sc.createdAt}`,
          `Actualizado: ${sc.updatedAt}`,
        ].join('\n')

        await uploadFile(
          `SC ${sc.codigo} - ${sc.titulo}.txt`,
          txt,
          'text/plain',
          scFolderId
        )

        stats.scs++
      } catch (err: any) {
        console.error(`[Backup] Error processing SC ${sc.codigo}:`, err)
        stats.errors.push(`SC ${sc.codigo}: ${err.message}`)
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`[Backup] Completed in ${elapsed}s`, stats)

    return NextResponse.json({
      success: true,
      message: `Backup completado en ${elapsed}s`,
      stats,
    })
  } catch (error: any) {
    console.error('[Backup] Fatal error:', error)
    return NextResponse.json(
      { success: false, error: error.message, stats },
      { status: 500 }
    )
  }
}
