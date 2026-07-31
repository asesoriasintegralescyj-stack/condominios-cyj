import { NextRequest } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// POST - Sincronizar con Google Calendar y Google Tasks
export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  try {
    // Obtener cuenta de Google del usuario
    const account = await withRetry(() =>
      db.googleAccount.findFirst({
        where: { userId: session.userId },
      })
    )

    if (!account) {
      return apiError('No hay cuenta de Google conectada', 400)
    }

    // Verificar si el token necesita ser refrescado
    let accessToken = account.accessToken
    if (account.tokenExpiry && new Date(account.tokenExpiry) < new Date()) {
      accessToken = await refreshAccessToken(account.refreshToken)
      if (accessToken) {
        await withRetry(() =>
          db.googleAccount.update({
            where: { id: account.id },
            data: {
              accessToken,
              tokenExpiry: new Date(Date.now() + 3600 * 1000),
            },
          })
        )
      } else {
        return apiError('No se pudo refrescar el token de acceso. Reconecta tu cuenta de Google.', 401)
      }
    }

    let eventsCreated = 0
    let tasksCreated = 0
    const now = new Date()

    // ---- Sincronizar Google Calendar ----
    if (account.calendarSync) {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const ninetyDaysAhead = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()

      try {
        const calendarResponse = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${thirtyDaysAgo}&timeMax=${ninetyDaysAhead}&singleEvents=true&maxResults=250`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )

        if (calendarResponse.ok) {
          const calendarData = await calendarResponse.json()
          const events = calendarData.items || []

          for (const event of events) {
            if (!event.id) continue

            // Verificar si ya existe este evento localmente
            const existing = await withRetry(() =>
              db.tareaPlanificacion.findUnique({
                where: { googleEventId: event.id },
              })
            )
            if (existing) continue

            // Mapear prioridad de Google a prioridad local
            const prioridad = mapGooglePriority(event)
            // Mapear estado de Google a estado local
            const estado = event.status === 'cancelled' ? 'cancelada'
              : event.status === 'confirmed' && isEventPast(event) ? 'completada'
              : 'pendiente'

            const start = event.start
            const end = event.end
            const isAllDay = Boolean(start && !start.dateTime && start.date)

            await withRetry(() =>
              db.tareaPlanificacion.create({
                data: {
                  titulo: event.summary || 'Sin título',
                  descripcion: event.description || null,
                  estado,
                  prioridad,
                  fechaInicio: start?.dateTime ? new Date(start.dateTime) : start?.date ? new Date(start.date) : now,
                  fechaFin: end?.dateTime ? new Date(end.dateTime) : end?.date ? new Date(end.date) : null,
                  horaInicio: start?.dateTime ? extractTime(start.dateTime) : null,
                  horaFin: end?.dateTime ? extractTime(end.dateTime) : null,
                  diaCompleto: isAllDay,
                  ubicacion: event.location || null,
                  creadoById: session.userId,
                  googleEventId: event.id,
                  sincronizado: true,
                  completadoEn: estado === 'completada' ? now : null,
                  categoria: 'Calendario',
                },
              })
            )
            eventsCreated++
          }
        } else {
          console.error('Error al obtener eventos de Google Calendar:', await calendarResponse.text())
        }
      } catch (err) {
        console.error('Error al sincronizar Google Calendar:', err)
      }
    }

    // ---- Sincronizar Google Tasks ----
    if (account.tasksSync) {
      try {
        // Primero obtener la lista de tareas del usuario (tasklist)
        const tasklistsResponse = await fetch(
          'https://www.googleapis.com/tasks/v1/users/@me/lists',
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )

        if (tasklistsResponse.ok) {
          const tasklistsData = await tasklistsResponse.json()
          const tasklists = tasklistsData.items || []

          for (const tasklist of tasklists) {
            if (!tasklist.id) continue

            const tasksResponse = await fetch(
              `https://www.googleapis.com/tasks/v1/lists/${tasklist.id}/tasks?showCompleted=true&maxResults=100`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            )

            if (!tasksResponse.ok) continue

            const tasksData = await tasksResponse.json()
            const tasks = tasksData.items || []

            for (const task of tasks) {
              if (!task.id) continue

              // Verificar si ya existe esta tarea localmente
              const existing = await withRetry(() =>
                db.tareaPlanificacion.findUnique({
                  where: { googleTaskId: task.id },
                })
              )
              if (existing) continue

              const estado = task.status === 'completed' ? 'completada' : 'pendiente'
              const completedAt = task.completed ? new Date(task.completed) : null

              await withRetry(() =>
                db.tareaPlanificacion.create({
                  data: {
                    titulo: task.title || 'Sin título',
                    descripcion: task.notes || null,
                    estado,
                    prioridad: 'media',
                    fechaInicio: task.due ? new Date(task.due) : now,
                    fechaFin: task.due ? new Date(task.due) : null,
                    diaCompleto: true,
                    creadoById: session.userId,
                    googleTaskId: task.id,
                    sincronizado: true,
                    completadoEn: completedAt,
                    categoria: `Google Tasks: ${tasklist.title}`,
                  },
                })
              )
              tasksCreated++
            }
          }
        } else {
          console.error('Error al obtener listas de Google Tasks:', await tasklistsResponse.text())
        }
      } catch (err) {
        console.error('Error al sincronizar Google Tasks:', err)
      }
    }

    // Actualizar última sincronización
    const totalSynced = eventsCreated + tasksCreated
    await withRetry(() =>
      db.googleAccount.update({
        where: { id: account.id },
        data: { lastSyncAt: now },
      })
    )

    return apiSuccess({
      synced: totalSynced,
      events: eventsCreated,
      tasks: tasksCreated,
    })
  } catch (error) {
    console.error('Error al sincronizar con Google:', error)
    return apiError('Error al sincronizar con Google', 500)
  }
}

// Refrescar el access token usando el refresh token
async function refreshAccessToken(refreshToken: string | null): Promise<string | null> {
  if (!refreshToken) return null

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) return null

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) return null
    const data = await response.json()
    return data.access_token || null
  } catch (error) {
    console.error('Error al refrescar token de Google:', error)
    return null
  }
}

// Extraer la hora de un string ISO datetime (HH:mm)
function extractTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  } catch {
    return null
  }
}

// Mapear prioridad desde metadatos de evento de Google
function mapGooglePriority(event: Record<string, unknown>): string {
  const colorId = event.colorId as string | undefined
  if (colorId === '11' || colorId === '5') return 'urgente'
  if (colorId === '4' || colorId === '6') return 'alta'
  if (colorId === '2') return 'baja'
  return 'media'
}

// Determinar si un evento de calendario ya pasó
function isEventPast(event: Record<string, unknown>): boolean {
  const end = event.end as Record<string, string> | undefined
  if (!end) return false
  const endTime = end.dateTime || end.date
  if (!endTime) return false
  return new Date(endTime) < new Date()
}
