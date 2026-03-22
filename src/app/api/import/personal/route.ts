import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Mapeo de columnas del Excel a campos del modelo
const fieldMapping: Record<string, string> = {
  'Nombre': 'nombre',
  'nombre': 'nombre',
  'NOMBRE': 'nombre',
  'RUT': 'rut',
  'rut': 'rut',
  'Rut': 'rut',
  'Cargo': 'cargo',
  'cargo': 'cargo',
  'CARGO': 'cargo',
  'Contrato': 'contrato',
  'contrato': 'contrato',
  'CONTRATO': 'contrato',
  'AFP': 'afp',
  'afp': 'afp',
  'Salud': 'salud',
  'salud': 'salud',
  'SALUD': 'salud',
  'Prevision': 'salud',
  'Mutual': 'mutual',
  'mutual': 'mutual',
  'MUTUAL': 'mutual',
  'CCAF': 'ccaf',
  'ccaf': 'ccaf',
  'Caja': 'ccaf',
  'Fecha Ingreso': 'fechaIngreso',
  'FechaIngreso': 'fechaIngreso',
  'fecha_ingreso': 'fechaIngreso',
  'Sueldo': 'sueldoBase',
  'sueldo': 'sueldoBase',
  'SUELDO': 'sueldoBase',
  'Sueldo Base': 'sueldoBase',
  'Movilización': 'movilizacion',
  'Movilizacion': 'movilizacion',
  'movilizacion': 'movilizacion',
  'Colación': 'colacion',
  'Colacion': 'colacion',
  'colacion': 'colacion',
  'Viático': 'viatico',
  'Viatico': 'viatico',
  'viatico': 'viatico',
  'Asignación Familiar': 'asigFamiliar',
  'AsigFamiliar': 'asigFamiliar',
  'Estado': 'estado',
  'estado': 'estado',
  'ESTADO': 'estado',
  'Email': 'email',
  'email': 'email',
  'E-mail': 'email',
  'Teléfono': 'telefono',
  'Telefono': 'telefono',
  'telefono': 'telefono',
  'Fono': 'telefono',
  'Notas': 'notas',
  'notas': 'notas',
  'Observaciones': 'notas',
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { personal } = body

    if (!Array.isArray(personal) || personal.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No hay datos para importar' 
      }, { status: 400 })
    }

    let importados = 0
    let actualizados = 0
    let errores = 0

    for (const row of personal) {
      try {
        // Mapear campos del Excel al modelo
        const data: Record<string, unknown> = {}
        
        for (const [excelCol, value] of Object.entries(row)) {
          const fieldName = fieldMapping[excelCol]
          if (fieldName && value !== undefined && value !== null && value !== '') {
            data[fieldName] = value
          }
        }

        // Validar que tenga nombre
        if (!data.nombre) {
          errores++
          continue
        }

        // Convertir valores numéricos
        if (data.sueldoBase) data.sueldoBase = parseFloat(String(data.sueldoBase)) || 0
        if (data.movilizacion) data.movilizacion = parseFloat(String(data.movilizacion)) || 0
        if (data.colacion) data.colacion = parseFloat(String(data.colacion)) || 0
        if (data.viatico) data.viatico = parseFloat(String(data.viatico)) || 0
        if (data.asigFamiliar) data.asigFamiliar = parseFloat(String(data.asigFamiliar)) || 0

        // Valores por defecto
        if (!data.contrato) data.contrato = 'Indefinido'
        if (!data.afp) data.afp = 'ProVida'
        if (!data.salud) data.salud = 'Fonasa'
        if (!data.mutual) data.mutual = 'IST'
        if (!data.estado) data.estado = 'Activo'

        // Verificar si ya existe por RUT
        if (data.rut) {
          const existente = await db.personal.findFirst({
            where: { rut: String(data.rut) }
          })

          if (existente) {
            // Actualizar
            await db.personal.update({
              where: { id: existente.id },
              data: {
                nombre: String(data.nombre),
                rut: data.rut ? String(data.rut) : null,
                cargo: data.cargo ? String(data.cargo) : null,
                contrato: String(data.contrato),
                afp: String(data.afp),
                salud: String(data.salud),
                mutual: String(data.mutual),
                ccaf: data.ccaf ? String(data.ccaf) : null,
                fechaIngreso: data.fechaIngreso ? String(data.fechaIngreso) : null,
                sueldoBase: Number(data.sueldoBase) || 0,
                movilizacion: Number(data.movilizacion) || 0,
                colacion: Number(data.colacion) || 0,
                viatico: Number(data.viatico) || 0,
                asigFamiliar: Number(data.asigFamiliar) || 0,
                estado: String(data.estado),
                email: data.email ? String(data.email) : null,
                telefono: data.telefono ? String(data.telefono) : null,
                notas: data.notas ? String(data.notas) : null,
                updatedAt: new Date()
              }
            })
            actualizados++
            continue
          }
        }

        // Crear nuevo
        await db.personal.create({
          data: {
            nombre: String(data.nombre),
            rut: data.rut ? String(data.rut) : null,
            cargo: data.cargo ? String(data.cargo) : null,
            contrato: String(data.contrato),
            afp: String(data.afp),
            salud: String(data.salud),
            mutual: String(data.mutual),
            ccaf: data.ccaf ? String(data.ccaf) : null,
            fechaIngreso: data.fechaIngreso ? String(data.fechaIngreso) : null,
            sueldoBase: Number(data.sueldoBase) || 0,
            movilizacion: Number(data.movilizacion) || 0,
            colacion: Number(data.colacion) || 0,
            viatico: Number(data.viatico) || 0,
            asigFamiliar: Number(data.asigFamiliar) || 0,
            estado: String(data.estado),
            email: data.email ? String(data.email) : null,
            telefono: data.telefono ? String(data.telefono) : null,
            notas: data.notas ? String(data.notas) : null,
          }
        })
        importados++

      } catch (error) {
        console.error('Error importando fila:', error)
        errores++
      }
    }

    return NextResponse.json({
      success: true,
      mensaje: `Importación completada: ${importados} nuevos, ${actualizados} actualizados, ${errores} errores`
    })

  } catch (error) {
    console.error('Error en importación:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Error al procesar la importación' 
    }, { status: 500 })
  }
}
