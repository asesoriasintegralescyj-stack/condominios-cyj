import { NextResponse } from 'next/server'
import { getCurrentSession } from '@/lib/auth'
import { verifyDriveConfig, createFolder, listFolders } from '@/lib/google-drive'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// GET - Verificar estado de la conexión con Google Drive
export async function GET() {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (session.user.rol !== 'admin') {
    return NextResponse.json({ error: 'Solo admin' }, { status: 403 })
  }

  try {
    const result = await verifyDriveConfig()
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error verificando Drive:', error)
    return NextResponse.json({
      ok: false,
      error: error.message || 'Error al verificar Drive',
    }, { status: 500 })
  }
}

// POST - Probar conexión creando una carpeta de test
export async function POST() {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (session.user.rol !== 'admin') {
    return NextResponse.json({ error: 'Solo admin' }, { status: 403 })
  }

  try {
    const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID
    if (!parentFolderId) {
      return NextResponse.json({
        ok: false,
        error: 'GOOGLE_DRIVE_PARENT_FOLDER_ID no configurada',
      }, { status: 400 })
    }

    // Crear carpeta de prueba
    const testFolder = await createFolder(
      `[TEST] Conexión exitosa - ${new Date().toISOString().slice(0, 10)}`,
      parentFolderId,
    )

    // Verificar que se creó listando carpetas
    const folders = await listFolders(parentFolderId)

    return NextResponse.json({
      ok: true,
      message: 'Conexión exitosa con Google Drive',
      testFolder: {
        id: testFolder.id,
        name: testFolder.name,
        url: testFolder.url,
      },
      totalFoldersInParent: folders.length,
    })
  } catch (error: any) {
    console.error('Error en test Drive:', error)
    return NextResponse.json({
      ok: false,
      error: error.message || 'Error al conectar con Drive',
      details: error?.response?.data?.error?.message || null,
    }, { status: 500 })
  }
}
