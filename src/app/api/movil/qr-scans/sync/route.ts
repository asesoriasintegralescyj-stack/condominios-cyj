import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { scans } = await request.json()
    if (!Array.isArray(scans)) return NextResponse.json({ success: true, synced: 0 })
    let synced = 0
    for (const s of scans) {
      try {
        await withRetry(() => db.movilQrScan.create({
          data: { qrLocationId: s.qrLocationId, scannedBy: s.scannedBy || '', profileId: s.profileId || null, latitude: s.latitude || null, longitude: s.longitude || null, notes: s.notes || '' }
        }))
        synced++
      } catch {}
    }
    return NextResponse.json({ success: true, synced })
  } catch (error) { return NextResponse.json({ error: 'Error' }, { status: 500 }) }
}
