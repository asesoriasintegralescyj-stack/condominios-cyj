// Google Drive service for Condominios CYJ
// Estructura:
//   Condominios CYJ/
//   ├── Proyectos/
//   │   └── PROY-001 - Nombre/
//   │       ├── PROY-001 - (Portada) Datos del Proyecto.json
//   │       ├── Solicitudes de Compra/
//   │       ├── Documentos/
//   │       ├── Fotos/Antes/ y Fotos/Despues/
//   │       └── Ordenes de Trabajo/
//   │           └── OT-0001/
//   │               ├── OT-0001 - (Portada) Datos OT.json
//   │               ├── Fotos Antes/ y Fotos Despues/
//   ├── Ordenes de Trabajo/  (solo OTs sin proyecto)
//   │   └── OT-0001/ ...
//   └── Solicitudes de Compra (Sin Proyecto)/
//       └── SC-0001/ ...

import { google } from 'googleapis'
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

const DRIVE_SERVICE_ACCT = process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT

// Parent = "Condominios CYJ" folder in Drive
const DRIVE_PARENT_FOLDER_ID = process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID || '1CgBbB4DxKZrPQN5z3VlOg9pM_2X0WdK7jE'

let _driveClient: any = null

// ─── Caché de IDs de carpetas principales ───────────────────────
let _rootFolders: Record<string, string> | null = null

export async function getDriveClient() {
  if (_driveClient) return _driveClient
  const creds = JSON.parse(DRIVE_SERVICE_ACCT!)
  const tmpDir = '/tmp'
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true })
  const keyPath = join(tmpDir, `drive-key-${Date.now()}.json`)
  writeFileSync(keyPath, JSON.stringify(creds), 'utf-8')
  const auth = new google.auth.JWT({ keyFile: keyPath, scopes: ['https://www.googleapis.com/auth/drive'] })
  await auth.authorize()
  _driveClient = google.drive({ version: 'v3', auth })
  console.log('[Drive] Authenticated')
  return _driveClient
}

export function getParentFolderId() { return DRIVE_PARENT_FOLDER_ID }

// ─── Obtener o crear las 3 carpetas raíz ───────────────────────
export async function getRootFolders(): Promise<Record<string, string>> {
  if (_rootFolders) return _rootFolders
  _rootFolders = {}
  const root = DRIVE_PARENT_FOLDER_ID
  _rootFolders.proyectos = (await findOrCreate('Proyectos', root)).id
  _rootFolders.ots = (await findOrCreate('Ordenes de Trabajo', root)).id
  _rootFolders.scSinProyecto = (await findOrCreate('Solicitudes de Compra (Sin Proyecto)', root)).id
  return _rootFolders
}

// ─── Estructura de carpeta de PROYECTO ──────────────────────────
// Retorna: { root, portada, solicitudes, documentos, fotos, fotosAntes, fotosDespues, ots }
export async function createProjectFolderStructure(codigo: string, nombre: string) {
  const rootFolders = await getRootFolders()
  const proyectosParent = rootFolders.proyectos
  const folderName = `${codigo} - ${nombre}`

  // Buscar si ya existe dentro de Proyectos/
  const existing = await findFolderByName(folderName, proyectosParent)
  const projectFolder = existing || await createFolder(folderName, proyectosParent)

  const ids: Record<string, string> = { root: projectFolder.id }
  ids.solicitudes = (await findOrCreate('Solicitudes de Compra', projectFolder.id)).id
  ids.documentos   = (await findOrCreate('Documentos', projectFolder.id)).id
  const fotosFolder = await findOrCreate('Fotos', projectFolder.id)
  ids.fotos = fotosFolder.id
  ids.fotosAntes  = (await findOrCreate('Antes', fotosFolder.id)).id
  ids.fotosDespues = (await findOrCreate('Despues', fotosFolder.id)).id
  ids.ots = (await findOrCreate('Ordenes de Trabajo', projectFolder.id)).id

  return ids
}

