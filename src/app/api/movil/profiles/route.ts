import { NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'

/**
 * API de perfiles para la app móvil.
 * Devuelve el personal activo de Aiven en formato Profile que entiende LagunaNorteApp.
 */
export async function GET() {
  try {
    const personal = await withRetry(() =>
      db.personal.findMany({
        where: { estado: 'Activo' },
        take: 50,
        orderBy: { nombre: 'asc' },
      })
    )

    // Mapear Personal → formato Profile de la app móvil
    const profiles = personal.map(p => ({
      id: p.id,
      name: p.nombre,
      password: '',
      accessCode: String(Math.floor(1000 + Math.random() * 9000)),
      color: 'bg-blue-600',
      icon: 'User',
      workAreaIds: [],
      permissions: ['view', 'create', 'edit'],
      personalId: p.id,
    }))

    return NextResponse.json(profiles)
  } catch (error) {
    console.error('Error fetching profiles móvil:', error)
    return NextResponse.json([])
  }
}
