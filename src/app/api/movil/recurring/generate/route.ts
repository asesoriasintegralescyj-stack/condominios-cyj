import { NextResponse } from 'next/server'
export async function POST() {
  return NextResponse.json({ success: true, generated: 0, message: 'Generación automática manejada por el sistema principal' })
}
