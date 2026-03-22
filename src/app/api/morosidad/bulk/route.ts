import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import * as XLSX from 'xlsx'

interface BulkUploadRow {
  Unidad: string
  Residente: string
  Periodo: string
  Monto: number
  'Fecha Vencimiento': string
  Estado: string
  _rowNum: number
  _error?: string
}

// Valid estados
const validEstados = ['Al día', 'En mora', 'Convenio', 'Juicio']

// PUT - Parse and validate Excel file
export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ errors: ['No se encontró archivo'] }, { status: 400 })
    }

    // Read file
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    
    // Get first sheet
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      return NextResponse.json({ errors: ['El archivo no contiene hojas'] }, { status: 400 })
    }

    const sheet = workbook.Sheets[sheetName]
    
    // Convert to JSON
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][]
    
    if (rawData.length < 2) {
      return NextResponse.json({ errors: ['El archivo no contiene datos'] }, { status: 400 })
    }

    // Get headers (first row)
    const headers = rawData[0] as string[]
    
    // Expected columns
    const expectedColumns = ['Unidad', 'Residente', 'Periodo', 'Monto', 'Fecha Vencimiento', 'Estado']
    
    // Find column indices
    const columnIndices: Record<string, number> = {}
    expectedColumns.forEach(col => {
      const idx = headers.findIndex(h => 
        h?.toString().toLowerCase().trim() === col.toLowerCase().trim()
      )
      if (idx !== -1) {
        columnIndices[col] = idx
      }
    })

    // Check if all required columns exist
    const missingColumns = expectedColumns.filter(col => columnIndices[col] === undefined)
    if (missingColumns.length > 0) {
      return NextResponse.json({ 
        errors: [`Faltan columnas requeridas: ${missingColumns.join(', ')}`] 
      }, { status: 400 })
    }

    // Parse data rows
    const data: BulkUploadRow[] = []
    const errors: string[] = []

    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i] as unknown[]
      if (!row || row.every(cell => cell === undefined || cell === '')) continue // Skip empty rows

      const rowNum = i + 1
      
      const getValue = (colName: string): string | number | undefined => {
        const idx = columnIndices[colName]
        return idx !== undefined ? row[idx]?.toString() : undefined
      }

      const unidad = getValue('Unidad')?.toString().trim() || ''
      const residente = getValue('Residente')?.toString().trim() || ''
      const periodo = getValue('Periodo')?.toString().trim() || ''
      const montoStr = getValue('Monto')?.toString().trim() || ''
      const fechaVencimiento = getValue('Fecha Vencimiento')?.toString().trim() || ''
      const estado = getValue('Estado')?.toString().trim() || ''

      // Validate required fields
      const rowErrors: string[] = []
      
      if (!unidad) rowErrors.push('Unidad es requerida')
      if (!residente) rowErrors.push('Residente es requerido')
      if (!periodo) rowErrors.push('Periodo es requerido')
      if (!montoStr) rowErrors.push('Monto es requerido')
      if (!fechaVencimiento) rowErrors.push('Fecha Vencimiento es requerida')
      if (!estado) rowErrors.push('Estado es requerido')

      // Validate monto is a number
      const monto = parseFloat(montoStr.replace(/[^0-9.-]/g, ''))
      if (isNaN(monto)) {
        rowErrors.push('Monto debe ser un número válido')
      }

      // Validate estado
      if (estado && !validEstados.includes(estado)) {
        rowErrors.push(`Estado debe ser uno de: ${validEstados.join(', ')}`)
      }

      // Validate fecha vencimiento format
      if (fechaVencimiento) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/
        if (!dateRegex.test(fechaVencimiento)) {
          // Try to parse Excel date
          const excelDate = XLSX.SSF.parse_date_code(parseFloat(fechaVencimiento))
          if (excelDate) {
            const formatted = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`
            // Will use formatted date
          } else {
            rowErrors.push('Fecha Vencimiento debe tener formato YYYY-MM-DD')
          }
        }
      }

      // Validate periodo format
      if (periodo && !/^\d{4}-\d{2}$/.test(periodo)) {
        rowErrors.push('Periodo debe tener formato YYYY-MM')
      }

      if (rowErrors.length > 0) {
        errors.push(`Fila ${rowNum}: ${rowErrors.join(', ')}`)
        continue
      }

      // Format fecha vencimiento if it's an Excel date
      let formattedFecha = fechaVencimiento
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaVencimiento)) {
        const excelDateNum = parseFloat(fechaVencimiento)
        if (!isNaN(excelDateNum)) {
          const excelDate = XLSX.SSF.parse_date_code(excelDateNum)
          if (excelDate) {
            formattedFecha = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`
          }
        }
      }

      data.push({
        Unidad: unidad,
        Residente: residente,
        Periodo: periodo,
        Monto: monto,
        'Fecha Vencimiento': formattedFecha,
        Estado: estado,
        _rowNum: rowNum
      })
    }

    if (data.length === 0 && errors.length === 0) {
      errors.push('El archivo no contiene datos válidos')
    }

    return NextResponse.json({
      data,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Error processing file:', error)
    return NextResponse.json({ 
      errors: ['Error al procesar el archivo. Verifique el formato.'] 
    }, { status: 500 })
  }
}

