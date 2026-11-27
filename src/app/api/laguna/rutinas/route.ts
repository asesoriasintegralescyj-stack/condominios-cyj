import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const rutinas = await db.lagunaRutina.findMany({ orderBy: { updatedAt: 'asc' } });
    return NextResponse.json({ ok: true, rutinas });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rutinas = Array.isArray(body?.rutinas) ? body.rutinas : [];
    for (const r of rutinas) {
      await db.lagunaRutina.upsert({
        where: { id: r.id },
        create: { id: r.id, data: r.data || r },
        update: { data: r.data || r },
      });
    }
    return NextResponse.json({ ok: true, upserted: rutinas.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
