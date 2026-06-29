import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'
import { apiError, handlePrismaError } from '@/lib/api-helpers'

const CONDOMINIO_ID = 'cmo9f3x7j0000ktyeb0rzhwt9'

const TIPOS_VALIDOS = [
  'sector',
  'tipoReparacion',
  'prioridad',
  'estadoProyecto',
  'estadoAprobacion',
]

// GET - Listar valores de listas desplegables (público para que el frontend pueda cargar opciones)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tipo = searchParams.get('tipo') || ''
    const incluirInactivos = searchParams.get('incluirInactivos') === 'true'

    const where: any = {
      condominioId: CONDOMINIO_ID,
    }
    if (tipo) where.tipo = tipo
    if (!incluirInactivos) where.activo = true

    const listas = await db.listaDesplegable.findMany({
      where,
      orderBy: [{ tipo: 'asc' }, { valor: 'asc' }],
    })

    return NextResponse.json(listas)
  } catch (error) {
    console.error('Error fetching listas desplegables:', error)
    return handlePrismaError(error)
  }
}

// POST - Crear nuevo valor en una lista (requiere auth)
export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (
    session.user.rol !== 'admin' &&
    !hasPermission(session.user.rol, 'catalogos.crear') &&
    !hasPermission(session.user.rol, 'proyectos.crear')
  ) {
    return apiError('Sin permisos', 403)
  }
  try {
    const data = await request.json()

    const tipo = String(data.tipo || '').trim()
    const valor = String(data.valor || '').trim()
    const nombre = String(data.nombre || valor).trim()

    if (!tipo || !TIPOS_VALIDOS.includes(tipo)) {
      return apiError(`Tipo inválido. Debe ser uno de: ${TIPOS_VALIDOS.join(', ')}`, 400)
    }
    if (!valor) {
      return apiError('El valor es obligatorio', 400)
    }

    // Evitar duplicados (valor + tipo + condominio)
    const existente = await db.listaDesplegable.findFirst({
      where: {
        tipo,
        valor,
        condominioId: CONDOMINIO_ID,
      },
    })
    if (existente) {
      // Si ya existe pero está inactivo, lo reactivamos
      if (!existente.activo) {
        const reactivado = await db.listaDesplegable.update({
          where: { id: existente.id },
          data: { activo: true, nombre },
        })
        return NextResponse.json(reactivado)
      }
      return apiError('Ya existe un valor con ese nombre en la lista', 409)
    }

    const creado = await db.listaDesplegable.create({
      data: {
        nombre,
        tipo,
        valor,
        activo: true,
        condominioId: CONDOMINIO_ID,
      },
    })

    return NextResponse.json(creado, { status: 201 })
  } catch (error) {
    console.error('Error creating lista desplegable:', error)
    return handlePrismaError(error)
  }
}

// PUT - Actualizar un valor (bulk update por query ?id= o por body)
export async function PUT(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (
    session.user.rol !== 'admin' &&
    !hasPermission(session.user.rol, 'catalogos.editar') &&
    !hasPermission(session.user.rol, 'proyectos.editar')
  ) {
    return apiError('Sin permisos', 403)
  }
  try {
    const data = await request.json()
    const id = data.id
    if (!id) return apiError('Se requiere id', 400)

    const updateData: any = {}
    if (data.nombre !== undefined) updateData.nombre = String(data.nombre).trim()
    if (data.valor !== undefined) updateData.valor = String(data.valor).trim()
    if (data.activo !== undefined) updateData.activo = Boolean(data.activo)

    const actualizado = await db.listaDesplegable.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(actualizado)
  } catch (error) {
    console.error('Error updating lista desplegable:', error)
    return handlePrismaError(error)
  }
}

// DELETE - Desactivar un valor (soft delete, set activo=false)
export async function DELETE(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (
    session.user.rol !== 'admin' &&
    !hasPermission(session.user.rol, 'catalogos.eliminar') &&
    !hasPermission(session.user.rol, 'proyectos.eliminar')
  ) {
    return apiError('Sin permisos', 403)
  }
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return apiError('Se requiere id', 400)

    const desactivado = await db.listaDesplegable.update({
      where: { id },
      data: { activo: false },
    })

    return NextResponse.json(desactivado)
  } catch (error) {
    console.error('Error deleting lista desplegable:', error)
    return handlePrismaError(error)
  }
}
