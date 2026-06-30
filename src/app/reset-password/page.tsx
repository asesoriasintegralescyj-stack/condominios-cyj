/**
 * Página para restablecer la contraseña usando un token.
 * Lee el token de la URL (?token=...) y muestra el formulario.
 */

'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Lock, Eye, EyeOff, CheckCircle2, Loader2, AlertCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
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

    if (!token) {
      setError('Token no encontrado en la URL')
      return
    }
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
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al restablecer la contraseña')
        return
      }

      setSuccess(true)
    } catch {
      setError('Error de conexión. Inténtalo nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Enlace inválido. No se encontró el token de recuperación. Solicita un nuevo enlace{' '}
          <Link href="/recuperar-password" className="underline">aquí</Link>.
        </AlertDescription>
      </Alert>
    )
  }

  if (success) {
    return (
      <div className="space-y-4">
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            ¡Contraseña restablecida correctamente! Ya puedes iniciar sesión con tu nueva contraseña.
          </AlertDescription>
        </Alert>
        <Button asChild className="w-full bg-[#0A1172] hover:bg-[#080d54]">
          <Link href="/login">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Ir al inicio de sesión
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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
              Seguridad: <strong>{passwordStrength.label}</strong>
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
      </div>

      <Button
        type="submit"
        className="w-full bg-[#0A1172] hover:bg-[#080d54]"
        disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Restableciendo...
          </>
        ) : (
          'Restablecer contraseña'
        )}
      </Button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#0A1172] to-[#080d54] rounded-2xl mb-4 overflow-hidden shadow-xl">
            <img
              src="/logo.jpg"
              alt="Asesorías Integrales CyJ"
              width={64}
              height={64}
              className="w-16 h-16 object-cover"
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Nueva Contraseña</h1>
          <p className="text-[#0A1172] mt-1 font-medium text-sm">
            Asesorías Integrales CyJ
          </p>
        </div>

        <Card className="shadow-2xl border-gray-200">
          <CardHeader className="space-y-1 bg-gradient-to-r from-[#0A1172] to-[#080d54] text-white rounded-t-lg">
            <CardTitle className="text-xl text-center">Establecer nueva contraseña</CardTitle>
            <CardDescription className="text-center text-blue-200">
              Ingresa tu nueva contraseña para restablecer el acceso
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Suspense fallback={<div className="text-center text-sm text-gray-500">Cargando...</div>}>
              <ResetPasswordForm />
            </Suspense>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-6">
          © {new Date().getFullYear()} Asesorías Integrales CyJ. Todos los derechos reservados.
        </p>
      </div>
    </div>
  )
}
