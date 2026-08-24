// Google Drive service for Condominios CYJ
// CRITICAL: On Vercel serverless, google.auth.JWT MUST use keyFile (temp file), NOT string private_key

import { google } from 'googleapis'
import { writeFileSync, unlinkSync, existsSync, mkdirSync, readFileSync } from 'fs'
import { join } from 'path'

const DRIVE_SERVICE_ACCT = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT ||
  JSON.stringify({
    type: 'service_account',
    project_id: 'condominios-cyj-drive',
    private_key_id: 'cf9314053f9814b0ce05b7782de12590a4e0b308',
    private_key: '',
    client_email: 'drive-backup@condominios-cyj-drive.iam.gserviceaccount.com',
    client_id: '101384273577199827084',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://accounts.google.com/oauth2/v1/certs',
    client_x509_cert_url: 'https://accounts.google.com/robot/v1/metadata/x509/drive-backup%40condominios-cyj-drive.iam.gserviceaccount.com',
    universe_domain: 'googleapis.com',
  })

// Parent folder ID in Google Drive (the root backup folder)
const DRIVE_PARENT_FOLDER_ID = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID || '1CgBbB4DxKZrPQN5z3VlOg9pM_2X0WdK7jE'

let _driveClient: any = null
let _keyFilePath: string | null = null

/**
 * Get authenticated Google Drive client
 * CRITICAL: Uses temp keyFile because JWT with string private_key fails on Vercel
 */
export async function getDriveClient() {
  if (_driveClient) return _driveClient

  try {
    const creds = JSON.parse(DRIVE_SERVICE_ACCT)

    // Write credentials to temp file (required for Vercel serverless)
    const tmpDir = '/tmp'
    if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true })
    _keyFilePath = join(tmpDir, `drive-key-${Date.now()}.json`)
    writeFileSync(_keyFilePath, JSON.stringify(creds), 'utf-8')

    const auth = new google.auth.JWT({
      keyFile: _keyFilePath,
      scopes: ['https://www.googleapis.com/auth/drive'],
    })

    await auth.authorize()
    _driveClient = google.drive({ version: 'v3', auth })
    console.log('[Drive] Client authenticated successfully')
    return _driveClient
  } catch (error) {
    console.error('[Drive] Error authenticating:', error)
    throw error
  }
}

/** Verify Drive configuration is valid */
export async function verifyDriveConfig() {
  const drive = await getDriveClient()
  try {
    await drive.files.get({ fileId: DRIVE_PARENT_FOLDER_ID, fields: 'id,name' })
    return { ok: true, parentFolderId: DRIVE_PARENT_FOLDER_ID }
  } catch (error: any) {
    return { ok: false, error: error.message }
  }
}

/** Create a folder in Google Drive */
export async function createFolder(name: string, parentId?: string) {
  const drive = await getDriveClient()
  const fileMetadata: any = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  }
  if (parentId) {
    fileMetadata.parents = [parentId]
  }
  const result = await drive.files.create({
    resource: fileMetadata,
    fields: 'id,name',
  })
  console.log(`[Drive] Folder created: ${name} (${result.data.id})`)
  return result.data
}

/** Find a folder by name inside a parent */
export async function findFolderByName(name: string, parentId: string) {
  const drive = await getDriveClient()
  const query = `name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
  const result = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    pageSize: 1,
  })
  return result.data.files?.[0] || null
}

/** List folders inside a parent */
export async function listFolders(parentId: string) {
  const drive = await getDriveClient()
  const query = `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
  const result = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    pageSize: 200,
  })
  return result.data.files || []
}

/** List files inside a parent */
export async function listFiles(parentId: string) {
  const drive = await getDriveClient()
  const query = `'${parentId}' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false`
  const result = await drive.files.list({
    q: query,
    fields: 'files(id, name, mimeType, size)',
    pageSize: 200,
  })
  return result.data.files || []
}

