import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'
import { generarCorrelativo } from '@/lib/utils'

// GET - List all activos
export async function GET(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'activos.ver')) {
    return apiError('Sin permisos', 403)
  }
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''

    const activos = await db.activo.findMany({
      where: search ? {
        OR: [
          { nombre: { contains: search } },
          { categoria: { contains: search } },
          { estado: { contains: search } },
        ]
      } : undefined,
      include: {
        asignado: true
      },
      orderBy: { createdAt: 'desc' }
    })

    // Ocultar manualBase64 e informeMantencionBase64 en la lista (puede ser muy pesado);
    // solo enviar metadatos y banderas tieneManual / tieneInformeMantencion
    const result = activos.map(
      ({
        manualBase64: _manualBase64,
        informeMantencionBase64: _informeMantencionBase64,
        ...rest
      }) => ({
        ...rest,
        tieneManual: Boolean(rest.manualNombre),
        tieneInformeMantencion: Boolean(rest.informeMantencionNombre),
      })
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching activos:', error)
    return NextResponse.json({ error: 'Error fetching activos' }, { status: 500 })
  }
}

// POST - Create new activo
export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'activos.crear')) {
    return apiError('Sin permisos', 403)
  }
  try {
    const data = await request.json()

    // Generar código automático si no se proporciona usando tabla de secuencias
    let codigo = data.codigo || null
    if (!codigo) {
      const { generarCorrelativoDB } = await import('@/lib/utils')
      codigo = await generarCorrelativoDB(db, 'Activo', 'ACT', 3)
    }

    const activo = await db.activo.create({
      data: {
        codigo,
        nombre: data.nombre,
        categoria: data.categoria || 'Equipo',
        estado: data.estado || 'Activo',
        ubicacion: data.ubicacion || '',
        serie: data.serie || '',
        fechaCompra: data.fechaCompra || '',
        costoCompra: parseFloat(data.costoCompra) || 0,
        valorActual: parseFloat(data.valorActual) || 0,
        descripcion: data.descripcion || '',
        asignadoId: data.asignadoId || null,
        fechaUltimoMantencion: data.fechaUltimoMantencion || null,
        manualBase64: data.manualBase64 || null,
        manualNombre: data.manualNombre || null,
        manualTipo: data.manualTipo || null,
        informeMantencionBase64: data.informeMantencionBase64 || null,
        informeMantencionNombre: data.informeMantencionNombre || null,
        informeMantencionTipo: data.informeMantencionTipo || null,
      }
    })

    return NextResponse.json(activo)
  } catch (error) {
    console.error('Error creating activo:', error)
    return NextResponse.json({ error: 'Error creating activo' }, { status: 500 })
  }
}
