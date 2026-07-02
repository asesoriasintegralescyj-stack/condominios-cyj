/**
 * Sistema de Permisos Granulares por Rol
 * Sistema de Gestión de Condominios v3
 * Asesorías Integrales CyJ SpA
 */

// ============================================
// DEFINICIÓN DE ROLES
// ============================================

export type Rol = 'admin' | 'supervisor' | 'mantencion' | 'limpieza' | 'comite' | 'auditor' | 'residente';

export const ROL_INFO: Record<Rol, { nombre: string; descripcion: string; color: string }> = {
  admin: {
    nombre: 'Administrador',
    descripcion: 'Acceso total al sistema. Puede ver, crear, editar y eliminar todo.',
    color: 'red',
  },
  supervisor: {
    nombre: 'Supervisor',
    descripcion: 'Puede crear OTs, rendir gastos (pendientes de aprobación), crear activos (pendientes de aprobación).',
    color: 'amber',
  },
  mantencion: {
    nombre: 'Mantención',
    descripcion: 'Ve OTs asignadas según su cargo. Puede actualizar progreso y materiales.',
    color: 'blue',
  },
  limpieza: {
    nombre: 'Limpieza',
    descripcion: 'Solo ve sus OTs asignadas. Puede marcar como completadas.',
    color: 'green',
  },
  comite: {
    nombre: 'Comité',
    descripcion: 'Miembro del comité de condominio. Puede ver reportes, estados de cuenta y aprobar decisiones.',
    color: 'purple',
  },
  auditor: {
    nombre: 'Auditor',
    descripcion: 'Acceso de solo lectura a todos los módulos para auditoría y revisión.',
    color: 'gray',
  },
  residente: {
    nombre: 'Residente',
    descripcion: 'Portal de residentes. Puede ver su estado de cuenta, hacer reservas y crear solicitudes.',
    color: 'teal',
  },
};

// ============================================
// PERMISOS POR MÓDULO
// ============================================

export interface Permisos {
  // Dashboard
  dashboard: {
    ver: boolean;
    verTodasOTs: boolean;
    verAprobaciones: boolean;
    verEstadisticas: boolean;
  };
  
  // Órdenes de Trabajo
  ot: {
    ver: boolean;
    verAsignadas: boolean;
    verTodas: boolean;
    crear: boolean;
    editar: boolean;
    eliminar: boolean;
    aprobar: boolean;
    verAprobacion: boolean;
    asignarPersonal: boolean;
    cambiarEstado: boolean;
    verCostos: boolean;
  };
  
  // Gastos
  gastos: {
    ver: boolean;
    verPropios: boolean;
    verTodos: boolean;
    crear: boolean;
    editar: boolean;
    eliminar: boolean;
    aprobar: boolean;
    necesitaAprobacion: boolean;
    verMontos: boolean;
  };
  
  // Activos
  activos: {
    ver: boolean;
    crear: boolean;
    editar: boolean;
    eliminar: boolean;
    aprobar: boolean;
    necesitaAprobacion: boolean;
  };
  
  // Personal
  personal: {
    ver: boolean;
    crear: boolean;
    editar: boolean;
    eliminar: boolean;
    gestionarUsuarios: boolean;
    verSueldos: boolean;
  };
  
  // Proveedores
  proveedores: {
    ver: boolean;
    crear: boolean;
    editar: boolean;
    eliminar: boolean;
  };
  
  // Residentes
  residentes: {
    ver: boolean;
    crear: boolean;
    editar: boolean;
    eliminar: boolean;
    verDatosContacto: boolean;
  };
  
  // Propiedades
  propiedades: {
    ver: boolean;
    crear: boolean;
    editar: boolean;
    eliminar: boolean;
  };
  
  // Proyectos
  proyectos: {
    ver: boolean;
    crear: boolean;
    editar: boolean;
    eliminar: boolean;
    verPresupuesto: boolean;
  };
  
