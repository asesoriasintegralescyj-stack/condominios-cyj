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
    privateKeyOk: false,
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

  // Validar JSON
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

  // Verificar private_key
  const pk = parsed.private_key || ''
  results.privateKeyCheck = {
    length: pk.length,
    startsCorrectly: pk.startsWith('-----BEGIN PRIVATE KEY-----'),
    endsCorrectly: pk.trimEnd().endsWith('-----END PRIVATE KEY-----'),
    hasNewlines: pk.includes('\n'),
    hasLiteralBackslashN: pk.includes('\\n'),
    // En Vercel, las env vars multilinea pueden llegar con \n literal
    // en vez de saltos de línea reales
    middleSample: pk.length > 50 ? pk.substring(44, 54) : null,
  }
  results.privateKeyOk = pk.startsWith('-----BEGIN') && pk.includes('\n')

  // Probar conexión
  try {
    const { google } = await import('googleapis')

    // Si el private_key tiene \n literales en vez de saltos de renglón,
    // reemplazarlos para que el JWT funcione
    let fixedKey = parsed.private_key
    if (fixedKey && !fixedKey.includes('\n') && fixedKey.includes('\\n')) {
      fixedKey = fixedKey.replace(/\\n/g, '\n')
      results.privateKeyFixed = true
    }

    const auth = new google.auth.JWT(
      parsed.client_email,
      undefined,
      fixedKey,
      ['https://www.googleapis.com/auth/drive'],
    )

    // Probar obtener token primero
    const token = await auth.authorize()
    results.tokenObtained = true
    results.tokenType = token.token_type
    results.tokenExpires = token.expiry_date

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
      status: error?.response?.status || null,
    }
  }

  return NextResponse.json(results)
}
