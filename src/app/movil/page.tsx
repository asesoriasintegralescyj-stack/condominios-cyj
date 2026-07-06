'use client'

import dynamic from 'next/dynamic'

function LoadingSpinner() {
  return (
    <div className="max-w-xl mx-auto min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-400 text-sm font-bold">Cargando App Móvil...</p>
      </div>
    </div>
  )
}

const LagunaNorteApp = dynamic(() => import('./LagunaNorteApp'), {
  ssr: false,
  loading: () => <LoadingSpinner />,
})

export default function MovilPage() {
  return <LagunaNorteApp />
}
