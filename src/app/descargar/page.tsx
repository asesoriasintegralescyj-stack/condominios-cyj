'use client'

import { Button } from '@/components/ui/button'
import { Download, CheckCircle } from 'lucide-react'

// Página de descarga del sistema
export default function DescargarPage() {
  return (
    <div className="min-h-screen bg-emerald-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 text-center">

        {/* Logo */}
        <img src="/logo.png" alt="CyJ Logo" className="h-20 w-auto mx-auto mb-6" />

        {/* Título */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Sistema de Condominios
        </h1>
        <p className="text-gray-600 mb-6">
          Asesorías Integrales CyJ
        </p>

        {/* Botón de descarga */}
        <a
          href="/api/descargar/proyecto"
          download
          className="block mb-6"
        >
          <Button
            size="lg"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xl py-8"
          >
            <Download className="mr-3 h-6 w-6" />
            DESCARGAR SISTEMA
          </Button>
        </a>

        {/* Qué incluye */}
        <div className="text-left bg-gray-50 rounded-xl p-4 mb-6">
          <p className="font-semibold text-gray-900 mb-3">El archivo incluye:</p>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <span>Código completo del sistema</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <span>Configurado para PostgreSQL</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <span>Listo para subir a Vercel</span>
            </div>
          </div>
        </div>

        {/* Credenciales */}
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="font-semibold text-blue-900 mb-2">Credenciales por defecto:</p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-white rounded-lg p-2 border">
              <p className="text-gray-500">Usuario</p>
              <p className="font-mono font-bold">admin@cyj.cl</p>
            </div>
            <div className="bg-white rounded-lg p-2 border">
              <p className="text-gray-500">Contraseña</p>
              <p className="font-mono font-bold">admin123</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
