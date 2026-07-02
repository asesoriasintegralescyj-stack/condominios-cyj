/**
 * Hook que carga automáticamente el condominio único al iniciar sesión.
 *
 * ⚠️ IMPORTANTE: Este sistema gestiona UN SOLO CONDOMINIO llamado "LAGUNA NORTE".
 * Las "etapas" (ALBATROS, BANDURRIAS, BECACINAS, CANQUEN, FAISANES,
 * FLAMENCOS, GARZAS, GAVIOTAS) son subdivisiones internas del condominio,
 * NO condominios separados.
 *
 * Una vez cargado, todos los módulos pueden leerlo vía
 * `useAppStore().currentCondominio` sin necesidad de volver a consultarlo.
 */

'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'

type Status = 'idle' | 'loading' | 'loaded' | 'error'

const LAGUNA_NORTE_FALLBACK = {
  id: 'cmo9f3x7j0000ktyeb0rzhwt9',
  nombre: 'LAGUNA NORTE',
}

export function useAutoCondominio() {
  const { currentCondominio, setCurrentCondominio } = useAppStore()
  const [status, setStatus] = useState<Status>('idle')

  useEffect(() => {
    // Si ya hay un condominio cargado, no hacer nada
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
        const condominios = Array.isArray(data) ? data : (data?.condominios || [])
        if (cancelled) return

        if (Array.isArray(condominios) && condominios.length > 0) {
          // Cargar el condominio único (LAGUNA NORTE)
          const condominio = condominios[0]
          setCurrentCondominio({ id: condominio.id, nombre: condominio.nombre })
          setStatus('loaded')
        } else {
          // No hay condominios registrados — usar fallback para que la app no se rompa
          // (el admin debería configurar LAGUNA NORTE via /api/condominios POST)
          setCurrentCondominio(LAGUNA_NORTE_FALLBACK)
          setStatus('loaded')
        }
      } catch (e) {
        console.warn('[useAutoCondominio] No se pudo cargar condominio vía API, usando fallback:', e)
        if (!cancelled) {
          // En caso de error de red, usar el fallback hardcoded para que la app funcione
          setCurrentCondominio(LAGUNA_NORTE_FALLBACK)
          setStatus('loaded')
        }
      }
    })()

    return () => { cancelled = true }
  }, [currentCondominio?.id, setCurrentCondominio])

  return { status, hasCondominio: !!currentCondominio?.id }
}
