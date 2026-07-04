import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { readFile } from 'fs/promises'
import path from 'path'

export async function POST() {
  const out: string[] = []
  try {
    const filePath = path.join(process.cwd(), 'public', 'respaldo-bd-part1.json')
    const raw = await readFile(filePath, 'utf-8')
    const data = JSON.parse(raw)

    out.push('1. ALTER OrdenTrabajo...')
    const alters = [
      'ALTER TABLE "OrdenTrabajo" ADD COLUMN IF NOT EXISTS "tipo" TEXT NOT NULL DEFAULT \'Correctivo\'',
      'ALTER TABLE "OrdenTrabajo" ADD COLUMN IF NOT EXISTS "prioridad" TEXT NOT NULL DEFAULT \'Media\'',
      'ALTER TABLE "OrdenTrabajo" ADD COLUMN IF NOT EXISTS "progreso" INTEGER NOT NULL DEFAULT 0',
      'ALTER TABLE "OrdenTrabajo" ADD COLUMN IF NOT EXISTS "descripcion" TEXT',
      'ALTER TABLE "OrdenTrabajo" ADD COLUMN IF NOT EXISTS "tiempoEst" INTEGER NOT NULL DEFAULT 0',
      'ALTER TABLE "OrdenTrabajo" ADD COLUMN IF NOT EXISTS "tiempoReal" INTEGER NOT NULL DEFAULT 0',
      'ALTER TABLE "OrdenTrabajo" ADD COLUMN IF NOT EXISTS "valorHora" DOUBLE PRECISION NOT NULL DEFAULT 0',
      'ALTER TABLE "OrdenTrabajo" ADD COLUMN IF NOT EXISTS "notas" TEXT',
      'ALTER TABLE "OrdenTrabajo" ADD COLUMN IF NOT EXISTS "esRecurrente" BOOLEAN NOT NULL DEFAULT false',
      'ALTER TABLE "OrdenTrabajo" ADD COLUMN IF NOT EXISTS "tareaOrigenId" TEXT',
      'ALTER TABLE "OrdenTrabajo" ADD COLUMN IF NOT EXISTS "proximaEjecucion" TEXT',
      'ALTER TABLE "OrdenTrabajo" ADD COLUMN IF NOT EXISTS "formaPago" TEXT',
      'ALTER TABLE "OrdenTrabajo" ADD COLUMN IF NOT EXISTS "estadoAprobacion" TEXT',
      'ALTER TABLE "OrdenTrabajo" ADD COLUMN IF NOT EXISTS "fechaSolicitudAprob" TEXT',
      'ALTER TABLE "OrdenTrabajo" ADD COLUMN IF NOT EXISTS "fechaAprobacion" TEXT',
      'ALTER TABLE "OrdenTrabajo" ADD COLUMN IF NOT EXISTS "aprobadoPor" TEXT',
      'ALTER TABLE "OrdenTrabajo" ADD COLUMN IF NOT EXISTS "observacionesAprob" TEXT',
      'ALTER TABLE "OrdenTrabajo" ADD COLUMN IF NOT EXISTS "fotosAntes" TEXT',
      'ALTER TABLE "OrdenTrabajo" ADD COLUMN IF NOT EXISTS "fotosDespues" TEXT',
      'ALTER TABLE "OrdenTrabajo" ADD COLUMN IF NOT EXISTS "propiedadId" TEXT',
      'ALTER TABLE "OrdenTrabajo" ADD COLUMN IF NOT EXISTS "asignadoId" TEXT',
      'ALTER TABLE "OrdenTrabajo" ADD COLUMN IF NOT EXISTS "activoId" TEXT',
      'ALTER TABLE "OrdenTrabajo" ADD COLUMN IF NOT EXISTS "centroCostoId" TEXT',
      'ALTER TABLE "OrdenTrabajo" ADD COLUMN IF NOT EXISTS "fechaInicioReal" TEXT',
      'ALTER TABLE "OrdenTrabajo" ADD COLUMN IF NOT EXISTS "fechaFinReal" TEXT',
      'ALTER TABLE "OrdenTrabajo" ADD COLUMN IF NOT EXISTS "costoEstimado" DOUBLE PRECISION NOT NULL DEFAULT 0',
      'ALTER TABLE "OrdenTrabajo" ADD COLUMN IF NOT EXISTS "costoReal" DOUBLE PRECISION NOT NULL DEFAULT 0',
      'ALTER TABLE "OrdenTrabajo" ADD COLUMN IF NOT EXISTS "fechaInicio" TEXT',
      'ALTER TABLE "OrdenTrabajo" ADD COLUMN IF NOT EXISTS "fechaLimite" TEXT',
      'ALTER TABLE "OrdenTrabajo" ADD COLUMN IF NOT EXISTS "ubicacion" TEXT',
      'ALTER TABLE "OrdenTrabajo" ADD COLUMN IF NOT EXISTS "condominioId" TEXT',
      'ALTER TABLE "OrdenTrabajo" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()',
    ]
    for (const a of alters) { try { await db.$executeRawUnsafe(a) } catch {} }
    out.push('   ALTER OK')

    out.push('2. Migrando OTs...')
    const ots = data.ordenTrabajo || []
    let otOk = 0
    for (const ot of ots) {
      try {
        await db.$executeRawUnsafe(
          `INSERT INTO "OrdenTrabajo" ("id","otNum","titulo","tipo","prioridad","estado","ubicacion","fechaInicio","fechaLimite","costoEstimado","costoReal","progreso","descripcion","tiempoEst","tiempoReal","notas","esRecurrente","formaPago","estadoAprobacion","createdAt","updatedAt","condominioId","propiedadId","asignadoId","centroCostoId","fechaInicioReal","fechaFinReal") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27) ON CONFLICT (id) DO NOTHING`,
          ot.id, ot.otNum, ot.titulo, ot.tipo||'Correctivo', ot.prioridad||'Media', ot.estado||'Pendiente',
          ot.ubicacion, ot.fechaInicio, ot.fechaLimite, ot.costoEstimado||0, ot.costoReal||0, ot.progreso||0,
          ot.descripcion, ot.tiempoEst||0, ot.tiempoReal||0, ot.notas, ot.esRecurrente||false,
          ot.formaPago, ot.estadoAprobacion,
          ot.createdAt ? new Date(ot.createdAt) : new Date(), new Date(),
          ot.condominioId, ot.propiedadId, ot.asignadoId, ot.centroCostoId, ot.fechaInicioReal, ot.fechaFinReal
        )
        otOk++
      } catch {}
    }
    out.push(`   OTs: ${otOk}/${ots.length}`)

    out.push('3. ALTER OTTarea...')
    try { await db.$executeRawUnsafe('ALTER TABLE "OTTarea" ADD COLUMN IF NOT EXISTS "ok" BOOLEAN NOT NULL DEFAULT false') } catch {}
    try { await db.$executeRawUnsafe('ALTER TABLE "OTTarea" ADD COLUMN IF NOT EXISTS "noOk" BOOLEAN NOT NULL DEFAULT false') } catch {}
    try { await db.$executeRawUnsafe('ALTER TABLE "OTTarea" ADD COLUMN IF NOT EXISTS "na" BOOLEAN NOT NULL DEFAULT false') } catch {}

    out.push('4. Migrando OT Tareas...')
    const tareas = data.oTTarea || []
    let tarOk = 0
    for (const t of tareas) {
      try {
        await db.$executeRawUnsafe(`INSERT INTO "OTTarea" ("id","descripcion","cantidad","estado","ok","noOk","na","otId") VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
          t.id, t.descripcion, t.cantidad||1, t.estado||'Pendiente', t.ok||false, t.noOk||false, t.na||false, t.otId)
        tarOk++
      } catch {}
    }
    out.push(`   Tareas: ${tarOk}/${tareas.length}`)

    out.push('5. Migrando OT Materiales...')
    const mats = data.oTMaterial || []
    let matOk = 0
    for (const m of mats) {
      try {
        await db.$executeRawUnsafe(`INSERT INTO "OTMaterial" ("id","descripcion","cantidad","precioUnit","total","unidad","otId") VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
          m.id, m.descripcion, m.cantidad||1, m.precioUnit||0, m.total||0, m.unidad||'unidad', m.otId)
        matOk++
      } catch {}
    }
    out.push(`   Materiales: ${matOk}/${mats.length}`)

    out.push('6. Migrando OT Herramientas...')
    const hers = data.oTHerramienta || []
    let herOk = 0
    for (const h of hers) {
      try {
        await db.$executeRawUnsafe(`INSERT INTO "OTHerramienta" ("id","nombre","cantidad","otId") VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO NOTHING`,
          h.id, h.nombre, h.cantidad||1, h.otId)
        herOk++
      } catch {}
    }
    out.push(`   Herramientas: ${herOk}/${hers.length}`)

    out.push('7. Migrando OT Personal...')
    try { await db.$executeRawUnsafe('ALTER TABLE "OTPersonal" ADD COLUMN IF NOT EXISTS "horasTrabajadas" DOUBLE PRECISION NOT NULL DEFAULT 0') } catch {}
    const pers = data.oTPersonal || []
    let perOk = 0
    for (const p of pers) {
      try {
        await db.$executeRawUnsafe(`INSERT INTO "OTPersonal" ("id","nombre","tipo","cantidad","precioUnit","horasTrabajadas","total","otId") VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
          p.id, p.nombre, p.tipo||'Interno', p.cantidad||1, p.precioUnit||0, p.horasTrabajadas||0, p.total||0, p.otId)
        perOk++
      } catch {}
    }
    out.push(`   Personal: ${perOk}/${pers.length}`)

    out.push('MIGRACION OT COMPLETA')
  } catch (e: any) { out.push('ERROR: ' + e.message.substring(0, 100)) }
  return NextResponse.json({ success: true, out })
}
