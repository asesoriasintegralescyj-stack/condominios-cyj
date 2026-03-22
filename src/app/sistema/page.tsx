'use client'

import { Sidebar } from '@/components/Sidebar'
import { MainContent } from '@/components/MainContent'
import { useSession } from '@/hooks/use-session'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

export default function SistemaPage() {
  const { authenticated, loading } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !authenticated) {
      router.push('/login?sistema=true')
    }
  }, [loading, authenticated, router])

  // Mostrar loading mientras se verifica la sesión
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  // Si no está autenticado, no mostrar nada (ya se está redirigiendo)
  if (!authenticated) {
    return null
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-100 flex">
      <Sidebar />
      <MainContent />
    </div>
  )
}
