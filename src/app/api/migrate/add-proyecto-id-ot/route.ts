import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Secret token for running migration via URL (e.g. ?token=cj2024migrate)
const MIGRATE_TOKEN = 'cj2024migrate'

/**
 * Migración segura: Agrega columna proyectoId (nullable) a OrdenTrabajo
 * y el índice correspondiente.
 * 
 * Esta migración es NO DESTRUCTIVA:
 * - Solo agrega una columna nullable (no pierde datos)
 * - Las OTs existentes tendrán proyectoId = null
 * - Se agrega un índice para búsquedas eficientes
 */
export async function POST(request: NextRequest) {
  // Allow via admin session OR via secret token in query params
  const session = await getCurrentSession()
  const token = request.nextUrl.searchParams.get('token')
  const isAuthorized = (session && session.user.rol === 'admin') || token === MIGRATE_TOKEN
  
  if (!isAuthorized) return apiError('No autorizado. Usa sesión admin o ?token=cj2024migrate', 403)

  try {
    // Check if column already exists
    const columnCheck = await db.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'OrdenTrabajo' 
        AND column_name = 'proyectoId'
    `

    if (Array.isArray(columnCheck) && columnCheck.length > 0) {
      return NextResponse.json({ 
        ok: true, 
        message: 'La columna proyectoId ya existe en OrdenTrabajo. No se requieren cambios.',
        alreadyExists: true 
      })
    }

    // Add the nullable column
    await db.$executeRaw`
      ALTER TABLE "OrdenTrabajo" 
      ADD COLUMN "proyectoId" TEXT
    `

    // Add the foreign key constraint
    await db.$executeRaw`
      ALTER TABLE "OrdenTrabajo" 
      ADD CONSTRAINT "OrdenTrabajo_proyectoId_fkey" 
      FOREIGN KEY ("proyectoId") REFERENCES "Proyecto"("id") 
      ON DELETE SET NULL
    `

    // Add the index
    await db.$executeRaw`
      CREATE INDEX "OrdenTrabajo_proyectoId_idx" ON "OrdenTrabajo"("proyectoId")
    `

    return NextResponse.json({ 
      ok: true, 
      message: 'Columna proyectoId agregada exitosamente a OrdenTrabajo con FK e índice.',
      changes: [
        'ALTER TABLE "OrdenTrabajo" ADD COLUMN "proyectoId" TEXT',
        'ADD CONSTRAINT "OrdenTrabajo_proyectoId_fkey" FOREIGN KEY → Proyecto(id) ON DELETE SET NULL',
        'CREATE INDEX "OrdenTrabajo_proyectoId_idx" ON "OrdenTrabajo"("proyectoId")',
      ]
    })
  } catch (error) {
    console.error('Error en migración add-proyecto-id-ot:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
