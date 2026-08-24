import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'
import { apiError, handlePrismaError } from '@/lib/api-helpers'
import { generarCorrelativo } from '@/lib/utils'
import { backupProyectoToDrive } from '@/lib/backup-helpers'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const CONDOMINIO_ID = 'cmo9f3x7j0000ktyeb0rzhwt9'

/**
 * Auto-migra la tabla Proyecto agregando columnas faltantes.
 * Se ejecuta una sola vez (las columnas se verifican antes de agregar).
 */
async function ensureColumns() {
  const cols: { name: string; type: string }[] = [
    { name: 'driveFolderId', type: 'TEXT' },
    { name: 'driveData', type: 'TEXT' },
  ]
  for (const col of cols) {
    try {
      const r = await db.$queryRawUnsafe<[{ exists: boolean }]>(
        `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Proyecto' AND column_name='${col.name}')`
      )
      if (!r[0]?.exists) {
        await db.$executeRawUnsafe(
          `ALTER TABLE "Proyecto" ADD COLUMN "${col.name}" ${col.type}`
        )
        console.log(`[ensureColumns] Columna ${col.name} agregada a Proyecto`)
      }
    } catch (e) {
      console.warn(`[ensureColumns] Error con ${col.name}:`, e)
    }
  }
  // Índice
  try {
    const r = await db.$queryRawUnsafe<[{ exists: boolean }]>(
      `SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='Proyecto_driveFolderId_idx')`
    )
    if (!r[0]?.exists) {
      await db.$executeRawUnsafe(`CREATE INDEX "Proyecto_driveFolderId_idx" ON "Proyecto"("driveFolderId")`)
      console.log(`[ensureColumns] Índice Proyecto_driveFolderId_idx creado`)
    }
  } catch (e) {
    console.warn(`[ensureColumns] Error con índice:`, e)
  }
}

// Tipo para los recursos relacionados
type MaterialInput = { descripcion: string; cantidad: number; unidad: string; precioUnit: number; total: number; linkCompra?: string }
type HerramientaInput = { nombre: string; cantidad: number }
type TareaInput = { descripcion: string; cantidad: number; estado: string }
type PersonalInput = { nombre: string; tipo: string; cantidad: number; precioUnit: number; total: number }
type DocumentoInput = { nombre: string; tipo: string; descripcion: string; archivo: string; fechaDoc: string }

// Limpia base64 de fotos y cotizaciones para la vista de lista
function stripBase64(proyecto: any) {
  if (!proyecto) return proyecto
  let fotosAntesCount = 0
  let fotosDespuesCount = 0
  let cotizacionesCount = 0

  try {
    if (proyecto.fotosAntes) {
      const arr = JSON.parse(proyecto.fotosAntes)
      fotosAntesCount = Array.isArray(arr) ? arr.length : 0
    }
  } catch { /* noop */ }
  try {
    if (proyecto.fotosDespues) {
      const arr = JSON.parse(proyecto.fotosDespues)
      fotosDespuesCount = Array.isArray(arr) ? arr.length : 0
    }
  } catch { /* noop */ }
  try {
    if (proyecto.cotizaciones) {
      const arr = JSON.parse(proyecto.cotizaciones)
      cotizacionesCount = Array.isArray(arr) ? arr.length : 0
    }
  } catch { /* noop */ }

  return {
    ...proyecto,
    fotosAntes: undefined,
    fotosDespues: undefined,
    cotizaciones: undefined,
    tieneFotosAntes: fotosAntesCount > 0,
    tieneFotosDespues: fotosDespuesCount > 0,
    tieneCotizaciones: cotizacionesCount > 0,
    fotosAntesCount,
    fotosDespuesCount,
    cotizacionesCount,
  }
}

