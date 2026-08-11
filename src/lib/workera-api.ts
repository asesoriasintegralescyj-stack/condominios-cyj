/**
 * Workera API Client v6.0 (Desktop)
 * ==================================
 * Cliente para comunicarse con el proxy Edge de Workera.
 *
 * Workera tiene geo-bloqueo: solo acepta peticiones desde Chile.
 * El proxy Edge Function se ejecuta desde el PoP mas cercano al usuario.
 *
 * - Timeout de 20s en requests al proxy
 * - Retry con exponential backoff (2 intentos) solo para errores 5xx/timeout
 * - Cache de conexion status (5s cooldown)
 */

const API_URL = '/api/workera/proxy';
const CLIENT_TIMEOUT_MS = 20000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;
const STATUS_COOLDOWN_MS = 5000;

export interface WorkeraEmployee {
  id: number;
  completeName: string;
  rut: string;
  position: string;
  branchOffice: string;
  department: string;
  costCenter: string;
  status: string;
  contractStatus: string;
  email?: string;
}

export interface WorkeraEmployeeFilterResponse {
  data: WorkeraEmployee[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface WorkeraBranchOffice {
  id: number;
  name: string;
}

export interface WorkeraAttendanceRecord {
  id: number;
  employeeId: number;
  employeeName: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: string;
  [key: string]: any;
}

export interface WorkeraConnectionStatus {
  connected: boolean;
  mode: string;
  location?: string;
  authClient?: string;
  hasRoles?: boolean;
  roles?: string[];
  error?: string;
}

let lastStatusCheck: { time: number; result: WorkeraConnectionStatus } | null = null;

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = CLIENT_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { ...options, signal: controller.signal });
    return resp;
  } finally {
    clearTimeout(timer);
  }
}

export async function testConnection(): Promise<WorkeraConnectionStatus> {
  if (lastStatusCheck && Date.now() - lastStatusCheck.time < STATUS_COOLDOWN_MS) {
    return lastStatusCheck.result;
  }

  try {
    const resp = await fetchWithTimeout(`${API_URL}?action=diag`);

    if (!resp.ok) {
      const status: WorkeraConnectionStatus = {
        connected: false,
        mode: 'vercel-edge',
        error: `HTTP ${resp.status} - El servidor del proxy no responde`,
      };
      lastStatusCheck = { time: Date.now(), result: status };
      return status;
    }

    const data = await resp.json();

    if (data.success === false && data.error) {
      const status: WorkeraConnectionStatus = {
        connected: false,
        mode: 'vercel-edge',
        error: `Auth fallo: ${data.error}`,
      };
      lastStatusCheck = { time: Date.now(), result: status };
      return status;
    }

    const status: WorkeraConnectionStatus = {
      connected: data.success || false,
      mode: 'vercel-edge',
      location: data.location || 'CL',
      authClient: data.authClient || 'none',
      hasRoles: data.hasRoles || false,
      roles: data.roles || [],
      error: data.error,
    };
    lastStatusCheck = { time: Date.now(), result: status };
    return status;
  } catch (error: any) {
    const msg = error.name === 'AbortError'
      ? 'Timeout: el proxy no responde en 20s. Posible geo-bloque.'
      : `Error de red: ${error.message}`;
    const status: WorkeraConnectionStatus = {
      connected: false,
      mode: 'vercel-edge',
      error: msg,
    };
    lastStatusCheck = { time: Date.now(), result: status };
    return status;
  }
}

async function workeraFetch(
  url: string,
  options: RequestInit,
  retries: number = MAX_RETRIES,
): Promise<Response> {
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const resp = await fetchWithTimeout(url, options);

      if (!resp.ok && (resp.status >= 500 || resp.status === 502 || resp.status === 408)) {
        if (attempt <= retries) {
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
          lastStatusCheck = null;
          continue;
        }
      }

      return resp;
    } catch (error: any) {
      if (error.name === 'AbortError' && attempt <= retries) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
        lastStatusCheck = null;
        continue;
      }
      throw error;
    }
  }

  throw new Error('Maximos reintentos alcanzados');
}

export async function fetchEmployees(
  page: number = 1,
  perPage: number = 20,
  search: string = '',
  filters?: {
    branchOfficeId?: number;
    departmentId?: number;
    costCenterId?: number;
    statuses?: string[];
    employeeContractStatus?: string[];
  },
): Promise<WorkeraEmployeeFilterResponse> {
  const body = {
    filters: {
      search,
      positionId: 0,
      branchOfficeId: filters?.branchOfficeId || 0,
      departmentId: filters?.departmentId || 0,
      costCenterId: filters?.costCenterId || 0,
      statuses: filters?.statuses || ['ACTIVO'],
      employeeContractStatus: filters?.employeeContractStatus || ['CON_CONTRATO', 'CONTRATO_EN_PROCESO', 'SIN_CONTRATO'],
    },
    sort: { field: 'completeName', type: 'ASC' },
    page,
    perPage,
  };

  const resp = await workeraFetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: 'employee-filter', body }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(err.error || `Error ${resp.status}`);
  }

  return resp.json();
}

export async function fetchBranchOffices(): Promise<WorkeraBranchOffice[]> {
  const resp = await workeraFetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: 'branchOffice', body: {}, method: 'GET' }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(err.error || `Error ${resp.status}`);
  }

  const data = await resp.json();
  return data.data || data || [];
}

export async function fetchAttendance(
  employeeId: number,
  dateFrom: string,
  dateTo: string,
): Promise<WorkeraAttendanceRecord[]> {
  const resp = await workeraFetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: 'attendanceData', body: { employeeId, dateFrom, dateTo } }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(err.error || `Error ${resp.status}`);
  }

  const data = await resp.json();
  return data.data || [];
}

export async function workeraRequest<T = any>(
  endpoint: string,
  body: Record<string, any>,
  method: string = 'POST',
): Promise<T> {
  const resp = await workeraFetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint, body, method }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(err.error || `Error ${resp.status}`);
  }

  return resp.json();
}
