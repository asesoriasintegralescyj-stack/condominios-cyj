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
