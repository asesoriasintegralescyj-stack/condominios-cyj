import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * Endpoint de diagnóstico de Google Drive SIN autenticación.
 */
export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    envVars: {},
    jsonValid: false,
    connection: null,
  }

  const parentId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID
  const svcAccount = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT

  results.envVars.parentFolderId = {
    set: !!parentId,
    value: parentId || 'NO CONFIGURADA',
  }
  results.envVars.serviceAccount = {
    set: !!svcAccount,
    length: svcAccount ? svcAccount.length : 0,
  }

  if (!parentId || !svcAccount) {
    results.error = 'Faltan variables de entorno'
    return NextResponse.json(results, { status: 400 })
  }

  let parsed: any
  try {
    parsed = JSON.parse(svcAccount)
    results.jsonValid = true
    results.serviceAccountEmail = parsed.client_email
    results.projectId = parsed.project_id
  } catch (e: any) {
    results.jsonValid = false
    results.jsonError = e.message
    results.error = 'JSON inválido'
    return NextResponse.json(results, { status: 400 })
  }

  try {
    const { google } = await import('googleapis')

    // Usar fromJSON en vez de new JWT - más confiable en serverless
    const auth = google.auth.fromJSON({
      type: 'service_account',
      client_email: parsed.client_email,
      private_key: parsed.private_key,
      scopes: ['https://www.googleapis.com/auth/drive'],
    })

    // Autorizar explícitamente para probar que el token se genera
    await auth.authorize()
    results.tokenObtained = true

    const drive = google.drive({ version: 'v3', auth })

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

    const folders = await drive.files.list({
      q: `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
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
      status: error?.response?.status || null,
    }
  }

  return NextResponse.json(results)
}
