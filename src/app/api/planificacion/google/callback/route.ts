import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 30

// GET - Manejar callback de OAuth de Google
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      console.error('Error en OAuth de Google:', error)
      return redirectToApp('/planificacion?google_error=access_denied')
    }

    if (!code || !state) {
      return redirectToApp('/planificacion?google_error=missing_params')
    }

    // Verificar state contra la cookie para protección CSRF
    const cookieStore = await cookies()
    const savedState = cookieStore.get('google_oauth_state')?.value
    cookieStore.delete('google_oauth_state')

    if (!savedState || savedState !== state) {
      console.error('State de OAuth no coincide (posible ataque CSRF)')
      return redirectToApp('/planificacion?google_error=invalid_state')
    }

    // Obtener sesión del usuario
    let session
    try {
      session = await getCurrentSession()
    } catch (e) {
      console.error('Error al obtener sesión en callback Google:', e)
      return redirectToApp('/login?google_callback=1&msg=session_error')
    }
    if (!session) {
      return redirectToApp('/login?google_callback=1&msg=no_session')
    }

    // Intercambiar código por tokens
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      console.error('GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET no configurados')
      return redirectToApp('/planificacion?google_error=missing_config')
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL || request.headers.get('origin')}/api/planificacion/google/callback`

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text()
      console.error('Error al intercambiar código por tokens:', errorBody)
      return redirectToApp('/planificacion?google_error=token_exchange_failed')
    }

    const tokens = await tokenResponse.json()
    const accessToken = tokens.access_token
    const refreshToken = tokens.refresh_token || null
    const expiresIn = tokens.expires_in

    if (!accessToken) {
      console.error('No se recibió access_token en la respuesta de Google')
      return redirectToApp('/planificacion?google_error=no_access_token')
    }

    // Obtener información del usuario de Google
    let googleEmail = 'unknown'
    try {
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (userInfoResponse.ok) {
        const userInfo = await userInfoResponse.json()
        if (userInfo.email) {
          googleEmail = userInfo.email
        }
      }
    } catch (err) {
      console.warn('No se pudo obtener email de Google, usando valor por defecto:', err)
    }

    // Calcular fecha de expiración del token
    const tokenExpiry = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null

    // Upsert en la base de datos (por userId)
    const existingAccount = await withRetry(() =>
      db.googleAccount.findFirst({
        where: { userId: session.userId },
      })
    )

    if (existingAccount) {
      await withRetry(() =>
        db.googleAccount.update({
          where: { id: existingAccount.id },
          data: {
            email: googleEmail,
            accessToken,
            refreshToken: refreshToken || existingAccount.refreshToken,
            tokenExpiry,
            calendarSync: true,
            tasksSync: true,
            lastSyncAt: null,
          },
        })
      )
    } else {
      await withRetry(() =>
        db.googleAccount.create({
          data: {
            userId: session.userId,
            email: googleEmail,
            accessToken,
            refreshToken,
            tokenExpiry,
            calendarSync: true,
            tasksSync: true,
          },
        })
      )
    }

    return redirectToApp('/planificacion?google_connected=1')
  } catch (error) {
    console.error('Error inesperado en callback de Google OAuth:', error)
    return redirectToApp('/planificacion?google_error=internal_error')
  }
}

function redirectToApp(path: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || ''
  return NextResponse.redirect(`${baseUrl}${path}`)
}
