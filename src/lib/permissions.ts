/**
 * Sistema de Permisos por Módulo
 * Asesorías Integrales CyJ - Sistema de Gestión v2
 * 
 * Define permisos granulares para cada módulo del sistema.
 * Los permisos se almacenan en User.permisos como JSON.
 */

// ============================================
// TIPOS DE PERMISOS
// ============================================

export interface ModulePermission {
  ver: boolean;
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
}

export interface UserPermissions {
  [module: string]: ModulePermission;
}

// ============================================
// DEFINICIÓN DE MÓDULOS
// ============================================

export interface ModuleDefinition {
  id: string;
  nombre: string;
  label: string;
  categoria: 'Principal' | 'Gestión' | 'Administración' | 'Catálogos' | 'Reportes';
  icono?: string;
}

export const MODULOS: ModuleDefinition[] = [
  // Principal
  { id: 'dashboard', nombre: 'dashboard', label: 'Dashboard', categoria: 'Principal' },
  
  // Gestión
  { id: 'condominio', nombre: 'condominio', label: 'Condominio', categoria: 'Gestión' },
  { id: 'residentes', nombre: 'residentes', label: 'Residentes', categoria: 'Gestión' },
  { id: 'reservas', nombre: 'reservas', label: 'Reservas', categoria: 'Gestión' },
  { id: 'ot', nombre: 'ot', label: 'Órdenes de Trabajo', categoria: 'Gestión' },
  { id: 'proyectos', nombre: 'proyectos', label: 'Proyectos', categoria: 'Gestión' },
  { id: 'inspecciones', nombre: 'inspecciones', label: 'Inspecciones', categoria: 'Gestión' },
  { id: 'personal', nombre: 'personal', label: 'Personal', categoria: 'Gestión' },
  { id: 'activos', nombre: 'activos', label: 'Activos', categoria: 'Gestión' },
  
  // Administración
  { id: 'proveedores', nombre: 'proveedores', label: 'Proveedores', categoria: 'Administración' },
  { id: 'gastos', nombre: 'gastos', label: 'Gastos', categoria: 'Administración' },
  { id: 'centrocostos', nombre: 'centrocostos', label: 'Centro de Costos', categoria: 'Administración' },
  { id: 'inventario', nombre: 'inventario', label: 'Inventario', categoria: 'Administración' },
  
  // Catálogos
  { id: 'materiales', nombre: 'materiales', label: 'Materiales', categoria: 'Catálogos' },
  { id: 'herramientas', nombre: 'herramientas', label: 'Herramientas', categoria: 'Catálogos' },
  { id: 'tareas', nombre: 'tareas', label: 'Tareas', categoria: 'Catálogos' },
  { id: 'catalogos', nombre: 'catalogos', label: 'Catálogos', categoria: 'Catálogos' },
  
  // Reportes
  { id: 'reportes', nombre: 'reportes', label: 'Reportes', categoria: 'Reportes' },
];

// ============================================
// PERMISOS POR DEFECTO POR ROL
// ============================================

