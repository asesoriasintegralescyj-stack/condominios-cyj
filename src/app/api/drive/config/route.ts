import { NextResponse } from 'next/server'
import { verifyDriveConfig, getDriveClient, listFolders } from '@/lib/google-drive'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET() {
  const configured = verifyDriveConfig()
  if (!configured) {
    return NextResponse.json({
      ok: false,
      error: 'Variables de entorno no encontradas',
      envCheck: {
        hasServiceAccount: !!process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT,
        hasParentFolder: !!process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID,
        hasEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        hasKey: !!process.env.GOOGLE_PRIVATE_KEY,
        hasFolderId: !!process.env.GOOGLE_DRIVE_FOLDER_ID,
      }
    })
  }

  try {
    const drive = await getDriveClient()
    const { getParentFolderId } = await import('@/lib/google-drive')
    const parentId = getParentFolderId()
    const folders = await listFolders(parentId)
    return NextResponse.json({
      ok: true,
      parentFolderId: parentId,
      carpetasExistentes: folders.length,
      primeras5: folders.slice(0, 5).map(f => f.name),
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
