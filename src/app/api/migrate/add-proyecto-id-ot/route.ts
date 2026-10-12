import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Migración segura: Agrega columna proyectoId (nullable) a OrdenTrabajo
 * y el índice correspondiente.
 * 
 * Esta migración es NO DESTRUCTIVA:
 * - Solo agrega una columna nullable (no pierde datos)
 * - Las OTs existentes tendrán proyectoId = null
 * - Se agrega un índice para búsquedas eficientes
 */
export async function POST() {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin') return apiError('Solo admin puede ejecutar migraciones', 403)

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
