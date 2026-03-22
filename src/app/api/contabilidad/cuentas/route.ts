import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Listar cuentas contables
export async function GET() {
  try {
    const cuentas = await db.cuentaContable.findMany({
      orderBy: { codigo: 'asc' }
    })

    return NextResponse.json({ cuentas })
  } catch (error) {
    console.error('Error fetching cuentas:', error)
    return NextResponse.json({ error: 'Error al obtener cuentas' }, { status: 500 })
  }
}

// POST - Crear cuenta contable
export async function POST(request: Request) {
  try {
    const data = await request.json()
    
    const cuenta = await db.cuentaContable.create({
      data: {
        codigo: data.codigo,
        nombre: data.nombre,
        tipo: data.tipo || 'Cuenta',
        nivel: data.nivel || 1,
        padreId: data.padreId,
        saldo: data.saldo || 0,
        estado: 'Activa'
      }
    })

    return NextResponse.json(cuenta)
  } catch (error) {
    console.error('Error creating cuenta:', error)
    return NextResponse.json({ error: 'Error al crear cuenta' }, { status: 500 })
  }
}
