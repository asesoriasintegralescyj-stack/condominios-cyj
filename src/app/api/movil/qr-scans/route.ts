import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'

export async function GET() {
  try {
    const scans = await withRetry(() => db.movilQrScan.findMany({ take: 200, orderBy: { createdAt: 'desc' } }))
    return NextResponse.json(scans)
  } catch { return NextResponse.json([]) }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const scan = await withRetry(() => db.movilQrScan.create({
      data: { qrLocationId: body.qrLocationId, scannedBy: body.scannedBy || '', profileId: body.profileId || null, latitude: body.latitude || null, longitude: body.longitude || null, notes: body.notes || '' }
    }))
    return NextResponse.json(scan)
  } catch (error) { return NextResponse.json({ error: 'Error' }, { status: 500 }) }
}
