'use client'

/**
 * Página dedicada para el rol GUARDIA.
 * Cámara nativa con <video> + getUserMedia + BarcodeDetector.
 * Geolocalización GPS al escanear.
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

  // Refs del escáner
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastScanRef = useRef<{ text: string; ts: number } | null>(null)

  // Estado
  const [scannerActive, setScannerActive] = useState(false)
  const [scannerStarting, setScannerStarting] = useState(false)
  const [cameraState, setCameraState] = useState<'idle' | 'starting' | 'scanning' | 'error' | 'denied'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [manualMode, setManualMode] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [registering, setRegistering] = useState(false)
  const [recentScans, setRecentScans] = useState<ScanRecord[]>([])

  // Verificar sesión
  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((data) => {
        if (!data.authenticated) { router.push('/login'); return }
        if (data.user.rol !== 'guardia') { router.push('/sistema'); return }
        setUser({ nombre: data.user.nombre, apellido: data.user.apellido, email: data.user.email })
        setLoading(false)
      })
      .catch(() => router.push('/login'))
  }, [router])

  // Detener todo
  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setScannerActive(false)
  }, [])

  // GPS
  const getGPS = (): Promise<{ latitud: number; longitud: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return }
      const id = setTimeout(() => resolve(null), 5000)
      navigator.geolocation.getCurrentPosition(
        (pos) => { clearTimeout(id); resolve({ latitud: pos.coords.latitude, longitud: pos.coords.longitude }) },
        () => { clearTimeout(id); resolve(null) },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 },
      )
    })
  }

  // Manejar QR detectado
  const handleScan = useCallback(async (text: string) => {
    if (registering) return
    setRegistering(true)
    try {
      const gps = await getGPS()
      const res = await fetch('/api/rondas/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: text, latitud: gps?.latitud, longitud: gps?.longitud }),
      })
      const data = await res.json()
      if (res.ok) {
        setRecentScans((prev) => [{
          id: crypto.randomUUID(),
          nombre: data.ronda?.nombre || 'Ronda',
          etapa: data.ronda?.etapa || '',
          post: data.ronda?.post || '',
          fecha: data.registro?.fecha || new Date().toISOString().split('T')[0],
          hora: data.registro?.hora || new Date().toTimeString().split(' ')[0].substring(0, 5),
          status: 'success' as const,
        }, ...prev].slice(0, 8))
        if (navigator.vibrate) navigator.vibrate(150)
      } else {
        setRecentScans((prev) => [{
          id: crypto.randomUUID(),
          nombre: text.substring(0, 60),
          etapa: '', post: '',
          fecha: new Date().toISOString().split('T')[0],
          hora: new Date().toTimeString().split(' ')[0].substring(0, 5),
          status: 'error' as const,
          errorMsg: data.error || 'Error al registrar',
        }, ...prev].slice(0, 8))
        if (navigator.vibrate) navigator.vibrate([200, 100, 200])
      }
    } catch (e) {
      console.error('Error:', e)
    } finally {
      setRegistering(false)
    }
  }, [registering])

  // Iniciar cámara — getUserMedia + jsQR (import dinámico)
  const startCamera = useCallback(async (mode: 'environment' | 'user') => {
    setScannerStarting(true)
    setCameraState('starting')
    setErrorMsg('')
    stopCamera()

    try {
      // 1. Importar jsQR dinámicamente (evita problemas de bundle en Next.js)
      const jsQRModule = await import('jsqr')
      const jsQR = jsQRModule.default || jsQRModule

      // 2. Obtener stream de cámara
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      })
      streamRef.current = stream

      // 3. Conectar al video element y esperar a que esté listo
      const video = videoRef.current
      if (!video) {
        setCameraState('error')
        setErrorMsg('Error interno: elemento de video no encontrado')
        return
      }

      video.srcObject = stream
      video.setAttribute('playsinline', 'true')
      video.muted = true

      // Esperar a que el video tenga datos cargados
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Timeout esperando cámara')), 10000)
        video.onloadeddata = () => {
          clearTimeout(timeout)
          resolve()
        }
        video.onerror = () => {
          clearTimeout(timeout)
          reject(new Error('Error al cargar video'))
        }
        video.play().catch((e) => {
          clearTimeout(timeout)
          reject(e)
        })
      })

      setCameraState('scanning')
      setScannerActive(true)

      // 4. Canvas para procesar frames
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) {
        setCameraState('error')
        setErrorMsg('No se pudo crear contexto de canvas')
        return
      }

      // 5. Escanear QR cada 300ms con jsQR
      scanIntervalRef.current = setInterval(() => {
        if (!videoRef.current || videoRef.current.readyState < 2) return

        const v = videoRef.current
        const w = v.videoWidth
        const h = v.videoHeight
        if (w === 0 || h === 0) return

        // Escanear a resolución reducida para mejor performance
        const scale = Math.min(1, 400 / Math.max(w, h))
        const sw = Math.floor(w * scale)
        const sh = Math.floor(h * scale)

        canvas.width = sw
        canvas.height = sh
        ctx.drawImage(v, 0, 0, sw, sh)

        try {
          const imageData = ctx.getImageData(0, 0, sw, sh)
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          })

          if (code && code.data) {
            const text = code.data
            const now = Date.now()
            const last = lastScanRef.current
            if (last && last.text === text && now - last.ts < 3000) return
            lastScanRef.current = { text, ts: now }
            handleScan(text)
          }
        } catch (e) {
          // Error procesando frame, continuar
        }
      }, 300)
    } catch (err: any) {
      console.error('Error cámara:', err)
      const msg = String(err?.message || err || '').toLowerCase()
      if (msg.includes('permission') || msg.includes('denied') || msg.includes('notallowed')) {
        setCameraState('denied')
        setErrorMsg('Permiso de cámara denegado. Ve a configuración del navegador → Permisos → Cámara → Permitir.')
      } else if (msg.includes('notfound') || msg.includes('no camera') || msg.includes('devices')) {
        setCameraState('error')
        setErrorMsg('No se encontró cámara. Usa ingreso manual.')
      } else if (msg.includes('notreadable') || msg.includes('track')) {
        setCameraState('error')
        setErrorMsg('La cámara está siendo usada por otra app. Cierra otras apps e intenta de nuevo.')
      } else if (msg.includes('timeout')) {
        setCameraState('error')
        setErrorMsg('La cámara tardó demasiado en iniciar. Intenta de nuevo.')
      } else {
        setCameraState('error')
        setErrorMsg('Error: ' + (err?.message || 'desconocido') + '. Usa ingreso manual.')
      }
    } finally {
      setScannerStarting(false)
    }
  }, [stopCamera, handleScan])

  // Cuando scannerActive cambia a true, iniciar la cámara
  // (el <video> ya está montado en el DOM en este punto)
  useEffect(() => {
    if (scannerActive && !manualMode && !scannerStarting && cameraState === 'idle') {
      startCamera(facingMode)
    }
  }, [scannerActive, manualMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup al desmontar
  useEffect(() => {
    return () => stopCamera()
  }, [stopCamera])

  const handleLogout = async () => {
    stopCamera()
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const handleManualSubmit = async () => {
    if (!manualCode.trim()) return
    await handleScan(manualCode.trim())
    setManualCode('')
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
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-sm border-b border-white/10 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <img src="/logo.jpg" alt="Logo" className="w-10 h-10 rounded-lg shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-bold truncate">Laguna Norte</div>
            <div className="text-[10px] text-blue-300 truncate">Control de Rondas</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => router.push('/manuales-guardia')} className="text-white/70 hover:text-white hover:bg-white/10">
            <BookOpen className="w-4 h-4 mr-1.5" /> Manuales
          </Button>
          <div className="text-right hidden sm:block">
            <div className="text-xs font-medium">{user?.nombre} {user?.apellido || ''}</div>
            <div className="text-[10px] text-blue-300">{horaStr}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout} className="text-white/70 hover:text-white hover:bg-white/10">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Contenido */}
      <main className="flex-1 flex flex-col px-4 py-6 max-w-md mx-auto w-full">
        <div className="text-center mb-4">
          <p className="text-xs text-blue-300 capitalize">{fechaStr}</p>
        </div>

        {/* Botón GIGANTE Registrar Ronda */}
        {!scannerActive && !manualMode && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 py-8">
            <button
              onClick={() => {
                // Marcar como activo PRIMERO para que el video se monte en el DOM
                setScannerActive(true)
              }}
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

            {recentScans.length > 0 && (
              <div className="w-full space-y-2">
                <div className="text-xs text-blue-300 text-center font-medium">Últimos registros ({recentScans.length})</div>
                {recentScans.map((scan) => (
                  <div key={scan.id} className={`flex items-center gap-3 p-2.5 rounded-lg border ${scan.status === 'success' ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                    <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${scan.status === 'success' ? 'bg-green-500/30' : 'bg-red-500/30'}`}>
                      {scan.status === 'success' ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <X className="w-4 h-4 text-red-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      {scan.status === 'success' ? (
                        <>
                          <div className="text-xs font-medium truncate">{scan.etapa ? `Etapa ${scan.etapa}` : scan.nombre}{scan.post && ` · Posto #${scan.post}`}</div>
                          <div className="text-[10px] text-blue-300">{scan.fecha} · {scan.hora}</div>
                        </>
                      ) : (
                        <div className="text-xs text-red-300 truncate">{scan.errorMsg || 'Error'}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setManualMode(true)} className="text-xs text-blue-400/70 hover:text-blue-300 underline">Ingreso manual</button>
          </div>
        )}

        {/* Vista del escáner activo */}
        {scannerActive && !manualMode && (
          <div className="flex-1 flex flex-col">
            {/* Video nativo — se monta cuando scannerActive es true */}
            <div className="relative">
              <div className="w-full aspect-square max-w-sm mx-auto rounded-2xl overflow-hidden bg-black border-4 border-amber-400 relative">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted
                />

                {/* Overlay con marco de escaneo */}
                {cameraState === 'scanning' && (
                  <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
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

              {registering && (
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 z-30">
                  <ScanLine className="w-3 h-3 animate-pulse" /> Registrando...
                </div>
              )}
            </div>

            {/* Último registro exitoso */}
            {recentScans.length > 0 && recentScans[0].status === 'success' && (
              <div className="mt-4 bg-green-500/20 border border-green-500/40 rounded-xl p-3 text-center">
                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-1" />
                <div className="text-sm font-bold text-green-300">{recentScans[0].etapa ? `Etapa ${recentScans[0].etapa}` : recentScans[0].nombre}{recentScans[0].post && ` · Posto #${recentScans[0].post}`}</div>
                <div className="text-xs text-green-400/70">{recentScans[0].fecha} · {recentScans[0].hora}</div>
              </div>
            )}

            {/* Controles */}
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              <Button variant="outline" size="sm" onClick={() => startCamera(facingMode)} disabled={scannerStarting || registering} className="bg-white/5 border-white/20 text-white hover:bg-white/10">
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reiniciar
              </Button>
              <Button variant="outline" size="sm" onClick={() => { const n = facingMode === 'environment' ? 'user' : 'environment'; setFacingMode(n); startCamera(n) }} disabled={scannerStarting || registering} className="bg-white/5 border-white/20 text-white hover:bg-white/10">
                <Camera className="w-3.5 h-3.5 mr-1.5" /> Cambiar cámara
              </Button>
              <Button variant="outline" size="sm" onClick={() => { stopCamera(); setManualMode(true) }} disabled={registering} className="bg-white/5 border-white/20 text-white hover:bg-white/10">
                <Keyboard className="w-3.5 h-3.5 mr-1.5" /> Manual
              </Button>
            </div>

            {recentScans.length > 1 && (
              <div className="mt-4 space-y-1.5">
                <div className="text-[10px] text-blue-300/70 text-center">Registros anteriores</div>
                {recentScans.slice(1, 4).map((scan) => (
                  <div key={scan.id} className={`flex items-center gap-2 p-2 rounded text-xs ${scan.status === 'success' ? 'bg-green-500/5 text-green-300/80' : 'bg-red-500/5 text-red-300/80'}`}>
                    {scan.status === 'success' ? <CheckCircle2 className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0" />}
                    <span className="truncate flex-1">{scan.status === 'success' ? `${scan.etapa ? `Etapa ${scan.etapa}` : scan.nombre}${scan.post ? ` · #${scan.post}` : ''} · ${scan.hora}` : scan.errorMsg || 'Error'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Ingreso manual */}
        {manualMode && (
          <div className="flex-1 flex flex-col justify-center space-y-4">
            <div>
              <label className="text-xs text-blue-300 mb-2 block">Código o URL del QR</label>
              <input type="text" value={manualCode} onChange={(e) => setManualCode(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleManualSubmit() }} placeholder="Ej: RONDA-ABC123 o https://..." className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/40 focus:outline-none focus:border-amber-400" autoFocus />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => { setManualMode(false); setManualCode(''); setScannerActive(true) }} variant="outline" className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10">
                <Camera className="w-4 h-4 mr-2" /> Volver a cámara
              </Button>
              <Button onClick={handleManualSubmit} disabled={!manualCode.trim() || registering} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white">
                {registering ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />} Registrar
              </Button>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-black/30 border-t border-white/10 px-4 py-2 shrink-0">
        <p className="text-[10px] text-center text-blue-300/50">Asesorías Integrales CyJ · Administración de Condominios</p>
      </footer>
    </div>
  )
}
