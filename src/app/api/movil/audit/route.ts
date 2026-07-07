import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'

export async function GET() {
  try {
    const logs = await withRetry(() => db.movilAuditLog.findMany({ take: 100, orderBy: { createdAt: 'desc' } }))
    return NextResponse.json(logs)
  } catch { return NextResponse.json([]) }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const log = await withRetry(() => db.movilAuditLog.create({
      data: { action: body.action || 'UPDATE', entityType: body.entityType || 'WorkOrder', entityId: body.entityId || '', entityName: body.entityName || '', changes: body.changes || '{}', performedBy: body.performedBy || 'admin', profileId: body.profileId || null }
    }))
    return NextResponse.json(log)
  } catch { return NextResponse.json({ error: 'Error' }, { status: 500 }) }
}
