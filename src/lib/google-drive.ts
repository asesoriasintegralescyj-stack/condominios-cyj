/**
 * Google Drive Service
 * 
 * Usa una Service Account de Google para crear carpetas y subir archivos
 * de forma automática al crear proyectos/OTs en el sistema.
 * 
 * SETUP:
 * 1. Ir a https://console.cloud.google.com
 * 2. Crear proyecto (o usar existente)
 * 3. Habilitar "Google Drive API"
 * 4. Ir a IAM & Admin > Service Accounts > Crear Service Account
 * 5. Descargar clave JSON → guardar contenido en env var GOOGLE_DRIVE_SERVICE_ACCOUNT
 * 6. En Google Drive, crear carpeta raíz y compartir con el email del Service Account (editor)
 * 7. Guardar ID de esa carpeta en env var GOOGLE_DRIVE_PARENT_FOLDER_ID
 */

import { google } from 'googleapis'

// Interfaces
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

export interface DriveConfig {
  parentFolderId: string
  serviceAccountEmail: string
}

// Cache del cliente autenticado
let cachedAuth: any = null
let cachedDrive: any = null

/**
 * Obtiene el cliente autenticado de Google Drive
 */
function getDriveClient() {
  if (cachedDrive) return cachedDrive

  const credentials = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT
  if (!credentials) {
    throw new Error('GOOGLE_DRIVE_SERVICE_ACCOUNT no configurada')
  }

  let parsed: any
  try {
    parsed = JSON.parse(credentials)
  } catch {
    throw new Error('GOOGLE_DRIVE_SERVICE_ACCOUNT no es un JSON válido')
  }

  // Usar fromJSON con el JSON completo, luego asignar scopes
  const auth = google.auth.fromJSON(parsed) as any
  auth.scopes = ['https://www.googleapis.com/auth/drive']

  cachedAuth = auth
  cachedDrive = google.drive({ version: 'v3', auth })
  return cachedDrive
}

/**
 * Verifica que la configuración de Drive es válida
 */
export async function verifyDriveConfig(): Promise<{
  ok: boolean
  parentFolderId?: string
  parentFolderName?: string
  serviceAccountEmail?: string
  error?: string
}> {
  try {
    const credentials = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT
    const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID

    if (!credentials) return { ok: false, error: 'GOOGLE_DRIVE_SERVICE_ACCOUNT no configurada' }
    if (!parentFolderId) return { ok: false, error: 'GOOGLE_DRIVE_PARENT_FOLDER_ID no configurada' }

    let parsed: any
    try {
      parsed = JSON.parse(credentials)
    } catch {
      return { ok: false, error: 'GOOGLE_DRIVE_SERVICE_ACCOUNT no es JSON válido' }
    }

    const drive = getDriveClient()

    // Verificar acceso a la carpeta padre
    const folder = await drive.files.get({
      fileId: parentFolderId,
      fields: 'id, name',
    })

    return {
      ok: true,
      parentFolderId: folder.data.id,
      parentFolderName: folder.data.name,
      serviceAccountEmail: parsed.client_email,
    }
  } catch (error: any) {
    return {
      ok: false,
      error: error?.response?.data?.error?.message || error.message || 'Error desconocido',
    }
  }
}

/**
 * Crea una carpeta en Google Drive
 */
export async function createFolder(
  name: string,
  parentId: string,
): Promise<DriveFolder> {
  const drive = getDriveClient()

  const file = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id, name, webViewLink',
  })

  return {
    id: file.data.id,
    name: file.data.name,
    webViewLink: file.data.webViewLink,
    url: `https://drive.google.com/drive/folders/${file.data.id}`,
  }
}

/**
 * Crea la estructura completa de carpetas para un Proyecto
 * 
 * Estructura:
 * PROY-001 - Nombre del Proyecto/
 * ├── Solicitudes de Compra/
 * ├── Documentos/
 * ├── Fotos/
 * │   ├── Antes/
 * │   └── Despues/
 * └── OT-XXXX - Nombre OT/  (se crea al agregar cada OT)
 *     ├── Fotos Antes/
 *     ├── Fotos Despues/
 *     ├── Documentos/
 *     └── Solicitudes de Compra/
 */
export async function createProjectFolderStructure(
  proyectoCodigo: string,
  proyectoNombre: string,
): Promise<{
    proyectoFolder: DriveFolder
    solicitudesFolder: DriveFolder
    documentosFolder: DriveFolder
    fotosAntesFolder: DriveFolder
    fotosDespuesFolder: DriveFolder
  }> {
  const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID!
  const folderName = `${proyectoCodigo} - ${proyectoNombre}`

  // 1. Carpeta del proyecto
  const proyectoFolder = await createFolder(folderName, parentFolderId)

  // 2. Subcarpetas del proyecto
  const [solicitudesFolder, documentosFolder, fotosFolder] = await Promise.all([
    createFolder('Solicitudes de Compra', proyectoFolder.id),
    createFolder('Documentos', proyectoFolder.id),
    createFolder('Fotos', proyectoFolder.id),
  ])

  // 3. Subcarpetas de fotos
  const [fotosAntesFolder, fotosDespuesFolder] = await Promise.all([
    createFolder('Antes', fotosFolder.id),
    createFolder('Despues', fotosFolder.id),
  ])

  return {
    proyectoFolder,
    solicitudesFolder,
    documentosFolder,
    fotosAntesFolder,
    fotosDespuesFolder,
  }
}

