import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST() {
  const out: string[] = []
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
    try { await db.$executeRawUnsafe(a); out.push('OK') }
    catch (e: any) { out.push('ERR: ' + e.message.substring(0, 60)) }
  }
  return NextResponse.json({ out })
}
