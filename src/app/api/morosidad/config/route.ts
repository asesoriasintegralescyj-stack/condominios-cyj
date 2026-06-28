import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

// ============================================
// GET - Obtener configuración
// ============================================
export async function GET() {
  const session = await getCurrentSession();
  if (!session) return apiError('No autenticado', 401);
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'configuracion.ver')) {
    return apiError('Sin permisos', 403);
  }
  try {
    let config = await db.configMorosidad.findFirst({
      where: { activo: true }
    })

    // Crear configuración por defecto si no existe
    if (!config) {
      config = await db.configMorosidad.create({
        data: {
          tasaInteresMensual: 1.5,
          tasaInteresDiario: 0.05,
          diasGracia: 10,
          maxDiasMora: 90,
          activo: true
        }
      })
    }

    return NextResponse.json({ config })
  } catch (error) {
    console.error('Error fetching config:', error)
    return NextResponse.json({ error: 'Error al obtener configuración' }, { status: 500 })
  }
}

// ============================================
// PUT - Actualizar configuración
// ============================================
export async function PUT(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) return apiError('No autenticado', 401);
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'configuracion.editar')) {
    return apiError('Sin permisos', 403);
  }
  try {
    const body = await request.json()
    const { tasaInteresMensual, tasaInteresDiario, diasGracia, maxDiasMora } = body

    // Buscar configuración existente
    let config = await db.configMorosidad.findFirst({
      where: { activo: true }
    })

    if (config) {
      // Actualizar existente
      config = await db.configMorosidad.update({
        where: { id: config.id },
        data: {
          tasaInteresMensual,
          tasaInteresDiario,
          diasGracia,
          maxDiasMora
        }
      })
    } else {
      // Crear nueva
      config = await db.configMorosidad.create({
        data: {
          tasaInteresMensual,
          tasaInteresDiario,
          diasGracia,
          maxDiasMora,
          activo: true
        }
      })
    }

    return NextResponse.json({ config })
  } catch (error) {
    console.error('Error updating config:', error)
    return NextResponse.json({ error: 'Error al actualizar configuración' }, { status: 500 })
  }
}
