import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'public', 'PROYECTO_COMPLETO_VERCEL.zip')
    const fileBuffer = await readFile(filePath)

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="PROYECTO_COMPLETO_VERCEL.zip"',
        'Content-Length': fileBuffer.length.toString()
      }
    })
  } catch (error) {
    console.error('Error serving file:', error)
    return NextResponse.json({ error: 'Archivo no encontrado' }, { status: 404 })
  }
}
