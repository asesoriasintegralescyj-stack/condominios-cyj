import { NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'

/**
 * API de perfiles para la app móvil.
 * La primera vez, crea perfiles MovilProfile desde Personal de Aiven con códigos aleatorios.
 * Las siguientes veces, lee de MovilProfile (códigos estables).
 */
export async function GET() {
  try {
    // Intentar leer perfiles existentes
    let perfiles = await withRetry(() => db.movilProfile.findMany({
      orderBy: { name: 'asc' },
      take: 100,
    }))

    // Si no hay perfiles, crearlos desde Personal
    if (perfiles.length === 0) {
      const personal = await withRetry(() => db.personal.findMany({
        where: { estado: 'Activo' },
        take: 50,
        orderBy: { nombre: 'asc' },
      }))

      for (const p of personal) {
        try {
          await withRetry(() => db.movilProfile.create({
            data: {
              name: p.nombre,
              accessCode: String(Math.floor(1000 + Math.random() * 9000)),
              password: '',
              color: 'bg-blue-600',
              icon: 'User',
              workAreaIds: [],
              permissions: ['view', 'create', 'edit'],
              personalId: p.id,
            },
          }))
        } catch (e) {
          // Si ya existe (por unique constraint), continuar
        }
      }

      perfiles = await withRetry(() => db.movilProfile.findMany({
        orderBy: { name: 'asc' },
        take: 100,
      }))
    }

    return NextResponse.json(perfiles.map(p => ({
      id: p.id,
      name: p.name,
      password: p.password,
      accessCode: p.accessCode,
      color: p.color,
      icon: p.icon,
      workAreaIds: p.workAreaIds,
      permissions: p.permissions,
      personalId: p.personalId,
    })))
  } catch (error) {
    console.error('Error fetching profiles móvil:', error)
    return NextResponse.json([])
  }
}

export async function POST(request: any) {
  try {
    const body = await request.json()
    const perfil = await withRetry(() => db.movilProfile.create({
      data: {
        name: body.name,
        password: body.password || '',
        accessCode: body.accessCode || String(Math.floor(1000 + Math.random() * 9000)),
        color: body.color || 'bg-blue-600',
        icon: body.icon || 'User',
        workAreaIds: body.workAreaIds || [],
        permissions: body.permissions || ['view'],
        personalId: body.personalId || null,
      },
    }))
    return NextResponse.json(perfil)
  } catch (error) {
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
