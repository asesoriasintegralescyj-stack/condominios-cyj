import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea un número como peso chileno (CLP)
 * Usa puntos como separadores de miles
 * Ejemplo: 1000000 -> $1.000.000
 */
export function formatCLP(n: number): string {
  // Redondear al entero más cercano
  const rounded = Math.round(n || 0)
  // Formatear con separador de miles (punto)
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `$${formatted}`
}

/**
 * Formatea un número con separadores de miles por puntos
 * Ejemplo: 1000000 -> 1.000.000
 */
export function formatNumber(n: number, decimals: number = 0): string {
  const fixed = n.toFixed(decimals)
  const parts = fixed.split('.')
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return decimals > 0 && parts[1] ? `${intPart},${parts[1]}` : intPart
}

/**
 * Opciones de horas predefinidas para selects
 */
export const HORAS_OPTIONS = [
  { value: 0.5, label: '0.5 hrs' },
  { value: 1, label: '1 hr' },
  { value: 1.5, label: '1.5 hrs' },
  { value: 2, label: '2 hrs' },
  { value: 2.5, label: '2.5 hrs' },
  { value: 3, label: '3 hrs' },
  { value: 3.5, label: '3.5 hrs' },
  { value: 4, label: '4 hrs' },
  { value: 4.5, label: '4.5 hrs' },
  { value: 5, label: '5 hrs' },
  { value: 5.5, label: '5.5 hrs' },
  { value: 6, label: '6 hrs' },
  { value: 6.5, label: '6.5 hrs' },
  { value: 7, label: '7 hrs' },
  { value: 7.5, label: '7.5 hrs' },
  { value: 8, label: '8 hrs' },
  { value: 9, label: '9 hrs' },
  { value: 10, label: '10 hrs' },
  { value: 12, label: '12 hrs' },
  { value: 24, label: '24 hrs' },
]

// ============================================================
// PALETA DE COLORES ESTÁNDAR DEL SISTEMA
// Basada en el módulo de Cumplimiento (Tailwind 500/600)
// Usar SOLO estos colores en todos los módulos
// ============================================================

export const COLORES_SISTEMA = {
  // Gradientes para tarjetas (bg-gradient-to-br)
  gradient: {
    azul: 'from-blue-500 to-blue-600',
    verde: 'from-green-500 to-green-600',
    naranja: 'from-amber-500 to-amber-600',
    rojo: 'from-red-500 to-red-600',
    gris: 'from-slate-500 to-slate-600',
    purpura: 'from-purple-500 to-purple-600',
    cyan: 'from-cyan-500 to-cyan-600',
    primary: 'from-[#0f2044] to-[#0a1628]', // azul corporativo oscuro
  },

  // Badges (bg-{color}-100 text-{color}-700)
  badge: {
    azul: 'bg-blue-100 text-blue-700',
    verde: 'bg-green-100 text-green-700',
    naranja: 'bg-amber-100 text-amber-700',
    rojo: 'bg-red-100 text-red-700',
    gris: 'bg-slate-100 text-slate-700',
    purpura: 'bg-purple-100 text-purple-700',
    cyan: 'bg-cyan-100 text-cyan-700',
    rose: 'bg-rose-100 text-rose-700',
  },

  // Badges con borde (border-{color}-200)
  badgeBorder: {
    azul: 'bg-blue-100 text-blue-700 border-blue-200',
    verde: 'bg-green-100 text-green-700 border-green-200',
    naranja: 'bg-amber-100 text-amber-700 border-amber-200',
    rojo: 'bg-red-100 text-red-700 border-red-200',
    gris: 'bg-slate-100 text-slate-700 border-slate-200',
    purpura: 'bg-purple-100 text-purple-700 border-purple-200',
    cyan: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    rose: 'bg-rose-100 text-rose-700 border-rose-200',
  },

  // Fondos suaves (bg-{color}-50)
  bgSoft: {
    azul: 'bg-blue-50',
    verde: 'bg-green-50',
    naranja: 'bg-amber-50',
    rojo: 'bg-red-50',
    gris: 'bg-slate-50',
    purpura: 'bg-purple-50',
    cyan: 'bg-cyan-50',
    rose: 'bg-rose-50',
  },

  // Texto de colores (text-{color}-700)
  text: {
    azul: 'text-blue-700',
    verde: 'text-green-700',
    naranja: 'text-amber-700',
    rojo: 'text-red-700',
    gris: 'text-slate-700',
    purpura: 'text-purple-700',
    cyan: 'text-cyan-700',
    rose: 'text-rose-700',
    primary: 'text-[#0f2044]',
    muted: 'text-slate-500',
  },

  // Bordes (border-{color}-200)
  border: {
    azul: 'border-blue-200',
    verde: 'border-green-200',
    naranja: 'border-amber-200',
    rojo: 'border-red-200',
    gris: 'border-slate-200',
    purpura: 'border-purple-200',
    cyan: 'border-cyan-200',
    rose: 'border-rose-200',
  },

  // Botones (bg-{color}-500 hover:bg-{color}-600)
  button: {
    azul: 'bg-blue-500 hover:bg-blue-600 text-white',
    verde: 'bg-green-500 hover:bg-green-600 text-white',
    naranja: 'bg-amber-500 hover:bg-amber-600 text-white',
    rojo: 'bg-red-500 hover:bg-red-600 text-white',
    gris: 'bg-slate-500 hover:bg-slate-600 text-white',
    purpura: 'bg-purple-500 hover:bg-purple-600 text-white',
    primary: 'bg-[#0f2044] hover:bg-[#0a1628] text-white',
  },

  // Barras de progreso (bg-{color}-500)
  progress: {
    azul: 'bg-blue-500',
    verde: 'bg-green-500',
    naranja: 'bg-amber-500',
    rojo: 'bg-red-500',
    gris: 'bg-slate-500',
    purpura: 'bg-purple-500',
  },
} as const

