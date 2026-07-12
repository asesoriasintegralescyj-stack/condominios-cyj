'use client'

import { useEffect } from 'react'

/**
 * CacheBuster — detecta si el usuario tiene una versión antigua cacheada
 * y fuerza recarga completa + limpieza de caches del navegador.
 *
 * Similar al de la app móvil (laguna-norte-gestion).
 * Cambiar BUILD_VERSION en cada deploy crítico.
 */
export function CacheBuster() {
  useEffect(() => {
    try {
      const BUILD_VERSION = '2026-07-12-v1-patentes-tab'
      const stored = localStorage.getItem('cyj_build_version')
      if (stored !== BUILD_VERSION) {
        localStorage.setItem('cyj_build_version', BUILD_VERSION)
        // Limpiar caches del Service Worker API
        if ('caches' in window) {
          caches.keys().then((names) => {
            names.forEach((name) => caches.delete(name))
          })
        }
        // Forzar recarga con parámetro anti-cache
        const url = window.location.pathname + window.location.search
        const separator = url.includes('?') ? '&' : '?'
        window.location.replace(url + separator + '_v=' + BUILD_VERSION)
      }
    } catch {
      // Si localStorage falla (modo privado), continuar sin hacer nada
    }
  }, [])
  return null
}
