'use client'

import { useState, useEffect } from 'react'
import {
  ClipboardCheck,
  Printer,
  ArrowRightCircle,
  ArrowLeftCircle,
  CheckCircle,
  Loader2,
  User,
  Calendar,
  MapPin,
  Wrench,
} from 'lucide-react'
import {
  LV_ANTES_USO,
  LV_DESPUES_USO,
  LVChecklist,
  SalidaForm,
  IngresoForm,
  imprimirLVHerramienta,
} from '@/components/herramientas/LVHerramientas'

interface HerramientaData {
  id: string
  codigo: string | null
  nombre: string
  marca: string | null
  modelo: string | null
  cantidad: number
  ubicacion: string | null
  estado: string
}

interface SalidaActiva {
  id: string
  usuarioNombre: string
  fechaSalida: string
  horaSalida: string
  trabajoRealizar: string | null
  sectorTrabajo: string | null
  lvAntesItems: string[]
  estado: string
}

export function HerramientaInteractiva({
  herramienta,
  manualHref,
  manualDownloadName,
  informeHref,
  informeDownloadName,
}: {
  herramienta: HerramientaData
  manualHref: string | null
  manualDownloadName: string
  informeHref: string | null
  informeDownloadName: string
}) {
  const [salidaActiva, setSalidaActiva] = useState<SalidaActiva | null>(null)
  const [loading, setLoading] = useState(false)
  const [showSalidaForm, setShowSalidaForm] = useState(false)
  const [showIngresoForm, setShowIngresoForm] = useState(false)
  const [historial, setHistorial] = useState<any[]>([])

  // Cargar salida activa al montar
  useEffect(() => {
    cargarSalidaActiva()
    cargarHistorial()
  }, [])

  const cargarSalidaActiva = async () => {
    try {
      const res = await fetch(`/api/herramientas/${herramienta.id}/salidas`)
      if (res.ok) {
        const data = await res.json()
        const activa = data.find((s: any) => s.estado === 'Pendiente')
        setSalidaActiva(activa || null)
      }
    } catch (e) {
      console.error('Error cargando salida activa:', e)
    }
  }

  const cargarHistorial = async () => {
    try {
      const res = await fetch(`/api/herramientas/${herramienta.id}/salidas`)
      if (res.ok) {
        const data = await res.json()
        setHistorial(data.slice(0, 10))
      }
    } catch (e) {
      console.error('Error cargando historial:', e)
    }
  }

  const registrarSalida = async (data: any) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/herramientas/${herramienta.id}/salidas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const nueva = await res.json()
        setSalidaActiva(nueva)
        setShowSalidaForm(false)
        alert('Salida registrada correctamente')
        cargarHistorial()
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Error al registrar salida')
      }
    } catch (e) {
      alert('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const registrarIngreso = async (data: any) => {
    if (!salidaActiva) return
    setLoading(true)
    try {
      const res = await fetch(`/api/salidas-panol/${salidaActiva.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        setSalidaActiva(null)
        setShowIngresoForm(false)
        alert('Ingreso registrado correctamente. Herramienta devuelta.')
        cargarHistorial()
      } else {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Error al registrar ingreso')
      }
    } catch (e) {
      alert('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Estado actual de la herramienta */}
      <div className={`rounded-2xl border-2 p-4 ${
        salidaActiva
          ? 'bg-amber-50 border-amber-300'
          : 'bg-green-50 border-green-300'
      }`}>
        <div className="flex items-center gap-3">
          {salidaActiva ? (
            <>
              <ArrowRightCircle className="w-8 h-8 text-amber-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-amber-900 uppercase">Herramienta en uso</p>
                <p className="text-xs text-amber-800">
                  Retirada por <strong>{salidaActiva.usuarioNombre}</strong> el{' '}
                  {new Date(salidaActiva.fechaSalida).toLocaleDateString('es-CL')} a las {salidaActiva.horaSalida}
                </p>
                {salidaActiva.trabajoRealizar && (
                  <p className="text-xs text-amber-700 mt-1">Trabajo: {salidaActiva.trabajoRealizar}</p>
                )}
              </div>
              <button
                onClick={() => setShowIngresoForm(true)}
                className="shrink-0 inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-2 rounded-lg"
              >
                <ArrowLeftCircle className="w-4 h-4" />
                Registrar Ingreso
              </button>
            </>
          ) : (
            <>
              <CheckCircle className="w-8 h-8 text-green-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-green-900 uppercase">Herramienta disponible</p>
                <p className="text-xs text-green-800">En bodega, lista para uso</p>
              </div>
              <button
                onClick={() => setShowSalidaForm(true)}
                className="shrink-0 inline-flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-2 rounded-lg"
              >
                <ArrowRightCircle className="w-4 h-4" />
                Retirar (Salida)
              </button>
            </>
          )}
        </div>
      </div>

      {/* Botones de imprimir LV */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => imprimirLVHerramienta(herramienta, 'antes')}
          className="flex items-center justify-center gap-2 bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 text-sm font-semibold px-4 py-3 rounded-xl transition-colors"
        >
          <Printer className="w-5 h-5" />
          Imprimir LV Antes de Uso
        </button>
        <button
          onClick={() => imprimirLVHerramienta(herramienta, 'despues')}
          className="flex items-center justify-center gap-2 bg-blue-100 hover:bg-blue-200 border border-blue-300 text-blue-900 text-sm font-semibold px-4 py-3 rounded-xl transition-colors"
        >
          <Printer className="w-5 h-5" />
          Imprimir LV Después de Uso
        </button>
      </div>

      {/* Listas de Verificación (visualización) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2 flex items-center gap-1">
            <ClipboardCheck className="w-3 h-3" />
            LV — Antes de Usar
          </h3>
          <LVChecklist tipo="antes" itemsCompletados={[]} editable={false} />
        </div>
        <div>
          <h3 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2 flex items-center gap-1">
            <ClipboardCheck className="w-3 h-3" />
            LV — Después de Usar
          </h3>
          <LVChecklist tipo="despues" itemsCompletados={[]} editable={false} />
        </div>
      </div>

      {/* Historial reciente */}
      {historial.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
            Historial de Salidas ({historial.length})
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {historial.map((s: any) => (
              <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 text-xs">
                {s.estado === 'Devuelta' ? (
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                ) : (
                  <ArrowRightCircle className="w-4 h-4 text-amber-500 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{s.usuarioNombre}</span>
                    <span className="text-slate-500">
                      {new Date(s.fechaSalida).toLocaleDateString('es-CL')} {s.horaSalida}
                    </span>
                  </div>
                  {s.estado === 'Devuelta' && s.fechaIngreso && (
                    <span className="text-green-600 text-[10px]">
                      Devuelta: {new Date(s.fechaIngreso).toLocaleDateString('es-CL')} {s.horaIngreso}
                      {s.estadoDevolucion && ` · Estado: ${s.estadoDevolucion}`}
                    </span>
                  )}
                  {s.comentarios && (
                    <p className="text-slate-600 text-[10px] mt-0.5 truncate">{s.comentarios}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dialog: Formulario de Salida */}
      {showSalidaForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center gap-2 mb-4">
              <ArrowRightCircle className="w-5 h-5 text-amber-600" />
              <h2 className="text-lg font-bold text-slate-900">Registrar Salida de Pañol</h2>
            </div>
            <SalidaForm
              herramientaNombre={herramienta.nombre}
              herramientaCodigo={herramienta.codigo || undefined}
              onSubmit={registrarSalida}
              loading={loading}
            />
            <button
              onClick={() => setShowSalidaForm(false)}
              className="mt-3 w-full text-sm text-slate-500 hover:text-slate-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Dialog: Formulario de Ingreso */}
      {showIngresoForm && salidaActiva && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center gap-2 mb-4">
              <ArrowLeftCircle className="w-5 h-5 text-green-600" />
              <h2 className="text-lg font-bold text-slate-900">Registrar Ingreso (Devolución)</h2>
            </div>
            <IngresoForm salida={salidaActiva} onSubmit={registrarIngreso} loading={loading} />
            <button
              onClick={() => setShowIngresoForm(false)}
              className="mt-3 w-full text-sm text-slate-500 hover:text-slate-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
