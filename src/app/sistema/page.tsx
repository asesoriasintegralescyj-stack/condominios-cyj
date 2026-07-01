'use client'

import { Sidebar } from '@/components/Sidebar'
import { MainContent } from '@/components/MainContent'
import { useSession } from '@/hooks/use-session'
import { useAutoCondominio } from '@/hooks/use-auto-condominio'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { useAppStore } from '@/lib/store'

export default function SistemaPage() {
  const { user, authenticated, loading, refresh } = useSession()
  const { status: condominioStatus } = useAutoCondominio()
  const router = useRouter()
  const { currentModule, setCurrentModule } = useAppStore()

  // Auto-refresh global cada 5 minutos
  // Refresca la sesión y los datos del usuario
  useAutoRefresh(() => {
    if (authenticated) {
      refresh()
    }
  }, 5 * 60 * 1000)

  useEffect(() => {
    if (!loading && !authenticated) {
      router.push('/login?sistema=true')
    }
  }, [loading, authenticated, router])

  // Si el usuario es guardia, redirigir a la página dedicada /rondas-guardia
  useEffect(() => {
    if (authenticated && user?.rol === 'guardia') {
      router.replace('/rondas-guardia')
    }
  }, [authenticated, user, router])

  // Si el usuario es guardia, forzar el módulo Rondas al ingresar
  useEffect(() => {
    if (authenticated && user?.rol === 'guardia' && currentModule !== 'rondas') {
      setCurrentModule('rondas')
    }
  }, [authenticated, user, currentModule, setCurrentModule])

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

  if (!authenticated) {
    return null
  }

  if (condominioStatus === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Cargando condominio...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen overflow-hidden bg-slate-100 flex flex-col md:flex-row pt-14 md:pt-0 min-w-0">
      <Sidebar />
      <MainContent />
    </div>
  )
}
