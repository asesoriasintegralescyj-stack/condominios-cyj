/**
 * API — Reporte diario de Rondas QR por email
 * ─────────────────────────────────────────────────
 * Se ejecuta automáticamente vía cron de Vercel:
 *   • 07:00 AM (Chile) → reporte del turno noche (19:00–07:00)
 *   • 07:15 AM (Chile) → reporte del turno día anterior (07:00–19:00)
 *
 * También puede invocarse manualmente con:
 *   GET /api/alertas/rondas-diario?shift=noche|dia&fecha=YYYY-MM-DD
 *
 * El reporte agrupa las marcaciones por GUARDIA y luego por SECTOR (prefijo
 * del nombre de la ubicación QR: PORTERÍA, GAVIOTAS, ALBATROS, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { sendEmail, emailWrap, escapeHtml } from '@/lib/email'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Prisma dedicado para este endpoint (connect/disconnect explicito)
// para no competir con el pool global del PrismaClient
function createIsolatedDb() {
  const databaseUrl = process.env.DATABASE_URL || ''
  const connectionString = databaseUrl.includes('?')
    ? databaseUrl + (databaseUrl.includes('connection_limit') ? '' : '&connection_limit=1&pool_timeout=60')
    : databaseUrl + '?connection_limit=1&pool_timeout=60'
  return new PrismaClient({
    log: ['error'],
    datasources: { db: { url: connectionString } },
  })
}

// ─── Tipos ───

interface ScanRecord {
  id: string
  qrLocationId: string
  scannedBy: string
  createdAt: Date
  latitude: number | null
  longitude: number | null
  notes: string
  locationName: string
  locationCode: string
}

interface LocationInfo {
  id: string
  name: string
  location: string
  code: string
}

// ─── Helpers ───

/** Extrae el sector (prefijo) del nombre de la ubicación QR */
function extractSector(locationName: string): string {
  // Ejemplos: "GAVIOTAS - ENTRADA A" → "GAVIOTAS", "PORTERÍA PRINCIPAL" → "PORTERÍA"
  const parts = locationName.split(/[·\-–—|,]/)
  const sector = (parts[0] || locationName).trim().toUpperCase()
  return sector
}

/** Formatea hora en Chile */
function formatHoraCL(date: Date): string {
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date)
}

