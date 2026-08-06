'use client'

import { useState } from 'react'
import { useSession } from '@/hooks/use-session'
import {
  Download,
  Mail,
  FileText,
  Presentation,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  BarChart3,
  TrendingUp,
  Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

type PeriodoDias = 7 | 14 | 30

interface Resumen {
  totalOTs: number
  nuevasOTs: number
  otsCompletadas: number
  otsEnProgreso: number
  otsPendientes: number
  totalProyectos: number
  proyectosCompletados: number
  proyectosEnEjecucion: number
  totalRondas: number
  totalQrCreados: number
  totalSolicitudes: number
  solicitudesAprobadas: number
  solicitudesPendientes: number
  totalRendiciones: number
  rendicionesAprobadas: number
  rendicionesPendientes: number
  totalPMI: number
  pmiCompletados: number
  pmiPendientes: number
}

export function InformeSemanalModule() {
  const { user, isAdmin } = useSession()
  const [dias, setDias] = useState<PeriodoDias>(7)
  const [loading, setLoading] = useState<string | null>(null) // 'word' | 'pptx' | 'email' | null
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  const handleDownload = async (formato: 'word' | 'pptx') => {
    if (loading) return
    setLoading(formato)
    setResult(null)
    try {
      const res = await fetch(`/api/informe-semanal?formato=${formato}&dias=${dias}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error generando informe')
      }
      // La API devuelve JSON con el archivo en base64 dentro de "archivos"
      const data = await res.json()
      const base64Key = formato === 'word' ? 'word' : 'pptx'
      const filenameKey = formato === 'word' ? 'filename_word' : 'filename_pptx'
      const base64Data = data.archivos?.[base64Key]
      const filename = data[filenameKey] || `informe-semanal-${dias}dias.${formato === 'word' ? 'docx' : 'pptx'}`

      if (!base64Data) {
        throw new Error('No se recibió el archivo del servidor')
      }

      // Convertir base64 a blob binario
      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const mimeType = formato === 'word'
        ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      const blob = new Blob([bytes], { type: mimeType })

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setResult({ ok: true, message: `${formato === 'word' ? 'Word' : 'PowerPoint'} descargado correctamente` })
    } catch (err: any) {
      setResult({ ok: false, message: err.message || 'Error al descargar' })
    } finally {
      setLoading(null)
    }
  }

  const handleEmail = async () => {
    if (loading) return
    if (!confirm('¿Enviar el informe semanal por email? Se enviará un Word con el resumen completo.')) return
    setLoading('email')
    setResult(null)
    try {
      const res = await fetch(`/api/informe-semanal?formato=word&dias=${dias}&email=true`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error enviando informe')
      }
      const data = await res.json()
      setResult({ ok: true, message: data.message || 'Informe enviado por email correctamente' })
    } catch (err: any) {
      setResult({ ok: false, message: err.message || 'Error al enviar por email' })
    } finally {
      setLoading(null)
    }
  }

  if (!isAdmin()) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <p className="text-slate-500">Solo los administradores pueden acceder al Informe Semanal.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-[#0f2044] flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-500" />
              Informe Semanal
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Genera reportes completos del periodo seleccionado con OTs, proyectos, rondas, compras, rendiciones y PMI.
            </p>
          </div>
        </div>

        {/* Período selector */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            Período:
          </span>
          {([7, 14, 30] as PeriodoDias[]).map((d) => (
            <button
              key={d}
              onClick={() => { setDias(d); setResult(null) }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                dias === d
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {d} días
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => handleDownload('word')}
            disabled={!!loading}
            className="flex items-center justify-center gap-2 px-5 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow"
          >
            {loading === 'word' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            {loading === 'word' ? 'Generando...' : 'Descargar Word'}
          </button>

          <button
            onClick={() => handleDownload('pptx')}
            disabled={!!loading}
            className="flex items-center justify-center gap-2 px-5 py-3.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow"
          >
            {loading === 'pptx' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Presentation className="w-4 h-4" />
            )}
            {loading === 'pptx' ? 'Generando...' : 'Descargar PPT'}
          </button>

          <button
            onClick={handleEmail}
            disabled={!!loading}
            className="flex items-center justify-center gap-2 px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow"
          >
            {loading === 'email' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Mail className="w-4 h-4" />
            )}
            {loading === 'email' ? 'Enviando...' : 'Enviar por Email'}
          </button>
        </div>

        {/* Result message */}
        {result && (
          <div
            className={`mt-4 flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
              result.ok
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {result.ok ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            {result.message}
          </div>
        )}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <InfoCard
          icon={<FileText className="w-5 h-5 text-blue-500" />}
          title="Órdenes de Trabajo"
          description="OTs creadas, en progreso y completadas con estados, descripciones y fotos."
          color="blue"
        />
        <InfoCard
          icon={<TrendingUp className="w-5 h-5 text-purple-500" />}
          title="Proyectos"
          description="Proyectos con avances, presupuestos, plazos y fotografías de seguimiento."
          color="purple"
        />
        <InfoCard
          icon={<BarChart3 className="w-5 h-5 text-green-500" />}
          title="Rondas y QR"
          description="Lecturas QR agrupadas por trabajador, puntos QR creados y recorridos."
          color="green"
        />
        <InfoCard
          icon={<ShoppingCartIcon className="w-5 h-5 text-amber-500" />}
          title="Solicitudes de Compra"
          description="Solicitudes en todos sus estados: pendientes, aprobadas y rechazadas."
          color="amber"
        />
        <InfoCard
          icon={<ReceiptIcon className="w-5 h-5 text-rose-500" />}
          title="Rendición de Gastos"
          description="Rendiciones con montos, comprobantes y estados de aprobación."
          color="rose"
        />
        <InfoCard
          icon={<ClipboardCheckIcon className="w-5 h-5 text-indigo-500" />}
          title="PMI"
          description="Listas de verificación, avances de cumplimiento y pendientes."
          color="indigo"
        />
      </div>

      {/* Help text */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          Información
        </h3>
        <ul className="text-sm text-slate-600 space-y-1.5">
          <li>• <strong>Word:</strong> Informe completo en formato Word con tablas, fotos y detalles de cada área.</li>
          <li>• <strong>PPT:</strong> Presentación con slides por sección (portada, KPIs, OTs, Proyectos, Rondas, Compras, Rendiciones, PMI).</li>
          <li>• <strong>Email:</strong> Envío manual del informe Word al correo configurado.</li>
          <li>• El período puede ser de 7, 14 o 30 días según necesites.</li>
        </ul>
      </div>
    </div>
  )
}

/* ─── Reusable card ─── */
function InfoCard({ icon, title, description, color }: {
  icon: React.ReactNode
  title: string
  description: string
  color: string
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200',
    purple: 'bg-purple-50 border-purple-200',
    green: 'bg-green-50 border-green-200',
    amber: 'bg-amber-50 border-amber-200',
    rose: 'bg-rose-50 border-rose-200',
    indigo: 'bg-indigo-50 border-indigo-200',
  }
  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color] || 'bg-slate-50 border-slate-200'}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h4 className="text-sm font-bold text-slate-800">{title}</h4>
      </div>
      <p className="text-xs text-slate-600 leading-relaxed">{description}</p>
    </div>
  )
}

/* ─── Icon placeholders ─── */
function ShoppingCartIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/>
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
    </svg>
  )
}
function ReceiptIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/>
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/>
      <path d="M12 17.5v.5"/><path d="M12 6v.5"/>
    </svg>
  )
}
function ClipboardCheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <path d="m9 14 2 2 4-4"/>
    </svg>
  )
}
