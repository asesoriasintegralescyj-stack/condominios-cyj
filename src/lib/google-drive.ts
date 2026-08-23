import { google } from 'googleapis'
import fs from 'fs'
import os from 'os'
import path from 'path'

// ─── Config ───────────────────────────────────────────────────────────────────

function getConfig() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const key = process.env.GOOGLE_PRIVATE_KEY
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID
  if (!email || !key || !folderId) return null
  return { email, key, folderId }
}

// ─── Auth (keyFile temp file — string private_key fails on Vercel) ────────────

let cachedAuth: any = null

async function getAuth() {
  if (cachedAuth) return cachedAuth
  const cfg = getConfig()
  if (!cfg) throw new Error('Google Drive: faltan variables de entorno (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_DRIVE_FOLDER_ID)')

  // Escribir key a archivo temporal — requerido por google.auth.JWT en Vercel
  const tmpDir = os.tmpdir()
  const keyFilePath = path.join(tmpDir, `gdrive-key-${Date.now()}.pem`)
  fs.writeFileSync(keyFilePath, cfg.key, 'utf8')

  const auth = new google.auth.JWT({
    email: cfg.email,
    keyFile: keyFilePath,
    scopes: ['https://www.googleapis.com/auth/drive'],
  })

  cachedAuth = auth
  return auth
}

// ─── Drive Client ────────────────────────────────────────────────────────────

export async function getDriveClient() {
  const auth = await getAuth()
  return google.drive({ version: 'v3', auth })
}

export function verifyDriveConfig(): boolean {
  return getConfig() !== null
}

export function getParentFolderId(): string {
  const cfg = getConfig()
  if (!cfg) throw new Error('Google Drive no configurado')
  return cfg.folderId
}

// ─── Folder Operations ───────────────────────────────────────────────────────

export async function createFolder(name: string, parentId: string): Promise<string | null> {
  try {
    const drive = await getDriveClient()
    const file = await drive.files.create({
      requestBody: {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      },
      fields: 'id',
    })
    return file.data.id || null
  } catch (e) {
    console.error(`[Drive] Error creando carpeta "${name}":`, e)
    return null
  }
}

export async function findFolderByName(name: string, parentId: string): Promise<string | null> {
  try {
    const drive = await getDriveClient()
    const res = await drive.files.list({
      q: `name = '${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      pageSize: 1,
    })
    return res.data.files?.[0]?.id || null
  } catch (e) {
    console.error(`[Drive] Error buscando carpeta "${name}":`, e)
    return null
  }
}

export async function findOrCreateFolder(name: string, parentId: string): Promise<string | null> {
  const existing = await findFolderByName(name, parentId)
  if (existing) return existing
  return createFolder(name, parentId)
}

export async function createProjectFolderStructure(proyectoCodigo: string, proyectoNombre: string): Promise<Record<string, string | null> | null> {
  const parent = getParentFolderId()
  const folderName = `${proyectoCodigo} - ${proyectoNombre}`.substring(0, 200)

  // Carpeta principal del proyecto
  const proyectoFolderId = await findOrCreateFolder(folderName, parent)
  if (!proyectoFolderId) return null

  // Subcarpetas
  const scFolderId = await findOrCreateFolder('Solicitudes de Compra', proyectoFolderId)
  const docsFolderId = await findOrCreateFolder('Documentos', proyectoFolderId)
  const fotosFolderId = await findOrCreateFolder('Fotos', proyectoFolderId)
  const antesFolderId = fotosFolderId ? await findOrCreateFolder('Antes', fotosFolderId) : null
  const despuesFolderId = fotosFolderId ? await findOrCreateFolder('Despues', fotosFolderId) : null
  const otFolderId = await findOrCreateFolder('Ordenes de Trabajo', proyectoFolderId)

  return {
    proyecto: proyectoFolderId,
    solicitudes: scFolderId,
    documentos: docsFolderId,
    fotos: fotosFolderId,
    fotosAntes: antesFolderId,
    fotosDespues: despuesFolderId,
    ordenesTrabajo: otFolderId,
  }
}

export async function createOTFolderStructure(otNum: string, projectFolderId: string | null): Promise<Record<string, string | null> | null> {
  const parent = projectFolderId ? projectFolderId : getParentFolderId()
  const folderName = `${otNum}`

  const otFolderId = await findOrCreateFolder(folderName, parent)
  if (!otFolderId) return null

  const antesFolderId = await findOrCreateFolder('Fotos Antes', otFolderId)
  const despuesFolderId = await findOrCreateFolder('Fotos Despues', otFolderId)

  return {
    ot: otFolderId,
    fotosAntes: antesFolderId,
    fotosDespues: despuesFolderId,
  }
}

// ─── File Operations ─────────────────────────────────────────────────────────

export async function uploadFile(
  fileName: string,
  content: string | Buffer,
  mimeType: string,
  parentId: string,
  overwriteName?: string
): Promise<boolean> {
  try {
    const drive = await getDriveClient()

    // Si se especifica overwriteName, buscar y actualizar archivo existente
    if (overwriteName) {
      try {
        const existing = await drive.files.list({
          q: `name = '${overwriteName.replace(/'/g, "\\'")}' and '${parentId}' in parents and trashed = false`,
          fields: 'files(id)',
          pageSize: 1,
        })
        if (existing.data.files?.[0]?.id) {
          // Actualizar contenido del archivo existente
          await drive.files.update({
            fileId: existing.data.files[0].id,
            media: { body: content as any },
          })
          console.log(`[Drive] Actualizado: ${overwriteName}`)
          return true
        }
      } catch (e) {
        console.error(`[Drive] Error buscando archivo para sobrescribir:`, e)
      }
    }

    const fileMetadata: any = {
      name: fileName,
      parents: [parentId],
    }

    // Para texto, usar mimeType directamente
    if (mimeType === 'text/plain' || mimeType === 'application/json') {
      fileMetadata.mimeType = mimeType
    }

    await drive.files.create({
      requestBody: fileMetadata,
      media: { body: content as any, mimeType },
      fields: 'id',
    })
    console.log(`[Drive] Subido: ${fileName} → ${parentId}`)
    return true
  } catch (e) {
    console.error(`[Drive] Error subiendo "${fileName}":`, e)
    return false
  }
}