// Mapeo de estados comunes a colores (estandarizado en todo el sistema)
export const ESTADO_COLOR: Record<string, string> = {
  // OT
  Pendiente: COLORES_SISTEMA.badge.naranja,
  'En Progreso': COLORES_SISTEMA.badge.azul,
  Completado: COLORES_SISTEMA.badge.verde,
  Cancelado: COLORES_SISTEMA.badge.rojo,

  // SC
  Solicitado: COLORES_SISTEMA.badge.azul,
  'En Proceso': COLORES_SISTEMA.badge.naranja,
  Comprado: COLORES_SISTEMA.badge.verde,
  Rechazado: COLORES_SISTEMA.badge.rojo,
  Anulada: COLORES_SISTEMA.badge.gris,

  // Cumplimiento
  Aprobado: COLORES_SISTEMA.badge.verde,
  Vencido: COLORES_SISTEMA.badge.naranja,
  'En Revisión': COLORES_SISTEMA.badge.azul,

  // Etapas de aprobación
  'Pendiente Supervisor': COLORES_SISTEMA.badge.naranja,
  'Aprobada Supervisor': COLORES_SISTEMA.badge.azul,
  'Aprobada Admin': COLORES_SISTEMA.badge.verde,
  'Rechazada Supervisor': COLORES_SISTEMA.badge.rojo,
  'Rechazada Admin': COLORES_SISTEMA.badge.rojo,
}

// Mapeo de prioridades a colores (estandarizado)
export const PRIORIDAD_COLOR: Record<string, string> = {
  Urgente: COLORES_SISTEMA.badge.rojo,
  Alta: COLORES_SISTEMA.badge.naranja,
  Media: COLORES_SISTEMA.badge.azul,
  Baja: COLORES_SISTEMA.badge.gris,
}

/**
 * Obtiene la clase de badge para un estado dado.
 * Si no existe, devuelve el badge gris por defecto.
 */
export function getEstadoBadgeColor(estado: string): string {
  return ESTADO_COLOR[estado] || COLORES_SISTEMA.badge.gris
}

/**
 * Obtiene la clase de badge para una prioridad dada.
 */
export function getPrioridadBadgeColor(prioridad: string): string {
  return PRIORIDAD_COLOR[prioridad] || COLORES_SISTEMA.badge.gris
}

/**
 * Genera el siguiente correlativo para un modelo.
 * Busca el último código existente y le suma 1.
 *
 * @param existingCodigos - Array de códigos existentes (ej: ['HERR-01', 'HERR-02'])
 * @param prefix - Prefijo del código (ej: 'HERR', 'MAT', 'TAR', 'ACT')
 * @param padLength - Cantidad de dígitos (default: 3 → 001, 002, etc.)
 * @returns El siguiente código (ej: 'HERR-003')
 */
export function generarCorrelativo(
  existingCodigos: (string | null | undefined)[],
  prefix: string,
  padLength: number = 3
): string {
  let maxNum = 0
  for (const codigo of existingCodigos) {
    if (!codigo) continue
    // Extraer el número del código (ej: 'HERR-015' → 15)
    const match = codigo.match(new RegExp(`^${prefix}-(\\d+)$`, 'i'))
    if (match) {
      const num = parseInt(match[1])
      if (num > maxNum) maxNum = num
    }
  }
  const nextNum = maxNum + 1
  return `${prefix}-${String(nextNum).padStart(padLength, '0')}`
}

// ============================================
// CORRELATIVOS CON TABLA DE SECUENCIAS
// ============================================

/**
 * Genera el siguiente correlativo usando la tabla Secuencia.
 * Es transaccional y atómica: no hay riesgo de duplicación.
 * 
 * @param db - Instancia de PrismaClient
 * @param tabla - Nombre de la tabla ("OrdenTrabajo", "Proyecto", etc.)
 * @param prefijo - Prefijo del código ("OT", "PROY", "SC", etc.)
 * @param padding - Cantidad de dígitos (default: 3)
 * @returns El siguiente código (ej: "OT-110")
 */
export async function generarCorrelativoDB(
  db: any,
  tabla: string,
  prefijo: string,
  padding: number = 3
): Promise<string> {
  // Upsert atómico: incrementa el contador y devuelve el nuevo número
  const secuencia = await db.secuencia.upsert({
    where: { tabla },
    update: { ultimoNum: { increment: 1 } },
    create: { tabla, prefijo, ultimoNum: 1, padding },
  })
  
  return `${prefijo}-${String(secuencia.ultimoNum).padStart(padding, '0')}`
}

