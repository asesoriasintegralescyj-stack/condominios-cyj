import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'

export async function GET() {
  try {
    const sec = await withRetry(() => db.secuencia.findUnique({ where: { tabla: 'OrdenTrabajo' } }))
    return NextResponse.json({ value: sec?.ultimoNum || 0 })
  } catch {
    return NextResponse.json({ value: 0 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { value } = await request.json()
    const sec = await withRetry(() => db.secuencia.upsert({
      where: { tabla: 'OrdenTrabajo' },
      update: { ultimoNum: value },
      create: { tabla: 'OrdenTrabajo', prefijo: 'OT', ultimoNum: value, padding: 4 },
    }))
    return NextResponse.json({ value: sec.ultimoNum })
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
