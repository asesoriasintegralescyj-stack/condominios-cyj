'use client'

/**
 * ForcePasswordChangeDialog
 * ------------------------
 * Modal que se muestra al usuario en su primer inicio de sesión (o cuando
 * cambiarPasswordProximoLogin=true) para forzar el cambio de contraseña.
 *
 * - No se puede cerrar con click fuera ni con ESC.
 * - Pide contraseña nueva + confirmación.
 * - Llama a /api/auth/cambiar-password con forceFirstLogin=true.
 * - Al éxito, llama a onSuccess() para que la app continúe.
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Lock, Eye, EyeOff, AlertCircle, Loader2, CheckCircle2, KeyRound } from 'lucide-react'
import { toast } from 'sonner'

interface ForcePasswordChangeDialogProps {
  open: boolean
  email?: string
  onSuccess: () => void
}

export function ForcePasswordChangeDialog({ open, email, onSuccess }: ForcePasswordChangeDialogProps) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const passwordStrength = (() => {
    if (!newPassword) return { score: 0, label: '', color: '' }
    let score = 0
    if (newPassword.length >= 8) score++
    if (newPassword.length >= 12) score++
    if (/[A-Z]/.test(newPassword)) score++
    if (/[0-9]/.test(newPassword)) score++
    if (/[^A-Za-z0-9]/.test(newPassword)) score++
    const labels = ['', 'Muy débil', 'Débil', 'Aceptable', 'Buena', 'Fuerte']
    const colors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500']
    return { score, label: labels[score], color: colors[score] }
  })()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/cambiar-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword,
          forceFirstLogin: true,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al cambiar la contraseña')
        return
      }

      toast.success('¡Contraseña actualizada! Ya puedes continuar usando el sistema.')
      setNewPassword('')
      setConfirmPassword('')
      onSuccess()
    } catch (err) {
      console.error('Error:', err)
      setError('Error de conexión. Inténtalo nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => { /* no cerrar */ }}>
      <DialogContent
        className="max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        showCloseButton={false}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <DialogTitle className="text-lg">Cambio de contraseña obligatorio</DialogTitle>
              <DialogDescription className="text-xs">
                Por seguridad, debes cambiar tu contraseña antes de continuar
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 text-xs">
            {email ? (
              <>Hola <strong>{email}</strong>, detectamos que es tu primer inicio de sesión. Para proteger tu cuenta, establece una contraseña nueva que solo tú conozcas.</>
            ) : (
              <>Detectamos que es tu primer inicio de sesión. Para proteger tu cuenta, establece una contraseña nueva que solo tú conozcas.</>
            )}
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nueva contraseña</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-10 pr-10"
                placeholder="••••••••"
                required
                disabled={loading}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {newPassword && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full ${i <= passwordStrength.score ? passwordStrength.color : 'bg-gray-200'}`}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-gray-500">
                  Seguridad: <strong>{passwordStrength.label}</strong> · mínimo 8 caracteres, recomienda mayúsculas, números y símbolos
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10 pr-10"
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>
            {confirmPassword && newPassword === confirmPassword && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Las contraseñas coinciden
              </p>
            )}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button
              type="submit"
              className="w-full bg-[#0A1172] hover:bg-[#080d54]"
              disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Cambiar contraseña y continuar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
