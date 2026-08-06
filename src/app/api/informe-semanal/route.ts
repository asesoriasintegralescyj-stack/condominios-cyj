import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'

// ─── TYPES ───
interface ReportData {
  periodo: { desde: string; hasta: string }
  resumen: {
    totalOTs: number; nuevasOTs: number; otsCompletadas: number; otsEnProgreso: number; otsPendientes: number;
    totalProyectos: number; proyectosCompletados: number; proyectosEnEjecucion: number;
    totalRondas: number; totalQrCreados: number;
    totalSolicitudes: number; solicitudesAprobadas: number; solicitudesPendientes: number;
    totalRendiciones: number; rendicionesAprobadas: number; rendicionesPendientes: number;
    totalPMI: number; pmiCompletados: number; pmiPendientes: number;
  }
  ots: any[]
  proyectos: any[]
  rondas: any[]
  qrLocations: any[]
  solicitudes: any[]
  rendiciones: any[]
  pmiListas: any[]
  pmiRegistros: any[]
  personal: any[]
}

// ─── HELPER: parse fotos JSON ───
function parseFotos(fotosJson: string | null | undefined): string[] {
  if (!fotosJson) return []
  try {
    const parsed = JSON.parse(fotosJson)
    return Array.isArray(parsed) ? parsed.filter((f: any) => typeof f === 'string') : []
  } catch { return [] }
}

// ─── HELPER: extraer buffer binario de data URI (base64) ───
function dataUriToBuffer(dataUri: string): { buffer: Buffer; extension: string } | null {
  if (!dataUri || !dataUri.startsWith('data:')) return null
  try {
    const match = dataUri.match(/^data:(image\/\w+);base64,(.+)$/)
    if (!match) return null
    const mime = match[1] // e.g. "image/jpeg", "image/png"
    const base64Data = match[2]
    const extension = mime === 'image/jpeg' || mime === 'image/jpg' ? 'jpg' : mime === 'image/png' ? 'png' : mime === 'image/gif' ? 'gif' : mime === 'image/webp' ? 'webp' : 'jpg'
    const buffer = Buffer.from(base64Data, 'base64')
    return { buffer, extension }
  } catch {
    return null
  }
}

// ─── HELPER: format CL date ───
function fmtDate(d: string | Date): string {
  if (!d) return '—'
  try {
    const dt = new Date(d)
    return dt.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return String(d) }
}

