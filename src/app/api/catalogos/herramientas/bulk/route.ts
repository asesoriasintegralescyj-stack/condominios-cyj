import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST - Bulk create herramientas from CSV data
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
    const startIndex = lines[0].toLowerCase().includes('nombre') || lines[0].toLowerCase().includes('codigo') ? 1 : 0

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
          codigo, 
          nombre, 
          marca = '', 
          modelo = '', 
          cantidad = '1', 
          ubicacion = '', 
          estado = 'Bueno', 
          valorReposicion = '0',
          fechaAdquisicion = ''
        ] = values

        if (!nombre || !nombre.trim()) {
          errors.push(`Línea ${i + 1}: Nombre requerido`)
          continue
        }

        // Validate estado
        const estadosValidos = ['Bueno', 'Regular', 'Malo', 'En reparación']
        const estadoFinal = estadosValidos.includes(estado?.trim()) ? estado.trim() : 'Bueno'

        await db.catHerramienta.create({
          data: {
            codigo: codigo?.trim() || null,
            nombre: nombre.trim(),
            marca: marca?.trim() || null,
            modelo: modelo?.trim() || null,
            cantidad: parseInt(cantidad) || 1,
            ubicacion: ubicacion?.trim() || null,
            estado: estadoFinal,
            valorReposicion: parseFloat(valorReposicion) || 0,
            fechaAdquisicion: fechaAdquisicion?.trim() || null,
          }
        })
        success++
      } catch (error) {
        errors.push(`Línea ${i + 1}: Error al procesar`)
      }
    }

    return NextResponse.json({ success, errors })
  } catch (error) {
    console.error('Error bulk creating herramientas:', error)
    return NextResponse.json({ error: 'Error bulk creating herramientas' }, { status: 500 })
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
