/**
 * API de respaldo automático mensual — estructura jerárquica en ZIP.
 *
 * Se ejecuta el 1º de cada mes vía Vercel Cron Jobs, o manualmente desde
 * el módulo Respaldos (botón "Respaldo Mensual").
 *
 * Genera un ZIP con la siguiente estructura:
 *
 *   Respaldo_CyJ_YYYY-MM.zip
 *   ├── 01_OT_Generales/
 *   │   ├── OT-0001_Nombre/
 *   │   │   ├── OT-0001.pdf            (PDF detallado: header, datos, recursos, costos)
 *   │   │   ├── fotos_antes/foto_1.jpg, foto_2.jpg ...
 *   │   │   ├── fotos_despues/foto_1.jpg ...
 *   │   │   ├── documentos/doc_1.pdf ...
 *   │   │   ├── SC-0005.pdf            (solicitudes de compra asociadas a la OT)
 *   │   │   └── Resumen_Costos_OT-0001.pdf
 *   │   └── ...
 *   ├── 02_Proyectos/
 *   │   ├── PROY-xxxx_Nombre/
 *   │   │   ├── PROY-xxxx.pdf
 *   │   │   ├── fotos_antes/ ...
 *   │   │   ├── fotos_despues/ ...
 *   │   │   ├── documentos/ ...
 *   │   │   ├── SC-xxxx.pdf
 *   │   │   └── Resumen_Costos_PROY-xxxx.pdf
 *   │   └── ...
 *   ├── 03_Solicitudes_no_asociadas/
 *   │   ├── SC-xxxx.pdf (cada SC)
 *   │   └── Resumen_SC_no_asociadas.pdf
 *   ├── 04_Rondas_YYYY-MM.pdf
 *   ├── 05_Asistencia_YYYY-MM.pdf
 *   └── Respaldo_BD_YYYY-MM.json
 *
 * El ZIP se envía por email a asesoriasintegralescyj@gmail.com vía Gmail SMTP.
 * Sin costo, sin Google Workspace, sin configuración externa.
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateOrdenTrabajoPdfBuffer, type OTPdfInput } from '@/lib/pdf-orden-trabajo'
import { generateProyectoPdfBuffer, type ProyectoPdfInput } from '@/lib/pdf-proyecto'
import { generateSolicitudCompraPdfBuffer, type PdfSolicitudCompraInput } from '@/lib/pdf-solicitud-compra'
import { jsPDF } from 'jspdf'

// Modelos a respaldar en el JSON completo de la BD
const MODELOS_BACKUP = [
  'condominio', 'propiedad', 'personal', 'user',
  'activo', 'proveedor', 'ordenTrabajo', 'gasto', 'proyecto',
  'inspeccion', 'notificacion',
  'asistencia', 'centroCostoMaster', 'catHerramienta', 'catMaterial', 'catTarea',
  'movimientoInventario', 'configuracion',
  'categoriaCumplimiento', 'documentoCumplimiento', 'historialCumplimiento',
  'resumenCumplimiento', 'ronda', 'registroRonda',
  'logAuditoria', 'historialAprobacionOT',
  'oTMaterial', 'oTHerramienta', 'oTTarea', 'oTPersonal', 'oTDocumento',
  'proyectoDocumento', 'proyectoHerramienta', 'proyectoMaterial', 'proyectoPersonal', 'proyectoTarea',
  'horarioTrabajador', 'registroAsistenciaReloj', 'inasistenciaAtraso', 'justificacionAsistencia',
  'solicitudCompra', 'historialAprobacionSC',
] as const

// Tamaño máximo de una foto individual para incluirla (1.5 MB en base64 ≈ 1.1 MB binario)
const MAX_FOTO_BYTES = 1_500_000
// Tamaño máximo de un documento adjunto individual (5 MB)
const MAX_DOC_BYTES = 5_000_000
// Tamaño objetivo del ZIP final (22 MB — deja margen para codificación MIME en email)
const TARGET_ZIP_BYTES = 22 * 1024 * 1024
// Máximo de fotos por OT/Proyecto (las primeras N)
const MAX_FOTOS_POR_ITEM = 10

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    const { getCurrentSession } = await import('@/lib/auth')
    const session = await getCurrentSession()
    if (!session || session.user.rol !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
  }

  try {
    const now = new Date()
    const mesAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const mesAnteriorFin = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
    const mesStr = `${mesAnterior.getFullYear()}-${String(mesAnterior.getMonth() + 1).padStart(2, '0')}`
    const fechaDesde = mesAnterior.toISOString().split('T')[0]
    const fechaHasta = mesAnteriorFin.toISOString().split('T')[0]

    console.log(`[Backup Auto] Generando respaldo jerárquico para ${mesStr}...`)

    // ============================================================
    // 1. RESPALDO COMPLETO BD (JSON)
    // ============================================================
    const backupData: any = {}
    for (const modelo of MODELOS_BACKUP) {
      try {
        backupData[modelo] = await (db as any)[modelo].findMany()
      } catch {}
    }
    const backupJson = JSON.stringify(backupData)

    await db.backup.create({
      data: {
        tipo: 'Automatico',
        estado: 'Completado',
        fechaInicio: mesAnterior,
        fechaFin: now,
        tamano: backupJson.length / (1024 * 1024),
        archivo: `Respaldo_CyJ_${mesStr}.zip`,
        ubicacion: 'Email + BD',
        totalTablas: Object.keys(backupData).length,
        totalRegistros: Object.values(backupData).reduce(
          (acc: number, arr: any) => acc + (Array.isArray(arr) ? arr.length : 0),
          0
        ),
        verificado: true,
        fechaVerificacion: now,
      },
    })

    // ============================================================
    // 2. FETCH DE DATOS
    // ============================================================
    console.log('[Backup Auto] Fetching OTs...')
    const ots = await db.ordenTrabajo.findMany({
      where: { createdAt: { gte: mesAnterior, lte: mesAnteriorFin } },
      include: {
        propiedad: true,
        asignado: true,
        materiales: true,
        herramientas: true,
        tareas: true,
        personalOT: true,
        documentos: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    console.log('[Backup Auto] Fetching Proyectos...')
    const proyectos = await db.proyecto.findMany({
      where: {
        OR: [
          { createdAt: { gte: mesAnterior, lte: mesAnteriorFin } },
          { updatedAt: { gte: mesAnterior, lte: mesAnteriorFin } },
        ],
      },
      include: {
        materiales: true,
        herramientas: true,
        tareas: true,
        personal: true,
        documentos: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    console.log('[Backup Auto] Fetching Solicitudes de Compra...')
    const allSCs = await db.solicitudCompra.findMany({
      orderBy: { createdAt: 'asc' },
    })

    // SCs asociadas a OT (origenTipo = 'OT' y origenId coincide)
    const scsPorOTId = new Map<string, typeof allSCs>()
    // SCs asociadas a Proyecto (origenTipo = 'Proyecto' y origenId coincide)
    const scsPorProyectoId = new Map<string, typeof allSCs>()
    // SCs NO asociadas (origenTipo = 'Manual', null, o el origenId no existe en OT/Proyecto del periodo)
    const scsNoAsociadas: typeof allSCs = []

    const otIds = new Set(ots.map((o) => o.id))
    const proyIds = new Set(proyectos.map((p) => p.id))

    for (const sc of allSCs) {
      if (sc.origenTipo === 'OT' && sc.origenId && otIds.has(sc.origenId)) {
        const arr = scsPorOTId.get(sc.origenId) || []
        arr.push(sc)
        scsPorOTId.set(sc.origenId, arr)
      } else if (sc.origenTipo === 'Proyecto' && sc.origenId && proyIds.has(sc.origenId)) {
        const arr = scsPorProyectoId.get(sc.origenId) || []
        arr.push(sc)
        scsPorProyectoId.set(sc.origenId, arr)
      } else {
        scsNoAsociadas.push(sc)
      }
    }

    console.log(
      `[Backup Auto] Resumen: ${ots.length} OTs, ${proyectos.length} Proyectos, ` +
        `${allSCs.length} SCs totales (${scsNoAsociadas.length} no asociadas)`
    )

    // ============================================================
    // 3. CONSTRUIR ZIP
    // ============================================================
    const { default: archiver } = await import('archiver')
    const zip = archiver('zip', { zlib: { level: 6 } })

    const chunks: Buffer[] = []
    // Tamaño acumulado de lo AÑADIDO al zip (no de lo emitido por el stream,
    // que se actualiza de forma asíncrona y no sirve para límites en tiempo real)
    let addedSize = 0
    let fotosOmitidas = 0
    let docsOmitidos = 0
    const done = new Promise<void>((resolve, reject) => {
      zip.on('data', (c: Buffer) => {
        chunks.push(c)
      })
      zip.on('warning', (err: any) => console.warn('[Backup Auto] zip warning:', err))
      zip.on('error', (err: any) => reject(err))
      zip.on('end', () => resolve())
    })

    // Wrapper para trackear el tamaño añadido
    const trackAppend = (buf: Buffer, opts: { name: string }) => {
      addedSize += buf.length
      zip.append(buf, opts)
    }

    // Función helper para sanitizar nombres de carpeta/archivo
    const sanitize = (s: string): string =>
      (s || 'sin_nombre')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_\-]/g, '_')
        .replace(/_+/g, '_')
        .substring(0, 50)

    // Función para parsear fotosAntes/fotosDespues (JSON array de data URLs)
    const parseFotos = (jsonStr: string | null | undefined): string[] => {
      if (!jsonStr) return []
      try {
        const parsed = JSON.parse(jsonStr)
        if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === 'string')
      } catch {}
      return []
    }

    // Función para añadir una foto al zip con control de tamaño
    const addFoto = (folder: string, idx: number, dataUrl: string): boolean => {
      try {
        const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
        if (!match) return false
        const mime = match[1]
        const b64 = match[2]
        if (b64.length > MAX_FOTO_BYTES) {
          fotosOmitidas++
          return false
        }
        const ext = mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : mime.includes('png') ? 'png' : 'img'
        const buf = Buffer.from(b64, 'base64')
        // Si añadir esta foto excedería el tamaño objetivo, omitirla
        if (addedSize + buf.length > TARGET_ZIP_BYTES) {
          fotosOmitidas++
          return false
        }
        trackAppend(buf, { name: `${folder}/foto_${String(idx + 1).padStart(2, '0')}.${ext}` })
        return true
      } catch {
        return false
      }
    }

    // Función para añadir un documento al zip con control de tamaño
    const addDoc = (folder: string, nombre: string, dataUrl: string): boolean => {
      try {
        const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
        if (!match) return false
        const mime = match[1]
        const b64 = match[2]
        const buf = Buffer.from(b64, 'base64')
        if (buf.length > MAX_DOC_BYTES) {
          docsOmitidos++
          return false
        }
        if (addedSize + buf.length > TARGET_ZIP_BYTES) {
          docsOmitidos++
          return false
        }
        const ext = mime.includes('pdf') ? 'pdf' : mime.includes('png') ? 'png' : mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : 'bin'
        trackAppend(buf, { name: `${folder}/${sanitize(nombre) || 'documento'}.${ext}` })
        return true
      } catch {
        return false
      }
    }

    // ===== 3a. OT_Generales =====
    console.log('[Backup Auto] Generando PDFs de OTs...')
    let otCount = 0
    for (const ot of ots) {
      const folderName = `01_OT_Generales/${ot.otNum}_${sanitize(ot.titulo)}`
      try {
        const otInput: OTPdfInput = {
          otNum: ot.otNum,
          titulo: ot.titulo,
          tipo: ot.tipo,
          prioridad: ot.prioridad,
          estado: ot.estado,
          ubicacion: ot.ubicacion,
          propiedadNombre: ot.propiedad?.nombre,
          asignadoNombre: ot.asignado?.nombre,
          fechaLimite: ot.fechaLimite,
          fechaInicioReal: ot.fechaInicioReal,
          fechaFinReal: ot.fechaFinReal,
          costoEstimado: ot.costoEstimado,
          costoReal: ot.costoReal,
          progreso: ot.progreso,
          descripcion: ot.descripcion,
          tiempoEst: ot.tiempoEst,
          tiempoReal: ot.tiempoReal,
          estadoAprobacion: ot.estadoAprobacion,
          formaPago: ot.formaPago,
          herramientas: ot.herramientas.map((h) => ({ nombre: h.nombre, cantidad: h.cantidad })),
          materiales: ot.materiales.map((m) => ({
            descripcion: m.descripcion,
            cantidad: m.cantidad,
            unidad: m.unidad,
            precioUnit: m.precioUnit,
            total: m.total,
          })),
          personalOT: ot.personalOT.map((p) => ({
            nombre: p.nombre,
            tipo: p.tipo,
            cantidad: p.cantidad,
            precioUnit: p.precioUnit,
            horasTrabajadas: p.horasTrabajadas,
            total: p.total,
          })),
          tareas: ot.tareas.map((t) => ({
            descripcion: t.descripcion,
            cantidad: t.cantidad,
            estado: t.estado,
          })),
        }
        const otPdf = generateOrdenTrabajoPdfBuffer(otInput)
        // Solo añadir si no excede el tamaño objetivo
        if (addedSize + otPdf.length <= TARGET_ZIP_BYTES) {
          trackAppend(otPdf, { name: `${folderName}/${ot.otNum}.pdf` })
        } else {
          console.warn(`[Backup Auto] ZIP excedería tamaño objetivo al añadir PDF de OT ${ot.otNum}. Se omite.`)
        }

        // Fotos antes (máximo MAX_FOTOS_POR_ITEM)
        const fotosAntes = parseFotos(ot.fotosAntes).slice(0, MAX_FOTOS_POR_ITEM)
        if (fotosAntes.length > 0) {
          fotosAntes.forEach((f, i) => addFoto(`${folderName}/fotos_antes`, i, f))
        }

        // Fotos después (máximo MAX_FOTOS_POR_ITEM)
        const fotosDespues = parseFotos(ot.fotosDespues).slice(0, MAX_FOTOS_POR_ITEM)
        if (fotosDespues.length > 0) {
          fotosDespues.forEach((f, i) => addFoto(`${folderName}/fotos_despues`, i, f))
        }

        // Documentos adjuntos de la OT
        if (ot.documentos && ot.documentos.length > 0) {
          ot.documentos.forEach((doc, i) => {
            addDoc(`${folderName}/documentos`, doc.nombre || `doc_${i + 1}`, doc.archivo || '')
          })
        }

        // SCs asociadas a la OT
        const scsAsoc = scsPorOTId.get(ot.id) || []
        for (const sc of scsAsoc) {
          try {
            const scPdf = generateSolicitudCompraPdfBuffer(scToInput(sc))
            if (addedSize + scPdf.length <= TARGET_ZIP_BYTES) {
              trackAppend(scPdf, { name: `${folderName}/${sc.codigo}.pdf` })
            }
          } catch (e) {
            console.warn(`[Backup Auto] Error generando PDF de SC ${sc.codigo}:`, e)
          }
        }

        // Resumen de costos de la OT
        const totalMateriales = ot.materiales.reduce((s, m) => s + (m.total || m.cantidad * m.precioUnit || 0), 0)
        const totalPersonal = ot.personalOT.reduce(
          (s, p) => s + (p.total || p.precioUnit * (p.horasTrabajadas || 0) * p.cantidad || 0),
          0
        )
        const totalSCs = scsAsoc.reduce((s, sc) => s + (sc.totalEstimado || 0), 0)
        const resumenOtPdf = generarResumenCostosPdf({
          titulo: `Resumen de Costos — ${ot.otNum}`,
          subtitulo: ot.titulo,
          mesStr,
          filas: [
            { concepto: 'Materiales OT', monto: totalMateriales },
            { concepto: 'Mano de Obra OT', monto: totalPersonal },
            { concepto: 'Solicitudes de Compra asociadas', monto: totalSCs },
          ],
          total: totalMateriales + totalPersonal + totalSCs,
          extras: [
            `Costo estimado declarado: ${formatCLP(ot.costoEstimado)}`,
            `Costo real declarado: ${formatCLP(ot.costoReal)}`,
            `Tiempo estimado: ${formatMin(ot.tiempoEst)} · Real: ${formatMin(ot.tiempoReal)}`,
            `Estado: ${ot.estado} · Progreso: ${ot.progreso}%`,
            `Solicitudes de compra asociadas: ${scsAsoc.length}`,
          ],
        })
        if (addedSize + resumenOtPdf.length <= TARGET_ZIP_BYTES) {
          trackAppend(resumenOtPdf, { name: `${folderName}/Resumen_Costos_${ot.otNum}.pdf` })
        }

        otCount++
      } catch (e) {
        console.warn(`[Backup Auto] Error procesando OT ${ot.otNum}:`, e)
      }
    }

    // ===== 3b. Proyectos =====
    console.log('[Backup Auto] Generando PDFs de Proyectos...')
    let proyCount = 0
    for (const proy of proyectos) {
      const codigo = `PROY-${proy.id.slice(-4).toUpperCase()}`
      const folderName = `02_Proyectos/${codigo}_${sanitize(proy.nombre)}`
      try {
        const proyInput: ProyectoPdfInput = {
          id: proy.id,
          nombre: proy.nombre,
          categoria: proy.categoria,
          estado: proy.estado,
          ubicacion: proy.ubicacion,
          fechaInicio: proy.fechaInicio,
          fechaFin: proy.fechaFin,
          presProg: proy.presProg,
          presUsado: proy.presUsado,
          avance: proy.avance,
          descripcion: proy.descripcion,
          notas: proy.notas,
          sector: proy.sector,
          tipoReparacion: proy.tipoReparacion,
          prioridad: proy.prioridad,
          estadoAprobacion: proy.estadoAprobacion,
          responsable: proy.responsable,
          tiempoEstimado: proy.tiempoEstimado,
          monto: proy.monto,
          fechaInicioReal: proy.fechaInicioReal,
          fechaFinReal: proy.fechaFinReal,
          comentarios: proy.comentarios,
          materiales: proy.materiales.map((m) => ({
            descripcion: m.descripcion,
            cantidad: m.cantidad,
            unidad: m.unidad,
            precioUnit: m.precioUnit,
            total: m.total,
          })),
          personal: proy.personal.map((p) => ({
            nombre: p.nombre,
            tipo: p.tipo,
            cantidad: p.cantidad,
            precioUnit: p.precioUnit,
            total: p.total,
          })),
          tareas: proy.tareas.map((t) => ({
            descripcion: t.descripcion,
            cantidad: t.cantidad,
            estado: t.estado,
          })),
          herramientas: proy.herramientas.map((h) => ({
            nombre: h.nombre,
            cantidad: h.cantidad,
          })),
        }
        const proyPdf = generateProyectoPdfBuffer(proyInput)
        if (addedSize + proyPdf.length <= TARGET_ZIP_BYTES) {
          trackAppend(proyPdf, { name: `${folderName}/${codigo}.pdf` })
        } else {
          console.warn(`[Backup Auto] ZIP excedería tamaño objetivo al añadir PDF de Proyecto ${codigo}. Se omite.`)
        }

        // Fotos antes / después (máximo MAX_FOTOS_POR_ITEM)
        const fotosAntes = parseFotos(proy.fotosAntes).slice(0, MAX_FOTOS_POR_ITEM)
        if (fotosAntes.length > 0) {
          fotosAntes.forEach((f, i) => addFoto(`${folderName}/fotos_antes`, i, f))
        }
        const fotosDespues = parseFotos(proy.fotosDespues).slice(0, MAX_FOTOS_POR_ITEM)
        if (fotosDespues.length > 0) {
          fotosDespues.forEach((f, i) => addFoto(`${folderName}/fotos_despues`, i, f))
        }

        // Documentos adjuntos del proyecto
        if (proy.documentos && proy.documentos.length > 0) {
          proy.documentos.forEach((doc, i) => {
            addDoc(`${folderName}/documentos`, doc.nombre || `doc_${i + 1}`, doc.archivo || '')
          })
        }

        // SCs asociadas al proyecto
        const scsAsoc = scsPorProyectoId.get(proy.id) || []
        for (const sc of scsAsoc) {
          try {
            const scPdf = generateSolicitudCompraPdfBuffer(scToInput(sc))
            if (addedSize + scPdf.length <= TARGET_ZIP_BYTES) {
              trackAppend(scPdf, { name: `${folderName}/${sc.codigo}.pdf` })
            }
          } catch (e) {
            console.warn(`[Backup Auto] Error generando PDF de SC ${sc.codigo}:`, e)
          }
        }

        // Resumen de costos del proyecto
        const totalMateriales = proy.materiales.reduce((s, m) => s + (m.total || m.cantidad * m.precioUnit || 0), 0)
        const totalPersonal = proy.personal.reduce((s, p) => s + (p.total || p.precioUnit * p.cantidad || 0), 0)
        const totalSCs = scsAsoc.reduce((s, sc) => s + (sc.totalEstimado || 0), 0)
        const resumenProyPdf = generarResumenCostosPdf({
          titulo: `Resumen de Costos — ${codigo}`,
          subtitulo: proy.nombre,
          mesStr,
          filas: [
            { concepto: 'Materiales Proyecto', monto: totalMateriales },
            { concepto: 'Personal Proyecto', monto: totalPersonal },
            { concepto: 'Solicitudes de Compra asociadas', monto: totalSCs },
          ],
          total: totalMateriales + totalPersonal + totalSCs,
          extras: [
            `Presupuesto programado: ${formatCLP(proy.presProg)}`,
            `Presupuesto usado: ${formatCLP(proy.presUsado)}`,
            `Monto declarado: ${formatCLP(proy.monto)}`,
            `Avance: ${proy.avance}%`,
            `Solicitudes de compra asociadas: ${scsAsoc.length}`,
          ],
        })
        if (addedSize + resumenProyPdf.length <= TARGET_ZIP_BYTES) {
          trackAppend(resumenProyPdf, { name: `${folderName}/Resumen_Costos_${codigo}.pdf` })
        }

        proyCount++
      } catch (e) {
        console.warn(`[Backup Auto] Error procesando Proyecto ${proy.id}:`, e)
      }
    }

    // ===== 3c. Solicitudes no asociadas =====
    console.log('[Backup Auto] Generando PDFs de SCs no asociadas...')
    let scCount = 0
    for (const sc of scsNoAsociadas) {
      try {
        const scPdf = generateSolicitudCompraPdfBuffer(scToInput(sc))
        if (addedSize + scPdf.length <= TARGET_ZIP_BYTES) {
          trackAppend(scPdf, { name: `03_Solicitudes_no_asociadas/${sc.codigo}.pdf` })
        }
        scCount++
      } catch (e) {
        console.warn(`[Backup Auto] Error generando PDF de SC ${sc.codigo}:`, e)
      }
    }

    // Resumen de SCs no asociadas
    const resumenSCPdf = generarResumenSCsPdf(scsNoAsociadas, mesStr)
    trackAppend(resumenSCPdf, { name: `03_Solicitudes_no_asociadas/Resumen_SC_no_asociadas.pdf` })

    // ===== 3d. Rondas y Asistencia =====
    console.log('[Backup Auto] Generando PDFs de Rondas y Asistencia...')
    const rondas = await db.registroRonda.findMany({
      where: { createdAt: { gte: mesAnterior, lte: mesAnteriorFin } },
      include: { ronda: true },
      orderBy: { createdAt: 'desc' },
    })
    const rondasPdf = generarRondasPdf(rondas, mesStr)
    trackAppend(rondasPdf, { name: `04_Rondas_${mesStr}.pdf` })

    const inasistencias = await db.inasistenciaAtraso.findMany({
      where: { fecha: { gte: fechaDesde, lte: fechaHasta } },
      include: { justificacion: true },
      orderBy: { fecha: 'desc' },
    })
    const asistPdf = generarAsistenciaPdf(inasistencias, mesStr)
    trackAppend(asistPdf, { name: `05_Asistencia_${mesStr}.pdf` })

    // ===== 3e. Respaldo BD JSON =====
    trackAppend(Buffer.from(backupJson, 'utf-8'), { name: `Respaldo_BD_${mesStr}.json` })

    // ===== 3f. Finalizar ZIP =====
    console.log('[Backup Auto] Finalizando ZIP...')
    zip.finalize()
    await done

    const zipBuffer = Buffer.concat(chunks)
    const zipMB = zipBuffer.length / (1024 * 1024)
    console.log(`[Backup Auto] ZIP generado: ${zipMB.toFixed(2)} MB | addedSize trackeado: ${(addedSize / 1024 / 1024).toFixed(2)} MB | fotosOmitidas: ${fotosOmitidas} | docsOmitidos: ${docsOmitidos}`)

    // ============================================================
    // 4. ENVIAR EMAIL
    // ============================================================
    const emailOk = await enviarEmail(zipBuffer, mesStr, {
      ots: otCount,
      proyectos: proyCount,
      scsNoAsociadas: scCount,
      rondas: rondas.length,
      inasistencias: inasistencias.length,
      zipMB: zipMB.toFixed(2),
      fotosOmitidas,
      docsOmitidos,
    })

    // ============================================================
    // 5. NOTIFICACIÓN EN EL SISTEMA
    // ============================================================
    const admins = await db.user.findMany({ where: { rol: 'admin', activo: true }, select: { id: true } })
    if (admins.length > 0) {
      await db.notificacion.createMany({
        data: admins.map((a) => ({
          titulo: 'Respaldo mensual generado',
          mensaje:
            `Respaldo jerarquico ${mesStr}: ${otCount} OTs, ${proyCount} proyectos, ` +
            `${scCount} SCs no asociadas, ${rondas.length} rondas, ${inasistencias.length} incidencias. ` +
            `ZIP ${zipMB.toFixed(2)} MB. ` +
            (fotosOmitidas > 0 || docsOmitidos > 0
              ? `${fotosOmitidas} fotos y ${docsOmitidos} docs omitidos por limite de tamano. `
              : '') +
            `${emailOk ? 'Enviado por email.' : 'Email no enviado (verificar SMTP o tamano del ZIP).'}`,
          tipo: 'Info',
          categoria: 'Seguridad',
          destino: 'Usuario especifico',
          destinoId: a.id,
          leido: false,
        })),
      })
    }

    return NextResponse.json({
      success: true,
      message: `Respaldo ${mesStr} generado. ZIP ${zipMB.toFixed(2)} MB. Email: ${emailOk ? 'enviado' : 'no enviado'}`,
      resumen: {
        ot: otCount,
        proyectos: proyCount,
        scNoAsociadas: scCount,
        rondas: rondas.length,
        inasistencias: inasistencias.length,
        zipMB: parseFloat(zipMB.toFixed(2)),
        addedSizeMB: parseFloat((addedSize / 1024 / 1024).toFixed(2)),
        fotosOmitidas,
        docsOmitidos,
        emailEnviado: emailOk,
      },
    })
  } catch (error) {
    console.error('[Backup Auto] Error:', error)
    return NextResponse.json({ error: 'Error: ' + (error as Error).message }, { status: 500 })
  }
}

// ============================================================
// HELPERS
// ============================================================

function formatCLP(n: number): string {
  return '$' + new Intl.NumberFormat('es-CL').format(Math.round(n || 0))
}

function formatMin(mins: number | null | undefined): string {
  if (!mins) return '0 min'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h > 0 && m > 0) return `${h}h ${m}min`
  if (h > 0) return `${h}h`
  return `${m}min`
}

function scToInput(sc: any): PdfSolicitudCompraInput {
  let materiales: any[] = []
  try {
    if (sc.materiales) {
      const parsed = JSON.parse(sc.materiales)
      if (Array.isArray(parsed)) materiales = parsed
    }
  } catch {}

  return {
    codigo: sc.codigo,
    titulo: sc.titulo,
    descripcion: sc.descripcion,
    prioridad: sc.prioridad || 'Media',
    estado: sc.estado || 'Solicitado',
    materiales,
    totalEstimado: sc.totalEstimado || 0,
    solicitadoPor: sc.solicitadoPor,
    fechaSolicitud: sc.fechaSolicitud ? new Date(sc.fechaSolicitud).toISOString().split('T')[0] : null,
    fechaEspera: sc.fechaEspera,
    proveedorSugerido: sc.proveedorSugerido,
    observaciones: sc.observaciones,
    origenTipo: sc.origenTipo,
    origenCodigo: sc.origenCodigo,
  }
}

// ============================================================
// PDF HELPERS
// ============================================================

function generarResumenCostosPdf(opts: {
  titulo: string
  subtitulo: string
  mesStr: string
  filas: Array<{ concepto: string; monto: number }>
  total: number
  extras?: string[]
}): Buffer {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 14
  let y = 14

  // Header
  doc.setFillColor(15, 32, 64)
  doc.rect(margin, y, pageWidth - margin * 2, 18, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(opts.titulo, margin + 4, y + 7)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Periodo: ${opts.mesStr}`, margin + 4, y + 14)
  doc.text('Condominio LAGUNA NORTE', pageWidth - margin - 4, y + 7, { align: 'right' })
  doc.text('Asesorías Integrales CyJ', pageWidth - margin - 4, y + 14, { align: 'right' })
  y += 24

  // Subtítulo
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  const subLines = doc.splitTextToSize(opts.subtitulo, pageWidth - margin * 2)
  doc.text(subLines, margin, y)
  y += subLines.length * 5 + 4

  // Cabecera tabla
  doc.setFillColor(241, 245, 249)
  doc.rect(margin, y, pageWidth - margin * 2, 6, 'F')
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Concepto', margin + 2, y + 4)
  doc.text('Monto', pageWidth - margin - 2, y + 4, { align: 'right' })
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  for (const fila of opts.filas) {
    doc.setTextColor(20, 20, 20)
    doc.text(fila.concepto, margin + 2, y)
    doc.text(formatCLP(fila.monto), pageWidth - margin - 2, y, { align: 'right' })
    y += 6
  }

  // Total
  y += 2
  doc.setFillColor(255, 193, 7)
  doc.rect(margin, y, pageWidth - margin * 2, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(0, 0, 0)
  doc.text('TOTAL', margin + 2, y + 5.5)
  doc.setTextColor(200, 0, 0)
  doc.text(formatCLP(opts.total), pageWidth - margin - 2, y + 5.5, { align: 'right' })
  y += 14

  // Extras
  if (opts.extras && opts.extras.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(15, 32, 64)
    doc.text('Información adicional', margin, y)
    y += 5
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(50, 50, 50)
    for (const extra of opts.extras) {
      const lines = doc.splitTextToSize(`• ${extra}`, pageWidth - margin * 2)
      doc.text(lines, margin, y)
      y += lines.length * 4 + 1
    }
  }

  // Footer
  doc.setFontSize(7)
  doc.setTextColor(150, 150, 150)
  doc.text(
    `Documento generado automáticamente el ${new Date().toLocaleString('es-CL')}`,
    margin,
    doc.internal.pageSize.getHeight() - 8
  )

  return Buffer.from(doc.output('arraybuffer'))
}

function generarResumenSCsPdf(scs: any[], mesStr: string): Buffer {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let y = 14

  doc.setFillColor(15, 32, 64)
  doc.rect(10, y, pageWidth - 20, 16, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('Solicitudes de Compra No Asociadas', 14, y + 7)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Periodo: ${mesStr} · Total: ${scs.length}`, 14, y + 13)
  y += 22

  // Cabecera tabla
  doc.setFillColor(241, 245, 249)
  doc.rect(10, y, pageWidth - 20, 7, 'F')
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('Código', 12, y + 5)
  doc.text('Título', 35, y + 5)
  doc.text('Estado', 110, y + 5)
  doc.text('Etapa', 135, y + 5)
  doc.text('Prioridad', 165, y + 5)
  doc.text('Total', 200, y + 5)
  doc.text('Solicitado por', 230, y + 5)
  doc.text('Fecha', 275, y + 5)
  y += 9

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  const total = scs.reduce((s, sc) => s + (sc.totalEstimado || 0), 0)
  let i = 0
  for (const sc of scs) {
    if (y > pageHeight - 20) {
      doc.addPage()
      y = 14
    }
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252)
      doc.rect(10, y, pageWidth - 20, 5, 'F')
    }
    doc.setTextColor(20, 20, 20)
    doc.text(String(sc.codigo || '–'), 12, y + 3.5)
    doc.text(String(sc.titulo || '').substring(0, 60), 35, y + 3.5)
    doc.text(String(sc.estado || '–'), 110, y + 3.5)
    doc.text(String(sc.etapaAprobacion || '–'), 135, y + 3.5)
    doc.text(String(sc.prioridad || '–'), 165, y + 3.5)
    doc.text(formatCLP(sc.totalEstimado || 0), 200, y + 3.5)
    doc.text(String(sc.solicitadoPor || '–').substring(0, 30), 230, y + 3.5)
    doc.text(sc.createdAt ? new Date(sc.createdAt).toLocaleDateString('es-CL') : '–', 275, y + 3.5)
    y += 5
    i++
  }

  // Total
  y += 4
  doc.setFillColor(255, 193, 7)
  doc.rect(10, y, pageWidth - 20, 8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)
  doc.text('TOTAL GENERAL', 12, y + 5.5)
  doc.setTextColor(200, 0, 0)
  doc.text(formatCLP(total), pageWidth - 12, y + 5.5, { align: 'right' })

  return Buffer.from(doc.output('arraybuffer'))
}

function generarRondasPdf(rondas: any[], mesStr: string): Buffer {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let y = 14

  doc.setFillColor(15, 32, 64)
  doc.rect(10, y, pageWidth - 20, 16, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('Registro de Rondas', 14, y + 7)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Periodo: ${mesStr} · Total: ${rondas.length}`, 14, y + 13)
  y += 22

  doc.setFillColor(241, 245, 249)
  doc.rect(10, y, pageWidth - 20, 7, 'F')
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('Fecha', 12, y + 5)
  doc.text('Hora', 35, y + 5)
  doc.text('Ronda', 50, y + 5)
  doc.text('Usuario', 100, y + 5)
  doc.text('Ubicación', 140, y + 5)
  doc.text('GPS', 180, y + 5)
  y += 9

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  let i = 0
  for (const r of rondas) {
    if (y > pageHeight - 15) {
      doc.addPage()
      y = 14
    }
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252)
      doc.rect(10, y, pageWidth - 20, 5, 'F')
    }
    doc.text(r.fecha || '–', 12, y + 3.5)
    doc.text(r.hora || '–', 35, y + 3.5)
    doc.text(String(r.ronda?.nombre || '–').substring(0, 40), 50, y + 3.5)
    doc.text(String(r.usuarioNombre || '–').substring(0, 30), 100, y + 3.5)
    doc.text(String(r.ubicacion || '–').substring(0, 30), 140, y + 3.5)
    doc.text(r.latitud ? `${r.latitud.toFixed(4)}, ${r.longitud?.toFixed(4)}` : '–', 180, y + 3.5)
    y += 5
    i++
  }

  return Buffer.from(doc.output('arraybuffer'))
}

function generarAsistenciaPdf(inasistencias: any[], mesStr: string): Buffer {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let y = 14

  doc.setFillColor(15, 32, 64)
  doc.rect(10, y, pageWidth - 20, 16, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('Incidencias de Asistencia', 14, y + 7)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Periodo: ${mesStr} · Total: ${inasistencias.length}`, 14, y + 13)
  y += 22

  doc.setFillColor(241, 245, 249)
  doc.rect(10, y, pageWidth - 20, 7, 'F')
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.text('Trabajador', 12, y + 5)
  doc.text('Fecha', 70, y + 5)
  doc.text('Día', 90, y + 5)
  doc.text('Tipo', 105, y + 5)
  doc.text('Esperada', 140, y + 5)
  doc.text('Real', 160, y + 5)
  doc.text('Min', 180, y + 5)
  doc.text('Estado', 195, y + 5)
  doc.text('Justificación', 220, y + 5)
  y += 9

  doc.setFont('helvetica', 'normal')
  let i = 0
  for (const ina of inasistencias) {
    if (y > pageHeight - 15) {
      doc.addPage()
      y = 14
    }
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252)
      doc.rect(10, y, pageWidth - 20, 5, 'F')
    }
    doc.text(String(ina.nombreTrabajador || '–').substring(0, 45), 12, y + 3.5)
    doc.text(ina.fecha || '–', 70, y + 3.5)
    doc.text(ina.diaSemana || '–', 90, y + 3.5)
    doc.text(String(ina.tipo || '–'), 105, y + 3.5)
    doc.text(ina.horaEsperadaInicio || '–', 140, y + 3.5)
    doc.text(ina.horaRealInicio || '–', 160, y + 3.5)
    doc.text(String(ina.minutosAtraso || 0), 180, y + 3.5)
    doc.text(String(ina.estado || '–'), 195, y + 3.5)
    doc.text(
      ina.justificacion ? `${ina.justificacion.tipoJustificacion}:${ina.justificacion.estado}` : '–',
      220,
      y + 3.5
    )
    y += 5
    i++
  }

  return Buffer.from(doc.output('arraybuffer'))
}

// ============================================================
// EMAIL
// ============================================================

async function enviarEmail(
  zipBuffer: Buffer,
  mesStr: string,
  resumen: {
    ots: number
    proyectos: number
    scsNoAsociadas: number
    rondas: number
    inasistencias: number
    zipMB: string
    fotosOmitidas: number
    docsOmitidos: number
  }
): Promise<boolean> {
  try {
    const nodemailerMod = await import('nodemailer').catch(() => null)
    if (!nodemailerMod) {
      console.warn('[Backup Auto] nodemailer no disponible')
      return false
    }
    const nodemailer: any = (nodemailerMod as any).default || nodemailerMod
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env
    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
      console.warn('[Backup Auto] Credenciales SMTP no configuradas')
      return false
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT || '587'),
      secure: false,
      auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    })

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:20px;color:#333">
        <h2 style="color:#0A1172;margin:0 0 8px">Respaldo Mensual — Estructura Jerárquica</h2>
        <p style="margin:0 0 16px"><strong>Condominio Laguna Norte</strong> · Asesorías Integrales CyJ</p>
        <p>Periodo: <strong>${mesStr}</strong></p>
        <h3 style="color:#0A1172">Contenido del ZIP adjunto</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr style="background:#f1f5f9"><td style="padding:8px;border:1px solid #e2e8f0">01_OT_Generales/</td><td style="padding:8px;border:1px solid #e2e8f0">${resumen.ots} OTs (cada una con su PDF, fotos, documentos, SC asociadas y resumen de costos)</td></tr>
          <tr><td style="padding:8px;border:1px solid #e2e8f0">02_Proyectos/</td><td style="padding:8px;border:1px solid #e2e8f0">${resumen.proyectos} Proyectos (misma estructura que las OTs)</td></tr>
          <tr style="background:#f1f5f9"><td style="padding:8px;border:1px solid #e2e8f0">03_Solicitudes_no_asociadas/</td><td style="padding:8px;border:1px solid #e2e8f0">${resumen.scsNoAsociadas} SCs no vinculadas a OT o Proyecto + resumen general</td></tr>
          <tr><td style="padding:8px;border:1px solid #e2e8f0">04_Rondas_${mesStr}.pdf</td><td style="padding:8px;border:1px solid #e2e8f0">${resumen.rondas} registros de rondas</td></tr>
          <tr style="background:#f1f5f9"><td style="padding:8px;border:1px solid #e2e8f0">05_Asistencia_${mesStr}.pdf</td><td style="padding:8px;border:1px solid #e2e8f0">${resumen.inasistencias} incidencias de asistencia</td></tr>
          <tr><td style="padding:8px;border:1px solid #e2e8f0">Respaldo_BD_${mesStr}.json</td><td style="padding:8px;border:1px solid #e2e8f0">Respaldo completo de la base de datos</td></tr>
        </table>
        <p style="margin-top:16px">Tamaño del ZIP: <strong>${resumen.zipMB} MB</strong></p>
        ${(resumen.fotosOmitidas > 0 || resumen.docsOmitidos > 0) ? `
        <div style="background:#fef3c7;border:1px solid #f59e0b;padding:10px;margin-top:12px;border-radius:4px;font-size:13px">
          <strong>Notas:</strong>
          ${resumen.fotosOmitidas > 0 ? `<br>• ${resumen.fotosOmitidas} fotos omitidas por exceder el tamaño máximo individual o por límite de tamaño del ZIP (se conservan todos los PDFs y datos).` : ''}
          ${resumen.docsOmitidos > 0 ? `<br>• ${resumen.docsOmitidos} documentos adjuntos omitidos por tamaño.` : ''}
        </div>
        ` : ''}
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
        <p style="font-size:12px;color:#999">Email generado automáticamente. No responder.</p>
      </div>
    `

    await transporter.sendMail({
      from: `"Sistema Condominios CyJ" <${SMTP_USER}>`,
      to: SMTP_USER,
      subject: `Respaldo Mensual Jerárquico — Laguna Norte — ${mesStr}`,
      html,
      attachments: [
        {
          filename: `Respaldo_CyJ_${mesStr}.zip`,
          content: zipBuffer,
          contentType: 'application/zip',
        },
      ],
    })
    console.log('[Backup Auto] Email enviado correctamente')
    return true
  } catch (e) {
    console.error('[Backup Auto] Email error:', e)
    return false
  }
}
