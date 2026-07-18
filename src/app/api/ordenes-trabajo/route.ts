import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, hasPermission, decrypt } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

// GET - List all ordenes de trabajo
// Para rol 'personal': solo devuelve las OT asignadas al trabajador (vía email → Personal.id)
export async function GET(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'ots.ver')) {
    return apiError('Sin permisos', 403)
  }
  try {
    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get('search') || ''

    // Para rol personal, buscar el registro de Personal por email y filtrar OT
    let personalFilter: any = undefined
    if (session.user.rol === 'personal') {
      // Buscar Personal por email (campos encriptados, hay que buscar todos y filtrar)
      const allPersonal = await db.personal.findMany({ select: { id: true, email: true, nombre: true } })
      const userEmail = session.user.email.toLowerCase()
      const matched = allPersonal.find((p) => {
        if (!p.email) return false
        // El email en Personal está encriptado; lo desencriptamos para comparar
        const dec = decrypt(p.email).toLowerCase()
        return dec === userEmail
      })

      if (matched) {
        // Filtrar OT donde asignadoId = matched.id O donde el trabajador está en personalOT (por nombre)
        personalFilter = {
          OR: [
            { asignadoId: matched.id },
            { personalOT: { some: { nombre: { contains: matched.nombre } } } },
          ],
        }
      } else {
        // Si no se encuentra el Personal, devolver array vacío
        return NextResponse.json([])
      }
    }

    // Construir where combinando búsqueda + filtro de personal
    const where: any = {}
    if (search) {
      where.OR = [
        { otNum: { contains: search } },
        { titulo: { contains: search } },
        { estado: { contains: search } },
      ]
    }
    if (personalFilter) {
      // Combinar: si hay search, anidar con AND
      if (search) {
        where.AND = [personalFilter]
      } else {
        Object.assign(where, personalFilter)
      }
    }

    const ordenes = await db.ordenTrabajo.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      select: {
        id: true,
        otNum: true,
        titulo: true,
        tipo: true,
        prioridad: true,
        estado: true,
        ubicacion: true,
        fechaInicio: true,
        fechaLimite: true,
        fechaInicioReal: true,
        fechaFinReal: true,
        costoEstimado: true,
        costoReal: true,
        progreso: true,
        descripcion: true,
        tiempoEst: true,
        tiempoReal: true,
        estadoAprobacion: true,
        formaPago: true,
        createdAt: true,
        // Relaciones pero con select mínimo para reducir transferencia
        propiedad: { select: { id: true, nombre: true } },
        asignado: { select: { id: true, nombre: true, cargo: true } },
        centroCosto: { select: { id: true, codigo: true, nombre: true } },
        // NO incluir materiales, herramientas, tareas, personalOT en el listado
        // (se cargan individualmente al abrir el detalle)
        _count: {
          select: {
            materiales: true,
            herramientas: true,
            tareas: true,
            personalOT: true,
            documentos: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Mantener centroCosto como objeto (codigo + nombre + id) para que el frontend
    // pueda mostrar el código en la columna y el nombre en el detalle
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

// POST - Create new orden de trabajo
export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'ots.crear')) {
    return apiError('Sin permisos', 403)
  }
  try {
    const data = await request.json()
    
    // Get next OT number using sequence table
    const { generarCorrelativoDB } = await import('@/lib/utils')
    const nextNum = await generarCorrelativoDB(db, 'OrdenTrabajo', 'OT', 4)
    
    // Extract resources from data
    const { materiales, herramientas, tareas, personalOT, centroCostoId, ...otData } = data
    
    const orden = await db.ordenTrabajo.create({
      data: {
        otNum: otData.otNum || nextNum,
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
        notas: otData.notas || null,
        propiedadId: otData.propiedadId || null,
        asignadoId: otData.asignadoId || null,
        activoId: otData.activoId || null,
        centroCostoId: centroCostoId || null,
        esRecurrente: otData.esRecurrente || false,
        formaPago: otData.formaPago || null,
        fotosAntes: otData.fotosAntes && otData.fotosAntes.length > 0 ? JSON.stringify(otData.fotosAntes) : null,
        fotosDespues: otData.fotosDespues && otData.fotosDespues.length > 0 ? JSON.stringify(otData.fotosDespues) : null,
        
        // Create related resources
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
            // Checklist de verificación (LV del PMI): OK / NO OK / N/A
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
        propiedad: true,
        asignado: true,
        centroCosto: true,
        materiales: true,
        herramientas: true,
        tareas: true,
        personalOT: true,
      }
    })
    
    return NextResponse.json(orden)
  } catch (error) {
    console.error('Error creating orden:', error)
    return NextResponse.json({ error: 'Error creating orden' }, { status: 500 })
  }
}
