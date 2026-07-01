'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * Hook de auto-guardado con debounce.
 * Guarda automáticamente los datos del formulario después de N ms sin cambios.
 *
 * Uso:
 * const { isSaving, lastSaved, hasChanges, saveNow } = useAutoSave(
 *   data,           // los datos a guardar
 *   async (data) => { // función de guardado
 *     await fetch('/api/...', { method: 'POST', body: JSON.stringify(data) })
 *   },
 *   2000            // debounce: 2 segundos sin cambios
 * )
 *
 * También detecta cambios sin guardar y muestra un aviso al intentar salir.
 */

const DEFAULT_DEBOUNCE = 2000 // 2 segundos

export function useAutoSave<T>(
  data: T,
  saveFn: (data: T) => Promise<void>,
  debounce: number = DEFAULT_DEBOUNCE,
) {
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const dataRef = useRef(data)
  const initialDataRef = useRef(data)
  const saveFnRef = useRef(saveFn)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Actualizar refs
  useEffect(() => {
    saveFnRef.current = saveFn
  }, [saveFn])

  // Detectar cambios
  useEffect(() => {
    const changed = JSON.stringify(data) !== JSON.stringify(initialDataRef.current)
    setHasChanges(changed)
    dataRef.current = data

    if (changed) {
      // Cancelar timer anterior
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }

      // Nuevo timer con debounce
      timerRef.current = setTimeout(async () => {
        setIsSaving(true)
        try {
          await saveFnRef.current(dataRef.current)
          initialDataRef.current = dataRef.current
          setHasChanges(false)
          setLastSaved(new Date())
        } catch (error) {
          console.error('Error en auto-save:', error)
        } finally {
          setIsSaving(false)
        }
      }, debounce)
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [data, debounce])

  // Guardar inmediatamente
  const saveNow = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    if (!hasChanges) return
    setIsSaving(true)
    try {
      await saveFnRef.current(dataRef.current)
      initialDataRef.current = dataRef.current
      setHasChanges(false)
      setLastSaved(new Date())
    } catch (error) {
      console.error('Error en saveNow:', error)
    } finally {
      setIsSaving(false)
    }
  }, [hasChanges])

  // Aviso al intentar salir con cambios sin guardar
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasChanges])

  return { isSaving, lastSaved, hasChanges, saveNow }
}
