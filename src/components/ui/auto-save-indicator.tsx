'use client'

import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react'
import { useEffect, useState } from 'react'

interface AutoSaveIndicatorProps {
  isSaving: boolean
  lastSaved: Date | null
  hasChanges: boolean
}

/**
 * Indicador visual del estado de auto-guardado.
 * Se coloca en el header del formulario o módulo.
 */
export function AutoSaveIndicator({ isSaving, lastSaved, hasChanges }: AutoSaveIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState('')

  useEffect(() => {
    if (!lastSaved) return
    const update = () => {
      const diff = Date.now() - lastSaved.getTime()
      if (diff < 5000) setTimeAgo('hace un momento')
      else if (diff < 60000) setTimeAgo(`hace ${Math.floor(diff / 1000)}s`)
      else if (diff < 3600000) setTimeAgo(`hace ${Math.floor(diff / 60000)} min`)
      else setTimeAgo(lastSaved.toLocaleTimeString('es-CL'))
    }
    update()
    const id = setInterval(update, 5000)
    return () => clearInterval(id)
  }, [lastSaved])

  if (isSaving) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-blue-600">
        <Loader2 className="w-3 h-3 animate-spin" />
        Guardando...
      </span>
    )
  }

  if (hasChanges) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-600">
        <AlertCircle className="w-3 h-3" />
        Cambios sin guardar
      </span>
    )
  }

  if (lastSaved) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600">
        <CheckCircle2 className="w-3 h-3" />
        Guardado {timeAgo}
      </span>
    )
  }

  return null
}
