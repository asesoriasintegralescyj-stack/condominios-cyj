import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

// Categorías predeterminadas basadas en la Ley 21.442 de Copropiedad Inmobiliaria de Chile
const CATEGORIAS_DEFAULT = [
  // Documentos Legales
  {
    nombre: 'Reglamento de Copropiedad',
    codigo: 'LEY-001',
    descripcion: 'Documento legal que establece las normas de convivencia, derechos y obligaciones de los copropietarios del condominio. Debe estar inscrito en el Conservador de Bienes Raices.',
    tipo: 'Legal',
    obligatorio: true,
    articuloLey: 'Art. 8 Ley 21.442',
    orden: 1
  },
  {
    nombre: 'Escritura de Constitución',
    codigo: 'LEY-002',
    descripcion: 'Escritura publica mediante la cual se constituyo legalmente el condominio ante notario. Contiene los estatutos y reglas originales del condominio.',
    tipo: 'Legal',
    obligatorio: true,
    articuloLey: 'Art. 7 Ley 21.442',
    orden: 2
  },
  {
    nombre: 'Inscripción Conservador',
    codigo: 'LEY-003',
    descripcion: 'Certificado de inscripcion del condominio en el Registro de Hipotecas y Gravamenes del Conservador de Bienes Raices. Acredita la existencia legal del condominio.',
    tipo: 'Legal',
    obligatorio: true,
    articuloLey: 'Art. 8 Ley 21.442',
    orden: 3
  },
  {
    nombre: 'Acta de Asamblea Constitutiva',
    codigo: 'LEY-004',
    descripcion: 'Acta de la primera asamblea de copropietarios donde se aprobo la constitucion del condominio, se eligio el comite de administracion y se aprobaron los reglamentos.',
    tipo: 'Legal',
    obligatorio: true,
    articuloLey: 'Art. 9 Ley 21.442',
    orden: 4
  },
  
  // Planes de Seguridad
  {
    nombre: 'Plan de Emergencia',
    codigo: 'SEG-001',
    descripcion: 'Documento que establece los procedimientos ante siniestros como incendios, sismos, tsunamis y otras emergencias. Incluye responsabilidades, protocolos de actuacion y recursos disponibles.',
    tipo: 'Seguridad',
    obligatorio: true,
    articuloLey: 'Art. 40 Ley 21.442',
    fechaLimiteDias: 365,
    orden: 10
  },
  {
    nombre: 'Plan de Evacuación',
    codigo: 'SEG-002',
    descripcion: 'Planilla con rutas de evacuacion señalizadas, puntos de encuentro, zonas de seguridad y procedimientos para desalojar el condominio en caso de emergencia.',
    tipo: 'Seguridad',
    obligatorio: true,
    articuloLey: 'Art. 40 Ley 21.442',
    fechaLimiteDias: 365,
    orden: 11
  },
  {
    nombre: 'Certificado Bomberos',
    codigo: 'SEG-003',
    descripcion: 'Certificado emitido por el Cuerpo de Bomberos que acredita que el plan de emergencia y las instalaciones de seguridad cumplen con la normativa vigente.',
    tipo: 'Seguridad',
    obligatorio: true,
    articuloLey: 'Art. 40 Ley 21.442',
    fechaLimiteDias: 730,
    orden: 12
  },
  {
    nombre: 'Planos del Condominio',
    codigo: 'SEG-004',
    descripcion: 'Planos arquitectonicos actualizados del condominio que muestran areas comunes, rutas de evacuacion, extintores, hidrantes y puntos de reunion.',
    tipo: 'Seguridad',
    obligatorio: true,
    articuloLey: 'Art. 40 Ley 21.442',
    orden: 13
  },
  
  // Documentos Reglamentarios
  {
    nombre: 'Reglamento Interno',
    codigo: 'REG-001',
    descripcion: 'Reglamento interno de convivencia que detalla las normas de uso de areas comunes, horarios, normas de ruido, mascotas, estacionamientos y sanciones por incumplimiento.',
    tipo: 'Reglamentario',
    obligatorio: true,
    orden: 20
  },
  {
    nombre: 'Normas de Uso Áreas Comunes',
    codigo: 'REG-002',
    descripcion: 'Normas especificas para el uso de cada area comun: piscina, quincho, gimnasio, sala de eventos, multicancha. Incluye horarios, capacidad maxima y cuidados.',
    tipo: 'Reglamentario',
    obligatorio: false,
    orden: 21
  },
  {
    nombre: 'Política de Reservas',
    codigo: 'REG-003',
    descripcion: 'Procedimiento y normas para reservar espacios comunes como quinchos, salas de eventos y areas de picnic. Incluye tarifas, plazos y cancelaciones.',
    tipo: 'Reglamentario',
    obligatorio: false,
    orden: 22
  },
  
  // Documentos Internos
  {
    nombre: 'Registro de Copropietarios',
    codigo: 'INT-001',
    descripcion: 'Listado actualizado de todos los copropietarios con sus datos de contacto: nombre, rut, telefono, email, numero de departamento y porcentaje de participacion.',
    tipo: 'Interno',
    obligatorio: true,
    articuloLey: 'Art. 28 Ley 21.442',
    orden: 30
  },
  {
    nombre: 'Libro de Actas',
    codigo: 'INT-002',
    descripcion: 'Registro de todas las actas de asambleas ordinarias y extraordinarias, y sesiones del comite de administracion. Debe estar foliado y firmado.',
    tipo: 'Interno',
    obligatorio: true,
    articuloLey: 'Art. 23 Ley 21.442',
    orden: 31
  },
  {
    nombre: 'Estados Financieros',
    codigo: 'INT-003',
    descripcion: 'Estados financieros anuales del condominio: balance general, estado de resultados, flujo de efectivo y notas. Deben estar auditados o revisados.',
    tipo: 'Interno',
    obligatorio: true,
    fechaLimiteDias: 365,
    orden: 32
  },
  {
    nombre: 'Presupuesto Anual',
    codigo: 'INT-004',
    descripcion: 'Presupuesto anual de ingresos y gastos del condominio aprobado por la asamblea de copropietarios. Incluye gastos comunes, fondo de reserva y mantenciones.',
    tipo: 'Interno',
    obligatorio: true,
    fechaLimiteDias: 365,
    orden: 33
  },
  {
    nombre: 'Inventario de Bienes',
    codigo: 'INT-005',
    descripcion: 'Inventario detallado de todos los bienes del condominio: muebles, herramientas, equipos, maquinarias y elementos de areas comunes con su valor y estado.',
    tipo: 'Interno',
    obligatorio: false,
    fechaLimiteDias: 365,
    orden: 34
  },
  {
    nombre: 'Contrato de Administración',
    codigo: 'INT-006',
    descripcion: 'Contrato vigente con la empresa administradora del condominio. Especifica obligaciones, honorarios, plazo y facultades del administrador.',
    tipo: 'Interno',
    obligatorio: true,
    orden: 35
  },
  {
    nombre: 'Póliza de Seguros',
    codigo: 'INT-007',
    descripcion: 'Poliza de seguros vigente que cubre danos a edificaciones, areas comunes y responsabilidad civil del condominio. Debe estar al dia con las primas pagadas.',
    tipo: 'Interno',
    obligatorio: true,
    fechaLimiteDias: 365,
    orden: 36
  }
]