// POST - Save bulk data to database
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { data } = body as { data: BulkUploadRow[] }

    if (!data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ errors: ['No hay datos para guardar'] }, { status: 400 })
    }

    const errors: string[] = []
    let successCount = 0

    // Get or create a default condominio
    let condominio = await db.condominio.findFirst()
    if (!condominio) {
      condominio = await db.condominio.create({
        data: {
          nombre: 'Condominio Default',
          direccion: 'Sin dirección',
        }
      })
    }

    // Process each row
    for (const row of data) {
      try {
        // Find or create residente by unidad
        let residente = await db.residente.findFirst({
          where: { unidad: row.Unidad }
        })

        if (!residente) {
          // Parse nombre and apellido
          const nombreParts = row.Residente.split(' ')
          const nombre = nombreParts[0] || row.Residente
          const apellido = nombreParts.slice(1).join(' ') || undefined

          residente = await db.residente.create({
            data: {
              nombre,
              apellido,
              unidad: row.Unidad,
              estado: row.Estado === 'Al día' ? 'Activo' : 'Moroso',
              condominioId: condominio.id
            }
          })
        }

        // Find or create GastoComun for the period
        let gastoComun = await db.gastoComun.findFirst({
          where: { 
            periodo: row.Periodo,
            condominioId: condominio.id
          }
        })

        if (!gastoComun) {
          gastoComun = await db.gastoComun.create({
            data: {
              periodo: row.Periodo,
              fechaEmision: row['Fecha Vencimiento'],
              fechaVencimiento: row['Fecha Vencimiento'],
              montoPorUnidad: row.Monto,
              totalGastos: row.Monto,
              totalCobrar: row.Monto,
              estado: 'Pendiente',
              condominioId: condominio.id
            }
          })
        }

        // Create PagoGastoComun (debt record)
        await db.pagoGastoComun.create({
          data: {
            monto: 0, // 0 means no payment made, so it's a debt
            fechaPago: new Date().toISOString().split('T')[0],
            metodo: 'Pendiente',
            estado: 'Pendiente',
            residenteId: residente.id,
            gastoComunId: gastoComun.id,
            notas: `Importado desde carga masiva - Estado: ${row.Estado}`
          }
        })

        successCount++

      } catch (rowError) {
        console.error(`Error processing row ${row._rowNum}:`, rowError)
        errors.push(`Fila ${row._rowNum}: Error al guardar en base de datos`)
      }
    }

    if (successCount === 0) {
      return NextResponse.json({ 
        success: false,
        errors: errors.length > 0 ? errors : ['No se pudo guardar ningún registro'] 
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: `Se importaron ${successCount} registros correctamente`,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Error saving bulk data:', error)
    return NextResponse.json({ 
      success: false,
      errors: ['Error al guardar los datos'] 
    }, { status: 500 })
  }
}