  // Inspecciones
  inspecciones: {
    ver: boolean;
    crear: boolean;
    editar: boolean;
    eliminar: boolean;
  };
  
  // Catálogos
  catalogos: {
    ver: boolean;
    crear: boolean;
    editar: boolean;
    eliminar: boolean;
  };
  
  // Centros de Costo
  centrosCosto: {
    ver: boolean;
    crear: boolean;
    editar: boolean;
    eliminar: boolean;
    verPresupuesto: boolean;
  };
  
  // Reportes
  reportes: {
    ver: boolean;
    exportar: boolean;
    verTodos: boolean;
    verFinancieros: boolean;
  };
  
  // Usuarios
  usuarios: {
    ver: boolean;
    crear: boolean;
    editar: boolean;
    eliminar: boolean;
    cambiarRoles: boolean;
  };
  
  // Configuración
  configuracion: {
    ver: boolean;
    editar: boolean;
    gestionarPermisos: boolean;
    gestionarBackups: boolean;
  };
  
  // Logs de Auditoría
  logs: {
    ver: boolean;
    exportar: boolean;
  };
  
  // Comité
  comite: {
    ver: boolean;
    crear: boolean;
    editar: boolean;
    eliminar: boolean;
    verSesiones: boolean;
    crearSesiones: boolean;
    verActas: boolean;
  };
  
  // Morosidad
  morosidad: {
    ver: boolean;
    crear: boolean;
    editar: boolean;
    eliminar: boolean;
    verEstadosCuenta: boolean;
    generarCartas: boolean;
    condonar: boolean;
    configurarIntereses: boolean;
  };
  
  // Reservas
  reservas: {
    ver: boolean;
    crear: boolean;
    editar: boolean;
    eliminar: boolean;
    aprobar: boolean;
    verTodas: boolean;
  };
  
  // Inventario
  inventario: {
    ver: boolean;
    crear: boolean;
    editar: boolean;
    eliminar: boolean;
    ajustarStock: boolean;
    verMovimientos: boolean;
  };
  
  // Portal Residente
  portal: {
    ver: boolean;
    verEstadoCuenta: boolean;
    crearSolicitudes: boolean;
    hacerReservas: boolean;
    verMisOTs: boolean;
    pagarEnLinea: boolean;
  };
  
  // Notificaciones
  notificaciones: {
    ver: boolean;
    enviar: boolean;
    configurar: boolean;
    verHistorial: boolean;
  };
  
  // Auditoría
  auditoria: {
    ver: boolean;
    exportar: boolean;
    verDetalles: boolean;
  };
  
  // Integraciones
  integraciones: {
    ver: boolean;
    configurar: boolean;
    verPagos: boolean;
  };
  
  // Cumplimiento Legal
  cumplimiento: {
    ver: boolean;
    crear: boolean;
    editar: boolean;
    eliminar: boolean;
    aprobar: boolean;
    verDocumentos: boolean;
    subirArchivos: boolean;
    verHistorial: boolean;
  };
}

// ============================================
// PERMISOS PREDEFINIDOS POR ROL
// ============================================

