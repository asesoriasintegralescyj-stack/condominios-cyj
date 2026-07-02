'use client'

import { useEffect, useRef, useCallback } from 'react'

/**
 * Hook de auto-refresh global.
 * Refresca los datos del sistema cada N milisegundos.
 * Se puede pausar cuando hay diálogos abiertos o formularios en edición.
 *
 * Uso:
 * const { pause, resume } = useAutoRefresh(callback, 300000) // 5 min
 */

const DEFAULT_INTERVAL = 5 * 60 * 1000 // 5 minutos

export function useAutoRefresh(
  callback: () => void | Promise<void>,
  interval: number = DEFAULT_INTERVAL,
) {
  const callbackRef = useRef(callback)
  const pausedRef = useRef(false)

  // Actualizar el callback sin reiniciar el intervalo
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // Ejecutar el callback en intervalos
  useEffect(() => {
    const id = setInterval(() => {
      if (!pausedRef.current) {
        callbackRef.current()
      }
    }, interval)
    return () => clearInterval(id)
  }, [interval])

  // Pausar auto-refresh (ej: cuando hay un diálogo abierto)
  const pause = useCallback(() => {
    pausedRef.current = true
  }, [])

  // Reanudar auto-refresh y ejecutar inmediatamente
  const resume = useCallback(() => {
    pausedRef.current = false
    callbackRef.current()
  }, [])

  return { pause, resume }
}
