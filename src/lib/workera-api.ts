/**
 * Cliente API Workera v1.4 CL
 * --------------------------
 * Servicio para interactuar con la API REST de Workera Chile.
 * 
 * ARQUITECTURA DUAL:
 * 1. Modo Proxy: Las llamadas pasan por /api/workera/proxy (Edge Function).
 *    - Ventaja: No expone credenciales en el navegador
 *    - Limitación: Workera bloquea peticiones desde servidores no chilenos
 * 
 * 2. Modo Directo (fallback): Si el proxy detecta geo-block, las llamadas
 *    se hacen directamente desde el navegador del usuario (que está en Chile).
 *    - Requiere credenciales en el navegador
 *    - Usa un CORS proxy externo para evitar bloqueo CORS del navegador
 * 
 * El sistema detecta automáticamente cuál modo usar y se cambia dinámicamente.
 */

// Tipos de respuesta
export interface WorkeraRequestInfo {
  companyName: string;
  companyIdentification: string;
  companyNickname: string;
  userEmail: string;
}

// --- Empleados ---
export interface WorkeraEmployee {
  code: string;
  deviceCode: number;
  identification: string;
  name: string;
  secondName?: string;
  lastName: string;
  secondLastName?: string;
  branchOfficeCode: string;
  branchOfficeName: string;
  departmentCode: string;
  departmentName: string;
  employeeStatus: string;
  genre?: string;
  birthDate?: string;
  civilStatus?: string;
  address?: string;
  personalPhone?: number;
  personalMail?: string;
  corporateMail?: string;
  corporatePhone?: number;
  favorite?: boolean;
  comment?: string;
}

export interface WorkeraEmployeeResponse {
  page: number;
  totalPages: number;
  pageResult: number;
  totalResult: number;
  requestInfo: WorkeraRequestInfo;
  data: WorkeraEmployee[];
}

// --- Asistencia ---
export type AttendanceType = 0 | 1 | 2 | 3 | 4 | 5;
export type AttendanceStatus = 'ACTIVO' | 'INACTIVO' | 'MODIFICADO';
export type OriginCode = 'RELOJ' | 'MOVIL' | 'SISTEMA' | 'PORTAL' | 'DESKTOP';

export interface WorkeraEmployeeMini {
  code: number;
  deviceCode: number;
  identification: string;
  name: string;
  lastName: string;
  branchOffice: string;
  department: string;
  employeeStatus: string;
  companyIdentification: string;
  companyName: string;
}

export interface WorkeraAttendanceRecord {
  employee: WorkeraEmployeeMini;
  attendanceDate: string;
  attendanceType: AttendanceType;
  attendanceStatus: AttendanceStatus;
  origin: string;
  originCode: OriginCode;
  address?: string;
  deviceName?: string;
  checksum?: string;
  isMobile: boolean;
  coordinatesMobile?: string;
  precision?: number;
}

export interface WorkeraAttendanceResponse {
  page: number;
  totalPages: number;
  pageResult: number;
  totalResult: number;
  requestInfo: WorkeraRequestInfo;
  data: WorkeraAttendanceRecord[];
}

// --- Turnos ---
export interface WorkeraWorkshiftAssign {
  id: number;
  employee: WorkeraEmployeeMini;
  start: string;
  end: string;
  workshiftCode: string;
  workshiftName: string;
  flexible: boolean;
  period: string;
  extension: number;
}

export interface WorkeraWorkshiftAssignResponse {
  page: number;
  totalPages: number;
  pageResult: number;
  totalResult: number;
  requestInfo: WorkeraRequestInfo;
  data: WorkeraWorkshiftAssign[];
}

export interface WorkeraSchedule {
  workshiftCode: string;
  date: string;
  workshiftName: string;
  workshiftStart: string;
  workshiftEnd: string;
  scheduleName: string;
  start: string;
  end: string;
}

export interface WorkeraEmployeeSchedule {
  employee: WorkeraEmployeeMini;
  schedules: WorkeraSchedule[];
}