export async function uploadBase64Image(
  base64Data: string,
  fileName: string,
  parentId: string
): Promise<boolean> {
  try {
    // Extraer datos base64 y mimeType
    const matches = base64Data.match(/^data:(image\/\w+);base64,(.+)$/)
    if (!matches) {
      console.warn(`[Drive] Formato base64 no valido para ${fileName}`)
      return false
    }
    const mimeType = matches[1]
    const buffer = Buffer.from(matches[2], 'base64')

    // Determinar extensión
    const ext = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1]
    const fullFileName = fileName.endsWith(`.${ext}`) ? fileName : `${fileName}.${ext}`

    // Verificar si ya existe (por nombre sin extensión)
    const baseName = fileName.replace(/\.[^.]+$/, '')
    try {
      const drive = await getDriveClient()
      const existing = await drive.files.list({
        q: `name contains '${baseName.replace(/'/g, "\\'")}' and '${parentId}' in parents and trashed = false`,
        fields: 'files(id, name)',
      })
      if (existing.data.files?.length) {
        // Actualizar la primera coincidencia
        await drive.files.update({
          fileId: existing.data.files[0].id,
          media: { body: buffer as any },
        })
        console.log(`[Drive] Imagen actualizada: ${fullFileName}`)
        return true
      }
    } catch (e) {
      console.error(`[Drive] Error verificando imagen existente:`, e)
    }

    const drive = await getDriveClient()
    await drive.files.create({
      requestBody: {
        name: fullFileName,
        parents: [parentId],
      },
      media: { body: buffer as any, mimeType },
      fields: 'id',
    })
    console.log(`[Drive] Imagen subida: ${fullFileName}`)
    return true
  } catch (e) {
    console.error(`[Drive] Error subiendo imagen "${fileName}":`, e)
    return false
  }
}

export async function listFiles(folderId: string): Promise<any[]> {
  try {
    const drive = await getDriveClient()
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, size, modifiedTime)',
      pageSize: 100,
    })
    return res.data.files || []
  } catch (e) {
    console.error(`[Drive] Error listando archivos:`, e)
    return []
  }
}

export async function listFolders(parentId: string): Promise<any[]> {
  try {
    const drive = await getDriveClient()
    const res = await drive.files.list({
      q: `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: 'files(id, name)',
      pageSize: 200,
    })
    return res.data.files || []
  } catch (e) {
    console.error(`[Drive] Error listando carpetas:`, e)
    return []
  }
}

// ─── Helpers para parsear fotos desde JSON strings ───────────────────────────

export function parseFotos(fotosJson: string | null | undefined): string[] {
  if (!fotosJson) return []
  try {
    const parsed = JSON.parse(fotosJson)
    if (Array.isArray(parsed)) return parsed.filter((x: any) => typeof x === 'string' && x.startsWith('data:image'))
    return []
  } catch {
    return []
  }
}

// ─── Funciones de backup específicas ─────────────────────────────────────────

/**
 * Busca la carpeta de un proyecto en Drive por su código.
 * Retorna el folderId o null.
 */
export async function findProjectFolder(proyectoCodigo: string): Promise<string | null> {
  const parent = getParentFolderId()
  const folders = await listFolders(parent)
  const match = folders.find(f => f.name.startsWith(`${proyectoCodigo} -`) || f.name.startsWith(`${proyectoCodigo} `))
  return match?.id || null
}

/**
 * Busca la subcarpeta "Solicitudes de Compra" dentro de un folder de proyecto.
 */
export async function findSCFolderInProject(projectFolderId: string): Promise<string | null> {
  const folders = await listFolders(projectFolderId)
  const match = folders.find(f => f.name === 'Solicitudes de Compra')
  return match?.id || null
}

/**
 * Busca la subcarpeta "Ordenes de Trabajo" dentro de un folder de proyecto.
 */
export async function findOTFolderInProject(projectFolderId: string): Promise<string | null> {
  const folders = await listFolders(projectFolderId)
  const match = folders.find(f => f.name === 'Ordenes de Trabajo')
  return match?.id || null
}
