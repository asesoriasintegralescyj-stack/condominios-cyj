import { NextRequest, NextResponse } from 'next/server'
export async function POST(request: NextRequest) {
  try {
    const { data } = await request.json()
    return NextResponse.json({ success: true, qrData: data || '' })
  } catch { return NextResponse.json({ error: 'Error' }, { status: 500 }) }
}
