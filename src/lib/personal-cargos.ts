/**
 * Configuración de cargos excludos de la asignación de Órdenes de Trabajo.
 *
 * Estos cargos corresponden a roles operativos que NO ejecutan OT
 * (conserjes, guardias, encargados de cámaras).
 *
 * El resto del personal (Jardinero, Mantenciones, Servicios Generales,
 * Jefe de Operaciones, Supervisor, Operario de Laguna y Piscinas, etc.)
 * SÍ puede ser asignado a OT.
 *
 * La comparación es case-insensitive y normaliza acentos y espacios
 * para que coincida con variantes como "CONSERJE", "conserje", "Conserje ",
 * "Conserje Full Time", "Guardia", "Guardia Full Time",
 * "Encargado Control Cámaras", "Encargado de Camaras", etc.
 */

// Cargos que NO pueden ser asignados a Órdenes de Trabajo
export const CARGOS_EXCLUIDOS_OT = [
  'conserje',
  'conserje full time',
  'guardia',
  'guardia full time',
  'encargado control camaras',
  'encargado control cámaras',
  'encargado de camaras',
  'encargado de cámaras',
  'encargado camaras',
  'encargado cámaras',
]

/**
 * Normaliza un texto para comparación: minúsculas, sin acentos, sin espacios extra.
 */
function normalize(text: string): string {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita acentos
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Verifica si un cargo está excluido de la asignación de OT.
 * @param cargo Cargo del personal (campo Personal.cargo)
 * @returns true si el cargo NO puede ser asignado a OT
 */
export function isCargoExcluidoOT(cargo?: string | null): boolean {
  if (!cargo) return false
  const c = normalize(cargo)
  // Coincidencia exacta
  if (CARGOS_EXCLUIDOS_OT.includes(c)) return true
  // Coincidencia por prefijo: "conserje xxx" o "guardia xxx"
  if (c.startsWith('conserje ')) return true
  if (c.startsWith('guardia ')) return true
  if (c.startsWith('encargado ') && (c.includes('camara') || c.includes('cámara'))) return true
  return false
}

/**
 * Filtra una lista de personal quitando los cargos excluidos.
 * Útil para filtrar antes de mostrar el dropdown de asignación de OT.
 */
export function filtrarPersonalAsignableOT<T extends { cargo?: string | null }>(
  personal: T[]
): T[] {
  return personal.filter((p) => !isCargoExcluidoOT(p.cargo))
}