export const PERMISOS_POR_ROL: Record<Rol, Permisos> = {
  // ==========================================
  // ADMINISTRADOR - Acceso total
  // ==========================================
  admin: {
    dashboard: { ver: true, verTodasOTs: true, verAprobaciones: true, verEstadisticas: true },
    ot: { ver: true, verAsignadas: true, verTodas: true, crear: true, editar: true, eliminar: true, aprobar: true, verAprobacion: false, asignarPersonal: true, cambiarEstado: true, verCostos: true },
    gastos: { ver: true, verPropios: true, verTodos: true, crear: true, editar: true, eliminar: true, aprobar: true, necesitaAprobacion: false, verMontos: true },
    activos: { ver: true, crear: true, editar: true, eliminar: true, aprobar: true, necesitaAprobacion: false },
    personal: { ver: true, crear: true, editar: true, eliminar: true, gestionarUsuarios: true, verSueldos: true },
    proveedores: { ver: true, crear: true, editar: true, eliminar: true },
    residentes: { ver: true, crear: true, editar: true, eliminar: true, verDatosContacto: true },
    propiedades: { ver: true, crear: true, editar: true, eliminar: true },
    proyectos: { ver: true, crear: true, editar: true, eliminar: true, verPresupuesto: true },
    inspecciones: { ver: true, crear: true, editar: true, eliminar: true },
    catalogos: { ver: true, crear: true, editar: true, eliminar: true },
    centrosCosto: { ver: true, crear: true, editar: true, eliminar: true, verPresupuesto: true },
    reportes: { ver: true, exportar: true, verTodos: true, verFinancieros: true },
    usuarios: { ver: true, crear: true, editar: true, eliminar: true, cambiarRoles: true },
    configuracion: { ver: true, editar: true, gestionarPermisos: true, gestionarBackups: true },
    logs: { ver: true, exportar: true },
    comite: { ver: true, crear: true, editar: true, eliminar: true, verSesiones: true, crearSesiones: true, verActas: true },
    morosidad: { ver: true, crear: true, editar: true, eliminar: true, verEstadosCuenta: true, generarCartas: true, condonar: true, configurarIntereses: true },
    reservas: { ver: true, crear: true, editar: true, eliminar: true, aprobar: true, verTodas: true },
    inventario: { ver: true, crear: true, editar: true, eliminar: true, ajustarStock: true, verMovimientos: true },
    portal: { ver: true, verEstadoCuenta: true, crearSolicitudes: true, hacerReservas: true, verMisOTs: true, pagarEnLinea: true },
    notificaciones: { ver: true, enviar: true, configurar: true, verHistorial: true },
    auditoria: { ver: true, exportar: true, verDetalles: true },
    integraciones: { ver: true, configurar: true, verPagos: true },
    cumplimiento: { ver: true, crear: true, editar: true, eliminar: true, aprobar: true, verDocumentos: true, subirArchivos: true, verHistorial: true },
  },
  
  // ==========================================
  // SUPERVISOR - Crea pero necesita aprobación
  // ==========================================
  supervisor: {
    dashboard: { ver: true, verTodasOTs: true, verAprobaciones: true, verEstadisticas: true },
    ot: { ver: true, verAsignadas: true, verTodas: true, crear: true, editar: true, eliminar: false, aprobar: false, verAprobacion: true, asignarPersonal: true, cambiarEstado: true, verCostos: true },
    gastos: { ver: true, verPropios: true, verTodos: true, crear: true, editar: true, eliminar: false, aprobar: false, necesitaAprobacion: true, verMontos: true },
    activos: { ver: true, crear: true, editar: true, eliminar: false, aprobar: false, necesitaAprobacion: true },
    personal: { ver: true, crear: false, editar: true, eliminar: false, gestionarUsuarios: false, verSueldos: false },
    proveedores: { ver: true, crear: true, editar: true, eliminar: false },
    residentes: { ver: true, crear: false, editar: true, eliminar: false, verDatosContacto: true },
    propiedades: { ver: true, crear: false, editar: true, eliminar: false },
    proyectos: { ver: true, crear: false, editar: true, eliminar: false, verPresupuesto: false },
    inspecciones: { ver: true, crear: true, editar: true, eliminar: false },
    catalogos: { ver: true, crear: false, editar: true, eliminar: false },
    centrosCosto: { ver: true, crear: false, editar: false, eliminar: false, verPresupuesto: false },
    reportes: { ver: true, exportar: true, verTodos: true, verFinancieros: false },
    usuarios: { ver: false, crear: false, editar: false, eliminar: false, cambiarRoles: false },
    configuracion: { ver: false, editar: false, gestionarPermisos: false, gestionarBackups: false },
    logs: { ver: false, exportar: false },
    comite: { ver: true, crear: false, editar: false, eliminar: false, verSesiones: true, crearSesiones: false, verActas: true },
    morosidad: { ver: true, crear: false, editar: false, eliminar: false, verEstadosCuenta: true, generarCartas: false, condonar: false, configurarIntereses: false },
    reservas: { ver: true, crear: true, editar: true, eliminar: false, aprobar: true, verTodas: true },
    inventario: { ver: true, crear: false, editar: true, eliminar: false, ajustarStock: false, verMovimientos: true },
    portal: { ver: false, verEstadoCuenta: false, crearSolicitudes: false, hacerReservas: false, verMisOTs: false, pagarEnLinea: false },
    notificaciones: { ver: true, enviar: true, configurar: false, verHistorial: true },
    auditoria: { ver: false, exportar: false, verDetalles: false },
    integraciones: { ver: false, configurar: false, verPagos: false },
    cumplimiento: { ver: true, crear: true, editar: true, eliminar: false, aprobar: false, verDocumentos: true, subirArchivos: true, verHistorial: true },
  },
  
  // ==========================================
  // MANTENCIÓN - Ve OTs asignadas según cargo
  // ==========================================
  mantencion: {
    dashboard: { ver: true, verTodasOTs: false, verAprobaciones: false, verEstadisticas: false },
    ot: { ver: true, verAsignadas: true, verTodas: false, crear: false, editar: true, eliminar: false, aprobar: false, verAprobacion: false, asignarPersonal: false, cambiarEstado: true, verCostos: false },
    gastos: { ver: true, verPropios: true, verTodos: false, crear: true, editar: true, eliminar: false, aprobar: false, necesitaAprobacion: true, verMontos: false },
    activos: { ver: true, crear: false, editar: false, eliminar: false, aprobar: false, necesitaAprobacion: true },
    personal: { ver: false, crear: false, editar: false, eliminar: false, gestionarUsuarios: false, verSueldos: false },
    proveedores: { ver: false, crear: false, editar: false, eliminar: false },
    residentes: { ver: false, crear: false, editar: false, eliminar: false, verDatosContacto: false },
    propiedades: { ver: true, crear: false, editar: false, eliminar: false },
    proyectos: { ver: false, crear: false, editar: false, eliminar: false, verPresupuesto: false },
    inspecciones: { ver: true, crear: false, editar: true, eliminar: false },
    catalogos: { ver: true, crear: false, editar: false, eliminar: false },
    centrosCosto: { ver: false, crear: false, editar: false, eliminar: false, verPresupuesto: false },
    reportes: { ver: true, exportar: false, verTodos: false, verFinancieros: false },
    usuarios: { ver: false, crear: false, editar: false, eliminar: false, cambiarRoles: false },
    configuracion: { ver: false, editar: false, gestionarPermisos: false, gestionarBackups: false },
    logs: { ver: false, exportar: false },
    comite: { ver: false, crear: false, editar: false, eliminar: false, verSesiones: false, crearSesiones: false, verActas: false },
    morosidad: { ver: false, crear: false, editar: false, eliminar: false, verEstadosCuenta: false, generarCartas: false, condonar: false, configurarIntereses: false },
    reservas: { ver: false, crear: false, editar: false, eliminar: false, aprobar: false, verTodas: false },
    inventario: { ver: true, crear: false, editar: false, eliminar: false, ajustarStock: false, verMovimientos: false },
    portal: { ver: false, verEstadoCuenta: false, crearSolicitudes: false, hacerReservas: false, verMisOTs: false, pagarEnLinea: false },
    notificaciones: { ver: true, enviar: false, configurar: false, verHistorial: false },
    auditoria: { ver: false, exportar: false, verDetalles: false },
    integraciones: { ver: false, configurar: false, verPagos: false },
    cumplimiento: { ver: false, crear: false, editar: false, eliminar: false, aprobar: false, verDocumentos: false, subirArchivos: false, verHistorial: false },
  },
  
  // ==========================================
  // LIMPIEZA - Solo ve sus OTs asignadas
  // ==========================================
  limpieza: {
    dashboard: { ver: true, verTodasOTs: false, verAprobaciones: false, verEstadisticas: false },
    ot: { ver: true, verAsignadas: true, verTodas: false, crear: false, editar: false, eliminar: false, aprobar: false, verAprobacion: false, asignarPersonal: false, cambiarEstado: true, verCostos: false },
    gastos: { ver: false, verPropios: false, verTodos: false, crear: false, editar: false, eliminar: false, aprobar: false, necesitaAprobacion: true, verMontos: false },
    activos: { ver: false, crear: false, editar: false, eliminar: false, aprobar: false, necesitaAprobacion: true },
    personal: { ver: false, crear: false, editar: false, eliminar: false, gestionarUsuarios: false, verSueldos: false },
    proveedores: { ver: false, crear: false, editar: false, eliminar: false },
    residentes: { ver: false, crear: false, editar: false, eliminar: false, verDatosContacto: false },
    propiedades: { ver: false, crear: false, editar: false, eliminar: false },
    proyectos: { ver: false, crear: false, editar: false, eliminar: false, verPresupuesto: false },
    inspecciones: { ver: false, crear: false, editar: false, eliminar: false },
    catalogos: { ver: false, crear: false, editar: false, eliminar: false },
    centrosCosto: { ver: false, crear: false, editar: false, eliminar: false, verPresupuesto: false },
    reportes: { ver: false, exportar: false, verTodos: false, verFinancieros: false },
    usuarios: { ver: false, crear: false, editar: false, eliminar: false, cambiarRoles: false },
    configuracion: { ver: false, editar: false, gestionarPermisos: false, gestionarBackups: false },
    logs: { ver: false, exportar: false },
    comite: { ver: false, crear: false, editar: false, eliminar: false, verSesiones: false, crearSesiones: false, verActas: false },
    morosidad: { ver: false, crear: false, editar: false, eliminar: false, verEstadosCuenta: false, generarCartas: false, condonar: false, configurarIntereses: false },
    reservas: { ver: false, crear: false, editar: false, eliminar: false, aprobar: false, verTodas: false },
    inventario: { ver: false, crear: false, editar: false, eliminar: false, ajustarStock: false, verMovimientos: false },
    portal: { ver: false, verEstadoCuenta: false, crearSolicitudes: false, hacerReservas: false, verMisOTs: false, pagarEnLinea: false },
    notificaciones: { ver: false, enviar: false, configurar: false, verHistorial: false },
    auditoria: { ver: false, exportar: false, verDetalles: false },
    integraciones: { ver: false, configurar: false, verPagos: false },
    cumplimiento: { ver: false, crear: false, editar: false, eliminar: false, aprobar: false, verDocumentos: false, subirArchivos: false, verHistorial: false },
  },
  
  // ==========================================
  // COMITÉ - Acceso a reportes y aprobaciones
  // ==========================================
  comite: {
    dashboard: { ver: true, verTodasOTs: true, verAprobaciones: true, verEstadisticas: true },
    ot: { ver: true, verAsignadas: false, verTodas: true, crear: false, editar: false, eliminar: false, aprobar: true, verAprobacion: false, asignarPersonal: false, cambiarEstado: false, verCostos: true },
    gastos: { ver: true, verPropios: false, verTodos: true, crear: false, editar: false, eliminar: false, aprobar: true, necesitaAprobacion: false, verMontos: true },
    activos: { ver: true, crear: false, editar: false, eliminar: false, aprobar: true, necesitaAprobacion: false },
    personal: { ver: true, crear: false, editar: false, eliminar: false, gestionarUsuarios: false, verSueldos: false },
    proveedores: { ver: true, crear: false, editar: false, eliminar: false },
    residentes: { ver: true, crear: false, editar: false, eliminar: false, verDatosContacto: false },
    propiedades: { ver: true, crear: false, editar: false, eliminar: false },
    proyectos: { ver: true, crear: false, editar: false, eliminar: false, verPresupuesto: true },
    inspecciones: { ver: true, crear: false, editar: false, eliminar: false },
    catalogos: { ver: true, crear: false, editar: false, eliminar: false },
    centrosCosto: { ver: true, crear: false, editar: false, eliminar: false, verPresupuesto: true },
    reportes: { ver: true, exportar: true, verTodos: true, verFinancieros: true },
    usuarios: { ver: false, crear: false, editar: false, eliminar: false, cambiarRoles: false },
    configuracion: { ver: false, editar: false, gestionarPermisos: false, gestionarBackups: false },
    logs: { ver: true, exportar: true },
    comite: { ver: true, crear: true, editar: true, eliminar: false, verSesiones: true, crearSesiones: true, verActas: true },
    morosidad: { ver: true, crear: false, editar: false, eliminar: false, verEstadosCuenta: true, generarCartas: false, condonar: true, configurarIntereses: false },
    reservas: { ver: true, crear: false, editar: false, eliminar: false, aprobar: true, verTodas: true },
    inventario: { ver: true, crear: false, editar: false, eliminar: false, ajustarStock: false, verMovimientos: true },
    portal: { ver: false, verEstadoCuenta: false, crearSolicitudes: false, hacerReservas: false, verMisOTs: false, pagarEnLinea: false },
    notificaciones: { ver: true, enviar: false, configurar: false, verHistorial: true },
    auditoria: { ver: true, exportar: true, verDetalles: true },
    integraciones: { ver: true, configurar: false, verPagos: true },
    cumplimiento: { ver: true, crear: false, editar: false, eliminar: false, aprobar: true, verDocumentos: true, subirArchivos: false, verHistorial: true },
  },
  
  // ==========================================
  // AUDITOR - Solo lectura total
  // ==========================================
  auditor: {
    dashboard: { ver: true, verTodasOTs: true, verAprobaciones: true, verEstadisticas: true },
    ot: { ver: true, verAsignadas: true, verTodas: true, crear: false, editar: false, eliminar: false, aprobar: false, verAprobacion: false, asignarPersonal: false, cambiarEstado: false, verCostos: true },
    gastos: { ver: true, verPropios: true, verTodos: true, crear: false, editar: false, eliminar: false, aprobar: false, necesitaAprobacion: false, verMontos: true },
    activos: { ver: true, crear: false, editar: false, eliminar: false, aprobar: false, necesitaAprobacion: false },
    personal: { ver: true, crear: false, editar: false, eliminar: false, gestionarUsuarios: false, verSueldos: true },
    proveedores: { ver: true, crear: false, editar: false, eliminar: false },
    residentes: { ver: true, crear: false, editar: false, eliminar: false, verDatosContacto: true },
    propiedades: { ver: true, crear: false, editar: false, eliminar: false },
    proyectos: { ver: true, crear: false, editar: false, eliminar: false, verPresupuesto: true },
    inspecciones: { ver: true, crear: false, editar: false, eliminar: false },
    catalogos: { ver: true, crear: false, editar: false, eliminar: false },
    centrosCosto: { ver: true, crear: false, editar: false, eliminar: false, verPresupuesto: true },
    reportes: { ver: true, exportar: true, verTodos: true, verFinancieros: true },
    usuarios: { ver: true, crear: false, editar: false, eliminar: false, cambiarRoles: false },
    configuracion: { ver: true, editar: false, gestionarPermisos: false, gestionarBackups: false },
    logs: { ver: true, exportar: true },
    comite: { ver: true, crear: false, editar: false, eliminar: false, verSesiones: true, crearSesiones: false, verActas: true },
    morosidad: { ver: true, crear: false, editar: false, eliminar: false, verEstadosCuenta: true, generarCartas: false, condonar: false, configurarIntereses: false },
    reservas: { ver: true, crear: false, editar: false, eliminar: false, aprobar: false, verTodas: true },
    inventario: { ver: true, crear: false, editar: false, eliminar: false, ajustarStock: false, verMovimientos: true },
    portal: { ver: false, verEstadoCuenta: false, crearSolicitudes: false, hacerReservas: false, verMisOTs: false, pagarEnLinea: false },
    notificaciones: { ver: true, enviar: false, configurar: false, verHistorial: true },
    auditoria: { ver: true, exportar: true, verDetalles: true },
    integraciones: { ver: true, configurar: false, verPagos: true },
    cumplimiento: { ver: true, crear: false, editar: false, eliminar: false, aprobar: false, verDocumentos: true, subirArchivos: false, verHistorial: true },
  },
  
  // ==========================================
  // RESIDENTE - Portal de residentes
  // ==========================================
  residente: {
    dashboard: { ver: false, verTodasOTs: false, verAprobaciones: false, verEstadisticas: false },
    ot: { ver: false, verAsignadas: false, verTodas: false, crear: false, editar: false, eliminar: false, aprobar: false, verAprobacion: false, asignarPersonal: false, cambiarEstado: false, verCostos: false },
    gastos: { ver: false, verPropios: false, verTodos: false, crear: false, editar: false, eliminar: false, aprobar: false, necesitaAprobacion: false, verMontos: false },
    activos: { ver: false, crear: false, editar: false, eliminar: false, aprobar: false, necesitaAprobacion: false },
    personal: { ver: false, crear: false, editar: false, eliminar: false, gestionarUsuarios: false, verSueldos: false },
    proveedores: { ver: false, crear: false, editar: false, eliminar: false },
    residentes: { ver: false, crear: false, editar: false, eliminar: false, verDatosContacto: false },
    propiedades: { ver: false, crear: false, editar: false, eliminar: false },
    proyectos: { ver: false, crear: false, editar: false, eliminar: false, verPresupuesto: false },
    inspecciones: { ver: false, crear: false, editar: false, eliminar: false },
    catalogos: { ver: false, crear: false, editar: false, eliminar: false },
    centrosCosto: { ver: false, crear: false, editar: false, eliminar: false, verPresupuesto: false },
    reportes: { ver: false, exportar: false, verTodos: false, verFinancieros: false },
    usuarios: { ver: false, crear: false, editar: false, eliminar: false, cambiarRoles: false },
    configuracion: { ver: false, editar: false, gestionarPermisos: false, gestionarBackups: false },
    logs: { ver: false, exportar: false },
    comite: { ver: false, crear: false, editar: false, eliminar: false, verSesiones: false, crearSesiones: false, verActas: false },
    morosidad: { ver: false, crear: false, editar: false, eliminar: false, verEstadosCuenta: false, generarCartas: false, condonar: false, configurarIntereses: false },
    reservas: { ver: true, crear: true, editar: true, eliminar: true, aprobar: false, verTodas: false },
    inventario: { ver: false, crear: false, editar: false, eliminar: false, ajustarStock: false, verMovimientos: false },
    portal: { ver: true, verEstadoCuenta: true, crearSolicitudes: true, hacerReservas: true, verMisOTs: true, pagarEnLinea: true },
    notificaciones: { ver: true, enviar: false, configurar: false, verHistorial: true },
    auditoria: { ver: false, exportar: false, verDetalles: false },
    integraciones: { ver: false, configurar: false, verPagos: true },
    cumplimiento: { ver: false, crear: false, editar: false, eliminar: false, aprobar: false, verDocumentos: false, subirArchivos: false, verHistorial: false },
  },
};

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

