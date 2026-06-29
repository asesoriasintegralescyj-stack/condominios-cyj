import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  Package,
  MapPin,
  Tag,
  Calendar,
  DollarSign,
  FileText,
  Settings,
  Hash,
  ArrowLeft,
  Download,
  User,
  Boxes,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

const formatCLP = (n: number) =>
  '$' + new Intl.NumberFormat('es-CL').format(Math.round(n || 0))

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '–'
  try {
    const [y, m, d] = dateStr.split('-')
    return `${d}/${m}/${y}`
  } catch {
    return dateStr
  }
}

const estadoColors: Record<string, string> = {
  'Activo': 'bg-green-100 text-green-700 border-green-200',
  'Inactivo': 'bg-slate-100 text-slate-700 border-slate-200',
  'En Reparación': 'bg-yellow-100 text-yellow-700 border-yellow-200',
  'Dado de Baja': 'bg-red-100 text-red-700 border-red-200',
}

const categoriaColors: Record<string, string> = {
  'Equipo': 'bg-blue-100 text-blue-700 border-blue-200',
  'Herramienta': 'bg-amber-100 text-amber-700 border-amber-200',
  'Vehículo': 'bg-purple-100 text-purple-700 border-purple-200',
  'Mobiliario': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  'Infraestructura': 'bg-slate-100 text-slate-700 border-slate-200',
  'Tecnología': 'bg-green-100 text-green-700 border-green-200',
}

interface ActivoPageProps {
  params: Promise<{ id: string }>
}

export default async function ActivoPage({ params }: ActivoPageProps) {
  const { id } = await params

  const activo = await db.activo.findUnique({
    where: { id },
    include: {
      asignado: true,
    },
  })

  if (!activo) notFound()

  const manualHref = activo.manualBase64
    ? `data:${activo.manualTipo || 'application/pdf'};base64,${activo.manualBase64}`
    : null

  const manualDownloadName =
    activo.manualNombre || `manual-${activo.serie || activo.id}.pdf`

  const informeHref = activo.informeMantencionBase64
    ? `data:${activo.informeMantencionTipo || 'application/pdf'};base64,${activo.informeMantencionBase64}`
    : null

  const informeDownloadName =
    activo.informeMantencionNombre ||
    `informe-mantencion-${activo.serie || activo.id}.pdf`

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header LAGUNA NORTE */}
      <header className="bg-[#0f2040] text-white">
        <div className="max-w-3xl mx-auto px-4 py-5 sm:py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center border border-white/20">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] sm:text-xs uppercase tracking-wider text-blue-200 font-semibold">
                Condominio Laguna Norte
              </div>
              <h1 className="text-lg sm:text-2xl font-bold leading-tight truncate">
                Información de Activo
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 sm:py-8 space-y-4 sm:space-y-5">
        {/* Title card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold border rounded-full px-2.5 py-0.5 ${
                      categoriaColors[activo.categoria] ||
                      'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Tag className="w-3 h-3" />
                    {activo.categoria}
                  </span>
                  {activo.serie && (
                    <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-[#0f2040] bg-blue-50 border border-blue-100 rounded-full px-2.5 py-0.5">
                      <Hash className="w-3 h-3" />
                      {activo.serie}
                    </span>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 break-words">
                  {activo.nombre}
                </h2>
                {activo.asignado?.nombre && (
                  <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    Asignado a: {activo.asignado.nombre}
                  </p>
                )}
              </div>
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold border rounded-full px-3 py-1 self-start ${
                  estadoColors[activo.estado] || estadoColors['Activo']
                }`}
              >
                <Settings className="w-3 h-3" />
                {activo.estado}
              </span>
            </div>
          </div>
        </div>

        {/* Spec grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <SpecCard
            icon={<MapPin className="w-4 h-4" />}
            label="Ubicación"
            value={activo.ubicacion || '–'}
          />
          <SpecCard
            icon={<Calendar className="w-4 h-4" />}
            label="Fecha Compra"
            value={formatDate(activo.fechaCompra)}
          />
          <SpecCard
            icon={<Settings className="w-4 h-4" />}
            label="Fecha Últ. Mantenimiento"
            value={formatDate(activo.fechaUltimoMantencion)}
          />
          <SpecCard
            icon={<DollarSign className="w-4 h-4" />}
            label="Costo Compra"
            value={formatCLP(activo.costoCompra)}
          />
          <SpecCard
            icon={<DollarSign className="w-4 h-4" />}
            label="Valor Actual"
            value={formatCLP(activo.valorActual)}
            highlight
          />
          <SpecCard
            icon={<Boxes className="w-4 h-4" />}
            label="Categoría"
            value={activo.categoria}
          />
        </div>

        {/* Descripción */}
        {activo.descripcion && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6">
            <h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-2">
              Descripción
            </h3>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {activo.descripcion}
            </p>
          </div>
        )}

        {/* Manual de usuario */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-5 h-5 text-[#0f2040]" />
            <h3 className="text-sm uppercase tracking-wider text-slate-500 font-bold">
              Manual de Usuario
            </h3>
          </div>
          {manualHref ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="w-10 h-10 bg-red-100 text-red-600 rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {manualDownloadName}
                  </p>
                  <p className="text-xs text-slate-500">Documento PDF adjunto</p>
                </div>
              </div>
              <a
                href={manualHref}
                download={manualDownloadName}
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto bg-[#0f2040] hover:bg-[#1a3060] text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Descargar Manual
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <FileText className="w-5 h-5 text-slate-400 shrink-0" />
              <p className="text-sm text-slate-500">
                Este activo no tiene manual adjunto.
              </p>
            </div>
          )}
        </div>

        {/* Informe de Mantenimiento */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="w-5 h-5 text-[#0f2040]" />
            <h3 className="text-sm uppercase tracking-wider text-slate-500 font-bold">
              Informe de Mantenimiento
            </h3>
          </div>
          {informeHref ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {informeDownloadName}
                  </p>
                  <p className="text-xs text-slate-500">
                    Informe de mantenimiento adjunto
                  </p>
                </div>
              </div>
              <a
                href={informeHref}
                download={informeDownloadName}
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto bg-[#0f2040] hover:bg-[#1a3060] text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Descargar Informe de Mantenimiento
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <Settings className="w-5 h-5 text-slate-400 shrink-0" />
              <p className="text-sm text-slate-500">
                Este activo no tiene informe de mantenimiento adjunto.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 pb-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#0f2040] hover:text-[#1a3060] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al Sistema
          </Link>
          <p className="text-xs text-slate-400 mt-4">
            © {new Date().getFullYear()} Condominio Laguna Norte · Asesorías
            Integrales CyJ SpA
          </p>
        </div>
      </main>
    </div>
  )
}

function SpecCard({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-3 sm:p-4 ${
        highlight
          ? 'bg-blue-50 border-blue-200'
          : 'bg-white border-slate-200'
      }`}
    >
      <div
        className={`flex items-center gap-1.5 mb-1 ${
          highlight ? 'text-blue-700' : 'text-slate-500'
        }`}
      >
        {icon}
        <span className="text-[10px] uppercase tracking-wider font-bold">
          {label}
        </span>
      </div>
      <div
        className={`text-sm sm:text-base font-bold break-words ${
          highlight ? 'text-[#0f2040]' : 'text-slate-900'
        }`}
      >
        {value}
      </div>
    </div>
  )
}
