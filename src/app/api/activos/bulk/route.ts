import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

// POST - Bulk upload activos from Excel
export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'activos.crear', session.userPermisos)) {
    return apiError('Sin permisos', 403)
  }
  try {
    const data = await request.json()
    const activos = data.activos || data.assets || data.data || []
    
    if (!Array.isArray(activos) || activos.length === 0) {
      return NextResponse.json({ 
        error: 'No hay datos para procesar',
        total: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        errors: ['El archivo no contiene datos válidos']
      }, { status: 400 })
    }
    
    let created = 0
    let updated = 0
    let skipped = 0
    const errors: string[] = []
    
    for (const row of activos) {
      try {
        // Map Excel columns to database fields (support Spanish and English column names)
        const nombre = row.Nombre || row.nombre || row.Name || '';
        const categoria = row.Categoria || row.categoria || row['Categoría'] || row.Category || 'Equipo';
        const estado = row.Estado || row.estado || row.Status || 'Activo';
        const ubicacion = row.Ubicacion || row.ubicacion || row['Ubicación'] || row.Location || '';
        const serie = row.Serie || row.serie || row.Serial || '';
        const fechaCompra = row.FechaCompra || row.fechaCompra || row['Fecha Compra'] || row.PurchaseDate || '';
        const costoCompra = parseFloat(row.CostoCompra || row.costoCompra || row['Costo Compra'] || row.Cost || 0) || 0;
        const valorActual = parseFloat(row.ValorActual || row.valorActual || row['Valor Actual'] || row.Value || 0) || 0;
        const descripcion = row.Descripcion || row.descripcion || row['Descripción'] || row.Description || '';
        const asignadoNombre = row.Asignado || row.asignado || row.Assigned || '';
        
        if (!nombre.trim()) {
          skipped++
          continue
        }
        
        // Find personal by name if provided
        let asignadoId: string | null = null
        if (asignadoNombre) {
          const personal = await db.personal.findFirst({
            where: { nombre: { contains: asignadoNombre } }
          })
          if (personal) {
            asignadoId = personal.id
          }
        }
        
        // Check if exists by nombre and serie
        const existing = await db.activo.findFirst({
          where: {
            nombre,
            ...(serie && { serie })
          }
        })
        
        if (existing) {
          // Update existing
          await db.activo.update({
            where: { id: existing.id },
            data: {
              categoria,
              estado,
              ubicacion,
              serie,
              fechaCompra,
              costoCompra,
              valorActual,
              descripcion,
              asignadoId,
            }
          })
          updated++
        } else {
          // Create new
          await db.activo.create({
            data: {
              nombre,
              categoria,
              estado,
              ubicacion,
              serie,
              fechaCompra,
              costoCompra,
              valorActual,
              descripcion,
              asignadoId,
            }
          })
          created++
        }
      } catch (error) {
        console.error('Error processing row:', error)
        errors.push(`Error en fila: ${JSON.stringify(row).substring(0, 100)}`)
        skipped++
      }
    }
    
    return NextResponse.json({
      total: activos.length,
      created,
      updated,
      skipped,
      errors
    })
  } catch (error) {
    console.error('Error bulk uploading activos:', error)
    return NextResponse.json({ 
      error: 'Error al procesar carga masiva',
      total: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [String(error)]
    }, { status: 500 })
  }
}
