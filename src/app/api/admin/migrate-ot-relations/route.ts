import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { readFile } from 'fs/promises'
import path from 'path'

export async function POST() {
  const out: string[] = []
  try {
    const filePath = path.join(process.cwd(), 'public', 'respaldo-bd-part2.json')
    const raw = await readFile(filePath, 'utf-8')
    const data = JSON.parse(raw)

    const tareas = data.oTTarea || []
    let tarOk = 0
    for (const t of tareas) {
      try {
        await db.$executeRawUnsafe(`INSERT INTO "OTTarea" ("id","descripcion","cantidad","estado","ok","noOk","na","otId") VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
          t.id, t.descripcion, t.cantidad||1, t.estado||'Pendiente', t.ok||false, t.noOk||false, t.na||false, t.otId)
        tarOk++
      } catch {}
    }
    out.push(`OTTarea: ${tarOk}/${tareas.length}`)

    const mats = data.oTMaterial || []
    let matOk = 0
    for (const m of mats) {
      try {
        await db.$executeRawUnsafe(`INSERT INTO "OTMaterial" ("id","descripcion","cantidad","precioUnit","total","unidad","otId") VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
          m.id, m.descripcion, m.cantidad||1, m.precioUnit||0, m.total||0, m.unidad||'unidad', m.otId)
        matOk++
      } catch {}
    }
    out.push(`OTMaterial: ${matOk}/${mats.length}`)

    const hers = data.oTHerramienta || []
    let herOk = 0
    for (const h of hers) {
      try {
        await db.$executeRawUnsafe(`INSERT INTO "OTHerramienta" ("id","nombre","cantidad","otId") VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING`,
          h.id, h.nombre, h.cantidad||1, h.otId)
        herOk++
      } catch {}
    }
    out.push(`OTHerramienta: ${herOk}/${hers.length}`)

    const pers = data.oTPersonal || []
    let perOk = 0
    for (const p of pers) {
      try {
        await db.$executeRawUnsafe(`INSERT INTO "OTPersonal" ("id","nombre","tipo","cantidad","precioUnit","horasTrabajadas","total","otId") VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
          p.id, p.nombre, p.tipo||'Interno', p.cantidad||1, p.precioUnit||0, p.horasTrabajadas||0, p.total||0, p.otId)
        perOk++
      } catch {}
    }
    out.push(`OTPersonal: ${perOk}/${pers.length}`)

    out.push('COMPLETO')
  } catch (e: any) { out.push('ERROR: ' + e.message.substring(0, 100)) }
  return NextResponse.json({ success: true, out })
}
