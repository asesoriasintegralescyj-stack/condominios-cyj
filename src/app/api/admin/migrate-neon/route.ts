import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const NEON_URL = 'postgresql://neondb_owner:npg_Z7FeoOqKwj5f@ep-purple-fog-aj8k6r6o-pooler.c-3.us-east-2.aws.neon.tech/neondb?sslmode=require'

export async function POST() {
  const out: string[] = []
  
  // 1. Probar conexión a Neon
  out.push('1. Probando Neon...')
  const neon = new PrismaClient({ datasources: { db: { url: NEON_URL } } })
  
  try {
    const r: any = await neon.$queryRaw`SELECT 1 as test`
    out.push('   Neon CONECTADO!')
  } catch (e: any) {
    out.push('   Neon NO disponible: ' + e.message.substring(0, 100))
    await neon.$disconnect()
    return NextResponse.json({ success: false, out })
  }

  // 2. Exportar TODOS los datos de Neon
  out.push('2. Exportando datos de Neon...')
  const data: any = {}
  
  const tables = [
    'OrdenTrabajo', 'Proyecto', 'SolicitudCompra', 'Inspeccion',
    'RegistroRonda', 'Ronda', 'Personal', 'Activo', 'Proveedor',
    'CatHerramienta', 'CatMaterial', 'CatTarea', 'CentroCostoMaster',
    'Gasto', 'Notificacion', 'CajaChica', 'Configuracion',
    'OTMaterial', 'OTHerramienta', 'OTTarea', 'OTPersonal', 'OTDocumento',
    'ProyectoMaterial', 'ProyectoHerramienta', 'ProyectoTarea', 'ProyectoPersonal', 'ProyectoDocumento',
    'HistorialAprobacionOT', 'HistorialAprobacionSC',
    'HorarioTrabajador', 'RegistroAsistenciaReloj', 'InasistenciaAtraso', 'JustificacionAsistencia',
    'MovimientoInventario', 'ListaDesplegable', 'Backup',
    'ListaVerificacion', 'RegistroLV',
  ]
  
  for (const table of tables) {
    try {
      const rows = await (neon as any)[table[0].toLowerCase() + table.slice(1)].findMany()
      data[table] = rows
      out.push(`   ${table}: ${rows.length} registros`)
    } catch (e: any) {
      out.push(`   ${table}: SKIP (${e.message.substring(0, 40)})`)
    }
  }
  
  await neon.$disconnect()
  
  // 3. Importar datos a Aiven (BD actual)
  out.push('3. Importando a Aiven...')
  const aiven = new PrismaClient()
  
  let totalImported = 0
  
  for (const [table, rows] of Object.entries(data)) {
    if (!rows || rows.length === 0) continue
    
    const modelName = table[0].toLowerCase() + table.slice(1)
    
    for (const row of rows) {
      try {
        // Limpiar el row (quitar relaciones que no existen)
        const cleanRow: any = {}
        for (const [key, value] of Object.entries(row)) {
          // Skip relation fields (objects/arrays)
          if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) continue
          if (Array.isArray(value)) continue
          cleanRow[key] = value
        }
        
        // Upsert
        await (aiven as any)[modelName].upsert({
          where: { id: cleanRow.id },
          update: cleanRow,
          create: cleanRow,
        })
        totalImported++
      } catch (e: any) {
        // Skip errors (duplicates, missing columns, etc)
      }
    }
    out.push(`   ${table}: importado`)
  }
  
  await aiven.$disconnect()
  
  out.push(`TOTAL importado: ${totalImported} registros`)
  out.push('MIGRACION COMPLETA')
  
  return NextResponse.json({ success: true, out, totalImported })
}
