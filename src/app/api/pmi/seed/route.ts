import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'
import { LV_DATA } from '@/lib/pmi/lv-data'

// POST - Cargar las 20 LVs del PMI (solo admin)
// Si una LV con el mismo código ya existe, se actualiza en lugar de crear.
export async function POST() {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin') {
    return apiError('Solo el administrador puede ejecutar el seed del PMI', 403)
  }
  try {
    let creadas = 0
    let actualizadas = 0
    let errores = 0

    for (const lv of LV_DATA) {
      try {
        const existente = await db.listaVerificacion.findUnique({
          where: { codigo: lv.codigo },
        })

        if (existente) {
          await db.listaVerificacion.update({
            where: { codigo: lv.codigo },
            data: {
              nombre: lv.nombre,
              sector: lv.sector,
              frecuencia: lv.frecuencia,
              responsable: lv.responsable,
              personalRequerido: lv.personalRequerido || null,
              descripcion: lv.descripcion,
              items: lv.items,
              activa: true,
            },
          })
          actualizadas++
        } else {
          await db.listaVerificacion.create({
            data: {
              codigo: lv.codigo,
              nombre: lv.nombre,
              sector: lv.sector,
              frecuencia: lv.frecuencia,
              responsable: lv.responsable,
              personalRequerido: lv.personalRequerido || null,
              descripcion: lv.descripcion,
              items: lv.items,
              activa: true,
            },
          })
          creadas++
        }
      } catch (e) {
        console.error(`Error al crear/actualizar ${lv.codigo}:`, e)
        errores++
      }
    }

    return NextResponse.json({
      message: 'PMI cargado correctamente',
      creadas,
      actualizadas,
      errores,
      total: LV_DATA.length,
    })
  } catch (error) {
    console.error('Error seeding PMI:', error)
    return NextResponse.json({ error: 'Error seeding PMI' }, { status: 500 })
  }
}

// GET - Estado del seed (cuántas LVs cargadas)
export async function GET() {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  try {
    const total = await db.listaVerificacion.count()
    const activas = await db.listaVerificacion.count({ where: { activa: true } })
    const registros = await db.registroLV.count()

    return NextResponse.json({
      lvsTotales: total,
      lvsActivas: activas,
      registrosTotales: registros,
      seedEsperado: LV_DATA.length,
    })
  } catch (error) {
    console.error('Error obteniendo estado PMI:', error)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