export interface WorkeraSchedulesResponse {
  page: number;
  totalPages: number;
  pageResult: number;
  totalResult: number;
  requestInfo: WorkeraRequestInfo;
  data: WorkeraEmployeeSchedule[];
}

// --- Permisos ---
export type PermissionType = 'TRABAJADOR' | 'TRABAJADO_EN_HORARIO' | 'NO_TRABAJADO' | 'LICENCIA_MEDICA' | 'VACACIONES' | 'PRENATAL' | 'POSTNATAL';

export interface WorkeraPermission {
  id: number;
  employee: WorkeraEmployeeMini;
  start: string;
  end: string;
  permissionCode: string;
  permissionName: string;
  permissionType: PermissionType;
  comment?: string;
}

export interface WorkeraPermissionResponse {
  page: number;
  totalPages: number;
  pageResult: number;
  totalResult: number;
  requestInfo: WorkeraRequestInfo;
  data: WorkeraPermission[];
}

export interface WorkeraPermissionType {
  code: string;
  name: string;
  description?: string;
}

// --- Horas Extras ---
export interface WorkeraOvertimeAuth {
  employee: WorkeraEmployeeMini;
  authDate: string;
  scheduleInAuthTime: number;
  scheduleOutAuthTime: number;
  withoutScheduleAuthTime: number;
  holidayExtraAuthTime: number;
  comment?: string;
  assigned: boolean;
}

export interface WorkeraOvertimeResponse {
  page: number;
  totalPages: number;
  pageResult: number;
  totalResult: number;
  requestInfo: WorkeraRequestInfo;
  data: WorkeraOvertimeAuth[];
}

// --- Sucursales ---
export interface WorkeraBranchOffice {
  id: number;
  name: string;
  code: string;
  description?: string;
  address?: string;
  timezoneId?: number;
  timezoneName?: string;
  status: string;
  defaultBranchoffice: boolean;
  employeesCount: number;
}

export interface WorkeraBranchResponse {
  page: number;
  totalPages: number;
  pageResult: number;
  totalResult: number;
  requestInfo: WorkeraRequestInfo;
  data: WorkeraBranchOffice[];
}

// --- Departamentos ---
export interface WorkeraDepartment {
  id: number;
  name: string;
  code: string;
  description?: string;
  status: string;
  defaultDepartment: boolean;
  employeesCount: number;
}

export interface WorkeraDepartmentResponse {
  page: number;
  totalPages: number;
  pageResult: number;
  totalResult: number;
  requestInfo: WorkeraRequestInfo;
  data: WorkeraDepartment[];
}

// --- Tipos de asistencia ---
export const ATTENDANCE_TYPE_LABELS: Record<number, string> = {
  0: 'Entrada',
  1: 'Salida',
  2: 'Salida Extraordinaria',
  3: 'Entrada Extraordinaria',
  4: 'Inicio Descanso',
  5: 'Término Descanso',
};

export const ORIGIN_LABELS: Record<string, string> = {
  RELOJ: 'Reloj Biométrico',
  MOVIL: 'App Móvil',
  SISTEMA: 'Sistema',
  PORTAL: 'Portal Trabajador',
  DESKTOP: 'App Escritorio',
};

// ============================================================
// Estado global del modo de conexión
// ============================================================

let _useDirectMode = false;
let _apiUser = '';
let _apiKey = '';

export type ConnectionMode = 'proxy' | 'direct';

/**
 * Configura el modo de conexión. Llamar después de detectar geo-block.
 */
export function setConnectionMode(mode: ConnectionMode, apiUser?: string, apiKey?: string) {
  _useDirectMode = mode === 'direct';
  if (apiUser) _apiUser = apiUser;
  if (apiKey) _apiKey = apiKey;
}

export function getConnectionMode(): ConnectionMode {
  return _useDirectMode ? 'direct' : 'proxy';
}

// ============================================================
// Funciones de fetch (dual mode)
// ============================================================

const WORKERA_BASE_URL = 'https://api.workera.com/apiClient/v1';
const PROXY_URL = '/api/workera/proxy';
// CORS proxy público (confiable para uso temporal)
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

