import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ============================================
// TEMPLATES DE CARTAS
// ============================================
const CARTA_TEMPLATES: Record<string, { asunto: string; contenido: string }> = {
  Recordatorio: {
    asunto: 'Recordatorio de pago - Gastos Comunes',
    contenido: `Estimado/a {nombre} {apellido},

Le recordamos que mantiene un saldo pendiente de {totalPagar} correspondiente a gastos comunes del período {periodo}.

Le solicitamos regularizar su situación de pago a la brevedad posible.

Si ya realizó el pago, por favor hacer caso omiso de este mensaje.

Atentamente,
Asesorías Integrales CyJ
Administración Condominio Laguna Norte`
  },
  Aviso: {
    asunto: 'Aviso de morosidad - Gastos Comunes',
    contenido: `Estimado/a {nombre} {apellido},

Por medio del presente, le informamos que su cuenta registra una deuda de {totalPagar} con {diasMora} días de mora.

El saldo detallado es el siguiente:
- Saldo anterior: {saldoAnterior}
- Cargos del mes: {cargosMes}
- Intereses por mora: {interesesMora}
- Total a pagar: {totalPagar}

Le solicitamos ponerse al día con sus pagos en un plazo de 5 días hábiles para evitar recargos adicionales.

Atentamente,
Asesorías Integrales CyJ
Administración Condominio Laguna Norte`
  },
  UltimoAviso: {
    asunto: 'ÚLTIMO AVISO - Cobro de Gastos Comunes',
    contenido: `Estimado/a {nombre} {apellido},

Esta es la última notificación antes de iniciar acciones legales por el cobro de {totalPagar} correspondientes a gastos comunes impagos.

Su deuda acumula {diasMora} días de mora y los intereses continúan generándose.

Detalle de la deuda:
- Saldo anterior: {saldoAnterior}
- Cargos pendientes: {cargosMes}
- Intereses acumulados: {interesesMora}
- TOTAL A PAGAR: {totalPagar}

Dispone de un plazo de 3 días hábiles para regularizar su situación. De lo contrario, se procederá con las acciones legales correspondientes de conformidad con la ley.

Atentamente,
Asesorías Integrales CyJ
Administración Condominio Laguna Norte`
  },
  CobroJudicial: {
    asunto: 'NOTIFICACIÓN - Inicio de Cobro Judicial',
    contenido: `NOTIFICACIÓN FORMAL

De: Asesorías Integrales CyJ
Para: {nombre} {apellido}
Unidad: {unidad}
Fecha: {fecha}

Por medio de la presente se le notifica que, ante la falta de pago de gastos comunes por un monto de {totalPagar} y {diasMora} días de mora, se ha procedido a derivar su caso al departamento legal para el inicio de las acciones de cobro judicial correspondientes.

El condominio se reserva el derecho de ejercer todas las acciones legales disponibles para el cobro de la deuda, incluyendo pero no limitado a:
- Cobro ejecutivo
- Embargo de bienes
- Reporte a centrales de riesgo

Monto total adeudado: {totalPagar}
Concepto: Gastos comunes impagos {periodo}
Intereses por mora: {interesesMora}

Sin otro particular,

Asesorías Integrales CyJ
Administración Condominio Laguna Norte
Av. La Montaña Norte 3650, Lampa
Tel: +56 964 650 643`
  }
}

// ============================================
// GET - Listar cartas de cobranza
// ============================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const residenteId = searchParams.get('residenteId')
    const tipo = searchParams.get('tipo')
    const estado = searchParams.get('estado')

    const where: Record<string, unknown> = {}
    if (residenteId) where.residenteId = residenteId
    if (tipo) where.tipo = tipo
    if (estado) where.estado = estado

    const cartas = await db.cartaCobranza.findMany({
      where,
      include: {
        residente: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            unidad: true,
            etapa: true,
            telefono: true,
            email: true
          }
        }
      },
      orderBy: { fechaGeneracion: 'desc' }
    })

    return NextResponse.json({ cartas })
  } catch (error) {
    console.error('Error fetching cartas:', error)
    return NextResponse.json({ error: 'Error al obtener cartas' }, { status: 500 })
  }
}

