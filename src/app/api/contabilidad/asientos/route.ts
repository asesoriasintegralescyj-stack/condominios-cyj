import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

// GET - Listar asientos contables
export async function GET() {
  const session = await getCurrentSession();
  if (!session) return apiError('No autenticado', 401);
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'gastos.ver')) {
    return apiError('Sin permisos', 403);
  }
  try {
    const asientos = await db.asientoContable.findMany({
      include: {
        detalles: {
          include: {
            cuenta: {
              select: { codigo: true, nombre: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Calcular estadísticas
    const totalDebe = asientos.reduce((sum, a) => sum + a.totalDebe, 0)
    const totalHaber = asientos.reduce((sum, a) => sum + a.totalHaber, 0)
    const pendientes = asientos.filter(a => a.estado === 'Pendiente').length

    return NextResponse.json({
      asientos,
      stats: {
        totalAsientos: asientos.length,
        totalDebe,
        totalHaber,
        pendientes
      }
    })
  } catch (error) {
    console.error('Error fetching asientos:', error)
    return NextResponse.json({ error: 'Error al obtener asientos' }, { status: 500 })
  }
}

// POST - Crear asiento contable
export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return apiError('No autenticado', 401);
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'gastos.crear')) {
    return apiError('Sin permisos', 403);
  }
  try {
    const data = await request.json()
    const { detalles, ...asientoData } = data

    // Calcular totales
    const totalDebe = detalles?.reduce((sum: number, d: { debe: number }) => sum + d.debe, 0) || 0
    const totalHaber = detalles?.reduce((sum: number, d: { haber: number }) => sum + d.haber, 0) || 0

    const asiento = await db.asientoContable.create({
      data: {
        numero: asientoData.numero,
        fecha: asientoData.fecha,
        glosa: asientoData.glosa,
        tipo: asientoData.tipo || 'Normal',
        estado: 'Pendiente',
        totalDebe,
        totalHaber,
        documento: asientoData.documento,
        documentoId: asientoData.documentoId,
        notas: asientoData.notas
      }
    })

    // Crear detalles
    if (detalles && detalles.length > 0) {
      await db.detalleAsiento.createMany({
        data: detalles.map((d: { cuentaId: string; glosa?: string; debe: number; haber: number }) => ({
          cuentaId: d.cuentaId,
          glosa: d.glosa,
          debe: d.debe,
          haber: d.haber,
          asientoId: asiento.id
        }))
      })
    }

    return NextResponse.json(asiento)
  } catch (error) {
    console.error('Error creating asiento:', error)
    return NextResponse.json({ error: 'Error al crear asiento' }, { status: 500 })
  }
}
