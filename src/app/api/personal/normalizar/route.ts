import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'

/**
 * ENDPOINT TEMPORAL DE NORMALIZACIÓN DE PERSONAL.
 * Ejecuta las correcciones de datos sucios detectados en Aiven:
 *   - Cargos basura ("a","e","u") -> NULL
 *   - Contrato "Fijo" -> "Plazo Fijo"
 *   - AFP "no está en AFP" -> "ProVida"
 *   - AFPs con mayúsculas inconsistentes -> formato canónico
 *   - Cargos con variantes conocidas -> formato canónico
 *
 * Permisos: solo admin.
 */
export async function POST() {
  const session = await getCurrentSession()
  if (!session) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  if (session.user.rol !== 'admin') {
    return NextResponse.json({ error: 'Solo admin' }, { status: 403 })
  }

  const resultados: Record<string, number> = {}

  try {
    // 1. Limpiar cargos basura
    const r1 = await db.$executeRawUnsafe(
      `UPDATE "Personal" SET cargo = NULL WHERE LOWER(cargo) IN ('a','e','u','x','z','test','prueba','')`
    )
    resultados['cargos_basura_eliminados'] = r1

    // 2. Normalizar contrato "Fijo" -> "Plazo Fijo"
    const r2 = await db.$executeRawUnsafe(
      `UPDATE "Personal" SET contrato = 'Plazo Fijo' WHERE contrato IN ('Fijo', 'fijo', 'PLAZO FIJO')`
    )
    resultados['contratos_corregidos'] = r2

    // 3. AFPs: llevar a formato canónico (ProVida, Cuprum, Habitat, Capital, Planvital, Modelo, Uno)
    const afpUpdates: Array<[string, string]> = [
      [`UPDATE "Personal" SET afp = 'Planvital' WHERE LOWER(afp) IN ('planvital','plan vital','plan-vital') AND afp != 'Planvital'`, 'afp_planvital'],
      [`UPDATE "Personal" SET afp = 'Habitat' WHERE LOWER(afp) = 'habitat' AND afp != 'Habitat'`, 'afp_habitat'],
      [`UPDATE "Personal" SET afp = 'Capital' WHERE LOWER(afp) = 'capital' AND afp != 'Capital'`, 'afp_capital'],
      [`UPDATE "Personal" SET afp = 'Cuprum' WHERE LOWER(afp) = 'cuprum' AND afp != 'Cuprum'`, 'afp_cuprum'],
      [`UPDATE "Personal" SET afp = 'Modelo' WHERE LOWER(afp) = 'modelo' AND afp != 'Modelo'`, 'afp_modelo'],
      [`UPDATE "Personal" SET afp = 'Uno' WHERE LOWER(afp) = 'uno' AND afp != 'Uno'`, 'afp_uno'],
      [`UPDATE "Personal" SET afp = 'ProVida' WHERE LOWER(afp) = 'provida' AND afp != 'ProVida'`, 'afp_provida'],
      [`UPDATE "Personal" SET afp = 'ProVida' WHERE LOWER(afp) LIKE 'no%est%afp%' OR LOWER(afp) IN ('no','sin afp','none')`, 'afp_invalida_default'],
    ]
    let afpTotal = 0
    for (const [sql, key] of afpUpdates) {
      const r = await db.$executeRawUnsafe(sql)
      resultados[key] = r
      afpTotal += r
    }
    resultados['afp_total_normalizadas'] = afpTotal

    // 4. Normalizar cargos con variantes conocidas
    const cargoUpdates: Array<[string, string]> = [
      [`UPDATE "Personal" SET cargo = 'Conserje' WHERE LOWER(cargo) = 'conserje' AND cargo != 'Conserje'`, 'cargo_conserje'],
      [`UPDATE "Personal" SET cargo = 'Conserje Full Time' WHERE LOWER(cargo) IN ('conserje full time','conserje ft') AND cargo != 'Conserje Full Time'`, 'cargo_conserje_ft'],
      [`UPDATE "Personal" SET cargo = 'Guardia' WHERE LOWER(cargo) = 'guardia' AND cargo != 'Guardia'`, 'cargo_guardia'],
      [`UPDATE "Personal" SET cargo = 'Guardia Full Time' WHERE LOWER(cargo) IN ('guardia full time','guardia ft') AND cargo != 'Guardia Full Time'`, 'cargo_guardia_ft'],
      [`UPDATE "Personal" SET cargo = 'Jardinero' WHERE LOWER(cargo) = 'jardinero' AND cargo != 'Jardinero'`, 'cargo_jardinero'],
      [`UPDATE "Personal" SET cargo = 'Mantenciones' WHERE LOWER(cargo) = 'mantenciones' AND cargo != 'Mantenciones'`, 'cargo_mantenciones'],
      [`UPDATE "Personal" SET cargo = 'Servicios Generales' WHERE LOWER(cargo) = 'servicios generales' AND cargo != 'Servicios Generales'`, 'cargo_serv_generales'],
      [`UPDATE "Personal" SET cargo = 'Operario de Laguna y Piscinas (Lagunero)' WHERE LOWER(cargo) IN ('operario de laguna y piscinas','operario de laguna y piscinas (lagunero)','lagunero') AND cargo != 'Operario de Laguna y Piscinas (Lagunero)'`, 'cargo_lagunero'],
      [`UPDATE "Personal" SET cargo = 'Encargado Control Cámaras' WHERE LOWER(cargo) IN ('encargado control camaras','encargado control cámaras','encargado de camaras','encargado de cámaras') AND cargo != 'Encargado Control Cámaras'`, 'cargo_camaras'],
      [`UPDATE "Personal" SET cargo = 'Jefe de Operaciones' WHERE LOWER(cargo) IN ('jefe de operaciones','jefe operaciones','jefe operacion') AND cargo != 'Jefe de Operaciones'`, 'cargo_jefe_op'],
      [`UPDATE "Personal" SET cargo = 'Supervisor' WHERE LOWER(cargo) = 'supervisor' AND cargo != 'Supervisor'`, 'cargo_supervisor'],
      [`UPDATE "Personal" SET cargo = 'Administrador' WHERE LOWER(cargo) = 'administrador' AND cargo != 'Administrador'`, 'cargo_admin'],
      [`UPDATE "Personal" SET cargo = 'Contador' WHERE LOWER(cargo) = 'contador' AND cargo != 'Contador'`, 'cargo_contador'],
      [`UPDATE "Personal" SET cargo = 'Electricista' WHERE LOWER(cargo) = 'electricista' AND cargo != 'Electricista'`, 'cargo_electricista'],
      [`UPDATE "Personal" SET cargo = 'Plomero' WHERE LOWER(cargo) = 'plomero' AND cargo != 'Plomero'`, 'cargo_plomero'],
      [`UPDATE "Personal" SET cargo = 'Pintor' WHERE LOWER(cargo) = 'pintor' AND cargo != 'Pintor'`, 'cargo_pintor'],
      [`UPDATE "Personal" SET cargo = 'Albañil' WHERE LOWER(cargo) IN ('albanil','albañil') AND cargo != 'Albañil'`, 'cargo_albanil'],
      [`UPDATE "Personal" SET cargo = 'Auxiliar' WHERE LOWER(cargo) = 'auxiliar' AND cargo != 'Auxiliar'`, 'cargo_auxiliar'],
    ]
    let cargoTotal = 0
    for (const [sql, key] of cargoUpdates) {
      const r = await db.$executeRawUnsafe(sql)
      resultados[key] = r
      cargoTotal += r
    }
    resultados['cargo_total_normalizados'] = cargoTotal

    // 5. Reporte final
    const totalPersonal = await db.personal.count()
    const sinRut = await db.personal.count({ where: { OR: [{ rut: null }, { rut: '' }] } })
    const sinSueldo = await db.personal.count({ where: { sueldoBase: 0 } })
    const sinCargo = await db.personal.count({ where: { OR: [{ cargo: null }, { cargo: '' }] } })

    // Lista final de cargos únicos
    const cargosFinales = await db.$queryRawUnsafe<{ cargo: string; total: bigint }[]>(
      `SELECT cargo, COUNT(*)::bigint AS total FROM "Personal" WHERE cargo IS NOT NULL GROUP BY cargo ORDER BY total DESC`
    )
    const afpsFinales = await db.$queryRawUnsafe<{ afp: string; total: bigint }[]>(
      `SELECT afp, COUNT(*)::bigint AS total FROM "Personal" GROUP BY afp ORDER BY total DESC`
    )

    return NextResponse.json({
      success: true,
      cambios: resultados,
      resumen: {
        total_personal: totalPersonal,
        sin_rut: sinRut,
        sin_sueldo: sinSueldo,
        sin_cargo: sinCargo,
        cargos_unicos: cargosFinales.length,
        cargos_lista: cargosFinales.map(c => ({ cargo: c.cargo, total: Number(c.total) })),
        afps_lista: afpsFinales.map(a => ({ afp: a.afp, total: Number(a.total) })),
      },
    })
  } catch (error) {
    console.error('Error en normalización:', error)
    return NextResponse.json(
      { error: 'Error en normalización', detalle: String(error) },
      { status: 500 }
    )
  }
}
