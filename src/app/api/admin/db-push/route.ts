import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// TEMPORAL: sincroniza la BD ejecutando ALTER TABLE directamente
// para agregar los campos nuevos que faltan en Neon
export async function POST(request: NextRequest) {
  const resultados: string[] = []

  // Lista de ALTERs a ejecutar (todos idempotentes con IF NOT EXISTS donde sea posible)
  const sqls = [
    // Proyecto: agregar campo codigo
    `ALTER TABLE "Proyecto" ADD COLUMN IF NOT EXISTS "codigo" TEXT`,
    // Activo: agregar campo codigo
    `ALTER TABLE "Activo" ADD COLUMN IF NOT EXISTS "codigo" TEXT`,
    // Crear tabla SalidaPanol si no existe
    `CREATE TABLE IF NOT EXISTS "SalidaPanol" (
      "id" TEXT NOT NULL,
      "herramientaId" TEXT NOT NULL,
      "usuarioNombre" TEXT NOT NULL,
      "usuarioRUT" TEXT,
      "fechaSalida" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "horaSalida" TEXT NOT NULL,
      "trabajoRealizar" TEXT,
      "sectorTrabajo" TEXT,
      "lvAntesCompletada" BOOLEAN NOT NULL DEFAULT false,
      "lvAntesItems" TEXT,
      "lvAntesFirma" TEXT,
      "fechaIngreso" TIMESTAMP(3),
      "horaIngreso" TEXT,
      "estadoDevolucion" TEXT,
      "comentarios" TEXT,
      "lvDespuesCompletada" BOOLEAN NOT NULL DEFAULT false,
      "lvDespuesItems" TEXT,
      "lvDespuesFirma" TEXT,
      "estado" TEXT NOT NULL DEFAULT 'Pendiente',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "SalidaPanol_pkey" PRIMARY KEY ("id")
    )`,
    // Foreign key de SalidaPanol a CatHerramienta
    `DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'SalidaPanol_herramientaId_fkey'
      ) THEN
        ALTER TABLE "SalidaPanol"
        ADD CONSTRAINT "SalidaPanol_herramientaId_fkey"
        FOREIGN KEY ("herramientaId") REFERENCES "CatHerramienta"("id") ON DELETE CASCADE;
      END IF;
    END $$`,
    // Índices para SalidaPanol
    `CREATE INDEX IF NOT EXISTS "SalidaPanol_herramientaId_estado_idx" ON "SalidaPanol"("herramientaId", "estado")`,
    `CREATE INDEX IF NOT EXISTS "SalidaPanol_usuarioNombre_idx" ON "SalidaPanol"("usuarioNombre")`,
    `CREATE INDEX IF NOT EXISTS "SalidaPanol_fechaSalida_idx" ON "SalidaPanol"("fechaSalida")`,
    // Unique constraint para codigo en Proyecto (solo si no existe ya)
    `DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'Proyecto_codigo_key'
      ) THEN
        ALTER TABLE "Proyecto" ADD CONSTRAINT "Proyecto_codigo_key" UNIQUE ("codigo");
      END IF;
    END $$`,
    // Unique constraint para codigo en Activo
    `DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'Activo_codigo_key'
      ) THEN
        ALTER TABLE "Activo" ADD CONSTRAINT "Activo_codigo_key" UNIQUE ("codigo");
      END IF;
    END $$`,
    // Índice para centroCostoId en Proyecto
    `CREATE INDEX IF NOT EXISTS "Proyecto_centroCostoId_idx" ON "Proyecto"("centroCostoId")`,
    // Foreign key de Proyecto a CentroCostoMaster
    `DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'Proyecto_centroCostoId_fkey'
      ) THEN
        ALTER TABLE "Proyecto"
        ADD CONSTRAINT "Proyecto_centroCostoId_fkey"
        FOREIGN KEY ("centroCostoId") REFERENCES "CentroCostoMaster"("id");
      END IF;
    END $$`,
    // Nuevos campos en Proyecto
    `ALTER TABLE "Proyecto" ADD COLUMN IF NOT EXISTS "tipoTrabajo" TEXT`,
    `ALTER TABLE "Proyecto" ADD COLUMN IF NOT EXISTS "responsableExterno" TEXT`,
    // Relación inversa proyectos en CentroCostoMaster (no requiere columna, es virtual)
  ]

  for (const sql of sqls) {
    try {
      await db.$executeRawUnsafe(sql)
      resultados.push(`OK: ${sql.substring(0, 60)}...`)
    } catch (e: any) {
      // Si el error es "ya existe", lo ignoramos
      if (e.message.includes('already exists') || e.message.includes('duplicate')) {
        resultados.push(`SKIP (ya existe): ${sql.substring(0, 60)}...`)
      } else {
        resultados.push(`ERROR: ${e.message.substring(0, 100)}`)
      }
    }
  }

  return NextResponse.json({
    success: true,
    resultados,
    total: resultados.length,
  })
}
