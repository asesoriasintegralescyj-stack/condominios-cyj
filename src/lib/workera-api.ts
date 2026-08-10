/**
 * Cliente API Workera v1.4 CL
 * --------------------------
 * Servicio para interactuar con la API REST de Workera Chile.
 * 
 * ARQUITECTURA TRIPLE (cascada automática):
 * 
 * 1. Modo Cloudflare Worker (RECOMENDADO):
 *    - Petición desde navegador → Worker de Cloudflare en Santiago (Chile)
 *    - El Worker hace fetch a Workera desde IP chilena
 *    - SIN geo-block, SIN problemas de CORS
 *    - Requiere: Worker deployado en Cloudflare con secrets WORKERA_API_USER/KEY
 * 
 * 2. Modo Proxy Servidor (Edge Function):
 *    - Petición desde navegador → Edge Function en Vercel
 *    - LIMITACIÓN: Workera bloquea desde servidores no chilenos
 * 
 * 3. Modo Directo + CORS Proxy (fallback):
 *    - Petición desde navegador → CORS proxy público → Workera
 *    - LIMITACIÓN: CORS proxies públicos son poco confiables
 */

// ============================================================
// TIPOS
// ============================================================

export interface WorkeraRequestInfo {
  companyName: string;
  companyIdentification: string;
  companyNickname: string;
  userEmail: string;
}

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

export const ATTENDANCE_TYPE_LABELS: Record<number, string> = {
  0: 'Entrada',
  1: 'Salida',
  2: 'Salida Extraordinaria',
  3: 'Entrada Extraordinaria',
  4: 'Inicio Descanso',
  5: 'Termino Descanso',
};

export const ORIGIN_LABELS: Record<string, string> = {
  RELOJ: 'Reloj Biometrico',
  MOVIL: 'App Movil',
  SISTEMA: 'Sistema',
  PORTAL: 'Portal Trabajador',
  DESKTOP: 'App Escritorio',
};

// ============================================================
// ESTADO DE CONEXIÓN
// ============================================================

export type ConnectionMode = 'cloudflare' | 'proxy' | 'direct';

let _connectionMode: ConnectionMode = 'cloudflare';
let _apiUser = '';
let _apiKey = '';

// URL del Worker de Cloudflare (configurar después de deployar)
const CLOUDFLARE_WORKER_URL = process.env.NEXT_PUBLIC_WORKERA_PROXY_URL || '';

export function setConnectionMode(mode: ConnectionMode, apiUser?: string, apiKey?: string) {
  _connectionMode = mode;
  if (apiUser) _apiUser = apiUser;
  if (apiKey) _apiKey = apiKey;
}

export function getConnectionMode(): ConnectionMode {
  return _connectionMode;
}

export function hasCloudflareWorker(): boolean {
  return !!CLOUDFLARE_WORKER_URL;
}

// ============================================================
// FETCH POR MODO
// ============================================================

const WORKERA_BASE_URL = 'https://api.workera.com/apiClient/v1';

function buildUrl(endpoint: string, params?: Record<string, string | undefined>): string {
  const url = new URL(`${WORKERA_BASE_URL}/${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.append(k, v);
      }
    });
  }
  return url.toString();
}

function buildParamsUrl(baseUrl: string, endpoint: string, params?: Record<string, string | undefined>): string {
  const url = new URL(baseUrl);
  url.searchParams.set('endpoint', endpoint);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, v);
      }
    });
  }
  return url.toString();
}

/**
 * Modo 1: Cloudflare Worker (corre en Santiago, Chile)
 */
async function workeraFetchCloudflare(endpoint: string, params?: Record<string, string | undefined>): Promise<any> {
  if (!CLOUDFLARE_WORKER_URL) {
    throw new Error('Cloudflare Worker no configurado');
  }

  const url = buildParamsUrl(CLOUDFLARE_WORKER_URL, endpoint, params);

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });

  const data = await response.json();
  if (!response.ok) {
    const err = data.error || `Error Cloudflare Worker ${response.status}`;
    const error: any = new Error(err);
    error.geoBlocked = data.geoBlocked === true;
    throw error;
  }

  return data;
}

/**
 * Modo 2: Proxy Servidor (Edge Function en Vercel)
 */
async function workeraFetchProxy(endpoint: string, params?: Record<string, string | undefined>): Promise<any> {
  const url = buildParamsUrl('/api/workera/proxy', endpoint, params);

  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
  });

  const data = await response.json();
  if (!response.ok) {
    const err = data.error || `Error proxy ${response.status}`;
    const error: any = new Error(err);
    error.geoBlocked = data.geoBlocked === true;
    throw error;
  }

  return data;
}

/**
 * Modo 3: Directo desde navegador (fallback con CORS proxy)
 */
async function workeraFetchDirect(endpoint: string, params?: Record<string, string | undefined>): Promise<any> {
  if (!_apiUser || !_apiKey) {
    throw new Error('Credenciales no configuradas para modo directo');
  }

  const workeraUrl = buildUrl(endpoint, params);

  // Intentar llamada directa (Workera podría tener CORS habilitado en el futuro)
  try {
    const response = await fetch(workeraUrl, {
      method: 'GET',
      headers: {
        'API_USER': _apiUser,
        'API_KEY': _apiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    if (response.ok) return response.json();
  } catch {
    // CORS bloqueó, intentar con proxy
  }

  // Si no hay Worker de Cloudflare, no hay CORS proxy funcional
  throw new Error(
    'Workera bloquea peticiones desde servidores extranjeros (proxy) y ' +
    'no tiene CORS habilitado para llamadas desde el navegador (directo). ' +
    'Se necesita el Cloudflare Worker desplegado para conectar desde Chile.'
  );
}

/**
 * Fetch principal: intenta cada modo en cascada
 */
async function workeraFetch(endpoint: string, params?: Record<string, string | undefined>): Promise<any> {
  switch (_connectionMode) {
    case 'cloudflare':
      return workeraFetchCloudflare(endpoint, params);
    case 'proxy':
      return workeraFetchProxy(endpoint, params);
    case 'direct':
      return workeraFetchDirect(endpoint, params);
    default:
      return workeraFetchProxy(endpoint, params);
  }
}

/**
 * Obtiene todas las páginas de un endpoint paginado
 */
async function fetchAllPages<T>(endpoint: string, params?: Record<string, string | undefined>): Promise<T[]> {
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
// API PÚBLICA
// ============================================================

export const workeraApi = {
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

  async getPermissionTypes(): Promise<WorkeraPermissionType[]> {
    return workeraFetch('permissionTypes');
  },

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

  async getBranchOffices(page?: number): Promise<WorkeraBranchResponse> {
    return workeraFetch('branchOffice', { page: String(page || 1) });
  },

  async getAllBranchOffices(): Promise<WorkeraBranchOffice[]> {
    return fetchAllPages<WorkeraBranchOffice>('branchOffice');
  },

  async getDepartments(page?: number): Promise<WorkeraDepartmentResponse> {
    return workeraFetch('department', { page: String(page || 1) });
  },

  async getAllDepartments(): Promise<WorkeraDepartment[]> {
    return fetchAllPages<WorkeraDepartment>('department');
  },
};
// trigger deploy
