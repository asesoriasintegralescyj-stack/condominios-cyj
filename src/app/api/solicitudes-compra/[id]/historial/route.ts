import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

interface Context {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: Context) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  const { id } = await params
  const historial = await db.historialAprobacionSC.findMany({
    where: { solicitudId: id },
    orderBy: { fechaAccion: 'desc' },
  })

  return NextResponse.json(historial)
}
