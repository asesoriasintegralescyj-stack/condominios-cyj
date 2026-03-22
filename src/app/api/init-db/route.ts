/**
 * API para inicializar la base de datos
 * Crea las tablas necesarias usando Prisma
 */

import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET() {
  try {
    console.log('Inicializando base de datos...')
    
    // Ejecutar prisma db push para crear las tablas
    const { stdout, stderr } = await execAsync('npx prisma db push --accept-data-loss --skip-generate', {
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL
      }
    })
    
    console.log('DB Push stdout:', stdout)
    if (stderr) console.log('DB Push stderr:', stderr)
    
    return NextResponse.json({
      success: true,
      message: 'Base de datos inicializada correctamente',
      output: stdout
    })
  } catch (error) {
    console.error('Error inicializando base de datos:', error)
    return NextResponse.json({
      success: false,
      error: 'Error al inicializar base de datos',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
