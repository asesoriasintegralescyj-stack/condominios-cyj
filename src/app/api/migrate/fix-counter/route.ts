/**
 * Reparar contador de Secuencia sincronizado con el máximo otNum real
 * 
 * GET /api/migrate/fix-counter?token=MIGRATE_2026_ALFREDO
 * 
 * 1. Lee MAX(otNum) de la tabla OrdenTrabajo
 * 2. Lee Secuencia.ultimoNum para OrdenTrabajo
 * 3. Si Secuencia está desactualizado, lo actualiza al valor correcto
 * 4. También repara otros contadores (Proyecto, SolicitudCompra, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const MIGRATE_TOKEN = 'MIGRATE_2026_ALFREDO'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  
  if (token !== MIGRATE_TOKEN) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 403 })
  }

  const results: string[] = []

  try {
    // ─── Reparar contador de OrdenTrabajo ───
    const maxOT = await db.$queryRawUnsafe(`
      SELECT COALESCE(MAX(CAST(SUBSTRING("otNum" FROM 4) AS INT)), 0)::int as max_num
      FROM "OrdenTrabajo"
    `) as any[]
    
    const maxOTNum = maxOT[0]?.max_num || 0
    
    const secOT = await db.$queryRawUnsafe(`
      SELECT "ultimoNum"::int as num FROM "Secuencia" WHERE "tabla" = 'OrdenTrabajo'
    `) as any[]
    
    const currentSec = secOT[0]?.num || 0
    
    results.push(`OrdenTrabajo: MAX(otNum)=${maxOTNum}, Secuencia.ultimoNum=${currentSec}`)
    
    if (currentSec < maxOTNum) {
      await db.$executeRawUnsafe(`
        INSERT INTO "Secuencia" ("id", "tabla", "prefijo", "ultimoNum", "padding", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), 'OrdenTrabajo', 'OT', $1, 4, NOW(), NOW())
        ON CONFLICT ("tabla") DO UPDATE SET "ultimoNum" = $1, "updatedAt" = NOW()
      `, maxOTNum)
      results.push(`  CORREGIDO: Secuencia actualizada de ${currentSec} a ${maxOTNum}`)
    } else {
      results.push(`  OK: Secuencia ya está correcta (${currentSec} >= ${maxOTNum})`)
    }

    // ─── Reparar contador de Proyecto ───
    const maxProy = await db.$queryRawUnsafe(`
      SELECT COALESCE(MAX(CAST(SUBSTRING("codigo" FROM 6) AS INT)), 0)::int as max_num
      FROM "Proyecto"
    `) as any[]
    
    const maxProyNum = maxProy[0]?.max_num || 0
    
    const secProy = await db.$queryRawUnsafe(`
      SELECT "ultimoNum"::int as num FROM "Secuencia" WHERE "tabla" = 'Proyecto'
    `) as any[]
    
    const currentProySec = secProy[0]?.num || 0
    
    results.push(`Proyecto: MAX(codigo)=${maxProyNum}, Secuencia.ultimoNum=${currentProySec}`)
    
    if (currentProySec < maxProyNum) {
      await db.$executeRawUnsafe(`
        INSERT INTO "Secuencia" ("id", "tabla", "prefijo", "ultimoNum", "padding", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), 'Proyecto', 'PROY', $1, 3, NOW(), NOW())
        ON CONFLICT ("tabla") DO UPDATE SET "ultimoNum" = $1, "updatedAt" = NOW()
      `, maxProyNum)
      results.push(`  CORREGIDO: Proyecto actualizado de ${currentProySec} a ${maxProyNum}`)
    }

    // ─── Reparar contador de SolicitudCompra ───
    const maxSC = await db.$queryRawUnsafe(`
      SELECT COALESCE(MAX(CAST(SUBSTRING("numero" FROM 4) AS INT)), 0)::int as max_num
      FROM "SolicitudCompra"
    `) as any[]
    
    const maxSCNum = maxSC[0]?.max_num || 0
    
    const secSC = await db.$queryRawUnsafe(`
      SELECT "ultimoNum"::int as num FROM "Secuencia" WHERE "tabla" = 'SolicitudCompra'
    `) as any[]
    
    const currentSCSec = secSC[0]?.num || 0
    
    results.push(`SolicitudCompra: MAX(numero)=${maxSCNum}, Secuencia.ultimoNum=${currentSCSec}`)
    
    if (currentSCSec < maxSCNum) {
      await db.$executeRawUnsafe(`
        INSERT INTO "Secuencia" ("id", "tabla", "prefijo", "ultimoNum", "padding", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), 'SolicitudCompra', 'SC', $1, 3, NOW(), NOW())
        ON CONFLICT ("tabla") DO UPDATE SET "ultimoNum" = $1, "updatedAt" = NOW()
      `, maxSCNum)
      results.push(`  CORREGIDO: SolicitudCompra actualizado de ${currentSCSec} a ${maxSCNum}`)
    }

    // ─── Diagnóstico final: mostrar todos los contadores ───
    const allSec = await db.$queryRawUnsafe(`
      SELECT "tabla", "prefijo", "ultimoNum"::int as "ultimoNum", "padding" 
      FROM "Secuencia" ORDER BY "tabla"
    `) as any[]
    
    results.push(`\nTodos los contadores:`)
    for (const s of allSec) {
      results.push(`  ${s.prefijo} (${s.tabla}): ultimoNum=${s.ultimoNum}, padding=${s.padding}`)
    }

    return NextResponse.json({
      success: true,
      results,
      otFixed: currentSec < maxOTNum,
      otOldValue: currentSec,
      otNewValue: maxOTNum,
    })
  } catch (error: any) {
    console.error('Error fix-counter:', error)
    return NextResponse.json({ error: error.message, results }, { status: 500 })
  }
}
