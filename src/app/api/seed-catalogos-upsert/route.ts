import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

// Upsert de centros de costo y herramientas nuevos (sin borrar existentes)
// Solo accesible para admins

export async function POST(req: NextRequest) {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)
  if (session.user.rol !== 'admin') return apiError('Sin permisos', 403)

  const resultados = {
    centrosCreados: 0,
    centrosActualizados: 0,
    herramientasCreadas: 0,
    herramientasActualizadas: 0,
    errores: 0,
  }

  // ===== CENTROS DE COSTO (upsert por codigo) =====
  const centros = [
    { codigo: 'CC-ADM-01', nombre: 'Administración y Gastos Generales', descripcion: 'Oficina, insumos de oficina, fotocopias, gastos bancarios, asesorías legales/contables.', responsable: 'Administrador', tipoGasto: 'Fijo', presupuestoMens: 500000, presupuestoAnual: 6000000 },
    { codigo: 'CC-SEG-01', nombre: 'Seguridad y Vigilancia', descripcion: 'Contrato de vigilancia, mantención de cámaras, cercos eléctricos, alarmas, portones automáticos.', responsable: 'Administrador / Jefe de Seguridad', tipoGasto: 'Contrato', presupuestoMens: 1200000, presupuestoAnual: 14400000 },
    { codigo: 'CC-ASC-01', nombre: 'Ascensores y Montacargas', descripcion: 'Mantención preventiva, correctiva, repuestos, certificaciones anuales.', responsable: 'Administrador / Técnico', tipoGasto: 'Contrato', presupuestoMens: 400000, presupuestoAnual: 4800000 },
    { codigo: 'CC-HID-01', nombre: 'Agua Potable y Alcantarillado', descripcion: 'Cuentas de agua, mantenciones de bombas, estanques, matrices, cámaras.', responsable: 'Administrador / Mantención', tipoGasto: 'Variable', presupuestoMens: 350000, presupuestoAnual: 4200000 },
    { codigo: 'CC-ELEC-01', nombre: 'Electricidad y Alumbrado', descripcion: 'Cuentas de luz, mantenciones de tableros, grupos electrógenos, iluminación áreas comunes.', responsable: 'Administrador / Electricista', tipoGasto: 'Variable', presupuestoMens: 800000, presupuestoAnual: 9600000 },
    { codigo: 'CC-GAS-01', nombre: 'Gas y Climatización', descripcion: 'Cuentas de gas, mantenciones de calderas, calefones, aire acondicionado, extractores.', responsable: 'Administrador / Gasfíter', tipoGasto: 'Variable', presupuestoMens: 300000, presupuestoAnual: 3600000 },
    { codigo: 'CC-ARV-01', nombre: 'Áreas Verdes y Jardines', descripcion: 'Jardineros, insumos (tierra, plantas, fertilizantes), sistema de riego, podas profesionales.', responsable: 'Administrador / Jardinero', tipoGasto: 'Variable', presupuestoMens: 200000, presupuestoAnual: 2400000 },
    { codigo: 'CC-PIS-01', nombre: 'Piscina y Espejos de Agua', descripcion: 'Insumos químicos (cloro, pH), mantenciones de bombas y filtros, limpieza profunda.', responsable: 'Administrador / Mantención', tipoGasto: 'Estacional', presupuestoMens: 150000, presupuestoAnual: 1800000 },
    { codigo: 'CC-GIM-01', nombre: 'Gimnasio y Salones Deportivos', descripcion: 'Mantención de máquinas, reparaciones, pintura, equipos de audio.', responsable: 'Administrador', tipoGasto: 'Variable', presupuestoMens: 100000, presupuestoAnual: 1200000 },
    { codigo: 'CC-INF-01', nombre: 'Infraestructura y Obras Menores', descripcion: 'Pintura de fachadas, reparaciones de losas, canaletas, techos, puertas, ventanas.', responsable: 'Administrador / Inspector Técnico', tipoGasto: 'Variable', presupuestoMens: 300000, presupuestoAnual: 3600000 },
    { codigo: 'CC-ASE-01', nombre: 'Aseo y Ornato', descripcion: 'Insumos de aseo (trapo, detergente, bolsas, papel higiénico), personal de aseo.', responsable: 'Administrador / Supervisor de Aseo', tipoGasto: 'Variable', presupuestoMens: 250000, presupuestoAnual: 3000000 },
    { codigo: 'CC-PRO-01', nombre: 'Provisiones y Fondo de Reserva', descripcion: 'Ahorro para mantenciones mayores y reparaciones futuras (por Ley).', responsable: 'Administrador / Tesorero', tipoGasto: 'Fondo de Reserva', presupuestoMens: 500000, presupuestoAnual: 6000000 },
    // Nuevos
    { codigo: 'CC-LAG-01', nombre: 'Laguna Artificial y Playas', descripcion: 'Mantención laguna artificial, playas, muelles, embarcadero, bombas de agua, tratamientos químicos, rastrillado de arena.', responsable: 'Operario de Laguna / Jefe de Mantenimiento', tipoGasto: 'Variable', presupuestoMens: 400000, presupuestoAnual: 4800000 },
    { codigo: 'CC-CH-01', nombre: 'Club House y Quinchos', descripcion: 'Mantención Club House, salón de eventos, cocina, baños, quinchos, parrillas, mobiliario común.', responsable: 'Administrador / Auxiliar de Aseo', tipoGasto: 'Variable', presupuestoMens: 350000, presupuestoAnual: 4200000 },
    { codigo: 'CC-CAN-01', nombre: 'Canchas Deportivas', descripcion: 'Mantención multicancha, cancha de pasto sintético, arcos, mallas, iluminación deportiva, demarcación.', responsable: 'Administrador / Personal de Mantención', tipoGasto: 'Variable', presupuestoMens: 200000, presupuestoAnual: 2400000 },
    { codigo: 'CC-CIC-01', nombre: 'Ciclovía y Senderos Peatonales', descripcion: 'Mantención de ciclovía, senderos peatonales, demarcación, limpieza, reparación de pavimento.', responsable: 'Auxiliar de Servicios Generales', tipoGasto: 'Variable', presupuestoMens: 150000, presupuestoAnual: 1800000 },
    { codigo: 'CC-JUE-01', nombre: 'Juegos Infantiles', descripcion: 'Inspección y mantención de juegos infantiles, certificación NCh 2926, reposición de partes, limpieza de arena.', responsable: 'Jefe de Mantenimiento', tipoGasto: 'Variable', presupuestoMens: 150000, presupuestoAnual: 1800000 },
    { codigo: 'CC-EST-01', nombre: 'Estacionamientos y Accesos', descripcion: 'Mantención de estacionamientos, barreras de acceso, demarcación, iluminación, drenajes.', responsable: 'Personal de Mantención', tipoGasto: 'Variable', presupuestoMens: 150000, presupuestoAnual: 1800000 },
    { codigo: 'CC-WELL-01', nombre: 'Wellness (Jacuzzi, Sauna, Spa)', descripcion: 'Mantención de jacuzzi, sauna, sala de máquinas asociada, tratamiento de agua, calderas, resistencias.', responsable: 'Operario de Piscinas / Técnico', tipoGasto: 'Variable', presupuestoMens: 200000, presupuestoAnual: 2400000 },
    { codigo: 'CC-SEG-AC-01', nombre: 'Seguridad Acuática y Rescate', descripcion: 'Equipos de rescate acuático, aros salvavidas, boyas, señalética de seguridad acuática, capacitación.', responsable: 'Jefe de Mantenimiento / Conserje', tipoGasto: 'Variable', presupuestoMens: 100000, presupuestoAnual: 1200000 },
    { codigo: 'CC-BOD-01', nombre: 'Bodega y Herramientas', descripcion: 'Herramientas, equipos menores, insumos de bodega, mantención de equipos de jardinería y construcción.', responsable: 'Jefe de Mantenimiento', tipoGasto: 'Variable', presupuestoMens: 200000, presupuestoAnual: 2400000 },
    { codigo: 'CC-COM-01', nombre: 'Comunicaciones y Sistemas', descripcion: 'Internet, sistema de gestión, sitios web, software, licencias, equipos de computación.', responsable: 'Administrador', tipoGasto: 'Fijo', presupuestoMens: 150000, presupuestoAnual: 1800000 },
    { codigo: 'CC-BOM-01', nombre: 'Bombas y Sala de Máquinas', descripcion: 'Mantención de bombas de agua, estanques, sala de máquinas, sistemas de presurización, grupos electrógenos.', responsable: 'Técnico en Maquinarias', tipoGasto: 'Contrato', presupuestoMens: 250000, presupuestoAnual: 3000000 },
  ]

  // Mapa de centros por codigo para lookup rápido
  const centrosMap = new Map(centros.map(c => [c.codigo, c]))

  for (const cc of centros) {
    try {
      const existente = await db.centroCostoMaster.findUnique({ where: { codigo: cc.codigo } })
      if (existente) {
        await db.centroCostoMaster.update({
          where: { codigo: cc.codigo },
          data: {
            nombre: cc.nombre,
            descripcion: cc.descripcion,
            responsable: cc.responsable,
            tipoGasto: cc.tipoGasto,
            presupuestoMens: cc.presupuestoMens,
            presupuestoAnual: cc.presupuestoAnual,
          },
        })
        resultados.centrosActualizados++
      } else {
        await db.centroCostoMaster.create({ data: { ...cc } })
        resultados.centrosCreados++
      }
    } catch (e) {
      console.error(`Error centro ${cc.codigo}:`, e)
      resultados.errores++
    }
  }

  // ===== HERRAMIENTAS (upsert por codigo) =====
  const herramientas = [
    { codigo: 'HERR-100', nombre: 'Sierra circular c/disco (40s)', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativo', valorReposicion: 80000, centroCostoCodigo: 'CC-BOD-01' },
    { codigo: 'HERR-101', nombre: 'Compresor completo', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Falta Mantención', valorReposicion: 150000, centroCostoCodigo: 'CC-BOD-01' },
    { codigo: 'HERR-102', nombre: 'Demoledor c/2 cuñas paleta (10 kg.) punta', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativo', valorReposicion: 120000, centroCostoCodigo: 'CC-BOD-01' },
    { codigo: 'HERR-103', nombre: 'Hollador c/3 brocas', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativo', valorReposicion: 45000, centroCostoCodigo: 'CC-BOD-01' },
    { codigo: 'HERR-104', nombre: 'Taladro inalámbrico', marca: 'Heinkell', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativo', valorReposicion: 60000, centroCostoCodigo: 'CC-BOD-01' },
    { codigo: 'HERR-105', nombre: 'Roto martillo', marca: 'Heinkell', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Malo', valorReposicion: 90000, centroCostoCodigo: 'CC-BOD-01' },
    { codigo: 'HERR-106', nombre: 'Destornillador inalámbrico', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativo', valorReposicion: 35000, centroCostoCodigo: 'CC-BOD-01' },
    { codigo: 'HERR-107', nombre: 'Cautín', marca: 'Ima Lábrico / Heinkel', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativo', valorReposicion: 25000, centroCostoCodigo: 'CC-BOD-01' },
    { codigo: 'HERR-108', nombre: 'Soldadora', marca: 'Indura', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Mala', valorReposicion: 180000, centroCostoCodigo: 'CC-BOD-01' },
    { codigo: 'HERR-109', nombre: 'Sopladora', marca: 'Hezola / Stihl', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Operativo', valorReposicion: 120000, centroCostoCodigo: 'CC-ARV-01' },
    { codigo: 'HERR-110', nombre: 'Fumigadora', marca: 'N/A', cantidad: 2, ubicacion: 'Bodega Jardinería', estado: 'Operativo', valorReposicion: 45000, centroCostoCodigo: 'CC-ARV-01' },
    { codigo: 'HERR-111', nombre: 'Escalera Telescópica Rojo', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativa', valorReposicion: 70000, centroCostoCodigo: 'CC-INF-01' },
    { codigo: 'HERR-112', nombre: 'Escalera Mecano', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativa', valorReposicion: 55000, centroCostoCodigo: 'CC-INF-01' },
    { codigo: 'HERR-113', nombre: 'Carro Arrastrar (con ruedas)', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativo', valorReposicion: 40000, centroCostoCodigo: 'CC-BOD-01' },
    { codigo: 'HERR-114', nombre: 'Chipeadora', marca: 'Benima', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Operativa (sin uso)', valorReposicion: 350000, centroCostoCodigo: 'CC-ARV-01' },
    { codigo: 'HERR-115', nombre: 'Tijeras cortar pasto (lote)', marca: 'N/A', cantidad: 7, ubicacion: 'Bodega Jardinería', estado: 'Mal estado', valorReposicion: 8000, centroCostoCodigo: 'CC-ARV-01' },
    { codigo: 'HERR-116', nombre: 'Tijeras cortar pasto (individual)', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Operativa', valorReposicion: 8000, centroCostoCodigo: 'CC-ARV-01' },
    { codigo: 'HERR-117', nombre: 'Tijerón', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Operativo', valorReposicion: 15000, centroCostoCodigo: 'CC-ARV-01' },
    { codigo: 'HERR-118', nombre: 'Huincha de medir (100 mts.)', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativa', valorReposicion: 12000, centroCostoCodigo: 'CC-BOD-01' },
    { codigo: 'HERR-119', nombre: 'Soplete manual (Gas)', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativo', valorReposicion: 18000, centroCostoCodigo: 'CC-BOD-01' },
    { codigo: 'HERR-120', nombre: 'Arnés orilladora', marca: 'N/A', cantidad: 3, ubicacion: 'Bodega Jardinería', estado: 'Operativos', valorReposicion: 15000, centroCostoCodigo: 'CC-ARV-01' },
    { codigo: 'HERR-121', nombre: 'Horquetas', marca: 'N/A', cantidad: 3, ubicacion: 'Bodega Jardinería', estado: 'Operativas', valorReposicion: 10000, centroCostoCodigo: 'CC-ARV-01' },
    { codigo: 'HERR-122', nombre: 'Palas (lote)', marca: 'N/A', cantidad: 8, ubicacion: 'Bodega Jardinería', estado: 'Operativas', valorReposicion: 12000, centroCostoCodigo: 'CC-ARV-01' },
    { codigo: 'HERR-123', nombre: 'Chuzos', marca: 'N/A', cantidad: 2, ubicacion: 'Bodega Mantención', estado: 'Operativos', valorReposicion: 8000, centroCostoCodigo: 'CC-BOD-01' },
    { codigo: 'HERR-124', nombre: 'Laucha (5mm/Fina, 100 mts.)', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativa', valorReposicion: 25000, centroCostoCodigo: 'CC-BOD-01' },
    { codigo: 'HERR-125', nombre: 'Orilladora Stihl (Mezcla)', marca: 'Stihl', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Mal estado', valorReposicion: 130000, centroCostoCodigo: 'CC-ARV-01' },
    { codigo: 'HERR-126', nombre: 'Orilladora Stihl (Mezcla)', marca: 'Stihl', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Operativa', valorReposicion: 130000, centroCostoCodigo: 'CC-ARV-01' },
    { codigo: 'HERR-127', nombre: 'Cortadora Pasto', marca: 'Bauker', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Mal estado', valorReposicion: 110000, centroCostoCodigo: 'CC-ARV-01' },
    { codigo: 'HERR-128', nombre: 'Cortadora Pasto', marca: 'Bauker', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Operativa', valorReposicion: 110000, centroCostoCodigo: 'CC-ARV-01' },
    { codigo: 'HERR-129', nombre: 'Orilladora (Mezcla)', marca: 'Stihl', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Nueva - Falta perno', valorReposicion: 130000, centroCostoCodigo: 'CC-ARV-01' },
    { codigo: 'HERR-130', nombre: 'Hidrolavadora', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Exterior', estado: 'Buen estado', valorReposicion: 150000, centroCostoCodigo: 'CC-ASE-01' },
    { codigo: 'HERR-131', nombre: 'Sopladora (Recargable)', marca: 'Stihl', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Operativa', valorReposicion: 100000, centroCostoCodigo: 'CC-ARV-01' },
    { codigo: 'HERR-132', nombre: 'Sopladora (Recargable)', marca: 'Stihl', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Mal estado', valorReposicion: 100000, centroCostoCodigo: 'CC-ARV-01' },
    { codigo: 'HERR-133', nombre: 'Motosierra (Mezcla)', marca: 'Stihl', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Falta mantención', valorReposicion: 180000, centroCostoCodigo: 'CC-ARV-01' },
    { codigo: 'HERR-134', nombre: 'Motosierra (Mezcla)', marca: 'Stihl', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Mal estado', valorReposicion: 180000, centroCostoCodigo: 'CC-ARV-01' },
    { codigo: 'HERR-135', nombre: 'Soplador', marca: 'Black+Decker', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Operativo', valorReposicion: 65000, centroCostoCodigo: 'CC-ARV-01' },
    { codigo: 'HERR-136', nombre: 'Rastillo', marca: 'N/A', cantidad: 3, ubicacion: 'Bodega Jardinería', estado: 'Buen estado', valorReposicion: 8000, centroCostoCodigo: 'CC-ARV-01' },
    { codigo: 'HERR-137', nombre: 'Picota', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Buen estado', valorReposicion: 12000, centroCostoCodigo: 'CC-ARV-01' },
    { codigo: 'HERR-138', nombre: 'Escobillón', marca: 'N/A', cantidad: 2, ubicacion: 'Bodega Aseo', estado: 'Buen estado', valorReposicion: 5000, centroCostoCodigo: 'CC-ASE-01' },
    { codigo: 'HERR-139', nombre: 'Palín Hallador', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Buen estado', valorReposicion: 10000, centroCostoCodigo: 'CC-BOD-01' },
    { codigo: 'HERR-140', nombre: 'Azadón', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Buen estado', valorReposicion: 9000, centroCostoCodigo: 'CC-ARV-01' },
    { codigo: 'HERR-141', nombre: 'Generador Eléctrico (Petróleo)', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Emergencia', estado: 'Buen estado', valorReposicion: 450000, centroCostoCodigo: 'CC-ELEC-01' },
    { codigo: 'HERR-142', nombre: 'Escalera Telescópica (Aluminio)', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativa', valorReposicion: 85000, centroCostoCodigo: 'CC-INF-01' },
  ]

  for (const h of herramientas) {
    try {
      const existente = await db.catHerramienta.findUnique({ where: { codigo: h.codigo } })
      const centroId = h.centroCostoCodigo ? (await db.centroCostoMaster.findUnique({ where: { codigo: h.centroCostoCodigo } }))?.id : null

      if (existente) {
        await db.catHerramienta.update({
          where: { codigo: h.codigo },
          data: {
            nombre: h.nombre,
            marca: h.marca,
            cantidad: h.cantidad,
            ubicacion: h.ubicacion,
            estado: h.estado,
            valorReposicion: h.valorReposicion,
            centroCostoId: centroId,
          },
        })
        resultados.herramientasActualizadas++
      } else {
        await db.catHerramienta.create({
          data: {
            codigo: h.codigo,
            nombre: h.nombre,
            marca: h.marca,
            cantidad: h.cantidad,
            ubicacion: h.ubicacion,
            estado: h.estado,
            valorReposicion: h.valorReposicion,
            centroCostoId: centroId,
          },
        })
        resultados.herramientasCreadas++
      }
    } catch (e) {
      console.error(`Error herramienta ${h.codigo}:`, e)
      resultados.errores++
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Upsert completado',
    ...resultados,
    totalCentros: resultados.centrosCreados + resultados.centrosActualizados,
    totalHerramientas: resultados.herramientasCreadas + resultados.herramientasActualizadas,
  })
}
