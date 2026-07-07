import { NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'

export async function GET() {
  try {
    const items = await withRetry(() => db.catHerramienta.findMany({ take: 200 }))
    return NextResponse.json(items.map(h => ({
      id: h.id, name: h.nombre, brand: h.marca || '', model: h.modelo || '',
      serialNumber: '', category: 'herramienta', location: h.ubicacion || '',
      status: h.estado, photo: '', notes: h.descripcion || '',
      qrCode: h.codigo || '', lastMaintenance: null, lastReview: null, nextMaintenance: null,
      createdBy: 'admin', createdAt: h.createdAt.toISOString(), updatedAt: h.updatedAt.toISOString(),
    })))
  } catch { return NextResponse.json([]) }
}

export async function POST(request: any) {
  return NextResponse.json({ success: true, message: 'Use el módulo Herramientas del sistema principal' })
}
