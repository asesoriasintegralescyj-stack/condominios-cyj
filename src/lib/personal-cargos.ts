/**
 * Configuración de cargos del personal y exclusión de OT.
 *
 * CARGOS_VALIDOS: lista oficial de cargos que pueden asignarse en el formulario
 * de Personal. Sincronizada con los cargos reales del Condominio Laguna Norte.
 *
 * CARGOS_EXCLUIDOS_OT: cargos operativos que NO ejecutan OT (conserjes, guardias,
 * encargados de cámaras). El resto (Jardinero, Mantenciones, etc.) SÍ puede.
 *
 * La comparación es case-insensitive y normaliza acentos y espacios
 * para que coincida con variantes como "CONSERJE", "conserje", "Conserje ",
 * "Conserje Full Time", "Guardia", "Guardia Full Time",
 * "Encargado Control Cámaras", "Encargado de Camaras", etc.
 */

// Cargos válidos que se pueden seleccionar en el formulario de Personal.
// Ordenados por área operativa para facilitar la selección.
export const CARGOS_VALIDOS = [
  // Operativos - Mantención
  'Jardinero',
  'Mantenciones',
  'Servicios Generales',
  'Operario de Laguna y Piscinas (Lagunero)',
  // Operativos - Vigilancia
  'Conserje',
  'Conserje Full Time',
  'Guardia',
  'Guardia Full Time',
  'Encargado Control Cámaras',
  // Administrativos
  'Jefe de Operaciones',
  'Supervisor',
  'Administrador',
  'Contador',
  // Especialistas
  'Electricista',
  'Plomero',
  'Pintor',
  'Albañil',
  'Auxiliar',
] as const

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

/**
 * Normaliza un cargo al formato canónico definido en CARGOS_VALIDOS.
 * Si el cargo no coincide con ninguno, lo devuelve sin cambios.
 *
 * Ejemplos:
 *   "conserje"        → "Conserje"
 *   "CONSERJE FT"     → "Conserje Full Time"
 *   "guardia ft"      → "Guardia Full Time"
 *   "Jefe De Operaciones" → "Jefe de Operaciones"
 *
 * Útil para limpiar datos históricos cargados sin validación.
 */
export function normalizarCargo(cargo?: string | null): string | null {
  if (!cargo) return null
  const c = normalize(cargo)
  if (!c) return null

  // Mapeo manual de variantes conocidas al formato canónico
  const mapeos: Record<string, string> = {
    'conserje': 'Conserje',
    'conserje full time': 'Conserje Full Time',
    'conserje ft': 'Conserje Full Time',
    'guardia': 'Guardia',
    'guardia full time': 'Guardia Full Time',
    'guardia ft': 'Guardia Full Time',
    'jardinero': 'Jardinero',
    'mantenciones': 'Mantenciones',
    'servicios generales': 'Servicios Generales',
    'operario de laguna y piscinas': 'Operario de Laguna y Piscinas (Lagunero)',
    'operario de laguna y piscinas (lagunero)': 'Operario de Laguna y Piscinas (Lagunero)',
    'lagunero': 'Operario de Laguna y Piscinas (Lagunero)',
    'encargado control camaras': 'Encargado Control Cámaras',
    'encargado control cámaras': 'Encargado Control Cámaras',
    'encargado de camaras': 'Encargado Control Cámaras',
    'encargado de cámaras': 'Encargado Control Cámaras',
    'jefe de operaciones': 'Jefe de Operaciones',
    'jefe operaciones': 'Jefe de Operaciones',
    'supervisor': 'Supervisor',
    'administrador': 'Administrador',
    'contador': 'Contador',
    'electricista': 'Electricista',
    'plomero': 'Plomero',
    'pintor': 'Pintor',
    'albanil': 'Albañil',
    'auxiliar': 'Auxiliar',
  }

  // Coincidencia exacta normalizada
  if (mapeos[c]) return mapeos[c]

  // Buscar en CARGOS_VALIDOS por texto normalizado
  for (const valido of CARGOS_VALIDOS) {
    if (normalize(valido) === c) return valido
  }

  // Si no coincide, devolver original (preserva datos personalizados)
  return cargo.trim()
}