/**
 * Obtiene los permisos de un rol
 */
export function getPermisos(rol: string): Permisos {
  return PERMISOS_POR_ROL[rol as Rol] || PERMISOS_POR_ROL.limpieza;
}

/**
 * Verifica si un usuario tiene un permiso específico
 */
export function tienePermiso(rol: string, modulo: keyof Permisos, permiso: keyof Permisos[keyof Permisos]): boolean {
  const permisos = getPermisos(rol);
  const moduloPermisos = permisos[modulo];
  if (!moduloPermisos) return false;
  return (moduloPermisos as Record<string, boolean>)[permiso as string] ?? false;
}

/**
 * Verifica si el usuario puede ver una OT específica
 */
export function puedeVerOT(rol: string, otAsignadoId: string | null, usuarioPersonalId: string | null): boolean {
  const permisos = getPermisos(rol);
  
  // Admin puede ver todas
  if (permisos.ot.verTodas) return true;
  
  // Si solo puede ver asignadas, verificar que esté asignada a él
  if (permisos.ot.verAsignadas && !permisos.ot.verTodas) {
    return otAsignadoId === usuarioPersonalId;
  }
  
  return permisos.ot.ver;
}

/**
 * Verifica si el usuario necesita aprobación para crear algo
 */
export function necesitaAprobacion(rol: string, tipo: 'ot' | 'gasto' | 'activo'): boolean {
  const permisos = getPermisos(rol);
  
  switch (tipo) {
    case 'ot':
      return permisos.ot.verAprobacion;
    case 'gasto':
      return permisos.gastos.necesitaAprobacion;
    case 'activo':
      return permisos.activos.necesitaAprobacion;
    default:
      return false;
  }
}

