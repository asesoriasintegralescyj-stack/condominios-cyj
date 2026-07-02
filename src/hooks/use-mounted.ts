'use client'

import { useRef, useEffect, useCallback } from 'react'

/**
 * Hook to check if the component is mounted on the client
 * Uses a callback pattern to avoid setState in effect
 */
export function useMounted(): () => boolean {
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  return useCallback(() => mountedRef.current, [])
}
