'use client'

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ClipboardCheck, CheckCircle, Printer } from 'lucide-react'

// ============================================
// LISTAS DE VERIFICACIÓN DE HERRAMIENTAS
// ============================================
export const LV_ANTES_USO = [
  'Inspeccionar visualmente la herramienta: sin daños visibles, grietas o deformaciones',
  'Verificar que todos los accesorios y protecciones estén instalados correctamente',
  'Comprobar que el cable de alimentación (si aplica) esté en buen estado, sin cortes ni empalmes',
  'Revisar que el interruptor de encendido/apagado funcione correctamente (no quede pegado)',
  'Verificar que las partes móviles (discos, brocas, cuchillas) estén firmemente fijadas',
  'Comprobar el nivel de aceite o lubricante (si aplica)',
  'Verificar que el filtro de aire (si aplica) esté limpio',
  'Inspeccionar el EPP requerido: guantes, antiparras, protector auditivo, mascarilla',
  'Confirmar que el área de trabajo esté limpia, iluminada y libre de obstáculos',
  'Verificar que no haya personas no autorizadas en el área de trabajo',
]

export const LV_DESPUES_USO = [
  'Apagar y desconectar la herramienta de la fuente de energía',
  'Esperar a que las partes móviles se detengan completamente',
  'Limpiar la herramienta: retirar polvo, residuos y material acumulado',
  'Inspeccionar visualmente si hubo daños durante el uso',
  'Verificar que no haya sobrecalentamiento anormal',
  'Retirar y guardar accesorios (discos, brocas, cuchillas) en su lugar correspondiente',
  'Enrollar y guardar el cable de alimentación correctamente (sin dobleces)',
  'Devolver la herramienta a su ubicación asignada en bodega',
  'Registrar cualquier anomalía o daño detectado durante el uso',
  'Reportar a supervisor si la herramienta requiere mantención',
]

interface LVChecklistProps {
  tipo: 'antes' | 'despues'
  itemsCompletados: string[]
  onItemsChange?: (items: string[]) => void
  editable?: boolean
}

