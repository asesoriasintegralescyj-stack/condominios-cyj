import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const AIVEN = process.env.DATABASE_URL || ''

export async function GET() {
  try {
    const p = new PrismaClient()
    const r: any = await p.$queryRaw`SELECT 1 as test, NOW() as now`
    await p.$disconnect()
    return NextResponse.json({ ok: true, db: JSON.stringify(r[0]) })
  } catch (e: any) {
    return NextResponse.json({ ok: false, err: e.message.substring(0, 150) })
  }
}
