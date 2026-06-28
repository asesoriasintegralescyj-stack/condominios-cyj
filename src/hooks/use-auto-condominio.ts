/**
 * Hook que carga automáticamente el condominio principal al iniciar sesión.
 *
 * Este sistema gestiona UN SOLO condominio que contiene varios micro-condominios
 * en su interior. Por lo tanto, basta con cargar el primer (y único) condominio
 * registrado en la BD y dejarlo disponible globalmente en el store.
 *
 * Una vez cargado, todos los módulos (Cumplimiento, Comite, Asistencia, etc.)
 * pueden leerlo vía `useAppStore().currentCondominio` sin necesidad de volver
 * a consultarlo.
 */

'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'

type Status = 'idle' | 'loading' | 'loaded' | 'error'

export function useAutoCondominio() {
  const { currentCondominio, setCurrentCondominio } = useAppStore()
  const [status, setStatus] = useState<Status>('idle')

  useEffect(() => {
    // Si ya hay un condominio cargado (ej. persistido en localStorage), no hacer nada
    if (currentCondominio?.id) {
      setStatus('loaded')
      return
    }

    let cancelled = false
    setStatus('loading')

    ;(async () => {
      try {
        const res = await fetch('/api/condominios')
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        const data = await res.json()
        // El endpoint puede devolver un array directo o { condominios: [...] }
        const condominios = Array.isArray(data) ? data : (data?.condominios || [])
        if (cancelled) return

        if (Array.isArray(condominios) && condominios.length > 0) {
          // Cargar el primer condominio (el sistema es para un solo condominio)
          const first = condominios[0]
          setCurrentCondominio({ id: first.id, nombre: first.nombre })
          setStatus('loaded')
        } else {
          // No hay condominios registrados — el usuario debería crear uno
          setStatus('loaded')
        }
      } catch (e) {
        console.warn('[useAutoCondominio] No se pudo cargar condominio:', e)
        if (!cancelled) setStatus('error')
      }
    })()

    return () => { cancelled = true }
  }, [currentCondominio?.id, setCurrentCondominio])

  return { status, hasCondominio: !!currentCondominio?.id }
}