export const DEFAULT_PERMISSIONS: Record<string, UserPermissions> = {
  admin: {
    // ADMIN - Ve todo, hace todo
    dashboard: { ver: true, crear: false, editar: false, eliminar: false },
    condominio: { ver: true, crear: true, editar: true, eliminar: true },
    residentes: { ver: true, crear: true, editar: true, eliminar: true },
    reservas: { ver: true, crear: true, editar: true, eliminar: true },
    ot: { ver: true, crear: true, editar: true, eliminar: true },
    proyectos: { ver: true, crear: true, editar: true, eliminar: true },
    inspecciones: { ver: true, crear: true, editar: true, eliminar: true },
    personal: { ver: true, crear: true, editar: true, eliminar: true },
    activos: { ver: true, crear: true, editar: true, eliminar: true },
    proveedores: { ver: true, crear: true, editar: true, eliminar: true },
    gastos: { ver: true, crear: true, editar: true, eliminar: true },
    centrocostos: { ver: true, crear: true, editar: true, eliminar: true },
    inventario: { ver: true, crear: true, editar: true, eliminar: true },
    materiales: { ver: true, crear: true, editar: true, eliminar: true },
    herramientas: { ver: true, crear: true, editar: true, eliminar: true },
    tareas: { ver: true, crear: true, editar: true, eliminar: true },
    catalogos: { ver: true, crear: true, editar: true, eliminar: true },
    reportes: { ver: true, crear: false, editar: false, eliminar: false },
    // Permisos especiales admin
    usuarios: { ver: true, crear: true, editar: true, eliminar: true },
    tiempo_ot: { ver: true, crear: false, editar: false, eliminar: false }, // Reporte de confirmación de tiempo
  },
  
  supervisor: {
    // SUPERVISOR - Ve muchos módulos, puede crear OT y Reservas, no elimina
    dashboard: { ver: true, crear: false, editar: false, eliminar: false },
    condominio: { ver: true, crear: false, editar: false, eliminar: false },
    residentes: { ver: true, crear: false, editar: false, eliminar: false },
    reservas: { ver: true, crear: true, editar: true, eliminar: false },
    ot: { ver: true, crear: true, editar: true, eliminar: false },
    proyectos: { ver: true, crear: true, editar: true, eliminar: false },
    inspecciones: { ver: true, crear: true, editar: true, eliminar: false },
    personal: { ver: true, crear: false, editar: false, eliminar: false },
    activos: { ver: true, crear: false, editar: false, eliminar: false },
    proveedores: { ver: true, crear: false, editar: false, eliminar: false },
    gastos: { ver: true, crear: false, editar: false, eliminar: false },
    centrocostos: { ver: true, crear: false, editar: false, eliminar: false },
    inventario: { ver: true, crear: false, editar: false, eliminar: false },
    materiales: { ver: true, crear: false, editar: false, eliminar: false },
    herramientas: { ver: true, crear: false, editar: false, eliminar: false },
    tareas: { ver: true, crear: false, editar: false, eliminar: false },
    catalogos: { ver: true, crear: false, editar: false, eliminar: false },
    reportes: { ver: true, crear: false, editar: false, eliminar: false },
    // No puede gestionar usuarios
    usuarios: { ver: false, crear: false, editar: false, eliminar: false },
    // No puede ver reporte de confirmación de tiempo
    tiempo_ot: { ver: false, crear: false, editar: false, eliminar: false },
  },
  
  usuario: {
    // USUARIO - Acceso limitado: Dashboard, Residentes, Reservas (solo ver)
    dashboard: { ver: true, crear: false, editar: false, eliminar: false },
    condominio: { ver: false, crear: false, editar: false, eliminar: false },
    residentes: { ver: true, crear: false, editar: false, eliminar: false },
    reservas: { ver: true, crear: false, editar: false, eliminar: false },
    ot: { ver: false, crear: false, editar: false, eliminar: false },
    proyectos: { ver: false, crear: false, editar: false, eliminar: false },
    inspecciones: { ver: false, crear: false, editar: false, eliminar: false },
    personal: { ver: false, crear: false, editar: false, eliminar: false },
    activos: { ver: false, crear: false, editar: false, eliminar: false },
    proveedores: { ver: false, crear: false, editar: false, eliminar: false },
    gastos: { ver: false, crear: false, editar: false, eliminar: false },
    centrocostos: { ver: false, crear: false, editar: false, eliminar: false },
    inventario: { ver: false, crear: false, editar: false, eliminar: false },
    materiales: { ver: false, crear: false, editar: false, eliminar: false },
    herramientas: { ver: false, crear: false, editar: false, eliminar: false },
    tareas: { ver: false, crear: false, editar: false, eliminar: false },
    catalogos: { ver: false, crear: false, editar: false, eliminar: false },
    reportes: { ver: false, crear: false, editar: false, eliminar: false },
    usuarios: { ver: false, crear: false, editar: false, eliminar: false },
    tiempo_ot: { ver: false, crear: false, editar: false, eliminar: false },
  },
  
  personal: {
    // PERSONAL/TRABAJADOR - Solo ver OTs asignadas, Proyectos e Inspecciones. Puede verificar tareas.
    dashboard: { ver: true, crear: false, editar: false, eliminar: false },
    condominio: { ver: false, crear: false, editar: false, eliminar: false },
    residentes: { ver: false, crear: false, editar: false, eliminar: false },
    reservas: { ver: false, crear: false, editar: false, eliminar: false },
    ot: { ver: true, crear: false, editar: true, eliminar: false }, // Solo para verificar tareas
    proyectos: { ver: true, crear: false, editar: false, eliminar: false },
    inspecciones: { ver: true, crear: false, editar: false, eliminar: false },
    personal: { ver: false, crear: false, editar: false, eliminar: false },
    activos: { ver: false, crear: false, editar: false, eliminar: false },
    proveedores: { ver: false, crear: false, editar: false, eliminar: false },
    gastos: { ver: false, crear: false, editar: false, eliminar: false },
    centrocostos: { ver: false, crear: false, editar: false, eliminar: false },
    inventario: { ver: false, crear: false, editar: false, eliminar: false },
    materiales: { ver: false, crear: false, editar: false, eliminar: false },
    herramientas: { ver: false, crear: false, editar: false, eliminar: false },
    tareas: { ver: false, crear: false, editar: false, eliminar: false },
    catalogos: { ver: false, crear: false, editar: false, eliminar: false },
    reportes: { ver: false, crear: false, editar: false, eliminar: false },
    usuarios: { ver: false, crear: false, editar: false, eliminar: false },
    tiempo_ot: { ver: false, crear: false, editar: false, eliminar: false },
  },
};

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

