import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export async function GET() {
  try {
    const p = new PrismaClient()
    const r: any = await p.$queryRaw`SELECT 1 as test`
    await p.$disconnect()
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, err: e.message.substring(0, 150) })
  }
}

export async function POST() {
  return NextResponse.json({ msg: 'Usar db-push endpoint' })
}
