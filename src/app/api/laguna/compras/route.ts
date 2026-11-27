import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const compras = await db.lagunaCompra.findMany({ where: { deleted: false }, orderBy: { updatedAt: 'asc' } });
    return NextResponse.json({ ok: true, compras });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const compras = Array.isArray(body?.compras) ? body.compras : [];
    for (const c of compras) {
      await db.lagunaCompra.upsert({
        where: { id: c.id },
        create: { id: c.id, mes: c.mes || (c.data && c.data.mes) || '', data: c.data || c, deleted: c.deleted || false },
        update: { mes: c.mes || (c.data && c.data.mes) || '', data: c.data || c, deleted: c.deleted || false },
      });
    }
    return NextResponse.json({ ok: true, upserted: compras.length });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