// ─── GET: generar informe ───
export async function GET(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session || session.user.rol !== 'admin') {
    return NextResponse.json({ error: 'Solo administradores' }, { status: 403 })
  }

  const formato = request.nextUrl.searchParams.get('formato') || 'word' // 'word' | 'pptx' | 'ambos'
  const dias = parseInt(request.nextUrl.searchParams.get('dias') || '7', 10)
  const email = request.nextUrl.searchParams.get('email') === 'true'

  try {
    // Calcular rango de fechas
    const ahora = new Date()
    const desde = new Date(ahora)
    desde.setDate(desde.getDate() - dias)
    const desdeStr = desde.toISOString()
    const hastaStr = ahora.toISOString()

    // ─── CONSULTAR DATOS ───
    const [
      ots, proyectos, rondas, qrLocations, registrosRonda,
      solicitudes, rendiciones, pmiListas, pmiRegistros, personal
    ] = await Promise.all([
      // OTs del periodo
      db.ordenTrabajo.findMany({
        where: { createdAt: { gte: desde } },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      // Proyectos
      db.proyecto.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      // Rondas (definiciones)
      db.ronda.findMany({ where: { activo: true }, take: 50 }),
      // QR Locations creados en el periodo
      db.movilQrLocation.findMany({
        where: { createdAt: { gte: desde } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      // QR Scans del periodo
      db.movilQrScan.findMany({
        where: { createdAt: { gte: desde } },
        orderBy: { createdAt: 'desc' },
        take: 500,
      }),
      // Solicitudes de compra
      db.solicitudCompra.findMany({
        where: { createdAt: { gte: desde } },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      // Rendiciones de gasto
      db.rendicionGasto.findMany({
        where: { createdAt: { gte: desde } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      // PMI - Listas de verificación
      db.listaVerificacion.findMany({ where: { activa: true }, take: 50 }),
      // PMI - Registros del periodo
      db.registroLV.findMany({
        where: { createdAt: { gte: desde } },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      // Personal activo
      db.personal.findMany({ where: { estado: 'Activo' }, orderBy: { nombre: 'asc' }, take: 200 }),
    ])

    // Agrupar rondas por trabajador
    const rondasPorTrabajador = new Map<string, any[]>()
    for (const scan of registrosRonda) {
      const key = scan.scannedBy || 'Desconocido'
      if (!rondasPorTrabajador.has(key)) rondasPorTrabajador.set(key, [])
      rondasPorTrabajador.get(key)!.push(scan)
    }

    // ─── ARMAR RESUMEN ───
    const reportData: ReportData = {
      periodo: { desde: fmtDate(desdeStr), hasta: fmtDate(hastaStr) },
      resumen: {
        totalOTs: ots.length, nuevasOTs: ots.length, otsCompletadas: ots.filter(o => o.estado === 'Completado').length,
        otsEnProgreso: ots.filter(o => o.estado === 'En Progreso').length, otsPendientes: ots.filter(o => o.estado === 'Pendiente').length,
        totalProyectos: proyectos.length, proyectosCompletados: proyectos.filter(p => p.estado === 'Completado').length,
        proyectosEnEjecucion: proyectos.filter(p => p.estado === 'En Ejecución').length,
        totalRondas: registrosRonda.length, totalQrCreados: qrLocations.length,
        totalSolicitudes: solicitudes.length, solicitudesAprobadas: solicitudes.filter(s => s.estado === 'Comprado').length,
        solicitudesPendientes: solicitudes.filter(s => s.estado === 'Solicitado').length,
        totalRendiciones: rendiciones.length, rendicionesAprobadas: rendiciones.filter(r => r.estado === 'APROBADO').length,
        rendicionesPendientes: rendiciones.filter(r => r.estado === 'BORRADOR' || r.estado === 'ENVIADO').length,
        totalPMI: pmiRegistros.length, pmiCompletados: pmiRegistros.filter(r => r.estado === 'Completado').length,
        pmiPendientes: pmiRegistros.filter(r => r.estado !== 'Completado').length,
      },
      ots, proyectos, rondas, qrLocations, solicitudes, rendiciones,
      pmiListas, pmiRegistros, personal,
    }

    // ─── GENERAR ARCHIVOS ───
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType, ImageRun } = await import('docx')

    // ─── WORD DOCUMENT ───
    function generateWord(): Buffer {
      const doc = new Document({
        styles: {
          default: {
            document: {
              run: { font: 'Calibri', size: 22 },
            },
          },
        },
        sections: [{
          properties: {
            page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } },
          },
          children: [
            // PORTADA
            new Paragraph({ spacing: { after: 200 }, children: [] }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 100 },
              children: [new TextRun({ text: 'CONDOMINIO LAGUNA NORTE', bold: true, size: 52, color: '0F2044' })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 200 },
              children: [new TextRun({ text: 'INFORME SEMANAL DE GESTIÓN', bold: true, size: 40, color: '2E5BBA' })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 100 },
              children: [new TextRun({ text: `Período: ${reportData.periodo.desde} al ${reportData.periodo.hasta}`, size: 24, color: '666666' })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 600 },
              children: [new TextRun({ text: `Generado: ${fmtDate(new Date().toISOString())} | Asesorías Integrales CYJ`, size: 20, color: '999999', italics: true })],
            }),
            // LINEA SEPARADORA
            new Paragraph({ spacing: { after: 300 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '2E5BBA' } }, children: [] }),

            // ─── RESUMEN EJECUTIVO ───
            new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 200 }, children: [new TextRun({ text: '1. RESUMEN EJECUTIVO', bold: true, color: '0F2044', size: 28 })] }),
            new Paragraph({
              spacing: { after: 200 },
              children: [new TextRun({
                text: `Este informe presenta un resumen detallado de las actividades de gestión realizadas en el Condominio Laguna Norte durante el período del ${reportData.periodo.desde} al ${reportData.periodo.hasta}. A continuación se detallan las métricas principales de cada área operativa del sistema.`,
                size: 22,
              })],
            }),

            // Tabla resumen
            createKpiTable(reportData),

            // ─── OTs ───
            new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 }, children: [new TextRun({ text: '2. ÓRDENES DE TRABAJO (OTs)', bold: true, color: '0F2044', size: 28 })] }),
            new Paragraph({
              spacing: { after: 150 },
              children: [new TextRun({
                text: `Durante el período se crearon ${reportData.resumen.nuevasOTs} órdenes de trabajo. De estas, ${reportData.resumen.otsCompletadas} fueron completadas, ${reportData.resumen.otsEnProgreso} están en progreso y ${reportData.resumen.otsPendientes} permanecen pendientes. Este análisis permite evaluar la eficiencia operativa y identificar áreas que requieren atención prioritaria.`,
                size: 22,
              })],
            }),
            ...generateOTSection(ots),

            // ─── PROYECTOS ───
            new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 }, children: [new TextRun({ text: '3. PROYECTOS', bold: true, color: '0F2044', size: 28 })] }),
            new Paragraph({
              spacing: { after: 150 },
              children: [new TextRun({
                text: `Se gestionan ${reportData.resumen.totalProyectos} proyectos en el sistema. ${reportData.resumen.proyectosCompletados} han sido completados exitosamente, mientras que ${reportData.resumen.proyectosEnEjecucion} se encuentran actualmente en ejecución. Cada proyecto incluye seguimiento de avance presupuestario y cronograma de actividades.`,
                size: 22,
              })],
            }),
            ...generateProyectosSection(proyectos),

            // ─── RONDAS Y QR ───
            new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 }, children: [new TextRun({ text: '4. RONDAS DE SEGURIDAD Y LECTURAS QR', bold: true, color: '0F2044', size: 28 })] }),
            new Paragraph({
              spacing: { after: 150 },
              children: [new TextRun({
                text: `Se registraron ${reportData.resumen.totalRondas} lecturas QR durante el período, correspondientes a las rondas de seguridad realizadas por el equipo de guardias. Adicionalmente, se cuenta con ${reportData.resumen.totalQrCreados} puntos de control QR activos en el condominio. El siguiente detalle desglosa la actividad por personal de guardia e incluye un ejemplo del registro del sistema para dar a conocer la implementación.`,
                size: 22,
              })],
            }),
            ...generateRondasSection(rondasPorTrabajador, qrLocations, registrosRonda),

            // ─── SOLICITUDES DE COMPRA ───
            new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 }, children: [new TextRun({ text: '5. SOLICITUDES DE COMPRA', bold: true, color: '0F2044', size: 28 })] }),
            new Paragraph({
              spacing: { after: 150 },
              children: [new TextRun({
                text: `Se procesaron ${reportData.resumen.totalSolicitudes} solicitudes de compra en el período. ${reportData.resumen.solicitudesAprobadas} fueron aprobadas y gestionadas, mientras que ${reportData.resumen.solicitudesPendientes} permanecen en estado de aprobación. El control de compras permite mantener un registro transparente de las adquisiciones realizadas.`,
                size: 22,
              })],
            }),
            ...generateSolicitudesSection(solicitudes),

            // ─── RENDICIÓN DE GASTOS ───
            new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 }, children: [new TextRun({ text: '6. RENDICIÓN DE GASTOS', bold: true, color: '0F2044', size: 28 })] }),
            new Paragraph({
              spacing: { after: 150 },
              children: [new TextRun({
                text: `Se registraron ${reportData.resumen.totalRendiciones} rendiciones de gastos. ${reportData.resumen.rendicionesAprobadas} fueron aprobadas y ${reportData.resumen.rendicionesPendientes} se encuentran pendientes de revisión. El sistema de rendición garantiza trazabilidad y control sobre los gastos operativos del condominio.`,
                size: 22,
              })],
            }),
            ...generateRendicionesSection(rendiciones),

            // ─── PMI ───
            new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 }, children: [new TextRun({ text: '7. PMI - LISTAS DE VERIFICACIÓN', bold: true, color: '0F2044', size: 28 })] }),
            new Paragraph({
              spacing: { after: 150 },
              children: [new TextRun({
                text: `Se realizaron ${reportData.resumen.totalPMI} registros de listas de verificación del Plan de Mantenimiento Integral. ${reportData.resumen.pmiCompletados} fueron completados satisfactoriamente y ${reportData.resumen.pmiPendientes} permanecen en proceso. Las listas activas cubren sectores críticos del condominio.`,
                size: 22,
              })],
            }),
            ...generatePMISection(pmiListas, pmiRegistros),

            // CIERRE
            new Paragraph({ spacing: { before: 400 }, border: { top: { style: BorderStyle.SINGLE, size: 6, color: '2E5BBA' } }, children: [] }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 200, after: 100 },
              children: [new TextRun({ text: 'Asesorías Integrales CYJ', bold: true, size: 22, color: '0F2044' })],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 100 },
              children: [new TextRun({ text: 'Informe generado automáticamente por el Sistema de Gestión Condominial Laguna Norte', size: 18, color: '999999', italics: true })],
            }),
          ],
        }],
      })

      return doc as any // Will be serialized by Packer
    }

    // ─── HELPERS WORD ───

    function createKpiTable(data: ReportData): Table {
      const r = data.resumen
      const kpis = [
        ['OTs Creadas', String(r.nuevasOTs), 'Completadas', String(r.otsCompletadas)],
        ['OTs En Progreso', String(r.otsEnProgreso), 'OTs Pendientes', String(r.otsPendientes)],
        ['Total Proyectos', String(r.totalProyectos), 'En Ejecución', String(r.proyectosEnEjecucion)],
        ['Lecturas QR', String(r.totalRondas), 'QR Creados', String(r.totalQrCreados)],
        ['Solicitudes Compra', String(r.totalSolicitudes), 'Aprobadas', String(r.solicitudesAprobadas)],
        ['Rendiciones', String(r.totalRendiciones), 'Aprobadas', String(r.rendicionesAprobadas)],
        ['PMI Registros', String(r.totalPMI), 'PMI Completados', String(r.pmiCompletados)],
      ]

      return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: ['Indicador', 'Valor', 'Indicador', 'Valor'].map(text =>
              new TableCell({
                width: { size: 25, type: WidthType.PERCENTAGE },
                shading: { type: ShadingType.SOLID, color: '0F2044' },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 20 })] })],
              })
            ),
          }),
          ...kpis.map((row, idx) =>
            new TableRow({
              children: row.map((text, ci) =>
                new TableCell({
                  width: { size: 25, type: WidthType.PERCENTAGE },
                  shading: { type: ShadingType.SOLID, color: idx % 2 === 0 ? 'F1F5F9' : 'FFFFFF' },
                  children: [new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text, bold: ci === 1 || ci === 3, size: 20, color: ci === 1 || ci === 3 ? '2E5BBA' : '333333' })],
                  })],
                })
              ),
            })
          ),
        ],
      })
    }

    function generateOTSection(otsList: any[]): (Paragraph | Table)[] {
      if (otsList.length === 0) return [new Paragraph({ children: [new TextRun({ text: 'No se crearon órdenes de trabajo en este período.', italics: true, color: '999999' })] })]

      const elements: (Paragraph | Table)[] = []
      // Agrupar por estado
      const estados = ['Pendiente', 'En Progreso', 'Completado', 'Cancelado']
      for (const estado of estados) {
        const filtered = otsList.filter(o => o.estado === estado)
        if (filtered.length === 0) continue

        elements.push(new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
          children: [new TextRun({ text: `OTs ${estado}s (${filtered.length})`, bold: true, size: 24, color: estado === 'Completado' ? '16A34A' : estado === 'En Progreso' ? 'D97706' : '333333' })],
        }))

        for (const ot of filtered) {
          const fotosAntes = parseFotos(ot.fotosAntes)
          const fotosDespues = parseFotos(ot.fotosDespues)

          elements.push(new Paragraph({
            spacing: { before: 100, after: 50 },
            children: [
              new TextRun({ text: `${ot.otNum} — ${ot.titulo}`, bold: true, size: 22 }),
              new TextRun({ text: ` | ${ot.tipo} | ${ot.prioridad}`, size: 20, color: '666666' }),
            ],
          }))
          elements.push(new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({ text: `Ubicación: ${ot.ubicacion || '—'} | Avance: ${ot.progreso}% | Creada: ${fmtDate(ot.createdAt)}`, size: 20, color: '555555' }),
            ],
          }))
          if (ot.descripcion) {
            elements.push(new Paragraph({
              spacing: { after: 50 },
              children: [new TextRun({ text: `Descripción: ${ot.descripcion}`, size: 20, italics: true, color: '444444' })],
            }))
          }
          if (ot.notas) {
            elements.push(new Paragraph({
              spacing: { after: 50 },
              children: [new TextRun({ text: `Notas: ${ot.notas}`, size: 20, color: '444444' })],
            }))
          }
          if (fotosAntes.length > 0 || fotosDespues.length > 0) {
            elements.push(new Paragraph({
              spacing: { after: 30 },
              children: [new TextRun({ text: `Fotografía: ${fotosAntes.length > 0 ? 'Antes' : ''}${fotosAntes.length > 0 && fotosDespues.length > 0 ? ' / ' : ''}${fotosDespues.length > 0 ? 'Después' : ''}`, size: 18, color: '888888' })],
            }))
            for (const foto of fotosAntes.slice(0, 3)) {
              const imgData = dataUriToBuffer(foto)
              if (imgData && imgData.buffer.length > 0) {
                try {
                  elements.push(new Paragraph({
                    spacing: { after: 10 },
                    indent: { left: 400 },
                    children: [new TextRun({ text: '📷 Antes:', size: 16, color: '2E5BBA', bold: true })],
                  }))
                  elements.push(new Paragraph({
                    spacing: { after: 30 },
                    indent: { left: 400 },
                    children: [
                      new (ImageRun as any)({
                        data: imgData.buffer,
                        transformation: { width: 350, height: 260 },
                        type: imgData.extension === 'png' ? 'png' : 'jpg',
                      }),
                    ],
                  }))
                } catch {
                  elements.push(new Paragraph({ spacing: { after: 20 }, indent: { left: 400 }, children: [new TextRun({ text: '📷 Antes: [error al procesar imagen]', size: 18, color: '999999' })] }))
                }
              } else {
                elements.push(new Paragraph({ spacing: { after: 20 }, indent: { left: 400 }, children: [new TextRun({ text: `📷 Antes: ${foto.substring(0, 60)}...`, size: 18, color: '2E5BBA' })] }))
              }
            }
            if (fotosAntes.length > 3) {
              elements.push(new Paragraph({ spacing: { after: 20 }, indent: { left: 400 }, children: [new TextRun({ text: `... y ${fotosAntes.length - 3} fotos más (máx. 3 por sección)`, size: 16, color: '999999', italics: true })] }))
            }
            for (const foto of fotosDespues.slice(0, 3)) {
              const imgData = dataUriToBuffer(foto)
              if (imgData && imgData.buffer.length > 0) {
                try {
                  elements.push(new Paragraph({
                    spacing: { after: 10 },
                    indent: { left: 400 },
                    children: [new TextRun({ text: '📷 Después:', size: 16, color: '16A34A', bold: true })],
                  }))
                  elements.push(new Paragraph({
                    spacing: { after: 30 },
                    indent: { left: 400 },
                    children: [
                      new (ImageRun as any)({
                        data: imgData.buffer,
                        transformation: { width: 350, height: 260 },
                        type: imgData.extension === 'png' ? 'png' : 'jpg',
                      }),
                    ],
                  }))
                } catch {
                  elements.push(new Paragraph({ spacing: { after: 20 }, indent: { left: 400 }, children: [new TextRun({ text: '📷 Después: [error al procesar imagen]', size: 18, color: '999999' })] }))
                }
              } else {
                elements.push(new Paragraph({ spacing: { after: 20 }, indent: { left: 400 }, children: [new TextRun({ text: `📷 Después: ${foto.substring(0, 60)}...`, size: 18, color: '16A34A' })] }))
              }
            }
            if (fotosDespues.length > 3) {
              elements.push(new Paragraph({ spacing: { after: 20 }, indent: { left: 400 }, children: [new TextRun({ text: `... y ${fotosDespues.length - 3} fotos más (máx. 3 por sección)`, size: 16, color: '999999', italics: true })] }))
            }
          }
        }
      }
      return elements
    }

    function generateProyectosSection(proys: any[]): (Paragraph | Table)[] {
      if (proys.length === 0) return [new Paragraph({ children: [new TextRun({ text: 'No hay proyectos registrados.', italics: true, color: '999999' })] })]

      const elements: (Paragraph | Table)[] = []

      // Tabla resumen
      elements.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: ['Código', 'Nombre', 'Estado', 'Avance', 'Presupuesto'].map(text =>
              new TableCell({
                shading: { type: ShadingType.SOLID, color: '0F2044' },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 20 })] })],
              })
            ),
          }),
          ...proys.map((p, idx) =>
            new TableRow({
              children: [
                p.codigo || '—', p.nombre, p.estado, `${p.avance}%`, `$${(p.presUsado || 0).toLocaleString('es-CL')}`,
              ].map(text =>
                new TableCell({
                  shading: { type: ShadingType.SOLID, color: idx % 2 === 0 ? 'F1F5F9' : 'FFFFFF' },
                  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(text), size: 20 })] })],
                })
              ),
            })
          ),
        ],
      }))

      // Detalle de cada proyecto con fotos
      for (const p of proys) {
        const fotosAntes = parseFotos(p.fotosAntes)
        const fotosDespues = parseFotos(p.fotosDespues)

        elements.push(new Paragraph({
          spacing: { before: 200, after: 50 },
          children: [new TextRun({ text: `${p.codigo || '—'} — ${p.nombre}`, bold: true, size: 22, color: '0F2044' })],
        }))
        elements.push(new Paragraph({
          spacing: { after: 50 },
          children: [new TextRun({ text: `Estado: ${p.estado} | Avance: ${p.avance}% | Ubicación: ${p.ubicacion || '—'} | Categoría: ${p.categoria || '—'}`, size: 20, color: '555555' })],
        }))
        if (p.descripcion) {
          elements.push(new Paragraph({
            spacing: { after: 50 },
            children: [new TextRun({ text: p.descripcion, size: 20, italics: true, color: '444444' })],
          }))
        }
        if (fotosAntes.length > 0 || fotosDespues.length > 0) {
          elements.push(new Paragraph({
            spacing: { after: 30 },
            children: [new TextRun({ text: 'Fotografía del proyecto:', size: 18, color: '888888' })],
          }))
          for (const foto of fotosAntes.slice(0, 3)) {
            const imgData = dataUriToBuffer(foto)
            if (imgData && imgData.buffer.length > 0) {
              try {
                elements.push(new Paragraph({ spacing: { after: 10 }, indent: { left: 400 }, children: [new TextRun({ text: '📷 Antes:', size: 16, color: '2E5BBA', bold: true })] }))
                elements.push(new Paragraph({ spacing: { after: 30 }, indent: { left: 400 }, children: [new (ImageRun as any)({ data: imgData.buffer, transformation: { width: 350, height: 260 }, type: imgData.extension === 'png' ? 'png' : 'jpg' })] }))
              } catch {
                elements.push(new Paragraph({ spacing: { after: 20 }, indent: { left: 400 }, children: [new TextRun({ text: '📷 Antes: [error al procesar]', size: 18, color: '999999' })] }))
              }
            } else {
              elements.push(new Paragraph({ spacing: { after: 20 }, indent: { left: 400 }, children: [new TextRun({ text: `📷 Antes: ${foto.substring(0, 60)}...`, size: 18, color: '2E5BBA' })] }))
            }
          }
          for (const foto of fotosDespues.slice(0, 3)) {
            const imgData = dataUriToBuffer(foto)
            if (imgData && imgData.buffer.length > 0) {
              try {
                elements.push(new Paragraph({ spacing: { after: 10 }, indent: { left: 400 }, children: [new TextRun({ text: '📷 Después:', size: 16, color: '16A34A', bold: true })] }))
                elements.push(new Paragraph({ spacing: { after: 30 }, indent: { left: 400 }, children: [new (ImageRun as any)({ data: imgData.buffer, transformation: { width: 350, height: 260 }, type: imgData.extension === 'png' ? 'png' : 'jpg' })] }))
              } catch {
                elements.push(new Paragraph({ spacing: { after: 20 }, indent: { left: 400 }, children: [new TextRun({ text: '📷 Después: [error al procesar]', size: 18, color: '999999' })] }))
              }
            } else {
              elements.push(new Paragraph({ spacing: { after: 20 }, indent: { left: 400 }, children: [new TextRun({ text: `📷 Después: ${foto.substring(0, 60)}...`, size: 18, color: '16A34A' })] }))
            }
          }
        }
      }

      return elements
    }

    function generateRondasSection(rondasMap: Map<string, any[]>, qrLocs: any[], allScans: any[]): (Paragraph | Table)[] {
      const elements: (Paragraph | Table)[] = []
      const totalLecturas = allScans.length

      // ─── 4.1 INTRODUCCIÓN ───
      elements.push(new Paragraph({
        spacing: { after: 150 },
        children: [new TextRun({ text: `Durante el período se registraron ${totalLecturas} lecturas QR distribuidas en ${rondasMap.size} trabajadores. A continuación se presenta el detalle de actividad por guardia y los puntos de control implementados en el condominio.`, size: 20, italics: true, color: '444444' })],
      }))

      // ─── 4.2 TABLA RESUMEN POR PERSONAL ───
      elements.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
        children: [new TextRun({ text: `Resumen de Lecturas por Personal (${totalLecturas} totales)`, bold: true, size: 24, color: '0F766E' })],
      }))

      if (rondasMap.size === 0) {
        elements.push(new Paragraph({ children: [new TextRun({ text: 'No se registraron lecturas QR en este período.', italics: true, color: '999999' })] }))
      } else {
        // Ordenar por cantidad descendente
        const sortedWorkers = Array.from(rondasMap.entries()).sort((a, b) => b[1].length - a[1].length)

        elements.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: ['#', 'Personal', 'Lecturas', '% del Total'].map(text =>
                new TableCell({
                  shading: { type: ShadingType.SOLID, color: '0F766E' },
                  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 20 })] })],
                })
              ),
            }),
            ...sortedWorkers.map(([worker, scans], idx) => {
              const pct = totalLecturas > 0 ? ((scans.length / totalLecturas) * 100).toFixed(1) : '0.0'
              return new TableRow({
                children: [
                  String(idx + 1),
                  worker || 'Sin asignar',
                  String(scans.length),
                  `${pct}%`,
                ].map((text, ci) =>
                  new TableCell({
                    shading: { type: ShadingType.SOLID, color: idx % 2 === 0 ? 'F0FDF9' : 'FFFFFF' },
                    children: [new Paragraph({
                      alignment: ci === 0 || ci === 2 || ci === 3 ? AlignmentType.CENTER : AlignmentType.LEFT,
                      children: [new TextRun({ text, bold: ci === 2, size: 20, color: ci === 2 ? '0F766E' : ci === 3 ? '0F766E' : '333333' })],
                    })],
                  })
                ),
              })
            }),
            // Fila TOTAL
            new TableRow({
              children: [
                { text: '', span: 2 },
                { text: String(totalLecturas), bold: true },
                { text: '100%', bold: true },
              ].map((cell: any) =>
                new TableCell({
                  shading: { type: ShadingType.SOLID, color: '0F766E' },
                  children: [new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [new TextRun({ text: typeof cell === 'string' ? cell : String(cell.text || ''), bold: true, color: 'FFFFFF', size: 20 })],
                  })],
                })
              ),
            }),
          ],
        }))
      }

      // ─── 4.3 PUNTOS DE CONTROL QR ───
      if (qrLocs.length > 0) {
        elements.push(new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 100 },
          children: [new TextRun({ text: `Puntos de Control QR Implementados (${qrLocs.length})`, bold: true, size: 24, color: '0F766E' })],
        }))
        elements.push(new Paragraph({
          spacing: { after: 100 },
          children: [new TextRun({ text: 'El sistema de control de rondas utiliza códigos QR distribuidos estratégicamente en el condominio. Cada punto de control es escaneado por el personal de guardia durante su ronda, registrando automáticamente la ubicación, fecha, hora y responsable.', size: 20, color: '444444' })],
        }))

        elements.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: ['Punto de Control', 'Ubicación', 'Código QR'].map(text =>
                new TableCell({
                  shading: { type: ShadingType.SOLID, color: '0F766E' },
                  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 20 })] })],
                })
              ),
            }),
            ...qrLocs.slice(0, 20).map((qr, idx) =>
              new TableRow({
                children: [
                  qr.name,
                  qr.location || qr.description || '—',
                  qr.code,
                ].map(text =>
                  new TableCell({
                    shading: { type: ShadingType.SOLID, color: idx % 2 === 0 ? 'F0FDF9' : 'FFFFFF' },
                    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(text), size: 20 })] })],
                  })
                ),
              })
            ),
          ],
        }))
      }

      // ─── 4.4 EJEMPLO DE LECTURA REGISTRADA ───
      if (allScans.length > 0) {
        elements.push(new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 100 },
          children: [new TextRun({ text: 'Ejemplo de Lectura Registrada', bold: true, size: 24, color: '0F766E' })],
        }))
        elements.push(new Paragraph({
          spacing: { after: 100 },
          children: [new TextRun({ text: 'A continuación se muestra un registro típico de una lectura QR realizada durante una ronda de seguridad. Cada escaneo queda almacenado en el sistema con los datos del responsable, punto de control, coordenadas y timestamp.', size: 20, color: '444444' })],
        }))

        // Tomar una lectura de ejemplo (la más reciente)
        const ejemplo = allScans[0]
        const puntoQr = qrLocs.find(q => q.code === ejemplo.qrLocationId)

        elements.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: ['Campo', 'Valor'].map(text =>
                new TableCell({
                  shading: { type: ShadingType.SOLID, color: '0F766E' },
                  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 20 })] })],
                })
              ),
            }),
            ...[
              ['ID Registro', ejemplo.id?.substring(0, 20) + '...'],
              ['Punto de Control', puntoQr?.name || ejemplo.qrLocationId],
              ['Ubicación', puntoQr?.location || '—'],
              ['Escaneado por', ejemplo.scannedBy || 'Sin asignar'],
              ['Fecha y Hora', fmtDate(ejemplo.createdAt) + ' ' + (ejemplo.createdAt ? new Date(ejemplo.createdAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '')],
              ['Coordenadas', ejemplo.latitude && ejemplo.longitude ? `${ejemplo.latitude.toFixed(6)}, ${ejemplo.longitude.toFixed(6)}` : 'No disponibles'],
              ['Notas', ejemplo.notes || 'Sin notas'],
            ].map(([campo, valor], idx) =>
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.SOLID, color: idx % 2 === 0 ? 'F0FDF9' : 'FFFFFF' },
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: campo, bold: true, size: 20, color: '0F766E' })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.SOLID, color: idx % 2 === 0 ? 'F0FDF9' : 'FFFFFF' },
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    children: [new Paragraph({ children: [new TextRun({ text: valor, size: 20 })] })],
                  }),
                ],
              })
            ),
          ],
        }))
      }

      // ─── 4.5 RUTA DE RONDA — DIAGRAMA DE PUNTOS ───
      if (qrLocs.length > 0) {
        elements.push(new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 100 },
          children: [new TextRun({ text: 'Mapa de Puntos de Control', bold: true, size: 24, color: '0F766E' })],
        }))
        elements.push(new Paragraph({
          spacing: { after: 100 },
          children: [new TextRun({ text: `Los ${qrLocs.length} puntos de control QR se encuentran distribuidos estratégicamente en las instalaciones del condominio, cubriendo las áreas comunes, accesos, estacionamientos y zonas verdes. La siguiente tabla muestra la ubicación de cada punto y el flujo de recorrido sugerido para las rondas de seguridad.`, size: 20, color: '444444' })],
        }))

        // Tabla con ruta numerada
        elements.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: ['#', 'Punto', 'Ubicación', 'Estado'].map(text =>
                new TableCell({
                  shading: { type: ShadingType.SOLID, color: '0F766E' },
                  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 20 })] })],
                })
              ),
            }),
            ...qrLocs.map((qr, idx) =>
              new TableRow({
                children: [
                  String(idx + 1),
                  qr.name,
                  qr.location || '—',
                  qr.active ? 'Activo' : 'Inactivo',
                ].map((text, ci) =>
                  new TableCell({
                    shading: { type: ShadingType.SOLID, color: idx % 2 === 0 ? 'F0FDF9' : 'FFFFFF' },
                    children: [new Paragraph({
                      alignment: AlignmentType.CENTER,
                      children: [new TextRun({ text: String(text), size: 20, color: ci === 3 ? (text === 'Activo' ? '16A34A' : 'DC2626') : '333333' })],
                    })],
                  })
                ),
              })
            ),
          ],
        }))
      }

      return elements
    }

    function generateSolicitudesSection(sols: any[]): (Paragraph | Table)[] {
      if (sols.length === 0) return [new Paragraph({ children: [new TextRun({ text: 'No se registraron solicitudes de compra.', italics: true, color: '999999' })] })]

      // Agrupar por estado
      const elements: (Paragraph | Table)[] = []
      const estadosSol = ['Solicitado', 'En Proceso', 'Comprado', 'Rechazado', 'Anulada']
      for (const estado of estadosSol) {
        const filtered = sols.filter(s => s.estado === estado)
        if (filtered.length === 0) continue

        elements.push(new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 100, after: 100 },
          children: [new TextRun({ text: `${estado}s (${filtered.length})`, bold: true, size: 24, color: estado === 'Comprado' ? '16A34A' : estado === 'Rechazado' ? 'DC2626' : '333333' })],
        }))

        for (const s of filtered) {
          elements.push(new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({ text: `${s.codigo} — ${s.titulo}`, bold: true, size: 22 }),
              new TextRun({ text: ` | Prioridad: ${s.prioridad} | Monto: $${(s.totalEstimado || 0).toLocaleString('es-CL')}`, size: 20, color: '666666' }),
            ],
          }))
          elements.push(new Paragraph({
            spacing: { after: 50 },
            children: [new TextRun({ text: `Solicitado por: ${s.solicitadoPor || '—'} | Fecha: ${fmtDate(s.fechaSolicitud)} ${s.observaciones ? '| Obs: ' + s.observaciones : ''}`, size: 20, color: '555555' })],
          }))
        }
      }
      return elements
    }

    function generateRendicionesSection(rends: any[]): (Paragraph | Table)[] {
      if (rends.length === 0) return [new Paragraph({ children: [new TextRun({ text: 'No se registraron rendiciones de gastos.', italics: true, color: '999999' })] })]

      const elements: (Paragraph | Table)[] = []

      elements.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: ['Número', 'Título', 'Estado', 'Monto Total', 'Fecha'].map(text =>
              new TableCell({
                shading: { type: ShadingType.SOLID, color: '0F2044' },
                children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 20 })] })],
              })
            ),
          }),
          ...rends.map((r, idx) =>
            new TableRow({
              children: [
                r.numeroRendicion || '—',
                r.titulo,
                r.estado,
                `$${(r.montoTotal || 0).toLocaleString('es-CL')}`,
                fmtDate(r.createdAt),
              ].map(text =>
                new TableCell({
                  shading: { type: ShadingType.SOLID, color: idx % 2 === 0 ? 'F1F5F9' : 'FFFFFF' },
                  children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(text), size: 20 })] })],
                })
              ),
            })
          ),
        ],
      }))

      return elements
    }

    function generatePMISection(listas: any[], registros: any[]): (Paragraph | Table)[] {
      const elements: (Paragraph | Table)[] = []

      elements.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 100, after: 100 },
        children: [new TextRun({ text: `Listas de Verificación Activas (${listas.length})`, bold: true, size: 24, color: '7C3AED' })],
      }))

      for (const lv of listas) {
        elements.push(new Paragraph({
          spacing: { after: 50 },
          children: [
            new TextRun({ text: `${lv.codigo} — ${lv.nombre}`, bold: true, size: 22 }),
            new TextRun({ text: ` | Sector: ${lv.sector} | Frecuencia: ${lv.frecuencia} | Responsable: ${lv.responsable}`, size: 20, color: '666666' }),
          ],
        }))
      }

      elements.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
        children: [new TextRun({ text: `Registros PMI del Período (${registros.length})`, bold: true, size: 24, color: '7C3AED' })],
      }))

      if (registros.length === 0) {
        elements.push(new Paragraph({ children: [new TextRun({ text: 'No se registraron ejecuciones de PMI en este período.', italics: true, color: '999999' })] }))
      } else {
        for (const reg of registros) {
          elements.push(new Paragraph({
            spacing: { after: 50 },
            children: [
              new TextRun({ text: `${reg.lvId} — ${reg.fecha}`, bold: true, size: 22 }),
              new TextRun({ text: ` | Estado: ${reg.estado} | Responsable: ${reg.responsableEjecucion || '—'}`, size: 20, color: reg.estado === 'Completado' ? '16A34A' : 'D97706' }),
            ],
          }))
          if (reg.observaciones) {
            elements.push(new Paragraph({
              spacing: { after: 50 },
              indent: { left: 400 },
              children: [new TextRun({ text: `Observaciones: ${reg.observaciones}`, size: 20, italics: true, color: '444444' })],
            }))
          }
        }
      }

      return elements
    }

    // ─── GENERATE PPT ───
    function generatePPT(): Buffer {
      const pptx = require('pptxgenjs') as any
      const pres = new pptx()
      pres.layout = 'LAYOUT_WIDE'
      pres.author = 'Asesorías Integrales CYJ'
      pres.subject = 'Informe Semanal Condominio Laguna Norte'

      const DARK = '0F2044'
      const BLUE = '2E5BBA'
      const GREEN = '16A34A'
      const AMBER = 'D97706'
      const TEAL = '0F766E'
      const PURPLE = '7C3AED'
      const RED = 'DC2626'
      const GRAY = '666666'
      const LIGHT = 'F1F5F9'

      // SLIDE 1: PORTADA
      let slide = pres.addSlide()
      slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: '100%', h: '100%', fill: { color: DARK } })
      slide.addText('CONDOMINIO LAGUNA NORTE', { x: 0.5, y: 1.5, w: 12, h: 1.2, fontSize: 36, bold: true, color: 'FFFFFF', align: 'center' })
      slide.addText('INFORME SEMANAL DE GESTIÓN', { x: 0.5, y: 2.8, w: 12, h: 0.8, fontSize: 24, color: BLUE, align: 'center' })
      slide.addText(`Período: ${reportData.periodo.desde} al ${reportData.periodo.hasta}`, { x: 0.5, y: 3.8, w: 12, h: 0.5, fontSize: 16, color: 'AAAAAA', align: 'center' })
      slide.addText('Asesorías Integrales CYJ', { x: 0.5, y: 4.8, w: 12, h: 0.4, fontSize: 12, color: '888888', align: 'center', italic: true })

      // SLIDE 2: RESUMEN KPIs
      slide = pres.addSlide()
      slide.addText('RESUMEN EJECUTIVO', { x: 0.5, y: 0.3, w: 12, h: 0.7, fontSize: 28, bold: true, color: DARK })
      slide.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.0, w: 12, h: 0.03, fill: { color: BLUE } })

      const r = reportData.resumen
      const kpiCards = [
        { label: 'OTs Creadas', value: String(r.nuevasOTs), color: BLUE },
        { label: 'OTs Completadas', value: String(r.otsCompletadas), color: GREEN },
        { label: 'Proyectos Activos', value: String(r.totalProyectos), color: TEAL },
        { label: 'Lecturas QR', value: String(r.totalRondas), color: PURPLE },
        { label: 'Solicitudes Compra', value: String(r.totalSolicitudes), color: AMBER },
        { label: 'Rendiciones', value: String(r.totalRendiciones), color: RED },
        { label: 'PMI Registros', value: String(r.totalPMI), color: '6366F1' },
        { label: 'QR Creados', value: String(r.totalQrCreados), color: TEAL },
      ]

      kpiCards.forEach((kpi, i) => {
        const col = i % 4
        const row = Math.floor(i / 4)
        const x = 0.5 + col * 3.15
        const y = 1.3 + row * 2.0
        slide.addShape(pres.ShapeType.roundRect, { x, y, w: 2.9, h: 1.7, fill: { color: kpi.color }, rectRadius: 0.1 })
        slide.addText(kpi.value, { x, y: y + 0.2, w: 2.9, h: 0.9, fontSize: 36, bold: true, color: 'FFFFFF', align: 'center' })
        slide.addText(kpi.label, { x, y: y + 1.1, w: 2.9, h: 0.4, fontSize: 12, color: 'DDDDDD', align: 'center' })
      })

      // SLIDE 3: OTs
      slide = pres.addSlide()
      slide.addText('ÓRDENES DE TRABAJO', { x: 0.5, y: 0.3, w: 12, h: 0.7, fontSize: 28, bold: true, color: DARK })
      slide.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.0, w: 12, h: 0.03, fill: { color: BLUE } })

      const otRows = [
        [{ text: 'OT', options: { bold: true, color: 'FFFFFF', fill: { color: DARK } } },
         { text: 'Título', options: { bold: true, color: 'FFFFFF', fill: { color: DARK } } },
         { text: 'Estado', options: { bold: true, color: 'FFFFFF', fill: { color: DARK } } },
         { text: 'Avance', options: { bold: true, color: 'FFFFFF', fill: { color: DARK } } },
         { text: 'Fecha', options: { bold: true, color: 'FFFFFF', fill: { color: DARK } } }],
      ]

      for (const ot of ots.slice(0, 12)) {
        const estadoColor = ot.estado === 'Completado' ? GREEN : ot.estado === 'En Progreso' ? AMBER : GRAY
        otRows.push([
          ot.otNum,
          ot.titulo.length > 40 ? ot.titulo.substring(0, 37) + '...' : ot.titulo,
          { text: ot.estado, options: { color: estadoColor } },
          `${ot.progreso}%`,
          fmtDate(ot.createdAt),
        ])
      }
      if (ots.length === 0) {
        otRows.push([{ text: 'No hay OTs en este período', options: { colspan: 5, align: 'center', color: GRAY } }])
      }
      slide.addTable(otRows, { x: 0.5, y: 1.2, w: 12, fontSize: 10, border: { type: 'solid', pt: 0.5, color: 'CCCCCC' }, colW: [1.5, 5.5, 2, 1.2, 1.8] })

      if (ots.length > 12) {
        slide.addText(`... y ${ots.length - 12} OTs más`, { x: 0.5, y: 5.5, w: 12, h: 0.4, fontSize: 11, color: GRAY, italic: true })
      }

      // SLIDE 4: PROYECTOS
      slide = pres.addSlide()
      slide.addText('PROYECTOS', { x: 0.5, y: 0.3, w: 12, h: 0.7, fontSize: 28, bold: true, color: DARK })
      slide.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.0, w: 12, h: 0.03, fill: { color: TEAL } })

      const projRows = [
        [{ text: 'Código', options: { bold: true, color: 'FFFFFF', fill: { color: DARK } } },
         { text: 'Nombre', options: { bold: true, color: 'FFFFFF', fill: { color: DARK } } },
         { text: 'Estado', options: { bold: true, color: 'FFFFFF', fill: { color: DARK } } },
         { text: 'Avance', options: { bold: true, color: 'FFFFFF', fill: { color: DARK } } },
         { text: 'Presupuesto', options: { bold: true, color: 'FFFFFF', fill: { color: DARK } } }],
      ]

      for (const p of proyectos.slice(0, 12)) {
        const estadoColor = p.estado === 'Completado' ? GREEN : p.estado === 'En Ejecución' ? AMBER : GRAY
        projRows.push([
          p.codigo || '—',
          p.nombre.length > 35 ? p.nombre.substring(0, 32) + '...' : p.nombre,
          { text: p.estado, options: { color: estadoColor } },
          `${p.avance}%`,
          `$${(p.presUsado || 0).toLocaleString('es-CL')}`,
        ])
      }
      if (proyectos.length === 0) {
        projRows.push([{ text: 'No hay proyectos registrados', options: { colspan: 5, align: 'center', color: GRAY } }])
      }
      slide.addTable(projRows, { x: 0.5, y: 1.2, w: 12, fontSize: 10, border: { type: 'solid', pt: 0.5, color: 'CCCCCC' }, colW: [1.5, 5, 2.2, 1.2, 2.1] })

      // SLIDE 5: RONDAS QR
      slide = pres.addSlide()
      slide.addText('RONDAS DE SEGURIDAD Y LECTURAS QR', { x: 0.5, y: 0.3, w: 12, h: 0.7, fontSize: 28, bold: true, color: DARK })
      slide.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.0, w: 12, h: 0.03, fill: { color: TEAL } })

      // Total de lecturas
      slide.addText(`${r.totalRondas} lecturas QR registradas en el período`, { x: 0.5, y: 1.1, w: 12, h: 0.4, fontSize: 14, color: TEAL, italic: true })

      // Tabla por personal (ordenada por cantidad)
      const sortedPPTWorkers = Array.from(rondasPorTrabajador.entries()).sort((a, b) => b[1].length - a[1].length)
      const rondaWorkerRows = [
        [{ text: '#', options: { bold: true, color: 'FFFFFF', fill: { color: DARK } } },
         { text: 'Personal', options: { bold: true, color: 'FFFFFF', fill: { color: DARK } } },
         { text: 'Lecturas', options: { bold: true, color: 'FFFFFF', fill: { color: DARK } } },
         { text: '% Total', options: { bold: true, color: 'FFFFFF', fill: { color: DARK } } }],
      ]
      sortedPPTWorkers.forEach(([worker, scans], idx) => {
        const pct = r.totalRondas > 0 ? ((scans.length / r.totalRondas) * 100).toFixed(1) : '0.0'
        rondaWorkerRows.push([
          String(idx + 1),
          worker || 'Sin asignar',
          { text: String(scans.length), options: { bold: true, color: TEAL } },
          `${pct}%`,
        ])
      })
      // Fila total
      rondaWorkerRows.push([
        { text: '', options: { fill: { color: TEAL } } },
        { text: 'TOTAL', options: { bold: true, color: 'FFFFFF', fill: { color: TEAL } } },
        { text: String(r.totalRondas), options: { bold: true, color: 'FFFFFF', fill: { color: TEAL } } },
        { text: '100%', options: { bold: true, color: 'FFFFFF', fill: { color: TEAL } } },
      ])
      if (rondasPorTrabajador.size === 0) {
        rondaWorkerRows.push([{ text: 'Sin registros de rondas en este período', options: { colspan: 4, align: 'center', color: GRAY } }])
      }
      slide.addTable(rondaWorkerRows, { x: 0.5, y: 1.5, w: 7, fontSize: 10, border: { type: 'solid', pt: 0.5, color: 'CCCCCC' }, colW: [0.6, 3.4, 1.5, 1.5] })

      // Puntos QR (lado derecho)
      slide.addText(`Puntos de Control QR (${qrLocations.length})`, { x: 8, y: 1.1, w: 4.5, h: 0.4, fontSize: 12, bold: true, color: TEAL })
      const qrPptRows = [
        [{ text: 'Punto', options: { bold: true, color: 'FFFFFF', fill: { color: DARK }, fontSize: 9 } },
         { text: 'Ubicación', options: { bold: true, color: 'FFFFFF', fill: { color: DARK }, fontSize: 9 } }],
      ]
      for (const qr of qrLocations.slice(0, 8)) {
        qrPptRows.push([
          { text: qr.name, options: { fontSize: 9 } },
          { text: qr.location || '—', options: { fontSize: 9 } },
        ])
      }
      if (qrLocations.length === 0) {
        qrPptRows.push([{ text: 'Sin puntos QR', options: { colspan: 2, align: 'center', color: GRAY, fontSize: 9 } }])
      }
      slide.addTable(qrPptRows, { x: 8, y: 1.5, w: 4.5, fontSize: 9, border: { type: 'solid', pt: 0.5, color: 'CCCCCC' }, colW: [1.8, 2.7] })

      // Ejemplo de lectura
      if (registrosRonda.length > 0) {
        const ej = registrosRonda[0]
        const qrNombre = qrLocations.find(q => q.code === ej.qrLocationId)?.name || ej.qrLocationId
        slide.addShape(pres.ShapeType.rect, { x: 0.5, y: 4.5, w: 12, h: 0.03, fill: { color: TEAL } })
        slide.addText('Ejemplo de Lectura Registrada:', { x: 0.5, y: 4.6, w: 12, h: 0.4, fontSize: 12, bold: true, color: DARK })
        const ejRows = [
          [{ text: 'Campo', options: { bold: true, color: 'FFFFFF', fill: { color: TEAL }, fontSize: 9 } },
           { text: 'Valor', options: { bold: true, color: 'FFFFFF', fill: { color: TEAL }, fontSize: 9 } },
           { text: 'Campo', options: { bold: true, color: 'FFFFFF', fill: { color: TEAL }, fontSize: 9 } },
           { text: 'Valor', options: { bold: true, color: 'FFFFFF', fill: { color: TEAL }, fontSize: 9 } }],
          ['Punto de Control', qrNombre, 'Escaneado por', ej.scannedBy || 'Sin asignar'],
          ['Fecha', fmtDate(ej.createdAt), 'Coordenadas', ej.latitude && ej.longitude ? `${ej.latitude.toFixed(4)}, ${ej.longitude.toFixed(4)}` : 'N/A'],
          ['Notas', ej.notes || 'Sin notas', '', ''],
        ]
        slide.addTable(ejRows, { x: 0.5, y: 5.0, w: 12, fontSize: 9, border: { type: 'solid', pt: 0.5, color: 'CCCCCC' }, colW: [2, 4, 2, 4] })
      }

      // SLIDE 6: SOLICITUDES DE COMPRA
      slide = pres.addSlide()
      slide.addText('SOLICITUDES DE COMPRA', { x: 0.5, y: 0.3, w: 12, h: 0.7, fontSize: 28, bold: true, color: DARK })
      slide.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.0, w: 12, h: 0.03, fill: { color: AMBER } })

      const solRows = [
        [{ text: 'Código', options: { bold: true, color: 'FFFFFF', fill: { color: DARK } } },
         { text: 'Título', options: { bold: true, color: 'FFFFFF', fill: { color: DARK } } },
         { text: 'Estado', options: { bold: true, color: 'FFFFFF', fill: { color: DARK } } },
         { text: 'Monto', options: { bold: true, color: 'FFFFFF', fill: { color: DARK } } },
         { text: 'Prioridad', options: { bold: true, color: 'FFFFFF', fill: { color: DARK } } }],
      ]

      for (const s of solicitudes.slice(0, 12)) {
        const estadoColor = s.estado === 'Comprado' ? GREEN : s.estado === 'Rechazado' ? RED : GRAY
        solRows.push([
          s.codigo,
          s.titulo.length > 35 ? s.titulo.substring(0, 32) + '...' : s.titulo,
          { text: s.estado, options: { color: estadoColor } },
          `$${(s.totalEstimado || 0).toLocaleString('es-CL')}`,
          s.prioridad,
        ])
      }
      if (solicitudes.length === 0) {
        solRows.push([{ text: 'No hay solicitudes en este período', options: { colspan: 5, align: 'center', color: GRAY } }])
      }
      slide.addTable(solRows, { x: 0.5, y: 1.2, w: 12, fontSize: 10, border: { type: 'solid', pt: 0.5, color: 'CCCCCC' }, colW: [1.8, 4.5, 2, 2, 1.7] })

      // SLIDE 7: RENDICIÓN DE GASTOS + PMI
      slide = pres.addSlide()
      slide.addText('RENDICIÓN DE GASTOS', { x: 0.5, y: 0.3, w: 12, h: 0.7, fontSize: 28, bold: true, color: DARK })
      slide.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.0, w: 12, h: 0.03, fill: { color: RED } })

      const rendRows = [
        [{ text: 'Número', options: { bold: true, color: 'FFFFFF', fill: { color: DARK } } },
         { text: 'Título', options: { bold: true, color: 'FFFFFF', fill: { color: DARK } } },
         { text: 'Estado', options: { bold: true, color: 'FFFFFF', fill: { color: DARK } } },
         { text: 'Monto', options: { bold: true, color: 'FFFFFF', fill: { color: DARK } } }],
      ]

      for (const rd of rendiciones.slice(0, 10)) {
        const estadoColor = rd.estado === 'APROBADO' ? GREEN : rd.estado === 'RECHAZADO' ? RED : AMBER
        rendRows.push([
          rd.numeroRendicion || '—',
          rd.titulo.length > 35 ? rd.titulo.substring(0, 32) + '...' : rd.titulo,
          { text: rd.estado, options: { color: estadoColor } },
          `$${(rd.montoTotal || 0).toLocaleString('es-CL')}`,
        ])
      }
      if (rendiciones.length === 0) {
        rendRows.push([{ text: 'No hay rendiciones en este período', options: { colspan: 4, align: 'center', color: GRAY } }])
      }
      slide.addTable(rendRows, { x: 0.5, y: 1.2, w: 12, fontSize: 10, border: { type: 'solid', pt: 0.5, color: 'CCCCCC' }, colW: [2, 5, 2.5, 2.5] })

      // PMI summary on same slide
      slide.addText(`PMI — Registros: ${r.totalPMI} | Completados: ${r.pmiCompletados} | Pendientes: ${r.pmiPendientes}`, {
        x: 0.5, y: 4.2, w: 12, h: 0.5, fontSize: 14, bold: true, color: PURPLE,
      })

      const pmiRows = [
        [{ text: 'Lista', options: { bold: true, color: 'FFFFFF', fill: { color: PURPLE } } },
         { text: 'Sector', options: { bold: true, color: 'FFFFFF', fill: { color: PURPLE } } },
         { text: 'Frecuencia', options: { bold: true, color: 'FFFFFF', fill: { color: PURPLE } } },
         { text: 'Responsable', options: { bold: true, color: 'FFFFFF', fill: { color: PURPLE } } }],
      ]

      for (const lv of pmiListas.slice(0, 6)) {
        pmiRows.push([lv.nombre.length > 30 ? lv.nombre.substring(0, 27) + '...' : lv.nombre, lv.sector, lv.frecuencia, lv.responsable])
      }
      if (pmiListas.length === 0) {
        pmiRows.push([{ text: 'Sin listas de verificación activas', options: { colspan: 4, align: 'center', color: GRAY } }])
      }
      slide.addTable(pmiRows, { x: 0.5, y: 4.8, w: 12, fontSize: 10, border: { type: 'solid', pt: 0.5, color: 'CCCCCC' }, colW: [4.5, 3, 2.5, 2] })

      return pres.write('nodebuffer') as Buffer
    }

    // ─── GENERATE FILES ───
    const results: Record<string, string> = {}

    if (formato === 'word' || formato === 'ambos') {
      const doc = generateWord()
      const buffer = await Packer.toBuffer(doc)
      results.word = Buffer.from(buffer).toString('base64')
    }

    if (formato === 'pptx' || formato === 'ambos') {
      const pptBuffer = generatePPT()
      results.pptx = pptBuffer.toString('base64')
    }

    return NextResponse.json({
      success: true,
      periodo: reportData.periodo,
      resumen: reportData.resumen,
      archivos: results,
      filename_word: `informe-semanal-${new Date().toISOString().slice(0, 10)}.docx`,
      filename_pptx: `informe-semanal-${new Date().toISOString().slice(0, 10)}.pptx`,
    })
  } catch (error) {
    console.error('Error generando informe semanal:', error)
    return NextResponse.json({ error: 'Error al generar el informe', details: String(error) }, { status: 500 })
  }
}
