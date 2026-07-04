import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

// Intentar conectar a Neon con timeout extendido (30s)
// Neon free tier auto-suspende computes after 5 min inactivity
// El cold start puede tardar hasta 30 segundos
export async function POST() {
  const url = process.env.DATABASE_URL || ''
  const results: string[] = []

  // Intentar 5 veces con 5 segundos entre cada intento
  for (let i = 1; i <= 5; i++) {
    try {
      results.push(`Intento ${i}: conectando...`)
      const prisma = new PrismaClient({
        datasources: { db: { url: url + '&connect_timeout=30&pool_timeout=30' } },
      })
      
      // Timeout manual de 25 segundos
      const promise = prisma.$queryRaw`SELECT 1 as test, NOW() as now`
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout 25s')), 25000)
      )
      
      await Promise.race([promise, timeout])
      await prisma.$disconnect()
      results.push(`Intento ${i}: ¡CONECTADO!`)
      return NextResponse.json({ success: true, results, intento: i })
    } catch (e: any) {
      results.push(`Intento ${i}: ${e.message.substring(0, 100)}`)
      // Esperar 5 segundos antes del siguiente intento
      await new Promise(r => setTimeout(r, 5000))
    }
  }

  return NextResponse.json({ 
    success: false, 
    results,
    message: 'No se pudo conectar a Neon después de 5 intentos. La BD está suspendida.'
  })
}
// test
