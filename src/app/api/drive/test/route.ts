import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * Endpoint de diagnóstico de Google Drive SIN autenticación.
 * Usar solo para verificar que las variables de entorno y conexión funcionan.
 * Eliminar después de verificar.
 */
export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    envVars: {},
    jsonValid: false,
    connection: null,
  }

  // 1. Verificar variables de entorno
  const parentId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID
  const svcAccount = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT

  results.envVars.parentFolderId = {
    set: !!parentId,
    value: parentId || 'NO CONFIGURADA',
  }
  results.envVars.serviceAccount = {
    set: !!svcAccount,
    length: svcAccount ? svcAccount.length : 0,
    firstChars: svcAccount ? svcAccount.substring(0, 20) + '...' : 'NO CONFIGURADA',
  }

  if (!parentId || !svcAccount) {
    results.error = 'Faltan variables de entorno. Revisa en Vercel > Settings > Environment Variables'
    return NextResponse.json(results, { status: 400 })
  }

  // 2. Validar JSON del service account
  let parsed: any
  try {
    parsed = JSON.parse(svcAccount)
    results.jsonValid = true
    results.serviceAccountEmail = parsed.client_email
    results.projectId = parsed.project_id
  } catch (e: any) {
    results.jsonValid = false
    results.jsonError = e.message
    results.error = 'GOOGLE_DRIVE_SERVICE_ACCOUNT no es un JSON válido'
    return NextResponse.json(results, { status: 400 })
  }

  // 3. Probar conexión con Google Drive
  try {
    const { google } = await import('googleapis')
    const auth = new google.auth.JWT(
      parsed.client_email,
      undefined,
      parsed.private_key,
      ['https://www.googleapis.com/auth/drive'],
    )
    const drive = google.drive({ version: 'v3', auth })

    // Verificar acceso a la carpeta padre
    const folder = await drive.files.get({
      fileId: parentId,
      fields: 'id, name, webViewLink',
    })

    results.connection = {
      ok: true,
      parentFolder: {
        id: folder.data.id,
        name: folder.data.name,
        url: folder.data.webViewLink,
      },
    }

    // Listar carpetas existentes
    const folders = await drive.files.list({
      q: `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name), nextPageToken',
      pageSize: 50,
      orderBy: 'createdTime desc',
    })

    results.existingFolders = (folders.data.files || []).map((f: any) => ({
      id: f.id,
      name: f.name,
    }))

  } catch (error: any) {
    results.connection = {
      ok: false,
      error: error.message,
      details: error?.response?.data?.error?.message || null,
      code: error?.code || null,
    }
  }

  return NextResponse.json(results)
}