/**
 * Crea la estructura de carpetas para una OT dentro de un proyecto
 * 
 * Estructura dentro de la carpeta del proyecto:
 * OT-0001 - Nombre OT/
 * ├── Fotos Antes/
 * ├── Fotos Despues/
 * ├── Documentos/
 * └── Solicitudes de Compra/
 */
export async function createOTFolderStructure(
  otCodigo: string,
  otNombre: string,
  proyectoDriveFolderId: string,
): Promise<{
    otFolder: DriveFolder
    fotosAntesFolder: DriveFolder
    fotosDespuesFolder: DriveFolder
    documentosFolder: DriveFolder
    solicitudesFolder: DriveFolder
  }> {
  const folderName = `${otCodigo} - ${otNombre}`

  // 1. Carpeta de la OT
  const otFolder = await createFolder(folderName, proyectoDriveFolderId)

  // 2. Subcarpetas
  const [fotosAntesFolder, fotosDespuesFolder, documentosFolder, solicitudesFolder] =
    await Promise.all([
      createFolder('Fotos Antes', otFolder.id),
      createFolder('Fotos Despues', otFolder.id),
      createFolder('Documentos', otFolder.id),
      createFolder('Solicitudes de Compra', otFolder.id),
    ])

  return {
    otFolder,
    fotosAntesFolder,
    fotosDespuesFolder,
    documentosFolder,
    solicitudesFolder,
  }
}

/**
 * Sube un archivo a una carpeta específica de Google Drive
 * 
 * @param buffer - Contenido del archivo
 * @param fileName - Nombre del archivo (ej: "SC-0001.pdf")
 * @param parentFolderId - ID de la carpeta en Drive
 * @param mimeType - Tipo MIME del archivo
 */
export async function uploadFile(
  buffer: Buffer | Uint8Array,
  fileName: string,
  parentFolderId: string,
  mimeType: string = 'application/pdf',
): Promise<DriveFile> {
  const drive = getDriveClient()

  const file = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType,
      parents: [parentFolderId],
    },
    media: {
      mimeType,
      body: Buffer.from(buffer),
    },
    fields: 'id, name, webViewLink, size, mimeType',
  })

  return {
    id: file.data.id,
    name: file.data.name,
    webViewLink: file.data.webViewLink,
    size: Number(file.data.size || 0),
    mimeType: file.data.mimeType,
  }
}

/**
 * Sube una imagen (desde base64 data URL) a una carpeta de Drive
 */
export async function uploadBase64Image(
  base64DataUrl: string,
  fileName: string,
  parentFolderId: string,
): Promise<DriveFile> {
  // Extraer el contenido base64 y el mime type
  const matches = base64DataUrl.match(/^data:(.+?);base64,(.+)$/)
  if (!matches) {
    throw new Error('Formato de data URL inválido')
  }

  const mimeType = matches[1]
  const base64 = matches[2]
  const buffer = Buffer.from(base64, 'base64')

  return uploadFile(buffer, fileName, parentFolderId, mimeType)
}

/**
 * Sube un PDF de solicitud de compra a la carpeta correspondiente
 */
export async function uploadSolicitudCompraPDF(
  pdfBuffer: Buffer,
  scCodigo: string,
  scTitulo: string,
  targetFolderId: string,
): Promise<DriveFile> {
  const fileName = `${scCodigo} - ${scTitulo}.pdf`
  // Limpiar caracteres no permitidos en nombres de archivo
  const safeName = fileName.replace(/[/\\?%*:|"<>]/g, '-')
  return uploadFile(pdfBuffer, safeName, targetFolderId, 'application/pdf')
}

/**
 * Lista archivos en una carpeta de Drive
 */
export async function listFiles(
  folderId: string,
  pageSize: number = 50,
): Promise<DriveFile[]> {
  const drive = getDriveClient()

  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name, webViewLink, size, mimeType), nextPageToken',
    pageSize,
    orderBy: 'createdTime desc',
  })

  return (response.data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    webViewLink: f.webViewLink,
    size: Number(f.size || 0),
    mimeType: f.mimeType,
  }))
}

/**
 * Lista subcarpetas en una carpeta de Drive
 */
export async function listFolders(
  folderId: string,
): Promise<DriveFolder[]> {
  const drive = getDriveClient()

  const response = await drive.files.list({
    q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name, webViewLink)',
    pageSize: 100,
    orderBy: 'name',
  })

  return (response.data.files || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    webViewLink: f.webViewLink,
    url: `https://drive.google.com/drive/folders/${f.id}`,
  }))
}

/**
 * Busca una carpeta por nombre dentro de un padre
 */
export async function findFolderByName(
  name: string,
  parentId: string,
): Promise<DriveFolder | null> {
  const drive = getDriveClient()
  // Escapar comillas simples en el nombre
  const escapedName = name.replace(/'/g, "\\'")

  const response = await drive.files.list({
    q: `name='${escapedName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name, webViewLink)',
    pageSize: 1,
  })

  if (response.data.files && response.data.files.length > 0) {
    const f = response.data.files[0]
    return {
      id: f.id,
      name: f.name,
      webViewLink: f.webViewLink,
      url: `https://drive.google.com/drive/folders/${f.id}`,
    }
  }
  return null
}

/**
 * Elimina un archivo o carpeta (lo mueve a papelera)
 */
export async function trashItem(fileId: string): Promise<void> {
  const drive = getDriveClient()
  await drive.files.update({
    fileId,
    requestBody: { trashed: true },
  })
}

/**
 * Genera un link de descarga público temporal (1 hora)
 */
export async function getDownloadLink(fileId: string): Promise<string> {
  const drive = getDriveClient()
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  })
  return `https://drive.google.com/uc?export=download&id=${fileId}`
}