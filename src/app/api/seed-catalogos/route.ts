import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ============================================
// SECCIÓN 0: TABLA MAESTRA DE CENTROS DE COSTO
// ============================================
const centrosCostoMaster = [
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
]

// ============================================
// SECCIÓN 1: LISTADO MAESTRO DE TAREAS (con Centro de Costo)
// ============================================
const tareasMaster = [
  // SISTEMAS ELÉCTRICOS
  { codigo: 'MT-ELEC-01', nombre: 'Revisión tableros generales y térmicas', categoria: 'Eléctrico', sistema: 'Sistemas Eléctricos', tipoMantencion: 'Preventivo', frecuencia: 'Trimestral', responsable: 'Electricista Certificado', tiempoEstimado: 120, centroCostoCodigo: 'CC-ELEC-01', esRecurrente: true },
  { codigo: 'MT-ELEC-02', nombre: 'Medición de resistencia de tierra', categoria: 'Eléctrico', sistema: 'Sistemas Eléctricos', tipoMantencion: 'Legal', frecuencia: 'Anual', responsable: 'Experto en Seguridad Eléctrica', tiempoEstimado: 180, centroCostoCodigo: 'CC-ELEC-01', esRecurrente: true },
  { codigo: 'MT-ELEC-04', nombre: 'Revisión de iluminación de emergencia', categoria: 'Eléctrico', sistema: 'Sistemas Eléctricos', tipoMantencion: 'Preventivo', frecuencia: 'Mensual', responsable: 'Personal de Mantención', tiempoEstimado: 60, centroCostoCodigo: 'CC-ELEC-01', esRecurrente: true },
  { codigo: 'MT-ELEC-05', nombre: 'Mantenimiento grupo electrógeno', categoria: 'Eléctrico', sistema: 'Sistemas Eléctricos', tipoMantencion: 'Preventivo', frecuencia: 'Mensual', responsable: 'Técnico Especializado', tiempoEstimado: 240, centroCostoCodigo: 'CC-ELEC-01', esRecurrente: true },
  
  // SISTEMAS HIDRÁULICOS
  { codigo: 'MT-HID-01', nombre: 'Inspección bombas de agua potable', categoria: 'Hidráulico', sistema: 'Sistemas Hidráulicos', tipoMantencion: 'Predictivo', frecuencia: 'Mensual', responsable: 'Técnico en Maquinarias', tiempoEstimado: 90, centroCostoCodigo: 'CC-HID-01', esRecurrente: true },
  { codigo: 'MT-HID-02', nombre: 'Limpieza y sanitizado de estanques', categoria: 'Hidráulico', sistema: 'Sistemas Hidráulicos', tipoMantencion: 'Legal', frecuencia: 'Anual', responsable: 'Empresa Sanitaria', tiempoEstimado: 480, centroCostoCodigo: 'CC-HID-01', esRecurrente: true },
  { codigo: 'MT-HID-03', nombre: 'Revisión y limpieza de cárcamos', categoria: 'Hidráulico', sistema: 'Sistemas Hidráulicos', tipoMantencion: 'Preventivo', frecuencia: 'Mensual', responsable: 'Personal de Mantención', tiempoEstimado: 60, centroCostoCodigo: 'CC-HID-01', esRecurrente: true },
  
  // ASCENSORES
  { codigo: 'MT-ASC-01', nombre: 'Mantención mensual ascensor (frenos, nivelación)', categoria: 'Ascensores', sistema: 'Ascensores y Maquinaria', tipoMantencion: 'Preventivo', frecuencia: 'Mensual', responsable: 'Empresa Contratada', tiempoEstimado: 240, centroCostoCodigo: 'CC-ASC-01', esRecurrente: true },
  { codigo: 'MT-ASC-02', nombre: 'Inspección anual de cables y paracaídas', categoria: 'Ascensores', sistema: 'Ascensores y Maquinaria', tipoMantencion: 'Legal', frecuencia: 'Anual', responsable: 'Ente Certificador', tiempoEstimado: 480, centroCostoCodigo: 'CC-ASC-01', esRecurrente: true },
  
  // GAS Y CLIMATIZACIÓN
  { codigo: 'MT-GAS-01', nombre: 'Revisión de salas de calderas', categoria: 'Gas', sistema: 'Gas y Climatización', tipoMantencion: 'Preventivo', frecuencia: 'Trimestral', responsable: 'Gasfíter Matriculado', tiempoEstimado: 90, centroCostoCodigo: 'CC-GAS-01', esRecurrente: true },
  { codigo: 'MT-CLIM-01', nombre: 'Mantención de equipos de AA', categoria: 'Climatización', sistema: 'Gas y Climatización', tipoMantencion: 'Preventivo', frecuencia: 'Semestral', responsable: 'Técnico en Climatización', tiempoEstimado: 180, centroCostoCodigo: 'CC-GAS-01', esRecurrente: true },
  
  // INFRAESTRUCTURA Y SEGURIDAD
  { codigo: 'MT-SEG-01', nombre: 'Prueba de alarmas de incendio', categoria: 'Seguridad', sistema: 'Infraestructura y Seguridad', tipoMantencion: 'Preventivo', frecuencia: 'Semanal', responsable: 'Conserje/Zelador', tiempoEstimado: 30, centroCostoCodigo: 'CC-SEG-01', esRecurrente: true },
  { codigo: 'MT-SEG-02', nombre: 'Mantenimiento y recarga de extintores', categoria: 'Seguridad', sistema: 'Infraestructura y Seguridad', tipoMantencion: 'Legal', frecuencia: 'Anual', responsable: 'Empresa de Seguridad', tiempoEstimado: 60, centroCostoCodigo: 'CC-SEG-01', esRecurrente: true },
  { codigo: 'MT-INF-01', nombre: 'Inspección de techos y canaletas', categoria: 'Infraestructura', sistema: 'Infraestructura y Seguridad', tipoMantencion: 'Preventivo', frecuencia: 'Semestral', responsable: 'Personal Mantención', tiempoEstimado: 120, centroCostoCodigo: 'CC-INF-01', esRecurrente: true },
  
  // ÁREAS COMUNES
  { codigo: 'MT-ARV-01', nombre: 'Poda de áreas verdes y árboles', categoria: 'Áreas Verdes', sistema: 'Áreas Comunes', tipoMantencion: 'Correctivo', frecuencia: 'Mensual', responsable: 'Jardinero', tiempoEstimado: 240, centroCostoCodigo: 'CC-ARV-01', esRecurrente: true },
  { codigo: 'MT-PIS-01', nombre: 'Medición de pH y Cloro', categoria: 'Piscina', sistema: 'Áreas Comunes', tipoMantencion: 'Rutina', frecuencia: 'Diaria', responsable: 'Personal de Mantención', tiempoEstimado: 15, centroCostoCodigo: 'CC-PIS-01', esRecurrente: true },
  { codigo: 'MT-PIS-02', nombre: 'Mantenimiento de bombas y filtros piscina', categoria: 'Piscina', sistema: 'Áreas Comunes', tipoMantencion: 'Preventivo', frecuencia: 'Semanal', responsable: 'Personal de Mantención', tiempoEstimado: 60, centroCostoCodigo: 'CC-PIS-01', esRecurrente: true },
  { codigo: 'MT-GIM-01', nombre: 'Inspección de máquinas de gimnasio', categoria: 'Gimnasio', sistema: 'Áreas Comunes', tipoMantencion: 'Preventivo', frecuencia: 'Mensual', responsable: 'Personal de Mantención', tiempoEstimado: 60, centroCostoCodigo: 'CC-GIM-01', esRecurrente: true },
  { codigo: 'MT-ASE-01', nombre: 'Reposición de insumos de baños comunes', categoria: 'Aseo', sistema: 'Áreas Comunes', tipoMantencion: 'Rutina', frecuencia: 'Diaria', responsable: 'Personal de Aseo', tiempoEstimado: 30, centroCostoCodigo: 'CC-ASE-01', esRecurrente: true },
]

