/**
 * Página de recuperación de contraseña
 * Solicita el email y envía un enlace de recuperación.
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, ArrowLeft, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function RecuperarPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/recuperar-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al solicitar recuperación')
        return
      }

      setSuccess(true)
      // En desarrollo, la API puede devolver una URL de reseteo
      if (data.resetUrl) {
        setDevResetUrl(data.resetUrl)
      }
    } catch {
      setError('Error de conexión. Inténtalo nuevamente.')
    } finally {
      setLoading(false)
    }
  }

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
          <h1 className="text-2xl font-bold text-gray-900">Recuperar Contraseña</h1>
          <p className="text-[#0A1172] mt-1 font-medium text-sm">
            Asesorías Integrales CyJ
          </p>
        </div>

        <Card className="shadow-2xl border-gray-200">
          <CardHeader className="space-y-1 bg-gradient-to-r from-[#0A1172] to-[#080d54] text-white rounded-t-lg">
            <CardTitle className="text-xl text-center">¿Olvidaste tu contraseña?</CardTitle>
            <CardDescription className="text-center text-blue-200">
              Ingresa tu correo y te enviaremos un enlace para restablecerla
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {success ? (
              <div className="space-y-4">
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Si el email <strong>{email}</strong> está registrado, recibirás un enlace de recuperación en breve. Revisa tu bandeja de entrada y spam.
                  </AlertDescription>
                </Alert>

                {devResetUrl && (
                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800 text-xs">
                      <strong>Modo desarrollo:</strong> el envío de email no está configurado.
                      Usa este enlace para restablecer la contraseña:
                      <br />
                      <Link
                        href={devResetUrl}
                        className="text-amber-900 underline break-all mt-1 inline-block"
                      >
                        {devResetUrl}
                      </Link>
                    </AlertDescription>
                  </Alert>
                )}

                <Button asChild className="w-full bg-[#0A1172] hover:bg-[#080d54]">
                  <Link href="/login">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver al inicio de sesión
                  </Link>
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                      disabled={loading}
                      autoFocus
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-[#0A1172] hover:bg-[#080d54]"
                  disabled={loading || !email}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando enlace...
                    </>
                  ) : (
                    'Enviar enlace de recuperación'
                  )}
                </Button>

                <Button asChild variant="ghost" className="w-full">
                  <Link href="/login">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver al inicio de sesión
                  </Link>
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-6">
          © {new Date().getFullYear()} Asesorías Integrales CyJ. Todos los derechos reservados.
        </p>
      </div>
    </div>
  )
}
