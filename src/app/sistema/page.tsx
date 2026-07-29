'use client'

import { Sidebar } from '@/components/Sidebar'
import { MainContent } from '@/components/MainContent'
import { useSession } from '@/hooks/use-session'
import { useAutoCondominio } from '@/hooks/use-auto-condominio'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2, QrCode, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store'

// URL de la app móvil (comparte la misma BD Aiven)
const APP_MOVIL_URL = 'https://laguna-norte-gestion-five.vercel.app'

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

  // Si el usuario es guardia, mostrar pantalla de redirección a la app móvil.
  // La app móvil (laguna-norte-gestion) está optimizada para celulares:
  //   - Escáner QR nativo con html5-qrcode
  //   - Captura de GPS con precisión
  //   - Soporte offline (guarda escaneos en localStorage y sincroniza al recuperar conexión)
  //   - Comparte la MISMA base de datos Aiven → los escaneos aparecen
  //     instantáneamente en este sistema de escritorio (módulo "Rondas QR Guardias")
  useEffect(() => {
    if (authenticated && user?.rol === 'guardia' && currentModule !== 'qrrondas') {
      setCurrentModule('qrrondas')
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

  // Guardia: redirigir a la app móvil (mejor UX en celular)
  if (user?.rol === 'guardia') {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-teal-100 rounded-2xl flex items-center justify-center">
            <QrCode className="w-8 h-8 text-teal-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">
            Hola, {user.nombre}
          </h1>
          <p className="text-slate-600">
            Para escanear los QR de rondas debes usar la <strong>app móvil</strong>.
            Está optimizada para tu celular: usa la cámara, captura el GPS y guarda
            los escaneos incluso sin internet.
          </p>
          <div className="bg-slate-50 rounded-xl p-4 text-left text-sm text-slate-600 space-y-1">
            <p><strong>App móvil:</strong></p>
            <a
              href={APP_MOVIL_URL}
              className="block text-teal-600 hover:text-teal-700 hover:underline break-all"
            >
              {APP_MOVIL_URL}
            </a>
          </div>
          <Button
            size="lg"
            className="w-full bg-teal-600 hover:bg-teal-700"
            onClick={() => window.location.href = APP_MOVIL_URL}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Abrir app móvil
          </Button>
          <p className="text-xs text-slate-400">
            Los escaneos que hagas en la app móvil aparecerán aquí en
            tiempo real (módulo &quot;Rondas QR Guardias&quot;).
          </p>
        </div>
      </div>
    )
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
