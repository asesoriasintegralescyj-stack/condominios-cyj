/**
 * Helper para hacer fetch a APIs con manejo robusto de errores.
 *
 * Problema que resuelve:
 *   Antes: const res = await fetch('/api/personal'); const data = await res.json()
 *   Si la API devuelve 500 con {"error": "..."}, data = {error: ...} y luego
 *   setPersonal(data) hace que personal.map(...) crashee porque no es un array.
 *   Esto propaga el error al ErrorBoundary y muestra "This page couldn't load".
 *
 * Solución:
 *   const data = await apiFetch<Personal[]>('/api/personal', [])
 *   - Si la API falla, devuelve el valor por defecto ([]) en vez de un objeto {error}.
 *   - Si la API responde 401, redirige a /login.
 *   - Si la API responde otro error, loggea y devuelve el default.
 */

export async function apiFetch<T>(
  url: string,
  defaultValue: T,
  options?: RequestInit
): Promise<T> {
  try {
    const res = await fetch(url, options)

    // 401 = sesión expirada, redirigir a login
    if (res.status === 401) {
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        console.warn('[apiFetch] Sesión expirada, redirigiendo a login')
        window.location.href = '/login?expired=true'
      }
      return defaultValue
    }

    // 403 = sin permisos, devolver default sin crashar
    if (res.status === 403) {
      console.warn(`[apiFetch] 403 Sin permisos para ${url}`)
      return defaultValue
    }

    // Otros errores (400, 500, etc.) - devolver default
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      console.error(`[apiFetch] ${url} -> HTTP ${res.status}: ${text.substring(0, 200)}`)
      return defaultValue
    }

    // Respuesta vacía
    const text = await res.text()
    if (!text) {
      return defaultValue
    }

    return JSON.parse(text) as T
  } catch (error) {
    console.error(`[apiFetch] Error de red en ${url}:`, error)
    return defaultValue
  }
}

/**
 * Helper para POST/PUT con JSON, devolviendo {ok, data, error}.
 */
export async function apiPost<T>(
  url: string,
  body: unknown,
  options?: RequestInit
): Promise<{ ok: boolean; data?: T; error?: string; status: number }> {
  try {
    const hasBody = body !== null && body !== undefined
    const res = await fetch(url, {
      method: options?.method || 'POST',
      headers: {
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        ...(options?.headers || {}),
      },
      ...(hasBody ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}),
      ...options,
    })

    const text = await res.text()
    let data: unknown = null
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        data = text
      }
    }

    if (res.ok) {
      return { ok: true, data: data as T, status: res.status }
    }

    const errorMsg =
      (data && typeof data === 'object' && 'error' in data
        ? String((data as { error: unknown }).error)
        : typeof data === 'string'
          ? data
          : `HTTP ${res.status}`)

    return { ok: false, error: errorMsg, status: res.status }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Error de red',
      status: 0,
    }
  }
}
