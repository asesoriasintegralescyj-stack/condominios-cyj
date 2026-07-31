import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

// GET - Registros por fecha (y opcionalmente por lvId)
// ?fecha=YYYY-MM-DD → devuelve registros de ese día
// ?lvId=xxx&fecha=YYYY-MM-DD → registros de esa LV en esa fecha
export async function GET(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  try {
    const searchParams = request.nextUrl.searchParams
    const fecha = searchParams.get('fecha') || ''
    const lvId = searchParams.get('lvId') || ''
    const estado = searchParams.get('estado') || ''

    const where: any = {}
    if (fecha) where.fecha = fecha
    if (lvId) where.lvId = lvId
    if (estado) where.estado = estado

    const registros = await db.registroLV.findMany({
      where,
      include: { lv: true },
      orderBy: { createdAt: 'desc' },
    })

    const parsed = registros.map(r => ({
      ...r,
      itemsCompletados: r.itemsCompletados ? JSON.parse(r.itemsCompletados) : [],
    }))

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Error fetching registros LV:', error)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}

// POST - Crear un registro de ejecución de LV
// El PDF de respaldo es OBLIGATORIO para completar una LV (estado = Completado)
export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  try {
    const data = await request.json()

    if (!data.lvId || !data.fecha) {
      return apiError('lvId y fecha son requeridos', 400)
    }

    // Validar PDF de respaldo obligatorio cuando el estado es Completado
    const estado = data.estado || 'Completado'
    const pdfRespaldoUrl = typeof data.pdfRespaldoUrl === 'string' ? data.pdfRespaldoUrl : ''
    const pdfRespaldoNombre = typeof data.pdfRespaldoNombre === 'string' ? data.pdfRespaldoNombre : ''

    if (estado === 'Completado') {
      if (!pdfRespaldoUrl || !pdfRespaldoUrl.startsWith('data:application/pdf')) {
        return apiError(
          'Para completar una LV es obligatorio subir un PDF de respaldo.',
          400,
        )
      }
      // Limitar tamaño del PDF a 10 MB (base64 incluido)
      if (pdfRespaldoUrl.length > 10 * 1024 * 1024 * 1.37) {
        return apiError(
          'El PDF excede el tamaño máximo permitido (10 MB).',
          400,
        )
      }
    }

    const itemsCompletados = typeof data.itemsCompletados === 'string'
      ? data.itemsCompletados
      : JSON.stringify(data.itemsCompletados || [])

    const registro = await db.registroLV.create({
      data: {
        lvId: data.lvId,
        fecha: data.fecha,
        hora: data.hora || null,
        responsableEjecucion: data.responsableEjecucion || session.user.nombre,
        estado,
        observaciones: data.observaciones || null,
        itemsCompletados,
        firmaUrl: data.firmaUrl || null,
        fotoUrl: data.fotoUrl || null,
        pdfRespaldoUrl: pdfRespaldoUrl || null,
        pdfRespaldoNombre: pdfRespaldoNombre || null,
      },
      include: { lv: true },
    })

    return NextResponse.json({
      ...registro,
      itemsCompletados: registro.itemsCompletados ? JSON.parse(registro.itemsCompletados) : [],
    })
  } catch (error) {
    console.error('Error creating registro LV:', error)
    return NextResponse.json({ error: 'Error creating registro' }, { status: 500 })
  }
}
