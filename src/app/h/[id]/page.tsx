import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Wrench, MapPin, Package, Calendar, DollarSign, FileText, Settings, Hash, Tag, ArrowLeft, Download, AlertCircle } from 'lucide-react'
import { HerramientaInteractiva } from '@/components/herramientas/HerramientaInteractiva'

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

// Normalización de estados (igual que en HerramientasModule)
const ESTADOS_NORMALIZADOS: Record<string, string> = {
  'Operativo': 'Operativo', 'Operativa': 'Operativo', 'Operativos': 'Operativo',
  'Operativas': 'Operativo', 'Operativa (sin uso)': 'Operativo',
  'Buen estado': 'Bueno', 'Bueno': 'Bueno', 'Nuevo': 'Bueno', 'Nueva': 'Bueno',
  'Regular': 'Regular',
  'Mal estado': 'Malo', 'Malo': 'Malo', 'Mala': 'Malo',
  'Falta Mantención': 'Falta Mantención', 'Falta mantención': 'Falta Mantención',
  'Nueva - Falta perno': 'Falta Mantención',
  'En reparación': 'En reparación',
}

function normalizarEstado(estado: string): string {
  return ESTADOS_NORMALIZADOS[estado] || estado
}

const estadoColors: Record<string, string> = {
  'Operativo': 'bg-green-100 text-green-700 border-green-200',
  'Bueno': 'bg-green-100 text-green-700 border-green-200',
  'Regular': 'bg-amber-100 text-amber-700 border-amber-200',
  'Malo': 'bg-red-100 text-red-700 border-red-200',
  'Falta Mantención': 'bg-orange-100 text-orange-700 border-orange-200',
  'En reparación': 'bg-blue-100 text-blue-700 border-blue-200',
}

interface HerramientaPageProps {
  params: Promise<{ id: string }>
}

export default async function HerramientaPage({ params }: HerramientaPageProps) {
  const { id } = await params

  const herramienta = await db.catHerramienta.findUnique({
    where: { id },
    include: {
      centroCosto: true,
    },
  })

  if (!herramienta) notFound()

  const manualHref = herramienta.manualBase64
    ? `data:${herramienta.manualTipo || 'application/pdf'};base64,${herramienta.manualBase64}`
    : null

  const manualDownloadName = herramienta.manualNombre || `manual-${herramienta.codigo || herramienta.id}.pdf`

  const informeHref = herramienta.informeMantencionBase64
    ? `data:${herramienta.informeMantencionTipo || 'application/pdf'};base64,${herramienta.informeMantencionBase64}`
    : null

  const informeDownloadName = herramienta.informeMantencionNombre || `informe-mantencion-${herramienta.codigo || herramienta.id}.pdf`

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header LAGUNA NORTE */}
      <header className="bg-[#0f2040] text-white">
        <div className="max-w-3xl mx-auto px-4 py-5 sm:py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/10 backdrop-blur rounded-xl flex items-center justify-center border border-white/20">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] sm:text-xs uppercase tracking-wider text-blue-200 font-semibold">
                Condominio Laguna Norte
              </div>
              <h1 className="text-lg sm:text-2xl font-bold leading-tight truncate">
                Información de Herramienta
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
                {herramienta.codigo && (
                  <div className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-[#0f2040] bg-blue-50 border border-blue-100 rounded-full px-2.5 py-0.5 mb-2">
                    <Hash className="w-3 h-3" />
                    {herramienta.codigo}
                  </div>
                )}
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 break-words">
                  {herramienta.nombre}
                </h2>
                {(herramienta.marca || herramienta.modelo) && (
                  <p className="text-sm text-slate-500 mt-1">
                    {[herramienta.marca, herramienta.modelo].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
              <span
                className={`inline-flex items-center gap-1 text-xs font-semibold border rounded-full px-3 py-1 self-start ${
                  estadoColors[normalizarEstado(herramienta.estado)] || estadoColors['Bueno']
                }`}
              >
                <Settings className="w-3 h-3" />
                {normalizarEstado(herramienta.estado)}
              </span>
            </div>
          </div>
        </div>

        {/* Spec grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <SpecCard
            icon={<Package className="w-4 h-4" />}
            label="Cantidad"
            value={String(herramienta.cantidad)}
          />
          <SpecCard
            icon={<MapPin className="w-4 h-4" />}
            label="Ubicación"
            value={herramienta.ubicacion || '–'}
          />
          <SpecCard
            icon={<Calendar className="w-4 h-4" />}
            label="Fecha Adquisición"
            value={formatDate(herramienta.fechaAdquisicion)}
          />
          <SpecCard
            icon={<Settings className="w-4 h-4" />}
            label="Fecha Últ. Mantenimiento"
            value={formatDate(herramienta.fechaUltimoMantencion)}
          />
          <SpecCard
            icon={<DollarSign className="w-4 h-4" />}
            label="Valor Reposición"
            value={formatCLP(herramienta.valorReposicion)}
            highlight
          />
          {herramienta.centroCosto && (
            <SpecCard
              icon={<Tag className="w-4 h-4" />}
              label="Centro de Costo"
              value={herramienta.centroCosto.nombre}
            />
          )}
          <SpecCard
            icon={<Tag className="w-4 h-4" />}
            label="Marca"
            value={herramienta.marca || '–'}
          />
          <SpecCard
            icon={<Tag className="w-4 h-4" />}
            label="Modelo"
            value={herramienta.modelo || '–'}
          />
        </div>

        {/* Descripción */}
        {herramienta.descripcion && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6">
            <h3 className="text-xs uppercase tracking-wider text-slate-500 font-bold mb-2">
              Descripción
            </h3>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {herramienta.descripcion}
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
                Esta herramienta no tiene manual adjunto.
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
                  <p className="text-xs text-slate-500">Informe de mantenimiento adjunto</p>
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
                Esta herramienta no tiene informe de mantenimiento adjunto.
              </p>
            </div>
          )}
        </div>

        {/* Sección interactiva: Salida de Pañol + LVs imprimibles + Historial */}
        <HerramientaInteractiva
          herramienta={{
            id: herramienta.id,
            codigo: herramienta.codigo,
            nombre: herramienta.nombre,
            marca: herramienta.marca,
            modelo: herramienta.modelo,
            cantidad: herramienta.cantidad,
            ubicacion: herramienta.ubicacion,
            estado: herramienta.estado,
          }}
          manualHref={manualHref}
          manualDownloadName={manualDownloadName}
          informeHref={informeHref}
          informeDownloadName={informeDownloadName}
        />

        {/* Advertencia de seguridad */}
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-orange-900 mb-1">
                Importante
              </p>
              <p className="text-xs text-orange-800 leading-relaxed">
                El uso de esta herramienta está sujeto a las Listas de Verificación (LV) del PMI.
                Antes de usarla, complete la LV "Antes de Usar". Al terminar, complete la LV
                "Después de Usar" y registre cualquier anomalía. Si detecta un problema,
                reporte inmediatamente a su supervisor y NO utilice la herramienta.
              </p>
            </div>
          </div>
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
            © {new Date().getFullYear()} Condominio Laguna Norte · Asesorías Integrales CyJ SpA
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
