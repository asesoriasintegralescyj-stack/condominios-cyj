/**
 * One-time database sync endpoint.
 * Adds columns that were added to prisma/schema.prisma but missing from the DB
 * because `db push` was previously run against the outdated root schema.prisma.
 *
 * Call once: POST /api/db-sync
 * After sync, this endpoint can be deleted.
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Columnas a agregar si no existen
const COLUMNS: { name: string; type: string; default?: string }[] = [
  { name: 'moneda', type: 'TEXT', default: "'CLP'" },
  { name: 'proyectoId', type: 'TEXT' },
  { name: 'proyectoNombre', type: 'TEXT' },
  { name: 'otId', type: 'TEXT' },
  { name: 'otCodigo', type: 'TEXT' },
  { name: 'centroCostoId', type: 'TEXT' },
  { name: 'submittedAt', type: 'TIMESTAMPTZ' },
]

const INDEXES: { name: string; on: string }[] = [
  { name: 'SolicitudCompra_proyectoId_idx', on: '"SolicitudCompra"("proyectoId")' },
  { name: 'SolicitudCompra_otId_idx', on: '"SolicitudCompra"("otId")' },
  { name: 'SolicitudCompra_centroCostoId_idx', on: '"SolicitudCompra"("centroCostoId")' },
]

export async function POST() {
  // Protección: solo admin puede ejecutar sync
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (session.user.rol !== 'admin') {
    return NextResponse.json({ error: 'Solo admin puede ejecutar sync' }, { status: 403 })
  }

  const results: { column: string; status: string }[] = []
  const indexResults: { index: string; status: string }[] = []

  try {
    // 1. Agregar columnas faltantes
    for (const col of COLUMNS) {
      try {
        // Verificar si la columna ya existe
        const exists = await db.$queryRawUnsafe<
          { exists: boolean }[]
        >(
          `SELECT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'SolicitudCompra' AND column_name = '${col.name}'
          )`
        )

        if (exists[0]?.exists) {
          results.push({ column: col.name, status: 'ya existe' })
          continue
        }

        const defaultClause = col.default ? ` DEFAULT ${col.default}` : ''
        const nullable = col.default ? '' : ' DEFAULT NULL'
        await db.$executeRawUnsafe(
          `ALTER TABLE "SolicitudCompra" ADD COLUMN "${col.name}" ${col.type}${defaultClause}${nullable}`
        )
        results.push({ column: col.name, status: 'agregada' })
      } catch (err) {
        console.error(`Error adding column ${col.name}:`, err)
        results.push({ column: col.name, status: `error: ${String(err)}` })
      }
    }

    // 2. Crear índices faltantes
    for (const idx of INDEXES) {
      try {
        const exists = await db.$queryRawUnsafe<
          { exists: boolean }[]
        >(
          `SELECT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE indexname = '${idx.name}'
          )`
        )

        if (exists[0]?.exists) {
          indexResults.push({ index: idx.name, status: 'ya existe' })
          continue
        }

        await db.$executeRawUnsafe(`CREATE INDEX "${idx.name}" ON ${idx.on}`)
        indexResults.push({ index: idx.name, status: 'creado' })
      } catch (err) {
        console.error(`Error creating index ${idx.name}:`, err)
        indexResults.push({ index: idx.name, status: `error: ${String(err)}` })
      }
    }

    return NextResponse.json({
      ok: true,
      columns: results,
      indexes: indexResults,
      message: 'Sync completado',
    })
  } catch (error) {
    console.error('db-sync error:', error)
    return NextResponse.json(
      { error: 'Error en sync', details: String(error) },
      { status: 500 }
    )
  }
}

// GET para verificar estado sin modificar
export async function GET() {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (session.user.rol !== 'admin') {
    return NextResponse.json({ error: 'Solo admin puede verificar sync' }, { status: 403 })
  }

  try {
    const columns = await db.$queryRawUnsafe<
      { column_name: string; data_type: string; column_default: string | null }[]
    >(
      `SELECT column_name, data_type, column_default
       FROM information_schema.columns
       WHERE table_name = 'SolicitudCompra'
       ORDER BY ordinal_position`
    )

    const indexes = await db.$queryRawUnsafe<
      { indexname: string }[]
    >(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'SolicitudCompra'`
    )

    const missing = COLUMNS.filter(
      (c) => !columns.some((col) => col.column_name === c.name)
    ).map((c) => c.name)

    return NextResponse.json({
      ok: true,
      currentColumns: columns.map((c) => c.column_name),
      currentIndexes: indexes.map((i) => i.indexname),
      missingColumns: missing,
      needsSync: missing.length > 0,
    })
  } catch (error) {
    console.error('db-sync check error:', error)
    return NextResponse.json(
      { error: 'Error verificando estado', details: String(error) },
      { status: 500 }
    )
  }
}
