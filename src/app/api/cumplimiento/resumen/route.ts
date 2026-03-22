import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Get compliance summary
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const condominioId = searchParams.get('condominioId') || ''

    if (!condominioId) {
      return NextResponse.json({ error: 'Condominio ID required' }, { status: 400 })
    }

    // Verificar que el condominio existe
    const condominio = await db.condominio.findUnique({
      where: { id: condominioId }
    })

    if (!condominio) {
      // Retornar datos vacíos si el condominio no existe
      return NextResponse.json({
        resumen: {
          id: '',
          condominioId,
          totalRequisitos: 0,
          requisitosCumplidos: 0,
          requisitosPendientes: 0,
          requisitosVencidos: 0,
          porcentajeGeneral: 0,
          porcentajeLegal: 0,
          porcentajeReglamentario: 0,
          porcentajeInterno: 0,
          porcentajeSeguridad: 0,
          alertasActivas: 0,
          ultimaActualizacion: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        },
        documentosProximosVencer: [],
        documentosVencidos: [],
        categorias: []
      })
    }

    // Get or create summary
    let resumen = await db.resumenCumplimiento.findUnique({
      where: { condominioId }
    })

    if (!resumen) {
      // Calculate and create summary
      const documentos = await db.documentoCumplimiento.findMany({
        where: { condominioId },
        include: { categoria: true }
      })

      const totalRequisitos = documentos.length
      const requisitosCumplidos = documentos.filter(d => d.cumple && d.estado === 'Aprobado').length
      const requisitosPendientes = documentos.filter(d => d.estado === 'Pendiente').length
      const requisitosVencidos = documentos.filter(d => d.estado === 'Vencido').length
      const porcentajeGeneral = totalRequisitos > 0 ? Math.round((requisitosCumplidos / totalRequisitos) * 100) : 0

      const calcularPorcentaje = (tipo: string) => {
        const docsTipo = documentos.filter(d => d.categoria?.tipo === tipo)
        if (docsTipo.length === 0) return 0
        const cumplidos = docsTipo.filter(d => d.cumple && d.estado === 'Aprobado').length
        return Math.round((cumplidos / docsTipo.length) * 100)
      }

      // Count alerts
      const hoy = new Date()
      const alertasActivas = documentos.filter(d => {
        if (!d.fechaVencimiento) return false
        const vencimiento = new Date(d.fechaVencimiento)
        const diasParaVencer = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
        return diasParaVencer <= 30 || d.estado === 'Vencido'
      }).length

      try {
        resumen = await db.resumenCumplimiento.create({
          data: {
            condominioId,
            totalRequisitos,
            requisitosCumplidos,
            requisitosPendientes,
            requisitosVencidos,
            porcentajeGeneral,
            porcentajeLegal: calcularPorcentaje('Legal'),
            porcentajeReglamentario: calcularPorcentaje('Reglamentario'),
            porcentajeInterno: calcularPorcentaje('Interno'),
            porcentajeSeguridad: calcularPorcentaje('Seguridad'),
            alertasActivas
          }
        })
      } catch (createError) {
        // Si falla la creación, usar valores calculados
        resumen = {
          id: '',
          condominioId,
          totalRequisitos,
          requisitosCumplidos,
          requisitosPendientes,
          requisitosVencidos,
          porcentajeGeneral,
          porcentajeLegal: calcularPorcentaje('Legal'),
          porcentajeReglamentario: calcularPorcentaje('Reglamentario'),
          porcentajeInterno: calcularPorcentaje('Interno'),
          porcentajeSeguridad: calcularPorcentaje('Seguridad'),
          alertasActivas,
          ultimaActualizacion: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }
    }

    // Get documents expiring soon
    const hoy = new Date()
    const en30Dias = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000)

    const documentosProximosVencer = await db.documentoCumplimiento.findMany({
      where: {
        condominioId,
        fechaVencimiento: {
          gte: hoy.toISOString().split('T')[0],
          lte: en30Dias.toISOString().split('T')[0]
        }
      },
      include: { categoria: true },
      orderBy: { fechaVencimiento: 'asc' }
    })

    const documentosVencidos = await db.documentoCumplimiento.findMany({
      where: {
        condominioId,
        fechaVencimiento: { lt: hoy.toISOString().split('T')[0] }
      },
      include: { categoria: true },
      orderBy: { fechaVencimiento: 'desc' }
    })

    // Get category breakdown
    const categorias = await db.categoriaCumplimiento.findMany({
      where: { condominioId, activo: true },
      include: {
        _count: {
          select: { documentos: true }
        }
      },
      orderBy: { orden: 'asc' }
    })

    const categoriasConCumplimiento = await Promise.all(
      categorias.map(async (cat) => {
        const docs = await db.documentoCumplimiento.findMany({
          where: { categoriaId: cat.id }
        })
        const cumplidos = docs.filter(d => d.cumple && d.estado === 'Aprobado').length
        return {
          ...cat,
          documentosCount: docs.length,
          cumplidosCount: cumplidos,
          porcentaje: docs.length > 0 ? Math.round((cumplidos / docs.length) * 100) : 0
        }
      })
    )

    return NextResponse.json({
      resumen,
      documentosProximosVencer,
      documentosVencidos,
      categorias: categoriasConCumplimiento
    })
  } catch (error) {
    console.error('Error fetching compliance summary:', error)
    return NextResponse.json({ error: 'Error fetching compliance summary' }, { status: 500 })
  }
}

