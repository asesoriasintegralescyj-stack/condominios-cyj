import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import fs from 'fs'
import path from 'path'

const BACKUP_DIR = '/home/z/my-project/backups'

// POST - Restore database from backup
export async function POST(
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

    if (backup.estado !== 'Completado') {
      return NextResponse.json({ error: 'Solo se pueden restaurar respaldos completados' }, { status: 400 })
    }

    if (!backup.ubicacion || !fs.existsSync(backup.ubicacion)) {
      return NextResponse.json({ error: 'Archivo de respaldo no encontrado' }, { status: 404 })
    }

    // Get current database path
    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')
    
    // Create a backup of current database before restore
    const preRestoreBackupPath = path.join(BACKUP_DIR, `pre-restore-${Date.now()}.db`)
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, preRestoreBackupPath)
    }

    try {
      // Copy backup file to database location
      fs.copyFileSync(backup.ubicacion, dbPath)

      // Update backup record to mark as used for restore
      await db.backup.update({
        where: { id },
        data: {
          verificado: true,
          fechaVerificacion: new Date(),
        }
      })

      return NextResponse.json({ 
        message: 'Base de datos restaurada correctamente',
        preRestoreBackup: preRestoreBackupPath,
      })
    } catch (restoreError) {
      // If restore failed, try to recover from pre-restore backup
      if (fs.existsSync(preRestoreBackupPath)) {
        fs.copyFileSync(preRestoreBackupPath, dbPath)
      }
      
      throw restoreError
    }

  } catch (error) {
    console.error('Error restoring backup:', error)
    return NextResponse.json({ 
      error: 'Error al restaurar respaldo',
      message: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// GET - Check restore eligibility
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

    const archivoExiste = backup.ubicacion ? fs.existsSync(backup.ubicacion) : false
    const puedeRestaurar = backup.estado === 'Completado' && archivoExiste

    return NextResponse.json({
      id: backup.id,
      archivo: backup.archivo,
      fecha: backup.createdAt,
      tamano: backup.tamano,
      totalTablas: backup.totalTablas,
      totalRegistros: backup.totalRegistros,
      puedeRestaurar,
      archivoExiste,
    })
  } catch (error) {
    console.error('Error checking backup:', error)
    return NextResponse.json({ error: 'Error al verificar respaldo' }, { status: 500 })
  }
}
