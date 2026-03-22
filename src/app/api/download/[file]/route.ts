import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ file: string }> }
) {
  try {
    const { file } = await params
    
    // Solo permitir archivos específicos
    const allowedFiles = ['static-landing.zip', 'proyecto-completo.zip']
    
    if (!allowedFiles.includes(file)) {
      return NextResponse.json({ error: 'Archivo no permitido' }, { status: 403 })
    }
    
    const filePath = path.join(process.cwd(), 'download', file)
    const fileBuffer = await readFile(filePath)
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${file}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error downloading file:', error)
    return NextResponse.json({ error: 'Error al descargar archivo' }, { status: 500 })
  }
}
