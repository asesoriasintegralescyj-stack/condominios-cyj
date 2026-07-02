/**
 * API para registrar una ronda escaneada
 * Sistema de Gestión de Condominios
 *
 * Acepta:
 *   - { codigo }                → busca por Ronda.codigo
 *   - { etapa, post }           → busca por Ronda.qrCodigo URL pattern /ronda/{ETAPA}/{POST}
 *   - { codigo: "<url>" }       → si codigo es una URL /ronda/{ETAPA}/{POST}, extrae etapa/post y busca por qrCodigo
 *
 * Registra:
 *   - rondaId (vínculo a la ronda — de ahí se deriva etapa/post/qrCodigo)
 *   - usuarioId, usuarioNombre
 *   - fecha (YYYY-MM-DD), hora (HH:MM)
 *   - ubicacion (texto legible: "Etapa {ETAPA} · Posto #{POST}")
 *   - observaciones, latitud, longitud (opcionales)
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

/**
 * Extrae { etapa, post } desde una URL o path del estilo /ronda/{ETAPA}/{POST}
 */
function extractEtapaPost(text: string): { etapa: string; post: string } | null {
  if (!text) return null
  try {
    let parts: string[]
    if (text.startsWith('http')) {
      const url = new URL(text)
      parts = url.pathname.split('/').filter(Boolean)
    } else {
      parts = text.split('/').filter(Boolean)
    }
    if (parts.length >= 3 && parts[0].toLowerCase() === 'ronda') {
      return { etapa: parts[1].toUpperCase(), post: parts[2] }
    }
  } catch {
    return null
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { codigo, etapa, post, ubicacion, latitud, longitud, observaciones } = body

    // Resolver la ronda: por codigo directo, o por etapa+post, o extrayendo de una URL
    let ronda: Awaited<ReturnType<typeof db.ronda.findFirst>> = null

    if (codigo && typeof codigo === 'string') {
      // 1. Intentar lookup directo por codigo
      ronda = await db.ronda.findUnique({
        where: { codigo: codigo.trim() },
      })

      // 2. Si no se encuentra y el codigo es una URL /ronda/{ETAPA}/{POST},
      //    buscar por qrCodigo que coincida con esa ruta
      if (!ronda) {
        const ep = extractEtapaPost(codigo)
        if (ep) {
          // Buscar rondas cuyo qrCodigo termine en /ronda/{ETAPA}/{POST}
          // Prisma no soporta regex nativas en PostgreSQL sin extensión, así que
          // hacemos contains case-insensitive aproximado y filtramos en memoria.
          const candidates = await db.ronda.findMany({
            where: {
              qrCodigo: { contains: `/ronda/${ep.etapa}/`, mode: 'insensitive' },
            },
          })
          ronda =
            candidates.find((r) => {
              const rEp = extractEtapaPost(r.qrCodigo || '')
              return rEp && rEp.etapa === ep.etapa && rEp.post === ep.post
            }) || null
        }
      }
    } else if (etapa && post) {
      // 3. Lookup directo por etapa+post: buscar rondas cuyo qrCodigo coincida
      const etapaUpper = String(etapa).toUpperCase()
      const postStr = String(post)
      const candidates = await db.ronda.findMany({
        where: {
          qrCodigo: { contains: `/ronda/${etapaUpper}/`, mode: 'insensitive' },
        },
      })
      ronda =
        candidates.find((r) => {
          const rEp = extractEtapaPost(r.qrCodigo || '')
          return rEp && rEp.etapa === etapaUpper && rEp.post === postStr
        }) || null
    }

    if (!ronda) {
      return NextResponse.json(
        { error: 'Código de ronda no válido. No se encontró una ronda activa para los datos escaneados.' },
        { status: 404 },
      )
    }

    if (!ronda.activo) {
      return NextResponse.json({ error: 'Esta ronda está inactiva' }, { status: 400 })
    }

    // Extraer etapa/post de la ronda encontrada (para la ubicación del registro)
    const ep = extractEtapaPost(ronda.qrCodigo || '')
    const etapaLegible = ep?.etapa || ''
    const postLegible = ep?.post || ''

    // Construir ubicación legible para el registro
    const ubicacionLegible =
      ubicacion ||
      (ep
        ? `Etapa ${etapaLegible} · Posto #${postLegible}`
        : ronda.ubicacion)

    // Registrar la ronda con la fecha y hora actual del servidor
    const now = new Date()
    const fecha = now.toISOString().split('T')[0]
    const hora = now.toTimeString().split(' ')[0].substring(0, 5)

    const registro = await db.registroRonda.create({
      data: {
        rondaId: ronda.id,
        usuarioId: user.id,
        usuarioNombre: `${user.nombre} ${user.apellido || ''}`.trim(),
        fecha,
        hora,
        ubicacion: ubicacionLegible,
        latitud: latitud ? parseFloat(latitud) : null,
        longitud: longitud ? parseFloat(longitud) : null,
        observaciones,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Ronda registrada exitosamente',
      registro,
      ronda: {
        id: ronda.id,
        nombre: ronda.nombre,
        ubicacion: ronda.ubicacion,
        qrCodigo: ronda.qrCodigo,
        etapa: etapaLegible,
        post: postLegible,
      },
    })
  } catch (error) {
    console.error('Error registrando ronda:', error)
    return NextResponse.json({ error: 'Error al registrar ronda' }, { status: 500 })
  }
}