/**
 * Obtiene el menú visible según el rol
 */
export function getMenuPorRol(rol: string): string[] {
  const permisos = getPermisos(rol);
  const menu: string[] = ['dashboard'];
  
  // Módulos principales
  if (permisos.propiedades.ver || permisos.residentes.ver) menu.push('condominio');
  if (permisos.residentes.ver) menu.push('residentes');
  if (permisos.ot.ver) menu.push('ot');
  if (permisos.proyectos.ver) menu.push('proyectos');
  if (permisos.inspecciones.ver) menu.push('inspecciones');
  if (permisos.personal.ver) menu.push('personal');
  if (permisos.activos.ver) menu.push('activos');
  if (permisos.inventario.ver) menu.push('inventario');
  if (permisos.proveedores.ver) menu.push('proveedores');
  if (permisos.gastos.ver) menu.push('gastos');
  if (permisos.centrosCosto.ver) menu.push('centrocostos');
  if (permisos.catalogos.ver) menu.push('catalogos');
  if (permisos.reservas.ver) menu.push('reservas');
  
  // Nuevos módulos
  if (permisos.comite.ver) menu.push('comite');
  if (permisos.morosidad.ver) menu.push('morosidad');
  if (permisos.cumplimiento.ver) menu.push('cumplimiento');
  
  // Reportes y administración
  if (permisos.reportes.ver) menu.push('reportes');
  if (permisos.auditoria.ver) menu.push('auditoria');
  if (permisos.usuarios.ver) menu.push('usuarios');
  if (permisos.configuracion.ver) menu.push('configuracion');
  
  // Portal residente
  if (permisos.portal.ver) menu.push('portal');
  
  return menu;
}

/**
 * Verifica si un rol es de solo lectura
 */
export function esSoloLectura(rol: string): boolean {
  return rol === 'auditor';
}

/**
 * Verifica si un rol es de residente
 */
export function esResidente(rol: string): boolean {
  return rol === 'residente';
}

/**
 * Verifica si un rol es del comité
 */
export function esComite(rol: string): boolean {
  return rol === 'comite';
}

/**
 * Verifica si un rol puede aprobar cosas
 */
export function puedeAprobar(rol: string): boolean {
  const permisos = getPermisos(rol);
  return permisos.ot.aprobar || permisos.gastos.aprobar || permisos.activos.aprobar;
}
