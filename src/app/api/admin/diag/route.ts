import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

// Diagnóstico: probar conexión con diferentes URLs de Neon
export async function GET() {
  const originalUrl = process.env.DATABASE_URL || ''
  
  // URL sin -pooler (conexión directa)
  const directUrl = originalUrl.replace('-pooler.', '.')
  
  const results: any = {
    originalUrl: originalUrl.replace(/:[^:@]+@/, ':***@').substring(0, 100),
    directUrl: directUrl.replace(/:[^:@]+@/, ':***@').substring(0, 100),
  }

  // Probar URL original (pooler)
  try {
    const prisma1 = new PrismaClient({ datasources: { db: { url: originalUrl } } })
    await prisma1.$queryRaw`SELECT 1 as test`
    results.pooler = 'OK - CONECTADO'
    await prisma1.$disconnect()
  } catch (e: any) {
    results.pooler = 'ERROR: ' + e.message.substring(0, 150)
  }

  // Probar URL directa (sin pooler)
  try {
    const prisma2 = new PrismaClient({ datasources: { db: { url: directUrl } } })
    await prisma2.$queryRaw`SELECT 1 as test`
    results.directo = 'OK - CONECTADO'
    await prisma2.$disconnect()
  } catch (e: any) {
    results.directo = 'ERROR: ' + e.message.substring(0, 150)
  }

  return NextResponse.json(results)
}
