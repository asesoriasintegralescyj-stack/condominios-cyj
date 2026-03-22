import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST - Bulk create personal from CSV data
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

        const [
          nombre, 
          rut = '', 
          cargo = '', 
          contrato = 'Indefinido', 
          afp = 'ProVida', 
          salud = 'Fonasa', 
          mutual = 'IST',
          ccaf = '',
          sueldoBase = '0',
          movilizacion = '0',
          colacion = '0',
          estado = 'Activo',
          telefono = '',
          email = ''
        ] = values

        if (!nombre || !nombre.trim()) {
          errors.push(`Línea ${i + 1}: Nombre requerido`)
          continue
        }

        // Validar contrato
        const contratosValidos = ['Indefinido', 'Plazo Fijo', 'Por Obra', 'Part-Time']
        const contratoFinal = contratosValidos.includes(contrato?.trim()) ? contrato.trim() : 'Indefinido'

        // Validar estado
        const estadosValidos = ['Activo', 'Vacaciones', 'Licencia', 'Inactivo']
        const estadoFinal = estadosValidos.includes(estado?.trim()) ? estado.trim() : 'Activo'

        // Check if already exists by RUT
        if (rut && rut.trim()) {
          const existing = await db.personal.findFirst({
            where: { rut: rut.trim() }
          })
          if (existing) {
            // Update existing
            await db.personal.update({
              where: { id: existing.id },
              data: {
                nombre: nombre.trim(),
                cargo: cargo?.trim() || null,
                contrato: contratoFinal,
                afp: afp?.trim() || 'ProVida',
                salud: salud?.trim() || 'Fonasa',
                mutual: mutual?.trim() || 'IST',
                ccaf: ccaf?.trim() || null,
                sueldoBase: parseFloat(sueldoBase) || 0,
                movilizacion: parseFloat(movilizacion) || 0,
                colacion: parseFloat(colacion) || 0,
                estado: estadoFinal,
                telefono: telefono?.trim() || null,
                email: email?.trim() || null,
              }
            })
            success++
            continue
          }
        }

        await db.personal.create({
          data: {
            nombre: nombre.trim(),
            rut: rut?.trim() || null,
            cargo: cargo?.trim() || null,
            contrato: contratoFinal,
            afp: afp?.trim() || 'ProVida',
            salud: salud?.trim() || 'Fonasa',
            mutual: mutual?.trim() || 'IST',
            ccaf: ccaf?.trim() || null,
            sueldoBase: parseFloat(sueldoBase) || 0,
            movilizacion: parseFloat(movilizacion) || 0,
            colacion: parseFloat(colacion) || 0,
            estado: estadoFinal,
            telefono: telefono?.trim() || null,
            email: email?.trim() || null,
          }
        })
        success++
      } catch (error) {
        errors.push(`Línea ${i + 1}: Error al procesar`)
      }
    }

    return NextResponse.json({ success, errors })
  } catch (error) {
    console.error('Error bulk creating personal:', error)
    return NextResponse.json({ error: 'Error bulk creating personal' }, { status: 500 })
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
