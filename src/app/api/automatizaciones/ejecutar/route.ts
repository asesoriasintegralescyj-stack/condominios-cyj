/**
 * API: /api/automatizaciones/ejecutar
 * POST - Ejecutar una automatización manualmente
 */

import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Cache para ensureTables
let tablesEnsured = false

async function ensureTables() {
  if (tablesEnsured) return

  try {
    await withRetry(() => db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AutomatizacionLog" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
        "automatizacionCodigo" TEXT NOT NULL,
        "tipo" TEXT NOT NULL,
        "resultado" TEXT NOT NULL,
        "mensaje" TEXT,
        "error" TEXT,
        "duracionMs" INTEGER,
        "ejecutadoPor" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "AutomatizacionLog_pkey" PRIMARY KEY ("id")
      );
    `))
    tablesEnsured = true
  } catch (err) {
    console.error('ensureTables error (non-fatal):', err)
    tablesEnsured = true
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession()
    if (!session?.user || session.user.rol !== 'admin') {
      return NextResponse.json({ error: 'Solo admin' }, { status: 403 })
    }

    await ensureTables()

    const body = await request.json()
    const { codigo } = body

    if (!codigo) {
      return NextResponse.json({ error: 'codigo es requerido' }, { status: 400 })
    }

    // Obtener la automatización
    const autos = await withRetry(() => db.$queryRawUnsafe(
      `SELECT * FROM "Automatizacion" WHERE "codigo" = $1 LIMIT 1`,
      codigo
    )) as any[]

    const auto = autos[0]
    if (!auto) {
      return NextResponse.json({ error: 'Automatización no encontrada' }, { status: 404 })
    }

    const startTime = Date.now()
    let resultado = 'exitoso'
    let mensaje = ''
    let errorMsj = ''

    try {
      // Construir URL interna
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000'

      const url = `${baseUrl}${auto.endpoint}`

      // Ejecutar con timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), auto.timeoutMs || 30000)

      const fetchOptions: any = {
        method: auto.metodo || 'GET',
        signal: controller.signal,
        headers: {},
      }

      // Pasar cookies de sesión del usuario actual para que los endpoints
      // internos puedan autenticar con getCurrentSession()
      try {
        const cookieStore = await cookies()
        const sessionCookie = cookieStore.get('condominio_session')
        if (sessionCookie?.value) {
          fetchOptions.headers['Cookie'] = `condominio_session=${sessionCookie.value}`
        }
      } catch {}

      if (auto.requiereAuth && session.user) {
        // Agregar header de autorización interno como fallback
        fetchOptions.headers['X-Internal-Auth'] = 'true'
        fetchOptions.headers['X-User-Id'] = session.user.id
        fetchOptions.headers['X-User-Rol'] = session.user.rol
      }

      if (auto.parametros) {
        try {
          fetchOptions.body = auto.parametros
          fetchOptions.headers['Content-Type'] = 'application/json'
        } catch {}
      }

      const res = await fetch(url, fetchOptions)
      clearTimeout(timeoutId)

      // Leer respuesta como texto primero para evitar error de JSON parse en HTML
      const resText = await res.text()
      let data: any = null
      try {
        data = JSON.parse(resText)
      } catch {
        // La respuesta no es JSON (ej: HTML 404 page)
        resultado = 'error'
        errorMsj = `Endpoint ${auto.endpoint} retornó HTML (status ${res.status}). El endpoint no existe o no retorna JSON.`
        mensaje = errorMsj
      }

      if (resultado !== 'error') {
        if (res.ok) {
          mensaje = typeof data === 'object' ? JSON.stringify(data).slice(0, 500) : String(data).slice(0, 500)
        } else {
          resultado = 'error'
          errorMsj = (data && data.error) ? String(data.error).slice(0, 500) : `HTTP ${res.status}`
          mensaje = errorMsj
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        resultado = 'timeout'
        errorMsj = 'Ejecución excedió el tiempo límite'
        mensaje = errorMsj
      } else {
        resultado = 'error'
        errorMsj = err.message || 'Error de conexión'
        mensaje = errorMsj
      }
    }

    const duracionMs = Date.now() - startTime

    // Actualizar estadísticas
    try {
      if (resultado === 'exitoso') {
        await withRetry(() => db.$executeRawUnsafe(`
          UPDATE "Automatizacion" SET
            "ultimaEjecucion" = CURRENT_TIMESTAMP,
            "ultimoResultado" = $1,
            "ultimoError" = NULL,
            "ejecucionesExitosas" = "ejecucionesExitosas" + 1,
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "codigo" = $2
        `, resultado, codigo))
      } else {
        await withRetry(() => db.$executeRawUnsafe(`
          UPDATE "Automatizacion" SET
            "ultimaEjecucion" = CURRENT_TIMESTAMP,
            "ultimoResultado" = $1,
            "ultimoError" = $2,
            "ejecucionesFallidas" = "ejecucionesFallidas" + 1,
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "codigo" = $3
        `, resultado, errorMsj, codigo))
      }
    } catch (updateErr) {
      console.error('Error updating stats (non-critical):', updateErr)
    }

    // Log - truncar valores para evitar exceder límites de columna
    const logMensaje = (mensaje || '').slice(0, 500)
    const logError = (errorMsj || '').slice(0, 500)
    const logCodigo = codigo || 'UNKNOWN'

    try {
      await withRetry(() => db.$executeRawUnsafe(`
        INSERT INTO "AutomatizacionLog" ("automatizacionCodigo", "tipo", "resultado", "mensaje", "error", "duracionMs", "ejecutadoPor")
        VALUES ($1, 'ejecucion_manual', $2, $3, $4, $5, $6)
      `, logCodigo, resultado, logMensaje, logError || null, duracionMs, session.user.id || 'system'))
    } catch (logErr) {
      console.error('Error writing execution log (non-critical):', logErr)
    }

    return NextResponse.json({
      ok: resultado === 'exitoso',
      resultado,
      mensaje,
      duracionMs,
    })
  } catch (error: any) {
    console.error('Error POST /api/automatizaciones/ejecutar:', error)
    return NextResponse.json({ ok: false, error: error.message || 'Error interno' }, { status: 500 })
  }
}
