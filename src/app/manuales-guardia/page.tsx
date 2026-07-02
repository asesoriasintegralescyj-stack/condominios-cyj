'use client'

/**
 * Página dedicada para que el GUARDIA vea los manuales y capacitaciones.
 * El guardia no puede acceder a /sistema (lo redirigen a /rondas-guardia),
 * así que esta página replica el header minimalista de su página principal
 * pero muestra el listado de manuales disponibles para descarga.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, BookOpen, FileText, Presentation, Download, ExternalLink,
  RefreshCw, LogOut, Clock, Shield, UserCog, User as UserIcon, Wrench, Eye, QrCode
} from 'lucide-react'
import { toast } from 'sonner'

interface Documento {
  tipo: 'manual' | 'capacitacion'
  file: string
  titulo: string
  descripcion: string
  rol?: string
  icon: React.ReactNode
  color: string
  tamaño?: string
}

const MANUAL_VERSION = '1.2'
const MANUAL_FECHA = 'Junio 2026 · 24 módulos'

const DOCUMENTOS: Documento[] = [
  {
    tipo: 'manual',
    file: 'Manual_Usuario_Sistema_CYJ.docx',
    titulo: 'Manual de Usuario del Sistema',
    descripcion: 'Manual completo con todos los flujos, módulos, permisos por rol, FAQ y soporte técnico. ~40 páginas en formato Word.',
    icon: <BookOpen className="w-6 h-6" />,
    color: 'bg-blue-600',
    tamaño: '~57 KB',
  },
  {
    tipo: 'capacitacion',
    file: 'Capacitacion_Guardia.pptx',
    titulo: 'Capacitación Guardia',
    descripcion: 'Presentación con 11 slides: página dedicada /rondas-guardia, escaneo QR, requisitos técnicos, solución de problemas.',
    rol: 'guardia',
    icon: <QrCode className="w-6 h-6" />,
    color: 'bg-amber-600',
    tamaño: '~45 KB',
  },
  {
    tipo: 'capacitacion',
    file: 'Capacitacion_Administrador.pptx',
    titulo: 'Capacitación Administrador',
    descripcion: 'Para referencia: conoce qué puede hacer el administrador del sistema.',
    rol: 'admin',
    icon: <Shield className="w-6 h-6" />,
    color: 'bg-amber-600',
    tamaño: '~47 KB',
  },
  {
    tipo: 'capacitacion',
    file: 'Capacitacion_Supervisor.pptx',
    titulo: 'Capacitación Supervisor',
    descripcion: 'Para referencia: conoce qué puede hacer el supervisor.',
    rol: 'supervisor',
    icon: <UserCog className="w-6 h-6" />,
    color: 'bg-blue-600',
    tamaño: '~45 KB',
  },
  {
    tipo: 'capacitacion',
    file: 'Capacitacion_Personal.pptx',
    titulo: 'Capacitación Personal',
    descripcion: 'Para referencia: conoce qué puede hacer el personal de terreno.',
    rol: 'personal',
    icon: <Wrench className="w-6 h-6" />,
    color: 'bg-orange-600',
    tamaño: '~44 KB',
  },
  {
    tipo: 'capacitacion',
    file: 'Capacitacion_Auditor.pptx',
    titulo: 'Capacitación Auditor',
    descripcion: 'Para referencia: conoce qué puede hacer el auditor.',
    rol: 'auditor',
    icon: <Eye className="w-6 h-6" />,
    color: 'bg-slate-600',
    tamaño: '~43 KB',
  },
  {
    tipo: 'capacitacion',
    file: 'Capacitacion_Usuario.pptx',
    titulo: 'Capacitación Usuario',
    descripcion: 'Para referencia: conoce qué puede hacer el usuario básico.',
    rol: 'usuario',
    icon: <UserIcon className="w-6 h-6" />,
    color: 'bg-green-600',
    tamaño: '~43 KB',
  },
]

const ROL_LABELS: Record<string, { label: string; color: string }> = {
  admin: { label: 'Administrador', color: 'bg-amber-100 text-amber-800' },
  supervisor: { label: 'Supervisor', color: 'bg-blue-100 text-blue-800' },
  usuario: { label: 'Usuario', color: 'bg-green-100 text-green-800' },
  personal: { label: 'Personal', color: 'bg-orange-100 text-orange-800' },
  auditor: { label: 'Auditor', color: 'bg-slate-200 text-slate-800' },
  guardia: { label: 'Guardia', color: 'bg-purple-100 text-purple-800' },
}

export default function ManualesGuardiaPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ nombre: string; apellido?: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((data) => {
        if (!data.authenticated) {
          router.push('/login')
          return
        }
        if (data.user.rol !== 'guardia') {
          // Si no es guardia, mandarlo al módulo de manuales del sistema
          router.push('/sistema')
          return
        }
        setUser({
          nombre: data.user.nombre,
          apellido: data.user.apellido,
        })
        setLoading(false)
      })
      .catch(() => router.push('/login'))
  }, [router])

  const handleDownload = async (doc: Documento) => {
    setDownloading(doc.file)
    try {
      const a = document.createElement('a')
      a.href = `/manuales/${doc.file}`
      a.download = doc.file
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      toast.success(`Descargando: ${doc.titulo}`)
    } catch (e) {
      console.error('Error descargando:', e)
      toast.error('Error al descargar')
    } finally {
      setTimeout(() => setDownloading(null), 1500)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <RefreshCw className="w-8 h-8 text-white animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#0f2040] to-slate-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-sm border-b border-white/10 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <img src="/logo.jpg" alt="Logo" className="w-10 h-10 rounded-lg shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-bold truncate">Laguna Norte</div>
            <div className="text-[10px] text-blue-300 truncate">Manuales y Capacitaciones</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/rondas-guardia')}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Volver
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="text-white/70 hover:text-white hover:bg-white/10"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Contenido */}
      <main className="flex-1 overflow-auto p-4 max-w-4xl mx-auto w-full">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-amber-400" />
            Manuales y Capacitaciones
          </h1>
          <p className="text-sm text-blue-300 mt-1">
            Hola {user?.nombre}, descarga el manual del sistema y la capacitación específica para tu rol.
          </p>
        </div>

        {/* Banner destacado: tu capacitación */}
        <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-400/40 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-amber-400 text-amber-900 text-[10px] font-bold">RECOMENDADO PARA TI</Badge>
          </div>
          {DOCUMENTOS.filter((d) => d.rol === 'guardia').map((doc) => (
            <div key={doc.file} className="flex items-start gap-4">
              <div className={`shrink-0 w-14 h-14 rounded-lg ${doc.color} text-white flex items-center justify-center`}>
                {doc.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white">{doc.titulo}</h3>
                <p className="text-xs text-blue-200 mt-1">{doc.descripcion}</p>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-blue-300">
                  <span className="flex items-center gap-1">
                    <Presentation className="w-3 h-3" /> PowerPoint
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {doc.tamaño}
                  </span>
                  <span className="flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> v{MANUAL_VERSION} · {MANUAL_FECHA}
                  </span>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={() => handleDownload(doc)}
                    disabled={downloading === doc.file}
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    {downloading === doc.file ? (
                      <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Descargando...</>
                    ) : (
                      <><Download className="w-3.5 h-3.5 mr-1.5" /> Descargar</>
                    )}
                  </Button>
                  <Button
                    onClick={() => window.open(`/manuales/${doc.file}`, '_blank')}
                    variant="outline"
                    size="sm"
                    className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    Abrir
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Manual de Usuario */}
        <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Manual de Usuario
        </h2>
        <div className="space-y-3 mb-6">
          {DOCUMENTOS.filter((d) => d.tipo === 'manual').map((doc) => (
            <DocCardGuardia
              key={doc.file}
              doc={doc}
              downloading={downloading === doc.file}
              onDownload={() => handleDownload(doc)}
            />
          ))}
        </div>

        {/* Otras capacitaciones */}
        <h2 className="text-sm font-bold text-blue-300 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Presentation className="w-4 h-4" />
          Otras Capacitaciones (referencia)
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {DOCUMENTOS.filter((d) => d.tipo === 'capacitacion' && d.rol !== 'guardia').map((doc) => {
            const rolInfo = doc.rol ? ROL_LABELS[doc.rol] : null
            return (
              <DocCardGuardia
                key={doc.file}
                doc={doc}
                downloading={downloading === doc.file}
                onDownload={() => handleDownload(doc)}
                rolBadge={rolInfo?.label}
                rolColor={rolInfo?.color}
              />
            )
          })}
        </div>

        {/* Info de actualización */}
        <div className="mt-6 bg-white/5 border border-white/10 rounded-lg p-3">
          <p className="text-xs text-blue-200">
            <RefreshCw className="w-3 h-3 inline mr-1" />
            <strong>Actualización:</strong> Los manuales se actualizan cada vez que se realizan cambios en el sistema.
            Versión actual: <strong>v{MANUAL_VERSION}</strong> ({MANUAL_FECHA}).
            Si necesitas ayuda, contacta a tu supervisor o al administrador.
          </p>
        </div>
      </main>

      <footer className="bg-black/30 border-t border-white/10 px-4 py-2 shrink-0">
        <p className="text-[10px] text-center text-blue-300/50">
          Asesorías Integrales CyJ · Administración de Condominios
        </p>
      </footer>
    </div>
  )
}

function DocCardGuardia({
  doc,
  downloading,
  onDownload,
  rolBadge,
  rolColor,
}: {
  doc: Documento
  downloading: boolean
  onDownload: () => void
  rolBadge?: string
  rolColor?: string
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-colors">
      <div className="flex items-start gap-3">
        <div className={`shrink-0 w-10 h-10 rounded-lg ${doc.color} text-white flex items-center justify-center`}>
          {doc.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-sm text-white">{doc.titulo}</h4>
            {rolBadge && (
              <Badge className={(rolColor || 'bg-slate-100 text-slate-800') + ' text-[10px]'} variant="outline">
                {rolBadge}
              </Badge>
            )}
          </div>
          <p className="text-xs text-blue-200 mt-1 line-clamp-2">{doc.descripcion}</p>
          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-blue-300">
            <span className="flex items-center gap-1">
              {doc.tipo === 'manual' ? <FileText className="w-3 h-3" /> : <Presentation className="w-3 h-3" />}
              {doc.tipo === 'manual' ? 'Word' : 'PowerPoint'}
            </span>
            {doc.tamaño && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {doc.tamaño}
              </span>
            )}
          </div>
          <Button
            onClick={onDownload}
            disabled={downloading}
            size="sm"
            variant="outline"
            className="mt-2 h-7 text-xs bg-white/5 border-white/20 text-white hover:bg-white/10"
          >
            {downloading ? (
              <><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> ...</>
            ) : (
              <><Download className="w-3 h-3 mr-1" /> Descargar</>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
