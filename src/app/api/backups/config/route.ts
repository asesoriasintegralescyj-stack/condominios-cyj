import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import fs from 'fs'

// GET - Get backup configuration
export async function GET() {
  try {
    // Get config from Configuracion table
    const configs = await db.configuracion.findMany({
      where: {
        clave: {
          in: [
            'backup_frecuencia',
            'backup_hora',
            'backup_retencion_dias',
            'backup_incluye_base64',
            'backup_ultimo_ejecutado',
            'backup_activo'
          ]
        }
      }
    })

    const configMap: Record<string, string> = {}
    configs.forEach(c => {
      configMap[c.clave] = c.valor
    })

    return NextResponse.json({
      frecuencia: configMap['backup_frecuencia'] || 'Diario',
      hora: configMap['backup_hora'] || '02:00',
      retencionDias: parseInt(configMap['backup_retencion_dias'] || '30'),
      incluyeBase64: configMap['backup_incluye_base64'] === 'true',
      ultimoEjecutado: configMap['backup_ultimo_ejecutado'] || null,
      activo: configMap['backup_activo'] !== 'false',
    })
  } catch (error) {
    console.error('Error fetching backup config:', error)
    return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 })
  }
}

// POST - Update backup configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      frecuencia = 'Diario', 
      hora = '02:00', 
      retencionDias = 30,
      incluyeBase64 = false,
      activo = true
    } = body

    const configs = [
      { clave: 'backup_frecuencia', valor: frecuencia },
      { clave: 'backup_hora', valor: hora },
      { clave: 'backup_retencion_dias', valor: retencionDias.toString() },
      { clave: 'backup_incluye_base64', valor: incluyeBase64.toString() },
      { clave: 'backup_activo', valor: activo.toString() },
    ]

    // Upsert each config
    for (const config of configs) {
      await db.configuracion.upsert({
        where: { clave: config.clave },
        update: { valor: config.valor },
        create: { 
          clave: config.clave, 
          valor: config.valor,
          descripcion: `Configuración de respaldo: ${config.clave}`
        }
      })
    }

    return NextResponse.json({ 
      message: 'Configuración actualizada correctamente',
      config: {
        frecuencia,
        hora,
        retencionDias,
        incluyeBase64,
        activo
      }
    })
  } catch (error) {
    console.error('Error updating backup config:', error)
    return NextResponse.json({ error: 'Error al actualizar configuración' }, { status: 500 })
  }
}

// DELETE - Clean old backups based on retention
export async function DELETE() {
  try {
    // Get retention days
    const config = await db.configuracion.findUnique({
      where: { clave: 'backup_retencion_dias' }
    })
    const retencionDias = parseInt(config?.valor || '30')

    // Calculate cutoff date
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retencionDias)

    // Find old backups to delete
    const oldBackups = await db.backup.findMany({
      where: {
        createdAt: { lt: cutoffDate },
        estado: 'Completado'
      }
    })

    let deletedCount = 0
    let deletedSize = 0

    for (const backup of oldBackups) {
      try {
        // Delete file if exists
        if (backup.ubicacion) {
          if (fs.existsSync(backup.ubicacion)) {
            fs.unlinkSync(backup.ubicacion)
            deletedSize += backup.tamano || 0
          }
        }
        
        // Delete database record
        await db.backup.delete({ where: { id: backup.id } })
        deletedCount++
      } catch (e) {
        console.error(`Error deleting backup ${backup.id}:`, e)
      }
    }

    return NextResponse.json({
      message: `Limpieza completada`,
      eliminados: deletedCount,
      tamanoLiberado: deletedSize,
    })
  } catch (error) {
    console.error('Error cleaning old backups:', error)
    return NextResponse.json({ error: 'Error al limpiar respaldos antiguos' }, { status: 500 })
  }
}
