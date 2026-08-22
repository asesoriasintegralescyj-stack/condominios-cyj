import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * Endpoint para respaldar TODOS los proyectos, OTs y solicitudes de compra
 * existentes a Google Drive con sus archivos reales.
 *
 * - Proyectos: sube JSON de datos + fotos antes/después a sus carpetas
 * - OTs: crea subcarpeta dentro del proyecto y sube datos + fotos
 * - Solicitudes de Compra: sube TXT con detalle a la carpeta del proyecto
 */
export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    proyectos: { total: 0, carpetasCreadas: 0, archivosSubidos: 0, fotosSubidas: 0, errores: [] as string[] },
    ots: { total: 0, carpetasCreadas: 0, archivosSubidos: 0, fotosSubidas: 0, errores: [] as string[] },
    solicitudes: { total: 0, archivosSubidos: 0, errores: [] as string[] },
  }

  if (!process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT || !process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID) {
    return NextResponse.json({ error: 'Drive no configurado. Faltan variables de entorno.' }, { status: 400 })
  }

  try {
    const {
      createProjectFolderStructure, createOTFolderStructure,
      uploadFile, uploadBase64Image, createFolder, findFolderByName,
    } = await import('@/lib/google-drive')

    // ═══════════════════════════════════════════
    // 1. PROYECTOS
    // ═══════════════════════════════════════════
    const proyectos = await db.proyecto.findMany({
      select: {
        id: true, codigo: true, nombre: true, estado: true, descripcion: true,
        sector: true, tipoReparacion: true, tipoTrabajo: true, prioridad: true,
        responsable: true, monto: true, categoria: true, ubicacion: true,
        driveFolderId: true, driveData: true, createdAt: true, updatedAt: true,
        fotosAntes: true, fotosDespues: true,
        materiales: { select: { descripcion: true, cantidad: true, unidad: true, precioUnit: true, total: true } },
        herramientas: { select: { nombre: true, cantidad: true } },
        tareas: { select: { descripcion: true, cantidad: true, estado: true } },
        personal: { select: { nombre: true, tipo: true, cantidad: true, precioUnit: true, total: true } },
        documentos: { select: { nombre: true, tipo: true, descripcion: true, fechaDoc: true } },
        ordenesTrabajo: { select: { id: true, otNum: true, titulo: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    results.proyectos.total = proyectos.length

    // Mapa de proyectoId -> driveData para usar con OTs y SCs
    const proyectoDriveMap = new Map<string, any>()

    for (const p of proyectos) {
      try {
        let folders: any = null

        // Si ya tiene driveData, usarlo
        if (p.driveData) {
          try { folders = JSON.parse(p.driveData) } catch { folders = null }
        }

        // Si no tiene carpetas o driveData es inválido, crear
        if (!folders || !folders.proyectoFolder?.id) {
          console.log(`[Backup] Creando carpetas para ${p.codigo}...`)
          const structure = await createProjectFolderStructure(p.codigo, p.nombre)
          folders = {
            proyectoFolder: structure.proyectoFolder,
            solicitudesFolder: structure.solicitudesFolder,
            documentosFolder: structure.documentosFolder,
            fotosAntesFolder: structure.fotosAntesFolder,
            fotosDespuesFolder: structure.fotosDespuesFolder,
            createdAt: new Date().toISOString(),
          }
          await db.proyecto.update({
            where: { id: p.id },
            data: {
              driveFolderId: structure.proyectoFolder.id,
              driveData: JSON.stringify(folders),
            },
          })
          results.proyectos.carpetasCreadas++
        }

        proyectoDriveMap.set(p.id, folders)

        const docsFolderId = folders.documentosFolder?.id
        const fotosAntesFolderId = folders.fotosAntesFolder?.id
        const fotosDespuesFolderId = folders.fotosDespuesFolder?.id

        if (!docsFolderId) {
          results.proyectos.errores.push(`${p.codigo}: sin carpeta Documentos`)
          continue
        }

        // ── Subir datos del proyecto como JSON ──
        const datosProyecto = {
          respaldo: `Proyecto ${p.codigo}`,
          fechaGenerado: new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' }),
          proyecto: {
            id: p.id, codigo: p.codigo, nombre: p.nombre, categoria: p.categoria,
            estado: p.estado, ubicacion: p.ubicacion, descripcion: p.descripcion,
            sector: p.sector, tipoReparacion: p.tipoReparacion, tipoTrabajo: p.tipoTrabajo,
            prioridad: p.prioridad, responsable: p.responsable, monto: p.monto,
            createdAt: p.createdAt, updatedAt: p.updatedAt,
          },
          materiales: p.materiales,
          herramientas: p.herramientas,
          tareas: p.tareas,
          personal: p.personal,
          documentos: p.documentos,
          totalOTs: p.ordenesTrabajo?.length || 0,
        }

        await uploadFile(
          Buffer.from(JSON.stringify(datosProyecto, null, 2), 'utf-8'),
          `Datos del proyecto - ${p.codigo}.json`,
          docsFolderId,
          'application/json'
        )
        results.proyectos.archivosSubidos++

        // ── Subir fotos ANTES (si tiene) ──
        if (p.fotosAntes && fotosAntesFolderId) {
          const fotos = parseBase64Array(p.fotosAntes)
          for (let i = 0; i < fotos.length; i++) {
            try {
              const f = fotos[i]
              const ext = getExtensionFromDataUrl(f)
              await uploadBase64Image(
                f,
                `Foto Antes ${i + 1} - ${p.codigo}.${ext}`,
                fotosAntesFolderId
              )
              results.proyectos.fotosSubidas++
            } catch (e: any) {
              results.proyectos.errores.push(`${p.codigo} foto-antes-${i + 1}: ${e.message}`)
            }
          }
        }

        // ── Subir fotos DESPUÉS (si tiene) ──
        if (p.fotosDespues && fotosDespuesFolderId) {
          const fotos = parseBase64Array(p.fotosDespues)
          for (let i = 0; i < fotos.length; i++) {
            try {
              const f = fotos[i]
              const ext = getExtensionFromDataUrl(f)
              await uploadBase64Image(
                f,
                `Foto Despues ${i + 1} - ${p.codigo}.${ext}`,
                fotosDespuesFolderId
              )
              results.proyectos.fotosSubidas++
            } catch (e: any) {
              results.proyectos.errores.push(`${p.codigo} foto-despues-${i + 1}: ${e.message}`)
            }
          }
        }

        console.log(`[Backup] Proyecto ${p.codigo} OK (${docsFolderId})`)
      } catch (e: any) {
        results.proyectos.errores.push(`${p.codigo}: ${e.message}`)
        console.error(`[Backup] Error proyecto ${p.codigo}:`, e)
      }
    }

    // ═══════════════════════════════════════════
    // 2. ÓRDENES DE TRABAJO
    // ═══════════════════════════════════════════
    const allOTs = await db.ordenTrabajo.findMany({
      select: {
        id: true, otNum: true, titulo: true, tipo: true, prioridad: true,
        estado: true, descripcion: true, proyectoId: true, driveFolderId: true,
        fechaInicio: true, fechaLimite: true, fechaInicioReal: true, fechaFinReal: true,
        costoEstimado: true, costoReal: true, progreso: true, ubicacion: true,
        creadoPorNombre: true, notas: true, createdAt: true,
        fotosAntes: true, fotosDespues: true,
        materiales: { select: { descripcion: true, cantidad: true, unidad: true, precioUnit: true, total: true } },
        herramientas: { select: { nombre: true, cantidad: true } },
        tareas: { select: { descripcion: true, cantidad: true, estado: true } },
        personalOT: { select: { nombre: true, tipo: true, cantidad: true, horasTrabajadas: true, total: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    results.ots.total = allOTs.length

    for (const ot of allOTs) {
      try {
        // Buscar el proyecto padre y sus carpetas Drive
        let parentDriveFolderId: string | null = null
        let proyectoCodigo = ''

        if (ot.proyectoId) {
          const driveInfo = proyectoDriveMap.get(ot.proyectoId)
          if (driveInfo?.proyectoFolder?.id) {
            parentDriveFolderId = driveInfo.proyectoFolder.id
          }
          if (!proyectoCodigo) {
            const proy = await db.proyecto.findUnique({
              where: { id: ot.proyectoId },
              select: { codigo: true },
            })
            proyectoCodigo = proy?.codigo || ''
          }
        }

        // Si no tiene proyecto con Drive, crear carpeta OT en raíz
        if (!parentDriveFolderId) {
          parentDriveFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID!
        }

        // Verificar si ya tiene carpetas Drive
        let otFolders: any = null
        if (ot.driveFolderId) {
          // Ya tiene carpeta, pero necesitamos las subcarpetas
          // Intentar encontrar las subcarpetas existentes
          const existingOTFolder = await findFolderByName(`${ot.otNum} - ${ot.titulo}`, parentDriveFolderId)
          if (existingOTFolder) {
            const [fa, fd, doc, sc] = await Promise.all([
              findFolderByName('Fotos Antes', existingOTFolder.id).catch(() => null),
              findFolderByName('Fotos Despues', existingOTFolder.id).catch(() => null),
              findFolderByName('Documentos', existingOTFolder.id).catch(() => null),
              findFolderByName('Solicitudes de Compra', existingOTFolder.id).catch(() => null),
            ])
            otFolders = {
              otFolder: existingOTFolder,
              fotosAntesFolder: fa,
              fotosDespuesFolder: fd,
              documentosFolder: doc,
              solicitudesFolder: sc,
            }
          }
        }

        // Si no tiene carpetas, crear
        if (!otFolders || !otFolders.otFolder) {
          console.log(`[Backup] Creando carpetas para ${ot.otNum}...`)
          const structure = await createOTFolderStructure(ot.otNum, ot.titulo, parentDriveFolderId)
          otFolders = {
            otFolder: structure.otFolder,
            fotosAntesFolder: structure.fotosAntesFolder,
            fotosDespuesFolder: structure.fotosDespuesFolder,
            documentosFolder: structure.documentosFolder,
            solicitudesFolder: structure.solicitudesFolder,
          }
          await db.ordenTrabajo.update({
            where: { id: ot.id },
            data: { driveFolderId: structure.otFolder.id },
          })
          results.ots.carpetasCreadas++
        }

        // ── Subir datos de la OT ──
        const otDocsFolderId = otFolders.documentosFolder?.id
        if (otDocsFolderId) {
          const datosOT = {
            respaldo: `Orden de Trabajo ${ot.otNum}`,
            fechaGenerado: new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' }),
            ordenTrabajo: {
              id: ot.id, otNum: ot.otNum, titulo: ot.titulo, tipo: ot.tipo,
              prioridad: ot.prioridad, estado: ot.estado, descripcion: ot.descripcion,
              ubicacion: ot.ubicacion, progreso: ot.progreso,
              fechaInicio: ot.fechaInicio, fechaLimite: ot.fechaLimite,
              fechaInicioReal: ot.fechaInicioReal, fechaFinReal: ot.fechaFinReal,
              costoEstimado: ot.costoEstimado, costoReal: ot.costoReal,
              creadoPor: ot.creadoPorNombre, proyecto: proyectoCodigo || 'Sin proyecto',
              createdAt: ot.createdAt,
            },
            materiales: ot.materiales,
            herramientas: ot.herramientas,
            tareas: ot.tareas,
            personal: ot.personalOT,
          }

          await uploadFile(
            Buffer.from(JSON.stringify(datosOT, null, 2), 'utf-8'),
            `Datos OT - ${ot.otNum}.json`,
            otDocsFolderId,
            'application/json'
          )
          results.ots.archivosSubidos++
        }

        // ── Subir fotos ANTES de OT ──
        if (ot.fotosAntes && otFolders.fotosAntesFolder?.id) {
          const fotos = parseBase64Array(ot.fotosAntes)
          for (let i = 0; i < fotos.length; i++) {
            try {
              const ext = getExtensionFromDataUrl(fotos[i])
              await uploadBase64Image(
                fotos[i],
                `Foto Antes ${i + 1} - ${ot.otNum}.${ext}`,
                otFolders.fotosAntesFolder.id
              )
              results.ots.fotosSubidas++
            } catch (e: any) {
              results.ots.errores.push(`${ot.otNum} foto-antes-${i + 1}: ${e.message}`)
            }
          }
        }

        // ── Subir fotos DESPUÉS de OT ──
        if (ot.fotosDespues && otFolders.fotosDespuesFolder?.id) {
          const fotos = parseBase64Array(ot.fotosDespues)
          for (let i = 0; i < fotos.length; i++) {
            try {
              const ext = getExtensionFromDataUrl(fotos[i])
              await uploadBase64Image(
                fotos[i],
                `Foto Despues ${i + 1} - ${ot.otNum}.${ext}`,
                otFolders.fotosDespuesFolder.id
              )
              results.ots.fotosSubidas++
            } catch (e: any) {
              results.ots.errores.push(`${ot.otNum} foto-despues-${i + 1}: ${e.message}`)
            }
          }
        }

        console.log(`[Backup] OT ${ot.otNum} OK`)
      } catch (e: any) {
        results.ots.errores.push(`${ot.otNum}: ${e.message}`)
        console.error(`[Backup] Error OT ${ot.otNum}:`, e)
      }
    }

    // ═══════════════════════════════════════════
    // 3. SOLICITUDES DE COMPRA
    // ═══════════════════════════════════════════
    const allSCs = await db.solicitudCompra.findMany({
      select: {
        id: true, codigo: true, titulo: true, descripcion: true, estado: true,
        prioridad: true, moneda: true, totalEstimado: true, solicitadoPor: true,
        fechaSolicitud: true, fechaEspera: true, proveedorSugerido: true,
        observaciones: true, origenTipo: true, origenId: true, origenCodigo: true,
        proyectoId: true, proyectoNombre: true, otId: true, otCodigo: true,
        materiales: true, links: true, createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    results.solicitudes.total = allSCs.length

    for (const sc of allSCs) {
      try {
        // Buscar la carpeta de solicitudes del proyecto
        let scFolderId: string | null = null
        let proyCodigo = ''

        // Primero intentar por proyectoId directo
        if (sc.proyectoId) {
          const driveInfo = proyectoDriveMap.get(sc.proyectoId)
          if (driveInfo?.solicitudesFolder?.id) {
            scFolderId = driveInfo.solicitudesFolder.id
          }
          if (!proyCodigo) proyCodigo = sc.proyectoNombre || ''
        }

        // Segundo intentar por origenId (proyecto)
        if (!scFolderId && sc.origenTipo === 'Proyecto' && sc.origenId) {
          const driveInfo = proyectoDriveMap.get(sc.origenId)
          if (driveInfo?.solicitudesFolder?.id) {
            scFolderId = driveInfo.solicitudesFolder.id
          }
          if (!proyCodigo) proyCodigo = sc.origenCodigo || ''
        }

        // Tercero intentar por otId -> proyecto
        if (!scFolderId && sc.otId) {
          const ot = allOTs.find(o => o.id === sc.otId)
          if (ot?.proyectoId) {
            const driveInfo = proyectoDriveMap.get(ot.proyectoId)
            if (driveInfo?.solicitudesFolder?.id) {
              scFolderId = driveInfo.solicitudesFolder.id
            }
          }
        }

        if (!scFolderId) {
          // No se encontró carpeta de proyecto para esta SC
          results.solicitudes.errores.push(`${sc.codigo}: sin carpeta de proyecto (proyectoId=${sc.proyectoId}, origen=${sc.origenTipo}/${sc.origenId})`)
          continue
        }

        // Generar contenido TXT de la SC
        const materiales = parseMateriales(sc.materiales)
        const links = parseLinks(sc.links)

        let content = `SOLICITUD DE COMPRA: ${sc.codigo}\n`
        content += `Fecha generacion: ${new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' })}\n`
        content += `${'='.repeat(60)}\n\n`
        content += `Titulo: ${sc.titulo}\n`
        if (sc.descripcion) content += `Descripcion: ${sc.descripcion}\n`
        content += `Estado: ${sc.estado}\n`
        content += `Prioridad: ${sc.prioridad}\n`
        if (sc.solicitadoPor) content += `Solicitado por: ${sc.solicitadoPor}\n`
        if (sc.fechaSolicitud) content += `Fecha solicitud: ${sc.fechaSolicitud}\n`
        if (sc.fechaEspera) content += `Fecha esperada: ${sc.fechaEspera}\n`
        if (sc.proveedorSugerido) content += `Proveedor sugerido: ${sc.proveedorSugerido}\n`
        if (sc.observaciones) content += `Observaciones: ${sc.observaciones}\n`
        content += `Moneda: ${sc.moneda}\n`
        content += `Total estimado: $${Number(sc.totalEstimado || 0).toLocaleString('es-CL')}\n`
        if (sc.origenCodigo) content += `Origen: ${sc.origenTipo} ${sc.origenCodigo}\n`
        if (proyCodigo) content += `Proyecto: ${proyCodigo}\n`
        if (sc.otCodigo) content += `OT: ${sc.otCodigo}\n`

        if (materiales.length > 0) {
          content += `\n${'-'.repeat(60)}\nMATERIALES (${materiales.length}):\n`
          for (const m of materiales) {
            content += `\n  * ${m.nombre || 'Sin nombre'}`
            content += `\n    Cantidad: ${m.cantidad} ${m.unidad || ''}`
            if (m.precioEstimado) content += ` | Precio unit: $${Number(m.precioEstimado).toLocaleString('es-CL')}`
            if (m.total) content += ` | Total: $${Number(m.total).toLocaleString('es-CL')}`
          }
          content += `\n  ----------------------------------------`
          content += `\n  TOTAL MATERIALES: $${materiales.reduce((s, m) => s + (Number(m.total) || 0), 0).toLocaleString('es-CL')}`
        }

        if (links.length > 0) {
          content += `\n\n${'-'.repeat(60)}\nLINKS DE REFERENCIA:\n`
          for (const link of links) {
            content += `  - ${link}\n`
          }
        }

        content += `\n\n${'='.repeat(60)}\n`
        content += `Respaldo automatico - Sistema Condominios CYJ\n`

        const safeName = `${sc.codigo} - ${sc.titulo}`.replace(/[/\\?%*:|"<>]/g, '-')
        await uploadFile(
          Buffer.from(content, 'utf-8'),
          `${safeName}.txt`,
          scFolderId,
          'text/plain'
        )
        results.solicitudes.archivosSubidos++
        console.log(`[Backup] SC ${sc.codigo} OK -> ${scFolderId}`)
      } catch (e: any) {
        results.solicitudes.errores.push(`${sc.codigo}: ${e.message}`)
        console.error(`[Backup] Error SC ${sc.codigo}:`, e)
      }
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 })
  }

  return NextResponse.json(results, { status: 200 })
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

/** Parsea un campo JSON de fotos (array de data URLs base64) */
function parseBase64Array(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === 'string' && x.startsWith('data:'))
    }
  } catch {}
  return []
}

/** Extrae la extensión de un data URL (data:image/png;base64,... → png) */
function getExtensionFromDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:image\/(\w+);base64,/)
  if (match) {
    const mime = match[1]
    const map: Record<string, string> = { jpeg: 'jpg', png: 'png', webp: 'webp', gif: 'gif', bmp: 'bmp' }
    return map[mime] || 'jpg'
  }
  return 'jpg'
}

/** Parsea materiales de una SC */
function parseMateriales(raw: string | null | undefined): any[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
  } catch {}
  return []
}

/** Parsea links de una SC */
function parseLinks(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.filter((x): x is string => typeof x === 'string')
  } catch {}
  return []
}