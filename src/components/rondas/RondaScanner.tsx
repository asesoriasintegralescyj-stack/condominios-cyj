'use client'

/**
 * RondaScanner
 * ------------
 * Componente de escaneo QR con cámara usando html5-qrcode.
 *
 * - Al montarse, solicita acceso a la cámara trasera (environment) y comienza a escanear.
 * - Cuando detecta un QR válido, llama a onScan(text) y entra en cooldown breve
 *   para evitar registros duplicados del mismo código.
 * - Muestra el video en vivo + overlay con marco de escaneo.
 * - Botón para cambiar de cámara (frontal/trasera) en dispositivos móviles.
 * - Botón para ingresar código manualmente (fallback si no hay cámara).
 *
 * Nota: html5-qrcode solo funciona en el navegador, por eso el import es dinámico.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Camera, RefreshCw, Keyboard, AlertCircle, ScanLine } from 'lucide-react'

interface RondaScannerProps {
  onScan: (text: string) => Promise<void> | void
  registering?: boolean
}

type CameraState = 'idle' | 'starting' | 'scanning' | 'error' | 'denied'

export function RondaScanner({ onScan, registering }: RondaScannerProps) {
  const containerId = 'ronda-qr-reader'
  const html5QrCodeRef = useRef<any>(null)
  const lastScanRef = useRef<{ text: string; ts: number } | null>(null)
  const [cameraState, setCameraState] = useState<CameraState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [manualMode, setManualMode] = useState(false)
  const [manualCode, setManualCode] = useState('')
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')

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
  }, [])

  const startCamera = useCallback(async (mode: 'environment' | 'user') => {
    setCameraState('starting')
    setErrorMsg('')

    // Detener cualquier instancia previa
    await stopCamera()

    try {
      // Import dinámico para evitar SSR
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
          const size = Math.floor(minEdge * 0.7)
          return { width: size, height: size }
        },
        aspectRatio: 1.0,
      }

      await html5QrCode.start(
        { facingMode: mode },
        config,
        (decodedText: string) => {
          // Cooldown de 3s para el mismo código
          const now = Date.now()
          const last = lastScanRef.current
          if (last && last.text === decodedText && now - last.ts < 3000) {
            return
          }
          lastScanRef.current = { text: decodedText, ts: now }
          // onScan puede ser async; lo disparamos sin esperar
          Promise.resolve(onScan(decodedText)).catch((e) => {
            console.error('Error en onScan:', e)
          })
        },
        () => {
          // Errores de decodificación por frame — ignorar (ruido normal)
        },
      )

      setCameraState('scanning')
    } catch (err: any) {
      console.error('Error iniciando cámara:', err)
      const msg = String(err?.message || err || '')
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied') || msg.toLowerCase().includes('notallowed')) {
        setCameraState('denied')
        setErrorMsg('Permiso de cámara denegado. Habilítalo en tu navegador o usa el ingreso manual.')
      } else if (msg.toLowerCase().includes('notfound') || msg.toLowerCase().includes('no camera')) {
        setCameraState('error')
        setErrorMsg('No se encontró ninguna cámara en este dispositivo. Usa el ingreso manual.')
      } else {
        setCameraState('error')
        setErrorMsg('No se pudo iniciar la cámara: ' + (msg || 'error desconocido'))
      }
    }
  }, [onScan, stopCamera])

  // Auto-iniciar al montar
  useEffect(() => {
    startCamera(facingMode)
    return () => {
      stopCamera()
    }
  }, [startCamera, stopCamera, facingMode])

  const handleSwitchCamera = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(next)
    startCamera(next)
  }

  const handleManualSubmit = async () => {
    if (!manualCode.trim()) return
    try {
      await onScan(manualCode.trim())
      setManualCode('')
    } catch (e) {
      console.error('Error en registro manual:', e)
    }
  }

  return (
    <div className="space-y-4">
      {/* Marco de video */}
      {!manualMode && (
        <div className="relative">
          <div
            id={containerId}
            className="w-full aspect-square max-w-sm mx-auto rounded-xl overflow-hidden bg-black border-4 border-[#0f2040] relative"
          >
            {/* Overlay con marco de escaneo */}
            {cameraState === 'scanning' && (
              <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
                <div className="relative w-3/4 h-3/4">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-amber-400 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-amber-400 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-amber-400 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-amber-400 rounded-br-lg" />
                  <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-amber-400/70 animate-pulse" />
                </div>
              </div>
            )}
            {cameraState === 'starting' && (
              <div className="absolute inset-0 flex items-center justify-center text-white/80 text-sm">
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Iniciando cámara...
              </div>
            )}
            {(cameraState === 'error' || cameraState === 'denied') && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 text-center p-4">
                <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
                <p className="text-sm">{errorMsg}</p>
              </div>
            )}
            {cameraState === 'idle' && (
              <div className="absolute inset-0 flex items-center justify-center text-white/60 text-sm">
                <Camera className="w-5 h-5 mr-2" />
                Cámara apagada
              </div>
            )}
          </div>

          {/* Controles */}
          <div className="flex flex-wrap gap-2 justify-center mt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => startCamera(facingMode)}
              disabled={cameraState === 'starting' || registering}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Reiniciar cámara
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSwitchCamera}
              disabled={cameraState === 'starting' || registering}
            >
              <Camera className="w-3.5 h-3.5 mr-1.5" />
              Cambiar cámara
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { setManualMode(true); stopCamera() }}
            >
              <Keyboard className="w-3.5 h-3.5 mr-1.5" />
              Ingreso manual
            </Button>
          </div>

          {registering && (
            <div className="mt-3 flex items-center justify-center text-sm text-blue-600">
              <ScanLine className="w-4 h-4 mr-2 animate-pulse" />
              Registrando ronda...
            </div>
          )}
        </div>
      )}

      {/* Ingreso manual */}
      {manualMode && (
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
            Ingresa manualmente el código o URL del QR. Ej: <code className="bg-white px-1 rounded">RONDA-ABC123</code> o <code className="bg-white px-1 rounded">https://condominios-cyj.vercel.app/ronda/ALBATROS/1</code>
          </div>
          <Input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Código o URL del QR"
            onKeyDown={(e) => { if (e.key === 'Enter') handleManualSubmit() }}
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setManualMode(false); setManualCode(''); startCamera(facingMode) }}
              disabled={registering}
            >
              <Camera className="w-3.5 h-3.5 mr-1.5" />
              Volver a cámara
            </Button>
            <Button
              size="sm"
              onClick={handleManualSubmit}
              disabled={!manualCode.trim() || registering}
            >
              Registrar
            </Button>
          </div>
        </div>
      )}

      {/* Sugerencia para móvil */}
      <p className="text-xs text-gray-500 text-center">
        💡 Para mejor resultado, acerca la cámara a 10–15 cm del QR y mantén el dispositivo estable.
      </p>
    </div>
  )
}
