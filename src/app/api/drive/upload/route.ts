import { NextRequest, NextResponse } from 'next/server'
import { getCurrentSession } from '@/lib/auth'
import {
  uploadFile,
  uploadBase64Image,
  uploadSolicitudCompraPDF,
} from '@/lib/google-drive'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// POST - Subir archivo a una carpeta de Drive
// Body: { folderId: string, fileName: string, fileData: string (base64), mimeType?: string }
// o: { folderId: string, fileName: string, fileData: string, tipo: 'base64-image' | 'base64-pdf' | 'base64-generic' }
export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  try {
    const body = await request.json()
    const { folderId, fileName, fileData, tipo = 'base64-generic' } = body

    if (!folderId || !fileName || !fileData) {
      return NextResponse.json(
        { error: 'folderId, fileName y fileData son requeridos' },
        { status: 400 },
      )
    }

    let result

    if (tipo === 'base64-image') {
      // Subir imagen desde data URL (data:image/jpeg;base64,...)
      result = await uploadBase64Image(fileData, fileName, folderId)
    } else if (tipo === 'base64-pdf') {
      // Subir PDF desde base64
      const buffer = Buffer.from(fileData, 'base64')
      result = await uploadFile(buffer, fileName, folderId, 'application/pdf')
    } else {
      // Detectar si es data URL
      if (fileData.startsWith('data:')) {
        result = await uploadBase64Image(fileData, fileName, folderId)
      } else {
        // Asumir base64 puro
        const buffer = Buffer.from(fileData, 'base64')
        result = await uploadFile(
          buffer,
          fileName,
          folderId,
          body.mimeType || 'application/octet-stream',
        )
      }
    }

    return NextResponse.json({
      ok: true,
      file: result,
      message: `Archivo subido: ${fileName}`,
    })
  } catch (error: any) {
    console.error('Error subiendo a Drive:', error)
    return NextResponse.json({
      ok: false,
      error: error.message || 'Error al subir archivo',
    }, { status: 500 })
  }
}
