import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 30


export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'ID es obligatorio' }, { status: 400 })
    }
    await withRetry(() => db.movilQrScan.delete({ where: { id } }))
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/qr-scans/[id] error:', err)
    const msg = err instanceof Error ? err.message : 'Error al eliminar'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
