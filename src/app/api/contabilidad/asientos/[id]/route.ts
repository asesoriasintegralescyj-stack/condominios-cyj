import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

// GET - Obtener asiento por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session) return apiError('No autenticado', 401);
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'gastos.ver')) {
    return apiError('Sin permisos', 403);
  }
  try {
    const { id } = await params
    const asiento = await db.asientoContable.findUnique({
      where: { id },
      include: {
        detalles: {
          include: {
            cuenta: {
              select: { codigo: true, nombre: true }
            }
          }
        }
      }
    })

    if (!asiento) {
      return NextResponse.json({ error: 'Asiento no encontrado' }, { status: 404 })
    }

    return NextResponse.json(asiento)
  } catch (error) {
    console.error('Error fetching asiento:', error)
    return NextResponse.json({ error: 'Error al obtener asiento' }, { status: 500 })
  }
}

// PUT - Actualizar asiento
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session) return apiError('No autenticado', 401);
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'gastos.editar')) {
    return apiError('Sin permisos', 403);
  }
  try {
    const { id } = await params
    const data = await request.json()
    const { detalles, ...asientoData } = data

    // Calcular totales
    const totalDebe = detalles?.reduce((sum: number, d: { debe: number }) => sum + d.debe, 0) || 0
    const totalHaber = detalles?.reduce((sum: number, d: { haber: number }) => sum + d.haber, 0) || 0

    // Actualizar asiento
    const asiento = await db.asientoContable.update({
      where: { id },
      data: {
        numero: asientoData.numero,
        fecha: asientoData.fecha,
        glosa: asientoData.glosa,
        tipo: asientoData.tipo,
        totalDebe,
        totalHaber,
        documento: asientoData.documento,
        notas: asientoData.notas
      }
    })

    // Actualizar detalles
    if (detalles) {
      await db.detalleAsiento.deleteMany({
        where: { asientoId: id }
      })
      
      await db.detalleAsiento.createMany({
        data: detalles.map((d: { cuentaId: string; glosa?: string; debe: number; haber: number }) => ({
          cuentaId: d.cuentaId,
          glosa: d.glosa,
          debe: d.debe,
          haber: d.haber,
          asientoId: id
        }))
      })
    }

    return NextResponse.json(asiento)
  } catch (error) {
    console.error('Error updating asiento:', error)
    return NextResponse.json({ error: 'Error al actualizar asiento' }, { status: 500 })
  }
}

// DELETE - Eliminar asiento
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getCurrentSession();
  if (!session) return apiError('No autenticado', 401);
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'gastos.eliminar')) {
    return apiError('Sin permisos', 403);
  }
  try {
    const { id } = await params
    
    await db.detalleAsiento.deleteMany({
      where: { asientoId: id }
    })
    
    await db.asientoContable.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting asiento:', error)
    return NextResponse.json({ error: 'Error al eliminar asiento' }, { status: 500 })
  }
}
