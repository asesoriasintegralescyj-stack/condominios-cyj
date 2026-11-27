import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const tasks = await db.lagunaTask.findMany({ where: { deleted: false }, orderBy: { updatedAt: 'asc' } });
    return NextResponse.json({ ok: true, tasks });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const tasks = Array.isArray(body?.tasks) ? body.tasks : [];
    for (const t of tasks) {
      await db.lagunaTask.upsert({
        where: { id: t.id },
        create: { id: t.id, mes: t.mes || (t.data && t.data.mes) || '', data: t.data || t, deleted: t.deleted || false },
        update: { mes: t.mes || (t.data && t.data.mes) || '', data: t.data || t, deleted: t.deleted || false },
      });
    }
    return NextResponse.json({ ok: true, upserted: tasks.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
