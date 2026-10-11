import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET() {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (session.user.rol !== 'admin') {
    return NextResponse.json({ error: 'Solo admin' }, { status: 403 })
  }

  try {
    // 1. Contar TODAS las filas sin filtros
    const totalCount = await db.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*) as count FROM "SolicitudCompra"`
    )

    // 2. Contar por condominioId
    const byCondominio = await db.$queryRawUnsafe<[
      { condominio_id: string | null; count: bigint }
    ]>(
      `SELECT "condominioId" as condominio_id, COUNT(*) as count
       FROM "SolicitudCompra"
       GROUP BY "condominioId"`
    )

    // 3. Contar por estado
    const byEstado = await db.$queryRawUnsafe<[
      { estado: string; count: bigint }
    ]>(
      `SELECT estado, COUNT(*) as count
       FROM "SolicitudCompra"
       GROUP BY estado`
    )

    // 4. Verificar columnas que existen
    const columns = await db.$queryRawUnsafe<[
      { column_name: string }
    ]>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'SolicitudCompra'
       ORDER BY ordinal_position`
    )

    // 5. Últimas 5 solicitudes (sin filtro)
    const recent = await db.$queryRawUnsafe<
      Record<string, unknown>[]
    >(
      `SELECT id, codigo, titulo, estado, "condominioId", "createdAt"
       FROM "SolicitudCompra"
       ORDER BY "createdAt" DESC
       LIMIT 5`
    )

    return NextResponse.json({
      totalRows: Number(totalCount[0].count),
      byCondominio: byCondominio.map(r => ({
        condominioId: r.condominio_id,
        count: Number(r.count),
      })),
      byEstado: byEstado.map(r => ({
        estado: r.estado,
        count: Number(r.count),
      })),
      columns: columns.map(c => c.column_name),
      recentRows: recent,
    })
  } catch (error) {
    console.error('db-diag error:', error)
    return NextResponse.json(
      { error: 'Error de diagnóstico', details: String(error) },
      { status: 500 }
    )
  }
}
