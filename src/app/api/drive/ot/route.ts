import { NextRequest, NextResponse } from 'next/server'
import { getCurrentSession } from '@/lib/auth'
import { db } from '@/lib/db'
import { createOTFolderStructure, listFiles, listFolders } from '@/lib/google-drive'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// POST - Crear carpeta de OT en Drive dentro del proyecto
export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  try {
    const body = await request.json()
    const { otId, proyectoDriveFolderId } = body

    if (!otId || !proyectoDriveFolderId) {
      return NextResponse.json(
        { error: 'otId y proyectoDriveFolderId son requeridos' },
        { status: 400 },
      )
    }

    const ot = await db.ordenTrabajo.findUnique({ where: { id: otId } })
    if (!ot) {
      return NextResponse.json({ error: 'OT no encontrada' }, { status: 404 })
    }

    // Crear estructura de carpetas de la OT
    const structure = await createOTFolderStructure(
      ot.codigo,
      ot.titulo,
      proyectoDriveFolderId,
    )

    // Guardar el ID de la carpeta en la OT
    await db.ordenTrabajo.update({
      where: { id: otId },
      data: {
        driveFolderId: structure.otFolder.id,
      },
    })

    return NextResponse.json({
      ok: true,
      message: `Carpeta creada en Drive para ${ot.codigo}`,
      ot: {
        id: ot.id,
        codigo: ot.codigo,
        titulo: ot.titulo,
      },
      driveUrl: structure.otFolder.url,
      folders: {
        ot: structure.otFolder,
        fotosAntes: structure.fotosAntesFolder,
        fotosDespues: structure.fotosDespuesFolder,
        documentos: structure.documentosFolder,
        solicitudes: structure.solicitudesFolder,
      },
    })
  } catch (error: any) {
    console.error('Error creando carpeta de OT en Drive:', error)
    return NextResponse.json({
      ok: false,
      error: error.message || 'Error al crear carpeta',
      details: error?.response?.data?.error?.message || null,
    }, { status: 500 })
  }
}

// GET /api/drive/ot?id=OT_ID - Listar contenido de la carpeta de una OT
export async function GET(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  try {
    const otId = request.nextUrl.searchParams.get('id')
    if (!otId) {
      return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    }

    const ot = await db.ordenTrabajo.findUnique({ where: { id: otId } })
    if (!ot) {
      return NextResponse.json({ error: 'OT no encontrada' }, { status: 404 })
    }

    if (!ot.driveFolderId) {
      return NextResponse.json({
        ok: true,
        linked: false,
        message: 'OT no tiene carpeta en Drive',
      })
    }

    const folders = await listFolders(ot.driveFolderId)
    const files = await listFiles(ot.driveFolderId)

    return NextResponse.json({
      ok: true,
      linked: true,
      driveFolderId: ot.driveFolderId,
      folders,
      files,
    })
  } catch (error: any) {
    console.error('Error listando Drive OT:', error)
    return NextResponse.json({
      ok: false,
      error: error.message || 'Error al listar',
    }, { status: 500 })
  }
}
