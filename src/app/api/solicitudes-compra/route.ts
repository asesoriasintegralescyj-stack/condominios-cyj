import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError, handlePrismaError } from '@/lib/api-helpers'
import {
  sendSolicitudCompraEmail,
  type MaterialSolicitud,
} from '@/lib/email-solicitud-compra'

const CONDOMINIO_LAGUNA_NORTE = 'cmo9f3x7j0000ktyeb0rzhwt9'

// GET - Listar solicitudes de compra con filtros
export async function GET(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''
    const estado = searchParams.get('estado') || ''
    const prioridad = searchParams.get('prioridad') || ''
    const origenTipo = searchParams.get('origenTipo') || ''

    const where: any = {
      condominioId: CONDOMINIO_LAGUNA_NORTE,
    }

    if (estado) where.estado = estado
    if (prioridad) where.prioridad = prioridad
    if (origenTipo) where.origenTipo = origenTipo

    if (search) {
      where.OR = [
        { codigo: { contains: search, mode: 'insensitive' } },
        { titulo: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } },
        { solicitadoPor: { contains: search, mode: 'insensitive' } },
      ]
    }

    const solicitudes = await db.solicitudCompra.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    // Parse materiales JSON for client convenience
    const parsed = solicitudes.map((s) => ({
      ...s,
      materiales: s.materiales ? safeParseMateriales(s.materiales) : [],
    }))

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('Error fetching solicitudes de compra:', error)
    return handlePrismaError(error)
  }
}

// POST - Crear solicitud de compra y enviar email
export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  try {
    const body = await request.json()

    // Generar codigo SC-XXXX
    const last = await db.solicitudCompra.findFirst({
      orderBy: { codigo: 'desc' },
    })
    let nextNum = 1
    if (last && last.codigo) {
      const match = last.codigo.match(/SC-(\d+)/i)
      if (match) nextNum = parseInt(match[1], 10) + 1
    }
    const codigo = `SC-${String(nextNum).padStart(4, '0')}`

    // Normalize materiales
    const materialesRaw: MaterialSolicitud[] = Array.isArray(body.materiales)
      ? body.materiales.map((m: any) => ({
          nombre: String(m.nombre ?? m.descripcion ?? '').trim(),
          cantidad: Number(m.cantidad) || 0,
          unidad: String(m.unidad ?? 'unidad').trim(),
          precioEstimado: Number(m.precioEstimado ?? m.precioUnit ?? 0) || 0,
          total: Number(m.total ?? (Number(m.cantidad) || 0) * (Number(m.precioEstimado ?? m.precioUnit ?? 0) || 0)) || 0,
        }))
      : []

    const totalEstimado =
      body.totalEstimado != null
        ? Number(body.totalEstimado)
        : materialesRaw.reduce((acc, m) => acc + (m.total || 0), 0)

    const solicitadoPor =
      body.solicitadoPor ??
      (session.user
        ? `${session.user.nombre}${session.user.apellido ? ' ' + session.user.apellido : ''}`.trim()
        : null)

    const data = {
      codigo,
      titulo: String(body.titulo || '').trim(),
      descripcion: body.descripcion ? String(body.descripcion) : null,
      estado: 'Solicitado',
      prioridad: body.prioridad || 'Media',
      origenTipo: body.origenTipo || null,
      origenId: body.origenId || null,
      origenCodigo: body.origenCodigo || null,
      materiales: materialesRaw.length > 0 ? JSON.stringify(materialesRaw) : null,
      totalEstimado,
      solicitadoPor,
      solicitadoPorId: body.solicitadoPorId || session.user.id,
      fechaEspera: body.fechaEspera ? String(body.fechaEspera) : null,
      proveedorSugerido: body.proveedorSugerido ? String(body.proveedorSugerido) : null,
      observaciones: body.observaciones ? String(body.observaciones) : null,
      emailEnviado: false,
      condominioId: CONDOMINIO_LAGUNA_NORTE,
    }

    if (!data.titulo) {
      return apiError('El título es obligatorio', 400)
    }

    const solicitud = await db.solicitudCompra.create({ data })

    // Intentar enviar email (no falla si SMTP no está configurado)
    const emailResult = await sendSolicitudCompraEmail({
      codigo: solicitud.codigo,
      titulo: solicitud.titulo,
      descripcion: solicitud.descripcion,
      prioridad: solicitud.prioridad,
      estado: solicitud.estado,
      materiales: materialesRaw,
      totalEstimado: solicitud.totalEstimado,
      solicitadoPor: solicitud.solicitadoPor,
      fechaEspera: solicitud.fechaEspera,
      proveedorSugerido: solicitud.proveedorSugerido,
      observaciones: solicitud.observaciones,
      origenCodigo: solicitud.origenCodigo,
      origenTipo: solicitud.origenTipo,
    })

    let updated = solicitud
    if (emailResult.ok) {
      updated = await db.solicitudCompra.update({
        where: { id: solicitud.id },
        data: {
          emailEnviado: true,
          emailEnviadoA: 'administracionlagunanorte@gmail.com',
          emailFechaEnvio: new Date(),
        },
      })
    } else if (emailResult.skipped) {
      console.warn(
        `[SolicitudCompra ${codigo}] Email omitido: ${emailResult.error || 'SMTP no configurado'}`
      )
    } else {
      console.error(
        `[SolicitudCompra ${codigo}] Error enviando email: ${emailResult.error}`
      )
    }

    return NextResponse.json(
      {
        ...updated,
        materiales: materialesRaw,
        emailEnviado: updated.emailEnviado,
        emailSkipped: emailResult.skipped === true,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating solicitud de compra:', error)
    return handlePrismaError(error)
  }
}

function safeParseMateriales(raw: string): MaterialSolicitud[] {
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
    return []
  } catch {
    return []
  }
}
