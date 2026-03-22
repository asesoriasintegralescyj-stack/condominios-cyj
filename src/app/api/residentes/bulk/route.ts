import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST - Bulk create residentes from CSV data
export async function POST(request: NextRequest) {
  try {
    const { data } = await request.json()
    
    if (!data || typeof data !== 'string') {
      return NextResponse.json({ error: 'No data provided' }, { status: 400 })
    }

    // Parse CSV data
    const lines = data.trim().split('\n')
    const errors: string[] = []
    let success = 0

    // Skip header if present
    const startIndex = lines[0].toLowerCase().includes('nombre') ? 1 : 0

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      try {
        // Parse CSV line - handle quoted values
        const values = parseCSVLine(line)
        
        if (values.length < 1) {
          errors.push(`Línea ${i + 1}: Datos insuficientes`)
          continue
        }

        const [nombre, apellido = '', rut = '', unidad = '', etapa = '', tipo = 'Residente', telefono = '', email = '', estado = 'Activo'] = values

        if (!nombre || !nombre.trim()) {
          errors.push(`Línea ${i + 1}: Nombre requerido`)
          continue
        }

        // Validar tipo
        const tiposValidos = ['Residente', 'Propietario', 'Arrendatario', 'Visita']
        const tipoFinal = tiposValidos.includes(tipo?.trim()) ? tipo.trim() : 'Residente'

        // Validar estado
        const estadosValidos = ['Activo', 'Moroso', 'Vacaciones', 'Licencia', 'Inactivo']
        const estadoFinal = estadosValidos.includes(estado?.trim()) ? estado.trim() : 'Activo'

        // Check if already exists by RUT
        if (rut && rut.trim()) {
          const existing = await db.residente.findFirst({
            where: { rut: rut.trim() }
          })
          if (existing) {
            // Update existing
            await db.residente.update({
              where: { id: existing.id },
              data: {
                nombre: nombre.trim(),
                apellido: apellido?.trim() || null,
                unidad: unidad?.trim() || null,
                etapa: etapa?.trim() || null,
                tipo: tipoFinal,
                telefono: telefono?.trim() || null,
                email: email?.trim() || null,
                estado: estadoFinal,
              }
            })
            success++
            continue
          }
        }

        await db.residente.create({
          data: {
            nombre: nombre.trim(),
            apellido: apellido?.trim() || null,
            rut: rut?.trim() || null,
            unidad: unidad?.trim() || null,
            etapa: etapa?.trim() || null,
            tipo: tipoFinal,
            telefono: telefono?.trim() || null,
            email: email?.trim() || null,
            estado: estadoFinal,
          }
        })
        success++
      } catch (error) {
        errors.push(`Línea ${i + 1}: Error al procesar`)
      }
    }

    return NextResponse.json({ success, errors })
  } catch (error) {
    console.error('Error bulk creating residentes:', error)
    return NextResponse.json({ error: 'Error bulk creating residentes' }, { status: 500 })
  }
}

// Helper function to parse CSV line with quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  
  return result
}
