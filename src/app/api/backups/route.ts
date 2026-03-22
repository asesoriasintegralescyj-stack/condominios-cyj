import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const BACKUP_DIR = '/home/z/my-project/backups'

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true })
}

// GET - List all backups with stats
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const estado = searchParams.get('estado')
    const tipo = searchParams.get('tipo')

    const where: Prisma.BackupWhereInput = {}
    if (estado && estado !== 'todos') {
      where.estado = estado
    }
    if (tipo && tipo !== 'todos') {
      where.tipo = tipo
    }

    const backups = await db.backup.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    // Calculate stats
    const total = await db.backup.count()
    const completados = await db.backup.count({ where: { estado: 'Completado' } })
    const fallidos = await db.backup.count({ where: { estado: 'Fallido' } })
    
    // Backups this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const backupsEsteMes = await db.backup.count({
      where: {
        createdAt: { gte: startOfMonth },
        estado: 'Completado',
      }
    })

    // Last backup
    const ultimoBackup = await db.backup.findFirst({
      where: { estado: 'Completado' },
      orderBy: { createdAt: 'desc' },
    })

    // Total size
    const backupsCompletados = await db.backup.findMany({
      where: { estado: 'Completado' },
      select: { tamano: true },
    })
    const tamanoTotal = backupsCompletados.reduce((acc, b) => acc + (b.tamano || 0), 0)

    return NextResponse.json({
      backups,
      stats: {
        total,
        completados,
        fallidos,
        backupsEsteMes,
        ultimoBackup: ultimoBackup?.createdAt || null,
        tamanoTotal,
      }
    })
  } catch (error) {
    console.error('Error fetching backups:', error)
    return NextResponse.json({ error: 'Error al obtener respaldos' }, { status: 500 })
  }
}

// POST - Create a new backup
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tipo = 'Manual', incluyeBase64 = false } = body

    // Create backup record with pending status
    const backup = await db.backup.create({
      data: {
        tipo,
        estado: 'Pendiente',
        fechaInicio: new Date(),
        incluyeBase64,
      }
    })

    // Update status to in progress
    await db.backup.update({
      where: { id: backup.id },
      data: { estado: 'EnProgreso' }
    })

    try {
      // Get database file path
      const dbPath = path.join(process.cwd(), 'prisma', 'dev.db')
      
      if (!fs.existsSync(dbPath)) {
        throw new Error('Archivo de base de datos no encontrado')
      }

      // Generate backup filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const fileName = `backup_${timestamp}.db`
      const backupPath = path.join(BACKUP_DIR, fileName)

      // Copy database file
      const stats = fs.statSync(dbPath)
      const tamanoMB = stats.size / (1024 * 1024)

      // For SQLite, we can simply copy the file
      fs.copyFileSync(dbPath, backupPath)

      // Get table counts for metadata
      const tablas = [
        'User', 'Condominio', 'Propiedad', 'Residente', 'Personal',
        'Activo', 'Proveedor', 'OrdenTrabajo', 'Gasto', 'Proyecto',
        'Inspeccion', 'Reserva', 'GastoComun', 'Notificacion', 'Backup'
      ]
      
      let totalTablas = 0
      let totalRegistros = 0

      for (const tabla of tablas) {
        try {
          // @ts-ignore - Dynamic model access
          const count = await db[tabla.toLowerCase()].count()
          if (count > 0) {
            totalTablas++
            totalRegistros += count
          }
        } catch (e) {
          // Table might not exist or have different name
        }
      }

      // Update backup record with success
      const completedBackup = await db.backup.update({
        where: { id: backup.id },
        data: {
          estado: 'Completado',
          fechaFin: new Date(),
          tamano: tamanoMB,
          ubicacion: backupPath,
          archivo: fileName,
          totalTablas,
          totalRegistros,
          verificado: true,
          fechaVerificacion: new Date(),
        }
      })

      return NextResponse.json(completedBackup)

    } catch (backupError) {
      // Update backup record with error
      const errorMessage = backupError instanceof Error ? backupError.message : 'Error desconocido'
      
      await db.backup.update({
        where: { id: backup.id },
        data: {
          estado: 'Fallido',
          fechaFin: new Date(),
          mensajeError: errorMessage,
        }
      })

      return NextResponse.json({ 
        error: 'Error al crear respaldo', 
        message: errorMessage 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error creating backup:', error)
    return NextResponse.json({ error: 'Error al crear respaldo' }, { status: 500 })
  }
}
