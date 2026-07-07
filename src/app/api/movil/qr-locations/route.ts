import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'

export async function GET() {
  try {
    const locations = await withRetry(() => db.movilQrLocation.findMany({ where: { active: true } }))
    return NextResponse.json(locations)
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const loc = await withRetry(() => db.movilQrLocation.create({
      data: { name: body.name, description: body.description || '', location: body.location || '', code: body.code || `QR-${Date.now()}`, active: true }
    }))
    return NextResponse.json(loc)
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