// ─── Estructura de carpeta de OT ────────────────────────────────
// parentFolderId: si viene, es dentro de un proyecto. Si no, va a raíz "Ordenes de Trabajo/"
// Retorna: { root, fotos, fotosAntes, fotosDespues }
export async function createOTFolderStructure(otNum: string, parentFolderId: string) {
  // Nombre SIN prefijo "OT " duplicado → solo "OT-0001"
  const folderName = otNum
  const existing = await findFolderByName(folderName, parentFolderId)
  const otFolder = existing || await createFolder(folderName, parentFolderId)

  const ids: Record<string, string> = { root: otFolder.id }
  ids.fotosAntes  = (await findOrCreate('Fotos Antes', otFolder.id)).id
  ids.fotosDespues = (await findOrCreate('Fotos Despues', otFolder.id)).id

  return ids
}

// ─── Estructura de carpeta de SC (sin proyecto) ─────────────────
// Retorna: { root, documentos }
export async function createSCFolderStructure(scCodigo: string, parentFolderId: string) {
  const folderName = scCodigo
  const existing = await findFolderByName(folderName, parentFolderId)
  const scFolder = existing || await createFolder(folderName, parentFolderId)
  const documentos = (await findOrCreate('Documentos', scFolder.id)).id
  return { root: scFolder.id, documentos }
}

// ─── Helpers de carpetas ────────────────────────────────────────
async function findOrCreate(name: string, parentId: string) {
  const existing = await findFolderByName(name, parentId)
  if (existing) return existing
  return await createFolder(name, parentId)
}

export async function findFolderByName(name: string, parentId: string) {
  const drive = await getDriveClient()
 const q = `name='${name.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
 const res = await drive.files.list({ q, fields: 'files(id, name)', pageSize: 1 })
 return res.data.files?.[0] || null
}

export async function createFolder(name: string, parentId?: string) {
  const drive = await getDriveClient()
 const meta: any = { name, mimeType: 'application/vnd.google-apps.folder' }
 if (parentId) meta.parents = [parentId]
 const res = await drive.files.create({ resource: meta, fields: 'id,name' })
 console.log(`[Drive] Folder created: ${name} (${res.data.id})`)
 return res.data
}

export async function listFolders(parentId: string) {
  const drive = await getDriveClient()
 const q = `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
 const res = await drive.files.list({ q, fields: 'files(id, name)', pageSize: 200 })
 return res.data.files || []
}

export async function listFiles(parentId: string) {
  const drive = await getDriveClient()
 const q = `'${parentId}' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false`
 const res = await drive.files.list({ q, fields: 'files(id, name, mimeType, size)', pageSize: 200 })
 return res.data.files || []
}

// ─── Upload de archivos ──────────────────────────────────────────
export async function uploadFile(fileName: string, content: string | Buffer, mimeType: string, parentId: string) {
  const drive = await getDriveClient()
 const safeName = fileName.replace(/'/g, "\\'")
  // Check if file already exists → update instead of duplicate
  const existing = await drive.files.list({
    q: `name='${safeName}' and '${parentId}' in parents and trashed=false`,
    fields: 'files(id)', pageSize: 1,
  })
 if (existing.data.files?.length > 0) {
    await drive.files.update({ fileId: existing.data.files[0].id, media: { body: content, mimeType } })
    console.log(`[Drive] Updated: ${fileName}`)
    return existing.data.files[0]
  }
  const res = await drive.files.create({
    resource: { name: fileName, parents: [parentId] },
    media: { body: content, mimeType }, fields: 'id,name',
  })
  console.log(`[Drive] Uploaded: ${fileName}`)
  return res.data
}

export async function uploadBase64Image(base64Data: string, fileName: string, parentId: string) {
  let b64 = base64Data, mime = 'image/jpeg'
 if (b64.startsWith('data:')) {
    const m = b64.match(/^data:(image\/\w+);base64,/)
    if (m) mime = m[1]
    b64 = b64.replace(/^data:image\/\w+;base64,/, '')
  }
  return uploadFile(fileName, Buffer.from(b64, 'base64'), mime, parentId)
}

export function parsePhotoArray(raw: string | null | undefined): string[] {
  if (!raw) return []
  try { const p = JSON.parse(raw); return Array.isArray(p) ? p.filter((x: any) => typeof x === 'string' && x.length > 0) : [] }
  catch { return [] }
}

export async function verifyDriveConfig() {
  try {
    const drive = await getDriveClient()
    await drive.files.get({ fileId: DRIVE_PARENT_FOLDER_ID, fields: 'id,name' })
    return { ok: true, parentFolderId: DRIVE_PARENT_FOLDER_ID }
  } catch (e: any) { return { ok: false, error: e.message } }
}
