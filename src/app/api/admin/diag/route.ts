import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const dbUrl = process.env.DATABASE_URL || 'NO CONFIGURADA'
  const hostMatch = dbUrl.match(/@([^:]+):/)
  const host = hostMatch ? hostMatch[1] : 'desconocido'
  const safeUrl = dbUrl.replace(/:[^:@]+@/, ':***@')

  let dbReachable = false
  let dbError = ''
  try {
    const result: any = await db.$queryRaw`SELECT 1 as test`
    dbReachable = true
  } catch (e: any) {
    dbError = e.message.substring(0, 300)
  }

  return NextResponse.json({
    host,
    dbReachable,
    dbError,
    url: safeUrl.substring(0, 100),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV || 'n/a',
    },
  })
}