// ============================================
// SECCIÓN 2: INVENTARIO DE HERRAMIENTAS (con Centro de Costo de Adquisición)
// ============================================
const herramientasInventory = [
  { codigo: 'HERR-01', nombre: 'Taladro Percutor SDS Plus', marca: 'Bosch GBH 2-26 DRE', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Bueno', valorReposicion: 189990, centroCostoCodigo: 'CC-INF-01' },
  { codigo: 'HERR-02', nombre: 'Multímetro Digital', marca: 'UNI-T UT39C+', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Bueno', valorReposicion: 25990, centroCostoCodigo: 'CC-ELEC-01' },
  { codigo: 'HERR-03', nombre: 'Bomba de Agua Sumergible (achique)', marca: 'Truper 1HP', cantidad: 1, ubicacion: 'Bodega Emergencia', estado: 'Regular', valorReposicion: 120000, centroCostoCodigo: 'CC-HID-01' },
  { codigo: 'HERR-04', nombre: 'Escalera Metálica Extensible', marca: 'Vaupin / Tricon', cantidad: 1, ubicacion: 'Pasillo Servicio', estado: 'Bueno', valorReposicion: 89990, centroCostoCodigo: 'CC-INF-01' },
  { codigo: 'HERR-05', nombre: 'Set de Llaves Mixtas', marca: 'Stanley 89 piezas', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Nuevo', valorReposicion: 79990, centroCostoCodigo: 'CC-INF-01' },
  { codigo: 'HERR-06', nombre: 'Hidrolavadora', marca: 'Kärcher K2', cantidad: 1, ubicacion: 'Bodega Exterior', estado: 'Bueno', valorReposicion: 129990, centroCostoCodigo: 'CC-ARV-01' },
  { codigo: 'HERR-13', nombre: 'Cámara Termográfica', marca: 'FLIR C5', cantidad: 1, ubicacion: 'Oficina Adm.', estado: 'Bueno', valorReposicion: 650000, centroCostoCodigo: 'CC-ELEC-01' },
  { codigo: 'HERR-14', nombre: 'Medidor de pH y Cloro Digital', marca: 'Milwaukee', cantidad: 1, ubicacion: 'Bodega Piscina', estado: 'Bueno', valorReposicion: 89990, centroCostoCodigo: 'CC-PIS-01' },
]

// ============================================
// SECCIÓN 3: INVENTARIO DE MATERIALES (con Centro de Costo de Imputación)
// ============================================
const materialesInventory = [
  // ELÉCTRICOS
  { codigo: 'MAT-ELEC-01', nombre: 'Tubo LED 18W (Luz día)', unidad: 'Unidad', precioUnit: 3990, categoria: 'Eléctrico', stockMinimo: 20, stockActual: 15, ubicacion: 'Bodega', centroCostoCodigo: 'CC-ELEC-01' },
  { codigo: 'MAT-ELEC-04', nombre: 'Interruptor Térmico 10A', unidad: 'Unidad', precioUnit: 8990, categoria: 'Eléctrico', stockMinimo: 5, stockActual: 3, ubicacion: 'Bodega', centroCostoCodigo: 'CC-ELEC-01' },
  { codigo: 'MAT-ELEC-10', nombre: 'Cinta Aislante Scotch 3M', unidad: 'Unidad', precioUnit: 2490, categoria: 'Eléctrico', stockMinimo: 10, stockActual: 8, ubicacion: 'Bodega', centroCostoCodigo: 'CC-ELEC-01' },
  
  // FONTANERÍA
  { codigo: 'MAT-FONT-01', nombre: 'Pegamento para PVC 125 gr', unidad: 'Unidad', precioUnit: 3500, categoria: 'Fontanería', stockMinimo: 4, stockActual: 3, ubicacion: 'Bodega', centroCostoCodigo: 'CC-HID-01' },
  { codigo: 'MAT-FONT-05', nombre: 'Llave de Paso (Esfera) 1/2"', unidad: 'Unidad', precioUnit: 7990, categoria: 'Fontanería', stockMinimo: 3, stockActual: 2, ubicacion: 'Bodega', centroCostoCodigo: 'CC-HID-01' },
  { codigo: 'MAT-FONT-08', nombre: 'Silicona para baños (antihongos)', unidad: 'Unidad', precioUnit: 3990, categoria: 'Fontanería', stockMinimo: 5, stockActual: 2, ubicacion: 'Bodega', centroCostoCodigo: 'CC-HID-01' },
  
  // FERRETERÍA
  { codigo: 'MAT-FERR-01', nombre: 'Pernos con tarugo 8x40 mm', unidad: 'Bolsa', precioUnit: 7990, categoria: 'Ferretería', stockMinimo: 3, stockActual: 3, ubicacion: 'Bodega', centroCostoCodigo: 'CC-INF-01' },
  { codigo: 'MAT-FERR-06', nombre: 'Grasa lubricante multiuso', unidad: 'Unidad', precioUnit: 5990, categoria: 'Ferretería', stockMinimo: 3, stockActual: 2, ubicacion: 'Bodega', centroCostoCodigo: 'CC-ASC-01' },
  
  // PINTURA
  { codigo: 'MAT-PINT-01', nombre: 'Pintura Latex Blanco (20 Lts)', unidad: 'Balde', precioUnit: 42990, categoria: 'Pintura', stockMinimo: 2, stockActual: 1, ubicacion: 'Bodega', centroCostoCodigo: 'CC-INF-01' },
  
  // JARDINERÍA
  { codigo: 'MAT-JARD-01', nombre: 'Bolsa de Tierra de Hoja (40 Lts)', unidad: 'Unidad', precioUnit: 3990, categoria: 'Jardinería', stockMinimo: 5, stockActual: 2, ubicacion: 'Jardín', centroCostoCodigo: 'CC-ARV-01' },
  { codigo: 'MAT-JARD-02', nombre: 'Fertilizante para pasto (25 kg)', unidad: 'Saco', precioUnit: 22990, categoria: 'Jardinería', stockMinimo: 1, stockActual: 0, ubicacion: 'Jardín', centroCostoCodigo: 'CC-ARV-01' },
  
  // LIMPIEZA
  { codigo: 'MAT-LIMP-01', nombre: 'Trapo Industrial', unidad: 'Kilo', precioUnit: 3000, categoria: 'Limpieza', stockMinimo: 10, stockActual: 10, ubicacion: 'Bodega', centroCostoCodigo: 'CC-ASE-01' },
  { codigo: 'MAT-LIMP-02', nombre: 'Jabón Líquido para manos (Bidón 5 Lts)', unidad: 'Litro', precioUnit: 2500, categoria: 'Limpieza', stockMinimo: 20, stockActual: 12, ubicacion: 'Bodega', centroCostoCodigo: 'CC-ASE-01' },
  { codigo: 'MAT-LIMP-03', nombre: 'Papel Higiénico Industrial (x50 rollos)', unidad: 'Paq.', precioUnit: 29990, categoria: 'Limpieza', stockMinimo: 3, stockActual: 2, ubicacion: 'Bodega', centroCostoCodigo: 'CC-ASE-01' },
  { codigo: 'MAT-LIMP-04', nombre: 'Bolsas de Basura 120 Lts (x10u)', unidad: 'Paq.', precioUnit: 4990, categoria: 'Limpieza', stockMinimo: 10, stockActual: 8, ubicacion: 'Bodega', centroCostoCodigo: 'CC-ASE-01' },
  
  // SEGURIDAD / PISCINA
  { codigo: 'MAT-SEG-01', nombre: 'Cloro en pastilla (Piscina)', unidad: 'Kilo', precioUnit: 8500, categoria: 'Seguridad', stockMinimo: 5, stockActual: 1, ubicacion: 'Bodega Piscina', centroCostoCodigo: 'CC-PIS-01' },
  { codigo: 'MAT-SEG-02', nombre: 'Regulador pH para piscina', unidad: 'Litro', precioUnit: 4500, categoria: 'Seguridad', stockMinimo: 10, stockActual: 4, ubicacion: 'Bodega Piscina', centroCostoCodigo: 'CC-PIS-01' },
  { codigo: 'MAT-SEG-04', nombre: 'Batería para extintor 5kg', unidad: 'Unidad', precioUnit: 15000, categoria: 'Seguridad', stockMinimo: 2, stockActual: 0, ubicacion: 'Bodega', centroCostoCodigo: 'CC-SEG-01' },
]

export async function POST(req: NextRequest) {
  try {
    // Limpiar tablas existentes
    await db.catHerramienta.deleteMany({})
    await db.catTarea.deleteMany({})
    await db.catMaterial.deleteMany({})
    await db.centroCostoMaster.deleteMany({})
    
    // ============================================
    // 1. Crear Centros de Costo
    // ============================================
    const centrosCostoMap: Record<string, string> = {}
    for (const cc of centrosCostoMaster) {
      const created = await db.centroCostoMaster.create({ 
        data: {
          codigo: cc.codigo,
          nombre: cc.nombre,
          descripcion: cc.descripcion,
          responsable: cc.responsable,
          tipoGasto: cc.tipoGasto,
          presupuestoMens: cc.presupuestoMens,
          presupuestoAnual: cc.presupuestoAnual,
        }
      })
      centrosCostoMap[cc.codigo] = created.id
    }
    
    // ============================================
    // 2. Crear Tareas con Centro de Costo
    // ============================================
    let tareasCreated = 0
    for (const t of tareasMaster) {
      try {
        await db.catTarea.create({ 
          data: {
            codigo: t.codigo,
            nombre: t.nombre,
            categoria: t.categoria,
            sistema: t.sistema,
            tipoMantencion: t.tipoMantencion,
            frecuencia: t.frecuencia,
            responsable: t.responsable,
            tiempoEstimado: t.tiempoEstimado,
            centroCostoId: t.centroCostoCodigo ? centrosCostoMap[t.centroCostoCodigo] : null,
            esRecurrente: t.esRecurrente,
            activa: true,
          }
        })
        tareasCreated++
      } catch (e) { /* ignorar duplicados */ }
    }
    
    // ============================================
    // 3. Crear Herramientas con Centro de Costo
    // ============================================
    let herramientasCreated = 0
    for (const h of herramientasInventory) {
      try {
        await db.catHerramienta.create({ 
          data: {
            codigo: h.codigo,
            nombre: h.nombre,
            marca: h.marca,
            cantidad: h.cantidad,
            ubicacion: h.ubicacion,
            estado: h.estado,
            valorReposicion: h.valorReposicion,
            centroCostoId: h.centroCostoCodigo ? centrosCostoMap[h.centroCostoCodigo] : null,
          }
        })
        herramientasCreated++
      } catch (e) { /* ignorar duplicados */ }
    }
    
    // ============================================
    // 4. Crear Materiales con Centro de Costo
    // ============================================
    let materialesCreated = 0
    for (const m of materialesInventory) {
      try {
        await db.catMaterial.create({ 
          data: {
            codigo: m.codigo,
            nombre: m.nombre,
            unidad: m.unidad,
            precioUnit: m.precioUnit,
            categoria: m.categoria,
            stockMinimo: m.stockMinimo,
            stockActual: m.stockActual,
            ubicacion: m.ubicacion,
            centroCostoId: m.centroCostoCodigo ? centrosCostoMap[m.centroCostoCodigo] : null,
          }
        })
        materialesCreated++
      } catch (e) { /* ignorar duplicados */ }
    }
    
    return NextResponse.json({ 
      message: 'Catálogos completos creados correctamente',
      centrosCosto: centrosCostoMaster.length,
      tareas: tareasCreated,
      herramientas: herramientasCreated,
      materiales: materialesCreated,
      total: centrosCostoMaster.length + tareasCreated + herramientasCreated + materialesCreated
    })
  } catch (error) {
    console.error('Error poblando catálogos:', error)
    return NextResponse.json({ error: 'Error poblando catálogos' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const [centrosCosto, herramientas, tareas, materiales] = await Promise.all([
      db.centroCostoMaster.findMany({ orderBy: { codigo: 'asc' } }),
      db.catHerramienta.findMany({ 
        orderBy: { nombre: 'asc' },
        include: { centroCosto: true }
      }),
      db.catTarea.findMany({ 
        orderBy: { nombre: 'asc' },
        include: { centroCosto: true }
      }),
      db.catMaterial.findMany({ 
        orderBy: { nombre: 'asc' },
        include: { centroCosto: true }
      }),
    ])
    
    return NextResponse.json({
      centrosCosto,
      herramientas,
      tareas,
      materiales,
      counts: {
        centrosCosto: centrosCosto.length,
        herramientas: herramientas.length,
        tareas: tareas.length,
        materiales: materiales.length
      }
    })
  } catch (error) {
    console.error('Error obteniendo catálogos:', error)
    return NextResponse.json({ error: 'Error obteniendo catálogos' }, { status: 500 })
  }
}
