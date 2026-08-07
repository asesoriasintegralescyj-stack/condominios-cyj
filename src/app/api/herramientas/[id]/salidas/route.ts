import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// GET - Listar salidas de pañol de una herramienta
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  try {
    const { id } = await params
    const salidas = await db.salidaPanol.findMany({
      where: { herramientaId: id },
      orderBy: { fechaSalida: 'desc' },
      take: 50,
    })
    const parsed = salidas.map(s => ({
      ...s,
      lvAntesItems: s.lvAntesItems ? JSON.parse(s.lvAntesItems) : [],
      lvDespuesItems: s.lvDespuesItems ? JSON.parse(s.lvDespuesItems) : [],
    }))
    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Error fetching salidas:', error)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

// POST - Registrar nueva salida de pañol
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  try {
    const { id } = await params
    const data = await request.json()

    // Verificar que la herramienta existe
    const herramienta = await db.catHerramienta.findUnique({ where: { id } })
    if (!herramienta) return apiError('Herramienta no encontrada', 404)

    // Verificar que no haya una salida pendiente
    const pendiente = await db.salidaPanol.findFirst({
      where: { herramientaId: id, estado: 'Pendiente' },
    })
    if (pendiente) {
      return apiError('La herramienta ya tiene una salida pendiente. Debe registrarse el ingreso primero.', 400)
    }

    const lvAntesItems = typeof data.lvAntesItems === 'string'
      ? data.lvAntesItems
      : JSON.stringify(data.lvAntesItems || [])

    const ahora = new Date()
    const salida = await db.salidaPanol.create({
      data: {
        herramientaId: id,
        usuarioNombre: data.usuarioNombre || 'N/A',
        usuarioRUT: data.usuarioRUT || null,
        fechaSalida: data.fechaSalida ? new Date(data.fechaSalida) : ahora,
        horaSalida: data.horaSalida || ahora.toTimeString().substring(0, 5),
        trabajoRealizar: data.trabajoRealizar || null,
        sectorTrabajo: data.sectorTrabajo || null,
        lvAntesCompletada: data.lvAntesCompletada || false,
        lvAntesItems,
        lvAntesFirma: data.lvAntesFirma || null,
        estado: 'Pendiente',
      },
    })

    return NextResponse.json({
      ...salida,
      lvAntesItems: salida.lvAntesItems ? JSON.parse(salida.lvAntesItems) : [],
    })
  } catch (error) {
    console.error('Error creating salida:', error)
    return NextResponse.json({ error: 'Error creating salida' }, { status: 500 })
  }
}
