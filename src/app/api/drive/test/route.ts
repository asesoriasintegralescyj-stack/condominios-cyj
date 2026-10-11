import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

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
    // Escribir clave a archivo temporal y usar keyFile
    const fs = await import('fs')
    const os = await import('os')
    const path = await import('path')
    const { google } = await import('googleapis')

    const tmpFile = path.join(os.tmpdir(), `gdrive-test-${Date.now()}.json`)
    fs.writeFileSync(tmpFile, JSON.stringify(parsed))

    try {
      const auth = new google.auth.JWT({
        keyFile: tmpFile,
        scopes: ['https://www.googleapis.com/auth/drive'],
      })

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
    } finally {
      try { fs.unlinkSync(tmpFile) } catch {}
    }

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
