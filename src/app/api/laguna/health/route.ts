import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ ok: true, service: 'laguna-norte-api', time: new Date().toISOString() });
}
