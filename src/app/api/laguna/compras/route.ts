import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function GET() {
  const client = await pool.connect();
  try {
    const r = await client.query(
      'SELECT id, mes, data, deleted, updated_at FROM compras WHERE deleted = false ORDER BY updated_at ASC'
    );
    return NextResponse.json({ ok: true, compras: r.rows });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const compras = Array.isArray(body?.compras) ? body.compras : [];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const c of compras) {
      await client.query(
        `INSERT INTO compras (id, mes, data, deleted, updated_at)
         VALUES ($1, $2, $3, $4, now())
         ON CONFLICT (id) DO UPDATE SET
           mes = EXCLUDED.mes,
           data = EXCLUDED.data,
           deleted = EXCLUDED.deleted,
           updated_at = now()`,
        [c.id, c.mes || (c.data && c.data.mes) || '', c.data || c, c.deleted || false]
      );
    }
    await client.query('COMMIT');
    return NextResponse.json({ ok: true, upserted: compras.length });
  } catch (e: any) {
    await client.query('ROLLBACK');
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  } finally {
    client.release();
  }
}
