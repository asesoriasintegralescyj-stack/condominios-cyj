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

  // Nuevos centros de costo específicos para Condominio Laguna Norte
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
  // NOTA: Las Listas de Verificación (LV-01 a LV-20) del PMI Laguna Norte
  // fueron movidas al módulo PMI dedicado (modelo ListaVerificacion + RegistroLV).
  // Ya no se gestionan como tareas del catálogo de OT.
]

// ============================================
// SECCIÓN 2: INVENTARIO DE HERRAMIENTAS (con Centro de Costo de Adquisición)
// ============================================
const herramientasInventory = [
  // Herramientas originales del sistema
  { codigo: 'HERR-01', nombre: 'Taladro Percutor SDS Plus', marca: 'Bosch GBH 2-26 DRE', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Bueno', valorReposicion: 189990, centroCostoCodigo: 'CC-INF-01' },
  { codigo: 'HERR-02', nombre: 'Multímetro Digital', marca: 'UNI-T UT39C+', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Bueno', valorReposicion: 25990, centroCostoCodigo: 'CC-ELEC-01' },
  { codigo: 'HERR-03', nombre: 'Bomba de Agua Sumergible (achique)', marca: 'Truper 1HP', cantidad: 1, ubicacion: 'Bodega Emergencia', estado: 'Regular', valorReposicion: 120000, centroCostoCodigo: 'CC-HID-01' },
  { codigo: 'HERR-04', nombre: 'Escalera Metálica Extensible', marca: 'Vaupin / Tricon', cantidad: 1, ubicacion: 'Pasillo Servicio', estado: 'Bueno', valorReposicion: 89990, centroCostoCodigo: 'CC-INF-01' },
  { codigo: 'HERR-05', nombre: 'Set de Llaves Mixtas', marca: 'Stanley 89 piezas', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Nuevo', valorReposicion: 79990, centroCostoCodigo: 'CC-INF-01' },
  { codigo: 'HERR-06', nombre: 'Hidrolavadora', marca: 'Kärcher K2', cantidad: 1, ubicacion: 'Bodega Exterior', estado: 'Bueno', valorReposicion: 129990, centroCostoCodigo: 'CC-ARV-01' },
  { codigo: 'HERR-13', nombre: 'Cámara Termográfica', marca: 'FLIR C5', cantidad: 1, ubicacion: 'Oficina Adm.', estado: 'Bueno', valorReposicion: 650000, centroCostoCodigo: 'CC-ELEC-01' },
  { codigo: 'HERR-14', nombre: 'Medidor de pH y Cloro Digital', marca: 'Milwaukee', cantidad: 1, ubicacion: 'Bodega Piscina', estado: 'Bueno', valorReposicion: 89990, centroCostoCodigo: 'CC-PIS-01' },

  // ============================================
  // INVENTARIO FÍSICO - LAGUNA NORTE (Mayo 2026)
  // Extraído del PDF "Inventario Herramientas26052026.pdf"
  // ============================================

  // Página 1 - Herramientas eléctricas y de construcción
  { codigo: 'HERR-100', nombre: 'Sierra circular c/disco (40s)', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativo', valorReposicion: 80000, centroCostoCodigo: 'CC-BOD-01' },
  { codigo: 'HERR-101', nombre: 'Compresor completo', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Falta Mantención', valorReposicion: 150000, centroCostoCodigo: 'CC-BOD-01' },
  { codigo: 'HERR-102', nombre: 'Demoledor c/2 cuñas paleta (10 kg.) punta', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativo', valorReposicion: 120000, centroCostoCodigo: 'CC-BOD-01' },
  { codigo: 'HERR-103', nombre: 'Hollador c/3 brocas', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativo', valorReposicion: 45000, centroCostoCodigo: 'CC-BOD-01' },
  { codigo: 'HERR-104', nombre: 'Taladro inalámbrico', marca: 'Heinkell', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativo', valorReposicion: 60000, centroCostoCodigo: 'CC-BOD-01' },
  { codigo: 'HERR-105', nombre: 'Roto martillo', marca: 'Heinkell', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Malo', valorReposicion: 90000, centroCostoCodigo: 'CC-BOD-01' },
  { codigo: 'HERR-106', nombre: 'Destornillador inalámbrico', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativo', valorReposicion: 35000, centroCostoCodigo: 'CC-BOD-01' },

  // Página 2 - Herramientas de soldadura, limpieza y altura
  { codigo: 'HERR-107', nombre: 'Cautín', marca: 'Ima Lábrico / Heinkel', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativo', valorReposicion: 25000, centroCostoCodigo: 'CC-BOD-01' },
  { codigo: 'HERR-108', nombre: 'Soldadora', marca: 'Indura', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Mala', valorReposicion: 180000, centroCostoCodigo: 'CC-BOD-01' },
  { codigo: 'HERR-109', nombre: 'Sopladora', marca: 'Hezola / Stihl', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Operativo', valorReposicion: 120000, centroCostoCodigo: 'CC-ARV-01' },
  { codigo: 'HERR-110', nombre: 'Fumigadora', marca: 'N/A', cantidad: 2, ubicacion: 'Bodega Jardinería', estado: 'Operativo', valorReposicion: 45000, centroCostoCodigo: 'CC-ARV-01' },
  { codigo: 'HERR-111', nombre: 'Escalera Telescópica Rojo', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativa', valorReposicion: 70000, centroCostoCodigo: 'CC-INF-01' },
  { codigo: 'HERR-112', nombre: 'Escalera Mecano', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativa', valorReposicion: 55000, centroCostoCodigo: 'CC-INF-01' },
  { codigo: 'HERR-113', nombre: 'Carro Arrastrar (con ruedas)', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativo', valorReposicion: 40000, centroCostoCodigo: 'CC-BOD-01' },

  // Página 3 - Herramientas de jardinería y medición
  { codigo: 'HERR-114', nombre: 'Chipeadora', marca: 'Benima', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Operativa (sin uso)', valorReposicion: 350000, centroCostoCodigo: 'CC-ARV-01' },
  { codigo: 'HERR-115', nombre: 'Tijeras cortar pasto (lote)', marca: 'N/A', cantidad: 7, ubicacion: 'Bodega Jardinería', estado: 'Mal estado', valorReposicion: 8000, centroCostoCodigo: 'CC-ARV-01' },
  { codigo: 'HERR-116', nombre: 'Tijeras cortar pasto (individual)', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Operativa', valorReposicion: 8000, centroCostoCodigo: 'CC-ARV-01' },
  { codigo: 'HERR-117', nombre: 'Tijerón', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Operativo', valorReposicion: 15000, centroCostoCodigo: 'CC-ARV-01' },
  { codigo: 'HERR-118', nombre: 'Huincha de medir (100 mts.)', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativa', valorReposicion: 12000, centroCostoCodigo: 'CC-BOD-01' },
  { codigo: 'HERR-119', nombre: 'Soplete manual (Gas)', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativo', valorReposicion: 18000, centroCostoCodigo: 'CC-BOD-01' },
  { codigo: 'HERR-120', nombre: 'Arnés orilladora', marca: 'N/A', cantidad: 3, ubicacion: 'Bodega Jardinería', estado: 'Operativos', valorReposicion: 15000, centroCostoCodigo: 'CC-ARV-01' },
  { codigo: 'HERR-121', nombre: 'Horquetas', marca: 'N/A', cantidad: 3, ubicacion: 'Bodega Jardinería', estado: 'Operativas', valorReposicion: 10000, centroCostoCodigo: 'CC-ARV-01' },

  // Página 4 - Herramientas manuales y orilladoras
  { codigo: 'HERR-122', nombre: 'Palas (lote)', marca: 'N/A', cantidad: 8, ubicacion: 'Bodega Jardinería', estado: 'Operativas', valorReposicion: 12000, centroCostoCodigo: 'CC-ARV-01' },
  { codigo: 'HERR-123', nombre: 'Chuzos', marca: 'N/A', cantidad: 2, ubicacion: 'Bodega Mantención', estado: 'Operativos', valorReposicion: 8000, centroCostoCodigo: 'CC-BOD-01' },
  { codigo: 'HERR-124', nombre: 'Laucha (5mm/Fina, 100 mts.)', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativa', valorReposicion: 25000, centroCostoCodigo: 'CC-BOD-01' },
  { codigo: 'HERR-125', nombre: 'Orilladora Stihl (Mezcla)', marca: 'Stihl', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Mal estado', valorReposicion: 130000, centroCostoCodigo: 'CC-ARV-01' },
  { codigo: 'HERR-126', nombre: 'Orilladora Stihl (Mezcla)', marca: 'Stihl', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Operativa', valorReposicion: 130000, centroCostoCodigo: 'CC-ARV-01' },
  { codigo: 'HERR-127', nombre: 'Cortadora Pasto', marca: 'Bauker', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Mal estado', valorReposicion: 110000, centroCostoCodigo: 'CC-ARV-01' },
  { codigo: 'HERR-128', nombre: 'Cortadora Pasto', marca: 'Bauker', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Operativa', valorReposicion: 110000, centroCostoCodigo: 'CC-ARV-01' },

  // Página 5 - Motosierras y equipos STIHL
  { codigo: 'HERR-129', nombre: 'Orilladora (Mezcla)', marca: 'Stihl', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Nueva - Falta perno', valorReposicion: 130000, centroCostoCodigo: 'CC-ARV-01' },
  { codigo: 'HERR-130', nombre: 'Hidrolavadora', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Exterior', estado: 'Buen estado', valorReposicion: 150000, centroCostoCodigo: 'CC-ASE-01' },
  { codigo: 'HERR-131', nombre: 'Sopladora (Recargable)', marca: 'Stihl', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Operativa', valorReposicion: 100000, centroCostoCodigo: 'CC-ARV-01' },
  { codigo: 'HERR-132', nombre: 'Sopladora (Recargable)', marca: 'Stihl', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Mal estado', valorReposicion: 100000, centroCostoCodigo: 'CC-ARV-01' },
  { codigo: 'HERR-133', nombre: 'Motosierra (Mezcla)', marca: 'Stihl', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Falta mantención', valorReposicion: 180000, centroCostoCodigo: 'CC-ARV-01' },
  { codigo: 'HERR-134', nombre: 'Motosierra (Mezcla)', marca: 'Stihl', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Mal estado', valorReposicion: 180000, centroCostoCodigo: 'CC-ARV-01' },
  { codigo: 'HERR-135', nombre: 'Soplador', marca: 'Black+Decker', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Operativo', valorReposicion: 65000, centroCostoCodigo: 'CC-ARV-01' },

  // Página 6 - Herramientas manuales y equipos adicionales
  { codigo: 'HERR-136', nombre: 'Rastillo', marca: 'N/A', cantidad: 3, ubicacion: 'Bodega Jardinería', estado: 'Buen estado', valorReposicion: 8000, centroCostoCodigo: 'CC-ARV-01' },
  { codigo: 'HERR-137', nombre: 'Picota', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Buen estado', valorReposicion: 12000, centroCostoCodigo: 'CC-ARV-01' },
  { codigo: 'HERR-138', nombre: 'Escobillón', marca: 'N/A', cantidad: 2, ubicacion: 'Bodega Aseo', estado: 'Buen estado', valorReposicion: 5000, centroCostoCodigo: 'CC-ASE-01' },
  { codigo: 'HERR-139', nombre: 'Palín Hallador', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Buen estado', valorReposicion: 10000, centroCostoCodigo: 'CC-BOD-01' },
  { codigo: 'HERR-140', nombre: 'Azadón', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Buen estado', valorReposicion: 9000, centroCostoCodigo: 'CC-ARV-01' },
  { codigo: 'HERR-141', nombre: 'Generador Eléctrico (Petróleo)', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Emergencia', estado: 'Buen estado', valorReposicion: 450000, centroCostoCodigo: 'CC-ELEC-01' },
  { codigo: 'HERR-142', nombre: 'Escalera Telescópica (Aluminio)', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativa', valorReposicion: 85000, centroCostoCodigo: 'CC-INF-01' },
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
  // ⚠️ BLOQUEADO en producción. Use npm run db:seed-catalogos localmente.
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Endpoint deshabilitado en producción. Use npm run db:seed-catalogos.' },
      { status: 404 }
    )
  }

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
