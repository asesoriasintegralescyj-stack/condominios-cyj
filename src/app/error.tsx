'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[ErrorBoundary]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
      <AlertTriangle className="w-12 h-12 text-amber-500" />
      <h2 className="text-lg font-semibold text-slate-800">
        Error al cargar este módulo
      </h2>
      <p className="text-sm text-slate-500 max-w-md text-center">
        {error.message || 'Ocurrió un error inesperado. Intenta recargar la página.'}
      </p>
      <button
        onClick={reset}
        className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Reintentar
      </button>
    </div>
  )
}
