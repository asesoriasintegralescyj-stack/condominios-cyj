import { NextRequest, NextResponse } from 'next/server'
import { getCurrentSession } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  createProjectFolderStructure,
  createOTFolderStructure,
  listFiles,
  listFolders,
  findFolderByName,
} from '@/lib/google-drive'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface Context {
  params: Promise<{ id: string }>
}

// POST - Crear estructura de carpetas en Drive para un proyecto existente
// También se puede usar para re-crear la estructura si se borró
export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (session.user.rol !== 'admin') {
    return NextResponse.json({ error: 'Solo admin' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const proyectoId = body.proyectoId
    if (!proyectoId) {
      return NextResponse.json({ error: 'proyectoId requerido' }, { status: 400 })
    }

    const proyecto = await db.proyecto.findUnique({ where: { id: proyectoId } })
    if (!proyecto) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    // Verificar que Drive está configurado
    if (!process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID) {
      return NextResponse.json({
        error: 'Google Drive no configurado. Configure GOOGLE_DRIVE_PARENT_FOLDER_ID.',
      }, { status: 400 })
    }

    // Crear estructura de carpetas
    const structure = await createProjectFolderStructure(
      proyecto.codigo,
      proyecto.nombre,
    )

    // Guardar los IDs de carpetas en el proyecto (usa JSON en campo existente o campo nuevo)
    await db.proyecto.update({
      where: { id: proyectoId },
      data: {
        driveFolderId: structure.proyectoFolder.id,
        driveData: JSON.stringify({
          proyectoFolder: structure.proyectoFolder,
          solicitudesFolder: structure.solicitudesFolder,
          documentosFolder: structure.documentosFolder,
          fotosAntesFolder: structure.fotosAntesFolder,
          fotosDespuesFolder: structure.fotosDespuesFolder,
          createdAt: new Date().toISOString(),
        }),
      },
    })

    return NextResponse.json({
      ok: true,
      message: `Estructura creada en Drive para ${proyecto.codigo}`,
      proyecto: {
        id: proyecto.id,
        codigo: proyecto.codigo,
        nombre: proyecto.nombre,
      },
      driveUrl: structure.proyectoFolder.url,
      folders: {
        proyecto: structure.proyectoFolder,
        solicitudes: structure.solicitudesFolder,
        documentos: structure.documentosFolder,
        fotosAntes: structure.fotosAntesFolder,
        fotosDespues: structure.fotosDespuesFolder,
      },
    })
  } catch (error: any) {
    console.error('Error creando carpetas de proyecto en Drive:', error)
    return NextResponse.json({
      ok: false,
      error: error.message || 'Error al crear carpetas',
      details: error?.response?.data?.error?.message || null,
    }, { status: 500 })
  }
}

// GET - Listar contenido de las carpetas de un proyecto en Drive
export async function GET(
  _request: NextRequest,
  { params }: Context,
) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  try {
    const { id } = await params
    const proyecto = await db.proyecto.findUnique({ where: { id } })
    if (!proyecto) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    if (!proyecto.driveFolderId) {
      return NextResponse.json({
        ok: true,
        linked: false,
        message: 'Proyecto no tiene carpeta en Drive',
      })
    }

    // Listar subcarpetas del proyecto
    const folders = await listFolders(proyecto.driveFolderId)
    const files = await listFiles(proyecto.driveFolderId)

    return NextResponse.json({
      ok: true,
      linked: true,
      driveFolderId: proyecto.driveFolderId,
      folders,
      files,
    })
  } catch (error: any) {
    console.error('Error listando Drive:', error)
    return NextResponse.json({
      ok: false,
      error: error.message || 'Error al listar carpetas',
    }, { status: 500 })
  }
}
