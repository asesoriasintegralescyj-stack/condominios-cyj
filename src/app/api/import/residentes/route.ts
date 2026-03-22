import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

interface ResidenteRow {
  Nombre: string;
  Apellidos: string;
  RUT: string;
  Casa_Depto: string;
  Etapa: string;
  Telefono: string;
  Tipo_Residente: string;
  Vehículos: string | null;
}

// Función para convertir tipo de residente
function mapTipoResidente(tipo: string): string {
  const tipoMap: Record<string, string> = {
    'Propietario': 'Propietario',
    'Arrendatario': 'Arrendatario',
    'Residente': 'Residente',
    'Visita': 'Visita',
  };
  return tipoMap[tipo] || 'Residente';
}

// Función para formatear RUT
function formatRUT(rut: string): string {
  if (!rut) return '';
  // Limpiar el RUT
  const cleanRut = rut.replace(/\./g, '').replace(/-/g, '');
  if (cleanRut.length < 2) return rut;
  
  // Formatear como XX.XXX.XXX-X
  const body = cleanRut.slice(0, -1);
  const dv = cleanRut.slice(-1).toUpperCase();
  
  let formatted = '';
  for (let i = body.length - 1, j = 0; i >= 0; i--, j++) {
    if (j > 0 && j % 3 === 0) {
      formatted = '.' + formatted;
    }
    formatted = body[i] + formatted;
  }
  
  return `${formatted}-${dv}`;
}

// Función para formatear teléfono
function formatPhone(phone: string): string {
  if (!phone) return '';
  // Si ya tiene el formato +56, devolverlo
  if (phone.startsWith('+56')) return phone;
  // Si empieza con 9, agregar +56
  if (phone.startsWith('9') && phone.length === 9) {
    return `+56${phone}`;
  }
  // Si empieza con 56, agregar +
  if (phone.startsWith('56')) {
    return `+${phone}`;
  }
  return phone;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { residentes } = body as { residentes: ResidenteRow[] };

    if (!residentes || !Array.isArray(residentes)) {
      return NextResponse.json(
        { error: 'Se requiere un array de residentes' },
        { status: 400 }
      );
    }

    let creados = 0;
    let actualizados = 0;
    let errores = 0;

    for (const row of residentes) {
      try {
        // Validar que tenga nombre
        if (!row.Nombre || !row.Nombre.trim()) {
          errores++;
          continue;
        }

        // Preparar datos
        const nombreCompleto = `${row.Nombre} ${row.Apellidos || ''}`.trim();
        const rut = formatRUT(row.RUT || '');
        const unidad = row.Casa_Depto || '';
        const etapa = row.Etapa || '';
        const telefono = formatPhone(row.Telefono || '');
        const tipo = mapTipoResidente(row.Tipo_Residente || 'Residente');
        const vehiculos = row.Vehículos || null;

        // Verificar si ya existe por RUT
        if (rut) {
          const existente = await db.residente.findFirst({
            where: { rut }
          });

          if (existente) {
            // Actualizar
            await db.residente.update({
              where: { id: existente.id },
              data: {
                nombre: nombreCompleto,
                apellido: row.Apellidos || null,
                unidad,
                etapa,
                telefono,
                tipo,
                vehiculos,
              }
            });
            actualizados++;
            continue;
          }
        }

        // Crear nuevo
        await db.residente.create({
          data: {
            nombre: nombreCompleto,
            apellido: row.Apellidos || null,
            rut: rut || null,
            unidad,
            etapa,
            telefono: telefono || null,
            tipo,
            vehiculos,
            estado: 'Activo',
          }
        });
        creados++;

      } catch (error) {
        console.error('Error procesando residente:', error);
        errores++;
      }
    }

    return NextResponse.json({
      success: true,
      mensaje: `Importación completada: ${creados} creados, ${actualizados} actualizados, ${errores} errores`,
      estadisticas: {
        total: residentes.length,
        creados,
        actualizados,
        errores
      }
    });

  } catch (error) {
    console.error('Error en importación:', error);
    return NextResponse.json(
      { error: 'Error al procesar la importación' },
      { status: 500 }
    );
  }
}
