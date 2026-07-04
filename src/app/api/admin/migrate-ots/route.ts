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

    // ALTER para agregar columnas faltantes
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
      'ALTER TABLE "OrdenTrabajo" ADD COLUMN IF NOT EXISTS "formaPago" TEXT',
      'ALTER TABLE "OrdenTrabajo" ADD COLUMN IF NOT EXISTS "estadoAprobacion" TEXT',
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
      'ALTER TABLE "OTTarea" ADD COLUMN IF NOT EXISTS "ok" BOOLEAN NOT NULL DEFAULT false',
      'ALTER TABLE "OTTarea" ADD COLUMN IF NOT EXISTS "noOk" BOOLEAN NOT NULL DEFAULT false',
      'ALTER TABLE "OTTarea" ADD COLUMN IF NOT EXISTS "na" BOOLEAN NOT NULL DEFAULT false',
      'ALTER TABLE "OTPersonal" ADD COLUMN IF NOT EXISTS "horasTrabajadas" DOUBLE PRECISION NOT NULL DEFAULT 0',
      'ALTER TABLE "OTPersonal" ADD COLUMN IF NOT EXISTS "cumple" BOOLEAN',
      'ALTER TABLE "OTPersonal" ADD COLUMN IF NOT EXISTS "observaciones" TEXT',
      'ALTER TABLE "ProyectoMaterial" ADD COLUMN IF NOT EXISTS "linkCompra" TEXT',
    ]
    for (const a of alters) { try { await db.$executeRawUnsafe(a) } catch {} }
    out.push('ALTER OK')

    // Migrar OTs
    const ots = data.ordenTrabajo || []
    let otOk = 0
    let otErr = 0
    for (const ot of ots) {
      try {
        await db.$executeRawUnsafe(
          `INSERT INTO "OrdenTrabajo" ("id","otNum","titulo","tipo","prioridad","estado","ubicacion","fechaInicio","fechaLimite","costoEstimado","costoReal","progreso","descripcion","tiempoEst","tiempoReal","valorHora","notas","esRecurrente","formaPago","estadoAprobacion","createdAt","updatedAt","condominioId","propiedadId","asignadoId","centroCostoId","fechaInicioReal","fechaFinReal") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28) ON CONFLICT (id) DO UPDATE SET "otNum" = EXCLUDED."otNum"`,
          ot.id, ot.otNum, ot.titulo, ot.tipo||'Correctivo', ot.prioridad||'Media', ot.estado||'Pendiente',
          ot.ubicacion||null, ot.fechaInicio||null, ot.fechaLimite||null,
          ot.costoEstimado||0, ot.costoReal||0, ot.progreso||0,
          ot.descripcion||null, ot.tiempoEst||0, ot.tiempoReal||0, ot.valorHora||0,
          ot.notas||null, ot.esRecurrente||false,
          ot.formaPago||null, ot.estadoAprobacion||null,
          ot.createdAt ? new Date(ot.createdAt) : new Date(), new Date(),
          ot.condominioId||null, ot.propiedadId||null, ot.asignadoId||null, ot.centroCostoId||null,
          ot.fechaInicioReal||null, ot.fechaFinReal||null
        )
        otOk++
      } catch (e: any) {
        if (otErr < 5) out.push(`OT ERR ${ot.otNum}: ${e.message.substring(0, 200)}`)
        otErr++
      }
    }
    out.push(`OTs: ${otOk}/${ots.length} (${otErr} errores)`)

    // Migrar OTTareas
    const tareas = data.oTTarea || []
    let tarOk = 0
    for (const t of tareas) {
      try {
        await db.$executeRawUnsafe(`INSERT INTO "OTTarea" ("id","descripcion","cantidad","estado","ok","noOk","na","otId") VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO UPDATE SET "otNum" = EXCLUDED."otNum"`,
          t.id, t.descripcion, t.cantidad||1, t.estado||'Pendiente', t.ok||false, t.noOk||false, t.na||false, t.otId)
        tarOk++
      } catch {}
    }
    out.push(`Tareas: ${tarOk}/${tareas.length}`)

    // Migrar OTMateriales
    const mats = data.oTMaterial || []
    let matOk = 0
    for (const m of mats) {
      try {
        await db.$executeRawUnsafe(`INSERT INTO "OTMaterial" ("id","descripcion","cantidad","precioUnit","total","unidad","otId") VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO UPDATE SET "otNum" = EXCLUDED."otNum"`,
          m.id, m.descripcion, m.cantidad||1, m.precioUnit||0, m.total||0, m.unidad||'unidad', m.otId)
        matOk++
      } catch {}
    }
    out.push(`Materiales: ${matOk}/${mats.length}`)

    // Migrar OTHerramientas
    const hers = data.oTHerramienta || []
    let herOk = 0
    for (const h of hers) {
      try {
        await db.$executeRawUnsafe(`INSERT INTO "OTHerramienta" ("id","nombre","cantidad","otId") VALUES ($1,$2,$3,$4) ON CONFLICT (id) DO UPDATE SET "otNum" = EXCLUDED."otNum"`,
          h.id, h.nombre, h.cantidad||1, h.otId)
        herOk++
      } catch {}
    }
    out.push(`Herramientas: ${herOk}/${hers.length}`)

    // Migrar OTPersonal
    const pers = data.oTPersonal || []
    let perOk = 0
    for (const p of pers) {
      try {
        await db.$executeRawUnsafe(`INSERT INTO "OTPersonal" ("id","nombre","tipo","cantidad","precioUnit","horasTrabajadas","total","otId") VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO UPDATE SET "otNum" = EXCLUDED."otNum"`,
          p.id, p.nombre, p.tipo||'Interno', p.cantidad||1, p.precioUnit||0, p.horasTrabajadas||0, p.total||0, p.otId)
        perOk++
      } catch {}
    }
    out.push(`Personal OT: ${perOk}/${pers.length}`)

    out.push('MIGRACION COMPLETA')
  } catch (e: any) { out.push('ERROR: ' + e.message.substring(0, 100)) }
  return NextResponse.json({ success: true, out })
}