async function workeraFetchProxy(
  endpoint: string,
  params?: Record<string, string | undefined>
): Promise<any> {
  const url = new URL(PROXY_URL, window.location.origin);
  url.searchParams.set('endpoint', endpoint);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, v);
      }
    });
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });

  const data = await response.json();
  if (!response.ok) {
    const err = data.error || `Error proxy ${response.status}`;
    const geoBlocked = data.geoBlocked === true || 
                       err.includes('Country request') || 
                       err.includes('406');
    const error = new Error(err) as any;
    error.geoBlocked = geoBlocked;
    throw error;
  }

  return data;
}

async function workeraFetchDirect(
  endpoint: string,
  params?: Record<string, string | undefined>
): Promise<any> {
  if (!_apiUser || !_apiKey) {
    throw new Error('Credenciales de Workera no configuradas para modo directo');
  }

  // Construir URL de Workera
  const workeraUrl = new URL(`${WORKERA_BASE_URL}/${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        workeraUrl.searchParams.append(k, v);
      }
    });
  }

  // Intentar llamada directa primero (puede funcionar si Workera tiene CORS)
  try {
    const response = await fetch(workeraUrl.toString(), {
      method: 'GET',
      headers: {
        'API_USER': _apiUser,
        'API_KEY': _apiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      return response.json();
    }
  } catch {
    // CORS bloqueó la llamada directa, intentar con CORS proxy
  }

  // Fallback: usar CORS proxy público
  // Esto codifica la URL de Workera y la pasa por el CORS proxy
  const proxyUrl = `${CORS_PROXY}${encodeURIComponent(workeraUrl.toString())}`;
  
  const proxyResponse = await fetch(proxyUrl, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });

  if (!proxyResponse.ok) {
    throw new Error(`Error al obtener datos de Workera via CORS proxy: ${proxyResponse.status}`);
  }

  return proxyResponse.json();
}

/**
 * Función principal de fetch - detecta modo automáticamente
 */
async function workeraFetch(
  endpoint: string,
  params?: Record<string, string | undefined>
): Promise<any> {
  if (_useDirectMode) {
    return workeraFetchDirect(endpoint, params);
  }
  return workeraFetchProxy(endpoint, params);
}

/**
 * Obtiene todas las páginas de un endpoint paginado
 */
async function fetchAllPages<T>(
  endpoint: string,
  params?: Record<string, string | undefined>
): Promise<T[]> {
  const firstPage = await workeraFetch(endpoint, { ...params, page: '1' });
  const totalPages = firstPage.totalPages || 1;
  
  if (totalPages <= 1) return firstPage.data || [];

  const allData: T[] = [...(firstPage.data || [])];
  const pages: number[] = [];
  for (let i = 2; i <= totalPages; i++) pages.push(i);

  for (let i = 0; i < pages.length; i += 5) {
    const batch = pages.slice(i, i + 5);
    const results = await Promise.all(
      batch.map(p => workeraFetch(endpoint, { ...params, page: String(p) }))
    );
    for (const result of results) {
      if (result.data) allData.push(...result.data);
    }
  }

  return allData;
}

// ============================================================
// API Pública
// ============================================================

export const workeraApi = {
  // Empleados
  async getEmployees(params?: {
    branchOffice?: string;
    department?: string;
    employees?: string;
    page?: number;
  }): Promise<WorkeraEmployeeResponse> {
    return workeraFetch('employee', {
      branchOffice: params?.branchOffice,
      department: params?.department,
      employees: params?.employees,
      page: params?.page ? String(params.page) : '1',
    });
  },

  async getAllEmployees(): Promise<WorkeraEmployee[]> {
    return fetchAllPages<WorkeraEmployee>('employee');
  },

  // Asistencia
  async getAttendance(params: {
    start: string;
    end: string;
    page?: number;
    employeeCode?: string;
    branchOfficeCode?: string;
    departmentCode?: string;
    attTypes?: string;
    originCode?: string;
  }): Promise<WorkeraAttendanceResponse> {
    return workeraFetch('attendanceData', {
      start: params.start,
      end: params.end,
      page: String(params.page || 1),
      employeeCode: params.employeeCode,
      branchOfficeCode: params.branchOfficeCode,
      departmentCode: params.departmentCode,
      attTypes: params.attTypes,
      originCode: params.originCode,
    });
  },

  async getAllAttendance(params: {
    start: string;
    end: string;
    employeeCode?: string;
    branchOfficeCode?: string;
    departmentCode?: string;
    attTypes?: string;
    originCode?: string;
  }): Promise<WorkeraAttendanceRecord[]> {
    return fetchAllPages<WorkeraAttendanceRecord>('attendanceData', params);
  },

  // Turnos asignados
  async getWorkshiftAssigns(params: {
    start: string;
    end: string;
    page?: number;
    branchOffice?: string;
    department?: string;
    employees?: string;
  }): Promise<WorkeraWorkshiftAssignResponse> {
    return workeraFetch('workshift/assign', {
      start: params.start,
      end: params.end,
      page: String(params.page || 1),
      branchOffice: params.branchOffice,
      department: params.department,
      employees: params.employees,
    });
  },

  // Horarios
  async getSchedules(params: {
    start: string;
    end: string;
    page?: number;
    branchOffice?: string;
    department?: string;
    employees?: string;
  }): Promise<WorkeraSchedulesResponse> {
    return workeraFetch('workshift/schedules', {
      start: params.start,
      end: params.end,
      page: String(params.page || 1),
      branchOffice: params.branchOffice,
      department: params.department,
      employees: params.employees,
    });
  },

  async getAllSchedules(params: {
    start: string;
    end: string;
    branchOffice?: string;
    department?: string;
    employees?: string;
  }): Promise<WorkeraEmployeeSchedule[]> {
    return fetchAllPages<WorkeraEmployeeSchedule>('workshift/schedules', params);
  },

  // Permisos
  async getPermissions(params: {
    start: string;
    end: string;
    page?: number;
    branchOffice?: string;
    department?: string;
    employees?: string;
  }): Promise<WorkeraPermissionResponse> {
    return workeraFetch('permission', {
      start: params.start,
      end: params.end,
      page: String(params.page || 1),
      branchOffice: params.branchOffice,
      department: params.department,
      employees: params.employees,
    });
  },

  async getAllPermissions(params: {
    start: string;
    end: string;
    branchOffice?: string;
    department?: string;
    employees?: string;
  }): Promise<WorkeraPermission[]> {
    return fetchAllPages<WorkeraPermission>('permission', params);
  },

  // Tipos de permisos
  async getPermissionTypes(): Promise<WorkeraPermissionType[]> {
    return workeraFetch('permissionTypes');
  },

  // Horas Extras
  async getOvertimeAuthorizations(params: {
    start: string;
    end: string;
    page?: number;
    branchOffice?: string;
    department?: string;
    employees?: string;
  }): Promise<WorkeraOvertimeResponse> {
    return workeraFetch('overtimeAuthorization', {
      start: params.start,
      end: params.end,
      page: String(params.page || 1),
      branchOffice: params.branchOffice,
      department: params.department,
      employees: params.employees,
    });
  },

  async getAllOvertimeAuthorizations(params: {
    start: string;
    end: string;
    branchOffice?: string;
    department?: string;
    employees?: string;
  }): Promise<WorkeraOvertimeAuth[]> {
    return fetchAllPages<WorkeraOvertimeAuth>('overtimeAuthorization', params);
  },

  // Sucursales
  async getBranchOffices(page?: number): Promise<WorkeraBranchResponse> {
    return workeraFetch('branchOffice', { page: String(page || 1) });
  },

  async getAllBranchOffices(): Promise<WorkeraBranchOffice[]> {
    return fetchAllPages<WorkeraBranchOffice>('branchOffice');
  },

  // Departamentos
  async getDepartments(page?: number): Promise<WorkeraDepartmentResponse> {
    return workeraFetch('department', { page: String(page || 1) });
  },

  async getAllDepartments(): Promise<WorkeraDepartment[]> {
    return fetchAllPages<WorkeraDepartment>('department');
  },
};
