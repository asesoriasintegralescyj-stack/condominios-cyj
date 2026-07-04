import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { readFile } from 'fs/promises'
import path from 'path'

export async function POST() {
  const out: string[] = []
  
  try {
    // Leer JSON de respaldo
    const filePath1 = path.join(process.cwd(), 'public', 'respaldo-bd-part1.json')
    const filePath2 = path.join(process.cwd(), 'public', 'respaldo-bd-part2.json')
    
    let data: any = {}
    
    try {
      const raw1 = await readFile(filePath1, 'utf-8')
      data = { ...data, ...JSON.parse(raw1) }
      out.push('Part 1 cargada')
    } catch (e: any) { out.push('Part 1 error: ' + e.message.substring(0, 60)) }
    
    try {
      const raw2 = await readFile(filePath2, 'utf-8')
      data = { ...data, ...JSON.parse(raw2) }
      out.push('Part 2 cargada')
    } catch (e: any) { out.push('Part 2 error: ' + e.message.substring(0, 60)) }
    
    // Migrar cada tabla
    const tableOrder = [
      'condominio', 'centroCostoMaster', 'configuracion',
      'propiedad', 'personal', 'user', 'activo', 'proveedor',
      'catHerramienta', 'catMaterial', 'catTarea',
      'ordenTrabajo', 'oTMaterial', 'oTHerramienta', 'oTTarea', 'oTPersonal', 'oTDocumento',
      'proyecto', 'proyectoMaterial', 'proyectoHerramienta', 'proyectoTarea', 'proyectoPersonal', 'proyectoDocumento',
      'solicitudCompra',
      'inspeccion', 'ronda', 'registroRonda',
      'notificacion', 'asistencia',
      'categoriaCumplimiento', 'documentoCumplimiento', 'historialCumplimiento', 'resumenCumplimiento',
      'horarioTrabajador',
      'historialAprobacionOT', 'historialAprobacionSC',
    ]
    
    let totalImported = 0
    
    for (const table of tableOrder) {
      const rows = data[table]
      if (!rows || rows.length === 0) continue
      
      const modelName = table[0].toLowerCase() + table.slice(1)
      let imported = 0
      
      for (const row of rows) {
        try {
          // Limpiar el row
          const cleanRow: any = {}
          for (const [k, v] of Object.entries(row)) {
            // Skip relation fields
            if (v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)) continue
            if (Array.isArray(v)) continue
            // Convertir fechas string a Date si parecen fechas
            if (typeof v === 'string' && v.match(/^\d{4}-\d{2}-\d{2}T/) && (k === 'createdAt' || k === 'updatedAt' || k === 'fechaSolicitud' || k === 'fechaIngreso' || k === 'supervisorFechaAprobacion' || k === 'adminFechaAprobacion' || k === 'emailFechaEnvio' || k === 'fechaVerificacion' || k === 'fechaFin' || k === 'fechaInicio')) {
              cleanRow[k] = new Date(v)
            } else {
              cleanRow[k] = v
            }
          }
          
          await (db as any)[modelName].upsert({
            where: { id: cleanRow.id },
            update: cleanRow,
            create: cleanRow,
          })
          imported++
          totalImported++
        } catch (e: any) {
          // Skip errors
        }
      }
      out.push(`${table}: ${imported}/${rows.length}`)
    }
    
    out.push(`TOTAL: ${totalImported} registros migrados`)
    out.push('MIGRACION COMPLETA')
    
  } catch (e: any) {
    out.push('ERROR: ' + e.message.substring(0, 100))
  }
  
  return NextResponse.json({ success: true, out })
}
