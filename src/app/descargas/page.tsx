"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileArchive, FileText, CheckCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function DescargasPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/logo.png" alt="CyJ Logo" className="h-16 w-auto" />
          </div>
          <h1 className="text-3xl font-bold text-emerald-800 mb-2">
            📦 Descargas - Sistema CyJ
          </h1>
          <p className="text-gray-600">
            Todo lo que necesitas para poner tu sistema en producción
          </p>
        </div>

        {/* IMPORTANTE */}
        <Card className="mb-6 border-2 border-red-500 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-6 w-6" />
              ⚠️ IMPORTANTE - LEER ANTES DE DESCARGAR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-800 font-medium mb-2">
              Este archivo está configurado para PostgreSQL (Neon.tech)
            </p>
            <p className="text-sm text-red-700">
              Asegúrate de tener tu variable DATABASE_URL configurada en Vercel con la conexión de Neon.tech
            </p>
          </CardContent>
        </Card>

        {/* Archivo Principal */}
        <Card className="mb-6 border-2 border-emerald-500 shadow-lg">
          <CardHeader className="bg-emerald-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-xl">
              <FileArchive className="h-6 w-6" />
              📦 PROYECTO COMPLETO PARA VERCEL
            </CardTitle>
            <CardDescription className="text-emerald-100">
              Este archivo contiene TODO el código fuente correcto
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-2">PROYECTO_COMPLETO_VERCEL.zip</h3>
                <p className="text-gray-600 mb-3">Tamaño: ~2.2 MB</p>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>✅ schema.prisma configurado para PostgreSQL</li>
                  <li>✅ vercel.json con comandos correctos</li>
                  <li>✅ Todo el código fuente del sistema</li>
                  <li>✅ APIs completas</li>
                </ul>
              </div>
              <a
                href="/api/descargar/proyecto"
                download
                className="w-full sm:w-auto"
              >
                <Button size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-lg py-6 px-8">
                  <Download className="mr-2 h-5 w-5" />
                  DESCARGAR
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Pasos */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>📋 Pasos para instalar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 text-white font-bold">1</span>
                <div>
                  <p className="font-medium">Descarga el archivo</p>
                  <p className="text-sm text-gray-600">Clic en el botón verde de arriba</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 text-white font-bold">2</span>
                <div>
                  <p className="font-medium">Descomprime el archivo</p>
                  <p className="text-sm text-gray-600">Clic derecho → Extraer todo</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 text-white font-bold">3</span>
                <div>
                  <p className="font-medium">Sube a GitHub</p>
                  <p className="text-sm text-gray-600">Usa GitHub Desktop para subir la carpeta</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 text-white font-bold">4</span>
                <div>
                  <p className="font-medium">Conecta con Vercel</p>
                  <p className="text-sm text-gray-600">Importa el repositorio y configura DATABASE_URL</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 text-white font-bold">5</span>
                <div>
                  <p className="font-medium">Crea el usuario admin</p>
                  <p className="text-sm text-gray-600">Ve a /api/setup después del deploy</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credenciales */}
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle>🔑 Credenciales por defecto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-sm text-gray-600">Usuario</p>
                <p className="font-mono font-bold text-lg">admin@cyj.cl</p>
              </div>
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-sm text-gray-600">Contraseña</p>
                <p className="font-mono font-bold text-lg">admin123</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botón volver */}
        <div className="text-center">
          <Link href="/">
            <Button variant="outline" className="gap-2">
              ← Volver al Sistema
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