export function LVChecklist({ tipo, itemsCompletados, onItemsChange, editable = true }: LVChecklistProps) {
  const items = tipo === 'antes' ? LV_ANTES_USO : LV_DESPUES_USO
  const toggle = (idx: number) => {
    if (!editable || !onItemsChange) return
    const key = `${tipo}-${idx}`
    const next = itemsCompletados.includes(key)
      ? itemsCompletados.filter(k => k !== key)
      : [...itemsCompletados, key]
    onItemsChange(next)
  }

  const colorHeader = tipo === 'antes' ? 'amber' : 'blue'
  const completados = itemsCompletados.filter(k => k.startsWith(`${tipo}-`)).length

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className={`px-3 py-2 ${colorHeader === 'amber' ? 'bg-amber-50' : 'bg-blue-50'} border-b`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className={`w-4 h-4 ${colorHeader === 'amber' ? 'text-amber-700' : 'text-blue-700'}`} />
            <span className={`text-xs font-bold uppercase tracking-wide ${colorHeader === 'amber' ? 'text-amber-900' : 'text-blue-900'}`}>
              {tipo === 'antes' ? 'Antes de Usar' : 'Después de Usar'}
            </span>
          </div>
          <span className={`text-xs font-bold ${colorHeader === 'amber' ? 'text-amber-700' : 'text-blue-700'}`}>
            {completados}/{items.length}
          </span>
        </div>
      </div>
      <div className="p-3 space-y-1.5 max-h-64 overflow-y-auto bg-white">
        {items.map((item, idx) => {
          const key = `${tipo}-${idx}`
          const checked = itemsCompletados.includes(key)
          return (
            <div key={idx} className="flex items-start gap-2">
              <Checkbox
                checked={checked}
                onCheckedChange={() => toggle(idx)}
                disabled={!editable}
                className="mt-0.5"
              />
              <span className={`text-xs leading-relaxed flex-1 ${checked ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                {item}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================
// FORMULARIO DE SALIDA DE PAÑOL
// ============================================
interface SalidaFormProps {
  herramientaNombre: string
  herramientaCodigo?: string
  onSubmit: (data: {
    usuarioNombre: string
    usuarioRUT: string
    trabajoRealizar: string
    sectorTrabajo: string
    lvAntesCompletada: boolean
    lvAntesItems: string[]
  }) => Promise<void>
  loading?: boolean
}

export function SalidaForm({ herramientaNombre, herramientaCodigo, onSubmit, loading }: SalidaFormProps) {
  const [usuarioNombre, setUsuarioNombre] = useState('')
  const [usuarioRUT, setUsuarioRUT] = useState('')
  const [trabajoRealizar, setTrabajoRealizar] = useState('')
  const [sectorTrabajo, setSectorTrabajo] = useState('')
  const [lvAntesItems, setLvAntesItems] = useState<string[]>([])

  const handleSubmit = async () => {
    if (!usuarioNombre.trim()) {
      alert('Debe ingresar el nombre del operario')
      return
    }
    await onSubmit({
      usuarioNombre,
      usuarioRUT,
      trabajoRealizar,
      sectorTrabajo,
      lvAntesCompletada: lvAntesItems.length > 0,
      lvAntesItems,
    })
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 rounded-lg p-3">
        <p className="text-xs text-slate-500 font-semibold uppercase">Herramienta</p>
        <p className="text-sm font-bold text-slate-900">{herramientaNombre}</p>
        {herramientaCodigo && <p className="text-xs font-mono text-[#0f2044]">{herramientaCodigo}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Nombre del operario *</Label>
          <input
            type="text"
            value={usuarioNombre}
            onChange={e => setUsuarioNombre(e.target.value)}
            placeholder="Ej: Francisco Fuentes"
            className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md"
          />
        </div>
        <div>
          <Label className="text-xs">RUT (opcional)</Label>
          <input
            type="text"
            value={usuarioRUT}
            onChange={e => setUsuarioRUT(e.target.value)}
            placeholder="Ej: 12.345.678-9"
            className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md"
          />
        </div>
        <div>
          <Label className="text-xs">Trabajo a realizar</Label>
          <input
            type="text"
            value={trabajoRealizar}
            onChange={e => setTrabajoRealizar(e.target.value)}
            placeholder="Ej: Reparación iluminación Club House"
            className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md"
          />
        </div>
        <div>
          <Label className="text-xs">Sector de trabajo</Label>
          <input
            type="text"
            value={sectorTrabajo}
            onChange={e => setSectorTrabajo(e.target.value)}
            placeholder="Ej: Club House"
            className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md"
          />
        </div>
      </div>

      <div>
        <Label className="text-xs font-bold text-amber-800">LV — Antes de Usar (obligatoria)</Label>
        <div className="mt-1">
          <LVChecklist tipo="antes" itemsCompletados={lvAntesItems} onItemsChange={setLvAntesItems} />
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-[#0f2044] hover:bg-[#1a3060]"
      >
        {loading ? 'Registrando...' : 'Registrar Salida de Pañol'}
      </Button>
    </div>
  )
}

// ============================================
// FORMULARIO DE INGRESO (DEVOLUCIÓN)
// ============================================
interface IngresoFormProps {
  salida: any
  onSubmit: (data: {
    estadoDevolucion: string
    comentarios: string
    lvDespuesCompletada: boolean
    lvDespuesItems: string[]
  }) => Promise<void>
  loading?: boolean
}

export function IngresoForm({ salida, onSubmit, loading }: IngresoFormProps) {
  const [estadoDevolucion, setEstadoDevolucion] = useState('Operativo')
  const [comentarios, setComentarios] = useState('')
  const [lvDespuesItems, setLvDespuesItems] = useState<string[]>([])

  const handleSubmit = async () => {
    await onSubmit({
      estadoDevolucion,
      comentarios,
      lvDespuesCompletada: lvDespuesItems.length > 0,
      lvDespuesItems,
    })
  }

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 rounded-lg p-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-slate-500 font-semibold uppercase">Operario</p>
            <p className="text-sm font-bold text-slate-900">{salida.usuarioNombre}</p>
          </div>
          <div>
            <p className="text-slate-500 font-semibold uppercase">Salida</p>
            <p className="text-sm text-slate-900">
              {new Date(salida.fechaSalida).toLocaleDateString('es-CL')} {salida.horaSalida}
            </p>
          </div>
          {salida.trabajoRealizar && (
            <div>
              <p className="text-slate-500 font-semibold uppercase">Trabajo</p>
              <p className="text-sm text-slate-900">{salida.trabajoRealizar}</p>
            </div>
          )}
          {salida.sectorTrabajo && (
            <div>
              <p className="text-slate-500 font-semibold uppercase">Sector</p>
              <p className="text-sm text-slate-900">{salida.sectorTrabajo}</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <Label className="text-xs">Estado de devolución</Label>
        <select
          value={estadoDevolucion}
          onChange={e => setEstadoDevolucion(e.target.value)}
          className="mt-1 w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md bg-white"
        >
          <option value="Operativo">Operativo</option>
          <option value="Bueno">Bueno</option>
          <option value="Regular">Regular</option>
          <option value="Malo">Malo</option>
          <option value="Falta Mantención">Falta Mantención</option>
          <option value="En reparación">En reparación</option>
        </select>
      </div>

      <div>
        <Label className="text-xs font-bold text-blue-800">LV — Después de Usar (obligatoria)</Label>
        <div className="mt-1">
          <LVChecklist tipo="despues" itemsCompletados={lvDespuesItems} onItemsChange={setLvDespuesItems} />
        </div>
      </div>

      <div>
        <Label className="text-xs">Comentarios</Label>
        <Textarea
          value={comentarios}
          onChange={e => setComentarios(e.target.value)}
          placeholder="Comentarios del operario, anomalías detectadas, etc."
          rows={2}
          className="mt-1"
        />
      </div>

      <Button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-green-600 hover:bg-green-700"
      >
        {loading ? 'Registrando...' : 'Registrar Ingreso (Devolución)'}
      </Button>
    </div>
  )
}

// ============================================
// BOTÓN DE IMPRIMIR LV
// ============================================
export async function imprimirLVHerramienta(
  herramienta: { nombre: string; codigo?: string | null; marca?: string | null; modelo?: string | null },
  tipo: 'antes' | 'despues'
) {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let y = 15

  // Header
  doc.setFillColor(15, 32, 68)
  doc.rect(0, 0, pageWidth, 20, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('ASESORÍAS INTEGRALES CyJ', 8, 8)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Condominio Laguna Norte · Pañol de Herramientas', 8, 14)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(tipo === 'antes' ? 'LV — ANTES DE USO' : 'LV — DESPUÉS DE USO', pageWidth - 8, 8, { align: 'right' })
  doc.setTextColor(0, 0, 0)
  y = 25

  // Info herramienta
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(herramienta.nombre, 8, y)
  y += 5
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  const info = [
    herramienta.codigo && `Código: ${herramienta.codigo}`,
    herramienta.marca && `Marca: ${herramienta.marca}`,
    herramienta.modelo && `Modelo: ${herramienta.modelo}`,
  ].filter(Boolean).join('   |   ')
  if (info) {
    doc.text(info, 8, y)
    y += 4
  }

  // Campos de registro
  doc.text(`Operario: ________________________________   RUT: ____________________`, 8, y + 4)
  doc.text(`Fecha: __________________   Hora: ____________`, 8, y + 9)
  doc.text(`Trabajo realizado: __________________________________________________`, 8, y + 14)
  y += 22

  // Línea separadora
  doc.setDrawColor(15, 32, 68)
  doc.setLineWidth(0.3)
  doc.line(8, y, pageWidth - 8, y)
  y += 5

  // Items
  const items = tipo === 'antes' ? LV_ANTES_USO : LV_DESPUES_USO
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(`Lista de Verificación (${items.length} ítems):`, 8, y)
  y += 5

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  for (let i = 0; i < items.length; i++) {
    if (y > pageHeight - 25) { doc.addPage(); y = 15 }
    // Checkbox
    doc.setDrawColor(80, 80, 80)
    doc.setLineWidth(0.3)
    doc.rect(8, y - 3, 4, 4)
    // Texto
    const lines = doc.splitTextToSize(`${i + 1}. ${items[i]}`, pageWidth - 20)
    doc.text(lines, 14, y)
    y += Math.max(5, lines.length * 4 + 2)
  }

  // Observaciones
  if (y > pageHeight - 30) { doc.addPage(); y = 15 }
  y += 3
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('Observaciones:', 8, y)
  y += 5
  doc.setDrawColor(150, 150, 150)
  doc.setLineWidth(0.2)
  for (let i = 0; i < 3; i++) { doc.line(8, y, pageWidth - 8, y); y += 5 }

  // Firmas
  if (y > pageHeight - 25) { doc.addPage(); y = 15 }
  y += 8
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.3)
  doc.line(15, y, 90, y)
  doc.line(pageWidth - 90, y, pageWidth - 15, y)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('Operario', 52, y + 4, { align: 'center' })
  doc.text('Supervisor / Pañol', pageWidth - 52, y + 4, { align: 'center' })

  // Footer
  doc.setFontSize(6)
  doc.setTextColor(120, 120, 120)
  doc.text(
    `Generado el ${new Date().toLocaleString('es-CL')} · Asesorías Integrales CyJ`,
    pageWidth / 2, pageHeight - 5, { align: 'center' }
  )

  doc.autoPrint()
  const blobUrl = doc.output('bloburl') as unknown as string
  window.open(blobUrl, '_blank')
}
