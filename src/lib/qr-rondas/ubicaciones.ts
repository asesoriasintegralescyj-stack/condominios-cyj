/**
 * Ubicaciones autorizadas para el registro manual de patentes vehiculares.
 *
 * Estas 8 ubicaciones son las únicas válidas en el sistema para el registro
 * manual de patentes desde el escritorio. Se usan tanto en el modal de
 * "Registrar Patente" como en el filtro de la tabla de patentes.
 *
 * Cualquier patente registrada desde la app móvil con un QR de entrada/salida
 * conservará su ubicación original (la inferida del QR), pero el escritorio
 * SOLO permite elegir de esta lista cerrada.
 */
export const UBICACIONES_PATENTES = [
  'ALBATROS',
  'BANDURRIAS',
  'BECACINAS',
  'CANQUEN',
  'FLAMENCOS',
  'FAISANES',
  'GARZAS',
  'GAVIOTAS',
] as const

export type UbicacionPatente = (typeof UBICACIONES_PATENTES)[number]

export function isValidUbicacionPatente(value: string): value is UbicacionPatente {
  return (UBICACIONES_PATENTES as readonly string[]).includes(value)
}
