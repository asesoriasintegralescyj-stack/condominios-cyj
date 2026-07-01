'use client'

/**
 * Página dedicada para el rol GUARDIA.
 * Reemplaza completamente el sistema (sin sidebar, sin dashboard, sin OT, sin nada).
 *
 * UI minimalista:
 *  - Logo + nombre del condominio + nombre del guardia (header fijo)
 *  - Un botón GIGANTE "Registrar Ronda" que abre la cámara automáticamente
 *  - Feed discreto de los últimos registros de la sesión
 *
 * La cámara se abre automáticamente al hacer clic en el botón.
 * No hay mensajes de "escanear" ni instrucciones — solo el botón directo.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Camera, RefreshCw, Keyboard, AlertCircle, ScanLine, CheckCircle2, X, LogOut, BookOpen } from 'lucide-react'

interface ScanRecord {
  id: string
  nombre: string
  etapa: string
  post: string
  fecha: string
  hora: string
  status: 'success' | 'error'
  errorMsg?: string
}

export default function RondasGuardiaPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ nombre: string; apellido?: string | null; email: string } | null>(null)
  const [loading, setLoading] = useState(true)

  // Estado del escáner
  const containerId = 'guardia-qr-reader'
  const html5QrCodeRef = useRef<any>(null)
  const lastScanRef = useRef<{ text: string; ts: number } | null>(null)
  const [scannerActive, setScannerActive] = useState(false)
  const [scannerStarting, setScannerStarting] = useState(false)
  const [cameraState, setCameraState] = useState<'idle' | 'starting' | 'scanning' | 'error' | 'denied'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [manualMode, setManualMode] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [registering, setRegistering] = useState(false)

  // Feed de registros recientes
  const [recentScans, setRecentScans] = useState<ScanRecord[]>([])

  // Verificar sesión y rol
  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((data) => {
        if (!data.authenticated) {
          router.push('/login')
          return
        }
        if (data.user.rol !== 'guardia') {
          // Si no es guardia, redirigir al sistema completo
          router.push('/sistema')
          return
        }
        setUser({
          nombre: data.user.nombre,
          apellido: data.user.apellido,
          email: data.user.email,
        })
        setLoading(false)
      })
      .catch(() => {
        router.push('/login')
      })
  }, [router])

  const stopCamera = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        const running = html5QrCodeRef.current.isScanning
        if (running) {
          await html5QrCodeRef.current.stop()
        }
        await html5QrCodeRef.current.clear()
      } catch {
        // silenciar
      }
      html5QrCodeRef.current = null
    }
    // Limpiar fallback de getUserMedia
    const videoEl = document.getElementById(containerId) as HTMLVideoElement | null
    if (videoEl) {
      if ((videoEl as any)._detectInterval) {
        clearInterval((videoEl as any)._detectInterval)
        ;(videoEl as any)._detectInterval = null
      }
      if ((videoEl as any)._stream) {
        const stream = (videoEl as any)._stream as MediaStream
        stream.getTracks().forEach((t) => t.stop())
        ;(videoEl as any)._stream = null
      }
      videoEl.srcObject = null
    }
    setScannerActive(false)
  }, [])

  const startCamera = useCallback(async (mode: 'environment' | 'user') => {
    setScannerStarting(true)
    setCameraState('starting')
    setErrorMsg('')

    await stopCamera()

    try {
      // Metodo 1: Intentar con html5-qrcode (funciona en la mayoria de los navegadores)
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode')

      const html5QrCode = new Html5Qrcode(containerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
        ],
        verbose: false,
      })
      html5QrCodeRef.current = html5QrCode

      const config = {
        fps: 10,
        qrbox: (viewWidth: number, viewHeight: number) => {
          const minEdge = Math.min(viewWidth, viewHeight)
          const size = Math.floor(minEdge * 0.75)
          return { width: size, height: size }
        },
        aspectRatio: 1.0,
      }

      await html5QrCode.start(
        { facingMode: mode },
        config,
        (decodedText: string) => {
          const now = Date.now()
          const last = lastScanRef.current
          if (last && last.text === decodedText && now - last.ts < 3000) {
            return
          }
          lastScanRef.current = { text: decodedText, ts: now }
          Promise.resolve(handleScan(decodedText)).catch((e) =>
            console.error('Error en handleScan:', e),
          )
        },
        () => {
          // errores de frame — ignorar
        },
      )

      setCameraState('scanning')
      setScannerActive(true)
    } catch (err: any) {
      console.error('Error iniciando cámara con html5-qrcode:', err)

      // Metodo 2: Fallback con getUserMedia nativo + BarcodeDetector
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: mode },
        })
        const videoElement = document.getElementById(containerId) as HTMLVideoElement
        if (videoElement) {
          videoElement.srcObject = stream
          videoElement.setAttribute('playsinline', 'true')
          videoElement.play()
          // Usar BarcodeDetector si esta disponible (Chrome/Edge)
          if ('BarcodeDetector' in window) {
            const detector = new (window as any).BarcodeDetector({
              formats: ['qr_code'],
            })
            const detectInterval = setInterval(async () => {
              try {
                const barcodes = await detector.detect(videoElement)
                if (barcodes && barcodes.length > 0) {
                  const decodedText = barcodes[0].rawValue
                  const now = Date.now()
                  const last = lastScanRef.current
                  if (last && last.text === decodedText && now - last.ts < 3000) return
                  lastScanRef.current = { text: decodedText, ts: now }
                  Promise.resolve(handleScan(decodedText)).catch((e) =>
                    console.error('Error en handleScan:', e),
                  )
                }
              } catch {
                // ignorar
              }
            }, 500)
            // Guardar referencia para limpiar despues
            ;(videoElement as any)._detectInterval = detectInterval
            ;(videoElement as any)._stream = stream
          }
          setCameraState('scanning')
          setScannerActive(true)
          return
        }
      } catch (fallbackErr: any) {
        console.error('Fallback tambien fallo:', fallbackErr)
      }

      // Si ambos metodos fallan, mostrar error
      const msg = String(err?.message || err || '')
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied') || msg.toLowerCase().includes('notallowed')) {
        setCameraState('denied')
        setErrorMsg('Permiso de cámara denegado. Habilítalo en tu navegador o usa el ingreso manual.')
      } else if (msg.toLowerCase().includes('notfound') || msg.toLowerCase().includes('no camera')) {
        setCameraState('error')
        setErrorMsg('No se encontró ninguna cámara en este dispositivo.')
      } else {
        setCameraState('error')
        setErrorMsg('No se pudo iniciar la cámara. Intenta con "Reiniciar" o usa "Ingreso manual".')
      }
    } finally {
      setScannerStarting(false)
    }
  }, [stopCamera, registering])

  // Detener cámara al desmontar
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  // Obtener ubicacion GPS actual
  const getGPSLocation = (): Promise<{ latitud: number; longitud: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null)
        return
      }
      // Timeout de 5 segundos para no bloquear el registro
      const timeoutId = setTimeout(() => resolve(null), 5000)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId)
          resolve({
            latitud: position.coords.latitude,
            longitud: position.coords.longitude,
          })
        },
        (error) => {
          clearTimeout(timeoutId)
          console.warn('GPS no disponible:', error.message)
          resolve(null)
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 },
      )
    })
  }

  const handleScan = async (text: string) => {
    if (registering) return
    setRegistering(true)
    try {
      // Obtener ubicacion GPS en paralelo (no bloquea si falla)
      const gps = await getGPSLocation()

      const res = await fetch('/api/rondas/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: text,
          latitud: gps?.latitud,
          longitud: gps?.longitud,
        }),
      })
      const data = await res.json()

      if (res.ok) {
        const etapa = data.ronda?.etapa || ''
        const post = data.ronda?.post || ''
        const fecha = data.registro?.fecha || new Date().toISOString().split('T')[0]
        const hora = data.registro?.hora || new Date().toTimeString().split(' ')[0].substring(0, 5)

        setRecentScans((prev) =>
          [
            {
              id: crypto.randomUUID(),
              nombre: data.ronda?.nombre || 'Ronda',
              etapa,
              post,
              fecha,
              hora,
              status: 'success' as const,
            },
            ...prev,
          ].slice(0, 8),
        )

        // Vibración corta para confirmar registro exitoso
        if (navigator.vibrate) navigator.vibrate(150)
      } else {
        setRecentScans((prev) =>
          [
            {
              id: crypto.randomUUID(),
              nombre: text.substring(0, 60),
              etapa: '',
              post: '',
              fecha: new Date().toISOString().split('T')[0],
              hora: new Date().toTimeString().split(' ')[0].substring(0, 5),
              status: 'error' as const,
              errorMsg: data.error || 'Error al registrar',
            },
            ...prev,
          ].slice(0, 8),
        )
        // Vibración larga para error
        if (navigator.vibrate) navigator.vibrate([200, 100, 200])
      }
    } catch (e) {
      console.error('Error registering scan:', e)
    } finally {
      setRegistering(false)
    }
  }

  const handleManualSubmit = async () => {
    if (!manualCode.trim()) return
    await handleScan(manualCode.trim())
    setManualCode('')
  }

  const handleLogout = async () => {
    await stopCamera()
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  // Auto-iniciar cámara apenas se monta el componente del escáner
  const handleOpenScanner = () => {
    setManualMode(false)
    startCamera(facingMode)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <RefreshCw className="w-8 h-8 text-white animate-spin" />
      </div>
    )
  }

  const now = new Date()
  const fechaStr = now.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
  const horaStr = now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#0f2040] to-slate-900 text-white flex flex-col">
      {/* Header minimalista */}
      <header className="bg-black/30 backdrop-blur-sm border-b border-white/10 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <img src="/logo.jpg" alt="Logo" className="w-10 h-10 rounded-lg shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-bold truncate">Laguna Norte</div>
            <div className="text-[10px] text-blue-300 truncate">Control de Rondas</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/manuales-guardia')}
            className="text-white/70 hover:text-white hover:bg-white/10"
            title="Ver manuales y capacitaciones"
          >
            <BookOpen className="w-4 h-4 mr-1.5" />
            Manuales
          </Button>
          <div className="text-right hidden sm:block">
            <div className="text-xs font-medium">
              {user?.nombre} {user?.apellido || ''}
            </div>
            <div className="text-[10px] text-blue-300">{horaStr}</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-white/70 hover:text-white hover:bg-white/10"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 flex flex-col px-4 py-6 max-w-md mx-auto w-full">
        {/* Fecha */}
        <div className="text-center mb-4">
          <p className="text-xs text-blue-300 capitalize">{fechaStr}</p>
        </div>

        {/* Botón GIGANTE Registrar Ronda */}
        {!scannerActive && !manualMode && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 py-8">
            <button
              onClick={handleOpenScanner}
              disabled={scannerStarting}
              className="group relative w-64 h-64 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 shadow-2xl shadow-amber-500/30 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center justify-center"
            >
              {scannerStarting ? (
                <RefreshCw className="w-20 h-20 animate-spin text-white" />
              ) : (
                <>
                  <Camera className="w-24 h-24 text-white mb-2 drop-shadow-lg" />
                  <span className="text-2xl font-bold text-white drop-shadow-lg">REGISTRAR</span>
                  <span className="text-2xl font-bold text-white drop-shadow-lg">RONDA</span>
                </>
              )}
            </button>

            {/* Feed discreto de últimos registros */}
            {recentScans.length > 0 && (
              <div className="w-full space-y-2">
                <div className="text-xs text-blue-300 text-center font-medium">
                  Últimos registros ({recentScans.length})
                </div>
                {recentScans.map((scan) => (
                  <div
                    key={scan.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border ${
                      scan.status === 'success'
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                    }`}
                  >
                    <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      scan.status === 'success' ? 'bg-green-500/30' : 'bg-red-500/30'
                    }`}>
                      {scan.status === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      ) : (
                        <X className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {scan.status === 'success' ? (
                        <>
                          <div className="text-xs font-medium truncate">
                            {scan.etapa ? `Etapa ${scan.etapa}` : scan.nombre}
                            {scan.post && ` · Posto #${scan.post}`}
                          </div>
                          <div className="text-[10px] text-blue-300">
                            {scan.fecha} · {scan.hora}
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-red-300 truncate">
                          {scan.errorMsg || 'Error'}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Botón discreto de ingreso manual */}
            <button
              onClick={() => setManualMode(true)}
              className="text-xs text-blue-400/70 hover:text-blue-300 underline"
            >
              Ingreso manual
            </button>
          </div>
        )}

        {/* Vista del escáner activo */}
        {scannerActive && !manualMode && (
          <div className="flex-1 flex flex-col">
            {/* Marco de video */}
            <div className="relative">
              <div
                id={containerId}
                className="w-full aspect-square max-w-sm mx-auto rounded-2xl overflow-hidden bg-black border-4 border-amber-400 relative"
              >
                {cameraState === 'scanning' && (
                  <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
                    <div className="relative w-3/4 h-3/4">
                      <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-amber-400 rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-amber-400 rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-amber-400 rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-amber-400 rounded-br-lg" />
                      <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-amber-400/70 animate-pulse" />
                    </div>
                  </div>
                )}
                {cameraState === 'starting' && (
                  <div className="absolute inset-0 flex items-center justify-center text-white/80">
                    <RefreshCw className="w-8 h-8 animate-spin" />
                  </div>
                )}
                {(cameraState === 'error' || cameraState === 'denied') && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 text-center p-4">
                    <AlertCircle className="w-12 h-12 text-amber-400 mb-2" />
                    <p className="text-sm">{errorMsg}</p>
                  </div>
                )}
              </div>

              {/* Indicador de registro en curso */}
              {registering && (
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 z-20">
                  <ScanLine className="w-3 h-3 animate-pulse" />
                  Registrando...
                </div>
              )}
            </div>

            {/* Último registro exitoso (feedback grande) */}
            {recentScans.length > 0 && recentScans[0].status === 'success' && (
              <div className="mt-4 bg-green-500/20 border border-green-500/40 rounded-xl p-3 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-1" />
                <div className="text-sm font-bold text-green-300">
                  {recentScans[0].etapa ? `Etapa ${recentScans[0].etapa}` : recentScans[0].nombre}
                  {recentScans[0].post && ` · Posto #${recentScans[0].post}`}
                </div>
                <div className="text-xs text-green-400/70">
                  {recentScans[0].fecha} · {recentScans[0].hora}
                </div>
              </div>
            )}

            {/* Controles discretos */}
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => startCamera(facingMode)}
                disabled={scannerStarting || registering}
                className="bg-white/5 border-white/20 text-white hover:bg-white/10"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Reiniciar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const next = facingMode === 'environment' ? 'user' : 'environment'
                  setFacingMode(next)
                  startCamera(next)
                }}
                disabled={scannerStarting || registering}
                className="bg-white/5 border-white/20 text-white hover:bg-white/10"
              >
                <Camera className="w-3.5 h-3.5 mr-1.5" />
                Cambiar cámara
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  await stopCamera()
                  setManualMode(true)
                }}
                disabled={registering}
                className="bg-white/5 border-white/20 text-white hover:bg-white/10"
              >
                <Keyboard className="w-3.5 h-3.5 mr-1.5" />
                Manual
              </Button>
            </div>

            {/* Feed mini de los últimos 3 */}
            {recentScans.length > 1 && (
              <div className="mt-4 space-y-1.5">
                <div className="text-[10px] text-blue-300/70 text-center">Registros anteriores</div>
                {recentScans.slice(1, 4).map((scan) => (
                  <div
                    key={scan.id}
                    className={`flex items-center gap-2 p-2 rounded text-xs ${
                      scan.status === 'success'
                        ? 'bg-green-500/5 text-green-300/80'
                        : 'bg-red-500/5 text-red-300/80'
                    }`}
                  >
                    {scan.status === 'success' ? (
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                    ) : (
                      <X className="w-3 h-3 shrink-0" />
                    )}
                    <span className="truncate flex-1">
                      {scan.status === 'success'
                        ? `${scan.etapa ? `Etapa ${scan.etapa}` : scan.nombre}${scan.post ? ` · #${scan.post}` : ''} · ${scan.hora}`
                        : scan.errorMsg || 'Error'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Vista de ingreso manual */}
        {manualMode && (
          <div className="flex-1 flex flex-col justify-center space-y-4">
            <div>
              <label className="text-xs text-blue-300 mb-2 block">Código o URL del QR</label>
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleManualSubmit() }}
                placeholder="Ej: RONDA-ABC123 o https://..."
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:border-amber-400"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  setManualMode(false)
                  setManualCode('')
                  startCamera(facingMode)
                }}
                variant="outline"
                className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
              >
                <Camera className="w-4 h-4 mr-2" /> Volver a cámara
              </Button>
              <Button
                onClick={handleManualSubmit}
                disabled={!manualCode.trim() || registering}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              >
                {registering ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Registrar
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Footer discreto */}
      <footer className="bg-black/30 border-t border-white/10 px-4 py-2 shrink-0">
        <p className="text-[10px] text-center text-blue-300/50">
          Asesorías Integrales CyJ · Administración de Condominios
        </p>
      </footer>
    </div>
  )
}
