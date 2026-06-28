import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError, handlePrismaError } from '@/lib/api-helpers'
import type { MaterialSolicitud } from '@/lib/email-solicitud-compra'

interface Context {
  params: Promise<{ id: string }>
}

function safeParseMateriales(raw: string | null): MaterialSolicitud[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// GET - Detalle de una solicitud
export async function GET(_request: NextRequest, { params }: Context) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  try {
    const { id } = await params
    const solicitud = await db.solicitudCompra.findUnique({
      where: { id },
      include: { condominio: true },
    })
    if (!solicitud) return apiError('Solicitud no encontrada', 404)

    return NextResponse.json({
      ...solicitud,
      materiales: safeParseMateriales(solicitud.materiales),
    })
  } catch (error) {
    console.error('Error fetching solicitud de compra:', error)
    return handlePrismaError(error)
  }
}

// PUT - Actualizar solicitud
export async function PUT(request: NextRequest, { params }: Context) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.solicitudCompra.findUnique({ where: { id } })
    if (!existing) return apiError('Solicitud no encontrada', 404)

    // Normalize materiales
    const materialesRaw: MaterialSolicitud[] = Array.isArray(body.materiales)
      ? body.materiales.map((m: any) => ({
          nombre: String(m.nombre ?? m.descripcion ?? '').trim(),
          cantidad: Number(m.cantidad) || 0,
          unidad: String(m.unidad ?? 'unidad').trim(),
          precioEstimado: Number(m.precioEstimado ?? m.precioUnit ?? 0) || 0,
          total:
            Number(m.total ?? 0) ||
            (Number(m.cantidad) || 0) * (Number(m.precioEstimado ?? m.precioUnit ?? 0) || 0),
        }))
      : []

    const totalEstimado =
      body.totalEstimado != null
        ? Number(body.totalEstimado)
        : materialesRaw.length > 0
          ? materialesRaw.reduce((acc, m) => acc + (m.total || 0), 0)
          : undefined

    const data: any = {}
    if (body.titulo !== undefined) data.titulo = String(body.titulo).trim()
    if (body.descripcion !== undefined) data.descripcion = body.descripcion ? String(body.descripcion) : null
    if (body.estado !== undefined) data.estado = String(body.estado)
    if (body.prioridad !== undefined) data.prioridad = String(body.prioridad)
    if (body.fechaEspera !== undefined) data.fechaEspera = body.fechaEspera ? String(body.fechaEspera) : null
    if (body.proveedorSugerido !== undefined)
      data.proveedorSugerido = body.proveedorSugerido ? String(body.proveedorSugerido) : null
    if (body.observaciones !== undefined)
      data.observaciones = body.observaciones ? String(body.observaciones) : null
    if (body.origenTipo !== undefined) data.origenTipo = body.origenTipo || null
    if (body.origenId !== undefined) data.origenId = body.origenId || null
    if (body.origenCodigo !== undefined) data.origenCodigo = body.origenCodigo || null
    if (body.solicitadoPor !== undefined) data.solicitadoPor = body.solicitadoPor || null
    if (body.materiales !== undefined)
      data.materiales = materialesRaw.length > 0 ? JSON.stringify(materialesRaw) : null
    if (totalEstimado !== undefined) data.totalEstimado = totalEstimado

    const updated = await db.solicitudCompra.update({ where: { id }, data })

    return NextResponse.json({
      ...updated,
      materiales: safeParseMateriales(updated.materiales),
    })
  } catch (error) {
    console.error('Error updating solicitud de compra:', error)
    return handlePrismaError(error)
  }
}

// DELETE - Eliminar solicitud
export async function DELETE(_request: NextRequest, { params }: Context) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  try {
    const { id } = await params
    const existing = await db.solicitudCompra.findUnique({ where: { id } })
    if (!existing) return apiError('Solicitud no encontrada', 404)

    await db.solicitudCompra.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting solicitud de compra:', error)
    return handlePrismaError(error)
  }
}