// ============================================
// POST - Generar carta de cobranza
// ============================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tipo, residenteId, deudasIncluidas, metodoEnvio } = body

    if (!residenteId) {
      return NextResponse.json({ error: 'Residente requerido' }, { status: 400 })
    }

    // Obtener residente
    const residente = await db.residente.findUnique({
      where: { id: residenteId }
    })

    if (!residente) {
      return NextResponse.json({ error: 'Residente no encontrado' }, { status: 404 })
    }

    // Obtener deudas del residente
    const deudas = await db.deuda.findMany({
      where: {
        residenteId,
        estado: { in: ['Pendiente', 'Parcial'] }
      }
    })

    if (deudas.length === 0) {
      return NextResponse.json({ error: 'El residente no tiene deudas pendientes' }, { status: 400 })
    }

    // Calcular totales
    const totalPagar = deudas.reduce((sum, d) => sum + d.montoTotal, 0)
    const saldoAnterior = deudas
      .filter(d => d.periodo !== new Date().toISOString().slice(0, 7))
      .reduce((sum, d) => sum + d.montoTotal, 0)
    const cargosMes = deudas
      .filter(d => d.periodo === new Date().toISOString().slice(0, 7))
      .reduce((sum, d) => sum + d.montoOriginal, 0)
    const interesesMora = deudas.reduce((sum, d) => sum + d.montoInteres, 0)
    const diasMora = Math.max(...deudas.map(d => d.diasMora), 0)
    const periodo = deudas.map(d => d.periodo).join(', ')

    // Obtener template y personalizar
    const template = CARTA_TEMPLATES[tipo] || CARTA_TEMPLATES.Recordatorio
    const contenido = template.contenido
      .replace(/{nombre}/g, residente.nombre || '')
      .replace(/{apellido}/g, residente.apellido || '')
      .replace(/{unidad}/g, residente.unidad || '')
      .replace(/{totalPagar}/g, '$' + totalPagar.toLocaleString('es-CL'))
      .replace(/{saldoAnterior}/g, '$' + saldoAnterior.toLocaleString('es-CL'))
      .replace(/{cargosMes}/g, '$' + cargosMes.toLocaleString('es-CL'))
      .replace(/{interesesMora}/g, '$' + interesesMora.toLocaleString('es-CL'))
      .replace(/{diasMora}/g, String(diasMora))
      .replace(/{periodo}/g, periodo)
      .replace(/{fecha}/g, new Date().toLocaleDateString('es-CL'))

    const asunto = template.asunto
      .replace(/{periodo}/g, periodo)

    // Contar cartas previas del residente
    const cartasPrevias = await db.cartaCobranza.count({
      where: { residenteId }
    })

    // Crear carta
    const carta = await db.cartaCobranza.create({
      data: {
        tipo: tipo || 'Recordatorio',
        numeroCarta: cartasPrevias + 1,
        asunto,
        contenido,
        fechaGeneracion: new Date().toISOString().split('T')[0],
        metodoEnvio: metodoEnvio || 'Email',
        estado: 'Generada',
        residenteId,
        deudasIncluidas: JSON.stringify(deudasIncluidas || deudas.map(d => d.id))
      },
      include: {
        residente: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            unidad: true,
            etapa: true,
            telefono: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({ carta })
  } catch (error) {
    console.error('Error generating carta:', error)
    return NextResponse.json({ error: 'Error al generar carta' }, { status: 500 })
  }
}

// ============================================
// PUT - Actualizar estado de carta
// ============================================
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, estado, fechaEnvio } = body

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    const carta = await db.cartaCobranza.update({
      where: { id },
      data: {
        estado: estado || 'Enviada',
        fechaEnvio: fechaEnvio || new Date().toISOString().split('T')[0]
      },
      include: {
        residente: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            unidad: true,
            etapa: true,
            telefono: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({ carta })
  } catch (error) {
    console.error('Error updating carta:', error)
    return NextResponse.json({ error: 'Error al actualizar carta' }, { status: 500 })
  }
}
