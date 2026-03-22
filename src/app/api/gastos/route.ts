import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - List all gastos
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    
    const gastos = await db.gasto.findMany({
      where: search ? {
        OR: [
          { descripcion: { contains: search } },
          { categoria: { contains: search } },
        ]
      } : undefined,
      include: {
        proveedor: true
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(gastos)
  } catch (error) {
    console.error('Error fetching gastos:', error)
    return NextResponse.json({ error: 'Error fetching gastos' }, { status: 500 })
  }
}

// POST - Create new gasto
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    
    const gasto = await db.gasto.create({
      data: {
        descripcion: data.descripcion,
        categoria: data.categoria || 'Mantenimiento',
        estado: data.estado || 'Pendiente',
        monto: parseFloat(data.monto) || 0,
        fecha: data.fecha || new Date().toISOString().split('T')[0],
        propiedad: data.propiedad || '',
        proveedorId: data.proveedorId || null,
        nDoc: data.nDoc || '',
        centroCosto: data.centroCosto || '',
        notas: data.notas || '',
        comprobante: data.comprobante || '',
      }
    })
    
    // Update caja chica if estado is Pagado
    if (data.estado === 'Pagado') {
      const caja = await db.cajaChica.findFirst()
      if (caja) {
        await db.cajaChica.update({
          where: { id: caja.id },
          data: { saldo: caja.saldo - (parseFloat(data.monto) || 0) }
        })
      }
    }
    
    return NextResponse.json(gasto)
  } catch (error) {
    console.error('Error creating gasto:', error)
    return NextResponse.json({ error: 'Error creating gasto' }, { status: 500 })
  }
}
