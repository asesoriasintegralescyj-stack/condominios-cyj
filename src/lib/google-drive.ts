/**
 * Google Drive Service
 * 
 * Usa una Service Account de Google para crear carpetas y subir archivos
 * de forma automática al crear proyectos/OTs en el sistema.
 */

export interface DriveFolder {
  id: string
  name: string
  webViewLink: string
  url: string
}

export interface DriveFile {
  id: string
  name: string
  webViewLink: string
  size: number
  mimeType: string
}

// Cache del cliente autenticado
let cachedDrive: any = null

/**
 * Obtiene el cliente autenticado de Google Drive.
 * Escribe un archivo temporal con la clave y lo pasa como keyFile
 * (necesario para Vercel serverless donde la private_key como string falla).
 */
async function getDriveClient() {
  if (cachedDrive) return cachedDrive

  const credentials = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT
  if (!credentials) throw new Error('GOOGLE_DRIVE_SERVICE_ACCOUNT no configurada')

  let parsed: any
  try { parsed = JSON.parse(credentials) } catch { throw new Error('GOOGLE_DRIVE_SERVICE_ACCOUNT no es un JSON válido') }

  // Escribir la clave a un archivo temporal
  const fs = await import('fs')
  const os = await import('os')
  const path = await import('path')
  const tmpFile = path.join(os.tmpdir(), `gdrive-sa-${Date.now()}.json`)
  fs.writeFileSync(tmpFile, JSON.stringify(parsed))

  try {
    const { google } = await import('googleapis')
    const auth = new google.auth.JWT({
      keyFile: tmpFile,
      scopes: ['https://www.googleapis.com/auth/drive'],
    })
    cachedDrive = google.drive({ version: 'v3', auth })
    return cachedDrive
  } catch (error) {
    try { fs.unlinkSync(tmpFile) } catch {}
    throw error
  }
}

/** Verifica que la configuración de Drive es válida */
export async function verifyDriveConfig(): Promise<{ ok: boolean; parentFolderId?: string; parentFolderName?: string; serviceAccountEmail?: string; error?: string }> {
  try {
    const credentials = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT
    const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID
    if (!credentials) return { ok: false, error: 'GOOGLE_DRIVE_SERVICE_ACCOUNT no configurada' }
    if (!parentFolderId) return { ok: false, error: 'GOOGLE_DRIVE_PARENT_FOLDER_ID no configurada' }
    let parsed: any
    try { parsed = JSON.parse(credentials) } catch { return { ok: false, error: 'GOOGLE_DRIVE_SERVICE_ACCOUNT no es JSON válido' } }

    const drive = await getDriveClient()
    const folder = await drive.files.get({ fileId: parentFolderId, fields: 'id, name' })
    return { ok: true, parentFolderId: folder.data.id, parentFolderName: folder.data.name, serviceAccountEmail: parsed.client_email }
  } catch (error: any) {
    return { ok: false, error: error?.response?.data?.error?.message || error.message || 'Error desconocido' }
  }
}

/** Crea una carpeta en Google Drive */
export async function createFolder(name: string, parentId: string): Promise<DriveFolder> {
  const drive = await getDriveClient()
  const file = await drive.files.create({
    requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
    fields: 'id, name, webViewLink',
  })
  return { id: file.data.id, name: file.data.name, webViewLink: file.data.webViewLink, url: `https://drive.google.com/drive/folders/${file.data.id}` }
}

/** Crea la estructura completa de carpetas para un Proyecto */
export async function createProjectFolderStructure(proyectoCodigo: string, proyectoNombre: string): Promise<{
  proyectoFolder: DriveFolder; solicitudesFolder: DriveFolder; documentosFolder: DriveFolder; fotosAntesFolder: DriveFolder; fotosDespuesFolder: DriveFolder
}> {
  const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID!
  const folderName = `${proyectoCodigo} - ${proyectoNombre}`
  const proyectoFolder = await createFolder(folderName, parentFolderId)
  const [solicitudesFolder, documentosFolder, fotosFolder] = await Promise.all([
    createFolder('Solicitudes de Compra', proyectoFolder.id),
    createFolder('Documentos', proyectoFolder.id),
    createFolder('Fotos', proyectoFolder.id),
  ])
  const [fotosAntesFolder, fotosDespuesFolder] = await Promise.all([
    createFolder('Antes', fotosFolder.id),
    createFolder('Despues', fotosFolder.id),
  ])
  return { proyectoFolder, solicitudesFolder, documentosFolder, fotosAntesFolder, fotosDespuesFolder }
}