// GET - List all proyectos
export async function GET(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'proyectos.ver', session.userPermisos)) {
    return apiError('Sin permisos', 403)
  }
  try {
    // Auto-migrar columnas faltantes (idempotente)
    await ensureColumns()

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const detail = searchParams.get('detail') === 'true'

    // Filtrar por condominio (incluye proyectos sin condominioId asignado)
    const where: any = {
      OR: [{ condominioId: CONDOMINIO_ID }, { condominioId: null }],
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { nombre: { contains: search } },
            { estado: { contains: search } },
            { categoria: { contains: search } },
            { sector: { contains: search } },
            { responsable: { contains: search } },
          ],
        },
      ]
    }

    if (detail) {
      // Modo detalle: incluir todas las relaciones (para vista de detalle)
      const proyectosRaw = await db.proyecto.findMany({
        where,
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
      return NextResponse.json(proyectosRaw)
    }

    // Modo listado: NO incluir relaciones pesadas (optimización transferencia BD)
    // Pero SÍ incluir fotosAntes/fotosDespues/cotizaciones (son JSON strings livianos)
    // para que stripBase64 pueda contar los adjuntos
    const proyectosRaw = await db.proyecto.findMany({
      where,
      select: {
        id: true,
        codigo: true,
        nombre: true,
        categoria: true,
        estado: true,
        ubicacion: true,
        fechaInicio: true,
        fechaFin: true,
        presProg: true,
        presUsado: true,
        avance: true,
        descripcion: true,
        notas: true,
        createdAt: true,
        updatedAt: true,
        // Campos PMI
        sector: true,
        tipoReparacion: true,
        tipoTrabajo: true,
        prioridad: true,
        estadoAprobacion: true,
        responsable: true,
        responsableExterno: true,
        tiempoEstimado: true,
        monto: true,
        fechaInicioReal: true,
        fechaFinReal: true,
        comentarios: true,
        centroCostoId: true,
        centroCosto: { select: { id: true, codigo: true, nombre: true } },
        // Campos de adjuntos (JSON strings, no tan pesados)
        fotosAntes: true,
        fotosDespues: true,
        cotizaciones: true,
        // Counts en lugar de datos completos de relaciones
        _count: {
          select: {
            materiales: true,
            herramientas: true,
            tareas: true,
            personal: true,
            documentos: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    })

    // En la vista de lista, ocultamos base64 pesados
    const proyectos = proyectosRaw.map((p) => stripBase64(p))
    return NextResponse.json(proyectos)
  } catch (error) {
    console.error('Error fetching proyectos:', error)
    return handlePrismaError(error)
  }
}

// POST - Create new proyecto
export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'proyectos.crear', session.userPermisos)) {
    return apiError('Sin permisos', 403)
  }
  try {
    // Auto-migrar columnas faltantes (idempotente)
    await ensureColumns()

    const data = await request.json()

    // Extract resources from data
    const {
      materiales,
      herramientas,
      tareas,
      personal,
      documentos,
      ...proyectoData
    } = data

    // Serializar fotos y cotizaciones (si vienen como arrays, convertir a JSON string)
    const fotosAntes =
      proyectoData.fotosAntes === undefined || proyectoData.fotosAntes === null
        ? null
        : typeof proyectoData.fotosAntes === 'string'
          ? proyectoData.fotosAntes
          : JSON.stringify(proyectoData.fotosAntes)

    const fotosDespues =
      proyectoData.fotosDespues === undefined || proyectoData.fotosDespues === null
        ? null
        : typeof proyectoData.fotosDespues === 'string'
          ? proyectoData.fotosDespues
          : JSON.stringify(proyectoData.fotosDespues)

    const cotizaciones =
      proyectoData.cotizaciones === undefined || proyectoData.cotizaciones === null
        ? null
        : typeof proyectoData.cotizaciones === 'string'
          ? proyectoData.cotizaciones
          : JSON.stringify(proyectoData.cotizaciones)

    // Generar código automático usando tabla de secuencias
    const { generarCorrelativoDB } = await import('@/lib/utils')
    const codigo = await generarCorrelativoDB(db, 'Proyecto', 'PROY', 3)

    const proyecto = await db.proyecto.create({
      data: {
        codigo,
        nombre: proyectoData.nombre,
        categoria: proyectoData.categoria || 'General',
        estado: proyectoData.estado || 'Planificado',
        ubicacion: proyectoData.ubicacion || null,
        fechaInicio: proyectoData.fechaInicio || null,
        fechaFin: proyectoData.fechaFin || null,
        presProg: parseFloat(proyectoData.presProg) || 0,
        presUsado: parseFloat(proyectoData.presUsado) || 0,
        avance: parseInt(proyectoData.avance) || 0,
        descripcion: proyectoData.descripcion || null,
        notas: proyectoData.notas || null,

        // Nuevos campos
        sector: proyectoData.sector || null,
        tipoReparacion: proyectoData.tipoReparacion || null,
        tipoTrabajo: proyectoData.tipoTrabajo || null,
        prioridad: proyectoData.prioridad || null,
        estadoAprobacion: proyectoData.estadoAprobacion || null,
        responsable: proyectoData.responsable || null,
        responsableExterno: proyectoData.responsableExterno || null,
        tiempoEstimado: proyectoData.tiempoEstimado || null,
        monto: parseFloat(proyectoData.monto) || 0,
        fechaInicioReal: proyectoData.fechaInicioReal || null,
        fechaFinReal: proyectoData.fechaFinReal || null,
        comentarios: proyectoData.comentarios || null,
        fotosAntes,
        fotosDespues,
        cotizaciones,

        centroCostoId: proyectoData.centroCostoId || null,
        condominioId: CONDOMINIO_ID,

        // Create related resources
        materiales:
          materiales && materiales.length > 0
            ? {
                create: materiales.map((m: MaterialInput) => ({
                  descripcion: m.descripcion,
                  cantidad: parseFloat(String(m.cantidad)) || 1,
                  unidad: m.unidad || 'unidad',
                  precioUnit: parseFloat(String(m.precioUnit)) || 0,
                  total: parseFloat(String(m.total)) || 0,
                  linkCompra: m.linkCompra || null,
                })),
              }
            : undefined,

        herramientas:
          herramientas && herramientas.length > 0
            ? {
                create: herramientas.map((h: HerramientaInput) => ({
                  nombre: h.nombre,
                  cantidad: parseInt(String(h.cantidad)) || 1,
                })),
              }
            : undefined,

        tareas:
          tareas && tareas.length > 0
            ? {
                create: tareas.map((t: TareaInput) => ({
                  descripcion: t.descripcion,
                  cantidad: parseInt(String(t.cantidad)) || 1,
                  estado: t.estado || 'Pendiente',
                })),
              }
            : undefined,

        personal:
          personal && personal.length > 0
            ? {
                create: personal.map((p: PersonalInput) => ({
                  nombre: p.nombre,
                  tipo: p.tipo || 'Interno',
                  cantidad: parseInt(String(p.cantidad)) || 1,
                  precioUnit: parseFloat(String(p.precioUnit)) || 0,
                  total: parseFloat(String(p.total)) || 0,
                })),
              }
            : undefined,

        documentos:
          documentos && documentos.length > 0
            ? {
                create: documentos.map((d: DocumentoInput) => ({
                  nombre: d.nombre,
                  tipo: d.tipo || 'cotizacion',
                  descripcion: d.descripcion || null,
                  archivo: d.archivo,
                  fechaDoc: d.fechaDoc || null,
                })),
              }
            : undefined,
      },
      include: {
        materiales: true,
        herramientas: true,
        tareas: true,
        personal: true,
        documentos: true,
      },
    })

    // --- Backup a Google Drive (fire-and-forget) ---
    void backupProyectoToDrive(proyecto.id)

    return NextResponse.json(proyecto)
  } catch (error) {
    console.error('Error creating proyecto:', error)
    return handlePrismaError(error)
  }
}

