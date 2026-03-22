import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST - Bulk create tareas from CSV data
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

        const [nombre, categoria = 'General'] = values

        if (!nombre || !nombre.trim()) {
          errors.push(`Línea ${i + 1}: Nombre requerido`)
          continue
        }

        await db.catTarea.create({
          data: {
            nombre: nombre.trim(),
            categoria: categoria?.trim() || 'General',
          }
        })
        success++
      } catch (error) {
        errors.push(`Línea ${i + 1}: Error al procesar`)
      }
    }

    return NextResponse.json({ success, errors })
  } catch (error) {
    console.error('Error bulk creating tareas:', error)
    return NextResponse.json({ error: 'Error bulk creating tareas' }, { status: 500 })
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
