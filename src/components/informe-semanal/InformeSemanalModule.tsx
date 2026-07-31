'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useSession } from '@/hooks/use-session'
import { TableroIndicadores } from '@/components/ui/tablero-indicadores'
import { toast } from 'sonner'
import {
  FileText, Presentation, Download, RefreshCw, Mail, Calendar, Loader2,
  FileDown, BarChart3, CheckCircle, Clock, AlertCircle, Users,
  ShoppingCart, DollarSign, Shield, ClipboardList,
} from 'lucide-react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

export function InformeSemanalModule() {
  const { user } = useSession()
  const [loading, setLoading] = useState(false)
  const [dias, setDias] = useState('7')
  const [emailEnviado, setEmailEnviado] = useState(false)

  const handleDownload = async (formato: 'word' | 'pptx') => {
    setLoading(true)
    try {
      const res = await fetch(`/api/informe-semanal?formato=${formato}&dias=${dias}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error')
      }
      const data = await res.json()

      if (formato === 'word' && data.archivos.word) {
        const byteChars = atob(data.archivos.word)
        const byteNumbers = new Array(byteChars.length)
        for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i)
        const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = data.filename_word
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Informe Word descargado correctamente')
      }

      if (formato === 'pptx' && data.archivos.pptx) {
        const byteChars = atob(data.archivos.pptx)
        const byteNumbers = new Array(byteChars.length)
        for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i)
        const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = data.filename_pptx
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Presentación PPT descargada correctamente')
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error('Error al generar el informe')
    } finally {
      setLoading(false)
    }
  }

  const handleEnviarEmail = async () => {
    setLoading(true)
    setEmailEnviado(false)
    try {
      const res = await fetch(`/api/informe-semanal-email?dias=${dias}`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        toast.success('Informe enviado por email correctamente')
        setEmailEnviado(true)
      } else {
        toast.error(data.error || 'Error al enviar email')
      }
    } catch (error) {
      toast.error('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-xl">
            <BarChart3 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Informe Semanal</h1>
            <p className="text-sm text-slate-500">Informe completo de gestión del Condominio Laguna Norte</p>
          </div>
        </div>
      </div>

      {/* Configuración */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium text-slate-700">Período:</Label>
              <Select value={dias} onValueChange={setDias}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 días</SelectItem>
                  <SelectItem value="14">Últimos 14 días</SelectItem>
                  <SelectItem value="30">Últimos 30 días</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => handleDownload('word')}
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Descargar Word
              </Button>

              <Button
                onClick={() => handleDownload('pptx')}
                disabled={loading}
                variant="outline"
                className="flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Presentation className="w-4 h-4" />}
                Descargar PPT
              </Button>

              <Button
                onClick={handleEnviarEmail}
                disabled={loading}
                variant="secondary"
                className="flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                Enviar por Email
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contenido del informe */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ClipboardList className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-bold text-slate-800">Órdenes de Trabajo</h3>
            </div>
            <p className="text-sm text-slate-500 mb-3">OTs creadas y sus estados, con fotografías antes/después incluidas.</p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <AlertCircle className="w-3 h-3" /> Pendientes, En Progreso, Completadas, Canceladas
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-teal-100 rounded-lg">
                <BarChart3 className="w-5 h-5 text-teal-600" />
              </div>
              <h3 className="font-bold text-slate-800">Proyectos</h3>
            </div>
            <p className="text-sm text-slate-500 mb-3">Proyectos creados con avances, presupuesto y fotografías.</p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <CheckCircle className="w-3 h-3" /> Planificados, En Ejecución, Completados
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-bold text-slate-800">Rondas y QR</h3>
            </div>
            <p className="text-sm text-slate-500 mb-3">Lecturas QR, puntos creados y rondas por trabajador.</p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Users className="w-3 h-3" /> Agrupado por guardia/trabajador
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="font-bold text-slate-800">Solicitudes de Compra</h3>
            </div>
            <p className="text-sm text-slate-500 mb-3">Todas las solicitudes con sus estados de aprobación.</p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock className="w-3 h-3" /> Solicitado, En Proceso, Comprado, Rechazado
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-bold text-slate-800">Rendición de Gastos</h3>
            </div>
            <p className="text-sm text-slate-500 mb-3">Rendiciones procesadas con montos y estados.</p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <AlertCircle className="w-3 h-3" /> Borrador, Enviado, Aprobado, Rechazado
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <ClipboardList className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="font-bold text-slate-800">PMI - Mantenimiento</h3>
            </div>
            <p className="text-sm text-slate-500 mb-3">Listas de verificación, avances y pendientes del PMI.</p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <CheckCircle className="w-3 h-3" /> Completados, Pendientes, En Progreso
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Email automático info */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <Mail className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-800">Envío Automático</h3>
          </div>
          <p className="text-sm text-slate-500">
            Este informe se envía automáticamente cada <strong className="text-slate-700">martes</strong> al correo{' '}
            <strong className="text-blue-600">asesoriasintegralescyj@gmail.com</strong>.
            También puede descargarlo manualmente en formato Word o PPT en cualquier momento.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
