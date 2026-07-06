'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Zap, Leaf, Brush, Trash2, Wrench, Clock, CheckCircle2,
  MapPin, ChevronRight, X, Plus, ClipboardList,
  Download, ChevronDown, Search, User, Tag, Camera, Image as ImageIcon,
  RefreshCw, Settings, Pencil, Droplets, Flame, Shield, ShieldCheck, LogOut, Eye,
  BarChart3, Timer, TrendingUp, CalendarDays, Activity, FileSpreadsheet, FileText, Filter,
  Repeat, Pause, Play, ChevronLeft, Menu, Users, HardHat, Star, KeyRound, ScrollText,
  QrCode, Scan, MapPinned, Wifi, WifiOff, Upload, CloudOff, CloudCheck, RefreshCcw, Printer, FileDown, Package, Wrench as WrenchIcon, Cog, AlertTriangle
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

/* ─── Data Structures ─── */

interface WorkArea {
  id: string;
  name: string;
  activities: string[];
  color: string;
}

interface Personnel {
  id: string;
  name: string;
  workAreaId: string;
}

interface Zone {
  id: string;
  name: string;
}

/* ─── Default Data ─── */

const DEFAULT_WORK_AREAS: WorkArea[] = [
  { id: 'jardineria', name: 'Jardinería', activities: ['Corte De Pasto', 'Desmalezado', 'Poda de Arbustos', 'Riego'], color: 'bg-green-600' },
  { id: 'aseo', name: 'Aseo', activities: ['Limpieza de Quinchos', 'Limpieza Áreas Comunes', 'Barrido De Calles'], color: 'bg-pink-500' },
  { id: 'recoleccion', name: 'Recolección', activities: ['Recolección De Basura', 'Barrido De Calles'], color: 'bg-orange-500' },
  { id: 'piscinas', name: 'Piscinas y Laguna', activities: ['Limpieza De Piscina', 'Llenado De Piscina', 'Mantención Laguna', 'Tratamiento de Agua'], color: 'bg-cyan-500' },
  { id: 'mantenciones', name: 'Mantenciones', activities: ['Reparación Estructural', 'Pintura', 'Mantención General', 'Carpintería'], color: 'bg-purple-500' },
  { id: 'electricas', name: 'Eléctricas y Mantenciones', activities: ['Reparación Eléctrica', 'Mantención Eléctrica', 'Iluminación'], color: 'bg-yellow-500' },
];

const DEFAULT_PERSONNEL: Personnel[] = [
  { id: 'p1', name: 'Cesar Edmundo Adasme Aravena', workAreaId: 'jardineria' },
  { id: 'p2', name: 'Luis Alejandro Torres Bustos', workAreaId: 'jardineria' },
  { id: 'p3', name: 'Chris Esther Godoy Espinoza', workAreaId: 'aseo' },
  { id: 'p5', name: 'Marie Ginette Dorne', workAreaId: 'aseo' },
  { id: 'p4', name: 'Erik Alberto Arteaga Burgos', workAreaId: 'recoleccion' },
  { id: 'p6', name: 'Jeantelus Fleurissaint', workAreaId: 'recoleccion' },
  { id: 'p7', name: 'Paulo César Toro Pino', workAreaId: 'piscinas' },
  { id: 'p8', name: 'Macario Enrique Manríquez Trigo', workAreaId: 'piscinas' },
  { id: 'p9', name: 'Carlos Alberto Zamorano Torres', workAreaId: 'mantenciones' },
  { id: 'p10', name: 'Jose Luis Venegas Poblete', workAreaId: 'mantenciones' },
  { id: 'p11', name: 'Francisco Marcial Fuentes Carrasco', workAreaId: 'electricas' },
];

const DEFAULT_ZONES: Zone[] = [
  { id: 'z1', name: 'Club House' },
  { id: 'z2', name: 'Piscina 1' },
  { id: 'z3', name: 'Piscina 2' },
  { id: 'z4', name: 'Piscina 3' },
  { id: 'z5', name: 'Mirador' },
  { id: 'z6', name: 'Muelle' },
  { id: 'z7', name: 'Juegos Muelle' },
  { id: 'z8', name: 'Quinchos' },
  { id: 'z9', name: 'Multicancha' },
  { id: 'z10', name: 'Cancha Sintética' },
  { id: 'z11', name: 'Avenida Principal' },
  { id: 'z12', name: 'Canquén' },
  { id: 'z13', name: 'Albatros' },
  { id: 'z14', name: 'Bandurrias' },
  { id: 'z15', name: 'Becacinas' },
  { id: 'z16', name: 'Flamencos' },
  { id: 'z17', name: 'Faisanes' },
  { id: 'z18', name: 'Garzas' },
  { id: 'z19', name: 'Gaviotas' },
  { id: 'z20', name: 'Otro' },
];

/* ─── Other constants ─── */

/* Icon lookup map — stores icon components by string name to avoid React rendering issues */
const ICON_MAP: Record<string, React.ElementType> = {
  Leaf,
  Brush,
  Trash2,
  Droplets,
  Wrench,
  Zap,
};

const CATEGORIES = [
  { id: 'jardineria', name: 'Jardinería', icon: 'Leaf', color: 'bg-green-600', workAreaId: 'jardineria' },
  { id: 'aseo', name: 'Aseo', icon: 'Brush', color: 'bg-pink-500', workAreaId: 'aseo' },
  { id: 'recoleccion', name: 'Recolección', icon: 'Trash2', color: 'bg-orange-500', workAreaId: 'recoleccion' },
  { id: 'piscinas', name: 'Piscinas y Laguna', icon: 'Droplets', color: 'bg-cyan-500', workAreaId: 'piscinas' },
  { id: 'mantenciones', name: 'Mantenciones', icon: 'Wrench', color: 'bg-purple-500', workAreaId: 'mantenciones' },
  { id: 'electricas', name: 'Eléctricas', icon: 'Zap', color: 'bg-yellow-500', workAreaId: 'electricas' },
];

const STATUS_CONFIG: Record<string, { color: string; text: string }> = {
  'Pendiente': { color: 'bg-red-500', text: 'text-red-500' },
  'En Proceso': { color: 'bg-amber-500', text: 'text-amber-600' },
  'Terminada': { color: 'bg-emerald-500', text: 'text-emerald-600' },
};

/* ─── Types ─── */

interface WorkOrder {
  id: string;
  otId: string;
  activities: string[];
  collaborators: string[];
  zoneName: string;
  description: string;
  status: string;
  recurringId?: string;
  plannedDate: number | null;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  photosBefore: string[];
  photosAfter: string[];
}

interface RecurringWorkOrderItem {
  id: string;
  name: string;
  activities: string[];
  collaborators: string[];
  zoneName: string;
  workAreaId: string;
  description: string;
  frequency: string;
  daysOfWeek: number[];
  dayOfMonth: number | null;
  status: string;
  lastGeneratedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

interface ProfileItem {
  id: string;
  name: string;
  hasPassword: boolean;
  password?: string;
  accessCode: string;
  color: string;
  icon: string;
  workAreaIds: string[];
  permissions: string[];
  createdAt: number;
  updatedAt: number;
}

interface QrLocationItem {
  id: string;
  name: string;
  description: string;
  location: string;
  code: string;
  active: boolean;
  createdBy: string;
  scanCount: number;
  createdAt: number;
  updatedAt: number;
}

interface QrScanItem {
  id: string;
  qrLocationId: string;
  scannedBy: string;
  profileId: string | null;
  latitude: number | null;
  longitude: number | null;
  notes: string;
  createdAt: number;
  location: {
    id: string;
    name: string;
    location: string;
    code: string;
  } | null;
}

interface InventoryItemData {
  id: string;
  name: string;
  brand: string;
  model: string;
  serialNumber: string;
  category: string;
  location: string;
  lastMaintenance: number | null;
  lastReview: number | null;
  nextMaintenance: number | null;
  status: string;
  photo: string;
  notes: string;
  qrCode: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

/* ─── Migration helper (backward compat) ─── */

function migrateWorkOrder(ot: any): WorkOrder {
  let collaborators: string[];
  if (Array.isArray(ot.collaborators)) {
    collaborators = ot.collaborators;
  } else if (typeof ot.collaborators === 'string' && ot.collaborators.trim()) {
    collaborators = [ot.collaborators];
  } else {
    collaborators = [];
  }
  let activities: string[];
  if (Array.isArray(ot.activities)) {
    activities = ot.activities;
  } else if (typeof ot.activities === 'string' && ot.activities.trim()) {
    activities = [ot.activities];
  } else {
    activities = [];
  }
  // Auto-repair: if status is En Proceso or Terminada but startedAt is missing, use createdAt as fallback
  let startedAt = ot.startedAt ?? null;
  if (!startedAt && (ot.status === 'En Proceso' || ot.status === 'Terminada') && ot.createdAt) {
    startedAt = ot.createdAt;
  }
  let completedAt = ot.completedAt ?? null;
  if (!completedAt && ot.status === 'Terminada' && ot.createdAt) {
    completedAt = ot.createdAt;
  }
  return {
    ...ot,
    collaborators,
    activities,
    plannedDate: ot.plannedDate ?? null,
    photosBefore: Array.isArray(ot.photosBefore) ? ot.photosBefore : [],
    photosAfter: Array.isArray(ot.photosAfter) ? ot.photosAfter : [],
    startedAt,
    completedAt,
  };
}

/* ─── LocalStorage helpers ─── */

const STORAGE_KEY = 'laguna_norte_ots';
const COUNTER_KEY = 'laguna_norte_ot_counter';
const WORK_AREAS_KEY = 'laguna_norte_work_areas';
const PERSONNEL_KEY = 'laguna_norte_personnel';
const ZONES_KEY = 'laguna_norte_zones';
const CONFIG_VERSION_KEY = 'laguna_norte_config_version';
const CONFIG_VERSION = 2; // Increment when default data changes to force reload
const USER_ROLE_KEY = 'laguna_norte_user_role';
const ADMIN_PWD_KEY = 'laguna_norte_admin_pwd';
const DEFAULT_ADMIN_PWD = 'admin2024';
const WORK_SCHEDULE_KEY = 'laguna_norte_work_schedule';

type UserRole = 'admin' | `profile:${string}`;

function getAdminPwd(): string {
  try { return localStorage.getItem(ADMIN_PWD_KEY) || DEFAULT_ADMIN_PWD; } catch { return DEFAULT_ADMIN_PWD; }
}

function checkAdminPwd(pwd: string): boolean {
  return pwd === getAdminPwd();
}

/* ─── Work Schedule Configuration ─── */

interface WorkSchedule {
  startHour: number;   // e.g., 8 for 8:00 AM
  startMinute: number; // e.g., 0
  endHour: number;     // e.g., 18 for 6:00 PM
  endMinute: number;   // e.g., 0
  workDays: number[];  // 0=Sunday, 1=Monday, ..., 6=Saturday
  enabled: boolean;    // Whether to use working hours calculation
}

const DEFAULT_WORK_SCHEDULE: WorkSchedule = {
  startHour: 8,
  startMinute: 0,
  endHour: 18,
  endMinute: 0,
  workDays: [1, 2, 3, 4, 5], // Monday to Friday
  enabled: true,
};

function loadWorkSchedule(): WorkSchedule {
  try {
    const raw = localStorage.getItem(WORK_SCHEDULE_KEY);
    if (!raw) return DEFAULT_WORK_SCHEDULE;
    return { ...DEFAULT_WORK_SCHEDULE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_WORK_SCHEDULE;
  }
}

function saveWorkSchedule(schedule: WorkSchedule) {
  try {
    localStorage.setItem(WORK_SCHEDULE_KEY, JSON.stringify(schedule));
  } catch { /* ignore */ }
}

/**
 * Calculate the number of WORKING milliseconds between two timestamps,
 * considering the configured work schedule (start hour, end hour, work days).
 * Only counts time within the work window on work days.
 * If working hours calculation is disabled, returns the raw difference.
 */
function calcWorkingMs(startMs: number, endMs: number, schedule: WorkSchedule): number {
  if (!schedule.enabled) return endMs - startMs;
  if (endMs <= startMs) return 0;

  const workStartMin = schedule.startHour * 60 + schedule.startMinute; // e.g., 480 = 8:00
  const workEndMin = schedule.endHour * 60 + schedule.endMinute;       // e.g., 1080 = 18:00
  const workDayMs = (workEndMin - workStartMin) * 60 * 1000;          // ms per work day

  let totalWorkingMs = 0;

  // Iterate day by day from start to end
  const startDate = new Date(startMs);
  const endDate = new Date(endMs);

  // Normalize to Chile timezone for day-of-week calculation
  const chileStartStr = startDate.toLocaleString('en-US', { timeZone: 'America/Santiago' });
  const chileEndStr = endDate.toLocaleString('en-US', { timeZone: 'America/Santiago' });

  // Use a simpler approach: iterate through each day in the range
  const startDay = new Date(startMs);
  const endDay = new Date(endMs);

  // Get Chile timezone dates
  const chileStart = new Date(chileStartStr);
  const chileEnd = new Date(chileEndStr);

  // Iterate day by day (Chile time)
  let current = new Date(chileStart.getFullYear(), chileStart.getMonth(), chileStart.getDate());
  const lastDay = new Date(chileEnd.getFullYear(), chileEnd.getMonth(), chileEnd.getDate());

  while (current <= lastDay) {
    const dayOfWeek = current.getDay();
    const isWorkDay = schedule.workDays.includes(dayOfWeek);

    if (isWorkDay) {
      // Calculate the work window for this day in Chile time
      const dayWorkStart = new Date(current);
      dayWorkStart.setHours(schedule.startHour, schedule.startMinute, 0, 0);
      const dayWorkEnd = new Date(current);
      dayWorkEnd.setHours(schedule.endHour, schedule.endMinute, 0, 0);

      // Convert Chile times to actual ms (approximate)
      // The offset between Chile and local time
      const offsetMs = startMs - chileStart.getTime();
      const actualWorkStart = dayWorkStart.getTime() + offsetMs;
      const actualWorkEnd = dayWorkEnd.getTime() + offsetMs;

      // Intersect with [startMs, endMs]
      const effectiveStart = Math.max(startMs, actualWorkStart);
      const effectiveEnd = Math.min(endMs, actualWorkEnd);

      if (effectiveEnd > effectiveStart) {
        totalWorkingMs += effectiveEnd - effectiveStart;
      }
    }

    // Move to next day
    current.setDate(current.getDate() + 1);
  }

  return totalWorkingMs;
}

/**
 * Format a duration in ms, displaying in working-hours format when schedule is enabled.
 * Shows hours and minutes within the work schedule context.
 */
function formatWorkingDuration(ms: number, schedule: WorkSchedule): string {
  if (ms < 0) return '—';
  if (!schedule.enabled) {
    // Original 24h calculation
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  }

  // Working hours calculation
  const workStartMin = schedule.startHour * 60 + schedule.startMinute;
  const workEndMin = schedule.endHour * 60 + schedule.endMinute;
  const minsPerWorkDay = workEndMin - workStartMin; // e.g., 600 minutes = 10 hours
  const msPerWorkDay = minsPerWorkDay * 60 * 1000;

  const totalWorkMinutes = Math.floor(ms / 60000);
  const workDays = Math.floor(totalWorkMinutes / minsPerWorkDay);
  const remainingMinutes = totalWorkMinutes % minsPerWorkDay;
  const workHours = Math.floor(remainingMinutes / 60);
  const workMins = remainingMinutes % 60;

  if (workDays > 0) return `${workDays}dj ${workHours}h ${workMins}m`;
  if (workHours > 0) return `${workHours}h ${workMins}m`;
  return `${workMins}m`;
}

function readFromLocalStorage(): WorkOrder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(migrateWorkOrder) : [];
  } catch {
    return [];
  }
}

function writeToLocalStorage(orders: WorkOrder[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch (e) {
    console.error('Error al guardar en localStorage:', e);
  }
}

function readCounterFromLocalStorage(): number {
  try {
    const stored = localStorage.getItem(COUNTER_KEY);
    return stored ? parseInt(stored, 10) : 0;
  } catch {
    return 0;
  }
}

function writeCounterToLocalStorage(counter: number) {
  try {
    localStorage.setItem(COUNTER_KEY, counter.toString());
  } catch { /* ignore */ }
}

/* ─── Config Data localStorage helpers ─── */

function loadWorkAreas(): WorkArea[] {
  try {
    const needsReload = localStorage.getItem(CONFIG_VERSION_KEY) !== String(CONFIG_VERSION);
    if (needsReload) {
      localStorage.setItem(WORK_AREAS_KEY, JSON.stringify(DEFAULT_WORK_AREAS));
      localStorage.setItem(CONFIG_VERSION_KEY, String(CONFIG_VERSION));
      return DEFAULT_WORK_AREAS;
    }
    const raw = localStorage.getItem(WORK_AREAS_KEY);
    if (!raw) {
      localStorage.setItem(WORK_AREAS_KEY, JSON.stringify(DEFAULT_WORK_AREAS));
      return DEFAULT_WORK_AREAS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_WORK_AREAS;
  } catch {
    return DEFAULT_WORK_AREAS;
  }
}

function saveWorkAreas(areas: WorkArea[]) {
  try {
    localStorage.setItem(WORK_AREAS_KEY, JSON.stringify(areas));
  } catch { /* ignore */ }
}

function loadPersonnel(): Personnel[] {
  try {
    const needsReload = localStorage.getItem(CONFIG_VERSION_KEY) !== String(CONFIG_VERSION);
    if (needsReload) {
      localStorage.setItem(PERSONNEL_KEY, JSON.stringify(DEFAULT_PERSONNEL));
      return DEFAULT_PERSONNEL;
    }
    const raw = localStorage.getItem(PERSONNEL_KEY);
    if (!raw) {
      localStorage.setItem(PERSONNEL_KEY, JSON.stringify(DEFAULT_PERSONNEL));
      return DEFAULT_PERSONNEL;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_PERSONNEL;
  } catch {
    return DEFAULT_PERSONNEL;
  }
}

function savePersonnel(personnel: Personnel[]) {
  try {
    localStorage.setItem(PERSONNEL_KEY, JSON.stringify(personnel));
  } catch { /* ignore */ }
}

function loadZones(): Zone[] {
  try {
    const raw = localStorage.getItem(ZONES_KEY);
    if (!raw) {
      localStorage.setItem(ZONES_KEY, JSON.stringify(DEFAULT_ZONES));
      return DEFAULT_ZONES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_ZONES;
  } catch {
    return DEFAULT_ZONES;
  }
}

function saveZones(zones: Zone[]) {
  try {
    localStorage.setItem(ZONES_KEY, JSON.stringify(zones));
  } catch { /* ignore */ }
}

/* ─── Custom Hook: useWorkOrders (Hybrid: localStorage + API sync with immediate push) ─── */

function useWorkOrders(performedBy?: string, profileId?: string) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [apiAvailable, setApiAvailable] = useState(false);
  const [lastSync, setLastSync] = useState<number>(0);
  const mountedRef = useRef(false);
  const creatingRef = useRef(false); // Prevent double-creation

  // Fetch from API; fallback to localStorage
  const fetchWorkOrders = useCallback(async (showSyncIndicator = false) => {
    try {
      if (showSyncIndicator) setSyncing(true);
      const res = await fetch('/api/movil/workorders');
      if (!res.ok) throw new Error('API not available');
      const data = await res.json();
      const migrated = Array.isArray(data) ? data.map(migrateWorkOrder) : [];
      setWorkOrders(migrated);
      writeToLocalStorage(migrated);
      // Sync local counter with max OT from DB to prevent counter reset
      if (migrated.length > 0) {
        const maxNum = migrated.reduce((max, ot) => {
          const num = parseInt(ot.otId.replace('OT-', ''), 10);
          return !isNaN(num) && num > max ? num : max;
        }, 0);
        writeCounterToLocalStorage(maxNum);
      }
      setApiAvailable(true);
      setLastSync(Date.now());
    } catch {
      setApiAvailable(false);
      const local = readFromLocalStorage();
      setWorkOrders(local);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  // Initial load + polling every 5 seconds for cross-device sync
  useEffect(() => {
    mountedRef.current = true;

    // First load from localStorage for instant display
    const local = readFromLocalStorage();
    if (local.length > 0) {
      setWorkOrders(local);
      setLoading(false);
    }

    // Then fetch from API (authoritative source)
    fetchWorkOrders(true);

    // Poll every 5 seconds for near-real-time cross-device sync
    const interval = setInterval(() => {
      fetchWorkOrders(false);
    }, 5000);

    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  const createWorkOrder = useCallback(async (data: Partial<WorkOrder>): Promise<WorkOrder | null> => {
    // ─── Prevent double-creation (race condition guard) ───
    if (creatingRef.current) {
      return null;
    }
    creatingRef.current = true;

    try {
      const status = data.status ?? 'Pendiente';
      const now = Date.now();
      const tempId = data.id || generateUniqueId();

      // ─── Strategy: Let the SERVER assign the otId ───
      // Send the OT without an otId — the server generates it atomically from the counter
      // This prevents duplicate otId numbers when multiple requests come in simultaneously
      const newOT: WorkOrder = {
        id: tempId,
        otId: '', // Will be assigned by the server
        activities: data.activities ?? [],
        collaborators: data.collaborators ?? [],
        zoneName: data.zoneName ?? '',
        description: data.description ?? '',
        status,
        plannedDate: data.plannedDate ?? null,
        createdAt: now,
        startedAt: (status === 'En Proceso' || status === 'Terminada') ? (data.startedAt ?? now) : null,
        completedAt: status === 'Terminada' ? (data.completedAt ?? now) : null,
        photosBefore: data.photosBefore ?? [],
        photosAfter: data.photosAfter ?? [],
      };

      // Push to API first — server assigns the otId atomically
      try {
        const res = await fetch('/api/movil/workorders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...newOT, _performedBy: performedBy || 'admin', _profileId: profileId || null }),
        });
        if (res.ok) {
          const savedOT = await res.json();
          setApiAvailable(true);
          setLastSync(Date.now());
          // Use the server-assigned otId
          newOT.otId = savedOT.otId;
          newOT.id = savedOT.id;
          // Save to state + localStorage with the correct server otId
          setWorkOrders(prev => {
            const updated = [newOT, ...prev];
            writeToLocalStorage(updated);
            return updated;
          });
          return newOT;
        } else {
          setApiAvailable(false);
        }
      } catch {
        setApiAvailable(false);
      }

      // ─── Offline fallback: generate otId locally ───
      // Only used if the API is completely unreachable
      const existingMax = readFromLocalStorage().reduce((max, ot) => {
        const num = parseInt(ot.otId.replace('OT-', ''), 10);
        return !isNaN(num) && num > max ? num : max;
      }, 0);
      const counter = existingMax + 1;
      newOT.otId = `OT-${String(counter).padStart(4, '0')}`;

      // Save to state + localStorage for offline use
      setWorkOrders(prev => {
        const updated = [newOT, ...prev];
        writeToLocalStorage(updated);
        return updated;
      });
      writeCounterToLocalStorage(counter);

      return newOT;
    } finally {
      // Always reset the guard, even on error
      creatingRef.current = false;
    }
  }, [fetchWorkOrders, performedBy, profileId]);

  const updateWorkOrder = useCallback(async (data: Partial<WorkOrder>): Promise<WorkOrder | null> => {
    if (!data.id) return null;

    // Update state + localStorage immediately
    setWorkOrders(prev => {
      const updated = prev.map(ot => ot.id === data.id ? { ...ot, ...data } as WorkOrder : ot);
      writeToLocalStorage(updated);
      return updated;
    });

    // Push to API immediately for cross-device sync
    try {
      const res = await fetch(`/api/movil/workorders/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, _performedBy: performedBy || 'admin', _profileId: profileId || null }),
      });
      if (res.ok) {
        setApiAvailable(true);
        setLastSync(Date.now());
        fetchWorkOrders(false);
      } else {
        setApiAvailable(false);
      }
    } catch {
      setApiAvailable(false);
    }

    return { ...data } as WorkOrder;
  }, [fetchWorkOrders]);

  const deleteWorkOrder = useCallback(async (id: string): Promise<boolean> => {
    // Delete from state + localStorage immediately
    setWorkOrders(prev => {
      const updated = prev.filter(ot => ot.id !== id);
      writeToLocalStorage(updated);
      return updated;
    });

    // Push deletion to API immediately for cross-device sync
    try {
      const res = await fetch(`/api/movil/workorders/${id}?_performedBy=${encodeURIComponent(performedBy || 'admin')}&_profileId=${profileId || ''}`, { method: 'DELETE' });
      if (res.ok) {
        setApiAvailable(true);
        setLastSync(Date.now());
      } else {
        setApiAvailable(false);
      }
    } catch {
      setApiAvailable(false);
    }

    return true;
  }, []);

  return {
    workOrders,
    loading,
    syncing,
    apiAvailable,
    lastSync,
    createWorkOrder,
    updateWorkOrder,
    deleteWorkOrder,
  };
}

/* ─── Custom Hook: useRecurringWorkOrders ─── */

function useRecurringWorkOrders(performedBy?: string, profileId?: string) {
  const [items, setItems] = useState<RecurringWorkOrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/recurring');
      if (!res.ok) throw new Error('API not available');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const createItem = useCallback(async (data: Partial<RecurringWorkOrderItem>): Promise<RecurringWorkOrderItem | null> => {
    try {
      const res = await fetch('/api/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, _performedBy: performedBy || 'admin', _profileId: profileId || null }),
      });
      if (res.ok) {
        const created = await res.json();
        await fetchItems();
        return created;
      }
    } catch { /* ignore */ }
    return null;
  }, [fetchItems]);

  const updateItem = useCallback(async (id: string, data: Partial<RecurringWorkOrderItem>): Promise<RecurringWorkOrderItem | null> => {
    try {
      const res = await fetch(`/api/recurring/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, _performedBy: performedBy || 'admin', _profileId: profileId || null }),
      });
      if (res.ok) {
        const updated = await res.json();
        await fetchItems();
        return updated;
      }
    } catch { /* ignore */ }
    return null;
  }, [fetchItems]);

  const deleteItem = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/recurring/${id}?_performedBy=${encodeURIComponent(performedBy || 'admin')}&_profileId=${profileId || ''}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchItems();
        return true;
      }
    } catch { /* ignore */ }
    return false;
  }, [fetchItems]);

  const generateToday = useCallback(async (): Promise<{ created: number; skipped: number; message: string } | null> => {
    try {
      const res = await fetch('/api/recurring/generate', { method: 'POST' });
      if (res.ok) {
        return await res.json();
      }
    } catch { /* ignore */ }
    return null;
  }, []);

  return { items, loading, createItem, updateItem, deleteItem, generateToday, refetch: fetchItems };
}

/* ─── Custom Hook: useProfiles ─── */

function useProfiles(performedBy?: string, profileId?: string) {
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = useCallback(async () => {
    try {
      const res = await fetch('/api/movil/profiles');
      if (!res.ok) throw new Error('API not available');
      const data = await res.json();
      setProfiles(Array.isArray(data) ? data : []);
    } catch {
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const createProfile = useCallback(async (data: Partial<ProfileItem>): Promise<ProfileItem | null> => {
    try {
      const res = await fetch('/api/movil/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, _performedBy: performedBy || 'admin', _profileId: profileId || null }),
      });
      if (res.ok) {
        const created = await res.json();
        await fetchProfiles();
        return created;
      }
    } catch { /* ignore */ }
    return null;
  }, [fetchProfiles]);

  const updateProfile = useCallback(async (id: string, data: Partial<ProfileItem>): Promise<ProfileItem | null> => {
    try {
      const res = await fetch(`/api/movil/profiles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, _performedBy: performedBy || 'admin', _profileId: profileId || null }),
      });
      if (res.ok) {
        const updated = await res.json();
        await fetchProfiles();
        return updated;
      }
    } catch { /* ignore */ }
    return null;
  }, [fetchProfiles]);

  const deleteProfile = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/movil/profiles/${id}?_performedBy=${encodeURIComponent(performedBy || 'admin')}&_profileId=${profileId || ''}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchProfiles();
        return true;
      }
    } catch { /* ignore */ }
    return false;
  }, [fetchProfiles]);

  return { profiles, loading, createProfile, updateProfile, deleteProfile, refetch: fetchProfiles };
}

/* ─── Custom Hook: useQrLocations ─── */

function useQrLocations(performedBy?: string, profileId?: string) {
  const [locations, setLocations] = useState<QrLocationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLocations = useCallback(async () => {
    try {
      const res = await fetch('/api/qr-locations');
      if (!res.ok) throw new Error('API not available');
      const data = await res.json();
      setLocations(Array.isArray(data) ? data : []);
    } catch {
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const createLocation = useCallback(async (data: Partial<QrLocationItem>): Promise<QrLocationItem | null> => {
    try {
      const res = await fetch('/api/qr-locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, _performedBy: performedBy || 'admin', _profileId: profileId || null }),
      });
      if (res.ok) {
        const created = await res.json();
        await fetchLocations();
        return created;
      }
    } catch { /* ignore */ }
    return null;
  }, [fetchLocations, performedBy, profileId]);

  const updateLocation = useCallback(async (id: string, data: Partial<QrLocationItem>): Promise<QrLocationItem | null> => {
    try {
      const res = await fetch(`/api/qr-locations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, _performedBy: performedBy || 'admin', _profileId: profileId || null }),
      });
      if (res.ok) {
        const updated = await res.json();
        await fetchLocations();
        return updated;
      }
    } catch { /* ignore */ }
    return null;
  }, [fetchLocations, performedBy, profileId]);

  const deleteLocation = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/qr-locations/${id}?_performedBy=${encodeURIComponent(performedBy || 'admin')}&_profileId=${profileId || ''}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchLocations();
        return true;
      }
    } catch { /* ignore */ }
    return false;
  }, [fetchLocations, performedBy, profileId]);

  return { locations, loading, createLocation, updateLocation, deleteLocation, refetch: fetchLocations };
}

/* ─── Custom Hook: useQrScans ─── */

function useQrScans() {
  const [scans, setScans] = useState<QrScanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchScans = useCallback(async (filters?: { qrLocationId?: string; scannedBy?: string; from?: number; to?: number; limit?: number; offset?: number }) => {
    try {
      const params = new URLSearchParams();
      if (filters?.qrLocationId) params.set('qrLocationId', filters.qrLocationId);
      if (filters?.scannedBy) params.set('scannedBy', filters.scannedBy);
      if (filters?.from) params.set('from', String(filters.from));
      if (filters?.to) params.set('to', String(filters.to));
      if (filters?.limit) params.set('limit', String(filters.limit));
      if (filters?.offset) params.set('offset', String(filters.offset));

      const res = await fetch(`/api/qr-scans?${params.toString()}`);
      if (!res.ok) throw new Error('API not available');
      const data = await res.json();
      setScans(Array.isArray(data.scans) ? data.scans : []);
      setTotal(data.total || 0);
    } catch {
      setScans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScans();
  }, [fetchScans]);

  const createScan = useCallback(async (data: { code: string; scannedBy: string; profileId?: string; latitude?: number; longitude?: number; notes?: string }): Promise<QrScanItem | null> => {
    try {
      const res = await fetch('/api/qr-scans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const created = await res.json();
        await fetchScans();
        return created;
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al escanear');
      }
    } catch (error: any) {
      throw error;
    }
  }, [fetchScans]);

  return { scans, loading, total, createScan, refetch: fetchScans };
}

/* ─── Custom Hook: useInventory ─── */

function useInventory(performedBy?: string, profileId?: string) {
  const [items, setItems] = useState<InventoryItemData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async (filters?: { category?: string; status?: string; search?: string }) => {
    try {
      const params = new URLSearchParams();
      if (filters?.category) params.set('category', filters.category);
      if (filters?.status) params.set('status', filters.status);
      if (filters?.search) params.set('search', filters.search);

      const res = await fetch(`/api/inventory?${params.toString()}`);
      if (!res.ok) throw new Error('API not available');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const createItem = useCallback(async (data: Partial<InventoryItemData>): Promise<InventoryItemData | null> => {
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, _performedBy: performedBy || 'admin', _profileId: profileId || null }),
      });
      if (res.ok) {
        const created = await res.json();
        await fetchItems();
        return created;
      }
    } catch { /* ignore */ }
    return null;
  }, [fetchItems, performedBy, profileId]);

  const updateItem = useCallback(async (id: string, data: Partial<InventoryItemData>): Promise<InventoryItemData | null> => {
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, _performedBy: performedBy || 'admin', _profileId: profileId || null }),
      });
      if (res.ok) {
        const updated = await res.json();
        await fetchItems();
        return updated;
      }
    } catch { /* ignore */ }
    return null;
  }, [fetchItems, performedBy, profileId]);

  const deleteItem = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/inventory/${id}?_performedBy=${encodeURIComponent(performedBy || 'admin')}&_profileId=${profileId || ''}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchItems();
        return true;
      }
    } catch { /* ignore */ }
    return false;
  }, [fetchItems, performedBy, profileId]);

  return { items, loading, createItem, updateItem, deleteItem, refetch: fetchItems };
}

/* ─── Custom Hook: useConfigData ─── */

function useConfigData() {
  const [workAreas, setWorkAreas] = useState<WorkArea[]>(() => loadWorkAreas());
  const [personnel, setPersonnel] = useState<Personnel[]>(() => loadPersonnel());
  const [zones, setZones] = useState<Zone[]>(() => loadZones());

  const updateWorkAreas = useCallback((areas: WorkArea[]) => {
    setWorkAreas(areas);
    saveWorkAreas(areas);
  }, []);

  const updatePersonnel = useCallback((p: Personnel[]) => {
    setPersonnel(p);
    savePersonnel(p);
  }, []);

  const updateZones = useCallback((z: Zone[]) => {
    setZones(z);
    saveZones(z);
  }, []);

  return { workAreas, personnel, zones, updateWorkAreas, updatePersonnel, updateZones };
}

/* ─── Utility functions ─── */

function generateUniqueId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