/** Formatea fecha en Chile */
function formatFechaCL(date: Date): string {
  return new Intl.DateTimeFormat('es-CL', {
    timeZone: 'America/Santiago',
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

/** Obtiene el offset de Chile dinámicamente (UTC-3 DST o UTC-4 standard) */
function getChileOffsetMs(): number {
  const now = new Date()
  const chileStr = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santiago',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
  // Parse "MM/DD/YYYY, HH:MM"
  const [, datePart, timePart] = /(\d{2}\/\d{2}\/\d{4}), (\d{2}:\d{2})/.exec(chileStr) || []
  if (!datePart || !timePart) return -4 * 60 * 60 * 1000
  const [m, d, y] = datePart.split('/').map(Number)
  const [h, min] = timePart.split(':').map(Number)
  const chileDate = new Date(y, m - 1, d, h, min)
  const utcDate = new Date(now.getTime() + now.getTimezoneOffset() * 60 * 1000)
  return chileDate.getTime() - utcDate.getTime()
}

/** Obtiene el inicio y fin del turno en timestamps UTC correctos */
function getTurnoRange(shift: 'dia' | 'noche', fechaStr?: string): { start: Date; end: Date; label: string } {
  const now = new Date()
  const chileOffsetMs = getChileOffsetMs()

  let year: number, month: number, day: number
  if (fechaStr) {
    ;[year, month, day] = fechaStr.split('-').map(Number)
  } else {
    // Fecha actual en Chile
    const chileStr = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now)
    ;[year, month, day] = chileStr.split('-').map(Number)
  }

  if (shift === 'dia') {
    // Turno día: 07:00 – 19:00 del mismo día (Chile)
    const start = new Date(Date.UTC(year, month - 1, day, 7, 0, 0) - chileOffsetMs)
    const end = new Date(Date.UTC(year, month - 1, day, 19, 0, 0) - chileOffsetMs)
    return {
      start,
      end,
      label: `Turno Día 07:00–19:00 · ${formatFechaCL(start)}`,
    }
  } else {
    // Turno noche: 19:00 del día indicado – 07:00 del día siguiente (Chile)
    const start = new Date(Date.UTC(year, month - 1, day, 19, 0, 0) - chileOffsetMs)
    const end = new Date(Date.UTC(year, month - 1, day + 1, 7, 0, 0) - chileOffsetMs)
    return {
      start,
      end,
      label: `Turno Noche 19:00–07:00 · ${formatFechaCL(start)}`,
    }
  }
}

// ─── Generador de HTML del reporte ───

function buildReporteHtml(
  shift: 'dia' | 'noche',
  label: string,
  scansByGuard: Map<string, ScanRecord[]>,
  totalScans: number,
  ubicacionesCount: number,
): string {
  const shiftIcon = shift === 'dia' ? '☀️' : '🌙'
  const shiftColor = shift === 'dia' ? '#f59e0b' : '#3b82f6'

  // Agrupar globalmente por sector para el resumen
  const sectorCounts = new Map<string, number>()
  for (const [, scans] of scansByGuard) {
    for (const s of scans) {
      const sector = extractSector(s.locationName)
      sectorCounts.set(sector, (sectorCounts.get(sector) || 0) + 1)
    }
  }
  const sectoresOrdenados = Array.from(sectorCounts.entries()).sort((a, b) => b[1] - a[1])

  // Resumen ejecutivo
  let resumenHtml = `
    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin-bottom:20px;">
      <div style="display:flex;flex-wrap:wrap;gap:16px;font-size:14px;">
        <div><strong>Total marcaciones:</strong> ${totalScans}</div>
        <div><strong>Guardias:</strong> ${scansByGuard.size}</div>
        <div><strong>Ubicaciones:</strong> ${ubicacionesCount}</div>
        <div><strong>Sectores:</strong> ${sectorCounts.size}</div>
      </div>
    </div>`

  // Tabla de resumen por sector
  let sectorTableHtml = `
    <h2 style="font-size:15px;color:#0f2040;margin:20px 0 10px;">📊 Resumen por Sector</h2>
    <table style="border-collapse:collapse;width:100%;font-size:13px;margin-bottom:20px;">
      <thead>
        <tr style="background-color:#0f2040;color:#fff;">
          <th style="padding:8px 12px;text-align:left;">Sector</th>
          <th style="padding:8px 12px;text-align:center;">Marcaciones</th>
        </tr>
      </thead>
      <tbody>
        ${sectoresOrdenados.map(([sector, count], i) => `
          <tr style="background-color:${i % 2 === 0 ? '#fff' : '#f8fafc'};">
            <td style="padding:6px 12px;border:1px solid #e2e8f0;font-weight:600;">${escapeHtml(sector)}</td>
            <td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center;">${count}</td>
          </tr>`).join('')}
      </tbody>
    </table>`

  // Detalle por guardia, agrupado por sector
  let guardiasHtml = '<h2 style="font-size:15px;color:#0f2040;margin:20px 0 10px;">👤 Detalle por Guardia</h2>'

  const guardiasSorted = Array.from(scansByGuard.entries()).sort(([a], [b]) =>
    a.localeCompare(b, 'es', { sensitivity: 'base' })
  )

  for (const [guardName, scans] of guardiasSorted) {
    // Agrupar las marcaciones de este guardia por sector
    const bySector = new Map<string, ScanRecord[]>()
    for (const s of scans) {
      const sector = extractSector(s.locationName)
      if (!bySector.has(sector)) bySector.set(sector, [])
      bySector.get(sector)!.push(s)
    }
    const sectoresGuardia = Array.from(bySector.entries()).sort(([a], [b]) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' })
    )

    guardiasHtml += `
      <div style="border:1px solid #e2e8f0;border-radius:8px;margin-bottom:16px;overflow:hidden;">
        <div style="background:${shiftColor}20;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;">
          <strong style="font-size:14px;color:#0f2040;">${escapeHtml(guardName)}</strong>
          <span style="font-size:12px;color:#64748b;">${scans.length} marcaciones</span>
        </div>
        <table style="border-collapse:collapse;width:100%;font-size:12px;">
          <thead>
            <tr style="background:#f8fafc;">
              <th style="padding:6px 10px;text-align:left;border-bottom:1px solid #e2e8f0;">Sector</th>
              <th style="padding:6px 10px;text-align:left;border-bottom:1px solid #e2e8f0;">Ubicación</th>
              <th style="padding:6px 10px;text-align:center;border-bottom:1px solid #e2e8f0;">Hora</th>
              <th style="padding:6px 10px;text-align:center;border-bottom:1px solid #e2e8f0;">GPS</th>
              <th style="padding:6px 10px;text-align:left;border-bottom:1px solid #e2e8f0;">Notas</th>
            </tr>
          </thead>
          <tbody>
            ${sectoresGuardia.flatMap(([, sectorScans]) =>
              sectorScans.map((s, i) => `
                <tr style="background-color:${i % 2 === 0 ? '#fff' : '#fafafa'};">
                  <td style="padding:5px 10px;border-bottom:1px solid #f1f5f9;font-weight:600;color:${shiftColor};">${escapeHtml(extractSector(s.locationName))}</td>
                  <td style="padding:5px 10px;border-bottom:1px solid #f1f5f9;">${escapeHtml(s.locationName)}<br/><span style="font-size:10px;color:#94a3b8;">${escapeHtml(s.locationCode)}</span></td>
                  <td style="padding:5px 10px;border-bottom:1px solid #f1f5f9;text-align:center;font-family:monospace;">${formatHoraCL(s.createdAt)}</td>
                  <td style="padding:5px 10px;border-bottom:1px solid #f1f5f9;text-align:center;">${s.latitude != null ? '✅' : '—'}</td>
                  <td style="padding:5px 10px;border-bottom:1px solid #f1f5f9;color:#64748b;">${s.notes ? escapeHtml(s.notes) : '—'}</td>
                </tr>`)
            ).join('')}
          </tbody>
        </table>
      </div>`
  }

  // Guardias sin actividad
  // (no se incluye porque no hay registros de quién debía estar de turno en el reporte)

  return emailWrap(
    `${shiftIcon} Reporte de Rondas QR — ${shift === 'dia' ? 'Turno Día' : 'Turno Noche'}`,
    label,
    resumenHtml + sectorTableHtml + guardiasHtml
  )
}

// ─── GET — Generar y enviar reporte ───

export async function GET(request: NextRequest) {
  const db = createIsolatedDb()
  try {
    await db.$connect()
    const { searchParams } = new URL(request.url)
    const shiftParam = (searchParams.get('shift') || '') as 'dia' | 'noche'
    const fechaParam = searchParams.get('fecha') || undefined

    // Auto-detectar turno según hora actual (Chile) si no se especifica
    let shiftsToRun: Array<'dia' | 'noche'> = []
    if (shiftParam === 'dia' || shiftParam === 'noche') {
      shiftsToRun = [shiftParam]
    } else {
      // Auto-detect: entre 07:00-19:00 Chile = turno día; entre 19:00-07:00 = noche
      // Cuando corre el cron a las 07:00, enviamos ambos (noche anterior + día que inicia)
      const chileHour = parseInt(
        new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Santiago',
          hour: 'numeric',
          hour12: false,
        }).format(new Date()),
        10
      )
      if (chileHour >= 7 && chileHour < 19) {
        // Horario diurno: reportar turno noche (terminó) y turno día (en curso a las 7:15)
        if (chileHour <= 8) {
          // Solo en la primera hora enviamos el turno noche del día anterior
          shiftsToRun = ['noche']
        } else {
          // Resto del día: no hay cron programado, solo manual
          shiftsToRun = ['dia']
        }
      } else {
        shiftsToRun = ['noche']
      }
    }

    const results: string[] = []

    for (const shift of shiftsToRun) {
      const { start, end, label } = getTurnoRange(shift, fechaParam)

      // 1. Obtener todos los escaneos del turno
      const scans = await db.movilQrScan.findMany({
        where: {
          createdAt: { gte: start, lt: end },
        },
        orderBy: { createdAt: 'asc' },
      })

      if (scans.length === 0) {
        results.push(`${label}: Sin marcaciones registradas.`)
        continue
      }

      // 2. Obtener ubicaciones únicas (batch, no N+1)
      const locationIds = [...new Set(scans.map((s) => s.qrLocationId))]
      const locations = await db.movilQrLocation.findMany({
        where: { id: { in: locationIds } },
        select: { id: true, name: true, location: true, code: true },
      })
      const locMap = new Map<string, LocationInfo>()
      for (const loc of locations) locMap.set(loc.id, loc)

      // 3. Enriquecer scans con datos de ubicación
      const enrichedScans: ScanRecord[] = scans.map((s) => {
        const loc = locMap.get(s.qrLocationId)
        return {
          id: s.id,
          qrLocationId: s.qrLocationId,
          scannedBy: s.scannedBy,
          createdAt: s.createdAt,
          latitude: s.latitude,
          longitude: s.longitude,
          notes: s.notes,
          locationName: loc?.name || 'Desconocida',
          locationCode: loc?.code || '—',
        }
      })

      // 4. Agrupar por guardia
      const scansByGuard = new Map<string, ScanRecord[]>()
      for (const s of enrichedScans) {
        const name = s.scannedBy || 'Sin nombre'
        if (!scansByGuard.has(name)) scansByGuard.set(name, [])
        scansByGuard.get(name)!.push(s)
      }

      // 5. Generar HTML del reporte
      const html = buildReporteHtml(
        shift,
        label,
        scansByGuard,
        enrichedScans.length,
        locationIds.length,
      )

      // 6. Enviar email
      const emailResult = await sendEmail({
        subject: `🔍 Reporte Rondas — ${label} · ${enrichedScans.length} marcaciones`,
        html,
        text: `Reporte de Rondas: ${label}. Total: ${enrichedScans.length} marcaciones de ${scansByGuard.size} guardia(s).`,
      })

      if (emailResult.ok) {
        results.push(`${label}: ✅ Enviado (${enrichedScans.length} marcaciones, ${scansByGuard.size} guardias)`)
      } else {
        results.push(`${label}: ⚠️ ${emailResult.error || 'No enviado'}`)
      }
    }

    // Liberar conexión a BD (importante para Aiven free tier)
    await db.$disconnect()

    return NextResponse.json({
      ok: true,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[RondasDiario] Error:', error)
    await db.$disconnect()
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 },
    )
  }
}
