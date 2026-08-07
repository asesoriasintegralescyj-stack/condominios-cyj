'use client'

import { useEffect } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { MainContent } from '@/components/MainContent'
import { useSession } from '@/hooks/use-session'
import { useMounted } from '@/hooks/use-mounted'
import { useAppStore } from '@/lib/store'
import { useRouter } from 'next/navigation'

export default function PlanificacionPage() {
  const { authenticated } = useSession()
  const isMounted = useMounted()
  const setCurrentModule = useAppStore((s) => s.setCurrentModule)
  const router = useRouter()

  useEffect(() => {
    // Activar el módulo de planificación cuando la página cargue
    setCurrentModule('planificacion')
  }, [setCurrentModule])

  // Si no está autenticado, redirigir al inicio
  useEffect(() => {
    if (isMounted() && !authenticated) {
      router.replace('/')
    }
  }, [isMounted, authenticated, router])

  if (isMounted() && authenticated) {
    return (
      <div className="h-screen overflow-hidden bg-slate-100 flex">
        <Sidebar />
        <MainContent />
      </div>
    )
  }

  return null
}
