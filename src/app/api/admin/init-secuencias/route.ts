import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST() {
  const out: string[] = []
  
  // Crear tabla Secuencia si no existe
  try {
    await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "Secuencia" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "tabla" TEXT NOT NULL,
      "prefijo" TEXT NOT NULL,
      "ultimoNum" INTEGER NOT NULL DEFAULT 0,
      "padding" INTEGER NOT NULL DEFAULT 3,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "Secuencia_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "Secuencia_tabla_key" UNIQUE ("tabla")
    )`)
    out.push('Tabla Secuencia creada')
  } catch (e: any) { out.push('Tabla: ' + e.message.substring(0, 60)) }

  // Inicializar secuencias con los valores actuales
  const secuencias = [
    { tabla: 'OrdenTrabajo', prefijo: 'OT', padding: 4 },
    { tabla: 'Proyecto', prefijo: 'PROY', padding: 3 },
    { tabla: 'SolicitudCompra', prefijo: 'SC', padding: 4 },
    { tabla: 'CatHerramienta', prefijo: 'HERR', padding: 3 },
    { tabla: 'CatMaterial', prefijo: 'MAT', padding: 3 },
    { tabla: 'CatTarea', prefijo: 'TAR', padding: 3 },
    { tabla: 'Activo', prefijo: 'ACT', padding: 3 },
  ]

  for (const s of secuencias) {
    try {
      // Obtener el último número usado
      let ultimoNum = 0
      
      if (s.tabla === 'OrdenTrabajo') {
        const rows: any = await db.$queryRawUnsafe(`SELECT MAX(CAST(REPLACE("otNum", '${s.prefijo}-', '') AS INTEGER)) as max FROM "OrdenTrabajo"`)
        ultimoNum = rows[0]?.max || 0
      } else if (s.tabla === 'Proyecto') {
        const rows: any = await db.$queryRawUnsafe(`SELECT MAX(CAST(REPLACE("codigo", '${s.prefijo}-', '') AS INTEGER)) as max FROM "Proyecto" WHERE "codigo" LIKE '${s.prefijo}-%'`)
        ultimoNum = rows[0]?.max || 0
      } else if (s.tabla === 'SolicitudCompra') {
        const rows: any = await db.$queryRawUnsafe(`SELECT MAX(CAST(REPLACE("codigo", '${s.prefijo}-', '') AS INTEGER)) as max FROM "SolicitudCompra"`)
        ultimoNum = rows[0]?.max || 0
      } else if (s.tabla === 'CatHerramienta') {
        const rows: any = await db.$queryRawUnsafe(`SELECT MAX(CAST(REPLACE("codigo", '${s.prefijo}-', '') AS INTEGER)) as max FROM "CatHerramienta" WHERE "codigo" LIKE '${s.prefijo}-%'`)
        ultimoNum = rows[0]?.max || 0
      } else if (s.tabla === 'CatMaterial') {
        const rows: any = await db.$queryRawUnsafe(`SELECT MAX(CAST(REPLACE("codigo", '${s.prefijo}-', '') AS INTEGER)) as max FROM "CatMaterial" WHERE "codigo" LIKE '${s.prefijo}-%'`)
        ultimoNum = rows[0]?.max || 0
      } else if (s.tabla === 'CatTarea') {
        const rows: any = await db.$queryRawUnsafe(`SELECT MAX(CAST(REPLACE("codigo", '${s.prefijo}-', '') AS INTEGER)) as max FROM "CatTarea" WHERE "codigo" LIKE '${s.prefijo}-%'`)
        ultimoNum = rows[0]?.max || 0
      } else if (s.tabla === 'Activo') {
        const rows: any = await db.$queryRawUnsafe(`SELECT MAX(CAST(REPLACE("codigo", '${s.prefijo}-', '') AS INTEGER)) as max FROM "Activo" WHERE "codigo" LIKE '${s.prefijo}-%'`)
        ultimoNum = rows[0]?.max || 0
      }

      // Upsert
      await db.$executeRawUnsafe(
        `INSERT INTO "Secuencia" ("id", "tabla", "prefijo", "ultimoNum", "padding", "updatedAt") VALUES (gen_random_uuid()::text, $1, $2, $3, $4, NOW()) ON CONFLICT ("tabla") DO UPDATE SET "ultimoNum" = $3, "updatedAt" = NOW()`,
        s.tabla, s.prefijo, ultimoNum, s.padding
      )
      out.push(`${s.prefijo}: ultimoNum=${ultimoNum}`)
    } catch (e: any) {
      out.push(`${s.prefijo}: ${e.message.substring(0, 60)}`)
    }
  }

  out.push('SECUENCIAS INICIALIZADAS')
  return NextResponse.json({ success: true, out })
}
