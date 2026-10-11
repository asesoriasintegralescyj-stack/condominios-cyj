import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 30

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/tasks',
].join(' ')

// GET - Verificar estado de conexión con Google
export async function GET() {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  try {
    const account = await withRetry(() =>
      db.googleAccount.findFirst({
        where: { userId: session.userId },
      })
    )

    if (!account) {
      return apiSuccess({
        connected: false,
      })
    }

    return apiSuccess({
      connected: true,
      email: account.email,
      calendarSync: account.calendarSync,
      tasksSync: account.tasksSync,
      lastSyncAt: account.lastSyncAt?.toISOString() || null,
    })
  } catch (error) {
    console.error('Error al verificar conexión con Google:', error)
    return apiError('Error al verificar conexión con Google', 500)
  }
}

// POST - Iniciar flujo OAuth con Google
export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID
    if (!clientId) {
      return apiError('GOOGLE_CLIENT_ID no configurado', 500)
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || request.headers.get('origin')}/api/planificacion/google/callback`

    // Generar state aleatorio para protección CSRF
    const state = randomBytes(32).toString('hex')

    // Almacenar state en cookie para verificación posterior
    const cookieStore = await cookies()
    cookieStore.set('google_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutos
      path: '/',
    })

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state,
    })

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

    return apiSuccess({ url: authUrl })
  } catch (error) {
    console.error('Error al iniciar OAuth con Google:', error)
    return apiError('Error al iniciar conexión con Google', 500)
  }
}

// DELETE - Desconectar cuenta de Google
export async function DELETE() {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  try {
    const account = await withRetry(() =>
      db.googleAccount.findFirst({
        where: { userId: session.userId },
      })
    )

    if (!account) {
      return apiError('No hay cuenta de Google conectada', 404)
    }

    await withRetry(() =>
      db.googleAccount.delete({
        where: { id: account.id },
      })
    )

    return apiSuccess({ disconnected: true })
  } catch (error) {
    console.error('Error al desconectar cuenta de Google:', error)
    return apiError('Error al desconectar cuenta de Google', 500)
  }
}