function formatDateTime(ts: number | null): string {
  if (!ts) return '—';
  const d = new Date(ts);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${mins}`;
}

function formatDuration(ms: number): string {
  if (ms < 0) return '—';
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

function compressImage(file: File, maxWidth: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject('No canvas context'); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ─── Multi-Select Collaborators Component (now takes filtered list) ─── */

function MultiSelectCollaborators({
  selected,
  onToggle,
  availableCollaborators,
  selectedWorkAreaId,
}: {
  selected: string[];
  onToggle: (name: string) => void;
  availableCollaborators: { name: string; workAreaName: string; workAreaId: string }[];
  selectedWorkAreaId?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = search.trim()
    ? availableCollaborators.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.workAreaName.toLowerCase().includes(search.toLowerCase())
      )
    : availableCollaborators;

  return (
    <div ref={containerRef}>
      <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1">
        <User size={10} /> Responsables
      </label>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selected.map(name => (
            <span key={name} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-600 rounded-lg text-[9px] font-black">
              {name.split(' ').slice(0, 3).join(' ')}
              <button type="button" onClick={() => onToggle(name)} className="hover:text-red-500 transition-colors">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
        className="w-full p-4 mt-2 rounded-2xl bg-slate-50 border-none font-bold text-left flex items-center justify-between gap-2"
      >
        <span className="text-slate-400 text-sm">{selected.length > 0 ? `${selected.length} seleccionado(s)` : 'Seleccionar responsables...'}</span>
        <ChevronDown size={16} className={`text-slate-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="mt-1 bg-white rounded-2xl shadow-xl border border-slate-100 max-h-56 overflow-hidden">
          <div className="p-2 border-b border-slate-100 sticky top-0 bg-white">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl">
              <Search size={14} className="text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar colaborador..."
                className="bg-transparent text-sm font-medium w-full outline-none placeholder:text-slate-300"
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-40 no-scrollbar">
            {filtered.map((c, idx) => {
              // Show a separator label before "other area" personnel
              const showOtherAreaLabel = selectedWorkAreaId && idx > 0 && c.workAreaId !== selectedWorkAreaId && filtered[idx - 1].workAreaId === selectedWorkAreaId;
              return (
                <div key={c.name}>
                  {showOtherAreaLabel && (
                    <div className="px-4 py-1 bg-slate-50 border-t border-slate-100">
                      <span className="text-[8px] font-black text-slate-400 uppercase">Otras áreas</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => onToggle(c.name)}
                    className={`w-full px-4 py-3 text-left text-sm hover:bg-blue-50 transition-colors ${selected.includes(c.name) ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${selected.includes(c.name) ? 'bg-blue-600 border-blue-600' : c.workAreaId !== selectedWorkAreaId && selectedWorkAreaId ? 'border-slate-200' : 'border-slate-300'}`}>
                        {selected.includes(c.name) && <span className="text-white text-[8px] font-black">✓</span>}
                      </div>
                      <div>
                        <span className={`block truncate ${selected.includes(c.name) ? 'text-blue-600 font-black' : c.workAreaId !== selectedWorkAreaId && selectedWorkAreaId ? 'text-slate-500 font-semibold' : 'text-slate-700 font-semibold'}`}>{c.name}</span>
                        <span className="block text-[9px] font-medium text-slate-400 normal-case truncate">{c.workAreaName}</span>
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="px-4 py-3 text-xs text-slate-400 italic">Sin resultados</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Custom Dropdown Component (single select) ─── */

function Dropdown({
  label,
  icon: IconComp,
  options,
  selected,
  onSelect,
  placeholder,
  searchable = false,
}: {
  label: string;
  icon: React.ElementType;
  options: { value: string; subtitle?: string; colorDot?: string }[];
  selected: string;
  onSelect: (value: string) => void;
  placeholder: string;
  searchable?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = searchable && search.trim()
    ? options.filter(o =>
        o.value.toLowerCase().includes(search.toLowerCase()) ||
        (o.subtitle && o.subtitle.toLowerCase().includes(search.toLowerCase()))
      )
    : options;

  const selectedOption = options.find(o => o.value === selected);

  return (
    <div ref={containerRef} className="relative">
      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">{label}</label>
      <button
        type="button"
        onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
        className="w-full p-4 mt-1 rounded-2xl bg-slate-50 border-none font-bold text-left flex items-center justify-between gap-2"
      >
        <span className={`truncate ${selectedOption ? 'text-slate-800' : 'text-slate-400'}`}>
          {selectedOption ? (
            <span className="flex items-center gap-2">
              {selectedOption.colorDot && <span className={`w-3 h-3 rounded-full flex-shrink-0 ${selectedOption.colorDot}`} />}
              <span className="flex flex-col truncate">
                <span className="truncate">{selectedOption.value}</span>
                {selectedOption.subtitle && (
                  <span className="text-[9px] font-medium text-slate-400 normal-case truncate">{selectedOption.subtitle}</span>
                )}
              </span>
            </span>
          ) : placeholder}
        </span>
        <ChevronDown size={16} className={`text-slate-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-2xl shadow-xl border border-slate-100 max-h-56 overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-slate-100 sticky top-0 bg-white">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl">
                <Search size={14} className="text-slate-400 flex-shrink-0" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="bg-transparent text-sm font-medium w-full outline-none placeholder:text-slate-300"
                  autoFocus
                />
              </div>
            </div>
          )}
          <div className="overflow-y-auto max-h-40 no-scrollbar">
            {filtered.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onSelect(opt.value); setIsOpen(false); }}
                className={`w-full px-4 py-3 text-left text-sm hover:bg-blue-50 transition-colors ${selected === opt.value ? 'bg-blue-50 text-blue-600 font-black' : 'text-slate-700 font-semibold'}`}
              >
                <span className="flex items-center gap-2">
                  {opt.colorDot && <span className={`w-3 h-3 rounded-full flex-shrink-0 ${opt.colorDot}`} />}
                  <span className="flex flex-col truncate">
                    <span className="truncate">{opt.value}</span>
                    {opt.subtitle && (
                      <span className="text-[9px] font-medium text-slate-400 normal-case truncate">{opt.subtitle}</span>
                    )}
                  </span>
                </span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-4 py-3 text-xs text-slate-400 italic">Sin resultados</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Multi-Select Activities Component (now takes filtered list) ─── */

function MultiSelectActivities({
  selected,
  onToggle,
  customActivity,
  onCustomActivityChange,
  onAddCustom,
  availableActivities,
}: {
  selected: string[];
  onToggle: (activity: string) => void;
  customActivity: string;
  onCustomActivityChange: (val: string) => void;
  onAddCustom: () => void;
  availableActivities: string[];
}) {
  return (
    <div>
      <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1">
        <Tag size={10} /> Actividades
      </label>
      <div className="flex flex-wrap gap-2 mt-2">
        {availableActivities.map(act => {
          const isSelected = selected.includes(act);
          return (
            <button
              key={act}
              type="button"
              onClick={() => onToggle(act)}
              className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : 'bg-slate-50 text-slate-400 border border-slate-100'
              }`}
            >
              {act}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2 mt-3">
        <input
          type="text"
          value={customActivity}
          onChange={e => onCustomActivityChange(e.target.value)}
          placeholder="Otra actividad..."
          className="flex-1 p-3 rounded-xl bg-slate-50 border-none font-bold text-sm placeholder:text-slate-300"
          onKeyDown={e => { if (e.key === 'Enter' && customActivity.trim()) { e.preventDefault(); onAddCustom(); } }}
        />
        <button
          type="button"
          onClick={onAddCustom}
          disabled={!customActivity.trim()}
          className="px-4 py-3 bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-transform"
        >
          <Plus size={14} />
        </button>
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {selected.map(act => (
            <span key={act} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase">
              {act}
              <button type="button" onClick={() => onToggle(act)} className="hover:text-red-500 transition-colors"><X size={10} /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Photo Upload Component ─── */

function PhotoUpload({
  label,
  photos,
  onPhotosChange,
}: {
  label: string;
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
}) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const newPhotos: string[] = [...photos];
    for (let i = 0; i < files.length; i++) {
      try {
        const compressed = await compressImage(files[i], 800, 0.6);
        newPhotos.push(compressed);
      } catch (e) {
        console.error('Error processing image:', e);
      }
    }
    onPhotosChange(newPhotos);
    // Reset input value so the same file can be selected again
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  return (
    <div>
      <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1">
        <Camera size={10} /> {label}
      </label>
      {/* Camera input — opens camera directly on mobile */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
      {/* Gallery input — opens file picker / gallery */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
      <div className="flex gap-2 mt-2 overflow-x-auto no-scrollbar">
        {photos.map((photo, idx) => (
          <div key={idx} className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden group">
            <img src={photo} alt={`${label} ${idx + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onPhotosChange(photos.filter((_, i) => i !== idx))}
              className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X size={10} />
            </button>
          </div>
        ))}
        {/* Camera button — opens camera directly */}
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="flex-shrink-0 w-20 h-20 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 flex flex-col items-center justify-center gap-1 text-blue-400 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-100 transition-colors"
        >
          <Camera size={18} />
          <span className="text-[7px] font-black uppercase">Cámara</span>
        </button>
        {/* Gallery button — opens file picker / gallery */}
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          className="flex-shrink-0 w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 text-slate-300 hover:border-emerald-400 hover:text-emerald-400 transition-colors"
        >
          <ImageIcon size={18} />
          <span className="text-[7px] font-black uppercase">Galería</span>
        </button>
      </div>
    </div>
  );
}

/* ─── Security Tab Component ─── */

/* ─── Work Schedule Tab Component ─── */

function WorkScheduleTab() {
  const [schedule, setSchedule] = useState<WorkSchedule>(() => loadWorkSchedule());
  const [msg, setMsg] = useState('');

  const handleSave = () => {
    saveWorkSchedule(schedule);
    setMsg('Horario guardado correctamente');
    setTimeout(() => setMsg(''), 3000);
  };

  const handleReset = () => {
    setSchedule(DEFAULT_WORK_SCHEDULE);
    saveWorkSchedule(DEFAULT_WORK_SCHEDULE);
    setMsg('Horario restaurado a valores predeterminados');
    setTimeout(() => setMsg(''), 3000);
  };

  const toggleWorkDay = (day: number) => {
    setSchedule(prev => ({
      ...prev,
      workDays: prev.workDays.includes(day)
        ? prev.workDays.filter(d => d !== day)
        : [...prev.workDays, day].sort(),
    }));
  };

  const DAY_LABELS = [
    { value: 0, label: 'Domingo', short: 'D' },
    { value: 1, label: 'Lunes', short: 'L' },
    { value: 2, label: 'Martes', short: 'M' },
    { value: 3, label: 'Miércoles', short: 'X' },
    { value: 4, label: 'Jueves', short: 'J' },
    { value: 5, label: 'Viernes', short: 'V' },
    { value: 6, label: 'Sábado', short: 'S' },
  ];

  const formatHour = (h: number, m: number) => {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const workHoursPerDay = (schedule.endHour * 60 + schedule.endMinute - schedule.startHour * 60 - schedule.startMinute) / 60;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Clock size={20} className="text-blue-600" />
        <div>
          <p className="font-black text-slate-800 text-sm uppercase">Horario Laboral</p>
          <p className="text-[9px] text-slate-400 font-medium">Configura el horario para el cálculo de tiempos de OT</p>
        </div>
      </div>

      {/* Enable/Disable Toggle */}
      <div className="bg-slate-50 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-slate-800">Cálculo por horas hábiles</p>
            <p className="text-[9px] text-slate-400 font-medium mt-0.5">
              {schedule.enabled
                ? `Solo cuenta tiempo entre ${formatHour(schedule.startHour, schedule.startMinute)} y ${formatHour(schedule.endHour, schedule.endMinute)} en días hábiles`
                : 'Cuenta tiempo completo 24/7 (incluye noches y fines de semana)'}
            </p>
          </div>
          <button
            onClick={() => setSchedule(prev => ({ ...prev, enabled: !prev.enabled }))}
            className={`w-14 h-7 rounded-full transition-colors ${schedule.enabled ? 'bg-blue-600' : 'bg-slate-300'}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${schedule.enabled ? 'translate-x-8' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {/* Schedule Configuration */}
      {schedule.enabled && (
        <>
          {/* Work Hours */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-4">
            <p className="text-[10px] font-black text-blue-600 uppercase">Horario de Trabajo</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Hora inicio</label>
                <div className="flex items-center gap-2 mt-1">
                  <select
                    value={schedule.startHour}
                    onChange={e => setSchedule(prev => ({ ...prev, startHour: parseInt(e.target.value) }))}
                    className="flex-1 p-3 rounded-xl bg-white border border-slate-200 font-bold text-sm"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                    ))}
                  </select>
                  <span className="text-slate-400 font-bold">:</span>
                  <select
                    value={schedule.startMinute}
                    onChange={e => setSchedule(prev => ({ ...prev, startMinute: parseInt(e.target.value) }))}
                    className="flex-1 p-3 rounded-xl bg-white border border-slate-200 font-bold text-sm"
                  >
                    <option value={0}>00</option>
                    <option value={15}>15</option>
                    <option value={30}>30</option>
                    <option value={45}>45</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Hora término</label>
                <div className="flex items-center gap-2 mt-1">
                  <select
                    value={schedule.endHour}
                    onChange={e => setSchedule(prev => ({ ...prev, endHour: parseInt(e.target.value) }))}
                    className="flex-1 p-3 rounded-xl bg-white border border-slate-200 font-bold text-sm"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                    ))}
                  </select>
                  <span className="text-slate-400 font-bold">:</span>
                  <select
                    value={schedule.endMinute}
                    onChange={e => setSchedule(prev => ({ ...prev, endMinute: parseInt(e.target.value) }))}
                    className="flex-1 p-3 rounded-xl bg-white border border-slate-200 font-bold text-sm"
                  >
                    <option value={0}>00</option>
                    <option value={15}>15</option>
                    <option value={30}>30</option>
                    <option value={45}>45</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-3 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Horas hábiles por día</span>
              <span className="text-lg font-black text-blue-600">{workHoursPerDay}h</span>
            </div>
          </div>

          {/* Work Days */}
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 space-y-3">
            <p className="text-[10px] font-black text-emerald-600 uppercase">Días Hábiles</p>
            <div className="grid grid-cols-7 gap-2">
              {DAY_LABELS.map(day => {
                const isActive = schedule.workDays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    onClick={() => toggleWorkDay(day.value)}
                    className={`p-2 rounded-xl text-center transition-all ${
                      isActive
                        ? 'bg-emerald-500 text-white shadow-md'
                        : 'bg-white text-slate-400 border border-slate-200'
                    }`}
                  >
                    <span className="text-sm font-black">{day.short}</span>
                    <span className="block text-[6px] font-bold uppercase mt-0.5">{day.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="bg-white rounded-xl p-3 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">Días hábiles por semana</span>
              <span className="text-lg font-black text-emerald-600">{schedule.workDays.length}</span>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4">
            <p className="text-[10px] font-black text-violet-600 uppercase mb-2">Resumen</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Horario</span>
                <span className="text-slate-700 font-black">{formatHour(schedule.startHour, schedule.startMinute)} - {formatHour(schedule.endHour, schedule.endMinute)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Horas/día</span>
                <span className="text-slate-700 font-black">{workHoursPerDay}h</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-medium">Días/semana</span>
                <span className="text-slate-700 font-black">{schedule.workDays.length}</span>
              </div>
              <div className="flex justify-between text-xs border-t border-violet-200 pt-1.5">
                <span className="text-violet-600 font-bold">Horas hábiles/semana</span>
                <span className="text-violet-700 font-black">{(workHoursPerDay * schedule.workDays.length).toFixed(1)}h</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Save/Reset Buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase active:scale-95 transition-transform"
        >
          Guardar Horario
        </button>
        <button
          onClick={handleReset}
          className="py-3 px-4 bg-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase active:scale-95 transition-transform"
        >
          Restaurar
        </button>
      </div>

      {msg && <p className="text-emerald-500 text-xs font-bold text-center">{msg}</p>}
    </div>
  );
}

function SecurityTab() {
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [msg, setMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChangePwd = () => {
    if (!currentPwd || !newPwd || !confirmPwd) { setErrorMsg('Completa todos los campos'); return; }
    if (!checkAdminPwd(currentPwd)) { setErrorMsg('La clave actual es incorrecta'); setCurrentPwd(''); return; }
    if (newPwd.length < 4) { setErrorMsg('La nueva clave debe tener al menos 4 caracteres'); return; }
    if (newPwd !== confirmPwd) { setErrorMsg('Las claves no coinciden'); return; }
    try { localStorage.setItem(ADMIN_PWD_KEY, newPwd); } catch {}
    setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    setErrorMsg(''); setMsg('Clave actualizada correctamente');
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 rounded-2xl p-4 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <Shield size={20} className="text-blue-600" />
          <div>
            <p className="font-black text-slate-800 text-sm uppercase">Clave de Administración</p>
            <p className="text-[9px] text-slate-400 font-medium">Esta clave protege el acceso al perfil administrador</p>
          </div>
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Clave actual</label>
          <input type="password" value={currentPwd} onChange={e => { setCurrentPwd(e.target.value); setErrorMsg(''); setMsg(''); }} className="w-full p-3 rounded-xl bg-white border border-slate-200 font-bold text-sm mt-1" placeholder="Ingresa la clave actual" />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nueva clave</label>
          <input type="password" value={newPwd} onChange={e => { setNewPwd(e.target.value); setErrorMsg(''); setMsg(''); }} className="w-full p-3 rounded-xl bg-white border border-slate-200 font-bold text-sm mt-1" placeholder="Ingresa la nueva clave" />
        </div>
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Confirmar nueva clave</label>
          <input type="password" value={confirmPwd} onChange={e => { setConfirmPwd(e.target.value); setErrorMsg(''); setMsg(''); }} className="w-full p-3 rounded-xl bg-white border border-slate-200 font-bold text-sm mt-1" placeholder="Repite la nueva clave" />
        </div>
        {errorMsg && <p className="text-red-500 text-xs font-bold text-center">{errorMsg}</p>}
        {msg && <p className="text-emerald-500 text-xs font-bold text-center">{msg}</p>}
        <button onClick={handleChangePwd} className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase active:scale-95 transition-transform">Cambiar Clave</button>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <p className="text-[9px] font-bold text-amber-600 uppercase mb-1">Información</p>
        <p className="text-[10px] text-amber-700 font-medium">La clave predeterminada es <span className="font-black">admin2024</span>. Cámbiala para mayor seguridad. Si olvidas la clave, puedes restaurarla eliminando los datos del navegador.</p>
      </div>
    </div>
  );
}

/* ─── Admin Panel Component ─── */

type AdminTab = 'areas' | 'personal' | 'zonas' | 'seguridad' | 'profiles' | 'horario';

function AdminPanel({
  isOpen,
  onClose,
  workAreas,
  personnel,
  zones,
  onUpdateWorkAreas,
  onUpdatePersonnel,
  onUpdateZones,
  profiles,
  onCreateProfile,
  onUpdateProfile,
  onDeleteProfile,
}: {
  isOpen: boolean;
  onClose: () => void;
  workAreas: WorkArea[];
  personnel: Personnel[];
  zones: Zone[];
  onUpdateWorkAreas: (areas: WorkArea[]) => void;
  onUpdatePersonnel: (p: Personnel[]) => void;
  onUpdateZones: (z: Zone[]) => void;
  profiles: ProfileItem[];
  onCreateProfile: (data: Partial<ProfileItem>) => Promise<ProfileItem | null>;
  onUpdateProfile: (id: string, data: Partial<ProfileItem>) => Promise<ProfileItem | null>;
  onDeleteProfile: (id: string) => Promise<boolean>;
}) {
  const [activeTab, setActiveTab] = useState<AdminTab>('areas');
  const [editingArea, setEditingArea] = useState<WorkArea | null>(null);
  const [editingPerson, setEditingPerson] = useState<Personnel | null>(null);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaColor, setNewAreaColor] = useState('bg-green-600');
  const [newAreaActivities, setNewAreaActivities] = useState('');
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonWorkAreaId, setNewPersonWorkAreaId] = useState('');
  const [newZoneName, setNewZoneName] = useState('');
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfilePassword, setNewProfilePassword] = useState('');
  const [newProfileAccessCode, setNewProfileAccessCode] = useState('');
  const [newProfileWorkAreaIds, setNewProfileWorkAreaIds] = useState<string[]>([]);
  const [newProfileColor, setNewProfileColor] = useState('bg-red-500');
  const [newProfileIcon, setNewProfileIcon] = useState('User');
  const [newProfilePermissions, setNewProfilePermissions] = useState<string[]>(['view']);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editingProfileName, setEditingProfileName] = useState('');
  const [editingProfilePassword, setEditingProfilePassword] = useState('');
  const [editingProfileAccessCode, setEditingProfileAccessCode] = useState('');
  const [editingProfileWorkAreaIds, setEditingProfileWorkAreaIds] = useState<string[]>([]);
  const [editingProfileColor, setEditingProfileColor] = useState('bg-red-500');
  const [editingProfileIcon, setEditingProfileIcon] = useState('User');
  const [editingProfilePermissions, setEditingProfilePermissions] = useState<string[]>(['view']);

  const COLOR_OPTIONS = [
    'bg-green-600', 'bg-orange-500', 'bg-cyan-500', 'bg-purple-500', 'bg-yellow-500',
    'bg-red-500', 'bg-blue-500', 'bg-pink-500', 'bg-teal-500', 'bg-indigo-500',
    'bg-emerald-600', 'bg-amber-500', 'bg-rose-500', 'bg-violet-500', 'bg-sky-500',
  ];

  const PROFILE_ICON_OPTIONS = [
    { value: 'User', label: 'Usuario' },
    { value: 'Shield', label: 'Escudo' },
    { value: 'Wrench', label: 'Llave' },
    { value: 'Leaf', label: 'Hoja' },
    { value: 'Droplets', label: 'Gotas' },
    { value: 'Zap', label: 'Rayo' },
    { value: 'Brush', label: 'Escoba' },
    { value: 'Trash2', label: 'Basura' },
    { value: 'HardHat', label: 'Casco' },
    { value: 'ClipboardList', label: 'Portapapeles' },
    { value: 'Eye', label: 'Ojo' },
    { value: 'Star', label: 'Estrella' },
  ];

  const PERMISSION_OPTIONS = [
    { value: 'view', label: 'Visualizar', desc: 'Ver OTs, subir fotos y completar', color: 'bg-blue-500' },
    { value: 'guardia', label: 'Guardia', desc: 'Escanear QRs de ubicaciones y registrar rondas', color: 'bg-teal-500' },
    { value: 'supervisor', label: 'Supervisor', desc: 'Ve TODAS las OTs (pendientes, en proceso, terminadas)', color: 'bg-violet-500' },
    { value: 'create', label: 'Crear', desc: 'Crear nuevas OTs', color: 'bg-emerald-500' },
    { value: 'edit', label: 'Editar', desc: 'Editar OTs existentes', color: 'bg-amber-500' },
    { value: 'delete', label: 'Eliminar', desc: 'Eliminar OTs', color: 'bg-red-500' },
  ];

  if (!isOpen) return null;

  // Work Area CRUD
  const handleAddArea = () => {
    const trimmed = newAreaName.trim();
    if (!trimmed) return;
    const activities = newAreaActivities.split(',').map(a => a.trim()).filter(Boolean);
    const newArea: WorkArea = { id: 'wa_' + generateUniqueId(), name: trimmed, activities, color: newAreaColor };
    onUpdateWorkAreas([...workAreas, newArea]);
    setNewAreaName('');
    setNewAreaActivities('');
    setNewAreaColor('bg-green-600');
  };

  const handleDeleteArea = (id: string) => {
    onUpdateWorkAreas(workAreas.filter(a => a.id !== id));
    // Also remove personnel references
    onUpdatePersonnel(personnel.filter(p => p.workAreaId !== id));
  };

  const handleSaveArea = () => {
    if (!editingArea) return;
    const activities = newAreaActivities.split(',').map(a => a.trim()).filter(Boolean);
    const updated = workAreas.map(a => a.id === editingArea.id ? { ...a, name: newAreaName.trim() || a.name, activities, color: newAreaColor } : a);
    onUpdateWorkAreas(updated);
    setEditingArea(null);
    setNewAreaName('');
    setNewAreaActivities('');
    setNewAreaColor('bg-green-600');
  };

  const startEditArea = (area: WorkArea) => {
    setEditingArea(area);
    setNewAreaName(area.name);
    setNewAreaActivities(area.activities.join(', '));
    setNewAreaColor(area.color);
  };

  // Personnel CRUD
  const handleAddPerson = () => {
    const trimmed = newPersonName.trim();
    if (!trimmed || !newPersonWorkAreaId) return;
    const newPerson: Personnel = { id: 'p_' + generateUniqueId(), name: trimmed, workAreaId: newPersonWorkAreaId };
    onUpdatePersonnel([...personnel, newPerson]);
    setNewPersonName('');
    setNewPersonWorkAreaId('');
  };

  const handleDeletePerson = (id: string) => {
    onUpdatePersonnel(personnel.filter(p => p.id !== id));
  };

  const handleSavePerson = () => {
    if (!editingPerson) return;
    const updated = personnel.map(p => p.id === editingPerson.id ? { ...p, name: newPersonName.trim() || p.name, workAreaId: newPersonWorkAreaId || p.workAreaId } : p);
    onUpdatePersonnel(updated);
    setEditingPerson(null);
    setNewPersonName('');
    setNewPersonWorkAreaId('');
  };

  const startEditPerson = (person: Personnel) => {
    setEditingPerson(person);
    setNewPersonName(person.name);
    setNewPersonWorkAreaId(person.workAreaId);
  };

  // Zone CRUD
  const handleAddZone = () => {
    const trimmed = newZoneName.trim();
    if (!trimmed) return;
    const newZone: Zone = { id: 'z_' + generateUniqueId(), name: trimmed };
    onUpdateZones([...zones, newZone]);
    setNewZoneName('');
  };

  const handleDeleteZone = (id: string) => {
    onUpdateZones(zones.filter(z => z.id !== id));
  };

  const handleSaveZone = () => {
    if (!editingZone) return;
    const updated = zones.map(z => z.id === editingZone.id ? { ...z, name: newZoneName.trim() || z.name } : z);
    onUpdateZones(updated);
    setEditingZone(null);
    setNewZoneName('');
  };

  const startEditZone = (zone: Zone) => {
    setEditingZone(zone);
    setNewZoneName(zone.name);
  };

  const getWorkAreaName = (id: string) => workAreas.find(a => a.id === id)?.name ?? 'Sin área';

  // Profile CRUD
  const handleAddProfile = async () => {
    if (!newProfileName.trim()) return;
    await onCreateProfile({ name: newProfileName.trim(), password: newProfilePassword, accessCode: newProfileAccessCode.trim().toUpperCase(), color: newProfileColor, icon: newProfileIcon, workAreaIds: newProfileWorkAreaIds, permissions: newProfilePermissions });
    setNewProfileName('');
    setNewProfilePassword('');
    setNewProfileAccessCode('');
    setNewProfileWorkAreaIds([]);
    setNewProfileColor('bg-red-500');
    setNewProfileIcon('User');
    setNewProfilePermissions(['view']);
  };

  const handleSaveProfile = async () => {
    if (!editingProfileId || !editingProfileName.trim()) return;
    const updateData: Record<string, unknown> = { name: editingProfileName.trim(), accessCode: editingProfileAccessCode.trim().toUpperCase(), workAreaIds: editingProfileWorkAreaIds, color: editingProfileColor, icon: editingProfileIcon, permissions: editingProfilePermissions };
    // Only send password if it was changed (non-empty)
    if (editingProfilePassword.trim()) {
      updateData.password = editingProfilePassword.trim();
    }
    await onUpdateProfile(editingProfileId, updateData as any);
    setEditingProfileId(null);
    setEditingProfilePassword('');
  };

  const handleDeleteProfile = async (id: string) => {
    if (confirm('¿Eliminar este perfil?')) {
      await onDeleteProfile(id);
    }
  };

  const profilesList = profiles;

  const tabs: { key: AdminTab; label: string }[] = [
    { key: 'areas', label: 'Áreas' },
    { key: 'personal', label: 'Personal' },
    { key: 'zonas', label: 'Zonas' },
    { key: 'profiles', label: 'Perfiles' },
    { key: 'horario', label: 'Horario' },
    { key: 'seguridad', label: 'Clave' },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-slate-100 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors active:scale-95">
              <ChevronLeft size={18} className="text-slate-600" />
            </button>
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
              <Settings size={18} /> Administración
            </h2>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setEditingArea(null); setEditingPerson(null); setEditingZone(null); }}
              className={`flex-1 py-3 text-[9px] font-black uppercase transition-all ${
                activeTab === tab.key
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4 pb-32">
          {/* ─── Work Areas Tab ─── */}
          {activeTab === 'areas' && (
            <>
              {workAreas.map(area => (
                <div key={area.id} className="bg-slate-50 rounded-2xl p-4">
                  {editingArea?.id === area.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={newAreaName}
                        onChange={e => setNewAreaName(e.target.value)}
                        className="w-full p-3 rounded-xl bg-white border border-slate-200 font-bold text-sm"
                        placeholder="Nombre del área"
                      />
                      <input
                        type="text"
                        value={newAreaActivities}
                        onChange={e => setNewAreaActivities(e.target.value)}
                        className="w-full p-3 rounded-xl bg-white border border-slate-200 font-bold text-sm"
                        placeholder="Actividades separadas por coma"
                      />
                      <div className="flex flex-wrap gap-1">
                        {COLOR_OPTIONS.map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setNewAreaColor(c)}
                            className={`w-6 h-6 rounded-full ${c} ${newAreaColor === c ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                          />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleSaveArea} className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase">Guardar</button>
                        <button onClick={() => { setEditingArea(null); setNewAreaName(''); setNewAreaActivities(''); }} className="px-4 py-2 bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-4 h-4 rounded-full ${area.color}`} />
                          <span className="font-black text-slate-800 text-sm uppercase">{area.name}</span>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => startEditArea(area)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><Pencil size={14} /></button>
                          <button onClick={() => handleDeleteArea(area.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {area.activities.map(act => (
                          <span key={act} className="px-2 py-1 bg-white text-slate-500 rounded-lg text-[9px] font-bold">{act}</span>
                        ))}
                      </div>
                      <p className="text-[8px] text-slate-400 mt-2 font-bold uppercase">
                        {personnel.filter(p => p.workAreaId === area.id).length} persona(s)
                      </p>
                    </div>
                  )}
                </div>
              ))}

              {/* Add new area */}
              {!editingArea && (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-4 space-y-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase">Agregar Área de Trabajo</p>
                  <input
                    type="text"
                    value={newAreaName}
                    onChange={e => setNewAreaName(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 border-none font-bold text-sm"
                    placeholder="Nombre del área"
                  />
                  <input
                    type="text"
                    value={newAreaActivities}
                    onChange={e => setNewAreaActivities(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 border-none font-bold text-sm"
                    placeholder="Actividades separadas por coma"
                  />
                  <div className="flex flex-wrap gap-1">
                    {COLOR_OPTIONS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewAreaColor(c)}
                        className={`w-6 h-6 rounded-full ${c} ${newAreaColor === c ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={handleAddArea}
                    disabled={!newAreaName.trim()}
                    className="w-full py-3 bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase disabled:opacity-30"
                  >
                    <Plus size={14} className="inline mr-1" /> Agregar Área
                  </button>
                </div>
              )}
            </>
          )}

          {/* ─── Personnel Tab ─── */}
          {activeTab === 'personal' && (
            <>
              {personnel.map(person => (
                <div key={person.id} className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between">
                  {editingPerson?.id === person.id ? (
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={newPersonName}
                        onChange={e => setNewPersonName(e.target.value)}
                        className="w-full p-3 rounded-xl bg-white border border-slate-200 font-bold text-sm"
                        placeholder="Nombre completo"
                      />
                      <select
                        value={newPersonWorkAreaId}
                        onChange={e => setNewPersonWorkAreaId(e.target.value)}
                        className="w-full p-3 rounded-xl bg-white border border-slate-200 font-bold text-sm"
                      >
                        <option value="">Seleccionar área...</option>
                        {workAreas.map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button onClick={handleSavePerson} className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase">Guardar</button>
                        <button onClick={() => { setEditingPerson(null); setNewPersonName(''); setNewPersonWorkAreaId(''); }} className="px-4 py-2 bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="font-black text-slate-800 text-sm">{person.name}</p>
                        <p className="text-[9px] font-medium text-slate-400">{getWorkAreaName(person.workAreaId)}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => startEditPerson(person)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><Pencil size={14} /></button>
                        <button onClick={() => handleDeletePerson(person.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {/* Add new person */}
              {!editingPerson && (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-4 space-y-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase">Agregar Personal</p>
                  <input
                    type="text"
                    value={newPersonName}
                    onChange={e => setNewPersonName(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 border-none font-bold text-sm"
                    placeholder="Nombre completo"
                  />
                  <select
                    value={newPersonWorkAreaId}
                    onChange={e => setNewPersonWorkAreaId(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-50 border-none font-bold text-sm"
                  >
                    <option value="">Seleccionar área...</option>
                    {workAreas.map(a => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddPerson}
                    disabled={!newPersonName.trim() || !newPersonWorkAreaId}
                    className="w-full py-3 bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase disabled:opacity-30"
                  >
                    <Plus size={14} className="inline mr-1" /> Agregar Personal
                  </button>
                </div>
              )}
            </>
          )}

          {/* ─── Zones Tab ─── */}
          {activeTab === 'zonas' && (
            <>
              {zones.map(zone => (
                <div key={zone.id} className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between">
                  {editingZone?.id === zone.id ? (
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        value={newZoneName}
                        onChange={e => setNewZoneName(e.target.value)}
                        className="flex-1 p-3 rounded-xl bg-white border border-slate-200 font-bold text-sm"
                        placeholder="Nombre de zona"
                      />
                      <button onClick={handleSaveZone} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase">Guardar</button>
                      <button onClick={() => { setEditingZone(null); setNewZoneName(''); }} className="px-3 py-2 bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase">X</button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-slate-400" />
                        <span className="font-bold text-slate-700 text-sm">{zone.name}</span>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => startEditZone(zone)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"><Pencil size={14} /></button>
                        <button onClick={() => handleDeleteZone(zone.id)} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {/* Add new zone */}
              {!editingZone && (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-4 space-y-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase">Agregar Zona</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newZoneName}
                      onChange={e => setNewZoneName(e.target.value)}
                      className="flex-1 p-3 rounded-xl bg-slate-50 border-none font-bold text-sm"
                      placeholder="Nombre de zona"
                    />
                    <button
                      onClick={handleAddZone}
                      disabled={!newZoneName.trim()}
                      className="px-4 py-3 bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase disabled:opacity-30"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'horario' && <WorkScheduleTab />}
          {activeTab === 'seguridad' && <SecurityTab />}

          {/* ─── Profiles Tab ─── */}
          {activeTab === 'profiles' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <Users size={20} className="text-purple-600" />
                <div>
                  <p className="font-black text-slate-800 text-sm uppercase">Perfiles por Cargo</p>
                  <p className="text-[9px] text-slate-400 font-medium">Crea perfiles para cada cargo. Los usuarios con perfil solo pueden ver OTs de sus áreas, subir fotos y completar OTs.</p>
                </div>
              </div>

              {/* Add new profile form */}
              <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                <p className="text-[9px] font-black text-slate-400 uppercase">Nuevo Perfil</p>
                <input
                  type="text"
                  value={newProfileName}
                  onChange={e => setNewProfileName(e.target.value)}
                  placeholder="Nombre del cargo (ej: Supervisor, Jardinería...)"
                  className="w-full p-3 rounded-xl bg-white border border-slate-200 font-bold text-sm"
                />
                <input
                  type="password"
                  value={newProfilePassword}
                  onChange={e => setNewProfilePassword(e.target.value)}
                  placeholder="Contraseña (opcional)"
                  className="w-full p-3 rounded-xl bg-white border border-slate-200 font-bold text-sm"
                />
                <div>
                  <input
                    type="text"
                    value={newProfileAccessCode}
                    onChange={e => setNewProfileAccessCode(e.target.value.toUpperCase())}
                    placeholder="Código de acceso (ej: JARD1)"
                    maxLength={20}
                    className="w-full p-3 rounded-xl bg-white border border-slate-200 font-bold text-sm tracking-widest"
                  />
                  <p className="text-[8px] text-violet-400 font-bold mt-1 flex items-center gap-1">
                    <KeyRound size={8} /> Si asignas un código, este perfil se ocultará del inicio y solo será accesible ingresando el código
                  </p>
                </div>
                {/* Color selector */}
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Color del perfil</p>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewProfileColor(c)}
                        className={`w-8 h-8 rounded-xl ${c} transition-all ${
                          newProfileColor === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'opacity-60 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                {/* Icon selector */}
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Icono del perfil</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PROFILE_ICON_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setNewProfileIcon(opt.value)}
                        className={`px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${
                          newProfileIcon === opt.value
                            ? 'bg-slate-700 text-white shadow-md'
                            : 'bg-white text-slate-400 border border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Permissions selector */}
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Permisos del perfil</p>
                  <div className="space-y-2">
                    {PERMISSION_OPTIONS.map(perm => {
                      const isActive = newProfilePermissions.includes(perm.value);
                      return (
                        <button
                          key={perm.value}
                          type="button"
                          onClick={() => {
                            setNewProfilePermissions(prev => {
                              if (perm.value === 'view') return prev; // view is always on
                              return prev.includes(perm.value)
                                ? prev.filter(p => p !== perm.value)
                                : [...prev, perm.value];
                            });
                          }}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                            isActive
                              ? 'bg-white border-2 border-slate-300 shadow-sm'
                              : 'bg-white border border-slate-100 opacity-50 hover:opacity-80'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg ${perm.color} flex items-center justify-center flex-shrink-0 ${isActive ? '' : 'opacity-40'}`}>
                            {perm.value === 'view' && <Eye size={14} className="text-white" />}
                            {perm.value === 'guardia' && <Scan size={14} className="text-white" />}
                            {perm.value === 'supervisor' && <ShieldCheck size={14} className="text-white" />}
                            {perm.value === 'create' && <Plus size={14} className="text-white" />}
                            {perm.value === 'edit' && <Pencil size={14} className="text-white" />}
                            {perm.value === 'delete' && <Trash2 size={14} className="text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-slate-700 uppercase">{perm.label}</p>
                            <p className="text-[8px] text-slate-400 font-medium">{perm.desc}</p>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            isActive ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                          }`}>
                            {isActive && <span className="text-white text-[8px]">✓</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* Work area selector - checkboxes */}
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Áreas de trabajo que puede ver</p>
                  <div className="flex flex-wrap gap-2">
                    {workAreas.map(wa => (
                      <button
                        key={wa.id}
                        type="button"
                        onClick={() => {
                          setNewProfileWorkAreaIds(prev =>
                            prev.includes(wa.id) ? prev.filter(id => id !== wa.id) : [...prev, wa.id]
                          );
                        }}
                        className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                          newProfileWorkAreaIds.includes(wa.id)
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'bg-white text-slate-400 border border-slate-200'
                        }`}
                      >
                        {wa.name}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleAddProfile}
                  disabled={!newProfileName.trim()}
                  className="w-full py-3 bg-purple-600 text-white rounded-xl font-black text-[10px] uppercase disabled:opacity-30 active:scale-95 transition-transform"
                >
                  Crear Perfil
                </button>
              </div>

              {/* Existing profiles list */}
              {profilesList.map(profile => (
                <div key={profile.id} className="bg-white rounded-2xl p-4 border border-slate-100 space-y-3">
                  {editingProfileId === profile.id ? (
                    // Edit mode
                    <>
                      <input
                        type="text"
                        value={editingProfileName}
                        onChange={e => setEditingProfileName(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm"
                      />
                      <input
                        type="password"
                        value={editingProfilePassword}
                        onChange={e => setEditingProfilePassword(e.target.value)}
                        placeholder={profile.hasPassword ? 'Dejar vacío para mantener actual' : 'Nueva contraseña (opcional)'}
                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm"
                      />
                      <div>
                        <input
                          type="text"
                          value={editingProfileAccessCode}
                          onChange={e => setEditingProfileAccessCode(e.target.value.toUpperCase())}
                          placeholder={profile.accessCode ? `Código actual: ${profile.accessCode}` : 'Código de acceso (ej: JARD1)'}
                          maxLength={20}
                          className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm tracking-widest"
                        />
                        <p className="text-[8px] text-violet-400 font-bold mt-1 flex items-center gap-1">
                          <KeyRound size={8} /> Si tiene código, el perfil se oculta del inicio y solo se accede con el código
                        </p>
                      </div>
                      {/* Color selector */}
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Color del perfil</p>
                        <div className="flex flex-wrap gap-2">
                          {COLOR_OPTIONS.map(c => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setEditingProfileColor(c)}
                              className={`w-8 h-8 rounded-xl ${c} transition-all ${
                                editingProfileColor === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'opacity-60 hover:opacity-100'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {/* Icon selector */}
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Icono del perfil</p>
                        <div className="flex flex-wrap gap-1.5">
                          {PROFILE_ICON_OPTIONS.map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setEditingProfileIcon(opt.value)}
                              className={`px-2.5 py-1.5 rounded-xl text-[9px] font-black uppercase transition-all ${
                                editingProfileIcon === opt.value
                                  ? 'bg-slate-700 text-white shadow-md'
                                  : 'bg-slate-50 text-slate-400 border border-slate-100 hover:border-slate-300'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Permissions selector */}
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Permisos del perfil</p>
                        <div className="space-y-2">
                          {PERMISSION_OPTIONS.map(perm => {
                            const isActive = editingProfilePermissions.includes(perm.value);
                            return (
                              <button
                                key={perm.value}
                                type="button"
                                onClick={() => {
                                  setEditingProfilePermissions(prev => {
                                    if (perm.value === 'view') return prev; // view is always on
                                    return prev.includes(perm.value)
                                      ? prev.filter(p => p !== perm.value)
                                      : [...prev, perm.value];
                                  });
                                }}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                                  isActive
                                    ? 'bg-white border-2 border-slate-300 shadow-sm'
                                    : 'bg-white border border-slate-100 opacity-50 hover:opacity-80'
                                }`}
                              >
                                <div className={`w-8 h-8 rounded-lg ${perm.color} flex items-center justify-center flex-shrink-0 ${isActive ? '' : 'opacity-40'}`}>
                                  {perm.value === 'view' && <Eye size={14} className="text-white" />}
                                  {perm.value === 'guardia' && <Scan size={14} className="text-white" />}
                                  {perm.value === 'supervisor' && <ShieldCheck size={14} className="text-white" />}
                                  {perm.value === 'create' && <Plus size={14} className="text-white" />}
                                  {perm.value === 'edit' && <Pencil size={14} className="text-white" />}
                                  {perm.value === 'delete' && <Trash2 size={14} className="text-white" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] font-black text-slate-700 uppercase">{perm.label}</p>
                                  <p className="text-[8px] text-slate-400 font-medium">{perm.desc}</p>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                  isActive ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                                }`}>
                                  {isActive && <span className="text-white text-[8px]">✓</span>}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Áreas de trabajo que puede ver</p>
                        <div className="flex flex-wrap gap-2">
                          {workAreas.map(wa => (
                            <button
                              key={wa.id}
                              type="button"
                              onClick={() => {
                                setEditingProfileWorkAreaIds(prev =>
                                  prev.includes(wa.id) ? prev.filter(id => id !== wa.id) : [...prev, wa.id]
                                );
                              }}
                              className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                                editingProfileWorkAreaIds.includes(wa.id)
                                  ? 'bg-purple-600 text-white shadow-md'
                                  : 'bg-slate-50 text-slate-400 border border-slate-100'
                              }`}
                            >
                              {wa.name}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveProfile}
                          className="flex-1 py-2 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase active:scale-95 transition-transform"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => setEditingProfileId(null)}
                          className="flex-1 py-2 bg-slate-200 text-slate-500 rounded-xl font-bold text-[10px] uppercase"
                        >
                          Cancelar
                        </button>
                      </div>
                    </>
                  ) : (
                    // View mode
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`w-4 h-4 rounded-full ${profile.color || 'bg-slate-400'}`} />
                            <p className="font-black text-slate-800 text-sm uppercase">{profile.name}</p>
                            {profile.hasPassword && (
                              <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 text-amber-500 rounded-full text-[7px] font-black uppercase">
                                <Shield size={7} /> con clave
                              </span>
                            )}
                            {profile.accessCode && (
                              <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-violet-50 text-violet-500 rounded-full text-[7px] font-black uppercase">
                                <KeyRound size={7} /> {profile.accessCode}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(profile.permissions || ['view']).map(p => {
                              const permOpt = PERMISSION_OPTIONS.find(o => o.value === p);
                              return permOpt ? (
                                <span key={p} className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase text-white ${permOpt.color}`}>
                                  {permOpt.label}
                                </span>
                              ) : null;
                            })}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {profile.workAreaIds.map(waId => {
                              const wa = workAreas.find(a => a.id === waId);
                              return wa ? (
                                <span key={waId} className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase text-white ${wa.color}`}>
                                  {wa.name}
                                </span>
                              ) : null;
                            })}
                            {profile.workAreaIds.length === 0 && (
                              <span className="text-[9px] text-slate-300 italic">Sin áreas asignadas</span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingProfileId(profile.id);
                              setEditingProfileName(profile.name);
                              setEditingProfilePassword('');
                              setEditingProfileAccessCode(profile.accessCode || '');
                              setEditingProfileWorkAreaIds([...profile.workAreaIds]);
                              setEditingProfileColor(profile.color || 'bg-red-500');
                              setEditingProfileIcon(profile.icon || 'User');
                              setEditingProfilePermissions(profile.permissions?.length ? [...profile.permissions] : ['view']);
                            }}
                            className="p-2 bg-blue-50 text-blue-600 rounded-xl active:scale-95 transition-transform"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteProfile(profile.id)}
                            className="p-2 bg-red-50 text-red-500 rounded-xl active:scale-95 transition-transform"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {profilesList.length === 0 && (
                <div className="text-center py-8">
                  <Users className="mx-auto text-slate-200 mb-3" size={40} />
                  <p className="text-slate-300 text-xs font-bold uppercase">No hay perfiles creados</p>
                  <p className="text-slate-300 text-[9px] mt-1">Crea perfiles para que los trabajadores accedan según su cargo</p>
                </div>
              )}
            </div>
          )}
        </div>
    </div>
  );
}

/* ─── Modal Component ─── */

function ModalInner({
  editingItem,
  onClose,
  onSave,
  onDelete,
  onGeneratePDF,
  workAreas,
  personnel,
  zones,
  userRole,
  permissions,
}: {
  editingItem: Partial<WorkOrder> | null;
  onClose: () => void;
  onSave: (data: Partial<WorkOrder>) => void;
  onDelete: (id: string) => void;
  onGeneratePDF: (ot: Partial<WorkOrder>) => void;
  workAreas: WorkArea[];
  personnel: Personnel[];
  zones: Zone[];
  userRole: UserRole;
  permissions?: string[];
}) {
  const schedule = loadWorkSchedule();
  const [form, setForm] = useState(() => {
    // Try to infer work area from editing item's activities
    let initialWorkAreaId = '';
    if (editingItem?.activities && editingItem.activities.length > 0) {
      for (const wa of loadWorkAreas()) {
        if (editingItem.activities.some(a => wa.activities.includes(a))) {
          initialWorkAreaId = wa.id;
          break;
        }
      }
    }
    return {
      id: editingItem?.id,
      otId: editingItem?.otId,
      workAreaId: initialWorkAreaId,
      activities: editingItem?.activities ?? [],
      collaborators: editingItem?.collaborators ?? [],
      zoneName: editingItem?.zoneName ?? '',
      description: editingItem?.description ?? '',
      status: editingItem?.status ?? 'Pendiente',
      plannedDate: editingItem?.plannedDate ?? null,
      createdAt: editingItem?.createdAt,
      photosBefore: editingItem?.photosBefore ?? [],
      photosAfter: editingItem?.photosAfter ?? [],
    };
  });
  const [validationError, setValidationError] = useState('');
  const [activitiesText, setActivitiesText] = useState((editingItem?.activities ?? []).join(', '));

  const isProfileRole = typeof userRole === 'string' && userRole.startsWith('profile:');
  const perms = permissions ?? ['view'];
  const isSupervisorProfile = isProfileRole && perms.includes('supervisor');
  // Read-only for profile users without edit permission (editing existing items)
  // or without create permission (creating new items)
  const canEditThis = editingItem?.id ? perms.includes('edit') : perms.includes('create');
  const isReadOnly = isProfileRole && !canEditThis;

  // Derived filtered data based on selected work area
  const selectedWorkArea = workAreas.find(wa => wa.id === form.workAreaId);
  // Always show ALL personnel so users can freely select from any area
  // Personnel from the selected work area appear first
  const allCollaborators = personnel.map(p => ({
    name: p.name,
    workAreaName: workAreas.find(wa => wa.id === p.workAreaId)?.name ?? '',
    workAreaId: p.workAreaId,
  }));
  // Sort: personnel from selected work area first, then others
  const filteredCollaborators = form.workAreaId
    ? [
        ...allCollaborators.filter(c => c.workAreaId === form.workAreaId),
        ...allCollaborators.filter(c => c.workAreaId !== form.workAreaId),
      ]
    : allCollaborators;

  const workAreaOptions = workAreas.map(wa => ({
    value: wa.id,
    subtitle: `${wa.activities.length} actividades, ${personnel.filter(p => p.workAreaId === wa.id).length} personas`,
    colorDot: wa.color,
  }));

  // Handle work area change
  const handleWorkAreaChange = useCallback((workAreaId: string) => {
    const wa = workAreas.find(a => a.id === workAreaId);
    if (!wa) {
      setForm(prev => ({ ...prev, workAreaId: '', collaborators: [] }));
      return;
    }

    // Auto-select personnel from the new work area (replaces previous selection)
    // Users can then manually adjust via the collaborator selector
    const areaPersonnel = personnel.filter(p => p.workAreaId === workAreaId).map(p => p.name);

    setForm(prev => ({
      ...prev,
      workAreaId,
      collaborators: areaPersonnel,
    }));
    setValidationError('');
  }, [workAreas, personnel]);



  const handleToggleCollaborator = useCallback((name: string) => {
    setForm(prev => {
      const newCollaborators = prev.collaborators.includes(name)
        ? prev.collaborators.filter(c => c !== name)
        : [...prev.collaborators, name];
      return {
        ...prev,
        collaborators: newCollaborators,
      };
    });
    setValidationError('');
  }, []);



  const handleDescriptionChange = (value: string) => {
    setForm(prev => ({ ...prev, description: value }));
    setValidationError('');
  };

  const handleSave = () => {
    // Parse activities from text
    const parsedActivities = activitiesText.split(',').map(a => a.trim()).filter(Boolean);
    if (!form.workAreaId) {
      setValidationError('Selecciona un área de trabajo');
      return;
    }
    if (parsedActivities.length === 0) {
      setValidationError('Ingresa al menos una actividad');
      return;
    }
    if (!form.zoneName.trim()) {
      setValidationError('Ingresa un lugar');
      return;
    }
    if (!form.description.trim()) {
      setValidationError('La descripción del trabajo es obligatoria');
      return;
    }
    if (form.collaborators.length === 0) {
      setValidationError('Selecciona al menos un responsable');
      return;
    }
    setValidationError('');
    onSave({ ...form, activities: parsedActivities });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] max-h-[90vh] overflow-y-auto p-8 shadow-2xl no-scrollbar">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Detalle Planificación</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full"><X size={20} /></button>
        </div>

        <div className="space-y-5">
          {/* 1. Work Area Selector */}
          <Dropdown
            label="Área de Trabajo"
            icon={Settings}
            options={workAreaOptions}
            selected={form.workAreaId}
            onSelect={isReadOnly ? () => {} : handleWorkAreaChange}
            placeholder="Seleccionar área de trabajo..."
          />

          {/* 2. Activities (manual text input) */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1">
              <Tag size={10} /> Actividades *
            </label>
            <textarea
              className="w-full p-4 mt-1 rounded-2xl bg-slate-50 border-none font-medium text-sm min-h-[60px] disabled:opacity-50"
              placeholder="Ej: Corte De Pasto, Desmalezado, Riego"
              value={activitiesText}
              onChange={isReadOnly ? undefined : e => { setActivitiesText(e.target.value); setValidationError(''); }}
              disabled={isReadOnly}
              rows={2}
            />
            <p className="text-[9px] text-slate-400 mt-1 ml-1">Separa actividades con coma</p>
          </div>

          {/* 3. Collaborators (all personnel available, area personnel shown first) */}
          <MultiSelectCollaborators
            selected={form.collaborators}
            onToggle={isReadOnly ? () => {} : handleToggleCollaborator}
            availableCollaborators={filteredCollaborators}
            selectedWorkAreaId={form.workAreaId}
          />

          {/* 4. Lugar */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1">
              <MapPin size={10} /> Lugar *
            </label>
            <input
              type="text"
              value={form.zoneName}
              onChange={isReadOnly ? undefined : e => { setForm(prev => ({ ...prev, zoneName: e.target.value })); setValidationError(''); }}
              placeholder="Ej: Entrada Norte, Piscina 1, Portería"
              className="w-full p-4 mt-1 rounded-2xl bg-slate-50 border-none font-bold text-sm disabled:opacity-50"
              disabled={isReadOnly}
            />
          </div>

          {/* 4b. Planned Date */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1">
              <CalendarDays size={10} /> Fecha de Planificación
            </label>
            <input
              type="date"
              value={form.plannedDate ? new Date(form.plannedDate).toISOString().split('T')[0] : ''}
              onChange={isReadOnly ? undefined : e => {
                const val = e.target.value;
                setForm(prev => ({
                  ...prev,
                  plannedDate: val ? new Date(val + 'T12:00:00').getTime() : null,
                }));
                setValidationError('');
              }}
              disabled={isReadOnly}
              className="w-full p-4 mt-1 rounded-2xl bg-slate-50 border-none font-bold text-sm disabled:opacity-50"
            />
            {!isReadOnly && form.plannedDate && (
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, plannedDate: null }))}
                className="mt-1 text-[9px] font-bold text-red-400 uppercase flex items-center gap-1 ml-1"
              >
                <X size={9} /> Quitar fecha
              </button>
            )}
          </div>

          {/* 5. Descripción del trabajo */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Descripción del trabajo *</label>
            <textarea
              className="w-full p-4 mt-1 rounded-2xl bg-slate-50 border-none font-medium text-sm min-h-[80px] disabled:opacity-50"
              placeholder="Describe el trabajo a realizar..."
              value={form.description}
              onChange={isReadOnly ? undefined : e => handleDescriptionChange(e.target.value)}
              disabled={isReadOnly}
            />
          </div>

          {/* 6. Photos */}
          <PhotoUpload
            label="Fotos Antes"
            photos={form.photosBefore}
            onPhotosChange={(p) => setForm(prev => ({ ...prev, photosBefore: p }))}
          />
          <PhotoUpload
            label="Fotos Después"
            photos={form.photosAfter}
            onPhotosChange={(p) => setForm(prev => ({ ...prev, photosAfter: p }))}
          />

          {/* 7. Status */}
          <div className="flex gap-2">
            {Object.keys(STATUS_CONFIG).map(s => {
              // Supervisor profiles can change to any status (like admin)
              // Regular profiles can only change to "Terminada"
              // Non-profile non-admin: Terminada is restricted
              const isRestricted = isProfileRole
                ? !isSupervisorProfile && s !== 'Terminada'  // regular profiles: only Terminada
                : s === 'Terminada' && userRole !== 'admin';  // original logic for non-profiles
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => !isRestricted && setForm(prev => ({ ...prev, status: s }))}
                  disabled={isRestricted}
                  className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${
                    isRestricted
                      ? 'bg-slate-50 text-slate-200 cursor-not-allowed'
                      : form.status === s
                        ? `${STATUS_CONFIG[s].color} text-white`
                        : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isRestricted ? <span className="flex items-center justify-center gap-1"><Shield size={10} /> {s}</span> : s}
                </button>
              );
            })}
          </div>

          {/* 8. Timestamps (Admin & Supervisor only) */}
          {(userRole === 'admin' || isSupervisorProfile) && editingItem?.id && (
            <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <CalendarDays size={10} /> Registro de Fechas y Horarios
              </p>
              <div className="space-y-1.5">
                {(editingItem.plannedDate || form.plannedDate) && (
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-violet-500 uppercase">Planificada</span>
                    <span className="text-[10px] font-bold text-slate-600">{formatDate(editingItem.plannedDate ?? form.plannedDate ?? null)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-blue-500 uppercase">Creada</span>
                  <span className="text-[10px] font-bold text-slate-600">{formatDateTime(editingItem.createdAt ?? null)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-amber-500 uppercase">En Proceso</span>
                  <span className="text-[10px] font-bold text-slate-600">{formatDateTime(editingItem.startedAt ?? null)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold text-emerald-500 uppercase">Terminada</span>
                  <span className="text-[10px] font-bold text-slate-600">{formatDateTime(editingItem.completedAt ?? null)}</span>
                </div>
                {editingItem.startedAt && (
                  <div className="pt-1.5 border-t border-slate-200">
                    <div className="flex justify-between items-center">
                      <span className="text-[8px] font-bold text-slate-400">Tiempo de espera</span>
                      <span className="text-[9px] font-black text-red-500">{formatWorkingDuration(calcWorkingMs(editingItem.createdAt ?? 0, editingItem.startedAt!, schedule), schedule)}</span>
                    </div>
                    {editingItem.completedAt && (
                      <>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[8px] font-bold text-slate-400">Tiempo de proceso</span>
                          <span className="text-[9px] font-black text-amber-500">{formatWorkingDuration(calcWorkingMs(editingItem.startedAt!, editingItem.completedAt!, schedule), schedule)}</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[8px] font-bold text-slate-400">Tiempo total</span>
                          <span className="text-[9px] font-black text-emerald-500">{formatWorkingDuration(calcWorkingMs(editingItem.createdAt ?? 0, editingItem.completedAt!, schedule), schedule)}</span>
                        </div>
                      </>
                    )}
                    {!editingItem.completedAt && (
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-[8px] font-bold text-slate-400">En proceso durante</span>
                        <span className="text-[9px] font-black text-amber-500">{formatWorkingDuration(calcWorkingMs(editingItem.startedAt!, Date.now(), schedule), schedule)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {validationError && (
            <p className="text-red-500 text-xs font-bold text-center">{validationError}</p>
          )}

          <button
            type="button"
            onClick={handleSave}
            className="w-full py-5 bg-blue-600 text-white rounded-3xl font-black shadow-xl active:scale-95 transition-transform"
          >
            GUARDAR
          </button>

          {editingItem?.id && (
            <div className="flex gap-2 pt-2 border-t">
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => onGeneratePDF(editingItem)}
                  className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2"
                >
                  <Download size={14} /> PDF
                </button>
              )}
              {userRole === 'admin' && (
                <button
                  type="button"
                  onClick={() => onDelete(editingItem.id!)}
                  className="p-3 bg-red-50 text-red-500 rounded-xl"
                >
                  <Trash2 size={20} />
                </button>
              )}
              {isProfileRole && perms.includes('delete') && (
                <button
                  type="button"
                  onClick={() => onDelete(editingItem.id!)}
                  className="p-3 bg-red-50 text-red-500 rounded-xl"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Modal({
  isOpen,
  editingItem,
  onClose,
  onSave,
  onDelete,
  onGeneratePDF,
  workAreas,
  personnel,
  zones,
  userRole,
  permissions,
}: {
  isOpen: boolean;
  editingItem: Partial<WorkOrder> | null;
  onClose: () => void;
  onSave: (data: Partial<WorkOrder>) => void;
  onDelete: (id: string) => void;
  onGeneratePDF: (ot: Partial<WorkOrder>) => void;
  workAreas: WorkArea[];
  personnel: Personnel[];
  zones: Zone[];
  userRole: UserRole;
  permissions?: string[];
}) {
  if (!isOpen) return null;
  const modalKey = editingItem?.id ?? 'new';
  return (
    <ModalInner
      key={modalKey}
      editingItem={editingItem}
      onClose={onClose}
      onSave={onSave}
      onDelete={onDelete}
      onGeneratePDF={onGeneratePDF}
      workAreas={workAreas}
      personnel={personnel}
      zones={zones}
      userRole={userRole}
      permissions={permissions}
    />
  );
}

/* ─── PDF Generation ─── */

async function loadImageAsBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject('No canvas'); return; }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg'));
    };
    img.onerror = reject;
    img.src = url;
  });
}

function addPageFooter(doc: any, pw: number, ph: number) {
  const footerY = ph - 30;
  doc.setDrawColor(31, 40, 107);
  doc.setLineWidth(0.5);
  doc.line(40, footerY - 8, pw - 40, footerY - 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(120, 120, 120);
  doc.text('Documento generado automaticamente por Sistema de Gestion Laguna Norte', pw / 2, footerY, { align: 'center' });
  doc.text('Administracion - Asesorias Integrales CyJ', pw / 2, footerY + 8, { align: 'center' });
}

async function buildPDF(ot: Partial<WorkOrder>) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pw = 595.28;
  const ph = 841.89;
  const m = 40;
  const cw = pw - m * 2;

  const navy = [31, 40, 107];
  const navyLight = [230, 233, 245];
  const valueColor = [30, 30, 30];
  const borderColor = [190, 195, 210];

  let y = 30;

  try {
    const logo1 = await loadImageAsBase64('/logo-laguna.jpg');
    doc.addImage(logo1, 'JPEG', m, y, 130, 52);
  } catch { /* skip */ }

  try {
    const logo2 = await loadImageAsBase64('/logo-empresa.png');
    doc.addImage(logo2, 'PNG', pw - m - 90, y, 90, 52);
  } catch { /* skip */ }

  y += 62;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navy);
  doc.setFontSize(9);
  doc.text('C O N D O M I N I O   &   P A R Q U E', pw / 2, y, { align: 'center' });
  y += 16;
  doc.setFontSize(14);
  doc.text('REPORTE DE OPERACION', pw / 2, y, { align: 'center' });
  y += 14;
  doc.setFontSize(10);
  doc.text(`CODIGO: ${ot.otId ?? ''}`, pw / 2, y, { align: 'center' });
  y += 12;

  doc.setDrawColor(...navy);
  doc.setLineWidth(1.5);
  doc.line(m, y, pw - m, y);
  y += 14;

  const tblX = m;
  const tblW = cw;
  const labelColW = 90;
  const halfW = tblW / 2;
  const valColW = halfW - labelColW;
  const rowH = 24;

  function drawTableRow(
    label1: string, value1: string,
    label2: string, value2: string,
    rowY: number
  ): number {
    doc.setFillColor(252, 252, 255);
    doc.rect(tblX, rowY, tblW, rowH, 'F');
    doc.setFillColor(...navyLight);
    doc.rect(tblX, rowY, labelColW, rowH, 'F');
    doc.setFillColor(...navyLight);
    doc.rect(tblX + halfW, rowY, labelColW, rowH, 'F');
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.3);
    doc.rect(tblX, rowY, tblW, rowH, 'S');
    doc.line(tblX + halfW, rowY, tblX + halfW, rowY + rowH);
    doc.line(tblX + labelColW, rowY, tblX + labelColW, rowY + rowH);
    doc.line(tblX + halfW + labelColW, rowY, tblX + halfW + labelColW, rowY + rowH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...navy);
    doc.text(label1, tblX + 6, rowY + 15);
    doc.text(label2, tblX + halfW + 6, rowY + 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...valueColor);
    const v1 = doc.splitTextToSize(value1, valColW - 12);
    const v2 = doc.splitTextToSize(value2, valColW - 12);
    doc.text(v1[0] || '', tblX + labelColW + 6, rowY + 15);
    doc.text(v2[0] || '', tblX + halfW + labelColW + 6, rowY + 15);
    return rowY + rowH;
  }

  doc.setFillColor(...navy);
  doc.rect(tblX, y, tblW, rowH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('INFORMACION DE LA ORDEN', tblX + 6, y + 15);
  doc.text('DETALLE', tblX + halfW + 6, y + 15);
  y += rowH;

  const activities = (ot.activities ?? []).join(', ');
  const collaborators = (ot.collaborators ?? []).join(', ');
  const dateStr = ot.createdAt ? formatDate(ot.createdAt) : '';
  const startedStr = ot.startedAt ? formatDateTime(ot.startedAt) : '—';
  const completedStr = ot.completedAt ? formatDateTime(ot.completedAt) : '—';

  y = drawTableRow('Actividad', activities, 'Fecha Creación', dateStr, y);
  y = drawTableRow('Estado', ot.status ?? '', 'Lugar', ot.zoneName ?? '', y);
  y = drawTableRow('Inicio', startedStr, 'Término', completedStr, y);
  y = drawTableRow('Codigo', ot.otId ?? '', 'Area', activities, y);

  const respSplit = doc.splitTextToSize(collaborators, tblW - labelColW - 12);
  const respH = Math.max(rowH, respSplit.length * 11 + 12);

  doc.setFillColor(252, 252, 255);
  doc.rect(tblX, y, tblW, respH, 'F');
  doc.setFillColor(...navyLight);
  doc.rect(tblX, y, labelColW, respH, 'F');
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.3);
  doc.rect(tblX, y, tblW, respH, 'S');
  doc.line(tblX + labelColW, y, tblX + labelColW, y + respH);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...navy);
  doc.text('Responsables', tblX + 6, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...valueColor);
  doc.text(respSplit, tblX + labelColW + 6, y + 14);
  y += respH;

  y += 16;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navy);
  doc.setFontSize(10);
  doc.text('DESCRIPCION DEL TRABAJO', m, y);
  y += 6;
  doc.setDrawColor(...navy);
  doc.setLineWidth(0.5);
  doc.line(m, y, pw - m, y);
  y += 10;

  const descText = ot.description || 'Sin descripción registrada';
  const splitDesc = doc.splitTextToSize(descText, cw - 24);
  const descH = Math.max(40, splitDesc.length * 11 + 18);

  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.3);
  doc.setFillColor(252, 252, 255);
  doc.roundedRect(m, y, cw, descH, 3, 3, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...valueColor);
  doc.setFontSize(9);
  doc.text(splitDesc, m + 12, y + 14);
  y += descH + 18;

  const photoW = (cw - 16) / 2;
  const photoH = photoW * 0.75;
  const minSpaceNeeded = photoH + 50;

  if (y + minSpaceNeeded > ph - 50) {
    addPageFooter(doc, pw, ph);
    doc.addPage();
    y = 40;
  }

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navy);
  doc.setFontSize(10);
  doc.text('EVIDENCIA FOTOGRAFICA', pw / 2, y, { align: 'center' });
  y += 6;
  doc.setDrawColor(...navy);
  doc.setLineWidth(0.5);
  doc.line(m, y, pw - m, y);
  y += 12;

  const gap = 16;
  const beforeX = m;
  const afterX = m + photoW + gap;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navy);
  doc.text('ANTES', beforeX + photoW / 2, y, { align: 'center' });
  doc.text('DESPUES', afterX + photoW / 2, y, { align: 'center' });
  y += 8;

  doc.setDrawColor(...borderColor);
  doc.setFillColor(245, 246, 250);
  doc.setLineWidth(0.3);
  doc.roundedRect(beforeX, y, photoW, photoH, 3, 3, 'FD');
  doc.roundedRect(afterX, y, photoW, photoH, 3, 3, 'FD');

  const photosBefore = ot.photosBefore ?? [];
  const photosAfter = ot.photosAfter ?? [];

  if (photosBefore.length > 0) {
    try { doc.addImage(photosBefore[0], 'JPEG', beforeX + 2, y + 2, photoW - 4, photoH - 4); } catch { /* skip */ }
  } else {
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.setFont('helvetica', 'italic');
    doc.text('Sin foto', beforeX + photoW / 2, y + photoH / 2, { align: 'center' });
  }

  if (photosAfter.length > 0) {
    try { doc.addImage(photosAfter[0], 'JPEG', afterX + 2, y + 2, photoW - 4, photoH - 4); } catch { /* skip */ }
  } else {
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.setFont('helvetica', 'italic');
    doc.text('Sin foto', afterX + photoW / 2, y + photoH / 2, { align: 'center' });
  }
  y += photoH + 8;

  const extraBefore = photosBefore.slice(1);
  const extraAfter = photosAfter.slice(1);
  if (extraBefore.length > 0 || extraAfter.length > 0) {
    const maxExtra = Math.max(extraBefore.length, extraAfter.length);
    for (let i = 0; i < maxExtra; i++) {
      if (y + photoH + 40 > ph - 40) {
        addPageFooter(doc, pw, ph);
        doc.addPage();
        y = 40;
      }
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...navy);
      doc.text(`Foto ${i + 2}`, m, y);
      y += 12;

      doc.setDrawColor(...borderColor);
      doc.setFillColor(245, 246, 250);
      doc.setLineWidth(0.3);
      doc.roundedRect(beforeX, y, photoW, photoH, 3, 3, 'FD');
      doc.roundedRect(afterX, y, photoW, photoH, 3, 3, 'FD');

      if (extraBefore[i]) {
        try { doc.addImage(extraBefore[i], 'JPEG', beforeX + 2, y + 2, photoW - 4, photoH - 4); } catch { /* skip */ }
      } else {
        doc.setFontSize(7); doc.setTextColor(180, 180, 180); doc.setFont('helvetica', 'italic');
        doc.text('Sin foto', beforeX + photoW / 2, y + photoH / 2, { align: 'center' });
      }
      if (extraAfter[i]) {
        try { doc.addImage(extraAfter[i], 'JPEG', afterX + 2, y + 2, photoW - 4, photoH - 4); } catch { /* skip */ }
      } else {
        doc.setFontSize(7); doc.setTextColor(180, 180, 180); doc.setFont('helvetica', 'italic');
        doc.text('Sin foto', afterX + photoW / 2, y + photoH / 2, { align: 'center' });
      }
      y += photoH + 12;
    }
  }

  addPageFooter(doc, pw, ph);
  doc.save(`OT_${ot.otId ?? 'Reporte'}_Reporte.pdf`);
}

async function buildMassTerminadasPDF(ots: Partial<WorkOrder>[], title?: string) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pw = 595.28;
  const ph = 841.89;
  const m = 40;
  const cw = pw - m * 2;

  const navy = [31, 40, 107];
  const navyLight = [230, 233, 245];
  const valueColor = [30, 30, 30];
  const borderColor = [190, 195, 210];

  // ─── Cover Page ───
  let y = 40;

  try {
    const logo1 = await loadImageAsBase64('/logo-laguna.jpg');
    doc.addImage(logo1, 'JPEG', pw / 2 - 65, y, 130, 52);
  } catch { /* skip */ }
  y += 72;

  try {
    const logo2 = await loadImageAsBase64('/logo-empresa.png');
    doc.addImage(logo2, 'PNG', pw / 2 - 45, y, 90, 52);
  } catch { /* skip */ }
  y += 72;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navy);
  doc.setFontSize(9);
  doc.text('C O N D O M I N I O   &   P A R Q U E', pw / 2, y, { align: 'center' });
  y += 24;
  doc.setFontSize(18);
  doc.text('REPORTE MASIVO DE OPERACION', pw / 2, y, { align: 'center' });
  y += 18;
  doc.setFontSize(12);
  doc.text('OTs TERMINADAS', pw / 2, y, { align: 'center' });
  y += 24;

  doc.setDrawColor(...navy);
  doc.setLineWidth(1.5);
  doc.line(m + 50, y, pw - m - 50, y);
  y += 24;

  // Summary box
  doc.setFillColor(252, 252, 255);
  doc.roundedRect(m + 40, y, cw - 80, 100, 6, 6, 'FD');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...navy);
  doc.text(`Total OTs Terminadas: ${ots.length}`, pw / 2, y + 30, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...valueColor);
  doc.text(`Generado: ${new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, pw / 2, y + 50, { align: 'center' });

  // Count by area
  const areaCounts: Record<string, number> = {};
  for (const ot of ots) {
    const acts = ot.activities ?? [];
    for (const a of acts) {
      areaCounts[a] = (areaCounts[a] || 0) + 1;
    }
  }
  const topAreas = Object.entries(areaCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);
  if (topAreas.length > 0) {
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(`Actividades: ${topAreas.map(([a, c]) => `${a} (${c})`).join('  |  ')}`, pw / 2, y + 70, { align: 'center' });
  }

  if (title) {
    doc.setFontSize(8);
    doc.text(title, pw / 2, y + 86, { align: 'center' });
  }

  y += 130;
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('Documento generado automáticamente por Sistema de Gestión Laguna Norte', pw / 2, y, { align: 'center' });
  doc.text('Administración - Asesorías Integrales CyJ', pw / 2, y + 10, { align: 'center' });

  addPageFooter(doc, pw, ph);

  // ─── Individual OT pages ───
  for (let idx = 0; idx < ots.length; idx++) {
    const ot = ots[idx];
    doc.addPage();
    y = 30;

    // Header with logos
    try {
      const logo1 = await loadImageAsBase64('/logo-laguna.jpg');
      doc.addImage(logo1, 'JPEG', m, y, 100, 40);
    } catch { /* skip */ }

    try {
      const logo2 = await loadImageAsBase64('/logo-empresa.png');
      doc.addImage(logo2, 'PNG', pw - m - 70, y, 70, 40);
    } catch { /* skip */ }
    y += 48;

    // OT header
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...navy);
    doc.setFontSize(7);
    doc.text('C O N D O M I N I O   &   P A R Q U E', pw / 2, y, { align: 'center' });
    y += 12;
    doc.setFontSize(11);
    doc.text(`REPORTE DE OPERACION  —  ${ot.otId ?? ''}`, pw / 2, y, { align: 'center' });
    y += 10;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`OT ${idx + 1} de ${ots.length}`, pw / 2, y, { align: 'center' });
    y += 10;

    doc.setDrawColor(...navy);
    doc.setLineWidth(1.2);
    doc.line(m, y, pw - m, y);
    y += 12;

    // Info table
    const tblX = m;
    const tblW = cw;
    const labelColW = 90;
    const halfW = tblW / 2;
    const valColW = halfW - labelColW;
    const rowH = 22;

    function drawTableRow(
      label1: string, value1: string,
      label2: string, value2: string,
      rowY: number
    ): number {
      doc.setFillColor(252, 252, 255);
      doc.rect(tblX, rowY, tblW, rowH, 'F');
      doc.setFillColor(...navyLight);
      doc.rect(tblX, rowY, labelColW, rowH, 'F');
      doc.setFillColor(...navyLight);
      doc.rect(tblX + halfW, rowY, labelColW, rowH, 'F');
      doc.setDrawColor(...borderColor);
      doc.setLineWidth(0.3);
      doc.rect(tblX, rowY, tblW, rowH, 'S');
      doc.line(tblX + halfW, rowY, tblX + halfW, rowY + rowH);
      doc.line(tblX + labelColW, rowY, tblX + labelColW, rowY + rowH);
      doc.line(tblX + halfW + labelColW, rowY, tblX + halfW + labelColW, rowY + rowH);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(...navy);
      doc.text(label1, tblX + 6, rowY + 14);
      doc.text(label2, tblX + halfW + 6, rowY + 14);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...valueColor);
      const v1 = doc.splitTextToSize(value1, valColW - 12);
      const v2 = doc.splitTextToSize(value2, valColW - 12);
      doc.text(v1[0] || '', tblX + labelColW + 6, rowY + 14);
      doc.text(v2[0] || '', tblX + halfW + labelColW + 6, rowY + 14);
      return rowY + rowH;
    }

    doc.setFillColor(...navy);
    doc.rect(tblX, y, tblW, rowH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text('INFORMACION DE LA ORDEN', tblX + 6, y + 14);
    doc.text('DETALLE', tblX + halfW + 6, y + 14);
    y += rowH;

    const activities = (ot.activities ?? []).join(', ');
    const collaborators = (ot.collaborators ?? []).join(', ');
    const dateStr = ot.createdAt ? formatDate(ot.createdAt) : '';
    const startedStr = ot.startedAt ? formatDateTime(ot.startedAt) : '—';
    const completedStr = ot.completedAt ? formatDateTime(ot.completedAt) : '—';
    const durationStr = (ot.startedAt && ot.completedAt) ? formatDuration(ot.completedAt - ot.startedAt) : '—';

    y = drawTableRow('Actividad', activities, 'Fecha Creación', dateStr, y);
    y = drawTableRow('Estado', ot.status ?? '', 'Lugar', ot.zoneName ?? '', y);
    y = drawTableRow('Inicio', startedStr, 'Término', completedStr, y);
    y = drawTableRow('Duración', durationStr, 'Código', ot.otId ?? '', y);

    // Responsables row
    const respSplit = doc.splitTextToSize(collaborators, tblW - labelColW - 12);
    const respH = Math.max(rowH, respSplit.length * 10 + 10);
    doc.setFillColor(252, 252, 255);
    doc.rect(tblX, y, tblW, respH, 'F');
    doc.setFillColor(...navyLight);
    doc.rect(tblX, y, labelColW, respH, 'F');
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.3);
    doc.rect(tblX, y, tblW, respH, 'S');
    doc.line(tblX + labelColW, y, tblX + labelColW, y + respH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...navy);
    doc.text('Responsables', tblX + 6, y + 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...valueColor);
    doc.text(respSplit, tblX + labelColW + 6, y + 12);
    y += respH + 12;

    // Description
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...navy);
    doc.setFontSize(9);
    doc.text('DESCRIPCION DEL TRABAJO', m, y);
    y += 5;
    doc.setDrawColor(...navy);
    doc.setLineWidth(0.4);
    doc.line(m, y, pw - m, y);
    y += 8;

    const descText = ot.description || 'Sin descripción registrada';
    const splitDesc = doc.splitTextToSize(descText, cw - 24);
    const descH = Math.max(35, splitDesc.length * 10 + 14);
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.3);
    doc.setFillColor(252, 252, 255);
    doc.roundedRect(m, y, cw, descH, 3, 3, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...valueColor);
    doc.setFontSize(8);
    doc.text(splitDesc, m + 10, y + 12);
    y += descH + 14;

    // Photos
    const photoW = (cw - 16) / 2;
    const photoH = photoW * 0.65;
    const minSpaceNeeded = photoH + 40;

    if (y + minSpaceNeeded > ph - 50) {
      addPageFooter(doc, pw, ph);
      doc.addPage();
      y = 40;
    }

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...navy);
    doc.setFontSize(9);
    doc.text('EVIDENCIA FOTOGRAFICA', pw / 2, y, { align: 'center' });
    y += 5;
    doc.setDrawColor(...navy);
    doc.setLineWidth(0.4);
    doc.line(m, y, pw - m, y);
    y += 10;

    const gap = 16;
    const beforeX = m;
    const afterX = m + photoW + gap;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...navy);
    doc.text('ANTES', beforeX + photoW / 2, y, { align: 'center' });
    doc.text('DESPUES', afterX + photoW / 2, y, { align: 'center' });
    y += 7;

    doc.setDrawColor(...borderColor);
    doc.setFillColor(245, 246, 250);
    doc.setLineWidth(0.3);
    doc.roundedRect(beforeX, y, photoW, photoH, 3, 3, 'FD');
    doc.roundedRect(afterX, y, photoW, photoH, 3, 3, 'FD');

    const photosBefore = ot.photosBefore ?? [];
    const photosAfter = ot.photosAfter ?? [];

    if (photosBefore.length > 0) {
      try { doc.addImage(photosBefore[0], 'JPEG', beforeX + 2, y + 2, photoW - 4, photoH - 4); } catch { /* skip */ }
    } else {
      doc.setFontSize(7);
      doc.setTextColor(180, 180, 180);
      doc.setFont('helvetica', 'italic');
      doc.text('Sin foto', beforeX + photoW / 2, y + photoH / 2, { align: 'center' });
    }

    if (photosAfter.length > 0) {
      try { doc.addImage(photosAfter[0], 'JPEG', afterX + 2, y + 2, photoW - 4, photoH - 4); } catch { /* skip */ }
    } else {
      doc.setFontSize(7);
      doc.setTextColor(180, 180, 180);
      doc.setFont('helvetica', 'italic');
      doc.text('Sin foto', afterX + photoW / 2, y + photoH / 2, { align: 'center' });
    }

    addPageFooter(doc, pw, ph);
  }

  const dateSuffix = new Date().toISOString().slice(0, 10);
  doc.save(`OTs_Terminadas_Masivo_${dateSuffix}.pdf`);
}

/* ─── Main App (Unified Single Page) ─── */

type StatusFilter = 'Todas' | 'Pendiente' | 'En Proceso' | 'Terminada';

/* ─── Admin Dashboard Component ─── */

function AdminDashboard({
  isOpen,
  onClose,
  workOrders,
  workAreas,
  personnel,
}: {
  isOpen: boolean;
  workOrders: WorkOrder[];
  onClose: () => void;
  workAreas: WorkArea[];
  personnel: Personnel[];
}) {
  const schedule = loadWorkSchedule();
  const [dashTab, setDashTab] = useState<'resumen' | 'personal' | 'areas' | 'detalle' | 'exportar'>('resumen');
  // Filter state
  const [filterArea, setFilterArea] = useState<string>('todas');
  const [filterPerson, setFilterPerson] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todas');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  if (!isOpen) return null;

  const now = Date.now();

  // ─── Apply filters to work orders ───
  const filteredOrders = workOrders.filter(o => {
    // Area filter
    if (filterArea !== 'todas') {
      const wa = workAreas.find(wa => wa.id === filterArea);
      if (wa && !o.activities.some(a => wa.activities.includes(a))) return false;
    }
    // Person filter
    if (filterPerson !== 'todos') {
      const person = personnel.find(p => p.id === filterPerson);
      if (person && !o.collaborators.includes(person.name)) return false;
    }
    // Status filter
    if (filterStatus !== 'todas' && o.status !== filterStatus) return false;
    // Date from
    if (filterDateFrom) {
      const from = new Date(filterDateFrom).getTime();
      if (o.createdAt < from) return false;
    }
    // Date to
    if (filterDateTo) {
      const to = new Date(filterDateTo).getTime() + 86400000; // include full day
      if (o.createdAt > to) return false;
    }
    return true;
  });

  const hasActiveFilters = filterArea !== 'todas' || filterPerson !== 'todos' || filterStatus !== 'todas' || filterDateFrom || filterDateTo;

  // Time calculations (on filtered data)
  const completedOrders = filteredOrders.filter(o => o.status === 'Terminada');
  const inProcessOrders = filteredOrders.filter(o => o.status === 'En Proceso');
  const pendingOrders = filteredOrders.filter(o => o.status === 'Pendiente');

  // Average times for completed orders (use startedAt if available, fallback to createdAt)
  const completedWithTimes = completedOrders.filter(o => o.completedAt);
  const avgWaitTime = completedWithTimes.length > 0
    ? completedWithTimes.reduce((sum, o) => sum + calcWorkingMs(o.createdAt, o.startedAt ?? o.createdAt, schedule), 0) / completedWithTimes.length
    : 0;
  const avgProcessTime = completedWithTimes.length > 0
    ? completedWithTimes.reduce((sum, o) => sum + calcWorkingMs(o.startedAt ?? o.createdAt, o.completedAt!, schedule), 0) / completedWithTimes.length
    : 0;
  const avgTotalTime = completedWithTimes.length > 0
    ? completedWithTimes.reduce((sum, o) => sum + calcWorkingMs(o.createdAt, o.completedAt!, schedule), 0) / completedWithTimes.length
    : 0;

  // Currently in-process duration (use startedAt if available, fallback to createdAt)
  const avgCurrentProcessTime = inProcessOrders.length > 0
    ? inProcessOrders.reduce((sum, o) => sum + calcWorkingMs(o.startedAt ?? o.createdAt, now, schedule), 0) / inProcessOrders.length
    : 0;

  // Per-personnel metrics (on filtered data)
  const personnelMetrics = personnel.map(p => {
    const personOrders = filteredOrders.filter(o =>
      o.collaborators.includes(p.name)
    );
    const completedByPerson = personOrders.filter(o => o.status === 'Terminada');
    const inProcessByPerson = personOrders.filter(o => o.status === 'En Proceso');
    const pendingByPerson = personOrders.filter(o => o.status === 'Pendiente');

    // For time calculations, only use completed OTs that have both startedAt and completedAt
    const completedWithTimes = completedByPerson.filter(o => o.startedAt && o.completedAt);
    const avgTime = completedWithTimes.length > 0
      ? completedWithTimes.reduce((sum, o) => sum + calcWorkingMs(o.startedAt!, o.completedAt!, schedule), 0) / completedWithTimes.length
      : 0;

    const totalTime = completedWithTimes.reduce((sum, o) => sum + calcWorkingMs(o.startedAt!, o.completedAt!, schedule), 0);

    return {
      id: p.id,
      name: p.name,
      workAreaName: workAreas.find(wa => wa.id === p.workAreaId)?.name ?? 'Sin área',
      workAreaColor: workAreas.find(wa => wa.id === p.workAreaId)?.color ?? 'bg-gray-500',
      totalOrders: personOrders.length,
      completedOrders: completedByPerson.length,
      inProcessOrders: inProcessByPerson.length,
      pendingOrders: pendingByPerson.length,
      avgTime,
      totalTime,
    };
  }).filter(pm => pm.totalOrders > 0).sort((a, b) => b.totalOrders - a.totalOrders);

  // Per-area metrics (on filtered data)
  const areaMetrics = workAreas.map(wa => {
    const areaOrders = filteredOrders.filter(o =>
      o.activities.some(a => wa.activities.includes(a))
    );
    const completedArea = areaOrders.filter(o => o.status === 'Terminada');
    const inProcessArea = areaOrders.filter(o => o.status === 'En Proceso');
    const pendingArea = areaOrders.filter(o => o.status === 'Pendiente');

    // For time calculations, only use completed OTs that have both startedAt and completedAt
    const completedWithTimes = completedArea.filter(o => o.startedAt && o.completedAt);
    const avgTime = completedWithTimes.length > 0
      ? completedWithTimes.reduce((sum, o) => sum + calcWorkingMs(o.startedAt!, o.completedAt!, schedule), 0) / completedWithTimes.length
      : 0;

    return {
      id: wa.id,
      name: wa.name,
      color: wa.color,
      total: areaOrders.length,
      completed: completedArea.length,
      inProcess: inProcessArea.length,
      pending: pendingArea.length,
      avgTime,
    };
  }).filter(am => am.total > 0).sort((a, b) => b.total - a.total);

  // Detailed OT list with time info (on filtered data) — show ALL orders, not just those with startedAt
  const ordersWithTime = filteredOrders
    .map(o => {
      const wa = workAreas.find(wa => o.activities.some(a => wa.activities.includes(a)));
      const effectiveStartedAt = o.startedAt ?? (o.status === 'En Proceso' || o.status === 'Terminada' ? o.createdAt : null);
      const processTime = o.completedAt && effectiveStartedAt ? calcWorkingMs(effectiveStartedAt, o.completedAt, schedule) : (o.status === 'En Proceso' && effectiveStartedAt ? calcWorkingMs(effectiveStartedAt, now, schedule) : 0);
      const waitTime = effectiveStartedAt ? calcWorkingMs(o.createdAt, effectiveStartedAt, schedule) : 0;
      const totalTime = o.completedAt ? calcWorkingMs(o.createdAt, o.completedAt, schedule) : (o.status === 'En Proceso' ? calcWorkingMs(o.createdAt, now, schedule) : 0);
      return { ...o, wa, processTime, waitTime, totalTime, effectiveStartedAt };
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  // ─── Export CSV ───
  const exportCSV = () => {
    const BOM = '\uFEFF';
    const headers = ['Código', 'Actividades', 'Responsables', 'Lugar', 'Estado', 'Fecha Creación', 'Hora Creación', 'Fecha Inicio', 'Hora Inicio', 'Fecha Término', 'Hora Término', 'Tiempo Espera', 'Tiempo Proceso', 'Tiempo Total', 'Descripción del trabajo'];
    const rows = filteredOrders.map(o => {
      const wa = workAreas.find(wa => o.activities.some(a => wa.activities.includes(a)));
      return [
        o.otId,
        `"${(o.activities ?? []).join('; ')}"`,
        `"${(o.collaborators ?? []).join('; ')}"`,
        o.zoneName,
        o.status,
        o.createdAt ? formatDate(o.createdAt) : '',
        o.createdAt ? new Date(o.createdAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '',
        o.startedAt ? formatDate(o.startedAt) : '',
        o.startedAt ? new Date(o.startedAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '',
        o.completedAt ? formatDate(o.completedAt) : '',
        o.completedAt ? new Date(o.completedAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '',
        o.startedAt ? formatWorkingDuration(calcWorkingMs(o.createdAt, o.startedAt, schedule), schedule) : '',
        o.startedAt && o.completedAt ? formatWorkingDuration(calcWorkingMs(o.startedAt, o.completedAt!, schedule), schedule) : '',
        o.completedAt ? formatWorkingDuration(calcWorkingMs(o.createdAt, o.completedAt!, schedule), schedule) : '',
        `"${(o.description ?? '').replace(/"/g, '""')}"`,
      ].join(',');
    });
    const filterLabel = hasActiveFilters
      ? `_${[filterArea !== 'todas' ? workAreas.find(wa => wa.id === filterArea)?.name : '', filterPerson !== 'todos' ? personnel.find(p => p.id === filterPerson)?.name?.split(' ').slice(0, 2).join('') : '', filterStatus !== 'todas' ? filterStatus : ''].filter(Boolean).join('_')}`
      : '';
    const csv = BOM + headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LagunaNorte_OTs${filterLabel}_${formatDate(Date.now()).replace(/\//g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Export Personnel Report CSV ───
  const exportPersonnelCSV = () => {
    const BOM = '\uFEFF';
    const headers = ['Nombre', 'Área', 'OTs Totales', 'OTs Pendientes', 'OTs En Proceso', 'OTs Terminadas', 'Tiempo Prom/OT', 'Tiempo Total Trabajado'];
    const rows = personnelMetrics.map(pm => [
      `"${pm.name}"`,
      pm.workAreaName,
      pm.totalOrders,
      pm.pendingOrders,
      pm.inProcessOrders,
      pm.completedOrders,
      pm.avgTime > 0 ? formatWorkingDuration(pm.avgTime, schedule) : '',
      pm.totalTime > 0 ? formatWorkingDuration(pm.totalTime, schedule) : '',
    ].join(','));
    const csv = BOM + headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LagunaNorte_Personal_${formatDate(Date.now()).replace(/\//g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Export Area Report CSV ───
  const exportAreaCSV = () => {
    const BOM = '\uFEFF';
    const headers = ['Área', 'OTs Totales', 'Pendientes', 'En Proceso', 'Terminadas', 'Tiempo Promedio'];
    const rows = areaMetrics.map(am => [
      `"${am.name}"`,
      am.total,
      am.pending,
      am.inProcess,
      am.completed,
      am.avgTime > 0 ? formatWorkingDuration(am.avgTime, schedule) : '',
    ].join(','));
    const csv = BOM + headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LagunaNorte_Areas_${formatDate(Date.now()).replace(/\//g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Export PDF Report ───
  const exportPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const m = 30;

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(31, 40, 107);
    doc.text('REPORTE DE GESTION - LAGUNA NORTE', pw / 2, 30, { align: 'center' });
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    const filterDesc = hasActiveFilters
      ? `Filtros: ${[filterArea !== 'todas' ? 'Area: ' + (workAreas.find(wa => wa.id === filterArea)?.name ?? '') : '', filterPerson !== 'todos' ? 'Persona: ' + (personnel.find(p => p.id === filterPerson)?.name ?? '') : '', filterStatus !== 'todas' ? 'Estado: ' + filterStatus : '', filterDateFrom ? 'Desde: ' + filterDateFrom : '', filterDateTo ? 'Hasta: ' + filterDateTo : ''].filter(Boolean).join(' | ')}`
      : 'Sin filtros aplicados';
    doc.text(filterDesc, pw / 2, 45, { align: 'center' });
    doc.text(`Generado: ${formatDateTime(Date.now())} | Total OTs: ${filteredOrders.length}`, pw / 2, 56, { align: 'center' });

    // Summary box
    let y = 70;
    doc.setFillColor(240, 242, 250);
    doc.roundedRect(m, y, pw - m * 2, 35, 3, 3, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 40, 107);
    doc.text(`Pendientes: ${pendingOrders.length}`, m + 15, y + 15);
    doc.text(`En Proceso: ${inProcessOrders.length}`, m + 130, y + 15);
    doc.text(`Terminadas: ${completedOrders.length}`, m + 250, y + 15);
    doc.text(`Eficiencia: ${filteredOrders.length > 0 ? Math.round((completedOrders.length / filteredOrders.length) * 100) : 0}%`, m + 380, y + 15);
    if (avgProcessTime > 0) doc.text(`Prom Proceso: ${formatWorkingDuration(avgProcessTime, schedule)}`, m + 490, y + 15);
    if (avgWaitTime > 0) doc.text(`Prom Espera: ${formatWorkingDuration(avgWaitTime, schedule)}`, m + 490, y + 28);

    y += 50;

    // Table header
    const cols = [40, 100, 90, 55, 55, 65, 65, 65, 55, 55];
    const colLabels = ['Codigo', 'Actividades', 'Responsables', 'Lugar', 'Estado', 'Creacion', 'Inicio', 'Termino', 'T Espera', 'T Proceso'];
    let x = m;

    doc.setFillColor(31, 40, 107);
    doc.rect(m, y, pw - m * 2, 18, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    cols.forEach((w, i) => { doc.text(colLabels[i], x + 3, y + 12); x += w; });
    y += 18;

    // Table rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(30, 30, 30);
    let rowIndex = 0;
    for (const o of filteredOrders) {
      if (y > ph - 40) { doc.addPage(); y = 30; }
      if (rowIndex % 2 === 0) { doc.setFillColor(250, 250, 255); doc.rect(m, y, pw - m * 2, 16, 'F'); }
      x = m;
      const row = [
        o.otId,
        (o.activities ?? []).join(', '),
        (o.collaborators ?? []).map(c => c.split(' ').slice(0, 2).join(' ')).join(', '),
        o.zoneName,
        o.status,
        formatDateTime(o.createdAt),
        formatDateTime(o.startedAt),
        formatDateTime(o.completedAt),
        o.startedAt ? formatWorkingDuration(calcWorkingMs(o.createdAt, o.startedAt, schedule), schedule) : '',
        o.startedAt && o.completedAt ? formatWorkingDuration(calcWorkingMs(o.startedAt, o.completedAt!, schedule), schedule) : '',
      ];
      row.forEach((val, i) => {
        const maxW = cols[i] - 6;
        const lines = doc.splitTextToSize(String(val), maxW);
        doc.text(lines[0] || '', x + 3, y + 10);
        x += cols[i];
      });
      y += 16;
      rowIndex++;
    }

    // Footer
    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    doc.text('Documento generado por Sistema de Gestion Laguna Norte', pw / 2, ph - 15, { align: 'center' });

    const filterLabel = hasActiveFilters
      ? `_${[filterArea !== 'todas' ? workAreas.find(wa => wa.id === filterArea)?.name : '', filterPerson !== 'todos' ? personnel.find(p => p.id === filterPerson)?.name?.split(' ').slice(0, 2).join('') : '', filterStatus !== 'todas' ? filterStatus : ''].filter(Boolean).join('_')}`
      : '';
    doc.save(`LagunaNorte_Reporte${filterLabel}_${formatDate(Date.now()).replace(/\//g, '-')}.pdf`);
  };

  const clearFilters = () => {
    setFilterArea('todas');
    setFilterPerson('todos');
    setFilterStatus('todas');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const tabs: { key: typeof dashTab; label: string; icon: React.ElementType }[] = [
    { key: 'resumen', label: 'Resumen', icon: BarChart3 },
    { key: 'personal', label: 'Personal', icon: User },
    { key: 'areas', label: 'Áreas', icon: Activity },
    { key: 'detalle', label: 'Detalle', icon: Timer },
    { key: 'exportar', label: 'Exportar', icon: Download },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-slate-100 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors active:scale-95">
              <ChevronLeft size={18} className="text-slate-600" />
            </button>
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
              <BarChart3 size={18} /> Dashboard
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-xl transition-colors ${showFilters ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
              title="Filtros"
            >
              <Filter size={16} />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        {showFilters && (
          <div className="bg-slate-50 border-b border-slate-200 p-3 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Filter size={10} /> Filtros de Datos
              </span>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-[8px] font-black text-red-500 uppercase hover:text-red-700">
                  Limpiar
                </button>
              )}
            </div>
            <div>
              <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Área</label>
              <select
                value={filterArea}
                onChange={e => setFilterArea(e.target.value)}
                className="w-full p-2 rounded-xl bg-white border border-slate-200 text-[10px] font-bold text-slate-700 mt-0.5"
              >
                <option value="todas">Todas las áreas</option>
                {workAreas.map(wa => (
                  <option key={wa.id} value={wa.id}>{wa.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Trabajador</label>
              <select
                value={filterPerson}
                onChange={e => setFilterPerson(e.target.value)}
                className="w-full p-2 rounded-xl bg-white border border-slate-200 text-[10px] font-bold text-slate-700 mt-0.5"
              >
                <option value="todos">Todo el personal</option>
                {personnel.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Estado</label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full p-2 rounded-xl bg-white border border-slate-200 text-[10px] font-bold text-slate-700 mt-0.5"
              >
                <option value="todas">Todos los estados</option>
                <option value="Pendiente">Pendiente</option>
                <option value="En Proceso">En Proceso</option>
                <option value="Terminada">Terminada</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Desde</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={e => setFilterDateFrom(e.target.value)}
                  className="w-full p-2 rounded-xl bg-white border border-slate-200 text-[10px] font-bold text-slate-700 mt-0.5"
                />
              </div>
              <div>
                <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Hasta</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={e => setFilterDateTo(e.target.value)}
                  className="w-full p-2 rounded-xl bg-white border border-slate-200 text-[10px] font-bold text-slate-700 mt-0.5"
                />
              </div>
            </div>
            {hasActiveFilters && (
              <div className="flex items-center gap-1 pt-1">
                <span className="text-[8px] font-bold text-blue-500">{filteredOrders.length} de {workOrders.length} OTs</span>
                <span className="text-[7px] text-slate-300">|</span>
                {filterArea !== 'todas' && (
                  <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[7px] font-bold">{workAreas.find(wa => wa.id === filterArea)?.name}</span>
                )}
                {filterPerson !== 'todos' && (
                  <span className="px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded text-[7px] font-bold">{personnel.find(p => p.id === filterPerson)?.name?.split(' ').slice(0, 2).join(' ')}</span>
                )}
                {filterStatus !== 'todas' && (
                  <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[7px] font-bold">{filterStatus}</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-slate-100 bg-white">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setDashTab(tab.key)}
              className={`flex-1 py-3 text-[7px] font-black uppercase transition-all flex flex-col items-center gap-1 ${
                dashTab === tab.key
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4 pb-32">
          {/* ─── Resumen Tab ─── */}
          {dashTab === 'resumen' && (
            <>
              {/* Key Metrics Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-red-50 border border-red-100 rounded-2xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock size={14} className="text-red-500" />
                    <span className="text-[8px] font-black text-red-400 uppercase">Pendientes</span>
                  </div>
                  <p className="text-2xl font-black text-red-600">{pendingOrders.length}</p>
                  <p className="text-[8px] text-red-400 font-medium mt-1">Esperando inicio</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity size={14} className="text-amber-500" />
                    <span className="text-[8px] font-black text-amber-400 uppercase">En Proceso</span>
                  </div>
                  <p className="text-2xl font-black text-amber-600">{inProcessOrders.length}</p>
                  <p className="text-[8px] text-amber-400 font-medium mt-1">Prom: {formatWorkingDuration(avgCurrentProcessTime, schedule)}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <span className="text-[8px] font-black text-emerald-400 uppercase">Terminadas</span>
                  </div>
                  <p className="text-2xl font-black text-emerald-600">{completedOrders.length}</p>
                  <p className="text-[8px] text-emerald-400 font-medium mt-1">Completadas</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp size={14} className="text-blue-500" />
                    <span className="text-[8px] font-black text-blue-400 uppercase">Eficiencia</span>
                  </div>
                  <p className="text-2xl font-black text-blue-600">{filteredOrders.length > 0 ? Math.round((completedOrders.length / filteredOrders.length) * 100) : 0}%</p>
                  <p className="text-[8px] text-blue-400 font-medium mt-1">Tasa completado</p>
                </div>
              </div>

              {/* Average Times */}
              <div className="bg-slate-50 rounded-2xl p-4">
                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                  <Timer size={12} /> Tiempos Promedio (OTs Terminadas)
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">Espera (creacion - inicio)</span>
                    <span className="text-sm font-black text-red-600">{formatWorkingDuration(avgWaitTime, schedule)}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-red-400 h-2 rounded-full" style={{ width: `${Math.min(100, (avgWaitTime / Math.max(avgTotalTime, 1)) * 100)}%` }}></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">Proceso (inicio - termino)</span>
                    <span className="text-sm font-black text-amber-600">{formatWorkingDuration(avgProcessTime, schedule)}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-amber-400 h-2 rounded-full" style={{ width: `${Math.min(100, (avgProcessTime / Math.max(avgTotalTime, 1)) * 100)}%` }}></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">Total (creacion - termino)</span>
                    <span className="text-sm font-black text-emerald-600">{formatWorkingDuration(avgTotalTime, schedule)}</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div className="bg-emerald-400 h-2 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>
              </div>

              {/* Completion Rate Visual */}
              <div className="bg-slate-50 rounded-2xl p-4">
                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Distribucion de Estados</h3>
                <div className="flex h-4 rounded-full overflow-hidden bg-slate-200">
                  {filteredOrders.length > 0 && (
                    <>
                      <div className="bg-red-400 transition-all" style={{ width: `${(pendingOrders.length / filteredOrders.length) * 100}%` }}></div>
                      <div className="bg-amber-400 transition-all" style={{ width: `${(inProcessOrders.length / filteredOrders.length) * 100}%` }}></div>
                      <div className="bg-emerald-400 transition-all" style={{ width: `${(completedOrders.length / filteredOrders.length) * 100}%` }}></div>
                    </>
                  )}
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[8px] font-bold text-red-400">{pendingOrders.length} Pend.</span>
                  <span className="text-[8px] font-bold text-amber-400">{inProcessOrders.length} Proc.</span>
                  <span className="text-[8px] font-bold text-emerald-400">{completedOrders.length} Term.</span>
                </div>
              </div>
            </>
          )}

          {/* ─── Personal Tab ─── */}
          {dashTab === 'personal' && (
            <>
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 mb-2">
                <p className="text-[9px] font-bold text-blue-600">Rendimiento del personal basado en tiempos registrados de las ordenes de trabajo</p>
              </div>
              {personnelMetrics.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="mx-auto text-slate-200 mb-3" size={40} />
                  <p className="text-slate-300 text-xs font-bold uppercase">No hay personal con OTs asignadas</p>
                </div>
              ) : (
              personnelMetrics.map(pm => (
                <div key={pm.id} className="bg-slate-50 rounded-2xl p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-black text-slate-800 text-xs">{pm.name}</p>
                      <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[7px] font-black uppercase text-white ${pm.workAreaColor}`}>
                        {pm.workAreaName}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-blue-600">{pm.totalOrders}</p>
                      <p className="text-[7px] font-bold text-slate-400 uppercase">OTs Total</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 text-center">
                    <div className="bg-red-50 rounded-xl p-2">
                      <p className="text-xs font-black text-red-600">{pm.pendingOrders}</p>
                      <p className="text-[6px] font-bold text-red-400 uppercase">Pend</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-2">
                      <p className="text-xs font-black text-amber-600">{pm.inProcessOrders}</p>
                      <p className="text-[6px] font-bold text-amber-400 uppercase">Proceso</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-2">
                      <p className="text-xs font-black text-emerald-600">{pm.completedOrders}</p>
                      <p className="text-[6px] font-bold text-emerald-400 uppercase">Term</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-2">
                      <p className="text-xs font-black text-blue-600">{pm.avgTime > 0 ? formatWorkingDuration(pm.avgTime, schedule) : '--'}</p>
                      <p className="text-[6px] font-bold text-blue-400 uppercase">Prom/OT</p>
                    </div>
                  </div>
                  {pm.totalTime > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[8px] font-bold text-slate-400 mb-1">
                        <span>Tiempo total trabajado</span>
                        <span className="text-slate-600">{formatWorkingDuration(pm.totalTime, schedule)}</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, (pm.avgTime / Math.max(avgProcessTime, 1)) * 100)}%` }}></div>
                      </div>
                    </div>
                  )}
                </div>
              ))
              )}
            </>
          )}

          {/* ─── Areas Tab ─── */}
          {dashTab === 'areas' && (
            <>
              <div className="bg-purple-50 border border-purple-100 rounded-2xl p-3 mb-2">
                <p className="text-[9px] font-bold text-purple-600">Rendimiento por area de trabajo basado en tiempos de OTs completadas</p>
              </div>
              {areaMetrics.map(am => (
                <div key={am.id} className="bg-slate-50 rounded-2xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded-full ${am.color}`} />
                      <span className="font-black text-slate-800 text-xs uppercase">{am.name}</span>
                    </div>
                    <span className="text-lg font-black text-slate-600">{am.total}</span>
                  </div>
                  <div className="flex h-3 rounded-full overflow-hidden bg-slate-200 mb-2">
                    {am.total > 0 && (
                      <>
                        <div className="bg-red-400 transition-all" style={{ width: `${(am.pending / am.total) * 100}%` }}></div>
                        <div className="bg-amber-400 transition-all" style={{ width: `${(am.inProcess / am.total) * 100}%` }}></div>
                        <div className="bg-emerald-400 transition-all" style={{ width: `${(am.completed / am.total) * 100}%` }}></div>
                      </>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-center">
                    <div className="bg-white rounded-lg p-1.5">
                      <p className="text-[10px] font-black text-red-500">{am.pending}</p>
                      <p className="text-[6px] font-bold text-slate-400 uppercase">Pend</p>
                    </div>
                    <div className="bg-white rounded-lg p-1.5">
                      <p className="text-[10px] font-black text-amber-500">{am.inProcess}</p>
                      <p className="text-[6px] font-bold text-slate-400 uppercase">Proc</p>
                    </div>
                    <div className="bg-white rounded-lg p-1.5">
                      <p className="text-[10px] font-black text-emerald-500">{am.completed}</p>
                      <p className="text-[6px] font-bold text-slate-400 uppercase">Term</p>
                    </div>
                    <div className="bg-white rounded-lg p-1.5">
                      <p className="text-[10px] font-black text-blue-600">{am.avgTime > 0 ? formatWorkingDuration(am.avgTime, schedule) : '--'}</p>
                      <p className="text-[6px] font-bold text-slate-400 uppercase">Prom</p>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* ─── Detalle Tab ─── */}
          {dashTab === 'detalle' && (
            <>
              <div className="bg-slate-50 rounded-2xl p-3 mb-2">
                <p className="text-[9px] font-bold text-slate-600 flex items-center gap-1">
                  <CalendarDays size={12} /> Registro de fechas y horarios por cada orden de trabajo
                </p>
              </div>
              {ordersWithTime.map(ot => (
                <div key={ot.id} className="bg-slate-50 rounded-2xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black bg-slate-200 px-2 py-0.5 rounded-full">{ot.otId}</span>
                      <span className={`text-[9px] font-black uppercase ${STATUS_CONFIG[ot.status]?.text ?? 'text-gray-500'}`}>{ot.status}</span>
                    </div>
                    {ot.wa && (
                      <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase text-white ${ot.wa.color}`}>
                        {ot.wa.name}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-slate-700 mb-2 truncate">{(ot.activities ?? []).join(', ')}</p>

                  {/* Timeline */}
                  <div className="border-l-2 border-slate-200 ml-2 pl-3 space-y-2">
                    <div className="relative">
                      <div className="absolute -left-[17px] top-0.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-white"></div>
                      <p className="text-[8px] font-black text-blue-500 uppercase">Creada</p>
                      <p className="text-[10px] font-bold text-slate-600">{formatDateTime(ot.createdAt)}</p>
                    </div>
                    {(ot.startedAt || ot.status === 'En Proceso' || ot.status === 'Terminada') && (
                      <div className="relative">
                        <div className="absolute -left-[17px] top-0.5 w-3 h-3 bg-amber-500 rounded-full border-2 border-white"></div>
                        <p className="text-[8px] font-black text-amber-500 uppercase">En Proceso</p>
                        <p className="text-[10px] font-bold text-slate-600">{formatDateTime(ot.startedAt ?? ot.createdAt)}</p>
                        {!ot.startedAt && ot.status !== 'Pendiente' && (
                          <p className="text-[7px] text-amber-400 font-medium italic">Hora no registrada, se usa fecha de creación</p>
                        )}
                        <p className="text-[8px] text-slate-400 font-medium">Espera: {formatWorkingDuration(ot.waitTime, schedule)}</p>
                      </div>
                    )}
                    {ot.completedAt && (
                      <div className="relative">
                        <div className="absolute -left-[17px] top-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>
                        <p className="text-[8px] font-black text-emerald-500 uppercase">Terminada</p>
                        <p className="text-[10px] font-bold text-slate-600">{formatDateTime(ot.completedAt)}</p>
                        <p className="text-[8px] text-slate-400 font-medium">Proceso: {formatWorkingDuration(ot.processTime, schedule)}</p>
                      </div>
                    )}
                  </div>

                  {/* Time Summary */}
                  <div className="mt-2 flex gap-2">
                    {ot.waitTime > 0 && (
                      <span className="px-2 py-1 bg-red-50 text-red-500 rounded-lg text-[8px] font-black">
                        Espera: {formatWorkingDuration(ot.waitTime, schedule)}
                      </span>
                    )}
                    {ot.processTime > 0 && (
                      <span className="px-2 py-1 bg-amber-50 text-amber-500 rounded-lg text-[8px] font-black">
                        Proceso: {formatWorkingDuration(ot.processTime, schedule)}
                      </span>
                    )}
                    {ot.totalTime > 0 && (
                      <span className="px-2 py-1 bg-emerald-50 text-emerald-500 rounded-lg text-[8px] font-black">
                        Total: {formatWorkingDuration(ot.totalTime, schedule)}
                      </span>
                    )}
                  </div>

                  {/* Collaborators */}
                  {(ot.collaborators ?? []).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(ot.collaborators ?? []).map(c => (
                        <span key={c} className="px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded text-[7px] font-bold">
                          {c.split(' ').slice(0, 2).join(' ')}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {ordersWithTime.length === 0 && (
                <div className="text-center py-12">
                  <Timer className="mx-auto text-slate-200 mb-3" size={40} />
                  <p className="text-slate-300 text-xs font-bold uppercase">No hay órdenes de trabajo</p>
                </div>
              )}
            </>
          )}

          {/* ─── Exportar Tab ─── */}
          {dashTab === 'exportar' && (
            <>
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 mb-2">
                <p className="text-[9px] font-bold text-amber-700 flex items-center gap-1">
                  <Filter size={12} /> Usa los filtros de la parte superior para seleccionar los datos que deseas exportar
                </p>
              </div>

              {/* Current filter summary */}
              <div className="bg-slate-50 rounded-2xl p-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Datos seleccionados</p>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-white rounded-xl p-2">
                    <p className="text-xl font-black text-blue-600">{filteredOrders.length}</p>
                    <p className="text-[7px] font-bold text-slate-400 uppercase">OTs a exportar</p>
                  </div>
                  <div className="bg-white rounded-xl p-2">
                    <p className="text-xl font-black text-emerald-600">{completedOrders.length}</p>
                    <p className="text-[7px] font-bold text-slate-400 uppercase">Terminadas</p>
                  </div>
                </div>
                {hasActiveFilters && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {filterArea !== 'todas' && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[7px] font-bold">
                        Area: {workAreas.find(wa => wa.id === filterArea)?.name}
                      </span>
                    )}
                    {filterPerson !== 'todos' && (
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full text-[7px] font-bold">
                        Persona: {personnel.find(p => p.id === filterPerson)?.name?.split(' ').slice(0, 2).join(' ')}
                      </span>
                    )}
                    {filterStatus !== 'todas' && (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full text-[7px] font-bold">
                        Estado: {filterStatus}
                      </span>
                    )}
                    {filterDateFrom && (
                      <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded-full text-[7px] font-bold">
                        Desde: {filterDateFrom}
                      </span>
                    )}
                    {filterDateTo && (
                      <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded-full text-[7px] font-bold">
                        Hasta: {filterDateTo}
                      </span>
                    )}
                  </div>
                )}
                {!hasActiveFilters && (
                  <p className="text-[8px] text-slate-400 font-medium mt-2 text-center">Sin filtros - se exportaran todas las OTs</p>
                )}
              </div>

              {/* Export OT Data */}
              <div className="bg-slate-50 rounded-2xl p-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                  <FileSpreadsheet size={12} /> Exportar Ordenes de Trabajo
                </p>
                <div className="space-y-2">
                  <button
                    onClick={exportCSV}
                    disabled={filteredOrders.length === 0}
                    className="w-full py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 disabled:opacity-30 active:scale-95 transition-transform"
                  >
                    <FileSpreadsheet size={16} /> Exportar CSV (Excel)
                  </button>
                  <button
                    onClick={exportPDF}
                    disabled={filteredOrders.length === 0}
                    className="w-full py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 disabled:opacity-30 active:scale-95 transition-transform"
                  >
                    <FileText size={16} /> Exportar PDF (Reporte)
                  </button>
                  <button
                    onClick={async () => {
                      const terminadas = filteredOrders.filter(o => o.status === 'Terminada');
                      if (terminadas.length === 0) {
                        alert('No hay OTs terminadas para exportar');
                        return;
                      }
                      try {
                        await buildMassTerminadasPDF(terminadas);
                      } catch (err) {
                        console.error('Error exporting mass PDF:', err);
                        alert('Error al generar el PDF masivo');
                      }
                    }}
                    disabled={completedOrders.length === 0}
                    className="w-full py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 disabled:opacity-30 active:scale-95 transition-transform"
                  >
                    <FileDown size={16} /> PDF Masivo Terminadas ({completedOrders.length})
                  </button>
                </div>
                <p className="text-[7px] text-slate-400 font-medium mt-2 text-center">
                  CSV: Todas las OTs con fechas, horarios y tiempos | PDF: Reporte formateado con tabla resumen | Masivo: PDF con cada OT terminada en página individual
                </p>
              </div>

              {/* Export Personnel Report */}
              <div className="bg-slate-50 rounded-2xl p-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                  <User size={12} /> Exportar Reporte de Personal
                </p>
                <button
                  onClick={exportPersonnelCSV}
                  disabled={personnelMetrics.length === 0}
                  className="w-full py-3 bg-purple-600 text-white rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 disabled:opacity-30 active:scale-95 transition-transform"
                >
                  <FileSpreadsheet size={16} /> Reporte Personal CSV
                </button>
                <p className="text-[7px] text-slate-400 font-medium mt-2 text-center">
                  Nombre, area, OTs totales, pendientes, en proceso, terminadas, tiempo promedio, tiempo total
                </p>
              </div>

              {/* Export Area Report */}
              <div className="bg-slate-50 rounded-2xl p-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                  <Activity size={12} /> Exportar Reporte por Areas
                </p>
                <button
                  onClick={exportAreaCSV}
                  disabled={areaMetrics.length === 0}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 disabled:opacity-30 active:scale-95 transition-transform"
                >
                  <FileSpreadsheet size={16} /> Reporte Areas CSV
                </button>
                <p className="text-[7px] text-slate-400 font-medium mt-2 text-center">
                  Area, OTs totales, pendientes, en proceso, terminadas, tiempo promedio
                </p>
              </div>

              {filteredOrders.length === 0 && (
                <div className="text-center py-8">
                  <Download className="mx-auto text-slate-200 mb-3" size={40} />
                  <p className="text-slate-300 text-xs font-bold uppercase">No hay datos para exportar</p>
                  <p className="text-[8px] text-slate-300 mt-1">Ajusta los filtros para seleccionar datos</p>
                </div>
              )}
            </>
          )}
        </div>
    </div>
  );
}

/* ─── Recurring Work Orders Panel ─── */

const DAY_LABELS: { day: number; label: string }[] = [
  { day: 1, label: 'Lun' },
  { day: 2, label: 'Mar' },
  { day: 3, label: 'Mié' },
  { day: 4, label: 'Jue' },
  { day: 5, label: 'Vie' },
  { day: 6, label: 'Sáb' },
  { day: 0, label: 'Dom' },
];

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'daily', label: 'Diaria' },
  { value: 'monthly', label: 'Mensual' },
];

function RecurringPanel({
  onBack,
  workAreas,
  personnel,
  zones,
}: {
  onBack: () => void;
  workAreas: WorkArea[];
  personnel: Personnel[];
  zones: Zone[];
}) {
  const { items, loading, createItem, updateItem, deleteItem, generateToday, refetch } = useRecurringWorkOrders();
  const [editingItem, setEditingItem] = useState<RecurringWorkOrderItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [wizardStep, setWizardStep] = useState(1);

  // Form state
  const [formName, setFormName] = useState('');
  const [formWorkAreaId, setFormWorkAreaId] = useState('');
  const [formActivities, setFormActivities] = useState<string[]>([]);
  const [formActivitiesText, setFormActivitiesText] = useState('');
  const [formCollaborators, setFormCollaborators] = useState<string[]>([]);
  const [formZoneName, setFormZoneName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formFrequency, setFormFrequency] = useState('weekly');
  const [formDaysOfWeek, setFormDaysOfWeek] = useState<number[]>([]);
  const [formDayOfMonth, setFormDayOfMonth] = useState<number>(1);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(''), 4000);
  };

  const resetForm = () => {
    setFormName('');
    setFormWorkAreaId('');
    setFormActivities([]);
    setFormActivitiesText('');
    setFormCollaborators([]);
    setFormZoneName('');
    setFormDescription('');
    setFormFrequency('weekly');
    setFormDaysOfWeek([]);
    setFormDayOfMonth(1);
    setEditingItem(null);
    setIsCreating(false);
    setWizardStep(1);
  };

  const startEdit = (item: RecurringWorkOrderItem) => {
    setEditingItem(item);
    setIsCreating(true);
    setWizardStep(1);
    setFormName(item.name);
    setFormWorkAreaId(item.workAreaId);
    setFormActivities([...item.activities]);
    setFormActivitiesText(item.activities.join(', '));
    setFormCollaborators([...item.collaborators]);
    setFormZoneName(item.zoneName);
    setFormDescription(item.description);
    setFormFrequency(item.frequency);
    setFormDaysOfWeek([...item.daysOfWeek]);
    setFormDayOfMonth(item.dayOfMonth ?? 1);
  };

  const startCreate = () => {
    resetForm();
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) { showToast('Ingresa un nombre', 'error'); return; }
    if (!formWorkAreaId) { showToast('Selecciona un área de trabajo', 'error'); return; }
    if (formFrequency === 'weekly' && formDaysOfWeek.length === 0) { showToast('Selecciona al menos un día', 'error'); return; }
    if (formFrequency === 'monthly' && (formDayOfMonth < 1 || formDayOfMonth > 31)) { showToast('Día del mes debe ser 1-31', 'error'); return; }

    const parsedActivities = formActivitiesText.split(',').map(a => a.trim()).filter(Boolean);
    const data: Partial<RecurringWorkOrderItem> = {
      name: formName.trim(),
      workAreaId: formWorkAreaId,
      activities: parsedActivities,
      collaborators: formCollaborators,
      zoneName: formZoneName,
      description: formDescription,
      frequency: formFrequency,
      daysOfWeek: formFrequency === 'weekly' ? formDaysOfWeek : [],
      dayOfMonth: formFrequency === 'monthly' ? formDayOfMonth : null,
    };

    if (editingItem) {
      const result = await updateItem(editingItem.id, data);
      if (result) {
        showToast('OT Repetitiva actualizada');
      } else {
        showToast('Error al actualizar', 'error');
      }
    } else {
      const result = await createItem(data);
      if (result) {
        showToast('OT Repetitiva creada');
      } else {
        showToast('Error al crear', 'error');
      }
    }
    resetForm();
  };

  const handleTogglePause = async (item: RecurringWorkOrderItem) => {
    const newStatus = item.status === 'active' ? 'paused' : 'active';
    const result = await updateItem(item.id, { status: newStatus });
    if (result) {
      showToast(newStatus === 'active' ? 'OT Repetitiva reanudada' : 'OT Repetitiva pausada');
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await deleteItem(id);
    if (ok) {
      showToast('OT Repetitiva eliminada');
    } else {
      showToast('Error al eliminar', 'error');
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    const result = await generateToday();
    setGenerating(false);
    if (result) {
      showToast(result.message);
    } else {
      showToast('Error al generar OTs', 'error');
    }
  };

  const toggleDay = (day: number) => {
    setFormDaysOfWeek(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };



  const toggleCollaborator = (name: string) => {
    setFormCollaborators(prev =>
      prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
    );
  };

  // Filtered data for form
  const selectedWorkArea = workAreas.find(wa => wa.id === formWorkAreaId);
  const availableCollaborators = personnel.map(p => ({
    name: p.name,
    workAreaName: workAreas.find(wa => wa.id === p.workAreaId)?.name ?? 'Sin área',
    workAreaId: p.workAreaId,
  }));

  const getWorkAreaName = (id: string) => workAreas.find(wa => wa.id === id)?.name ?? 'Sin área';
  const getWorkAreaColor = (id: string) => workAreas.find(wa => wa.id === id)?.color ?? 'bg-gray-500';

  const renderSchedule = (item: RecurringWorkOrderItem) => {
    if (item.frequency === 'daily') {
      return <span className="text-[9px] font-black text-slate-500 uppercase">Todos los días</span>;
    }
    if (item.frequency === 'weekly') {
      return (
        <div className="flex gap-1 flex-wrap">
          {DAY_LABELS.filter(d => item.daysOfWeek.includes(d.day)).map(d => (
            <span key={d.day} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[8px] font-black">{d.label}</span>
          ))}
        </div>
      );
    }
    if (item.frequency === 'monthly') {
      return <span className="text-[9px] font-black text-slate-500 uppercase">Día {item.dayOfMonth} del mes</span>;
    }
    return null;
  };

  const WIZARD_STEPS = [
    { num: 1, label: 'Nombre' },
    { num: 2, label: 'Actividades' },
    { num: 3, label: 'Lugar' },
    { num: 4, label: 'Frecuencia' },
    { num: 5, label: 'Confirmar' },
  ];

  const canGoNext = () => {
    if (wizardStep === 1) return formName.trim() !== '' && formWorkAreaId !== '';
    if (wizardStep === 2) return true;
    if (wizardStep === 3) return true;
    if (wizardStep === 4) {
      if (formFrequency === 'weekly') return formDaysOfWeek.length > 0;
      return true;
    }
    return true;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-slate-100 p-4 flex items-center gap-3">
          <button onClick={onBack} className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors active:scale-95">
            <ChevronLeft size={18} className="text-slate-600" />
          </button>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
            <Repeat size={18} /> OTs Repetitivas
          </h2>
        </div>

        {/* Toast */}
        {toastMsg && (
          <div className={`mx-4 mt-3 p-3 rounded-2xl text-center text-xs font-black uppercase ${
            toastType === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
          }`}>
            {toastMsg}
          </div>
        )}

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {/* Generate Today Button */}
          {!isCreating && (
            <div className="p-4 pb-0">
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50 shadow-lg shadow-blue-200"
              >
                {generating ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CalendarDays size={16} />
                )}
                {generating ? 'Generando...' : 'Generar OTs Hoy'}
              </button>
            </div>
          )}

          {/* Create New Button */}
          {!isCreating && (
            <div className="p-4 pb-0">
              <button
                onClick={startCreate}
                className="w-full py-3 bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Plus size={16} /> Nueva OT Repetitiva
              </button>
            </div>
          )}

          {/* ─── Step-by-Step Wizard ─── */}
          {isCreating && (
            <div className="p-4 space-y-4">
              {/* Progress Indicator */}
              <div className="flex items-center justify-between">
                {WIZARD_STEPS.map((step, idx) => (
                  <div key={step.num} className="flex items-center">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-[10px] font-black transition-all ${
                      wizardStep === step.num
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                        : wizardStep > step.num
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 text-slate-400'
                    }`}>
                      {wizardStep > step.num ? '✓' : step.num}
                    </div>
                    {idx < WIZARD_STEPS.length - 1 && (
                      <div className={`w-4 h-0.5 mx-0.5 ${wizardStep > step.num ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                    )}
                  </div>
                ))}
              </div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">
                Paso {wizardStep} de 5 — {WIZARD_STEPS[wizardStep - 1].label}
              </p>

              {/* Step 1: Nombre + Área de Trabajo */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase ml-1">Nombre *</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      placeholder="Ej: Recolección Lun-Mié-Vie"
                      className="w-full p-4 mt-1 rounded-2xl bg-slate-50 border-none font-bold text-sm"
                    />
                  </div>
                  <Dropdown
                    label="Área de Trabajo *"
                    icon={Tag}
                    options={workAreas.map(wa => ({ value: wa.name, subtitle: `${wa.activities.length} actividades`, colorDot: wa.color }))}
                    selected={selectedWorkArea?.name ?? ''}
                    onSelect={val => {
                      const wa = workAreas.find(w => w.name === val);
                      setFormWorkAreaId(wa?.id ?? '');
                      setFormActivities([]);
                      setFormActivitiesText('');
                      setFormCollaborators([]);
                    }}
                    placeholder="Seleccionar área..."
                    searchable
                  />
                </div>
              )}

              {/* Step 2: Actividades + Colaboradores */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase ml-1 flex items-center gap-1">
                      <Tag size={10} /> Actividades
                    </label>
                    <textarea
                      value={formActivitiesText}
                      onChange={e => setFormActivitiesText(e.target.value)}
                      placeholder="Ej: Corte De Pasto, Desmalezado, Riego"
                      rows={2}
                      className="w-full p-4 mt-2 rounded-2xl bg-slate-50 border-none font-bold text-sm resize-none"
                    />
                    <p className="text-[9px] text-slate-400 mt-1 ml-1">Separa actividades con coma</p>
                  </div>
                  {formWorkAreaId && (
                    <MultiSelectCollaborators
                      selected={formCollaborators}
                      onToggle={toggleCollaborator}
                      availableCollaborators={availableCollaborators}
                      selectedWorkAreaId={formWorkAreaId}
                    />
                  )}
                </div>
              )}

              {/* Step 3: Lugar + Descripción del trabajo */}
              {wizardStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase ml-1 flex items-center gap-1">
                      <MapPin size={10} /> Lugar
                    </label>
                    <input
                      type="text"
                      value={formZoneName}
                      onChange={e => setFormZoneName(e.target.value)}
                      placeholder="Ej: Entrada Norte, Piscina 1, Portería"
                      className="w-full p-4 mt-2 rounded-2xl bg-slate-50 border-none font-bold text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase ml-1">Descripción del trabajo</label>
                    <textarea
                      value={formDescription}
                      onChange={e => setFormDescription(e.target.value)}
                      placeholder="Describe el trabajo a realizar..."
                      rows={3}
                      className="w-full p-4 mt-1 rounded-2xl bg-slate-50 border-none font-bold text-sm resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Step 4: Frecuencia + Días */}
              {wizardStep === 4 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase ml-1">Frecuencia</label>
                    <div className="flex gap-2 mt-2">
                      {FREQUENCY_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setFormFrequency(opt.value)}
                          className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase transition-all active:scale-95 ${
                            formFrequency === opt.value
                              ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                              : 'bg-slate-50 text-slate-400 border border-slate-100'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {formFrequency === 'weekly' && (
                    <div>
                      <label className="text-xs font-black text-slate-400 uppercase ml-1">Días de la semana *</label>
                      <div className="flex gap-1.5 mt-2">
                        {DAY_LABELS.map(d => {
                          const isSelected = formDaysOfWeek.includes(d.day);
                          return (
                            <button
                              key={d.day}
                              type="button"
                              onClick={() => toggleDay(d.day)}
                              className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase transition-all active:scale-95 ${
                                isSelected
                                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                                  : 'bg-slate-50 text-slate-300 border border-slate-100'
                              }`}
                            >
                              {d.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {formFrequency === 'monthly' && (
                    <div>
                      <label className="text-xs font-black text-slate-400 uppercase ml-1">Día del mes</label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={formDayOfMonth}
                        onChange={e => setFormDayOfMonth(parseInt(e.target.value) || 1)}
                        className="w-full p-4 mt-1 rounded-2xl bg-slate-50 border-none font-bold text-sm"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Step 5: Resumen + Confirmar */}
              {wizardStep === 5 && (
                <div className="space-y-3">
                  <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400 uppercase">Nombre</span>
                      <span className="text-sm font-black text-slate-800">{formName || '—'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400 uppercase">Área</span>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase text-white ${getWorkAreaColor(formWorkAreaId)}`}>
                        {getWorkAreaName(formWorkAreaId)}
                      </span>
                    </div>
                    {formActivitiesText.trim() && (
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Actividades</span>
                        <div className="flex flex-wrap gap-1">
                          {formActivitiesText.split(',').map(a => a.trim()).filter(Boolean).map(a => (
                            <span key={a} className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black">{a}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {formCollaborators.length > 0 && (
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Colaboradores</span>
                        <div className="flex flex-wrap gap-1">
                          {formCollaborators.map(c => (
                            <span key={c} className="px-2 py-1 bg-purple-50 text-purple-600 rounded-lg text-[9px] font-black">
                              {c.split(' ').slice(0, 2).join(' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400 uppercase">Lugar</span>
                      <span className="text-sm font-black text-slate-800">{formZoneName || '—'}</span>
                    </div>
                    {formDescription && (
                      <div>
                        <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Descripción del trabajo</span>
                        <p className="text-xs text-slate-600 font-medium">{formDescription}</p>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400 uppercase">Frecuencia</span>
                      <span className="text-sm font-black text-slate-800">
                        {FREQUENCY_OPTIONS.find(f => f.value === formFrequency)?.label ?? '—'}
                        {formFrequency === 'weekly' && formDaysOfWeek.length > 0 && (
                          <span className="ml-1 text-[9px] font-bold text-blue-500">
                            ({DAY_LABELS.filter(d => formDaysOfWeek.includes(d.day)).map(d => d.label).join(', ')})
                          </span>
                        )}
                        {formFrequency === 'monthly' && ` (Día ${formDayOfMonth})`}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Wizard Navigation Buttons */}
              <div className="flex gap-2 pt-2 pb-4">
                {wizardStep > 1 && (
                  <button
                    onClick={() => setWizardStep(s => s - 1)}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm uppercase active:scale-95 transition-transform flex items-center justify-center gap-2"
                  >
                    <ChevronLeft size={16} /> Atrás
                  </button>
                )}
                {wizardStep < 5 ? (
                  <button
                    onClick={() => canGoNext() && setWizardStep(s => s + 1)}
                    disabled={!canGoNext()}
                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase active:scale-95 transition-transform disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    Siguiente <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    onClick={handleSave}
                    className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase active:scale-95 transition-transform shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={18} /> {editingItem ? 'Guardar' : 'Crear'}
                  </button>
                )}
              </div>

              {/* Cancel link */}
              <button
                onClick={resetForm}
                className="w-full py-2 text-slate-400 font-bold text-xs uppercase text-center hover:text-red-500 transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}

          {/* ─── List of Existing Recurring OTs ─── */}
          {!isCreating && (
            <div className="p-4 space-y-3">
              {loading ? (
                <div className="text-center py-8">
                  <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-slate-400 text-xs font-bold">Cargando...</p>
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-12">
                  <Repeat className="mx-auto text-slate-200 mb-3" size={40} />
                  <p className="text-slate-300 text-xs font-bold uppercase">No hay OTs repetitivas</p>
                  <p className="text-slate-200 text-[9px] font-medium mt-1">Crea una para automatizar la generación de OTs</p>
                </div>
              ) : (
                items.map(item => (
                  <div key={item.id} className="bg-slate-50 rounded-2xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase text-white ${
                            item.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}>
                            {item.status === 'active' ? 'Activa' : 'Pausada'}
                          </span>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[8px] font-black uppercase text-white ${getWorkAreaColor(item.workAreaId)}`}>
                            {getWorkAreaName(item.workAreaId)}
                          </span>
                        </div>
                        <h4 className="font-black text-slate-800 uppercase text-sm truncate">{item.name}</h4>
                        {renderSchedule(item)}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => startEdit(item)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleTogglePause(item)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 transition-colors"
                          title={item.status === 'active' ? 'Pausar' : 'Reanudar'}
                        >
                          {item.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Activities */}
                    {item.activities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.activities.map(act => (
                          <span key={act} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[8px] font-black uppercase">{act}</span>
                        ))}
                      </div>
                    )}

                    {/* Collaborators */}
                    {item.collaborators.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {item.collaborators.map(c => (
                          <span key={c} className="px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded text-[8px] font-black">
                            {c.split(' ').slice(0, 2).join(' ')}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Zone + Last Generated */}
                    <div className="flex items-center gap-3 mt-2">
                      {item.zoneName && (
                        <span className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-1">
                          <MapPin size={9} className="text-blue-500" /> {item.zoneName}
                        </span>
                      )}
                      {item.lastGeneratedAt && (
                        <span className="text-[9px] text-slate-300 font-medium">
                          Última: {formatDate(item.lastGeneratedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
    </div>
  );
}

/* ─── Calendar Panel ─── */

function toChileDateString(ts: number): string {
  return new Date(ts).toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
}

function getProjectedRecurringForDate(date: Date, items: RecurringWorkOrderItem[]): RecurringWorkOrderItem[] {
  const dayOfWeek = date.getDay(); // 0=Sun
  const dayOfMonth = date.getDate();
  return items.filter(item => {
    if (item.status !== 'active') return false;
    if (item.frequency === 'daily') return true;
    if (item.frequency === 'weekly') return item.daysOfWeek.includes(dayOfWeek);
    if (item.frequency === 'monthly') return item.dayOfMonth === dayOfMonth;
    return false;
  });
}

function groupByDate(orders: WorkOrder[]): Map<string, WorkOrder[]> {
  const map = new Map<string, WorkOrder[]>();
  for (const ot of orders) {
    // Use plannedDate if set, otherwise fall back to createdAt
    const key = toChileDateString(ot.plannedDate ?? ot.createdAt);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(ot);
  }
  return map;
}

const CHILE_MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function CalendarPanel({
  onBack,
  workOrders,
  recurringItems,
  workAreas,
  userRole,
}: {
  onBack: () => void;
  workOrders: WorkOrder[];
  recurringItems: RecurringWorkOrderItem[];
  workAreas: WorkArea[];
  userRole: UserRole;
}) {
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Chile today
  const chileToday = toChileDateString(Date.now());

  // Group work orders by date
  const ordersByDate = groupByDate(workOrders);

  // Build calendar grid data
  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay = new Date(viewYear, viewMonth + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Monday=0
  const totalDays = lastDay.getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
    setSelectedDate(null);
  };

  const goToToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDate(null);
  };

  // Get selected day detail
  const selectedOrders: WorkOrder[] = selectedDate ? (ordersByDate.get(selectedDate) ?? []) : [];
  let selectedRecurring: RecurringWorkOrderItem[] = [];
  if (selectedDate) {
    const parts = selectedDate.split('-');
    const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    selectedRecurring = getProjectedRecurringForDate(d, recurringItems);
  }

  const getWorkAreaName = (waId: string) => workAreas.find(w => w.id === waId)?.name ?? waId;
  const getWorkAreaColor = (waId: string) => workAreas.find(w => w.id === waId)?.color ?? 'bg-slate-400';

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-slate-100 p-4 flex items-center gap-3">
          <button onClick={onBack} className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors active:scale-95">
            <ChevronLeft size={18} className="text-slate-600" />
          </button>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
            <CalendarDays size={18} /> Calendario
          </h2>
        </div>

        <div className="flex-1 p-4 space-y-4 overflow-y-auto no-scrollbar pb-32">
          {/* Month Navigation */}
          <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-3">
            <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-white transition-colors">
              <ChevronLeft size={18} className="text-slate-600" />
            </button>
            <button onClick={goToToday} className="text-center">
              <p className="text-sm font-black text-slate-800 uppercase tracking-tighter">
                {CHILE_MONTHS[viewMonth]} {viewYear}
              </p>
              <p className="text-[8px] font-bold text-violet-500 uppercase">Hoy</p>
            </button>
            <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-white transition-colors">
              <ChevronRight size={18} className="text-slate-600" />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAY_LABELS.map(label => (
              <div key={label} className="text-center text-[9px] font-black text-slate-400 uppercase py-1">
                {label}
              </div>
            ))}
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="h-12" />;
              }

              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isToday = dateStr === chileToday;
              const isSelected = dateStr === selectedDate;
              const dayOrders = ordersByDate.get(dateStr) ?? [];
              const dayDate = new Date(viewYear, viewMonth, day);
              const dayRecurring = getProjectedRecurringForDate(dayDate, recurringItems);
              const hasProjected = dayRecurring.length > 0;

              const hasPendiente = dayOrders.some(o => o.status === 'Pendiente');
              const hasEnProceso = dayOrders.some(o => o.status === 'En Proceso');
              const hasTerminada = dayOrders.some(o => o.status === 'Terminada');

              const totalDayOTs = dayOrders.length + dayRecurring.length;
              const uniqueWorkAreas = [...new Set(dayRecurring.map(r => r.workAreaId))];

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className={`
                    h-16 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all relative
                    ${isSelected ? 'bg-blue-50 ring-2 ring-blue-500' : isToday ? 'bg-slate-100' : 'hover:bg-slate-50'}
                  `}
                >
                  <span className={`
                    text-xs leading-none
                    ${isSelected ? 'font-black text-blue-600' : isToday ? 'font-black text-slate-800' : 'font-semibold text-slate-600'}
                    ${hasProjected && !isSelected ? 'ring-2 ring-blue-300 rounded-full w-5 h-5 flex items-center justify-center' : ''}
                  `}>
                    {day}
                  </span>
                  {/* OT count */}
                  {totalDayOTs > 0 && (
                    <span className="text-[7px] font-black text-slate-400">{totalDayOTs} OT{totalDayOTs > 1 ? 's' : ''}</span>
                  )}
                  {/* Status dots */}
                  {(hasPendiente || hasEnProceso || hasTerminada) && (
                    <div className="flex items-center gap-0.5">
                      {hasPendiente && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                      {hasEnProceso && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                      {hasTerminada && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    </div>
                  )}
                  {/* Area color badges for projected recurring */}
                  {!hasPendiente && !hasEnProceso && !hasTerminada && hasProjected && (
                    <div className="flex items-center gap-0.5">
                      {uniqueWorkAreas.slice(0, 3).map(waId => (
                        <span key={waId} className={`w-1.5 h-1.5 rounded-full ${getWorkAreaColor(waId)}`} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="bg-slate-50 rounded-2xl p-3">
            <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Leyenda</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span className="flex items-center gap-1.5 text-[9px] font-bold text-slate-600">
                <span className="w-2 h-2 rounded-full bg-red-500" /> Pendiente
              </span>
              <span className="flex items-center gap-1.5 text-[9px] font-bold text-slate-600">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> En Proceso
              </span>
              <span className="flex items-center gap-1.5 text-[9px] font-bold text-slate-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Terminada
              </span>
              <span className="flex items-center gap-1.5 text-[9px] font-bold text-slate-600">
                <span className="w-2 h-2 rounded-full border-2 border-blue-400" /> Proyectada
              </span>
            </div>
          </div>

          {/* Day Detail Bottom Sheet */}
          {selectedDate && (
            <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl max-h-[60vh] overflow-y-auto z-50 border-t border-slate-200 no-scrollbar">
              {/* Drag handle */}
              <div className="flex justify-center pt-2 pb-1 sticky top-0 bg-white z-10">
                <button onClick={() => setSelectedDate(null)} className="w-10 h-1 bg-slate-200 rounded-full" />
              </div>
              <div className="px-4 pb-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">
                    {(() => {
                      const parts = selectedDate.split('-');
                      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                      return `${dayNames[d.getDay()]} ${d.getDate()}`;
                    })()}
                  </h3>
                  <span className="text-[9px] font-black text-slate-400 uppercase">{selectedDate}</span>
                </div>

                {/* Actual Work Orders */}
                {selectedOrders.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Planificación</p>
                    {selectedOrders.map(ot => (
                      <div key={ot.id} className="bg-slate-50 rounded-2xl p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-800">{ot.otId}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase text-white ${STATUS_CONFIG[ot.status]?.color ?? 'bg-slate-400'}`}>
                            {ot.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {ot.activities.slice(0, 3).map(a => (
                            <span key={a} className="text-[8px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded-md">{a}</span>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-[9px] text-slate-400">
                            <MapPin size={9} /> {ot.zoneName || '—'}
                          </span>
                          {ot.recurringId && (() => {
                            const wa = workAreas.find(w => {
                              const rec = recurringItems.find(r => r.id === ot.recurringId);
                              return rec ? w.id === rec.workAreaId : false;
                            });
                            return wa ? (
                              <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black text-white ${wa.color}`}>
                                {wa.name}
                              </span>
                            ) : null;
                          })()}
                          {!ot.recurringId && (() => {
                            const wa = workAreas.find(w => w.activities.some(a => ot.activities.includes(a)));
                            return wa ? (
                              <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black text-white ${wa.color}`}>
                                {wa.name}
                              </span>
                            ) : null;
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Projected Recurring OTs */}
                {selectedRecurring.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-blue-400 uppercase flex items-center gap-1">
                      <Repeat size={9} /> OTs Proyectadas (Recurrentes)
                    </p>
                    {selectedRecurring.map(item => (
                      <div key={item.id} className="bg-blue-50 border border-blue-100 rounded-2xl p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-800">{item.name}</span>
                          <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-blue-100 text-blue-600">
                            proyectada
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {item.activities.slice(0, 3).map(a => (
                            <span key={a} className="text-[8px] font-bold text-blue-500 bg-white px-1.5 py-0.5 rounded-md">{a}</span>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-[9px] text-slate-400">
                            <MapPin size={9} /> {item.zoneName || '—'}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-black text-white ${getWorkAreaColor(item.workAreaId)}`}>
                            {getWorkAreaName(item.workAreaId)}
                          </span>
                        </div>
                        <div className="text-[8px] text-blue-400 font-medium">
                          {item.frequency === 'daily' ? 'Diaria' : item.frequency === 'weekly' ? 'Semanal' : 'Mensual'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedOrders.length === 0 && selectedRecurring.length === 0 && (
                  <div className="bg-slate-50 rounded-2xl p-6 text-center">
                    <p className="text-xs font-bold text-slate-400">Sin OTs para este día</p>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Backdrop for bottom sheet */}
          {selectedDate && (
            <div className="fixed inset-0 z-40 bg-slate-900/30" onClick={() => setSelectedDate(null)} />
          )}
        </div>
    </div>
  );
}

/* ─── Audit Log View (Admin Only) ─── */

interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string;
  changes: Record<string, { old: unknown; new: unknown }>;
  performedBy: string;
  profileId: string | null;
  createdAt: number;
}

function AuditLogView({
  onBack,
}: {
  onBack: () => void;
}) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filterEntityType, setFilterEntityType] = useState<string>('');
  const [filterAction, setFilterAction] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('limit', '200');
      if (filterEntityType) params.set('entityType', filterEntityType);
      if (filterAction) params.set('action', filterAction);
      const res = await fetch(`/api/audit?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [filterEntityType, filterAction]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = searchTerm.trim()
    ? logs.filter(log =>
        log.entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.performedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entityType.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : logs;

  const ACTION_CONFIG: Record<string, { color: string; bg: string; icon: React.ElementType; label: string }> = {
    'CREATE': { color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100', icon: Plus, label: 'Creación' },
    'UPDATE': { color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100', icon: Pencil, label: 'Modificación' },
    'DELETE': { color: 'text-red-600', bg: 'bg-red-50 border-red-100', icon: Trash2, label: 'Eliminación' },
  };

  const ENTITY_LABELS: Record<string, string> = {
    'WorkOrder': 'Orden de Trabajo',
    'Profile': 'Perfil',
    'RecurringWorkOrder': 'OT Repetitiva',
  };

  const formatChangeValue = (val: unknown): string => {
    if (val === null || val === undefined) return '—';
    if (Array.isArray(val)) {
      if (val.length === 0) return '(vacío)';
      return val.join(', ');
    }
    return String(val);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50">
      {/* Header */}
      <div className="p-4 bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onBack} className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors active:scale-95">
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <div className="flex items-center gap-2">
            <ScrollText size={20} className="text-blue-600" />
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Historial de Actividad</h2>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Registro de modificaciones</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-2">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl">
            <Search size={14} className="text-slate-400 flex-shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, perfil o tipo..."
              className="bg-transparent text-sm font-medium w-full outline-none placeholder:text-slate-300"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Chips */}
          <div className="flex gap-2">
            <select
              value={filterEntityType}
              onChange={e => setFilterEntityType(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-slate-50 text-xs font-bold text-slate-600 border-none outline-none"
            >
              <option value="">Todo tipo</option>
              <option value="WorkOrder">Órdenes de Trabajo</option>
              <option value="Profile">Perfiles</option>
              <option value="RecurringWorkOrder">OTs Repetitivas</option>
            </select>
            <select
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-slate-50 text-xs font-bold text-slate-600 border-none outline-none"
            >
              <option value="">Toda acción</option>
              <option value="CREATE">Creación</option>
              <option value="UPDATE">Modificación</option>
              <option value="DELETE">Eliminación</option>
            </select>
          </div>
        </div>
      </div>

      {/* Log List */}
      <div className="p-4 space-y-2 flex-1 overflow-y-auto pb-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400 text-sm font-bold">Cargando historial...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <ScrollText size={40} className="text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 text-sm font-bold">No hay registros de actividad</p>
            <p className="text-slate-300 text-xs mt-1">Las acciones se registrarán automáticamente</p>
          </div>
        ) : (
          <>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
              {total} registro(s) total · {filteredLogs.length} mostrado(s)
            </p>
            {filteredLogs.map(log => {
              const config = ACTION_CONFIG[log.action] || ACTION_CONFIG['UPDATE'];
              const IconComp = config.icon;
              const isExpanded = expandedId === log.id;
              const changeKeys = Object.keys(log.changes || {});

              return (
                <div key={log.id} className={`rounded-2xl border ${config.bg} overflow-hidden`}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    className="w-full p-3 flex items-center gap-3 text-left"
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${config.color} bg-white/60`}>
                      <IconComp size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black uppercase ${config.color}`}>{config.label}</span>
                        <span className="text-[8px] font-medium text-slate-400">{ENTITY_LABELS[log.entityType] || log.entityType}</span>
                      </div>
                      <p className="text-sm font-black text-slate-800 truncate">{log.entityName || log.entityId}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-medium text-slate-500 flex items-center gap-1">
                          <User size={8} /> {log.performedBy}
                        </span>
                        <span className="text-[9px] text-slate-300">·</span>
                        <span className="text-[9px] font-medium text-slate-400">{formatDateTime(log.createdAt)}</span>
                      </div>
                    </div>
                    {changeKeys.length > 0 && (
                      <ChevronRight size={16} className={`text-slate-300 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    )}
                  </button>

                  {/* Expanded Changes */}
                  {isExpanded && changeKeys.length > 0 && (
                    <div className="px-3 pb-3 border-t border-white/40">
                      <div className="space-y-1.5 mt-2">
                        {changeKeys.map(key => {
                          const change = log.changes[key];
                          const oldVal = formatChangeValue(change?.old);
                          const newVal = formatChangeValue(change?.new);
                          if (oldVal === newVal) return null;
                          return (
                            <div key={key} className="bg-white/60 rounded-xl p-2">
                              <p className="text-[8px] font-black text-slate-500 uppercase mb-1">{key}</p>
                              <div className="flex items-center gap-2 text-[10px]">
                                {log.action === 'DELETE' ? (
                                  <span className="text-red-500 font-medium line-through truncate">{oldVal}</span>
                                ) : log.action === 'CREATE' ? (
                                  <span className="text-emerald-600 font-medium truncate">{newVal}</span>
                                ) : (
                                  <>
                                    <span className="text-red-400 font-medium line-through truncate max-w-[40%]">{oldVal}</span>
                                    <span className="text-slate-300 flex-shrink-0">→</span>
                                    <span className="text-emerald-600 font-medium truncate max-w-[40%]">{newVal}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Guardias Panel (Admin) ─── */

function GuardiasPanel({
  onBack,
  performedBy,
  profileId,
  currentProfile,
  userRole,
  onScan,
}: {
  onBack: () => void;
  performedBy: string;
  profileId: string | undefined;
  currentProfile: ProfileItem | null;
  userRole: UserRole;
  onScan?: () => void;
}) {
  const { locations, loading: locLoading, createLocation, updateLocation, deleteLocation, refetch: refetchLocations } = useQrLocations(performedBy, profileId);
  const { scans, loading: scansLoading, total: scansTotal, refetch: refetchScans } = useQrScans();
  const [tab, setTab] = useState<'locations' | 'scans'>('locations');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<QrLocationItem | null>(null);
  const [qrImageMap, setQrImageMap] = useState<Record<string, string>>({});
  const [showQrModal, setShowQrModal] = useState<QrLocationItem | null>(null);
  const [scanFilter, setScanFilter] = useState<string>('all'); // all or location id
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formCode, setFormCode] = useState('');

  // Load QR images for all locations
  useEffect(() => {
    locations.forEach(async (loc) => {
      if (!qrImageMap[loc.code]) {
        try {
          const res = await fetch(`/api/qr-generate?code=${encodeURIComponent(loc.code)}&size=512`);
          if (res.ok) {
            const data = await res.json();
            setQrImageMap(prev => ({ ...prev, [loc.code]: data.dataUrl }));
          }
        } catch { /* ignore */ }
      }
    });
  }, [locations]);

  // Also load QR preview for form code
  useEffect(() => {
    if (formCode.trim() && !qrImageMap[formCode.trim()]) {
      fetch(`/api/qr-generate?code=${encodeURIComponent(formCode.trim())}&size=512`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.dataUrl) {
            setQrImageMap(prev => ({ ...prev, [formCode.trim()]: data.dataUrl }));
          }
        })
        .catch(() => {});
    }
  }, [formCode]);

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormLocation('');
    setFormCode('');
    setEditingLocation(null);
    setShowCreateModal(false);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formCode.trim()) return;
    if (editingLocation) {
      await updateLocation(editingLocation.id, {
        name: formName,
        description: formDescription,
        location: formLocation,
        code: formCode,
      } as any);
    } else {
      await createLocation({
        name: formName,
        description: formDescription,
        location: formLocation,
        code: formCode,
      } as any);
    }
    resetForm();
  };

  const handleEdit = (loc: QrLocationItem) => {
    setFormName(loc.name);
    setFormDescription(loc.description);
    setFormLocation(loc.location);
    setFormCode(loc.code);
    setEditingLocation(loc);
    setShowCreateModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar esta ubicación QR y todos sus escaneos?')) {
      await deleteLocation(id);
    }
  };

  const handleToggleActive = async (loc: QrLocationItem) => {
    await updateLocation(loc.id, { active: !loc.active } as any);
  };

  const handleApplyFilters = () => {
    const filters: any = {};
    if (scanFilter !== 'all') filters.qrLocationId = scanFilter;
    if (dateFrom) filters.from = new Date(dateFrom).getTime();
    if (dateTo) filters.to = new Date(dateTo + 'T23:59:59').getTime();
    refetchScans(filters);
  };

  const isAdmin = userRole === 'admin';
  const isGuardia = currentProfile?.permissions?.includes('guardia');

  // Filter scans for guardia profile - only their own scans
  const visibleScans = isGuardia && !isAdmin
    ? scans.filter(s => s.profileId === currentProfile?.id || s.scannedBy === currentProfile?.name)
    : scans;

  // ─── QR Export Functions ───
  const [exporting, setExporting] = useState(false);

  // Export a single QR as PDF
  const exportSingleQR = async (loc: QrLocationItem) => {
    setExporting(true);
    try {
      const res = await fetch(`/api/qr-export?mode=single&code=${encodeURIComponent(loc.code)}`);
      if (!res.ok) throw new Error('Error al generar QR');
      const data = await res.json();
      if (!data.items?.length) throw new Error('No se encontró la ubicación');

      const item = data.items[0];
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [216, 279], // Letter size
      });

      // Center the 60x60mm QR on the page
      const qrSize = 60;
      const x = (216 - qrSize) / 2;
      const y = (279 - qrSize - 15) / 2; // offset for label

      // Add QR image
      pdf.addImage(item.dataUrl, 'PNG', x, y, qrSize, qrSize);

      // Add name label below QR
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text(item.name, 216 / 2, y + qrSize + 6, { align: 'center' });

      // Add code below name
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text(item.code, 216 / 2, y + qrSize + 11, { align: 'center' });

      // Add location if present
      if (item.location) {
        pdf.setFontSize(8);
        pdf.text(item.location, 216 / 2, y + qrSize + 15, { align: 'center' });
      }

      pdf.save(`QR-${item.name}-${item.code}.pdf`);
    } catch (err: any) {
      alert('Error al exportar QR: ' + (err.message || 'Error desconocido'));
    } finally {
      setExporting(false);
    }
  };

  // Export all QRs grouped by name on Letter size pages
  const exportBulkQR = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/qr-export?mode=bulk&groupByName=true');
      if (!res.ok) throw new Error('Error al generar QRs');
      const data = await res.json();
      if (!data.items?.length) {
        alert('No hay ubicaciones QR activas para exportar');
        return;
      }

      const items: Array<{
        id: string;
        name: string;
        code: string;
        location: string;
        description: string;
        dataUrl: string;
      }> = data.items;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [216, 279], // Letter size
      });

      // Layout config
      const qrSize = 60; // 60x60mm per QR
      const spacing = 5; // 5mm between QRs for cutting
      const marginLeft = 10; // 10mm margins
      const marginTop = 10;
      const labelHeight = 15; // Space for name + code label below QR
      const cellHeight = qrSize + labelHeight; // Total cell height including label
      const cellWidth = qrSize + spacing; // Cell width with spacing

      // Calculate how many per row/column
      const usableWidth = 216 - 2 * marginLeft; // 196mm
      const usableHeight = 279 - 2 * marginTop; // 259mm
      const colsPerRow = Math.floor((usableWidth + spacing) / cellWidth); // 3
      const rowsPerPage = Math.floor((usableHeight + spacing) / (cellHeight + spacing)); // 3

      // Group items by name (already sorted by the API)
      const groups: Record<string, typeof items> = {};
      const groupOrder: string[] = [];
      for (const item of items) {
        if (!groups[item.name]) {
          groups[item.name] = [];
          groupOrder.push(item.name);
        }
        groups[item.name].push(item);
      }

      // Layout all items on pages
      let page = 0;
      let col = 0;
      let row = 0;
      let currentGroupName = '';

      for (const groupName of groupOrder) {
        const groupItems = groups[groupName];

        for (const item of groupItems) {
          // Check if we need a new page
          if (row >= rowsPerPage || (page === 0 && row === 0 && col === 0 && currentGroupName === '')) {
            if (page > 0 || col > 0) {
              pdf.addPage([216, 279], 'portrait');
              row = 0;
              col = 0;
            }
            page++;

            // Add page header
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(8);
            pdf.setTextColor(150);
            pdf.text('Laguna Norte - Codigos QR', 216 / 2, marginTop - 3, { align: 'center' });
            pdf.setTextColor(0);
          }

          // Check if we need a new row
          if (col >= colsPerRow) {
            col = 0;
            row++;
          }

          // Check if we need a new page after row increment
          if (row >= rowsPerPage) {
            pdf.addPage([216, 279], 'portrait');
            page++;
            row = 0;
            col = 0;

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(8);
            pdf.setTextColor(150);
            pdf.text('Laguna Norte - Codigos QR', 216 / 2, marginTop - 3, { align: 'center' });
            pdf.setTextColor(0);
          }

          const x = marginLeft + col * cellWidth;
          const y = marginTop + row * (cellHeight + spacing);

          // Draw QR
          pdf.addImage(item.dataUrl, 'PNG', x, y, qrSize, qrSize);

          // Draw cut guide lines (light dashed)
          pdf.setDrawColor(220);
          pdf.setLineDashPattern([1, 2], 0);
          pdf.rect(x - 1, y - 1, qrSize + 2, qrSize + 2);
          pdf.setLineDashPattern([], 0);

          // Name label below QR
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(9);
          pdf.setTextColor(30, 41, 59);
          pdf.text(item.name, x + qrSize / 2, y + qrSize + 5, { align: 'center' });

          // Code below name
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(7);
          pdf.setTextColor(100);
          pdf.text(item.code, x + qrSize / 2, y + qrSize + 9, { align: 'center' });

          // Location if present
          if (item.location) {
            pdf.setFontSize(6);
            pdf.setTextColor(130);
            pdf.text(item.location, x + qrSize / 2, y + qrSize + 13, { align: 'center' });
          }

          col++;
          currentGroupName = groupName;
        }
      }

      // Add page numbers
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(180);
        pdf.text(`Pagina ${i} de ${totalPages}`, 216 / 2, 279 - 5, { align: 'center' });
      }

      pdf.save('QR-Ubicaciones-Laguna-Norte.pdf');
    } catch (err: any) {
      alert('Error al exportar QRs: ' + (err.message || 'Error desconocido'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-100 p-4 flex items-center gap-3">
        <button onClick={onBack} className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors active:scale-95">
          <ChevronLeft size={20} className="text-slate-600" />
        </button>
        <div className="flex-1">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Guardias</h2>
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Control de rondas y ubicaciones</p>
        </div>
        {isGuardia && onScan && (
          <button
            onClick={onScan}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase active:scale-95 transition-transform"
          >
            <Scan size={14} /> Escanear QR
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => { resetForm(); setShowCreateModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase active:scale-95 transition-transform"
          >
            <Plus size={14} /> Nueva Ubicación
          </button>
        )}
        {isAdmin && locations.length > 0 && (
          <button
            onClick={exportBulkQR}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase active:scale-95 transition-transform disabled:opacity-50"
          >
            {exporting ? <RefreshCcw size={14} className="animate-spin" /> : <FileDown size={14} />} Exportar Todo
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 m-4 rounded-2xl">
        <button
          onClick={() => setTab('locations')}
          className={`flex-1 py-2 px-1 rounded-xl text-[9px] font-black uppercase transition-all ${tab === 'locations' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <QrCode size={12} className="inline mr-1" /> Ubicaciones ({locations.length})
        </button>
        <button
          onClick={() => setTab('scans')}
          className={`flex-1 py-2 px-1 rounded-xl text-[9px] font-black uppercase transition-all ${tab === 'scans' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
        >
          <Scan size={12} className="inline mr-1" /> Escaneos ({scansTotal})
        </button>
      </div>

      {/* Locations Tab */}
      {tab === 'locations' && (
        <div className="px-4 pb-20 space-y-3">
          {locLoading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-400 text-sm font-bold">Cargando ubicaciones...</p>
            </div>
          ) : locations.length === 0 ? (
            <div className="text-center py-12">
              <QrCode className="mx-auto text-slate-200 mb-3" size={40} />
              <p className="text-slate-300 text-xs font-bold uppercase">No hay ubicaciones QR</p>
              <p className="text-slate-300 text-[10px] mt-1">Crea ubicaciones para generar códigos QR</p>
            </div>
          ) : (
            locations.map(loc => (
              <div key={loc.id} className={`bg-white rounded-2xl border ${loc.active ? 'border-slate-100' : 'border-red-100 bg-red-50/30'} p-4 shadow-sm`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-black text-slate-800 uppercase">{loc.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[7px] font-black uppercase ${loc.active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                        {loc.active ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                    {loc.location && (
                      <p className="text-[10px] text-blue-500 font-bold flex items-center gap-1">
                        <MapPinned size={10} /> {loc.location}
                      </p>
                    )}
                    {loc.description && (
                      <p className="text-[10px] text-slate-400 font-medium mt-1">{loc.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[8px] font-black bg-slate-100 px-2 py-0.5 rounded-full text-slate-500">{loc.code}</span>
                      <span className="text-[8px] font-bold text-slate-400 flex items-center gap-0.5">
                        <Scan size={8} /> {loc.scanCount} escaneos
                      </span>
                    </div>
                  </div>
                  {/* QR thumbnail */}
                  {qrImageMap[loc.code] && (
                    <button
                      onClick={() => setShowQrModal(loc)}
                      className="flex-shrink-0 w-16 h-16 rounded-xl border border-slate-100 overflow-hidden hover:shadow-md transition-shadow active:scale-95"
                    >
                      <img src={qrImageMap[loc.code]} alt="QR" className="w-full h-full object-contain" />
                    </button>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-50">
                    <button onClick={() => exportSingleQR(loc)} disabled={exporting} className="flex-1 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1 hover:bg-emerald-100 transition-colors active:scale-95 disabled:opacity-50">
                      <FileDown size={10} /> Exportar
                    </button>
                    <button onClick={() => handleEdit(loc)} className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1 hover:bg-slate-100 transition-colors active:scale-95">
                      <Pencil size={10} /> Editar
                    </button>
                    <button onClick={() => handleToggleActive(loc)} className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1 transition-colors active:scale-95 ${loc.active ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
                      {loc.active ? <><Pause size={10} /> Desactivar</> : <><Play size={10} /> Activar</>}
                    </button>
                    <button onClick={() => handleDelete(loc.id)} className="flex-1 py-2 bg-red-50 text-red-500 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1 hover:bg-red-100 transition-colors active:scale-95">
                      <Trash2 size={10} /> Eliminar
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Scans Tab */}
      {tab === 'scans' && (
        <div className="px-4 pb-20 space-y-3">
          {/* Filters */}
          <div className="bg-white rounded-2xl border border-slate-100 p-3 space-y-2">
            <div className="flex gap-2">
              <select
                value={scanFilter}
                onChange={e => setScanFilter(e.target.value)}
                className="flex-1 p-2 rounded-xl bg-slate-50 text-xs font-bold text-slate-700 border-none"
              >
                <option value="all">Todas las ubicaciones</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
              <button
                onClick={handleApplyFilters}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase active:scale-95 transition-transform"
              >
                Filtrar
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="flex-1 p-2 rounded-xl bg-slate-50 text-xs font-bold text-slate-700 border-none"
                placeholder="Desde"
              />
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="flex-1 p-2 rounded-xl bg-slate-50 text-xs font-bold text-slate-700 border-none"
                placeholder="Hasta"
              />
            </div>
          </div>

          {scansLoading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-400 text-sm font-bold">Cargando escaneos...</p>
            </div>
          ) : visibleScans.length === 0 ? (
            <div className="text-center py-12">
              <Scan className="mx-auto text-slate-200 mb-3" size={40} />
              <p className="text-slate-300 text-xs font-bold uppercase">No hay escaneos registrados</p>
            </div>
          ) : (
            visibleScans.map(scan => (
              <div key={scan.id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-black text-slate-800">{scan.location?.name ?? 'Ubicación eliminada'}</span>
                      <span className="text-[7px] font-black bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full">{scan.location?.code}</span>
                    </div>
                    {scan.location?.location && (
                      <p className="text-[10px] text-blue-500 font-bold flex items-center gap-1">
                        <MapPinned size={10} /> {scan.location.location}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      {scan.scannedBy && (
                        <span className="text-[9px] font-bold text-purple-500 flex items-center gap-1">
                          <ShieldCheck size={9} /> {scan.scannedBy}
                        </span>
                      )}
                      <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                        <Clock size={9} /> {formatDateTime(scan.createdAt)}
                      </span>
                    </div>
                    {(scan.latitude != null && scan.longitude != null) && (
                      <span className="text-[8px] text-emerald-500 font-bold mt-1 inline-block">
                        GPS: {scan.latitude.toFixed(6)}, {scan.longitude.toFixed(6)}
                      </span>
                    )}
                    {scan.notes && (
                      <p className="text-[10px] text-slate-400 font-medium mt-1">Nota: {scan.notes}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0 w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <Scan size={18} className="text-emerald-500" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create/Edit Location Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[90] bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={resetForm}>
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-black text-slate-800 uppercase mb-4">
              {editingLocation ? 'Editar Ubicación' : 'Nueva Ubicación QR'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nombre *</label>
                <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Ej: Portería Principal" className="w-full p-4 mt-1 rounded-2xl bg-slate-50 border-none font-bold text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Código QR *</label>
                <input value={formCode} onChange={e => setFormCode(e.target.value.toUpperCase())} placeholder="Ej: QR-PORTERIA-01" className="w-full p-4 mt-1 rounded-2xl bg-slate-50 border-none font-bold text-sm uppercase" />
                <p className="text-[9px] text-slate-400 mt-1 ml-1">Este código se codificará en el QR. Debe ser único.</p>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Ubicación / Sector</label>
                <input value={formLocation} onChange={e => setFormLocation(e.target.value)} placeholder="Ej: Entrada Norte - Sector A" className="w-full p-4 mt-1 rounded-2xl bg-slate-50 border-none font-bold text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Descripción</label>
                <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Detalles adicionales..." rows={2} className="w-full p-4 mt-1 rounded-2xl bg-slate-50 border-none font-bold text-sm resize-none" />
              </div>
              {formCode.trim() && (
                <div className="text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Vista previa del QR</p>
                  <div className="inline-block p-3 bg-white rounded-2xl border border-slate-100 shadow-lg">
                    {qrImageMap[formCode.trim()] ? (
                      <img src={qrImageMap[formCode.trim()]} alt="QR Preview" className="w-40 h-40" />
                    ) : (
                      <div className="w-40 h-40 flex items-center justify-center text-slate-300">
                        <QrCode size={40} />
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={resetForm} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-2xl text-xs font-bold uppercase">Cancelar</button>
                <button onClick={handleSave} disabled={!formName.trim() || !formCode.trim()} className="flex-1 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase active:scale-95 transition-transform disabled:opacity-50">
                  {editingLocation ? 'Guardar' : 'Crear'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Full View Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-[90] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center" onClick={() => setShowQrModal(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <h3 className="text-lg font-black text-slate-800 uppercase">{showQrModal.name}</h3>
              <p className="text-xs text-blue-500 font-bold flex items-center justify-center gap-1">
                <MapPinned size={12} /> {showQrModal.location || 'Sin ubicación'}
              </p>
              <p className="text-[9px] text-slate-400 font-bold mt-1">{showQrModal.code}</p>
            </div>
            <div className="flex justify-center mb-4">
              {qrImageMap[showQrModal.code] ? (
                <img src={qrImageMap[showQrModal.code]} alt="QR Code" className="w-64 h-64" />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center text-slate-300">
                  <QrCode size={60} />
                </div>
              )}
            </div>
            <p className="text-[9px] text-slate-400 text-center font-medium">Imprime este QR y colócalo en la ubicación</p>
            <button onClick={() => setShowQrModal(null)} className="w-full mt-4 py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-bold uppercase">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── QR Scanner View (Guardia) ─── */

/* ─── Offline Scan Storage Helper ─── */

interface OfflineScan {
  id: string;
  code: string;
  scannedBy: string;
  profileId: string;
  latitude: number | null;
  longitude: number | null;
  notes: string;
  scannedAt: number; // timestamp when scanned locally
  synced: boolean;
}

const OFFLINE_SCANS_KEY = 'laguna_norte_offline_scans';

function getOfflineScans(): OfflineScan[] {
  try {
    const data = localStorage.getItem(OFFLINE_SCANS_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveOfflineScans(scans: OfflineScan[]) {
  localStorage.setItem(OFFLINE_SCANS_KEY, JSON.stringify(scans));
}

function addOfflineScan(scan: OfflineScan) {
  const scans = getOfflineScans();
  scans.push(scan);
  saveOfflineScans(scans);
}

function removeOfflineScans(ids: string[]) {
  const scans = getOfflineScans().filter(s => !ids.includes(s.id));
  saveOfflineScans(scans);
  return scans;
}

function QrScannerView({
  onBack,
  profileName,
  profileId,
  isGuardiaMode = false,
}: {
  onBack: () => void;
  profileName: string;
  profileId: string;
  isGuardiaMode?: boolean;
}) {
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<QrScanItem | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [notes, setNotes] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [myScans, setMyScans] = useState<QrScanItem[]>([]);
  const [scannerInstance, setScannerInstance] = useState<any>(null);

  // ─── Offline State ───
  const [isOnline, setIsOnline] = useState(true);
  const [pendingScans, setPendingScans] = useState<OfflineScan[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ synced: number; failed: number } | null>(null);

  // ─── Online/Offline Detection ───
  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);
    // Load pending scans from localStorage
    setPendingScans(getOfflineScans().filter(s => !s.synced));

    const handleOnline = () => {
      setIsOnline(true);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ─── Auto-sync when coming back online ───
  // Uses a ref to track previous online state so we only sync on offline→online transition
  const prevOnlineRef = useRef(true);
  const syncingRef = useRef(false);

  // ─── Sync pending scans to server ───
  const syncPendingScans = useCallback(async () => {
    // Prevent double-sync
    if (syncingRef.current) return;
    const unsynced = getOfflineScans().filter(s => !s.synced);
    if (unsynced.length === 0) {
      setPendingScans([]);
      return;
    }

    syncingRef.current = true;
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/qr-scans/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scans: unsynced }),
      });
      if (res.ok) {
        const data = await res.json();
        // Remove successfully synced scans from localStorage
        const syncedIds = (data.results || [])
          .filter((r: any) => r.success)
          .map((r: any) => {
            // Find matching offline scan by code
            const match = unsynced.find((s: OfflineScan) => s.code === r.code);
            return match?.id;
          })
          .filter(Boolean);

        if (syncedIds.length > 0) {
          removeOfflineScans(syncedIds);
        }

        const remaining = getOfflineScans().filter(s => !s.synced);
        setPendingScans(remaining);
        setSyncResult({ synced: data.synced || 0, failed: data.failed || 0 });

        // Refresh my scans from server
        try {
          const scanRes = await fetch(`/api/qr-scans?scannedBy=${encodeURIComponent(profileName)}&limit=20`);
          if (scanRes.ok) {
            const scanData = await scanRes.json();
            setMyScans(Array.isArray(scanData.scans) ? scanData.scans : []);
          }
        } catch { /* ignore */ }
      }
    } catch {
      // Still offline or server error - keep pending
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [profileName]);

  // Trigger auto-sync on offline→online transition AND when new scans are added while online
  useEffect(() => {
    const wasOffline = !prevOnlineRef.current;
    prevOnlineRef.current = isOnline;

    if (isOnline && pendingScans.length > 0 && !syncingRef.current) {
      // Auto-sync: either we just came back online, or a new scan was added while online that needs syncing
      syncPendingScans();
    }
  }, [isOnline, pendingScans.length, syncPendingScans]);

  // Load my recent scans
  useEffect(() => {
    const fetchMyScans = async () => {
      if (!navigator.onLine) return; // Don't fetch if offline
      try {
        const res = await fetch(`/api/qr-scans?scannedBy=${encodeURIComponent(profileName)}&limit=20`);
        if (res.ok) {
          const data = await res.json();
          setMyScans(Array.isArray(data.scans) ? data.scans : []);
        }
      } catch { /* ignore */ }
    };
    fetchMyScans();
    const interval = setInterval(fetchMyScans, 10000);
    return () => clearInterval(interval);
  }, [profileName]);

  const handleScan = useCallback(async (code: string) => {
    setError('');
    setSuccess('');
    try {
      // Try to get GPS position
      let lat: number | undefined, lng: number | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, enableHighAccuracy: true });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch { /* GPS not available, that's ok */ }

      const scanPayload = {
        code,
        scannedBy: profileName,
        profileId,
        latitude: lat,
        longitude: lng,
        notes: notes.trim() || undefined,
      };

      if (navigator.onLine) {
        // ─── ONLINE: Send directly to server ───
        const result = await fetch('/api/qr-scans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(scanPayload),
        });
        if (!result.ok) {
          const errData = await result.json();
          throw new Error(errData.error || 'Error al registrar escaneo');
        }
        const scanData = await result.json();
        setLastScan(scanData);
        setSuccess(`Ubicación registrada: ${scanData?.location?.name ?? code}`);
        setNotes('');

        // Refresh my scans
        try {
          const res = await fetch(`/api/qr-scans?scannedBy=${encodeURIComponent(profileName)}&limit=20`);
          if (res.ok) {
            const data = await res.json();
            setMyScans(Array.isArray(data.scans) ? data.scans : []);
          }
        } catch { /* ignore */ }
      } else {
        // ─── OFFLINE: Save locally ───
        const offlineScan: OfflineScan = {
          id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          code,
          scannedBy: profileName,
          profileId,
          latitude: lat ?? null,
          longitude: lng ?? null,
          notes: notes.trim(),
          scannedAt: Date.now(),
          synced: false,
        };
        addOfflineScan(offlineScan);
        setPendingScans(prev => [...prev, offlineScan]);
        setLastScan({
          id: offlineScan.id,
          qrLocationId: '',
          scannedBy: profileName,
          profileId,
          latitude: lat ?? null,
          longitude: lng ?? null,
          notes: notes.trim(),
          createdAt: Date.now(),
          location: null,
        });
        setSuccess(`Guardado localmente (sin internet): ${code}`);
        setNotes('');
      }
    } catch (err: any) {
      // If fetch fails (network error), try saving offline
      if (!navigator.onLine || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        let lat: number | null = null, lng: number | null = null;
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000, enableHighAccuracy: true });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch { /* GPS not available */ }

        const offlineScan: OfflineScan = {
          id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          code,
          scannedBy: profileName,
          profileId,
          latitude: lat,
          longitude: lng,
          notes: notes.trim(),
          scannedAt: Date.now(),
          synced: false,
        };
        addOfflineScan(offlineScan);
        setPendingScans(prev => [...prev, offlineScan]);
        setLastScan({
          id: offlineScan.id,
          qrLocationId: '',
          scannedBy: profileName,
          profileId,
          latitude: lat,
          longitude: lng,
          notes: notes.trim(),
          createdAt: Date.now(),
          location: null,
        });
        setSuccess(`Guardado localmente (sin internet): ${code}`);
        setNotes('');
      } else {
        setError(err.message || 'Error al registrar escaneo');
      }
    }
  }, [profileName, profileId, notes]);

  const startScanner = useCallback(async () => {
    setScanning(true);
    setError('');
    try {
      const scanner = new Html5Qrcode('qr-reader');
      setScannerInstance(scanner);
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText: string) => {
          // Stop scanner after successful scan
          try { await scanner.stop(); } catch { /* ignore */ }
          setScanning(false);
          setScannerInstance(null);
          await handleScan(decodedText);
        },
        () => { /* ignore scan errors (no QR found yet) */ }
      );
    } catch (err: any) {
      console.error('Scanner error:', err);
      setError('No se pudo iniciar la cámara. Verifica los permisos de cámara e intenta de nuevo.');
      setScanning(false);
    }
  }, [handleScan]);

  const stopScanner = useCallback(async () => {
    if (scannerInstance) {
      try { await scannerInstance.stop(); } catch { /* ignore */ }
      setScannerInstance(null);
    }
    setScanning(false);
  }, [scannerInstance]);

  const handleManualScan = () => {
    if (manualCode.trim()) {
      handleScan(manualCode.trim());
      setManualCode('');
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerInstance) {
        try { scannerInstance.stop(); } catch { /* ignore */ }
      }
    };
  }, [scannerInstance]);

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-100 p-4 flex items-center gap-3">
        {isGuardiaMode ? (
          <div className="flex-1">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
              <Scan size={16} className="text-teal-500" /> Escanear QR
            </h2>
            <p className="text-[8px] font-black text-teal-500 uppercase tracking-widest">{profileName}</p>
          </div>
        ) : (
          <>
            <button onClick={() => { stopScanner(); onBack(); }} className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors active:scale-95">
              <ChevronLeft size={20} className="text-slate-600" />
            </button>
            <div className="flex-1">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Escanear QR</h2>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{profileName}</p>
            </div>
          </>
        )}
        {isGuardiaMode && (
          <button onClick={() => { stopScanner(); onBack(); }} className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-500 rounded-xl text-[9px] font-black uppercase hover:bg-red-100 transition-colors active:scale-95">
            <LogOut size={14} /> Salir
          </button>
        )}
      </div>

      <div className="p-4 space-y-4 pb-20">
        {/* ─── Connection Status Banner ─── */}
        {!isOnline && (
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl flex items-center gap-3">
            <WifiOff className="text-amber-500 flex-shrink-0" size={20} />
            <div className="flex-1">
              <p className="text-xs font-black text-amber-700 uppercase">Sin conexión a internet</p>
              <p className="text-[10px] text-amber-500 font-bold">Los escaneos se guardarán localmente y se enviarán al recuperar conexión</p>
            </div>
          </div>
        )}

        {/* ─── Pending Scans Badge & Auto-Sync ─── */}
        {pendingScans.length > 0 && (
          <div className={`border p-3 rounded-2xl flex items-center gap-3 ${syncing ? 'bg-blue-50 border-blue-200' : isOnline ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${syncing ? 'bg-blue-100' : isOnline ? 'bg-emerald-100' : 'bg-amber-100'}`}>
              {syncing ? (
                <RefreshCcw size={18} className="text-blue-500 animate-spin" />
              ) : isOnline ? (
                <Upload size={18} className="text-emerald-500" />
              ) : (
                <CloudOff size={18} className="text-amber-500" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-xs font-black uppercase" style={{ color: syncing ? '#2563eb' : isOnline ? '#059669' : '#d97706' }}>
                {pendingScans.length} escaneo{pendingScans.length !== 1 ? 's' : ''} pendiente{pendingScans.length !== 1 ? 's' : ''}
              </p>
              {syncing ? (
                <p className="text-[10px] font-bold text-blue-500">Enviando automáticamente...</p>
              ) : isOnline ? (
                <p className="text-[10px] font-bold text-emerald-500">Enviando al servidor...</p>
              ) : (
                <p className="text-[10px] font-bold text-amber-500">Se enviarán automáticamente al recuperar conexión</p>
              )}
            </div>
          </div>
        )}

        {/* ─── Sync Result ─── */}
        {syncResult && (
          <div className={`border p-3 rounded-2xl flex items-center gap-3 ${syncResult.failed > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
            {syncResult.failed > 0 ? (
              <CloudOff className="text-amber-500 flex-shrink-0" size={18} />
            ) : (
              <CloudCheck className="text-emerald-500 flex-shrink-0" size={18} />
            )}
            <div>
              <p className="text-xs font-black uppercase" style={{ color: syncResult.failed > 0 ? '#d97706' : '#059669' }}>
                {syncResult.synced} escaneo{syncResult.synced !== 1 ? 's' : ''} sincronizado{syncResult.synced !== 1 ? 's' : ''}
                {syncResult.failed > 0 && ` · ${syncResult.failed} fallido${syncResult.failed !== 1 ? 's' : ''}`}
              </p>
            </div>
            <button onClick={() => setSyncResult(null)} className="ml-auto p-1 hover:bg-black/5 rounded-lg">
              <X size={14} className="text-slate-400" />
            </button>
          </div>
        )}

        {/* ─── Online Indicator (small, always visible) ─── */}
        <div className="flex items-center justify-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${isOnline ? 'bg-emerald-50' : 'bg-amber-50'}`}>
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className={`text-[9px] font-black uppercase ${isOnline ? 'text-emerald-600' : 'text-amber-600'}`}>
              {isOnline ? 'En línea' : 'Sin conexión'}
            </span>
            {pendingScans.length > 0 && (
              <span className={`text-[9px] font-black ml-1 ${isOnline ? 'text-blue-600' : 'text-amber-600'}`}>
                · {pendingScans.length} pendiente{pendingScans.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className={`border p-4 rounded-2xl flex items-center gap-3 ${success.includes('localmente') ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'}`}>
            {success.includes('localmente') ? (
              <CloudOff className="text-amber-500 flex-shrink-0" size={20} />
            ) : (
              <CheckCircle2 className="text-emerald-500 flex-shrink-0" size={20} />
            )}
            <div>
              <p className={`text-xs font-black uppercase ${success.includes('localmente') ? 'text-amber-700' : 'text-emerald-700'}`}>{success}</p>
              {lastScan?.location?.location && (
                <p className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 mt-1">
                  <MapPinned size={10} /> {lastScan.location.location}
                </p>
              )}
              <p className="text-[10px] text-slate-400 font-medium mt-1">
                {lastScan && formatDateTime(lastScan.createdAt)}
              </p>
            </div>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center gap-3">
            <X className="text-red-500 flex-shrink-0" size={20} />
            <p className="text-xs font-bold text-red-600">{error}</p>
          </div>
        )}

        {/* Scanner Area */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          <div id="qr-reader" className="w-full" style={{ minHeight: scanning ? '300px' : '0' }}></div>
          {!scanning && (
            <div className="p-8 text-center">
              <QrCode className="mx-auto text-slate-200 mb-3" size={60} />
              <p className="text-slate-400 text-xs font-bold">Presiona el botón para escanear</p>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Notas (opcional)</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: Todo normal, sin novedades" className="w-full p-4 mt-1 rounded-2xl bg-slate-50 border-none font-bold text-sm" />
        </div>

        {/* Scan Button */}
        <button
          onClick={scanning ? stopScanner : startScanner}
          className={`w-full py-4 rounded-2xl font-black uppercase text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg ${
            scanning
              ? 'bg-red-500 text-white shadow-red-200'
              : isOnline
                ? 'bg-blue-600 text-white shadow-blue-200'
                : 'bg-amber-500 text-white shadow-amber-200'
          }`}
        >
          {scanning ? (
            <><X size={18} /> Detener Escáner</>
          ) : isOnline ? (
            <><Scan size={18} /> Escanear QR</>
          ) : (
            <><Scan size={18} /> Escanear QR (Offline)</>
          )}
        </button>

        {/* Manual Code Entry */}
        <div className="bg-slate-50 rounded-2xl p-4">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-2">O ingresa el código manualmente</p>
          <div className="flex gap-2">
            <input
              value={manualCode}
              onChange={e => setManualCode(e.target.value.toUpperCase())}
              placeholder="Ej: QR-PORTERIA-01"
              className="flex-1 p-3 rounded-xl bg-white border-none font-bold text-xs uppercase"
              onKeyDown={e => e.key === 'Enter' && handleManualScan()}
            />
            <button
              onClick={handleManualScan}
              disabled={!manualCode.trim()}
              className={`px-4 py-3 text-white rounded-xl text-xs font-black uppercase active:scale-95 transition-transform disabled:opacity-50 ${isOnline ? 'bg-blue-600' : 'bg-amber-500'}`}
            >
              Registrar
            </button>
          </div>
        </div>

        {/* ─── Pending Scans Detail List ─── */}
        {pendingScans.length > 0 && (
          <div>
            <p className="text-[10px] font-black text-amber-500 uppercase mb-2 ml-1 flex items-center gap-1">
              <CloudOff size={10} /> Escaneos pendientes por enviar
            </p>
            <div className="space-y-2">
              {pendingScans.map(scan => (
                <div key={scan.id} className="bg-amber-50 rounded-2xl border border-amber-100 p-3 flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CloudOff size={14} className="text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-amber-800 truncate">{scan.code}</p>
                    <p className="text-[9px] text-amber-400 font-bold">{formatDateTime(scan.scannedAt)}</p>
                    {scan.notes && <p className="text-[9px] text-amber-400">{scan.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My Recent Scans */}
        {myScans.length > 0 && (
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Mis últimos escaneos</p>
            <div className="space-y-2">
              {myScans.slice(0, 5).map(scan => (
                <div key={scan.id} className="bg-white rounded-2xl border border-slate-100 p-3 flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-800 truncate">{scan.location?.name ?? 'Desconocida'}</p>
                    <p className="text-[9px] text-slate-400 font-bold">{formatDateTime(scan.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Inventario Panel ─── */

const INVENTORY_CATEGORIES = [
  { id: 'maquina', label: 'Máquina', icon: Cog, color: 'bg-purple-500' },
  { id: 'herramienta', label: 'Herramienta', icon: WrenchIcon, color: 'bg-orange-500' },
  { id: 'vehiculo', label: 'Vehículo', icon: Package, color: 'bg-blue-500' },
  { id: 'otro', label: 'Otro', icon: Tag, color: 'bg-slate-500' },
];

const INVENTORY_STATUS: Record<string, { color: string; text: string; bg: string }> = {
  'operativo': { color: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' },
  'en reparacion': { color: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' },
  'fuera de servicio': { color: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' },
};

function InventarioPanel({
  onBack,
  performedBy,
  profileId,
}: {
  onBack: () => void;
  performedBy: string;
  profileId: string | undefined;
}) {
  const { items, loading, createItem, updateItem, deleteItem, refetch } = useInventory(performedBy, profileId);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItemData | null>(null);
  const [showQrModal, setShowQrModal] = useState<InventoryItemData | null>(null);
  const [qrImageMap, setQrImageMap] = useState<Record<string, string>>({});
  const [exporting, setExporting] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formSerialNumber, setFormSerialNumber] = useState('');
  const [formCategory, setFormCategory] = useState('maquina');
  const [formLocation, setFormLocation] = useState('');
  const [formLastMaintenance, setFormLastMaintenance] = useState('');
  const [formLastReview, setFormLastReview] = useState('');
  const [formNextMaintenance, setFormNextMaintenance] = useState('');
  const [formStatus, setFormStatus] = useState('operativo');
  const [formPhoto, setFormPhoto] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Load QR images for items
  useEffect(() => {
    items.forEach(async (item) => {
      if (!qrImageMap[item.qrCode]) {
        try {
          const res = await fetch(`/api/qr-generate?code=${encodeURIComponent(item.qrCode)}&size=512`);
          if (res.ok) {
            const data = await res.json();
            setQrImageMap(prev => ({ ...prev, [item.qrCode]: data.dataUrl }));
          }
        } catch { /* ignore */ }
      }
    });
  }, [items]);

  // Filter items
  const filteredItems = items.filter(item => {
    if (filterCategory && item.category !== filterCategory) return false;
    if (filterStatus && item.status !== filterStatus) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return item.name.toLowerCase().includes(q)
        || item.brand.toLowerCase().includes(q)
        || item.model.toLowerCase().includes(q)
        || item.serialNumber.toLowerCase().includes(q)
        || item.location.toLowerCase().includes(q)
        || item.qrCode.toLowerCase().includes(q);
    }
    return true;
  });

  const resetForm = () => {
    setFormName('');
    setFormBrand('');
    setFormModel('');
    setFormSerialNumber('');
    setFormCategory('maquina');
    setFormLocation('');
    setFormLastMaintenance('');
    setFormLastReview('');
    setFormNextMaintenance('');
    setFormStatus('operativo');
    setFormPhoto('');
    setFormNotes('');
    setEditingItem(null);
    setShowFormModal(false);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    const data: Partial<InventoryItemData> = {
      name: formName.trim(),
      brand: formBrand.trim(),
      model: formModel.trim(),
      serialNumber: formSerialNumber.trim(),
      category: formCategory,
      location: formLocation.trim(),
      lastMaintenance: formLastMaintenance ? new Date(formLastMaintenance).getTime() : null,
      lastReview: formLastReview ? new Date(formLastReview).getTime() : null,
      nextMaintenance: formNextMaintenance ? new Date(formNextMaintenance).getTime() : null,
      status: formStatus,
      photo: formPhoto,
      notes: formNotes.trim(),
    };
    if (editingItem) {
      await updateItem(editingItem.id, data);
    } else {
      await createItem(data);
    }
    resetForm();
  };

  const handleEdit = (item: InventoryItemData) => {
    setFormName(item.name);
    setFormBrand(item.brand);
    setFormModel(item.model);
    setFormSerialNumber(item.serialNumber);
    setFormCategory(item.category);
    setFormLocation(item.location);
    setFormLastMaintenance(item.lastMaintenance ? new Date(item.lastMaintenance).toISOString().slice(0, 10) : '');
    setFormLastReview(item.lastReview ? new Date(item.lastReview).toISOString().slice(0, 10) : '');
    setFormNextMaintenance(item.nextMaintenance ? new Date(item.nextMaintenance).toISOString().slice(0, 10) : '');
    setFormStatus(item.status);
    setFormPhoto(item.photo || '');
    setFormNotes(item.notes);
    setEditingItem(item);
    setShowFormModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar este item del inventario?')) {
      await deleteItem(id);
    }
  };

  // Export to Excel
  const exportToExcel = async () => {
    try {
      setExporting(true);
      const wsData = filteredItems.map(item => ({
        'Código QR': item.qrCode,
        'Nombre': item.name,
        'Marca': item.brand,
        'Modelo': item.model,
        'N° Serie': item.serialNumber,
        'Categoría': INVENTORY_CATEGORIES.find(c => c.id === item.category)?.label || item.category,
        'Ubicación': item.location,
        'Último Mantenimiento': item.lastMaintenance ? formatDate(item.lastMaintenance) : '',
        'Última Revisión': item.lastReview ? formatDate(item.lastReview) : '',
        'Próximo Mantenimiento': item.nextMaintenance ? formatDate(item.nextMaintenance) : '',
        'Estado': item.status === 'operativo' ? 'Operativo' : item.status === 'en reparacion' ? 'En Reparación' : 'Fuera de Servicio',
        'Notas': item.notes,
      }));

      const ws = XLSX.utils.json_to_sheet(wsData);
      // Set column widths
      ws['!cols'] = [
        { wch: 12 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
        { wch: 15 }, { wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
        { wch: 18 }, { wch: 40 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
      XLSX.writeFile(wb, `Inventario_LagunaNorte_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      alert('Error al exportar a Excel');
    } finally {
      setExporting(false);
    }
  };

  // Export to PDF with QR codes
  const exportToPdf = async () => {
    try {
      setExporting(true);
      // Fetch items with QR images from API
      const res = await fetch('/api/inventory/export?format=pdf');
      if (!res.ok) throw new Error('Error fetching data');
      const { items: exportItems } = await res.json();

      if (exportItems.length === 0) {
        alert('No hay items para exportar');
        return;
      }

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      const pageWidth = 215.9;
      const pageHeight = 279.4;
      const margin = 15;
      let y = margin;

      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Inventario - Laguna Norte', pageWidth / 2, y, { align: 'center' });
      y += 8;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Generado: ${new Date().toLocaleDateString('es-CL')}`, pageWidth / 2, y, { align: 'center' });
      y += 10;

      // Items grouped by category
      const catGroups: Record<string, typeof exportItems> = {};
      for (const item of exportItems) {
        const cat = item.category || 'otro';
        if (!catGroups[cat]) catGroups[cat] = [];
        catGroups[cat].push(item);
      }

      for (const [cat, catItems] of Object.entries(catGroups)) {
        const catLabel = INVENTORY_CATEGORIES.find(c => c.id === cat)?.label || cat;

        // Category header
        if (y > pageHeight - 50) {
          doc.addPage();
          y = margin;
        }
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text(catLabel, margin, y);
        y += 7;

        for (const item of catItems) {
          // Check if we need a new page
          if (y > pageHeight - 70) {
            doc.addPage();
            y = margin;
          }

          // Item card
          const cardHeight = item.photo ? 65 : 55;
          doc.setDrawColor(200, 200, 200);
          doc.roundedRect(margin, y, pageWidth - margin * 2, cardHeight, 3, 3, 'S');

          // Photo (left side if exists)
          if (item.photo) {
            try {
              doc.addImage(item.photo, 'JPEG', margin + 5, y + 5, 30, 30);
            } catch { /* ignore */ }
          }

          // QR Code (60x60mm on the right)
          if (item.qrDataUrl) {
            try {
              doc.addImage(item.qrDataUrl, 'PNG', pageWidth - margin - 50, y + 3, 45, 45);
            } catch { /* ignore */ }
          }

          // Item details
          const detailX = item.photo ? margin + 38 : margin + 5;
          let detailY = y + 8;
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(item.name || '', detailX, detailY);
          detailY += 5;

          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          const details = [
            `Código: ${item.qrCode}`,
            `Marca: ${item.brand || '—'}  |  Modelo: ${item.model || '—'}`,
            `N° Serie: ${item.serialNumber || '—'}`,
            `Ubicación: ${item.location || '—'}`,
            `Últ. Mantenimiento: ${item.lastMaintenance ? new Date(item.lastMaintenance).toLocaleDateString('es-CL') : '—'}  |  Últ. Revisión: ${item.lastReview ? new Date(item.lastReview).toLocaleDateString('es-CL') : '—'}`,
            `Estado: ${item.status === 'operativo' ? 'Operativo' : item.status === 'en reparacion' ? 'En Reparación' : 'Fuera de Servicio'}`,
          ];
          for (const line of details) {
            doc.text(line, detailX, detailY);
            detailY += 4;
          }
          if (item.notes) {
            doc.text(`Notas: ${item.notes.substring(0, 80)}${item.notes.length > 80 ? '...' : ''}`, detailX, detailY);
          }

          y += cardHeight + 5;
        }
      }

      doc.save(`Inventario_LagunaNorte_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Error al exportar a PDF');
    } finally {
      setExporting(false);
    }
  };

  // Export QR codes only as PDF
  const exportQrPdf = async () => {
    try {
      setExporting(true);
      const res = await fetch('/api/inventory/export?format=pdf');
      if (!res.ok) throw new Error('Error fetching data');
      const { items: exportItems } = await res.json();

      if (exportItems.length === 0) {
        alert('No hay items para exportar');
        return;
      }

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      const pageWidth = 215.9;
      const pageHeight = 279.4;
      const margin = 15;
      const qrSize = 60; // 60x60mm QR code
      const cols = 3;
      const colWidth = (pageWidth - margin * 2) / cols;
      let col = 0;
      let y = margin;

      // Title
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Códigos QR - Inventario Laguna Norte', pageWidth / 2, y, { align: 'center' });
      y += 12;

      for (const item of exportItems) {
        // Check if we need a new page
        if (y + qrSize + 20 > pageHeight - margin) {
          doc.addPage();
          y = margin;
          col = 0;
        }

        const x = margin + col * colWidth;

        // QR code
        if (item.qrDataUrl) {
          try {
            doc.addImage(item.qrDataUrl, 'PNG', x + (colWidth - qrSize) / 2, y, qrSize, qrSize);
          } catch { /* ignore */ }
        }

        // Label below QR
        const labelY = y + qrSize + 4;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(item.name || '', x + colWidth / 2, labelY, { align: 'center', maxWidth: colWidth - 4 });
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(item.qrCode, x + colWidth / 2, labelY + 4, { align: 'center' });
        if (item.brand || item.model) {
          doc.text(`${item.brand || ''} ${item.model || ''}`.trim(), x + colWidth / 2, labelY + 8, { align: 'center', maxWidth: colWidth - 4 });
        }

        col++;
        if (col >= cols) {
          col = 0;
          y += qrSize + 22;
        }
      }

      doc.save(`QR_Inventario_LagunaNorte_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (error) {
      console.error('Error exporting QR PDF:', error);
      alert('Error al exportar códigos QR');
    } finally {
      setExporting(false);
    }
  };

  const getCategoryIcon = (catId: string) => {
    const cat = INVENTORY_CATEGORIES.find(c => c.id === catId);
    return cat ? cat.icon : Tag;
  };

  const getCategoryColor = (catId: string) => {
    const cat = INVENTORY_CATEGORIES.find(c => c.id === catId);
    return cat ? cat.color : 'bg-slate-500';
  };

  return (
    <div className="flex flex-col flex-1">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 flex items-center gap-3">
        <button onClick={onBack} className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-colors active:scale-95">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-black uppercase tracking-tighter">Inventario</h1>
          <p className="text-[9px] font-bold text-purple-200 uppercase tracking-widest">Máquinas y Herramientas</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowFormModal(true); }}
          className="p-2.5 bg-white/30 rounded-xl hover:bg-white/40 transition-colors active:scale-90"
          title="Nuevo Item"
        >
          <Plus size={20} />
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={exportQrPdf}
            disabled={exporting}
            className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors active:scale-95 disabled:opacity-50"
            title="Exportar QRs PDF"
          >
            <QrCode size={16} />
          </button>
          <button
            onClick={exportToPdf}
            disabled={exporting}
            className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors active:scale-95 disabled:opacity-50"
            title="Exportar PDF"
          >
            <FileText size={16} />
          </button>
          <button
            onClick={exportToExcel}
            disabled={exporting}
            className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors active:scale-95 disabled:opacity-50"
            title="Exportar Excel"
          >
            <FileSpreadsheet size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4 pb-24">
        {/* Nuevo Item Button (prominent) */}
        <button
          onClick={() => { resetForm(); setShowFormModal(true); }}
          className="w-full py-3.5 bg-purple-600 text-white font-black uppercase rounded-2xl text-sm shadow-lg shadow-purple-300/50 active:scale-95 transition-transform flex items-center justify-center gap-2"
        >
          <Plus size={18} />
          Agregar Nuevo Item
        </button>

        {/* Search & Filters */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-4 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <Search size={16} className="text-slate-400 flex-shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, marca, modelo, serie, ubicación..."
              className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-slate-300"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {/* Category filter */}
            <div className="flex-1">
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-100 text-xs font-bold text-slate-600 outline-none"
              >
                <option value="">Todas las categorías</option>
                {INVENTORY_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.label}</option>
                ))}
              </select>
            </div>
            {/* Status filter */}
            <div className="flex-1">
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-100 text-xs font-bold text-slate-600 outline-none"
              >
                <option value="">Todos los estados</option>
                <option value="operativo">Operativo</option>
                <option value="en reparacion">En Reparación</option>
                <option value="fuera de servicio">Fuera de Servicio</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-2">
          <div className="flex-1 bg-purple-50 border border-purple-100 p-2.5 rounded-2xl flex items-center gap-2">
            <Package size={14} className="text-purple-500" />
            <div>
              <div className="text-lg font-black text-purple-600 leading-none">{items.length}</div>
              <div className="text-[7px] font-bold text-purple-400 uppercase">Total</div>
            </div>
          </div>
          <div className="flex-1 bg-emerald-50 border border-emerald-100 p-2.5 rounded-2xl flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-500" />
            <div>
              <div className="text-lg font-black text-emerald-600 leading-none">{items.filter(i => i.status === 'operativo').length}</div>
              <div className="text-[7px] font-bold text-emerald-400 uppercase">Operativos</div>
            </div>
          </div>
          <div className="flex-1 bg-amber-50 border border-amber-100 p-2.5 rounded-2xl flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-500" />
            <div>
              <div className="text-lg font-black text-amber-600 leading-none">{items.filter(i => i.status === 'en reparacion').length}</div>
              <div className="text-[7px] font-bold text-amber-400 uppercase">Reparación</div>
            </div>
          </div>
        </div>

        {/* Items List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-6 h-6 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-slate-400 text-xs font-bold">Cargando inventario...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto text-slate-200 mb-3" size={40} />
            <p className="text-slate-300 text-xs font-bold uppercase">No hay items en el inventario</p>
            <p className="text-slate-300 text-[10px] mt-1">Presiona + para agregar el primero</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredItems.map(item => {
              const CatIcon = getCategoryIcon(item.category);
              const catColor = getCategoryColor(item.category);
              const statusConf = INVENTORY_STATUS[item.status] || INVENTORY_STATUS['operativo'];
              return (
                <div
                  key={item.id}
                  className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm cursor-pointer relative overflow-hidden active:scale-[0.98] transition-transform"
                  onClick={() => handleEdit(item)}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${catColor}`}></div>
                  <div className="flex items-start gap-3 pl-2">
                    {/* Photo Thumbnail */}
                    <div className="flex-shrink-0">
                      {item.photo ? (
                        <img src={item.photo} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
                      ) : qrImageMap[item.qrCode] ? (
                        <img src={qrImageMap[item.qrCode]} alt="QR" className="w-12 h-12 rounded-lg" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                          <QrCode size={20} className="text-slate-300" />
                        </div>
                      )}
                    </div>
                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] font-black bg-slate-100 px-2 py-0.5 rounded-full">{item.qrCode}</span>
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full text-white ${statusConf.color}`}>
                          {item.status === 'operativo' ? 'Operativo' : item.status === 'en reparacion' ? 'Reparación' : 'Fuera de servicio'}
                        </span>
                      </div>
                      <h4 className="font-black text-slate-800 uppercase truncate text-sm">{item.name}</h4>
                      <div className="flex items-center gap-3 mt-0.5">
                        {item.brand && (
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Marca: {item.brand}</p>
                        )}
                        {item.model && (
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Modelo: {item.model}</p>
                        )}
                      </div>
                      {item.location && (
                        <p className="text-[10px] text-blue-500 font-bold uppercase flex items-center gap-1 mt-0.5">
                          <MapPin size={10} /> {item.location}
                        </p>
                      )}
                      {(item.lastMaintenance || item.lastReview) && (
                        <div className="flex items-center gap-3 mt-1">
                          {item.lastMaintenance && (
                            <span className="text-[8px] text-purple-500 font-bold flex items-center gap-0.5">
                              <WrenchIcon size={8} /> Mant: {formatDate(item.lastMaintenance)}
                            </span>
                          )}
                          {item.lastReview && (
                            <span className="text-[8px] text-cyan-500 font-bold flex items-center gap-0.5">
                              <Eye size={8} /> Rev: {formatDate(item.lastReview)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Actions */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={e => { e.stopPropagation(); setShowQrModal(item); }}
                        className="p-1.5 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                        title="Ver QR"
                      >
                        <QrCode size={14} className="text-slate-500" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(item.id); }}
                        className="p-1.5 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => { resetForm(); setShowFormModal(true); }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-purple-300/50 active:scale-90 transition-transform z-[60]"
      >
        <Plus size={28} />
      </button>

      {/* Form Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={resetForm} />
          <div className="relative bg-white w-full max-w-xl rounded-t-3xl max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="sticky top-0 bg-white p-4 border-b border-slate-100 flex items-center justify-between z-10">
              <h2 className="text-lg font-black uppercase tracking-tighter text-slate-800">
                {editingItem ? 'Editar Item' : 'Nuevo Item'}
              </h2>
              <button onClick={resetForm} className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200">
                <X size={18} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {/* Nombre */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nombre *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Ej: Cortadora de pasto Honda"
                  className="w-full p-3 rounded-2xl bg-slate-50 border-none font-bold text-sm outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>

              {/* Marca & Modelo */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Marca</label>
                  <input
                    type="text"
                    value={formBrand}
                    onChange={e => setFormBrand(e.target.value)}
                    placeholder="Ej: Honda"
                    className="w-full p-3 rounded-2xl bg-slate-50 border-none font-bold text-sm outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Modelo</label>
                  <input
                    type="text"
                    value={formModel}
                    onChange={e => setFormModel(e.target.value)}
                    placeholder="Ej: HRX476QXE"
                    className="w-full p-3 rounded-2xl bg-slate-50 border-none font-bold text-sm outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
              </div>

              {/* N° Serie */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Número de Serie</label>
                <input
                  type="text"
                  value={formSerialNumber}
                  onChange={e => setFormSerialNumber(e.target.value)}
                  placeholder="Ej: SN-12345"
                  className="w-full p-3 rounded-2xl bg-slate-50 border-none font-bold text-sm outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>

              {/* Categoría & Estado */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Categoría</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-slate-50 border-none font-bold text-sm outline-none focus:ring-2 focus:ring-purple-300"
                  >
                    {INVENTORY_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Estado</label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-slate-50 border-none font-bold text-sm outline-none focus:ring-2 focus:ring-purple-300"
                  >
                    <option value="operativo">Operativo</option>
                    <option value="en reparacion">En Reparación</option>
                    <option value="fuera de servicio">Fuera de Servicio</option>
                  </select>
                </div>
              </div>

              {/* Ubicación */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1">
                  <MapPin size={10} /> Ubicación
                </label>
                <input
                  type="text"
                  value={formLocation}
                  onChange={e => setFormLocation(e.target.value)}
                  placeholder="Ej: Bodega principal"
                  className="w-full p-3 rounded-2xl bg-slate-50 border-none font-bold text-sm outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>

              {/* Fechas */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Último Mantenimiento</label>
                  <input
                    type="date"
                    value={formLastMaintenance}
                    onChange={e => setFormLastMaintenance(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-slate-50 border-none font-bold text-sm outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Última Revisión</label>
                  <input
                    type="date"
                    value={formLastReview}
                    onChange={e => setFormLastReview(e.target.value)}
                    className="w-full p-3 rounded-2xl bg-slate-50 border-none font-bold text-sm outline-none focus:ring-2 focus:ring-purple-300"
                  />
                </div>
              </div>

              {/* Próximo Mantenimiento */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Próximo Mantenimiento</label>
                <input
                  type="date"
                  value={formNextMaintenance}
                  onChange={e => setFormNextMaintenance(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-slate-50 border-none font-bold text-sm outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>

              {/* Fotografía */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-1">
                  <Camera size={10} /> Fotografía del Equipo
                </label>
                <div className="mt-2 space-y-2">
                  {formPhoto ? (
                    <div className="relative inline-block">
                      <img src={formPhoto} alt="Foto del equipo" className="w-32 h-32 rounded-2xl object-cover border-2 border-purple-100" />
                      <button
                        type="button"
                        onClick={() => setFormPhoto('')}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.capture = 'environment';
                          input.onchange = async (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              try {
                                const compressed = await compressImage(file, 800, 0.6);
                                setFormPhoto(compressed);
                              } catch (err) {
                                console.error('Error processing image:', err);
                              }
                            }
                          };
                          input.click();
                        }}
                        className="flex-1 py-3 rounded-2xl border-2 border-dashed border-purple-300 bg-purple-50 flex flex-col items-center justify-center gap-1 text-purple-400 hover:border-purple-500 hover:text-purple-600 hover:bg-purple-100 transition-colors"
                      >
                        <Camera size={20} />
                        <span className="text-[8px] font-black uppercase">Cámara</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = async (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) {
                              try {
                                const compressed = await compressImage(file, 800, 0.6);
                                setFormPhoto(compressed);
                              } catch (err) {
                                console.error('Error processing image:', err);
                              }
                            }
                          };
                          input.click();
                        }}
                        className="flex-1 py-3 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 text-slate-300 hover:border-emerald-400 hover:text-emerald-400 transition-colors"
                      >
                        <ImageIcon size={20} />
                        <span className="text-[8px] font-black uppercase">Galería</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Notas</label>
                <textarea
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="Observaciones adicionales..."
                  rows={3}
                  className="w-full p-3 rounded-2xl bg-slate-50 border-none font-bold text-sm outline-none focus:ring-2 focus:ring-purple-300 resize-none"
                />
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={!formName.trim()}
                className="w-full py-4 bg-purple-600 text-white font-black uppercase rounded-2xl text-sm shadow-lg shadow-purple-300/50 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingItem ? 'Guardar Cambios' : 'Crear Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR View Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setShowQrModal(null)} />
          <div className="relative bg-white rounded-3xl p-6 w-80 max-w-[90vw] text-center max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowQrModal(null)} className="absolute top-3 right-3 p-1.5 bg-slate-100 rounded-xl hover:bg-slate-200">
              <X size={16} />
            </button>
            <div className="mb-3">
              <span className="text-[9px] font-black bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">{showQrModal.qrCode}</span>
            </div>
            <h3 className="text-lg font-black text-slate-800 uppercase mb-1">{showQrModal.name}</h3>
            <p className="text-xs text-slate-400 font-bold mb-4">
              {[showQrModal.brand, showQrModal.model].filter(Boolean).join(' — ') || 'Sin marca/modelo'}
            </p>
            {/* Photo */}
            {showQrModal.photo && (
              <div className="mb-4">
                <img src={showQrModal.photo} alt={showQrModal.name} className="w-full h-40 object-cover rounded-xl mx-auto" />
              </div>
            )}
            {/* QR Code */}
            {qrImageMap[showQrModal.qrCode] ? (
              <img src={qrImageMap[showQrModal.qrCode]} alt="QR" className="w-48 h-48 mx-auto rounded-xl" />
            ) : (
              <div className="w-48 h-48 mx-auto rounded-xl bg-slate-100 flex items-center justify-center">
                <QrCode size={48} className="text-slate-300" />
              </div>
            )}
            <p className="text-[10px] text-slate-400 mt-3 font-bold">Escanea para identificar este equipo</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── View Type ─── */

type AppView = 'main' | 'calendar' | 'recurring' | 'dashboard' | 'admin' | 'auditoria' | 'guardias' | 'scanner' | 'inventario';

/* ─── Hamburger Menu ─── */

function HamburgerMenu({
  isOpen,
  onClose,
  currentView,
  onNavigate,
  userRole,
  onLogout,
  currentProfile,
}: {
  isOpen: boolean;
  onClose: () => void;
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  userRole: UserRole;
  onLogout: () => void;
  currentProfile?: ProfileItem | null;
}) {
  if (!isOpen) return null;

  const isAdmin = userRole === 'admin';
  const isSupervisorMenu = !!currentProfile && (currentProfile.permissions ?? []).includes('supervisor');
  const isGuardiaMenu = !!currentProfile && (currentProfile.permissions ?? []).includes('guardia');

  const menuItems: { view: AppView; label: string; emoji: string; adminOnly?: boolean; supervisorCanSee?: boolean; guardiaCanSee?: boolean }[] = [
    { view: 'main', label: 'Planificación', emoji: '📋' },
    { view: 'calendar', label: 'Calendario', emoji: '📅' },
    { view: 'recurring', label: 'OTs Repetitivas', emoji: '🔄', adminOnly: true },
    { view: 'dashboard', label: 'Dashboard', emoji: '📊', adminOnly: true, supervisorCanSee: true },
    { view: 'inventario', label: 'Inventario', emoji: '🔧', adminOnly: true },
    { view: 'guardias', label: 'Guardias', emoji: '🔒', adminOnly: true, guardiaCanSee: true },
    { view: 'admin', label: 'Administración', emoji: '⚙️', adminOnly: true },
    { view: 'auditoria', label: 'Historial', emoji: '📜', adminOnly: true },
  ];

  const handleNavigate = (view: AppView) => {
    onNavigate(view);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[70] bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={onClose} />
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-[80] w-72 bg-white shadow-2xl flex flex-col">
        {/* Logo Header */}
        <div className="p-4 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center gap-3">
          <img src="/logo-laguna.jpg" alt="Laguna Norte" className="h-10 rounded-lg" />
          <div>
            <h2 className="text-sm font-black text-white uppercase tracking-tighter">Laguna Norte</h2>
            <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Condominio & Parque</p>
          </div>
        </div>

        {/* Role Badge */}
        <div className="px-4 py-3 border-b border-slate-100">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase ${isAdmin ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
            {isAdmin ? <Shield size={12} /> : <User size={12} />}
            {isAdmin ? 'Administrador' : currentProfile?.name ?? 'Usuario'}
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto no-scrollbar">
          {menuItems.filter(item => !item.adminOnly || isAdmin || (isSupervisorMenu && item.supervisorCanSee) || (isGuardiaMenu && item.guardiaCanSee)).map(item => (
            <button
              key={item.view}
              onClick={() => handleNavigate(item.view)}
              className={`w-full p-3 rounded-2xl flex items-center gap-3 text-left transition-all active:scale-95 ${
                currentView === item.view
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="text-lg">{item.emoji}</span>
              <span className="text-sm font-black uppercase tracking-tighter">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={() => { onLogout(); onClose(); }}
            className="w-full p-3 bg-red-50 text-red-500 rounded-2xl flex items-center gap-3 hover:bg-red-100 transition-colors active:scale-95"
          >
            <LogOut size={18} />
            <span className="text-sm font-black uppercase tracking-tighter">Cerrar Sesión</span>
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── Profile Login Screen ─── */

function ProfileLogin({ onLogin, workAreas }: { onLogin: (role: UserRole) => void; workAreas: WorkArea[] }) {
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [showProfilePwdModal, setShowProfilePwdModal] = useState(false);
  const [pendingProfile, setPendingProfile] = useState<ProfileItem | null>(null);
  const { profiles, loading: profilesLoading } = useProfiles();

  // Access code login state
  const [accessCode, setAccessCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeVerifying, setCodeVerifying] = useState(false);
  const [codeProfileNeedsPwd, setCodeProfileNeedsPwd] = useState<ProfileItem | null>(null);
  const [codePwdInput, setCodePwdInput] = useState('');
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Profiles visible as buttons = those WITHOUT an accessCode
  const publicProfiles = profiles.filter(p => !p.accessCode);

  // Map color classes to gradient + shadow for profile buttons
  const PROFILE_STYLE_MAP: Record<string, { gradient: string; shadow: string }> = {
    'bg-green-600':  { gradient: 'from-green-600 to-green-700',  shadow: 'shadow-green-200' },
    'bg-pink-500':   { gradient: 'from-pink-500 to-pink-600',    shadow: 'shadow-pink-200' },
    'bg-orange-500': { gradient: 'from-orange-500 to-orange-600', shadow: 'shadow-orange-200' },
    'bg-cyan-500':   { gradient: 'from-cyan-500 to-cyan-600',    shadow: 'shadow-cyan-200' },
    'bg-purple-500': { gradient: 'from-purple-500 to-purple-600', shadow: 'shadow-purple-200' },
    'bg-yellow-500': { gradient: 'from-yellow-500 to-yellow-600', shadow: 'shadow-yellow-200' },
    'bg-red-500':    { gradient: 'from-red-500 to-red-600',      shadow: 'shadow-red-200' },
    'bg-blue-500':   { gradient: 'from-blue-500 to-blue-600',    shadow: 'shadow-blue-200' },
    'bg-teal-500':   { gradient: 'from-teal-500 to-teal-600',    shadow: 'shadow-teal-200' },
    'bg-indigo-500': { gradient: 'from-indigo-500 to-indigo-600', shadow: 'shadow-indigo-200' },
    'bg-emerald-600': { gradient: 'from-emerald-600 to-emerald-700', shadow: 'shadow-emerald-200' },
    'bg-amber-500':  { gradient: 'from-amber-500 to-amber-600',  shadow: 'shadow-amber-200' },
    'bg-rose-500':   { gradient: 'from-rose-500 to-rose-600',    shadow: 'shadow-rose-200' },
    'bg-violet-500': { gradient: 'from-violet-500 to-violet-600', shadow: 'shadow-violet-200' },
    'bg-sky-500':    { gradient: 'from-sky-500 to-sky-600',      shadow: 'shadow-sky-200' },
  };
  const DEFAULT_PROFILE_STYLE = { gradient: 'from-slate-500 to-slate-600', shadow: 'shadow-slate-200' };

  // Icon name → component mapping
  const ICON_MAP: Record<string, React.ElementType> = {
    User: User, Shield: Shield, Wrench: Wrench, Leaf: Leaf,
    Droplets: Droplets, Zap: Zap, Brush: Brush, Trash2: Trash2,
    HardHat: HardHat, ClipboardList: ClipboardList, Eye: Eye, Star: Star,
  };

  // Resolve profile style: use profile's own color first, then fall back to first work area color
  const getProfileStyle = (profile: ProfileItem) => {
    // If profile has its own color, use it
    if (profile.color && PROFILE_STYLE_MAP[profile.color]) {
      return PROFILE_STYLE_MAP[profile.color];
    }
    // Fall back to first assigned work area's color
    for (const waId of profile.workAreaIds) {
      const wa = workAreas.find(a => a.id === waId);
      if (wa && PROFILE_STYLE_MAP[wa.color]) {
        return PROFILE_STYLE_MAP[wa.color];
      }
    }
    return DEFAULT_PROFILE_STYLE;
  };

  // Resolve profile icon: use profile's own icon first, then fall back to work area icon
  const getProfileIcon = (profile: ProfileItem): React.ElementType => {
    if (profile.icon && ICON_MAP[profile.icon]) {
      return ICON_MAP[profile.icon];
    }
    // Fall back to icon from first work area
    const waId = profile.workAreaIds[0];
    if (waId) {
      const wa = workAreas.find(a => a.id === waId);
      if (wa) {
        const cat = CATEGORIES.find(c => c.workAreaId === wa.id);
        if (cat?.icon && ICON_MAP[cat.icon]) return ICON_MAP[cat.icon];
      }
    }
    return User;
  };

  // Handle access code verification
  const handleCodeLogin = useCallback(async () => {
    if (!accessCode.trim()) return;
    setCodeError('');
    setCodeVerifying(true);
    try {
      const res = await fetch('/api/movil/profiles/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: accessCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCodeError(data.error || 'Código no válido');
        return;
      }
      if (data.profile.needsPassword) {
        setCodeProfileNeedsPwd(data.profile as ProfileItem);
      } else {
        localStorage.setItem(USER_ROLE_KEY, `profile:${data.profile.id}`);
        onLogin(`profile:${data.profile.id}`);
      }
    } catch {
      setCodeError('Error de conexión');
    } finally {
      setCodeVerifying(false);
    }
  }, [accessCode, onLogin]);

  const handleCodePwdVerify = useCallback(async () => {
    if (!codeProfileNeedsPwd || !codePwdInput) return;
    setCodeVerifying(true);
    setCodeError('');
    try {
      const res = await fetch('/api/movil/profiles/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: accessCode.trim(), password: codePwdInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCodeError(data.error || 'Contraseña incorrecta');
        return;
      }
      localStorage.setItem(USER_ROLE_KEY, `profile:${data.profile.id}`);
      onLogin(`profile:${data.profile.id}`);
    } catch {
      setCodeError('Error de conexión');
    } finally {
      setCodeVerifying(false);
    }
  }, [codeProfileNeedsPwd, codePwdInput, accessCode, onLogin]);

  return (
    <div className="max-w-xl mx-auto min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo-laguna.jpg" alt="Laguna Norte" className="h-20 rounded-2xl mx-auto mb-4 shadow-lg" />
          <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Laguna Norte</h1>
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">Condominio & Parque - Sistema de Gestión</p>
        </div>

        {codeProfileNeedsPwd ? (
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-4">
            <p className="text-center text-sm font-bold text-slate-500 uppercase">Ingresa tu clave</p>
            <div className="flex items-center justify-center gap-2">
              <div className={`w-3 h-3 rounded-full ${codeProfileNeedsPwd.color || 'bg-slate-400'}`} />
              <span className="font-black text-slate-700 text-sm uppercase">{codeProfileNeedsPwd.name}</span>
            </div>
            <input
              ref={codeInputRef}
              type="password"
              value={codePwdInput}
              onChange={e => setCodePwdInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCodePwdVerify()}
              placeholder="Tu clave de acceso"
              className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-400"
              autoFocus
            />
            {codeError && <p className="text-red-500 text-[10px] font-bold text-center">{codeError}</p>}
            <button
              onClick={handleCodePwdVerify}
              disabled={codeVerifying || !codePwdInput}
              className="w-full py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase disabled:opacity-40 active:scale-95 transition-transform"
            >
              {codeVerifying ? 'Verificando...' : 'Ingresar'}
            </button>
            <button
              onClick={() => { setCodeProfileNeedsPwd(null); setCodePwdInput(''); setCodeError(''); }}
              className="w-full py-2 text-slate-400 text-[10px] font-bold hover:text-slate-600"
            >
              Volver
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-4">
            <button
              onClick={() => setShowPwdModal(true)}
              className="w-full py-5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl font-black uppercase shadow-lg shadow-blue-200 active:scale-95 transition-transform flex items-center justify-center gap-3"
            >
              <Shield size={22} />
              <div className="text-left">
                <div className="text-sm">Administrador</div>
                <div className="text-[9px] font-semibold opacity-80">Requiere clave de acceso</div>
              </div>
            </button>

            {profilesLoading && (
              <div className="flex items-center justify-center py-4">
                <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              </div>
            )}
            {!profilesLoading && publicProfiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-center text-[9px] font-black text-slate-400 uppercase tracking-wider">Perfiles por Cargo</p>
                {publicProfiles.map(profile => {
                  const style = getProfileStyle(profile);
                  const ProfileIcon = getProfileIcon(profile);
                  const handleProfileClick = () => {
                    if (profile.hasPassword) {
                      setPendingProfile(profile);
                      setShowProfilePwdModal(true);
                    } else {
                      localStorage.setItem(USER_ROLE_KEY, `profile:${profile.id}`);
                      onLogin(`profile:${profile.id}`);
                    }
                  };
                  return (
                    <button
                      key={profile.id}
                      onClick={handleProfileClick}
                      className={`w-full py-4 bg-gradient-to-r ${style.gradient} text-white rounded-2xl font-black uppercase shadow-lg ${style.shadow} active:scale-95 transition-transform flex items-center justify-center gap-3`}
                    >
                      <ProfileIcon size={22} />
                      <div className="text-left">
                        <div className="text-sm">{profile.name}</div>
                        <div className="text-[9px] font-semibold opacity-80">
                          {profile.hasPassword ? 'Requiere clave de acceso' : (profile.permissions || ['view']).map(p => {
                            const permOpt = [{ value: 'view', label: 'Ver' }, { value: 'guardia', label: 'Guardia' }, { value: 'supervisor', label: 'Supervisor' }, { value: 'create', label: 'Crear' }, { value: 'edit', label: 'Editar' }, { value: 'delete', label: 'Eliminar' }].find(o => o.value === p);
                            return permOpt ? permOpt.label : '';
                          }).filter(Boolean).join(' · ')}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="pt-2 border-t border-slate-100">
              <p className="text-center text-[9px] font-black text-violet-400 uppercase tracking-wider mb-2 flex items-center justify-center gap-1">
                <KeyRound size={10} /> Ingresa tu código de acceso
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={accessCode}
                  onChange={e => { setAccessCode(e.target.value.toUpperCase()); setCodeError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleCodeLogin()}
                  placeholder="EJ: JARD1"
                  className="flex-1 p-3 rounded-xl bg-slate-50 border border-slate-200 font-black text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-violet-400"
                  maxLength={20}
                />
                <button
                  onClick={handleCodeLogin}
                  disabled={codeVerifying || !accessCode.trim()}
                  className="px-5 py-3 bg-violet-600 text-white rounded-xl font-black text-xs uppercase disabled:opacity-40 active:scale-95 transition-transform"
                >
                  {codeVerifying ? '...' : 'Ir'}
                </button>
              </div>
              {codeError && <p className="text-red-500 text-[10px] font-bold text-center mt-1">{codeError}</p>}
            </div>
          </div>
        )}
        <p className="text-center text-[8px] text-slate-300 mt-6 font-medium uppercase">Administración - Asesorías Integrales CyJ</p>
      </div>
      {showPwdModal && (
        <PasswordModal
          onUnlock={(pwd) => {
            if (checkAdminPwd(pwd)) {
              localStorage.setItem(USER_ROLE_KEY, 'admin');
              onLogin('admin');
            }
          }}
          onCancel={() => setShowPwdModal(false)}
        />
      )}
      {showProfilePwdModal && pendingProfile && (
        <ProfilePasswordModal
          profile={pendingProfile}
          onUnlock={async (pwd) => {
            try {
              const res = await fetch(`/api/movil/profiles/${pendingProfile.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: pwd }),
              });
              if (res.ok) {
                localStorage.setItem(USER_ROLE_KEY, `profile:${pendingProfile.id}`);
                onLogin(`profile:${pendingProfile.id}`);
              } else {
                return 'Contraseña incorrecta';
              }
            } catch {
              return 'Error de conexión';
            }
            return null;
          }}
          onCancel={() => { setShowProfilePwdModal(false); setPendingProfile(null); }}
        />
      )}
    </div>
  );
}

function PasswordModal({ onUnlock, onCancel }: { onUnlock: (pwd: string) => void; onCancel: () => void }) {
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield size={28} className="text-blue-600" />
          </div>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Acceso Restringido</h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">Ingresa la clave de administración</p>
        </div>
        <form onSubmit={(e) => {
          e.preventDefault();
          if (checkAdminPwd(pwd)) { onUnlock(pwd); }
          else { setError('Clave incorrecta'); setPwd(''); }
        }} className="space-y-4">
          <input
            ref={inputRef}
            type="password"
            value={pwd}
            onChange={(e) => { setPwd(e.target.value); setError(''); }}
            placeholder="Clave de administración"
            className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}
          <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase shadow-lg active:scale-95 transition-transform">Ingresar</button>
          <button type="button" onClick={onCancel} className="w-full py-3 bg-slate-100 text-slate-500 rounded-2xl font-bold text-xs uppercase hover:bg-slate-200 transition-colors">Cancelar</button>
        </form>
      </div>
    </div>
  );
}

function ProfilePasswordModal({ profile, onUnlock, onCancel }: { profile: ProfileItem; onUnlock: (pwd: string) => Promise<string | null>; onCancel: () => void }) {
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl p-8 shadow-2xl w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <User size={28} className="text-emerald-600" />
          </div>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter">{profile.name}</h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">Ingresa tu clave de acceso</p>
        </div>
        <form onSubmit={async (e) => {
          e.preventDefault();
          setLoading(true);
          setError('');
          const err = await onUnlock(pwd);
          if (err) {
            setError(err);
            setPwd('');
          }
          setLoading(false);
        }} className="space-y-4">
          <input
            ref={inputRef}
            type="password"
            value={pwd}
            onChange={(e) => { setPwd(e.target.value); setError(''); }}
            placeholder="Tu clave"
            className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
          {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase shadow-lg active:scale-95 transition-transform disabled:opacity-50">Ingresar</button>
          <button type="button" onClick={onCancel} className="w-full py-3 bg-slate-100 text-slate-500 rounded-2xl font-bold text-xs uppercase hover:bg-slate-200 transition-colors">Cancelar</button>
        </form>
      </div>
    </div>
  );
}

export default function LagunaNorteApp() {
  // Determine performedBy name for audit logging
  // We need to compute this before hooks since it's passed as a parameter
  const [userRole, setUserRole] = useState<UserRole | null>(() => {
    try {
      const saved = localStorage.getItem(USER_ROLE_KEY);
      if (saved === 'admin' || (saved && saved.startsWith('profile:'))) {
        return saved as UserRole;
      }
      return null;
    } catch { return null; }
  });

  // We need the profile name for audit but profiles aren't loaded yet
  // So we use a computed performedBy based on userRole
  const getPerformedBy = useCallback(() => {
    if (userRole === 'admin') return 'Administrador';
    if (userRole?.startsWith('profile:')) {
      const profileId = userRole.replace('profile:', '');
      return `Perfil: ${profileId}`; // Will be more specific once profiles are loaded
    }
    return 'Desconocido';
  }, [userRole]);

  const getProfileId = useCallback(() => {
    if (userRole?.startsWith('profile:')) return userRole.replace('profile:', '');
    return undefined;
  }, [userRole]);

  const { workOrders, loading, syncing, apiAvailable, lastSync, createWorkOrder, updateWorkOrder, deleteWorkOrder } = useWorkOrders(getPerformedBy(), getProfileId());
  const { workAreas, personnel, zones, updateWorkAreas, updatePersonnel, updateZones } = useConfigData();
  const { profiles, createProfile, updateProfile, deleteProfile } = useProfiles(getPerformedBy(), getProfileId());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Todas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<WorkOrder> | null>(null);
  const [currentView, setCurrentView] = useState<AppView>('main');
  const [menuOpen, setMenuOpen] = useState(false);
  const { items: recurringItems } = useRecurringWorkOrders(getPerformedBy(), getProfileId());

  const currentProfile = userRole?.startsWith('profile:')
    ? profiles.find(p => p.id === userRole.replace('profile:', ''))
    : null;
  const isProfileUser = !!currentProfile;

  // Update performedBy to use actual profile name once profiles are loaded
  const actualPerformedBy = userRole === 'admin' ? 'Administrador' : currentProfile?.name ? `Perfil: ${currentProfile.name}` : getPerformedBy();

  // Permission helpers for profile users
  const profilePerms = currentProfile?.permissions ?? ['view'];
  const isSupervisor = isProfileUser && profilePerms.includes('supervisor');
  const isGuardia = isProfileUser && profilePerms.includes('guardia');
  const canCreate = !isProfileUser || profilePerms.includes('create');
  const canEdit = !isProfileUser || profilePerms.includes('edit');
  const canDelete = !isProfileUser || profilePerms.includes('delete');
  const canView = !isProfileUser || profilePerms.includes('view');

  const handleSaveOT = useCallback(async (data: Partial<WorkOrder>) => {
    if (data.id) {
      // Auto-track timestamps when status changes
      const existing = workOrders.find(o => o.id === data.id);
      const now = Date.now();
      const updateData = { ...data };
      if (existing) {
        if (data.status === 'En Proceso' && !existing.startedAt) {
          updateData.startedAt = now;
        }
        if (data.status === 'Terminada' && !existing.completedAt) {
          updateData.completedAt = now;
          // Also ensure startedAt is set if it wasn't
          if (!existing.startedAt) {
            updateData.startedAt = existing.createdAt;
          }
        }
      }
      await updateWorkOrder(updateData);
    } else {
      await createWorkOrder(data);
    }
    setIsModalOpen(false);
    setEditingItem(null);
  }, [createWorkOrder, updateWorkOrder]);

  const handleDeleteOT = useCallback(async (id: string) => {
    await deleteWorkOrder(id);
    setIsModalOpen(false);
    setEditingItem(null);
  }, [deleteWorkOrder]);

  const handleCreateFromCategory = useCallback((cat: typeof CATEGORIES[number]) => {
    const wa = workAreas.find(a => a.id === cat.workAreaId);
    const areaPersonnel = personnel.filter(p => p.workAreaId === cat.workAreaId).map(p => p.name);
    const activities = wa ? wa.activities : [];
    const description = activities.length > 0 || areaPersonnel.length > 0
      ? `Realizar ${activities.join(', ')} en área ${wa?.name ?? ''}. Personal asignado: ${areaPersonnel.join(', ')}.`
      : '';

    setEditingItem({
      workAreaId: cat.workAreaId,
      activities,
      collaborators: areaPersonnel,
      status: 'Pendiente',
      zoneName: '',
      description,
      photosBefore: [],
      photosAfter: [],
    } as any);
    setIsModalOpen(true);
  }, [workAreas, personnel]);

  const handleEditOT = useCallback((ot: WorkOrder) => {
    setEditingItem(ot);
    setIsModalOpen(true);
  }, []);

  const handleOpenNew = useCallback(() => {
    setEditingItem(null);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingItem(null);
  }, []);

  const generatePDF = useCallback((ot: Partial<WorkOrder>) => {
    buildPDF(ot);
  }, []);

  // Counts
  // Helper: get work area color for an OT by matching its activities
  const getWorkAreaForOT = useCallback((ot: WorkOrder) => {
    for (const wa of workAreas) {
      if (ot.activities.some(a => wa.activities.includes(a))) {
        return wa;
      }
    }
    return null;
  }, [workAreas]);

  // Show loading spinner while initial data is being fetched
  if (loading) {
    return (
      <div className="max-w-xl mx-auto min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 text-sm font-bold">Cargando datos...</p>
        </div>
      </div>
    );
  }

  // Show profile login if no role is selected
  if (!userRole) {
    return <ProfileLogin onLogin={(role) => setUserRole(role)} workAreas={workAreas} />;
  }

  // Guardia-only profile: render scanner directly, nothing else
  // This check is very specific: ONLY profiles whose ONLY special permission is 'guardia'
  // Profiles with guardia + supervisor, or guardia + create, etc. get the normal UI
  const isGuardiaOnly = isProfileUser
    && isGuardia
    && !isSupervisor
    && !profilePerms.includes('create')
    && !profilePerms.includes('edit')
    && !profilePerms.includes('delete')
    && currentProfile;

  if (isGuardiaOnly && currentProfile) {
    return (
      <div className="max-w-xl mx-auto min-h-screen bg-slate-50 flex flex-col">
        <QrScannerView
          onBack={() => {
            localStorage.removeItem(USER_ROLE_KEY);
            setUserRole(null);
          }}
          profileName={currentProfile.name}
          profileId={currentProfile.id}
          isGuardiaMode={true}
        />
      </div>
    );
  }

  // Chile timezone today string for date comparison
  const chileTodayStr = toChileDateString(Date.now());

  // Helper: check if an OT belongs to today (Chile timezone)
  const isOtToday = (ot: WorkOrder) => {
    const dateKey = ot.plannedDate ? toChileDateString(ot.plannedDate) : toChileDateString(ot.createdAt);
    return dateKey === chileTodayStr;
  };

  // Visible work orders: visibility depends on role + date
  // TODAY: ALL OTs from today are visible regardless of status (user must see all their day's work)
  // OTHER DAYS: status-based filtering applies (OTs sort by their state)
  // Admin: sees everything always
  // Supervisor profile: sees everything always
  // Other profiles: today sees all; other days see limited by status
  const visibleWorkOrders = (() => {
    if (userRole === 'admin') return workOrders;
    if (isProfileUser && currentProfile) {
      if (isSupervisor) return workOrders;
      const canManage = profilePerms.includes('create') || profilePerms.includes('edit') || profilePerms.includes('delete');
      const allowedStatuses = canManage ? ['Pendiente', 'En Proceso'] : ['En Proceso'];
      return workOrders.filter(ot => {
        // TODAY: show all OTs regardless of status (filtered by work area only)
        if (isOtToday(ot)) {
          for (const waId of currentProfile.workAreaIds) {
            const wa = workAreas.find(a => a.id === waId);
            if (wa && ot.activities.some(a => wa.activities.includes(a))) {
              return true;
            }
          }
          return false;
        }
        // OTHER DAYS: apply status + work area filtering
        if (!allowedStatuses.includes(ot.status)) return false;
        for (const waId of currentProfile.workAreaIds) {
          const wa = workAreas.find(a => a.id === waId);
          if (wa && ot.activities.some(a => wa.activities.includes(a))) {
            return true;
          }
        }
        return false;
      });
    }
    // Fallback: non-admin, non-profile (legacy)
    return workOrders.filter(o => o.status === 'Pendiente' || o.status === 'En Proceso');
  })();

  const visiblePendientes = visibleWorkOrders.filter(o => o.status === 'Pendiente').length;
  const visibleEnProceso = visibleWorkOrders.filter(o => o.status === 'En Proceso').length;
  const visibleTerminadas = visibleWorkOrders.filter(o => o.status === 'Terminada').length;

  // Filtered OTs: status filter applies to non-today OTs; today always shows all
  const filteredOTs = (() => {
    if (statusFilter === 'Todas') return visibleWorkOrders;
    return visibleWorkOrders.filter(o => {
      // Today's OTs: always visible regardless of status filter
      if (isOtToday(o)) return true;
      // Other days: apply status filter
      return o.status === statusFilter;
    });
  })();

  // Available filters based on role
  // Admin & Supervisor: all filters
  // Profiles with create/edit/delete: Todas + Pendiente + En Proceso (they can manage those)
  // View-only profiles: only "Todas" and "En Proceso"
  const profileCanManage = isProfileUser && (profilePerms.includes('create') || profilePerms.includes('edit') || profilePerms.includes('delete'));
  const availableFilters: StatusFilter[] = (userRole === 'admin' || isSupervisor)
    ? ['Todas', 'Pendiente', 'En Proceso', 'Terminada']
    : profileCanManage
      ? ['Todas', 'Pendiente', 'En Proceso']
      : isProfileUser
        ? ['Todas', 'En Proceso']
        : ['Todas', 'Pendiente', 'En Proceso'];

  return (
    <div className="max-w-xl mx-auto min-h-screen bg-slate-50 flex flex-col">
      {/* ─── Header ─── */}
      <header className="p-4 bg-white border-b border-slate-100 sticky top-0 z-40 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => setMenuOpen(true)} className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors active:scale-95">
            <Menu size={20} className="text-slate-600" />
          </button>
          <img src="/logo-laguna.jpg" alt="Laguna Norte" className="h-10 rounded-lg" />
          <div>
            <h1 className="text-sm font-black text-slate-800 uppercase tracking-tighter leading-none">Laguna Norte</h1>
            <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mt-0.5">Condominio & Parque</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1 text-[8px] font-black uppercase px-2 py-1 rounded-full ${userRole === 'admin' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
            {userRole === 'admin' ? <Shield size={10} /> : <User size={10} />}
            <span className="hidden sm:inline">{userRole === 'admin' ? 'Admin' : currentProfile?.name ?? 'Usuario'}</span>
          </div>
          <div className={`flex items-center gap-1 text-[8px] font-black uppercase ${syncing ? 'text-amber-500' : apiAvailable ? 'text-emerald-500' : 'text-orange-400'}`}>
            <RefreshCw size={10} className={syncing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{syncing ? 'Sincronizando...' : apiAvailable ? 'En línea' : 'Sin BD'}</span>
          </div>
          <img src="/logo-empresa.png" alt="CyJ" className="h-10 rounded-lg" />
        </div>
      </header>

      {/* ─── Main OT List View ─── */}
      {currentView === 'main' && (
        <main className="p-4 space-y-5 flex-1 pb-20">
          {/* ─── Stats Chips ─── */}
          <div className="flex gap-3">
            {(userRole === 'admin' || isSupervisor) && (
              <div className="flex-1 bg-red-50 border border-red-100 p-3 rounded-2xl flex items-center gap-2">
                <Clock className="text-red-500 flex-shrink-0" size={16} />
                <div>
                  <div className="text-xl font-black text-red-600 leading-none">{visiblePendientes}</div>
                  <div className="text-[8px] font-bold text-red-400 uppercase tracking-wider">Pendientes</div>
                </div>
              </div>
            )}
            <div className="flex-1 bg-amber-50 border border-amber-100 p-3 rounded-2xl flex items-center gap-2">
              <Zap className="text-amber-500 flex-shrink-0" size={16} />
              <div>
                <div className="text-xl font-black text-amber-600 leading-none">{visibleEnProceso}</div>
                <div className="text-[8px] font-bold text-amber-400 uppercase tracking-wider">En Proceso</div>
              </div>
            </div>
            {(userRole === 'admin' || isSupervisor) && (
              <div className="flex-1 bg-emerald-50 border border-emerald-100 p-3 rounded-2xl flex items-center gap-2">
                <CheckCircle2 className="text-emerald-500 flex-shrink-0" size={16} />
                <div>
                  <div className="text-xl font-black text-emerald-600 leading-none">{visibleTerminadas}</div>
                  <div className="text-[8px] font-bold text-emerald-400 uppercase tracking-wider">Listas</div>
                </div>
              </div>
            )}
          </div>

          {/* ─── Export Terminadas Mass Button ─── */}
          {(userRole === 'admin' || isSupervisor) && visibleTerminadas > 0 && (
            <button
              onClick={async () => {
                const terminadas = visibleWorkOrders.filter(o => o.status === 'Terminada');
                if (terminadas.length === 0) return;
                try {
                  await buildMassTerminadasPDF(terminadas);
                } catch (err) {
                  console.error('Error exporting mass PDF:', err);
                  alert('Error al generar el PDF masivo');
                }
              }}
              className="w-full py-3 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 shadow-lg shadow-emerald-300/30 active:scale-95 transition-transform"
            >
              <FileDown size={16} /> Exportar {visibleTerminadas} OTs Terminadas en PDF
            </button>
          )}

          {/* ─── Quick Create Categories ─── */}
          {canCreate && (
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Crear Planificación</p>
            <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
              {CATEGORIES.map(cat => {
                const IconComp = ICON_MAP[cat.icon];
                return (
                  <button key={cat.id} onClick={() => handleCreateFromCategory(cat)} className="flex-shrink-0 flex flex-col items-center gap-1.5 active:scale-90 transition-transform">
                    <div className={`${cat.color} w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg`}>
                      {IconComp && <IconComp size={18} />}
                    </div>
                    <span className="text-[7px] font-black uppercase text-slate-500">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
          )}

          {/* ─── Status Filter Tabs ─── */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl">
            {availableFilters.map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`flex-1 py-2 px-1 rounded-xl text-[9px] font-black uppercase transition-all ${
                  statusFilter === s
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {s === 'Todas' ? `Todas (${visibleWorkOrders.length})` : s}
              </button>
            ))}
          </div>

          {/* ─── Grouped Planificación List ─── */}
          {(() => {
            // Group OTs by their display date (plannedDate or createdAt)
            const groups: { label: string; color: string; ots: WorkOrder[]; isToday?: boolean }[] = [];
            const todayOTs: WorkOrder[] = [];
            const upcomingOTs: Map<string, WorkOrder[]> = new Map();
            const noDateOTs: WorkOrder[] = [];
            const pastOTs: Map<string, WorkOrder[]> = new Map();

            for (const ot of filteredOTs) {
              const dateKey = ot.plannedDate ? toChileDateString(ot.plannedDate) : toChileDateString(ot.createdAt);
              if (dateKey === chileTodayStr) {
                todayOTs.push(ot);
              } else if (ot.plannedDate && ot.plannedDate > Date.now()) {
                if (!upcomingOTs.has(dateKey)) upcomingOTs.set(dateKey, []);
                upcomingOTs.get(dateKey)!.push(ot);
              } else if (!ot.plannedDate) {
                noDateOTs.push(ot);
              } else {
                if (!pastOTs.has(dateKey)) pastOTs.set(dateKey, []);
                pastOTs.get(dateKey)!.push(ot);
              }
            }

            if (todayOTs.length > 0) groups.push({ label: 'Hoy', color: 'text-blue-600', ots: todayOTs, isToday: true });
            const sortedUpcoming = [...upcomingOTs.entries()].sort((a, b) => a[0].localeCompare(b[0]));
            for (const [dateKey, ots] of sortedUpcoming) {
              const parts = dateKey.split('-');
              const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
              const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
              groups.push({ label: `${dayNames[d.getDay()]} ${d.getDate()} ${CHILE_MONTHS[d.getMonth()]}`, color: 'text-violet-600', ots });
            }
            if (noDateOTs.length > 0) groups.push({ label: 'Sin planificar', color: 'text-slate-400', ots: noDateOTs });
            const sortedPast = [...pastOTs.entries()].sort((a, b) => b[0].localeCompare(a[0]));
            for (const [dateKey, ots] of sortedPast) {
              const parts = dateKey.split('-');
              const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
              const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
              groups.push({ label: `${dayNames[d.getDay()]} ${d.getDate()} ${CHILE_MONTHS[d.getMonth()]}`, color: 'text-slate-400', ots });
            }

            if (groups.length === 0) {
              return (
                <div className="text-center py-12">
                  <ClipboardList className="mx-auto text-slate-200 mb-3" size={40} />
                  <p className="text-slate-300 text-xs font-bold uppercase">No hay planificación {statusFilter === 'Todas' ? '' : statusFilter.toLowerCase()}</p>
                </div>
              );
            }

            // Sort OTs within each group by status order: Pendiente → En Proceso → Terminada
            const statusOrder: Record<string, number> = { 'Pendiente': 0, 'En Proceso': 1, 'Terminada': 2 };
            const sortByStatus = (a: WorkOrder, b: WorkOrder) => (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);

            // Sub-group a list of OTs by status
            const subGroupByStatus = (ots: WorkOrder[]) => {
              const pendientes = ots.filter(o => o.status === 'Pendiente').sort(sortByStatus);
              const enProceso = ots.filter(o => o.status === 'En Proceso').sort(sortByStatus);
              const terminadas = ots.filter(o => o.status === 'Terminada').sort(sortByStatus);
              const result: { label: string; color: string; bgColor: string; ots: WorkOrder[] }[] = [];
              if (pendientes.length > 0) result.push({ label: 'Pendiente', color: 'text-red-500', bgColor: 'bg-red-50', ots: pendientes });
              if (enProceso.length > 0) result.push({ label: 'En Proceso', color: 'text-amber-500', bgColor: 'bg-amber-50', ots: enProceso });
              if (terminadas.length > 0) result.push({ label: 'Terminada', color: 'text-emerald-500', bgColor: 'bg-emerald-50', ots: terminadas });
              return result;
            };

            return (
              <div className="space-y-4">
                {groups.map(group => (
                  <div key={group.label}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-black uppercase tracking-wider ${group.color}`}>{group.label}</span>
                      <span className="text-[8px] font-bold text-slate-300 bg-slate-50 px-2 py-0.5 rounded-full">{group.ots.length}</span>
                      {group.isToday && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />}
                    </div>
                    {/* Sub-group by status for better visual organization */}
                    {subGroupByStatus(group.ots).map(sub => (
                      <div key={sub.label} className="mb-2">
                        <div className={`flex items-center gap-1.5 mb-1.5 ml-2`}>
                          <span className={`text-[8px] font-black uppercase ${sub.color}`}>{sub.label}</span>
                          <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded-full ${sub.bgColor} ${sub.color}`}>{sub.ots.length}</span>
                        </div>
                        <div className="space-y-2">
                          {sub.ots.map(ot => {
                            const wa = getWorkAreaForOT(ot);
                            return (
                              <div
                                key={ot.id}
                                onClick={() => handleEditOT(ot)}
                                className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm cursor-pointer relative overflow-hidden active:scale-[0.98] transition-transform"
                              >
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${wa?.color ?? STATUS_CONFIG[ot.status]?.color ?? 'bg-gray-500'}`}></div>
                                <div className="flex-1 truncate pr-3 pl-2">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-[9px] font-black bg-slate-100 px-2 py-0.5 rounded-full">{ot.otId}</span>
                                    <span className={`text-[9px] font-black uppercase ${STATUS_CONFIG[ot.status]?.text ?? 'text-gray-500'}`}>{ot.status}</span>
                                    {ot.plannedDate && !group.isToday && group.label !== 'Sin planificar' ? null : ot.plannedDate ? (
                                      <span className="text-[8px] text-violet-500 font-black flex items-center gap-0.5">
                                        <CalendarDays size={8} /> {formatDate(ot.plannedDate)}
                                      </span>
                                    ) : (
                                      <span className="text-[8px] text-slate-300 font-medium">{formatDate(ot.createdAt)}</span>
                                )}
                                {userRole === 'admin' && ot.startedAt && (
                                  <span className="text-[8px] text-amber-400 font-bold flex items-center gap-0.5">
                                    <Timer size={8} /> {formatWorkingDuration(calcWorkingMs(ot.startedAt!, ot.completedAt || Date.now(), loadWorkSchedule()), loadWorkSchedule())}
                                  </span>
                                )}
                              </div>
                              <h4 className="font-black text-slate-800 uppercase truncate text-sm">{(ot.activities ?? []).join(', ')}</h4>
                              <div className="flex items-center gap-3 mt-0.5">
                                <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                                  <MapPin size={10} className="text-blue-500" /> {ot.zoneName}
                                </p>
                                {(ot.collaborators ?? []).length > 0 && (
                                  <p className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                                    <User size={10} className="text-purple-500" /> {(ot.collaborators ?? []).map(c => c.split(' ').slice(0, 2).join(' ')).join(', ')}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-1">
                                {wa && (
                                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase text-white ${wa.color}`}>
                                    {wa.name}
                                  </span>
                                )}
                                {ot.recurringId && (
                                  <span className="px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase bg-blue-50 text-blue-500 flex items-center gap-0.5">
                                    <Repeat size={7} /> recurrente
                                  </span>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="text-slate-300 flex-shrink-0" size={18} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        );
      })()}
        </main>
      )}

      {/* ─── Calendar Full-Page View ─── */}
      {currentView === 'calendar' && (
        <CalendarPanel
          onBack={() => setCurrentView('main')}
          workOrders={isProfileUser ? visibleWorkOrders : workOrders}
          recurringItems={isProfileUser ? [] : recurringItems}
          workAreas={workAreas}
          userRole={userRole!}
        />
      )}

      {/* ─── Recurring Full-Page View ─── */}
      {currentView === 'recurring' && (
        <RecurringPanel
          onBack={() => setCurrentView('main')}
          workAreas={workAreas}
          personnel={personnel}
          zones={zones}
        />
      )}

      {/* ─── Floating Action Button ─── */}
      {currentView === 'main' && canCreate && (
        <button
          onClick={handleOpenNew}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-300/50 active:scale-90 transition-transform z-50"
        >
          <Plus size={28} />
        </button>
      )}

      {/* ─── Modal (OT detail) ─── */}
      <Modal
        isOpen={isModalOpen}
        editingItem={editingItem}
        onClose={handleCloseModal}
        onSave={handleSaveOT}
        onDelete={handleDeleteOT}
        onGeneratePDF={generatePDF}
        workAreas={workAreas}
        personnel={personnel}
        zones={zones}
        userRole={userRole}
        permissions={profilePerms}
      />

      {/* ─── Dashboard Full-Page View ─── */}
      {currentView === 'dashboard' && (
        <AdminDashboard
          isOpen={true}
          onClose={() => setCurrentView('main')}
          workOrders={workOrders}
          workAreas={workAreas}
          personnel={personnel}
        />
      )}

      {/* ─── Admin Full-Page View ─── */}
      {currentView === 'admin' && (
        <AdminPanel
          isOpen={true}
          onClose={() => setCurrentView('main')}
          workAreas={workAreas}
          personnel={personnel}
          zones={zones}
          onUpdateWorkAreas={updateWorkAreas}
          onUpdatePersonnel={updatePersonnel}
          onUpdateZones={updateZones}
          profiles={profiles}
          onCreateProfile={createProfile}
          onUpdateProfile={updateProfile}
          onDeleteProfile={deleteProfile}
        />
      )}

      {/* ─── Audit Log Full-Page View (Admin Only) ─── */}
      {currentView === 'auditoria' && (
        <AuditLogView
          onBack={() => setCurrentView('main')}
        />
      )}

      {/* ─── Guardias Full-Page View (Admin & Guardia) ─── */}
      {currentView === 'guardias' && (
        <GuardiasPanel
          onBack={() => setCurrentView('main')}
          performedBy={actualPerformedBy}
          profileId={getProfileId()}
          currentProfile={currentProfile}
          userRole={userRole!}
          onScan={() => setCurrentView('scanner')}
        />
      )}

      {/* ─── QR Scanner View (Guardia) ─── */}
      {currentView === 'scanner' && currentProfile && (
        <QrScannerView
          onBack={() => setCurrentView('guardias')}
          profileName={currentProfile.name}
          profileId={currentProfile.id}
        />
      )}

      {/* ─── Inventario Full-Page View (Admin Only) ─── */}
      {currentView === 'inventario' && (
        <InventarioPanel
          onBack={() => setCurrentView('main')}
          performedBy={actualPerformedBy}
          profileId={getProfileId()}
        />
      )}

      {/* ─── Hamburger Menu ─── */}
      <HamburgerMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        userRole={userRole}
        currentProfile={currentProfile}
        onLogout={() => {
          localStorage.removeItem(USER_ROLE_KEY);
          setUserRole(null);
        }}
      />
    </div>
  );
}
