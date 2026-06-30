'use client'

/**
 * Módulo "Manuales y Capacitaciones"
 * ----------------------------------
 * Permite a todos los usuarios descargar:
 *  - Manual de Usuario del Sistema (Word)
 *  - Capacitación específica por rol (PowerPoint)
 *
 * Visible para TODOS los roles (incluido guardia en su página dedicada).
 *
 * Los archivos están en /public/manuales/ y se actualizan automáticamente
 * cuando se hace commit + push al repositorio.
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  BookOpen, FileText, Presentation, Download, ExternalLink,
  Shield, UserCog, User as UserIcon, Wrench, Eye, QrCode,
  RefreshCw, Info, Clock, AlertCircle, CheckCircle2
} from 'lucide-react'
import { useSession } from '@/hooks/use-session'
import { toast } from 'sonner'

// ============================================
// Configuración de manuales (FUENTE ÚNICA DE VERDAD)
// ============================================
// Cada vez que se actualice un manual, actualizar la versión y fecha aquí.
// El campo "file" debe coincidir exactamente con el nombre del archivo en /public/manuales/

const MANUAL_VERSION = '1.1'
const MANUAL_FECHA = 'Junio 2026 · Con capturas'

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
    file: 'Capacitacion_Administrador.pptx',
    titulo: 'Capacitación Administrador',
    descripcion: 'Presentación con 12 slides: rol, módulos, flujos de aprobación, gestión de usuarios, permisos, respaldos.',
    rol: 'admin',
    icon: <Shield className="w-6 h-6" />,
    color: 'bg-amber-600',
    tamaño: '~47 KB',
  },
  {
    tipo: 'capacitacion',
    file: 'Capacitacion_Supervisor.pptx',
    titulo: 'Capacitación Supervisor',
    descripcion: 'Presentación con 11 slides: rol, módulos, aprobación SC etapa 1, aprobación OT, limitaciones.',
    rol: 'supervisor',
    icon: <UserCog className="w-6 h-6" />,
    color: 'bg-blue-600',
    tamaño: '~45 KB',
  },
  {
    tipo: 'capacitacion',
    file: 'Capacitacion_Usuario.pptx',
    titulo: 'Capacitación Usuario',
    descripcion: 'Presentación con 10 slides: rol, módulos básicos, crear SC, crear OT, seguimiento.',
    rol: 'usuario',
    icon: <UserIcon className="w-6 h-6" />,
    color: 'bg-green-600',
    tamaño: '~43 KB',
  },
  {
    tipo: 'capacitacion',
    file: 'Capacitacion_Personal.pptx',
    titulo: 'Capacitación Personal',
    descripcion: 'Presentación con 11 slides: rol, módulos, actualizar progreso OT, crear SC, consultar manuales de herramientas.',
    rol: 'personal',
    icon: <Wrench className="w-6 h-6" />,
    color: 'bg-amber-600',
    tamaño: '~44 KB',
  },
  {
    tipo: 'capacitacion',
    file: 'Capacitacion_Auditor.pptx',
    titulo: 'Capacitación Auditor',
    descripcion: 'Presentación con 10 slides: rol de solo lectura, módulo Auditoría, qué revisar, buenas prácticas.',
    rol: 'auditor',
    icon: <Eye className="w-6 h-6" />,
    color: 'bg-slate-600',
    tamaño: '~43 KB',
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
]

const ROL_LABELS: Record<string, { label: string; color: string }> = {
  admin: { label: 'Administrador', color: 'bg-amber-100 text-amber-800' },
  supervisor: { label: 'Supervisor', color: 'bg-blue-100 text-blue-800' },
  usuario: { label: 'Usuario', color: 'bg-green-100 text-green-800' },
  personal: { label: 'Personal', color: 'bg-orange-100 text-orange-800' },
  auditor: { label: 'Auditor', color: 'bg-slate-200 text-slate-800' },
  guardia: { label: 'Guardia', color: 'bg-purple-100 text-purple-800' },
}

export function ManualesModule() {
  const { user } = useSession()
  const [downloading, setDownloading] = useState<string | null>(null)

  const baseUrl = '/manuales'

  const handleDownload = async (doc: Documento) => {
    setDownloading(doc.file)
    try {
      // Construir URL completa (para producción usa el dominio de Vercel)
      const url = `${baseUrl}/${doc.file}`
      // Crear un <a> invisible y hacer click programáticamente
      const a = document.createElement('a')
      a.href = url
      a.download = doc.file
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      toast.success(`Descargando: ${doc.titulo}`)
    } catch (e) {
      console.error('Error descargando:', e)
      toast.error('Error al descargar el archivo')
    } finally {
      setTimeout(() => setDownloading(null), 1500)
    }
  }

  const handleOpenInNewTab = (doc: Documento) => {
    const url = `${baseUrl}/${doc.file}`
    window.open(url, '_blank')
    toast.info(`Abriendo en nueva pestaña: ${doc.titulo}`)
  }

  // Determinar el rol del usuario actual
  const userRol = user?.rol || 'usuario'
  const userRolInfo = ROL_LABELS[userRol] || ROL_LABELS.usuario

  // Documentos recomendados para el usuario (su capacitación + el manual general)
  const capacitacionUsuario = DOCUMENTOS.find((d) => d.rol === userRol)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-[#0f2040] flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Manuales y Capacitaciones
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Documentación oficial del sistema. Descarga el manual completo y la capacitación específica de tu rol.
        </p>
      </div>

      {/* Banner de bienvenida personalizado */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 text-sm">
          <strong>Tu rol actual:</strong>{' '}
          <Badge className={userRolInfo.color + ' ml-1'} variant="outline">
            {userRolInfo.label}
          </Badge>
          <br />
          Te recomendamos descargar primero tu capacitación específica y luego el manual completo como referencia.
        </AlertDescription>
      </Alert>

      {/* Sección destacada: Tu capacitación */}
      {capacitacionUsuario && (
        <Card className="border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-900">
              <CheckCircle2 className="w-4 h-4" />
              Recomendado para tu rol
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              <div className={`shrink-0 w-14 h-14 rounded-lg ${capacitacionUsuario.color} text-white flex items-center justify-center`}>
                {capacitacionUsuario.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900">{capacitacionUsuario.titulo}</h3>
                <p className="text-sm text-slate-600 mt-1">{capacitacionUsuario.descripcion}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Presentation className="w-3 h-3" /> PowerPoint
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {capacitacionUsuario.tamaño}
                  </span>
                  <span className="flex items-center gap-1">
                    <RefreshCw className="w-3 h-3" /> v{MANUAL_VERSION} · {MANUAL_FECHA}
                  </span>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={() => handleDownload(capacitacionUsuario)}
                    disabled={downloading === capacitacionUsuario.file}
                    size="sm"
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    {downloading === capacitacionUsuario.file ? (
                      <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Descargando...</>
                    ) : (
                      <><Download className="w-3.5 h-3.5 mr-1.5" /> Descargar</>
                    )}
                  </Button>
                  <Button
                    onClick={() => handleOpenInNewTab(capacitacionUsuario)}
                    variant="outline"
                    size="sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    Abrir
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual de Usuario completo */}
      <div>
        <h3 className="text-sm font-bold text-[#0f2040] uppercase tracking-wider mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Manual de Usuario
        </h3>
        <div className="grid gap-3">
          {DOCUMENTOS.filter((d) => d.tipo === 'manual').map((doc) => (
            <DocumentoCard
              key={doc.file}
              doc={doc}
              downloading={downloading === doc.file}
              onDownload={() => handleDownload(doc)}
              onOpen={() => handleOpenInNewTab(doc)}
              highlight
            />
          ))}
        </div>
      </div>

      {/* Capacitaciones por rol */}
      <div>
        <h3 className="text-sm font-bold text-[#0f2040] uppercase tracking-wider mb-3 flex items-center gap-2">
          <Presentation className="w-4 h-4" />
          Capacitaciones por Rol
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {DOCUMENTOS.filter((d) => d.tipo === 'capacitacion').map((doc) => {
            const rolInfo = doc.rol ? ROL_LABELS[doc.rol] : null
            const isCurrentRol = doc.rol === userRol
            return (
              <DocumentoCard
                key={doc.file}
                doc={doc}
                downloading={downloading === doc.file}
                onDownload={() => handleDownload(doc)}
                onOpen={() => handleOpenInNewTab(doc)}
                rolBadge={rolInfo?.label}
                rolColor={rolInfo?.color}
                isCurrentRol={isCurrentRol}
              />
            )
          })}
        </div>
      </div>

      {/* Información de actualización */}
      <Alert className="bg-slate-50 border-slate-200">
        <RefreshCw className="h-4 w-4 text-slate-600" />
        <AlertDescription className="text-slate-700 text-xs">
          <strong>Actualización de manuales:</strong> Los documentos se actualizan cada vez que se realizan cambios significativos en el sistema. '
          La versión actual es <strong>v{MANUAL_VERSION}</strong> ({MANUAL_FECHA}). Si notas que falta información o que algún flujo descrito no coincide con lo que ves en el sistema, contacta al administrador para solicitar una actualización.
        </AlertDescription>
      </Alert>

      {/* Ayuda técnica */}
      <Card className="bg-gradient-to-br from-[#0f2040] to-[#1a3155] text-white">
        <CardContent className="p-5">
          <h3 className="font-bold flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            ¿Necesitas ayuda?
          </h3>
          <p className="text-sm text-blue-100 mb-3">
            Si tienes problemas para abrir los archivos o necesitas capacitación adicional, contacta:
          </p>
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-xs text-blue-200 uppercase">Email</div>
              <div className="font-medium">asesoriasintegralescyj@gmail.com</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-xs text-blue-200 uppercase">Teléfono 1</div>
              <div className="font-medium">+56 964 650 643</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-xs text-blue-200 uppercase">Teléfono 2</div>
              <div className="font-medium">+56 974 408 794</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================
// Componente: Card de documento
// ============================================
interface DocumentoCardProps {
  doc: Documento
  downloading: boolean
  onDownload: () => void
  onOpen: () => void
  highlight?: boolean
  rolBadge?: string
  rolColor?: string
  isCurrentRol?: boolean
}

function DocumentoCard({
  doc,
  downloading,
  onDownload,
  onOpen,
  highlight,
  rolBadge,
  rolColor,
  isCurrentRol,
}: DocumentoCardProps) {
  return (
    <Card className={`${highlight ? 'border-blue-200' : 'border-gray-200'} hover:shadow-md transition-shadow`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`shrink-0 w-11 h-11 rounded-lg ${doc.color} text-white flex items-center justify-center`}>
            {doc.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-sm text-slate-900">{doc.titulo}</h4>
              {rolBadge && (
                <Badge className={rolColor + ' text-[10px]'} variant="outline">
                  {rolBadge}
                </Badge>
              )}
              {isCurrentRol && (
                <Badge className="bg-amber-100 text-amber-800 text-[10px]" variant="outline">
                  Tu rol
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-1 line-clamp-2">{doc.descripcion}</p>
            <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                {doc.tipo === 'manual' ? <FileText className="w-3 h-3" /> : <Presentation className="w-3 h-3" />}
                {doc.tipo === 'manual' ? 'Word' : 'PowerPoint'}
              </span>
              {doc.tamaño && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {doc.tamaño}
                </span>
              )}
              <span className="flex items-center gap-1">
                <RefreshCw className="w-3 h-3" /> v{MANUAL_VERSION}
              </span>
            </div>
            <div className="flex gap-1.5 mt-3">
              <Button
                onClick={onDownload}
                disabled={downloading}
                size="sm"
                variant="outline"
                className="h-7 text-xs"
              >
                {downloading ? (
                  <><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> ...</>
                ) : (
                  <><Download className="w-3 h-3 mr-1" /> Descargar</>
                )}
              </Button>
              <Button
                onClick={onOpen}
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Abrir
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