// POST - Force recalculate summary
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { condominioId } = data

    if (!condominioId) {
      return NextResponse.json({ error: 'Condominio ID required' }, { status: 400 })
    }

    // Verificar que el condominio existe
    const condominio = await db.condominio.findUnique({
      where: { id: condominioId }
    })

    if (!condominio) {
      return NextResponse.json({ error: 'Condominio not found' }, { status: 404 })
    }

    const documentos = await db.documentoCumplimiento.findMany({
      where: { condominioId },
      include: { categoria: true }
    })

    const totalRequisitos = documentos.length
    const requisitosCumplidos = documentos.filter(d => d.cumple && d.estado === 'Aprobado').length
    const requisitosPendientes = documentos.filter(d => d.estado === 'Pendiente').length
    const requisitosVencidos = documentos.filter(d => d.estado === 'Vencido').length
    const porcentajeGeneral = totalRequisitos > 0 ? Math.round((requisitosCumplidos / totalRequisitos) * 100) : 0

    const calcularPorcentaje = (tipo: string) => {
      const docsTipo = documentos.filter(d => d.categoria?.tipo === tipo)
      if (docsTipo.length === 0) return 0
      const cumplidos = docsTipo.filter(d => d.cumple && d.estado === 'Aprobado').length
      return Math.round((cumplidos / docsTipo.length) * 100)
    }

    const hoy = new Date()
    const alertasActivas = documentos.filter(d => {
      if (!d.fechaVencimiento) return false
      const vencimiento = new Date(d.fechaVencimiento)
      const diasParaVencer = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
      return diasParaVencer <= 30 || d.estado === 'Vencido'
    }).length

    const resumen = await db.resumenCumplimiento.upsert({
      where: { condominioId },
      update: {
        totalRequisitos,
        requisitosCumplidos,
        requisitosPendientes,
        requisitosVencidos,
        porcentajeGeneral,
        porcentajeLegal: calcularPorcentaje('Legal'),
        porcentajeReglamentario: calcularPorcentaje('Reglamentario'),
        porcentajeInterno: calcularPorcentaje('Interno'),
        porcentajeSeguridad: calcularPorcentaje('Seguridad'),
        alertasActivas,
        ultimaActualizacion: new Date()
      },
      create: {
        condominioId,
        totalRequisitos,
        requisitosCumplidos,
        requisitosPendientes,
        requisitosVencidos,
        porcentajeGeneral,
        porcentajeLegal: calcularPorcentaje('Legal'),
        porcentajeReglamentario: calcularPorcentaje('Reglamentario'),
        porcentajeInterno: calcularPorcentaje('Interno'),
        porcentajeSeguridad: calcularPorcentaje('Seguridad'),
        alertasActivas
      }
    })

    return NextResponse.json(resumen)
  } catch (error) {
    console.error('Error recalculating compliance summary:', error)
    return NextResponse.json({ error: 'Error recalculating compliance summary' }, { status: 500 })
  }
}
