import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession, hasPermission } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

// POST - Bulk upload asistencia from Excel
export async function POST(request: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin' && !hasPermission(session.user.rol, 'personal.editar')) {
    return apiError('Sin permisos', 403)
  }
  try {
    const data = await request.json()
    const asistencias = data.asistencias || data.attendance || data.data || []
    
    if (!Array.isArray(asistencias) || asistencias.length === 0) {
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
    
    for (const row of asistencias) {
      try {
        // Map Excel columns to database fields
        const nombrePersonal = row.NombrePersonal || row.nombrePersonal || row['Nombre'] || row.Nombre || row.Employee || row.Name || '';
        const fecha = row.Fecha || row.fecha || row.Date || new Date().toISOString().split('T')[0];
        const horaEntrada = row.HoraEntrada || row.horaEntrada || row['Hora Entrada'] || row.Entry || row.CheckIn || null;
        const horaSalida = row.HoraSalida || row.horaSalida || row['Hora Salida'] || row.Exit || row.CheckOut || null;
        const estado = row.Estado || row.estado || row.Status || 'Presente';
        const observaciones = row.Observaciones || row.observaciones || row.Notes || null;
        
        if (!nombrePersonal.trim() || !fecha) {
          skipped++
          continue
        }
        
        // Find personal by name
        let personalId: string | null = null
        const personal = await db.personal.findFirst({
          where: { nombre: { contains: nombrePersonal } }
        })
        if (personal) {
          personalId = personal.id
        } else {
          skipped++
          errors.push(`Personal no encontrado: ${nombrePersonal}`)
          continue
        }
        
        // Check if exists by personalId/date
        const existing = await db.asistencia.findUnique({
          where: {
            personalId_fecha: {
              personalId,
              fecha
            }
          }
        })
        
        if (existing) {
          // Update existing
          await db.asistencia.update({
            where: { id: existing.id },
            data: {
              horaEntrada,
              horaSalida,
              estado,
              observaciones,
            }
          })
          updated++
        } else {
          // Create new
          await db.asistencia.create({
            data: {
              personalId,
              fecha,
              horaEntrada,
              horaSalida,
              estado,
              observaciones,
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
      total: asistencias.length,
      created,
      updated,
      skipped,
      errors
    })
  } catch (error) {
    console.error('Error bulk uploading asistencias:', error)
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
