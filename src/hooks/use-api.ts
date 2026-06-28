'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query'

/**
 * Hook genérico para fetch GET con TanStack Query.
 *
 * Ejemplo:
 *   const { data, isLoading, error } = useApiQuery<Residente[]>('/api/residentes')
 */
export function useApiQuery<T>(
  url: string,
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
) {
  return useQuery<T>({
    queryKey: [url],
    queryFn: async () => {
      const res = await fetch(url)
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(error.error || `HTTP ${res.status}`)
      }
      return res.json() as Promise<T>
    },
    ...options,
  })
}

/**
 * Hook genérico para mutaciones POST/PUT/PATCH/DELETE.
 *
 * Ejemplo:
 *   const mutation = useApiMutation<Residente, { nombre: string }>('POST', '/api/residentes')
 *   mutation.mutate({ nombre: 'Juan' })
 */
export function useApiMutation<TData, TVariables = unknown>(
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string | ((id: string) => string),
  options?: UseMutationOptions<TData, Error, TVariables>
) {
  const queryClient = useQueryClient()

  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables: TVariables) => {
      const finalUrl = typeof url === 'function' ? url('') : url
      const res = await fetch(finalUrl, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: variables ? JSON.stringify(variables) : undefined,
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(error.error || `HTTP ${res.status}`)
      }
      return res.json() as Promise<TData>
    },
    ...options,
    onSuccess: (...args) => {
      // Invalidar todas las queries después de una mutación exitosa
      queryClient.invalidateQueries()
      options?.onSuccess?.(...args)
    },
  })
}
