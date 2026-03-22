import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import fs from 'fs'
import path from 'path'

const BACKUP_DIR = '/home/z/my-project/backups'

// GET - Get single backup details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const backup = await db.backup.findUnique({
      where: { id }
    })

    if (!backup) {
      return NextResponse.json({ error: 'Respaldo no encontrado' }, { status: 404 })
    }

    // Check if file exists
    let archivoExiste = false
    if (backup.ubicacion) {
      archivoExiste = fs.existsSync(backup.ubicacion)
    }

    return NextResponse.json({
      ...backup,
      archivoExiste,
    })
  } catch (error) {
    console.error('Error fetching backup:', error)
    return NextResponse.json({ error: 'Error al obtener respaldo' }, { status: 500 })
  }
}

// DELETE - Delete a backup
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const backup = await db.backup.findUnique({
      where: { id }
    })

    if (!backup) {
      return NextResponse.json({ error: 'Respaldo no encontrado' }, { status: 404 })
    }

    // Delete the backup file if it exists
    if (backup.ubicacion && fs.existsSync(backup.ubicacion)) {
      fs.unlinkSync(backup.ubicacion)
    }

    // Delete the database record
    await db.backup.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Respaldo eliminado correctamente' })
  } catch (error) {
    console.error('Error deleting backup:', error)
    return NextResponse.json({ error: 'Error al eliminar respaldo' }, { status: 500 })
  }
}

// GET download - Download backup file
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { action } = body
    
    if (action === 'download') {
      const backup = await db.backup.findUnique({
        where: { id }
      })

      if (!backup) {
        return NextResponse.json({ error: 'Respaldo no encontrado' }, { status: 404 })
      }

      if (!backup.ubicacion || !fs.existsSync(backup.ubicacion)) {
        return NextResponse.json({ error: 'Archivo de respaldo no encontrado' }, { status: 404 })
      }

      // Read file and return as base64
      const fileBuffer = fs.readFileSync(backup.ubicacion)
      const base64 = fileBuffer.toString('base64')

      return NextResponse.json({
        archivo: backup.archivo,
        base64,
        tamano: backup.tamano,
      })
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  } catch (error) {
    console.error('Error downloading backup:', error)
    return NextResponse.json({ error: 'Error al descargar respaldo' }, { status: 500 })
  }
}
