import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'
import { apiError, handlePrismaError } from '@/lib/api-helpers'
import type { MaterialSolicitud } from '@/lib/email-solicitud-compra'

// Transiciones válidas de estado
const ESTADO_TRANSITIONS: Record<string, string[]> = {
  Solicitado: ['En Proceso', 'Rechazado', 'Anulada'],
  'En Proceso': ['Comprado', 'Anulada'],
  Comprado: ['Anulada'],
  Rechazado: [],
  Anulada: [],
}

export const dynamic = 'force-dynamic'
export const maxDuration = 30

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

function safeParseLinks(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === 'string')
    }
    return []
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
      links: safeParseLinks(solicitud.links),
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

    // Permiso de edición: solo admin, supervisor o el creador pueden editar
    const isOwner = existing.solicitadoPorId === session.userId
    const canEdit = session.user.rol === 'admin' || session.user.rol === 'supervisor' || isOwner
    if (!canEdit) {
      return apiError('Sin permisos para editar esta solicitud', 403)
    }

    // Bloquear edición si la solicitud está en flujo de aprobación (no es DRAFT/Solicitado)
    // Solo admin puede editar en cualquier estado
    if (session.user.rol !== 'admin') {
      const etapa = existing.etapaAprobacion
      if (etapa === 'Aprobada Supervisor' || etapa === 'Aprobada Admin' || existing.estado === 'Rechazada' || existing.estado === 'Comprado') {
        return apiError('No se puede editar una solicitud en esta etapa. Solo el administrador puede hacerlo.', 403)
      }
    }

    // Validación de cambio de etapa: solo admin puede cambiar etapaAprobacion
    if (body.etapaAprobacion !== undefined && session.user.rol !== 'admin' && session.user.rol !== 'supervisor') {
      return apiError('Sin permisos para cambiar etapa', 403)
    }

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
    // Validar transición de estado (solo si se intenta cambiar)
    if (body.estado !== undefined && body.estado !== existing.estado) {
      const allowed = ESTADO_TRANSITIONS[existing.estado]
      if (!allowed || !allowed.includes(String(body.estado))) {
        return apiError(`No se puede cambiar de "${existing.estado}" a "${body.estado}". Transiciones permitidas: ${allowed ? allowed.join(', ') : 'ninguna'}`, 400)
      }
      data.estado = String(body.estado)
    }
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
    if (body.links !== undefined) {
      data.links = Array.isArray(body.links) && body.links.length > 0
        ? JSON.stringify(body.links.map((l: any) => String(l || '').trim()).filter((l: string) => l !== ''))
        : null
    }
    if (totalEstimado !== undefined) data.totalEstimado = totalEstimado
    if (body.etapaAprobacion !== undefined) data.etapaAprobacion = body.etapaAprobacion || null

    const updated = await db.solicitudCompra.update({ where: { id }, data })

    return NextResponse.json({
      ...updated,
      materiales: safeParseMateriales(updated.materiales),
      links: safeParseLinks(updated.links),
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

    // Solo admin puede eliminar solicitudes que no sean propias y estén en flujo
    const isOwner = existing.solicitadoPorId === session.userId
    if (session.user.rol !== 'admin' && !isOwner) {
      return apiError('Sin permisos para eliminar esta solicitud', 403)
    }
    // No eliminar si está aprobada o comprada
    if (existing.estado === 'Comprado' || existing.etapaAprobacion === 'Aprobada Admin') {
      return apiError('No se puede eliminar una solicitud aprobada o comprada', 400)
    }

    await db.solicitudCompra.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting solicitud de compra:', error)
    return handlePrismaError(error)
  }
}
