import { NextResponse } from 'next/server'
export async function GET() {
  return NextResponse.json({ message: 'Use el sistema principal para exportar QR' })
}
