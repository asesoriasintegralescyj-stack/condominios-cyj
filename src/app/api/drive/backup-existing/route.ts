import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Endpoint temporal para respaldar todos los proyectos y OTs existentes a Drive.
 */
export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    proyectos: { total: 0, carpetasCreadas: 0, respaldos: 0, errores: [] as string[] },
    ots: { total: 0, carpetasCreadas: 0, respaldos: 0, errores: [] as string[] },
  }

  if (!process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT) {
    return NextResponse.json({ error: 'Drive no configurado' }, { status: 400 })
  }

  try {
    const { createProjectFolderStructure, createOTFolderStructure, uploadFile } = await import('@/lib/google-drive')

    // ─── PROYECTOS ───
    const proyectos = await db.proyecto.findMany({
      select: { id: true, codigo: true, nombre: true, estado: true, descripcion: true,
        sector: true, tipoReparacion: true, tipoTrabajo: true, prioridad: true,
        responsable: true, monto: true, categoria: true, ubicacion: true,
        driveFolderId: true, driveData: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    results.proyectos.total = proyectos.length

    for (const p of proyectos) {
      try {
        if (!p.driveData) {
          const structure = await createProjectFolderStructure(p.codigo, p.nombre)
          await db.proyecto.update({
            where: { id: p.id },
            data: {
              driveFolderId: structure.proyectoFolder.id,
              driveData: JSON.stringify({
                proyectoFolder: structure.proyectoFolder,
                solicitudesFolder: structure.solicitudesFolder,
                documentosFolder: structure.documentosFolder,
                fotosAntesFolder: structure.fotosAntesFolder,
                fotosDespuesFolder: structure.fotosDespuesFolder,
                createdAt: new Date().toISOString(),
              }),
            },
          })
          results.proyectos.carpetasCreadas++
          const docsFolderId = structure.documentosFolder.id
          const contenido = JSON.stringify({
            respaldo: `Proyecto ${p.codigo}`,
            fechaGenerado: new Date().toISOString(),
            proyecto: { id: p.id, codigo: p.codigo, nombre: p.nombre, categoria: p.categoria,
              estado: p.estado, ubicacion: p.ubicacion, descripcion: p.descripcion,
              sector: p.sector, tipoReparacion: p.tipoReparacion, tipoTrabajo: p.tipoTrabajo,
              prioridad: p.prioridad, responsable: p.responsable, monto: p.monto, createdAt: p.createdAt },
          }, null, 2)
          await uploadFile(Buffer.from(contenido, 'utf-8'), `Datos del proyecto - ${p.codigo}.json`, docsFolderId, 'application/json')
          results.proyectos.respaldos++
        } else {
          const folders = JSON.parse(p.driveData)
          const docsFolderId = folders.documentosFolder?.id
          if (docsFolderId) {
            const contenido = JSON.stringify({
              respaldo: `Proyecto ${p.codigo}`,
              fechaGenerado: new Date().toISOString(),
              proyecto: { id: p.id, codigo: p.codigo, nombre: p.nombre, categoria: p.categoria,
                estado: p.estado, ubicacion: p.ubicacion, descripcion: p.descripcion,
                sector: p.sector, tipoReparacion: p.tipoReparacion, tipoTrabajo: p.tipoTrabajo,
                prioridad: p.prioridad, responsable: p.responsable, monto: p.monto, createdAt: p.createdAt },
            }, null, 2)
            await uploadFile(Buffer.from(contenido, 'utf-8'), `Datos del proyecto - ${p.codigo}.json`, docsFolderId, 'application/json')
            results.proyectos.respaldos++
          }
        }
      } catch (e: any) {
        results.proyectos.errores.push(`${p.codigo}: ${e.message}`)
      }
    }

    // ─── OTs con proyecto que tiene Drive ───
    const ots = await db.ordenTrabajo.findMany({
      select: { id: true, otNum: true, titulo: true, tipo: true, prioridad: true,
        estado: true, descripcion: true, proyectoId: true, driveFolderId: true,
        fechaInicio: true, fechaLimite: true, costoEstimado: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    results.ots.total = ots.length

    for (const ot of ots) {
      try {
        if (!ot.proyectoId) continue
        const proy = await db.proyecto.findUnique({
          where: { id: ot.proyectoId },
          select: { driveFolderId: true, driveData: true, codigo: true },
        })
        if (!proy?.driveFolderId) continue
        if (ot.driveFolderId) continue // ya tiene carpetas

        const structure = await createOTFolderStructure(ot.otNum, ot.titulo, proy.driveFolderId)
        await db.ordenTrabajo.update({
          where: { id: ot.id },
          data: { driveFolderId: structure.otFolder.id },
        })
        results.ots.carpetasCreadas++

        const contenido = JSON.stringify({
          respaldo: `OT ${ot.otNum}`,
          fechaGenerado: new Date().toISOString(),
          ordenTrabajo: { id: ot.id, otNum: ot.otNum, titulo: ot.titulo, tipo: ot.tipo,
            prioridad: ot.prioridad, estado: ot.estado, descripcion: ot.descripcion,
            fechaInicio: ot.fechaInicio, fechaLimite: ot.fechaLimite, costoEstimado: ot.costoEstimado,
            proyecto: proy.codigo },
        }, null, 2)
        await uploadFile(Buffer.from(contenido, 'utf-8'), `Datos OT - ${ot.otNum}.json`, structure.documentosFolder.id, 'application/json')
        results.ots.respaldos++
      } catch (e: any) {
        results.ots.errores.push(`${ot.otNum}: ${e.message}`)
      }
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(results)
}