/**
 * Parsea el JSON de permisos del usuario
 */
export function parseUserPermissions(permisosJson: string | null | undefined): UserPermissions {
  if (!permisosJson) {
    return {};
  }
  
  try {
    return JSON.parse(permisosJson);
  } catch {
    console.error('Error parsing user permissions');
    return {};
  }
}

/**
 * Obtiene los permisos efectivos del usuario
 * Combina permisos del rol con permisos personalizados
 */
export function getEffectivePermissions(
  rol: string,
  permisosJson: string | null | undefined
): UserPermissions {
  // Obtener permisos por defecto del rol
  const defaultPerms = DEFAULT_PERMISSIONS[rol] || DEFAULT_PERMISSIONS.usuario;
  
  // Si no hay permisos personalizados, usar los del rol
  if (!permisosJson) {
    return { ...defaultPerms };
  }
  
  // Parsear permisos personalizados
  const customPerms = parseUserPermissions(permisosJson);
  
  // Combinar: los permisos personalizados sobrescriben los del rol
  return {
    ...defaultPerms,
    ...customPerms,
  };
}

/**
 * Verifica si el usuario tiene acceso a un módulo
 */
export function hasModuleAccess(
  rol: string,
  permisosJson: string | null | undefined,
  module: string,
  action: 'ver' | 'crear' | 'editar' | 'eliminar'
): boolean {
  // Admin siempre tiene acceso total
  if (rol === 'admin') {
    return true;
  }
  
  const permissions = getEffectivePermissions(rol, permisosJson);
  const modulePerms = permissions[module];
  
  if (!modulePerms) {
    return false;
  }
  
  return modulePerms[action] === true;
}

/**
 * Verifica si el usuario puede ver un módulo
 */
export function canViewModule(
  rol: string,
  permisosJson: string | null | undefined,
  module: string
): boolean {
  return hasModuleAccess(rol, permisosJson, module, 'ver');
}

/**
 * Verifica si el usuario puede crear en un módulo
 */
export function canCreateInModule(
  rol: string,
  permisosJson: string | null | undefined,
  module: string
): boolean {
  return hasModuleAccess(rol, permisosJson, module, 'crear');
}

/**
 * Verifica si el usuario puede editar en un módulo
 */
export function canEditInModule(
  rol: string,
  permisosJson: string | null | undefined,
  module: string
): boolean {
  return hasModuleAccess(rol, permisosJson, module, 'editar');
}

/**
 * Verifica si el usuario puede eliminar en un módulo
 */
export function canDeleteInModule(
  rol: string,
  permisosJson: string | null | undefined,
  module: string
): boolean {
  return hasModuleAccess(rol, permisosJson, module, 'eliminar');
}

/**
 * Serializa permisos a JSON para guardar en la base de datos
 */
export function serializePermissions(permissions: UserPermissions): string {
  return JSON.stringify(permissions);
}

/**
 * Obtiene los permisos por defecto para un rol
 */
export function getDefaultPermissionsForRole(rol: string): UserPermissions {
  return { ...(DEFAULT_PERMISSIONS[rol] || DEFAULT_PERMISSIONS.usuario) };
}

/**
 * Obtiene módulos agrupados por categoría
 */
export function getModulesByCategory(): Record<string, ModuleDefinition[]> {
  const result: Record<string, ModuleDefinition[]> = {};
  
  for (const mod of MODULOS) {
    if (!result[mod.categoria]) {
      result[mod.categoria] = [];
    }
    result[mod.categoria].push(mod);
  }
  
  return result;
}

/**
 * Mapeo de IDs de módulos del sidebar a nombres de permisos
 */
export const MODULE_PERMISSION_MAP: Record<string, string> = {
  dashboard: 'dashboard',
  condominio: 'condominio',
  residentes: 'residentes',
  reservas: 'reservas',
  ot: 'ot',
  proyectos: 'proyectos',
  inspecciones: 'inspecciones',
  personal: 'personal',
  activos: 'activos',
  proveedores: 'proveedores',
  gastos: 'gastos',
  centrocostos: 'centrocostos',
  inventario: 'inventario',
  catalogos: 'catalogos',
  materiales: 'materiales',
  herramientas: 'herramientas',
  tareas: 'tareas',
  reportes: 'reportes',
};
