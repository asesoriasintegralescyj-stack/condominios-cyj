/**
 * Workera API Client v8.0 (Desktop)
 * ==================================
 * Credentials are stored in localStorage and sent with each request
 * to the Edge Proxy, which forwards them to Workera API.
 *
 * Per Manual API Workera v1.4:
 *   Base URL: https://workera.com/apiClient/v1/{endpoint}
 *   Auth: API_USER + API_KEY headers
 */

const PROXY_URL = '/api/workera/proxy';
const TIMEOUT_MS = 20000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;

// ── Credentials management ──
const CREDS_KEY = 'workera_credentials';

export interface WorkeraCredentials {
  apiUser: string;
  apiKey: string;
}

export function getCredentials(): WorkeraCredentials | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(CREDS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

export function setCredentials(creds: WorkeraCredentials): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(CREDS_KEY, JSON.stringify(creds));
  }
}

export function hasCredentials(): boolean {
  const c = getCredentials();
  return !!(c && c.apiUser && c.apiKey);
}

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

/**
 * Build headers with credentials from localStorage
 */
function buildHeaders(): Record<string, string> {
  const creds = getCredentials();
  const headers: Record<string, string> = {};
  if (creds?.apiUser) headers['X-Api-User'] = creds.apiUser;
  if (creds?.apiKey) headers['X-Api-Key'] = creds.apiKey;
  return headers;
}

// ── API Object ──
export const workeraApi = {
  /**
   * Obtener sucursales (branch offices)
   * GET /api/workera/proxy?endpoint=branchOffice&page=1
   */
  async getBranchOffices(page: number = 1): Promise<{ data: WorkeraBranchOffice[]; page: number; totalPages: number; totalResult: number }> {
    const credsHeaders = buildHeaders();
    const qp = new URLSearchParams({ endpoint: 'branchOffice', page: String(page) });
    Object.entries(credsHeaders).forEach(([k, v]) => qp.set(k, v));

    const resp = await proxyFetch(`${PROXY_URL}?${qp.toString()}`, { method: 'GET' });
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
    const credsHeaders = buildHeaders();
    const queryParams = new URLSearchParams();
    queryParams.set('endpoint', 'employee');
    queryParams.set('page', String(params.page || 1));
    if (params.employees) queryParams.set('employees', params.employees);
    if (params.branchOffice) queryParams.set('branchOffice', params.branchOffice);
    Object.entries(credsHeaders).forEach(([k, v]) => queryParams.set(k, v));

    const resp = await proxyFetch(`${PROXY_URL}?${queryParams.toString()}`, { method: 'GET' });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(err.error || `Error ${resp.status}`);
    }
    return resp.json();
  },

  /**
   * Obtener registros de asistencia
   * GET /api/workera/proxy?endpoint=attendanceData&page=1&start=dateFrom&end=dateTo&employees=code
   * Per Manual v1.4: start/end required, employee filter is 'employees' param
   */
  async getAttendance(params: {
    page?: number;
    start?: string;
    end?: string;
    employees?: string;
    branchOffice?: string;
    department?: string;
  } = {}): Promise<PaginatedResponse<WorkeraAttendanceRecord>> {
    const credsHeaders = buildHeaders();
    const queryParams = new URLSearchParams();
    queryParams.set('endpoint', 'attendanceData');
    queryParams.set('page', String(params.page || 1));
    if (params.start) queryParams.set('start', params.start);
    if (params.end) queryParams.set('end', params.end);
    if (params.employees) queryParams.set('employees', params.employees);
    if (params.branchOffice) queryParams.set('branchOffice', params.branchOffice);
    if (params.department) queryParams.set('department', params.department);
    Object.entries(credsHeaders).forEach(([k, v]) => queryParams.set(k, v));

    const resp = await proxyFetch(`${PROXY_URL}?${queryParams.toString()}`, { method: 'GET' });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: 'Error desconocido' }));
      throw new Error(err.error || `Error ${resp.status}`);
    }
    return resp.json();
  },
};