// ============================================
// IMPRESIÓN DE PDF (jsPDF)
// ============================================

/**
 * Imprime un documento jsPDF sin abrir una nueva pestaña con blob: URL.
 *
 * El patrón anterior era:
 *   const blobUrl = doc.output('bloburl')
 *   window.open(blobUrl, '_blank')
 *
 * Pero en muchos navegadores modernos (especialmente Chrome con bloqueador
 * de pop-ups, o Safari en iOS), el `blob:` URL no carga en una nueva pestaña
 * y produce el error "This page couldn't load" de forma reiterativa.
 *
 * Esta función usa un <iframe> oculto cargando el PDF como blob y dispara
 * el diálogo de impresión del navegador. Es el patrón recomendado por jsPDF
 * para producción y funciona en todos los navegadores.
 *
 * @param doc - Instancia de jsPDF ya construida
 * @param nombreArchivo - Nombre sugerido si el usuario decide descargar
 */
export function imprimirPDFDoc(doc: any, nombreArchivo: string = 'documento.pdf'): void {
  try {
    // Obtener el PDF como Blob
    const blob = doc.output('blob')
    const blobUrl = URL.createObjectURL(blob)

    // Crear iframe oculto
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.style.margin = '0'
    iframe.style.padding = '0'
    iframe.style.overflow = 'hidden'
    iframe.title = 'PDF para impresión'
    iframe.src = blobUrl

    // Limpieza después de imprimir
    const cleanup = () => {
      try {
        URL.revokeObjectURL(blobUrl)
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
      } catch {}
    }

    iframe.onload = () => {
      try {
        // Disparar impresión
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
        // Limpiar después de 1 minuto (el diálogo de impresión puede tardar)
        setTimeout(cleanup, 60000)
      } catch (e) {
        console.warn('No se pudo imprimir automáticamente, descargando PDF:', e)
        // Fallback: descargar el PDF
        triggerDownload(blob, nombreArchivo)
        cleanup()
      }
    }

    // Si después de 5s el onload no dispara (PDF muy grande), forzar descarga
    setTimeout(() => {
      if (iframe.parentNode) {
        // El iframe sigue ahí pero no se imprimió → descargar
        // (solo si no se ha removido ya)
      }
    }, 5000)

    document.body.appendChild(iframe)
  } catch (e) {
    console.error('Error al imprimir PDF:', e)
    // Último recurso: descargar el PDF
    try {
      const blob = doc.output('blob')
      triggerDownload(blob, nombreArchivo)
    } catch (e2) {
      console.error('Error en fallback de descarga:', e2)
    }
  }
}

/**
 * Dispara la descarga de un Blob como archivo.
 */
function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Muestra un documento (PDF/imagen) embebido en una ventana nueva de forma robusta.
 *
 * El patrón anterior era:
 *   const newWindow = window.open()
 *   newWindow.document.write(`<iframe src="${dataUrl}" ...>`)
 *
 * Pero window.open() sin URL es bloqueado por muchos navegadores como pop-up,
 * y si el bloqueador está activo newWindow es null y no se muestra nada.
 *
 * Esta función:
 * 1. Intenta abrir una nueva ventana con el documento embebido.
 * 2. Si el navegador bloquea pop-ups, hace fallback a descarga directa.
 *
 * @param dataUrl - URL data: o blob: del documento a mostrar
 * @param nombreArchivo - Nombre sugerido si se descarga
 */
export function verDocumentoEnVentana(dataUrl: string, nombreArchivo: string = 'documento.pdf'): void {
  try {
    const newWindow = window.open('', '_blank')
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html lang="es">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>${nombreArchivo}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              html, body { width: 100%; height: 100%; overflow: hidden; }
              iframe { width: 100%; height: 100%; border: none; }
              .toolbar {
                position: fixed; top: 0; left: 0; right: 0; height: 40px;
                background: #0f2044; color: white;
                display: flex; align-items: center; justify-content: space-between;
                padding: 0 16px; font-family: system-ui, sans-serif; font-size: 13px;
                z-index: 100;
              }
              .toolbar a { color: white; text-decoration: none; padding: 6px 12px; border-radius: 4px; background: rgba(255,255,255,0.15); }
              .toolbar a:hover { background: rgba(255,255,255,0.25); }
              .iframe-wrap { padding-top: 40px; height: 100vh; }
            </style>
          </head>
          <body>
            <div class="toolbar">
              <span>📄 ${nombreArchivo}</span>
              <a href="${dataUrl}" download="${nombreArchivo}">Descargar</a>
            </div>
            <div class="iframe-wrap">
              <iframe src="${dataUrl}" title="${nombreArchivo}"></iframe>
            </div>
          </body>
        </html>
      `)
      newWindow.document.close()
    } else {
      // Pop-up bloqueado: descargar directamente
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = nombreArchivo
      a.target = '_blank'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  } catch (e) {
    console.error('Error al mostrar documento:', e)
  }
}