/** Create the full project folder structure: PROY-XXX - Name/ with subfolders */
export async function createProjectFolderStructure(codigo: string, nombre: string) {
  const parentFolder = DRIVE_PARENT_FOLDER_ID
  const folderName = `${codigo} - ${nombre}`

  // Check if project folder already exists
  const existing = await findFolderByName(folderName, parentFolder)
  if (existing) {
    console.log(`[Drive] Project folder already exists: ${folderName}`)
    // Ensure subfolders exist
    const subfolders = ['Solicitudes de Compra', 'Documentos', 'Fotos']
    const folderIds: Record<string, string> = { root: existing.id }
    for (const sub of subfolders) {
      if (sub === 'Fotos') {
        const fotosFolder = await findOrCreateFolder('Fotos', existing.id)
        folderIds.fotos = fotosFolder.id
        const antesFolder = await findOrCreateFolder('Antes', fotosFolder.id)
        const despuesFolder = await findOrCreateFolder('Despues', fotosFolder.id)
        folderIds.fotosAntes = antesFolder.id
        folderIds.fotosDespues = despuesFolder.id
      } else {
        const subFolder = await findOrCreateFolder(sub, existing.id)
        folderIds[sub === 'Solicitudes de Compra' ? 'solicitudes' : sub.toLowerCase()] = subFolder.id
      }
    }
    return folderIds
  }

  // Create main project folder
  const projectFolder = await createFolder(folderName, parentFolder)
  const folderIds: Record<string, string> = { root: projectFolder.id }

  // Create subfolders
  const scFolder = await createFolder('Solicitudes de Compra', projectFolder.id)
  folderIds.solicitudes = scFolder.id

  const docsFolder = await createFolder('Documentos', projectFolder.id)
  folderIds.documentos = docsFolder.id

  const fotosFolder = await createFolder('Fotos', projectFolder.id)
  folderIds.fotos = fotosFolder.id

  const antesFolder = await createFolder('Antes', fotosFolder.id)
  folderIds.fotosAntes = antesFolder.id

  const despuesFolder = await createFolder('Despues', fotosFolder.id)
  folderIds.fotosDespues = despuesFolder.id

  return folderIds
}

/** Create OT folder structure inside a project folder */
export async function createOTFolderStructure(otNum: string, titulo: string, parentProjectFolderId?: string) {
  const parentFolder = parentProjectFolderId || DRIVE_PARENT_FOLDER_ID
  const folderName = `OT ${otNum} - ${titulo}`

  // Check if OT folder already exists
  const existing = await findFolderByName(folderName, parentFolder)
  if (existing) {
    console.log(`[Drive] OT folder already exists: ${folderName}`)
    const fotosFolder = await findOrCreateFolder('Fotos', existing.id)
    return { root: existing.id, fotos: fotosFolder.id }
  }

  const otFolder = await createFolder(folderName, parentFolder)
  const fotosFolder = await createFolder('Fotos', otFolder.id)

  return { root: otFolder.id, fotos: fotosFolder.id }
}

/** Find or create a folder */
async function findOrCreateFolder(name: string, parentId: string) {
  const existing = await findFolderByName(name, parentId)
  if (existing) return existing
  return await createFolder(name, parentId)
}

/** Upload a text/JSON file to Google Drive */
export async function uploadFile(
  fileName: string,
  content: string | Buffer,
  mimeType: string,
  parentId: string
) {
  const drive = await getDriveClient()
  const fileMetadata: any = {
    name: fileName,
    parents: [parentId],
  }
  const media: any = {
    body: content,
    mimeType,
  }

  // Check if file with same name exists and update it
  const existing = await drive.files.list({
    q: `name='${fileName.replace(/'/g, "\\'")}' and '${parentId}' in parents and trashed=false`,
    fields: 'files(id, name)',
    pageSize: 1,
  })

  if (existing.data.files?.length > 0) {
    // Update existing file
    await drive.files.update({
      fileId: existing.data.files[0].id,
      media,
    })
    console.log(`[Drive] File updated: ${fileName}`)
    return existing.data.files[0]
  }

  const result = await drive.files.create({
    resource: fileMetadata,
    media,
    fields: 'id,name',
  })
  console.log(`[Drive] File uploaded: ${fileName}`)
  return result.data
}

/** Upload a base64 image to Google Drive */
export async function uploadBase64Image(
  base64Data: string,
  fileName: string,
  parentId: string
) {
  // Handle data URL format (data:image/jpeg;base64,...)
  let base64 = base64Data
  let mimeType = 'image/jpeg'

  if (base64Data.startsWith('data:')) {
    const matches = base64Data.match(/^data:(image\/\w+);base64,/)
    if (matches) {
      mimeType = matches[1]
    }
    base64 = base64Data.replace(/^data:image\/\w+;base64,/, '')
  }

  const buffer = Buffer.from(base64, 'base64')
  return uploadFile(fileName, buffer, mimeType, parentId)
}

/** Get the parent folder ID */
export function getParentFolderId() {
  return DRIVE_PARENT_FOLDER_ID
}

/** Parse a JSON string array (fotosAntes, fotosDespues) safely */
export function parsePhotoArray(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === 'string' && x.length > 0)
    }
    return []
  } catch {
    return []
  }
}
