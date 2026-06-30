'use client'

import { Sidebar } from '@/components/Sidebar'
import { MainContent } from '@/components/MainContent'
import { useSession } from '@/hooks/use-session'
import { useAutoCondominio } from '@/hooks/use-auto-condominio'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { useAppStore } from '@/lib/store'

export default function SistemaPage() {
  const { user, authenticated, loading } = useSession()
  const { status: condominioStatus } = useAutoCondominio()
  const router = useRouter()
  const { currentModule, setCurrentModule } = useAppStore()

  useEffect(() => {
    if (!loading && !authenticated) {
      router.push('/login?sistema=true')
    }
  }, [loading, authenticated, router])

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

  // Si no está autenticado, no mostrar nada (ya se está redirigiendo)
  if (!authenticated) {
    return null
  }

  // Mostrar loading mientras se carga el condominio principal en background.
  // El sistema es para un solo condominio; una vez cargado, todos los módulos
  // pueden usarlo vía useAppStore().currentCondominio
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
