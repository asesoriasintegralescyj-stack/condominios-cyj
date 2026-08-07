import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, hasPermission, decrypt } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// GET - List all ordenes de trabajo
// Para rol 'personal': solo devuelve las OT asignadas al trabajador (vía email → Personal.id)
export async function GET(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'ots.ver', session.userPermisos)) {
    return apiError('Sin permisos', 403)
  }
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''

    // Para rol personal, buscar el registro de Personal por email y filtrar OT
    let personalFilter: any = undefined
    if (session.user.rol === 'personal') {
      const allPersonal = await db.personal.findMany({ select: { id: true, email: true, nombre: true } })
      const userEmail = session.user.email.toLowerCase()
      const matched = allPersonal.find((p) => {
        if (!p.email) return false
        const dec = decrypt(p.email).toLowerCase()
        return dec === userEmail
      })

      if (matched) {
        personalFilter = {
          OR: [
            { asignadoId: matched.id },
            { personalOT: { some: { nombre: { contains: matched.nombre } } } },
          ],
        }
      } else {
        return NextResponse.json([])
      }
    }

    const where: any = {}
    if (search) {
      where.OR = [
        { otNum: { contains: search } },
        { titulo: { contains: search } },
        { estado: { contains: search } },
      ]
    }
    if (personalFilter) {
      if (search) {
        where.AND = [personalFilter]
      } else {
        Object.assign(where, personalFilter)
      }
    }

    const ordenes = await db.ordenTrabajo.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      select: {
        id: true, otNum: true, titulo: true, tipo: true, prioridad: true,
        estado: true, ubicacion: true, fechaInicio: true, fechaLimite: true,
        fechaInicioReal: true, fechaFinReal: true, costoEstimado: true,
        costoReal: true, progreso: true, descripcion: true, tiempoEst: true,
        tiempoReal: true, estadoAprobacion: true, formaPago: true, createdAt: true,
        propiedad: { select: { id: true, nombre: true } },
        asignado: { select: { id: true, nombre: true, cargo: true } },
        centroCosto: { select: { id: true, codigo: true, nombre: true } },
        _count: {
          select: { materiales: true, herramientas: true, tareas: true, personalOT: true, documentos: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const ordenesWithCC = ordenes.map(ot => ({
      ...ot,
      fotosAntes: [],
      fotosDespues: [],
    }))

    return NextResponse.json(ordenesWithCC)
  } catch (error) {
    console.error('Error fetching ordenes:', error)
    return NextResponse.json({ error: 'Error fetching ordenes' }, { status: 500 })
  }
}

// POST - Create new orden de trabajo (con proteccion contra duplicados)
export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'ots.crear', session.userPermisos)) {
    return apiError('Sin permisos', 403)
  }
  try {
    const data = await request.json()
    const clientIdempotency = data._clientIdempotency || null

    // ─── PROTECCION CONTRA DUPLICADOS (1): Token de idempotencia del cliente ───
    if (clientIdempotency) {
      const existing = await db.ordenTrabajo.findFirst({
        where: { notas: { contains: clientIdempotency } },
        select: { id: true, otNum: true, titulo: true },
      })
      if (existing) {
        console.log(`[OT Dedup] Solicitud duplicada (${clientIdempotency}), retornando: ${existing.otNum}`)
        return NextResponse.json({ ...existing, _duplicate: true, _message: 'OT ya creada previamente' })
      }
    }

    // ─── PROTECCION CONTRA DUPLICADOS (2): Mismo titulo + mismo usuario en 60 seg ───
    const titulo = (data.titulo || '').trim()
    if (titulo) {
      const sixtySecondsAgo = new Date(Date.now() - 60_000)
      const recentDuplicate = await db.ordenTrabajo.findFirst({
        where: {
          titulo,
          creadoPor: session.user.id,
          createdAt: { gte: sixtySecondsAgo },
        },
        select: { id: true, otNum: true, titulo: true, createdAt: true },
      })
      if (recentDuplicate) {
        console.log(`[OT Dedup] Duplicado temporal (titulo="${titulo}" por ${session.user.id}), retornando: ${recentDuplicate.otNum}`)
        return NextResponse.json({ ...recentDuplicate, _duplicate: true, _message: 'OT ya creada en los ultimos segundos' })
      }
    }

    // ─── CORRELATIVO SEGURO (con retry contra race conditions) ───
    const { generarCorrelativoDB } = await import('@/lib/utils')
    let nextNum: string | undefined
    let retries = 0
    const maxRetries = 3
    while (retries < maxRetries) {
      try {
        nextNum = await generarCorrelativoDB(db, 'OrdenTrabajo', 'OT', 4)
        const exists = await db.ordenTrabajo.findFirst({ where: { otNum: nextNum }, select: { id: true } })
        if (!exists) break
        console.log(`[OT] Correlativo ${nextNum} ya existe, reintentando (${retries + 1}/${maxRetries})`)
        retries++
      } catch (err) {
        console.error(`[OT] Error generando correlativo (intento ${retries + 1}):`, err)
        retries++
      }
    }
    if (!nextNum) {
      return apiError('Error al generar numero de OT despues de varios intentos', 500)
    }

    // Extract resources from data
    const { materiales, herramientas, tareas, personalOT, centroCostoId, _clientIdempotency: _idem, ...otData } = data

    // Notas con token de idempotencia (invisible al usuario)
    const notasBase = otData.notas || ''
    const notasFinal = clientIdempotency
      ? `[IDEM:${clientIdempotency}]${notasBase ? ' ' + notasBase : ''}`
      : notasBase || null

    const orden = await db.ordenTrabajo.create({
      data: {
        otNum: nextNum,
        titulo: otData.titulo,
        tipo: otData.tipo || 'Correctivo',
        prioridad: otData.prioridad || 'Media',
        estado: otData.estado || 'Pendiente',
        ubicacion: otData.ubicacion || null,
        fechaInicio: otData.fechaInicio || null,
        fechaLimite: otData.fechaLimite || null,
        fechaInicioReal: otData.fechaInicioReal || null,
        fechaFinReal: otData.fechaFinReal || null,
        costoEstimado: parseFloat(otData.costoEstimado) || 0,
        costoReal: parseFloat(otData.costoReal) || 0,
        progreso: parseInt(otData.progreso) || 0,
        descripcion: otData.descripcion || null,
        tiempoEst: parseInt(otData.tiempoEst) || 0,
        tiempoReal: parseInt(otData.tiempoReal) || 0,
        valorHora: parseFloat(otData.valorHora) || 0,
        notas: notasFinal,
        propiedadId: otData.propiedadId || null,
        asignadoId: otData.asignadoId || null,
        activoId: otData.activoId || null,
        centroCostoId: centroCostoId || null,
        esRecurrente: otData.esRecurrente || false,
        formaPago: otData.formaPago || null,
        creadoPor: session.user.id,
        creadoPorNombre: session.user.nombre || session.user.email,
        fotosAntes: otData.fotosAntes && otData.fotosAntes.length > 0 ? JSON.stringify(otData.fotosAntes) : null,
        fotosDespues: otData.fotosDespues && otData.fotosDespues.length > 0 ? JSON.stringify(otData.fotosDespues) : null,
        materiales: materiales && materiales.length > 0 ? {
          create: materiales.map((m: any) => ({
            descripcion: m.descripcion,
            cantidad: parseFloat(m.cantidad) || 1,
            unidad: m.unidad || 'unidad',
            precioUnit: parseFloat(m.precioUnit) || 0,
            total: parseFloat(m.total) || 0,
          }))
        } : undefined,
        herramientas: herramientas && herramientas.length > 0 ? {
          create: herramientas.map((h: any) => ({
            nombre: h.nombre,
            cantidad: parseInt(h.cantidad) || 1,
          }))
        } : undefined,
        tareas: tareas && tareas.length > 0 ? {
          create: tareas.map((t: any) => ({
            descripcion: t.descripcion,
            cantidad: parseInt(t.cantidad) || 1,
            estado: t.estado || 'Pendiente',
            ok: t.ok === true,
            noOk: t.noOk === true,
            na: t.na === true,
          }))
        } : undefined,
        personalOT: personalOT && personalOT.length > 0 ? {
          create: personalOT.map((p: any) => ({
            nombre: p.nombre,
            tipo: p.tipo || 'Interno',
            cantidad: parseInt(p.cantidad) || 1,
            precioUnit: parseFloat(p.precioUnit) || 0,
            horasTrabajadas: parseFloat(p.horasTrabajadas) || 0,
            total: parseFloat(p.total) || 0,
            cumple: p.cumple || null,
            observaciones: p.observaciones || null,
          }))
        } : undefined,
      },
      include: {
        propiedad: true, asignado: true, centroCosto: true,
        materiales: true, herramientas: true, tareas: true, personalOT: true,
      }
    })

    console.log(`[OT] Creada ${orden.otNum} por ${session.user.email} (${orden.id})`)
    return NextResponse.json(orden)
  } catch (error) {
    console.error('Error creating orden:', error)
    const errMsg = error instanceof Error ? error.message : String(error)
    if (errMsg.includes('Unique') && errMsg.includes('otNum')) {
      return apiError('Error de concurrencia: numero de OT duplicado. Intente nuevamente.', 409)
    }
    return NextResponse.json({ error: 'Error creating orden', details: errMsg }, { status: 500 })
  }
}
