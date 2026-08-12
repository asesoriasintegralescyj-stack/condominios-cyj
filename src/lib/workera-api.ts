/**
 * Workera API Client v7.0 (Desktop)
 * ==================================
 * Cliente para WorkeraTab del escritorio.
 * Todas las peticiones pasan por el Edge Proxy (/api/workera/proxy)
 * que se ejecuta desde Chile para evitar el geo-block de Workera.
 *
 * Exporta:
 * - workeraApi (objeto con metodos getBranchOffices, getEmployees, getAttendance)
 * - setConnectionMode / getConnectionMode
 * - ConnectionMode type
 * - WorkeraEmployee, WorkeraAttendanceRecord, WorkeraBranchOffice types
 * - ATTENDANCE_TYPE_LABELS, ORIGIN_LABELS
 */

const PROXY_URL = '/api/workera/proxy';
const TIMEOUT_MS = 20000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

// ── Connection mode ──
export type ConnectionMode = 'proxy' | 'direct';

let currentMode: ConnectionMode = 'proxy';

export function setConnectionMode(mode: ConnectionMode): void {
  currentMode = mode;
  if (typeof window !== 'undefined') {
    localStorage.setItem('workera_mode', mode);
  }
}

export function getConnectionMode(): ConnectionMode {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('workera_mode');
    if (stored === 'proxy' || stored === 'direct') return stored;
  }
  return currentMode;
}

// ── Types ──
export interface WorkeraEmployee {
  code: string;
  name: string;
  lastName: string;
  identification: string;
  corporateMail?: string;
  branchOfficeName?: string;
  branchOfficeCode?: string;
  employeeStatus: string;
  positionName?: string;
  departmentName?: string;
  costCenterName?: string;
  contractType?: string;
  [key: string]: any;
}

export interface WorkeraBranchOffice {
  code: string;
  name: string;
  [key: string]: any;
}

export interface WorkeraAttendanceRecord {
  id: number;
  attendanceDate: string;
  attendanceType: number;
  attendanceStatus: string;
  origin: string;
  originCode?: string;
  employee: {
    code: string;
    name: string;
    lastName: string;
    identification?: string;
  } | null;
  branchOffice?: {
    code: string;
    name: string;
  } | null;
  checkIn?: string;
  checkOut?: string;
  [key: string]: any;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  totalPages: number;
  totalResult: number;
  [key: string]: any;
}

// ── Labels ──
export const ATTENDANCE_TYPE_LABELS: Record<number, string> = {
  0: 'Normal',
  1: 'Atraso',
  2: 'Salida temprana',
  3: 'Ausencia',
  4: 'Falta justificada',
  5: 'Permiso',
  6: 'Vacaciones',
  7: 'Feriado',
  8: 'Colación',
  9: 'Horas extra',
};

export const ORIGIN_LABELS: Record<string, string> = {
  MANUAL: 'Manual',
  QR: 'QR',
  BIOMETRIC: 'Biométrico',
  RFID: 'RFID',
  WEB: 'Web',
  MOBILE: 'App Móvil',
};

// ── Fetch helper ──
async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function proxyFetch(url: string, options: RequestInit): Promise<Response> {
  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      const resp = await fetchWithTimeout(url, options);
      if (!resp.ok && (resp.status >= 500 || resp.status === 502 || resp.status === 408)) {
        if (attempt <= MAX_RETRIES) {
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
          continue;
        }
      }
      return resp;
    } catch (error: any) {
      if (error.name === 'AbortError' && attempt <= MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Maximos reintentos alcanzados');
}

// ── API Object ──
export const workeraApi = {
  /**
   * Obtener sucursales (branch offices)
   * GET /api/workera/proxy?endpoint=branchOffice&page=1
   */
  async getBranchOffices(page: number = 1): Promise<{ data: WorkeraBranchOffice[]; page: number; totalPages: number; totalResult: number }> {
    const resp = await proxyFetch(`${PROXY_URL}?endpoint=branchOffice&page=${page}`, {
      method: 'GET',
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(err.error || `Error ${resp.status}`);
    }

    return resp.json();
  },

  /**
   * Obtener empleados con filtros
   * GET /api/workera/proxy?endpoint=employee&page=1&employees=searchTerm&branchOffice=code
   */
  async getEmployees(params: {
    page?: number;
    employees?: string;
    branchOffice?: string;
  } = {}): Promise<PaginatedResponse<WorkeraEmployee>> {
    const queryParams = new URLSearchParams();
    queryParams.set('page', String(params.page || 1));
    if (params.employees) queryParams.set('employees', params.employees);
    if (params.branchOffice) queryParams.set('branchOffice', params.branchOffice);

    const resp = await proxyFetch(`${PROXY_URL}?endpoint=employee&${queryParams.toString()}`, {
      method: 'GET',
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(err.error || `Error ${resp.status}`);
    }

    return resp.json();
  },

  /**
   * Obtener registros de asistencia
   * GET /api/workera/proxy?endpoint=attendance&page=1&start=dateFrom&end=dateTo&employeeCode=code
   */
  async getAttendance(params: {
    page?: number;
    start?: string;
    end?: string;
    employeeCode?: string;
    branchOfficeCode?: string;
  } = {}): Promise<PaginatedResponse<WorkeraAttendanceRecord>> {
    const queryParams = new URLSearchParams();
    queryParams.set('page', String(params.page || 1));
    if (params.start) queryParams.set('start', params.start);
    if (params.end) queryParams.set('end', params.end);
    if (params.employeeCode) queryParams.set('employeeCode', params.employeeCode);
    if (params.branchOfficeCode) queryParams.set('branchOfficeCode', params.branchOfficeCode);

    const resp = await proxyFetch(`${PROXY_URL}?endpoint=attendance&${queryParams.toString()}`, {
      method: 'GET',
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(err.error || `Error ${resp.status}`);
    }

    return resp.json();
  },
};
