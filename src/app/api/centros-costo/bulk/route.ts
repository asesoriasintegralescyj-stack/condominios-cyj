import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST - Bulk upload centros de costo from Excel data
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const centrosList = data.centros // Array of centro de costo objects from Excel
    
    if (!Array.isArray(centrosList) || centrosList.length === 0) {
      return NextResponse.json({ error: 'No centros de costo data provided' }, { status: 400 })
    }
    
    const results = {
      total: centrosList.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[]
    }
    
    // Get count for generating new codes
    const count = await db.centroCostoMaster.count()
    
    for (let i = 0; i < centrosList.length; i++) {
      const row = centrosList[i]
      try {
        // Map Excel columns to database fields
        const codigo = row.Codigo?.toString().trim() || row.codigo?.toString().trim()
        const nombre = row.Nombre?.toString().trim() || row.nombre?.toString().trim()
        const descripcion = row.Descripcion?.toString().trim() || row.descripcion?.toString().trim() || null
        const responsable = row.Responsable?.toString().trim() || row.responsable?.toString().trim() || null
        const tipoGasto = row.TipoGasto?.toString().trim() || row.tipoGasto?.toString().trim() || 'Variable'
        const presupuestoMens = parseFloat(row.PresupuestoMensual?.toString() || row.presupuestoMens?.toString() || row.Presupuesto?.toString() || '0') || 0
        const presupuestoAnual = parseFloat(row.PresupuestoAnual?.toString() || row.presupuestoAnual?.toString() || '0') || presupuestoMens * 12
        const estado = row.Estado?.toString().trim() || row.estado?.toString().trim() || 'Activo'
        
        if (!nombre) {
          results.skipped++
          continue
        }
        
        // Generate codigo if not provided
        const finalCodigo = codigo || `CC-${String(count + results.created + 1).padStart(3, '0')}`
        
        // Check if centro de costo exists by codigo or name
        let existingCentro: { id: string } | null = null
        if (finalCodigo) {
          existingCentro = await db.centroCostoMaster.findUnique({
            where: { codigo: finalCodigo },
            select: { id: true }
          })
        }
        if (!existingCentro && nombre) {
          existingCentro = await db.centroCostoMaster.findFirst({
            where: { nombre: { equals: nombre } },
            select: { id: true }
          })
        }
        
        if (existingCentro && existingCentro.id) {
          // Update existing centro de costo
          await db.centroCostoMaster.update({
            where: { id: existingCentro.id },
            data: {
              nombre,
              descripcion,
              responsable,
              tipoGasto,
              presupuestoMens,
              presupuestoAnual,
              estado,
            }
          })
          results.updated++
        } else {
          // Create new centro de costo
          await db.centroCostoMaster.create({
            data: {
              codigo: finalCodigo,
              nombre,
              descripcion,
              responsable,
              tipoGasto,
              presupuestoMens,
              presupuestoAnual,
              estado,
            }
          })
          results.created++
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.errors.push(`Fila ${i + 1}: ${errorMessage}`)
        results.skipped++
      }
    }
    
    return NextResponse.json(results)
  } catch (error) {
    console.error('Error bulk uploading centros de costo:', error)
    return NextResponse.json({ error: 'Error processing bulk upload' }, { status: 500 })
  }
}
