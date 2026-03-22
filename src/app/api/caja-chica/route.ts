import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Get caja chica
export async function GET() {
  try {
    let caja = await db.cajaChica.findFirst()
    
    // Create default if not exists
    if (!caja) {
      caja = await db.cajaChica.create({
        data: {
          saldo: 1000000,
          saldoInicial: 1000000,
        }
      })
    }
    
    return NextResponse.json(caja)
  } catch (error) {
    console.error('Error fetching caja:', error)
    return NextResponse.json({ error: 'Error fetching caja' }, { status: 500 })
  }
}

// PUT - Update caja chica
export async function PUT(request: Request) {
  try {
    const data = await request.json()
    
    let caja = await db.cajaChica.findFirst()
    
    if (!caja) {
      caja = await db.cajaChica.create({
        data: {
          saldo: parseFloat(data.saldo) || 0,
          saldoInicial: parseFloat(data.saldoInicial) || 0,
        }
      })
    } else {
      caja = await db.cajaChica.update({
        where: { id: caja.id },
        data: {
          saldo: parseFloat(data.saldo) || 0,
          saldoInicial: parseFloat(data.saldoInicial) || 0,
        }
      })
    }
    
    return NextResponse.json(caja)
  } catch (error) {
    console.error('Error updating caja:', error)
    return NextResponse.json({ error: 'Error updating caja' }, { status: 500 })
  }
}
