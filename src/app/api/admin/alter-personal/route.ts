import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST() {
  const out: string[] = []
  
  // ALTER TABLE para agregar columnas faltantes
  const alters = [
    'ALTER TABLE "Personal" ADD COLUMN IF NOT EXISTS "contrato" TEXT NOT NULL DEFAULT \'Indefinido\'',
    'ALTER TABLE "Personal" ADD COLUMN IF NOT EXISTS "afp" TEXT NOT NULL DEFAULT \'ProVida\'',
    'ALTER TABLE "Personal" ADD COLUMN IF NOT EXISTS "salud" TEXT NOT NULL DEFAULT \'Fonasa\'',
    'ALTER TABLE "Personal" ADD COLUMN IF NOT EXISTS "mutual" TEXT NOT NULL DEFAULT \'IST\'',
    'ALTER TABLE "Personal" ADD COLUMN IF NOT EXISTS "ccaf" TEXT',
    'ALTER TABLE "Personal" ADD COLUMN IF NOT EXISTS "sueldoBase" DOUBLE PRECISION NOT NULL DEFAULT 0',
    'ALTER TABLE "Personal" ADD COLUMN IF NOT EXISTS "movilizacion" DOUBLE PRECISION NOT NULL DEFAULT 0',
    'ALTER TABLE "Personal" ADD COLUMN IF NOT EXISTS "colacion" DOUBLE PRECISION NOT NULL DEFAULT 0',
    'ALTER TABLE "Personal" ADD COLUMN IF NOT EXISTS "viatico" DOUBLE PRECISION NOT NULL DEFAULT 0',
    'ALTER TABLE "Personal" ADD COLUMN IF NOT EXISTS "asigFamiliar" DOUBLE PRECISION NOT NULL DEFAULT 0',
    'ALTER TABLE "Personal" ADD COLUMN IF NOT EXISTS "foto" TEXT',
    'ALTER TABLE "Personal" ADD COLUMN IF NOT EXISTS "notas" TEXT',
    'ALTER TABLE "Personal" ADD COLUMN IF NOT EXISTS "tipoContrato" TEXT',
    'ALTER TABLE "Personal" ADD COLUMN IF NOT EXISTS "condominioId" TEXT',
  ]
  for (const a of alters) {
    try { await db.$executeRawUnsafe(a); out.push('ALTER OK') }
    catch (e: any) { out.push('ALTER: ' + e.message.substring(0, 50)) }
  }

  // Insertar personal via SQL directo
  const pers = [
    ('Luis Garcia', 'Jefe De Operaciones'),
    ('Alfredo Munoz', 'Supervisor De Operaciones'),
    ('Luis Torres', 'Auxiliar De Servicios Generales'),
    ('Cesar Adasme', 'Auxiliar De Aseo Full Time'),
    ('Erik Arteaga', 'Auxiliar De Aseo Full Time'),
    ('Jeantelus Fleurissaint', 'Auxiliar De Servicios Generales'),
    ('Chris Godoy', 'Auxiliar De Aseo Full Time'),
    ('Paulo Toro', 'Auxiliar De Servicios Generales'),
    ('Marie Dorne', 'Auxiliar De Aseo Full Time'),
    ('Macario Manriquez', 'Lagunero'),
    ('Francisco Fuentes', 'Mantencion Electricista'),
    ('Jose Venegas', 'Mantencion A'),
    ('Carlos Zamorano', 'Mantencion B'),
  ]
  
  for (const p of pers) {
    try {
      await db.$executeRawUnsafe(
        `INSERT INTO "Personal" ("id", "nombre", "cargo", "estado", "contrato", "afp", "salud", "mutual", "sueldoBase", "movilizacion", "colacion", "viatico", "asigFamiliar", "createdAt", "updatedAt") VALUES (gen_random_uuid()::text, $1, $2, 'Activo', 'Indefinido', 'ProVida', 'Fonasa', 'IST', 0, 0, 0, 0, 0, NOW(), NOW()) ON CONFLICT DO NOTHING`,
        p[0], p[1]
      )
      out.push(`Personal OK: ${p[0]}`)
    } catch (e: any) { out.push(`Personal ERR ${p[0]}: ${e.message.substring(0, 60)}`) }
  }

  return NextResponse.json({ out })
}
