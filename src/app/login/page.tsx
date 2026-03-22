/**
 * Página de Login
 * Asesorías Integrales CyJ - Sistema de Gestión
 */

'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, User, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Error al iniciar sesión');
        return;
      }

      // Redirigir a la página solicitada o al dashboard
      router.push(redirect);
      router.refresh();
      
    } catch {
      setError('Error de conexión. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Email Field */}
      <div className="space-y-2">
        <Label htmlFor="email">Correo Electrónico</Label>
        <div className="relative">
          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="correo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10"
            required
            disabled={loading}
          />
        </div>
      </div>

      {/* Password Field */}
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10 pr-10"
            required
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <Button type="submit" className="w-full bg-[#0A1172] hover:bg-[#080d54]" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Iniciando sesión...
          </>
        ) : (
          'Iniciar Sesión'
        )}
      </Button>
    </form>
  );
}

function LoginLoading() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Correo Electrónico</Label>
        <Input disabled placeholder="Cargando..." />
      </div>
      <div className="space-y-2">
        <Label>Contraseña</Label>
        <Input disabled placeholder="Cargando..." />
      </div>
      <Button disabled className="w-full bg-[#0A1172]">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Cargando...
      </Button>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4">
      <div className="w-full max-w-md">
        {/* Logo y Título */}
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
          <h1 className="text-2xl font-bold text-gray-900">
            Asesorías Integrales CyJ
          </h1>
          <p className="text-[#0A1172] mt-1 font-medium text-sm">
            Administración de Condominios
          </p>
          <p className="text-gray-500 mt-2 text-sm">
            Sistema de Gestión
          </p>
        </div>

        {/* Tarjeta de Login */}
        <Card className="shadow-2xl border-gray-200">
          <CardHeader className="space-y-1 bg-gradient-to-r from-[#0A1172] to-[#080d54] text-white rounded-t-lg">
            <CardTitle className="text-xl text-center">Iniciar Sesión</CardTitle>
            <CardDescription className="text-center text-blue-200">
              Ingrese sus credenciales para acceder al sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <Suspense fallback={<LoginLoading />}>
              <LoginForm />
            </Suspense>


          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          © {new Date().getFullYear()} Asesorías Integrales CyJ. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
