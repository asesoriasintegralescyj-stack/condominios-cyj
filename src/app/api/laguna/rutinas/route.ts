import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function GET() {
  const client = await pool.connect();
  try {
    const r = await client.query('SELECT id, data, updated_at FROM rutinas ORDER BY updated_at ASC');
    return NextResponse.json({ ok: true, rutinas: r.rows });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const rutinas = Array.isArray(body?.rutinas) ? body.rutinas : [];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const r of rutinas) {
      await client.query(
        `INSERT INTO rutinas (id, data, updated_at)
         VALUES ($1, $2, now())
         ON CONFLICT (id) DO UPDATE SET
           data = EXCLUDED.data,
           updated_at = now()`,
        [r.id, r.data || r]
      );
    }
    await client.query('COMMIT');
    return NextResponse.json({ ok: true, upserted: rutinas.length });
  } catch (e: any) {
    await client.query('ROLLBACK');
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  } finally {
    client.release();
  }
}