// GET - Get all categories
export async function GET(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  try {
    const searchParams = request.nextUrl.searchParams
    const condominioId = searchParams.get('condominioId') || ''
    const tipo = searchParams.get('tipo') || ''
    const createDefaults = searchParams.get('createDefaults') === 'true'

    let categorias = await db.categoriaCumplimiento.findMany({
      where: {
        AND: [
          condominioId ? { condominioId: { equals: condominioId } } : {},
          tipo ? { tipo: { equals: tipo } } : {},
          { activo: true }
        ]
      },
      include: {
        _count: {
          select: { documentos: true }
        }
      },
      orderBy: { orden: 'asc' }
    })

    // If no categories exist and createDefaults is true, create default categories
    if (categorias.length === 0 && condominioId && createDefaults) {
      categorias = await Promise.all(
        CATEGORIAS_DEFAULT.map(cat =>
          db.categoriaCumplimiento.create({
            data: {
              ...cat,
              condominioId
            },
            include: {
              _count: {
                select: { documentos: true }
              }
            }
          })
        )
      )
    }

    return NextResponse.json(categorias)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: 'Error fetching categories' }, { status: 500 })
  }
}

// POST - Create new category
export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'configuracion.editar')) {
    return apiError('Sin permisos', 403)
  }
  try {
    const data = await request.json()

    const categoria = await db.categoriaCumplimiento.create({
      data: {
        nombre: data.nombre,
        codigo: data.codigo || null,
        descripcion: data.descripcion || null,
        tipo: data.tipo || 'Legal',
        obligatorio: data.obligatorio ?? true,
        orden: data.orden || 0,
        articuloLey: data.articuloLey || null,
        fechaLimiteDias: data.fechaLimiteDias || null,
        condominioId: data.condominioId || null,
      }
    })

    return NextResponse.json(categoria)
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json({ error: 'Error creating category' }, { status: 500 })
  }
}

// PUT - Update category
export async function PUT(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'configuracion.editar')) {
    return apiError('Sin permisos', 403)
  }
  try {
    const data = await request.json()

    if (!data.id) {
      return NextResponse.json({ error: 'Category ID required' }, { status: 400 })
    }

    const categoria = await db.categoriaCumplimiento.update({
      where: { id: data.id },
      data: {
        nombre: data.nombre,
        codigo: data.codigo || null,
        descripcion: data.descripcion || null,
        tipo: data.tipo,
        obligatorio: data.obligatorio,
        orden: data.orden,
        articuloLey: data.articuloLey || null,
        fechaLimiteDias: data.fechaLimiteDias || null,
        activo: data.activo ?? true,
      }
    })

    return NextResponse.json(categoria)
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json({ error: 'Error updating category' }, { status: 500 })
  }
}

// DELETE - Delete category
export async function DELETE(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'configuracion.editar')) {
    return apiError('Sin permisos', 403)
  }
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Category ID required' }, { status: 400 })
    }

    // Check if category has documents
    const documentosCount = await db.documentoCumplimiento.count({
      where: { categoriaId: id }
    })

    if (documentosCount > 0) {
      // Soft delete - mark as inactive
      await db.categoriaCumplimiento.update({
        where: { id },
        data: { activo: false }
      })
      return NextResponse.json({ success: true, message: 'Category deactivated (has documents)' })
    }

    // Hard delete if no documents
    await db.categoriaCumplimiento.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json({ error: 'Error deleting category' }, { status: 500 })
  }
}
