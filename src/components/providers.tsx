'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30 * 1000,           // 30s — datos frescos por 30s
          gcTime: 5 * 60 * 1000,           // 5min en cache
          refetchOnWindowFocus: false,     // no refetchear al cambiar de pestaña
          retry: 1,                        // 1 reintento en errores
        },
        mutations: {
          retry: 0,                        // no reintentar mutaciones
        },
      },
    })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
