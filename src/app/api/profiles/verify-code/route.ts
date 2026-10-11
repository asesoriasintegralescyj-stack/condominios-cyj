import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/profiles/verify-code
 * Verifica el codigo de acceso (PIN) de un perfil movil.
 * La app movil usa esto para autenticar guardias al escanear.
 *
 * Body: { code: string }
 * Returns: { success: boolean, profile?: {...}, error?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json()
    if (!code || typeof code !== 'string') {
      return NextResponse.json({ success: false, error: 'Codigo requerido' }, { status: 400 })
    }

    const profile = await withRetry(() =>
      db.movilProfile.findUnique({
        where: { accessCode: code.trim() },
        select: {
          id: true, name: true, color: true, icon: true,
          workAreaIds: true, permissions: true, personalId: true,
          userId: true, createdAt: true, updatedAt: true,
        },
      }),
    )

    if (!profile) {
      return NextResponse.json({ success: false, error: 'Codigo no valido' }, { status: 404 })
    }

    return NextResponse.json({ success: true, profile })
  } catch (err) {
    console.error('POST /api/profiles/verify-code error:', err)
    return NextResponse.json({ error: 'Error al verificar codigo' }, { status: 500 })
  }
}
