import { NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'

export async function GET() {
  try {
    const recurrentes = await withRetry(() => db.ordenTrabajo.findMany({
      where: { esRecurrente: true },
      take: 50,
    }))
    return NextResponse.json(recurrentes.map(ot => ({
      id: ot.id, name: ot.titulo, description: ot.descripcion || '',
      status: 'active', frequency: 'weekly', daysOfWeek: [], dayOfMonth: null,
      lastGeneratedAt: null, createdAt: ot.createdAt.toISOString(),
    })))
  } catch {
    return NextResponse.json([])
  }
}

export async function POST(request: any) {
  return NextResponse.json({ success: true, message: 'Función no disponible en modo sincronizado' })
}