/** Crea la estructura de carpetas para una OT dentro de un proyecto */
export async function createOTFolderStructure(otCodigo: string, otNombre: string, proyectoDriveFolderId: string): Promise<{
  otFolder: DriveFolder; fotosAntesFolder: DriveFolder; fotosDespuesFolder: DriveFolder; documentosFolder: DriveFolder; solicitudesFolder: DriveFolder
}> {
  const folderName = `${otCodigo} - ${otNombre}`
  const otFolder = await createFolder(folderName, proyectoDriveFolderId)
  const [fotosAntesFolder, fotosDespuesFolder, documentosFolder, solicitudesFolder] = await Promise.all([
    createFolder('Fotos Antes', otFolder.id),
    createFolder('Fotos Despues', otFolder.id),
    createFolder('Documentos', otFolder.id),
    createFolder('Solicitudes de Compra', otFolder.id),
  ])
  return { otFolder, fotosAntesFolder, fotosDespuesFolder, documentosFolder, solicitudesFolder }
}

/** Sube un archivo a una carpeta específica de Google Drive */
export async function uploadFile(buffer: Buffer | Uint8Array, fileName: string, parentFolderId: string, mimeType: string = 'application/pdf'): Promise<DriveFile> {
  const drive = await getDriveClient()
  const file = await drive.files.create({
    requestBody: { name: fileName, mimeType, parents: [parentFolderId] },
    media: { mimeType, body: Buffer.from(buffer) },
    fields: 'id, name, webViewLink, size, mimeType',
  })
  return { id: file.data.id, name: file.data.name, webViewLink: file.data.webViewLink, size: Number(file.data.size || 0), mimeType: file.data.mimeType }
}

/** Sube una imagen (desde base64 data URL) a una carpeta de Drive */
export async function uploadBase64Image(base64DataUrl: string, fileName: string, parentFolderId: string): Promise<DriveFile> {
  const matches = base64DataUrl.match(/^data:(.+?);base64,(.+)$/)
  if (!matches) throw new Error('Formato de data URL inválido')
  const mimeType = matches[1]
  const base64 = matches[2]
  const buffer = Buffer.from(base64, 'base64')
  return uploadFile(buffer, fileName, parentFolderId, mimeType)
}

/** Lista archivos en una carpeta de Drive */
export async function listFiles(folderId: string, pageSize: number = 50): Promise<DriveFile[]> {
  const drive = await getDriveClient()
  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, webViewLink, size, mimeType), nextPageToken',
    pageSize, orderBy: 'createdTime desc',
  })
  return (response.data.files || []).map((f: any) => ({ id: f.id, name: f.name, webViewLink: f.webViewLink, size: Number(f.size || 0), mimeType: f.mimeType }))
}

/** Lista subcarpetas en una carpeta de Drive */
export async function listFolders(folderId: string): Promise<DriveFolder[]> {
  const drive = await getDriveClient()
  const response = await drive.files.list({
    q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name, webViewLink)',
    pageSize: 100, orderBy: 'name',
  })
  return (response.data.files || []).map((f: any) => ({ id: f.id, name: f.name, webViewLink: f.webViewLink, url: `https://drive.google.com/drive/folders/${f.id}` }))
}

/** Busca una carpeta por nombre dentro de un padre */
export async function findFolderByName(name: string, parentId: string): Promise<DriveFolder | null> {
  const drive = await getDriveClient()
  const escapedName = name.replace(/'/g, "\\'")
  const response = await drive.files.list({
    q: `name='${escapedName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name, webViewLink)',
    pageSize: 1,
  })
  if (response.data.files && response.data.files.length > 0) {
    const f = response.data.files[0]
    return { id: f.id, name: f.name, webViewLink: f.webViewLink, url: `https://drive.google.com/drive/folders/${f.id}` }
  }
  return null
}
