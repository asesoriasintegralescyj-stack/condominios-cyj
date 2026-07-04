import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Carga masiva de TODOS los catálogos y datos del sistema
export async function POST(request: NextRequest) {
  const out: string[] = []
  const CID = 'cmo9f3x7j0000ktyeb0rzhwt9'

  try {
    // 1. Condominio
    out.push('1. Condominio...')
    try {
      await db.condominio.upsert({ where: { id: CID }, update: {}, create: { id: CID, nombre: 'Laguna Norte', direccion: 'Av. La Montaña Norte 3650, Lampa', comuna: 'Lampa', ciudad: 'Santiago', activo: true } })
      out.push('  OK')
    } catch (e: any) { out.push('  ' + e.message.substring(0, 60)) }

    // 2. Caja chica
    out.push('2. Caja chica...')
    try {
      const ex = await db.cajaChica.findFirst()
      if (!ex) await db.cajaChica.create({ data: { saldo: 500000, saldoInicial: 500000, condominioId: CID } })
      out.push('  OK')
    } catch (e: any) { out.push('  ' + e.message.substring(0, 60)) }

    // 3. Usuarios
    out.push('3. Usuarios...')
    const bcrypt = await import('bcryptjs').then(m => m.default).catch(() => null)
    if (bcrypt) {
      const users = [
        { email: 'admin@cyj.cl', pass: 'Admin123456', nombre: 'Administrador', rol: 'admin' },
        { email: 'supervisor.test@cyj.cl', pass: 'Supervisor2026!', nombre: 'Supervisor', rol: 'supervisor' },
        { email: 'usuario.test@cyj.cl', pass: 'Usuario2026!', nombre: 'Usuario', rol: 'usuario' },
        { email: 'personal.test@cyj.cl', pass: 'Personal2026!', nombre: 'Personal', rol: 'personal' },
        { email: 'auditor.test@cyj.cl', pass: 'Auditor2026!', nombre: 'Auditor', rol: 'auditor' },
        { email: 'guardia.test@cyj.cl', pass: 'Guardia2026!', nombre: 'Guardia', rol: 'guardia' },
      ]
      for (const u of users) {
        try {
          const ex = await db.user.findUnique({ where: { email: u.email } })
          if (!ex) { const h = bcrypt.hashSync(u.pass, 10); await db.user.create({ data: { email: u.email, password: h, nombre: u.nombre, rol: u.rol, activo: true, condominioId: CID } }); out.push(`  ${u.email} OK`) }
          else out.push(`  ${u.email} existe`)
        } catch (e: any) { out.push(`  ${u.email}: ${e.message.substring(0, 40)}`) }
      }
    }

    // 4. Centros de costo
    out.push('4. Centros de costo...')
    const ccs = [
      { codigo: 'CC-ADM-01', nombre: 'Administración y Gastos Generales', tipoGasto: 'Fijo', presupuestoMens: 500000, presupuestoAnual: 6000000 },
      { codigo: 'CC-SEG-01', nombre: 'Seguridad y Vigilancia', tipoGasto: 'Contrato', presupuestoMens: 1200000, presupuestoAnual: 14400000 },
      { codigo: 'CC-ASC-01', nombre: 'Ascensores y Montacargas', tipoGasto: 'Contrato', presupuestoMens: 400000, presupuestoAnual: 4800000 },
      { codigo: 'CC-HID-01', nombre: 'Agua Potable y Alcantarillado', tipoGasto: 'Variable', presupuestoMens: 350000, presupuestoAnual: 4200000 },
      { codigo: 'CC-ELEC-01', nombre: 'Electricidad y Alumbrado', tipoGasto: 'Variable', presupuestoMens: 800000, presupuestoAnual: 9600000 },
      { codigo: 'CC-GAS-01', nombre: 'Gas y Climatización', tipoGasto: 'Variable', presupuestoMens: 300000, presupuestoAnual: 3600000 },
      { codigo: 'CC-ARV-01', nombre: 'Áreas Verdes y Jardines', tipoGasto: 'Variable', presupuestoMens: 200000, presupuestoAnual: 2400000 },
      { codigo: 'CC-PIS-01', nombre: 'Piscina y Espejos de Agua', tipoGasto: 'Estacional', presupuestoMens: 150000, presupuestoAnual: 1800000 },
      { codigo: 'CC-GIM-01', nombre: 'Gimnasio y Salones Deportivos', tipoGasto: 'Variable', presupuestoMens: 100000, presupuestoAnual: 1200000 },
      { codigo: 'CC-INF-01', nombre: 'Infraestructura y Obras Menores', tipoGasto: 'Variable', presupuestoMens: 300000, presupuestoAnual: 3600000 },
      { codigo: 'CC-ASE-01', nombre: 'Aseo y Ornato', tipoGasto: 'Variable', presupuestoMens: 250000, presupuestoAnual: 3000000 },
      { codigo: 'CC-PRO-01', nombre: 'Provisiones y Fondo de Reserva', tipoGasto: 'Fondo de Reserva', presupuestoMens: 500000, presupuestoAnual: 6000000 },
      { codigo: 'CC-LAG-01', nombre: 'Laguna Artificial y Playas', tipoGasto: 'Variable', presupuestoMens: 400000, presupuestoAnual: 4800000 },
      { codigo: 'CC-CH-01', nombre: 'Club House y Quinchos', tipoGasto: 'Variable', presupuestoMens: 350000, presupuestoAnual: 4200000 },
      { codigo: 'CC-CAN-01', nombre: 'Canchas Deportivas', tipoGasto: 'Variable', presupuestoMens: 200000, presupuestoAnual: 2400000 },
      { codigo: 'CC-CIC-01', nombre: 'Ciclovía y Senderos Peatonales', tipoGasto: 'Variable', presupuestoMens: 150000, presupuestoAnual: 1800000 },
      { codigo: 'CC-JUE-01', nombre: 'Juegos Infantiles', tipoGasto: 'Variable', presupuestoMens: 150000, presupuestoAnual: 1800000 },
      { codigo: 'CC-EST-01', nombre: 'Estacionamientos y Accesos', tipoGasto: 'Variable', presupuestoMens: 150000, presupuestoAnual: 1800000 },
      { codigo: 'CC-WELL-01', nombre: 'Wellness (Jacuzzi, Sauna, Spa)', tipoGasto: 'Variable', presupuestoMens: 200000, presupuestoAnual: 2400000 },
      { codigo: 'CC-SEG-AC-01', nombre: 'Seguridad Acuática y Rescate', tipoGasto: 'Variable', presupuestoMens: 100000, presupuestoAnual: 1200000 },
      { codigo: 'CC-BOD-01', nombre: 'Bodega y Herramientas', tipoGasto: 'Variable', presupuestoMens: 200000, presupuestoAnual: 2400000 },
      { codigo: 'CC-ACT-01', nombre: 'Activos y Herramientas', tipoGasto: 'Variable', presupuestoMens: 300000, presupuestoAnual: 3600000 },
      { codigo: 'CC-COM-01', nombre: 'Comunicaciones y Sistemas', tipoGasto: 'Fijo', presupuestoMens: 150000, presupuestoAnual: 1800000 },
      { codigo: 'CC-BOM-01', nombre: 'Bombas y Sala de Máquinas', tipoGasto: 'Contrato', presupuestoMens: 250000, presupuestoAnual: 3000000 },
    ]
    let ccN = 0
    for (const c of ccs) { try { await db.centroCostoMaster.upsert({ where: { codigo: c.codigo }, update: {}, create: { ...c, estado: 'Activo', condominioId: CID } }); ccN++ } catch {} }
    out.push(`  ${ccN} centros`)

    // 5. Personal
    out.push('5. Personal...')
    const pers = [
      { nombre: 'Luis García', cargo: 'Jefe De Operaciones' },
      { nombre: 'Alfredo Muñoz', cargo: 'Supervisor De Operaciones' },
      { nombre: 'Luis Torres', cargo: 'Auxiliar De Servicios Generales' },
      { nombre: 'Cesar Adasme', cargo: 'Auxiliar De Aseo Full Time' },
      { nombre: 'Erik Arteaga', cargo: 'Auxiliar De Aseo Full Time' },
      { nombre: 'Jeantelus Fleurissaint', cargo: 'Auxiliar De Servicios Generales' },
      { nombre: 'Chris Godoy', cargo: 'Auxiliar De Aseo Full Time' },
      { nombre: 'Paulo Toro', cargo: 'Auxiliar De Servicios Generales' },
      { nombre: 'Marie Dorne', cargo: 'Auxiliar De Aseo Full Time' },
      { nombre: 'Macario Manríquez', cargo: 'Lagunero' },
      { nombre: 'Francisco Fuentes', cargo: 'Mantención Electricista' },
      { nombre: 'Jose Venegas', cargo: 'Mantención A' },
      { nombre: 'Carlos Zamorano', cargo: 'Mantención B' },
    ]
    let pN = 0
    for (const p of pers) { try { const ex = await db.personal.findFirst({ where: { nombre: p.nombre } }); if (!ex) { await db.personal.create({ data: { ...p, estado: 'Activo', condominioId: CID } }); pN++ } } catch {} }
    out.push(`  ${pN} personal`)

    // 6. Herramientas
    out.push('6. Herramientas...')
    const ccB = await db.centroCostoMaster.findUnique({ where: { codigo: 'CC-BOD-01' } })
    const ccA = await db.centroCostoMaster.findUnique({ where: { codigo: 'CC-ARV-01' } })
    const ccI = await db.centroCostoMaster.findUnique({ where: { codigo: 'CC-INF-01' } })
    const ccE = await db.centroCostoMaster.findUnique({ where: { codigo: 'CC-ELEC-01' } })
    const ccAs = await db.centroCostoMaster.findUnique({ where: { codigo: 'CC-ASE-01' } })
    const herrs = [
      { codigo: 'HERR-01', nombre: 'Taladro Percutor SDS Plus', marca: 'Bosch', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Bueno', valorReposicion: 189990, cc: 'B' },
      { codigo: 'HERR-02', nombre: 'Multímetro Digital', marca: 'UNI-T', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Bueno', valorReposicion: 25990, cc: 'B' },
      { codigo: 'HERR-03', nombre: 'Bomba de Agua Sumergible', marca: 'Truper', cantidad: 1, ubicacion: 'Bodega Emergencia', estado: 'Regular', valorReposicion: 120000, cc: 'E' },
      { codigo: 'HERR-04', nombre: 'Escalera Metálica Extensible', marca: 'Vaupin', cantidad: 1, ubicacion: 'Pasillo Servicio', estado: 'Bueno', valorReposicion: 89990, cc: 'I' },
      { codigo: 'HERR-05', nombre: 'Set de Llaves Mixtas', marca: 'Stanley', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Bueno', valorReposicion: 79990, cc: 'B' },
      { codigo: 'HERR-06', nombre: 'Hidrolavadora', marca: 'Kärcher', cantidad: 1, ubicacion: 'Bodega Exterior', estado: 'Bueno', valorReposicion: 129990, cc: 'A' },
      { codigo: 'HERR-100', nombre: 'Sierra circular c/disco', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativo', valorReposicion: 80000, cc: 'B' },
      { codigo: 'HERR-101', nombre: 'Compresor completo', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Falta Mantención', valorReposicion: 150000, cc: 'B' },
      { codigo: 'HERR-102', nombre: 'Demoledor c/2 cuñas', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativo', valorReposicion: 120000, cc: 'B' },
      { codigo: 'HERR-103', nombre: 'Hollador c/3 brocas', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativo', valorReposicion: 45000, cc: 'B' },
      { codigo: 'HERR-104', nombre: 'Taladro inalámbrico', marca: 'Heinkell', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativo', valorReposicion: 60000, cc: 'B' },
      { codigo: 'HERR-105', nombre: 'Roto martillo', marca: 'Heinkell', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Malo', valorReposicion: 90000, cc: 'B' },
      { codigo: 'HERR-106', nombre: 'Destornillador inalámbrico', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativo', valorReposicion: 35000, cc: 'B' },
      { codigo: 'HERR-107', nombre: 'Cautín', marca: 'Heinkel', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativo', valorReposicion: 25000, cc: 'B' },
      { codigo: 'HERR-108', nombre: 'Soldadora', marca: 'Indura', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Mala', valorReposicion: 180000, cc: 'B' },
      { codigo: 'HERR-109', nombre: 'Sopladora', marca: 'Stihl', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Operativo', valorReposicion: 120000, cc: 'A' },
      { codigo: 'HERR-110', nombre: 'Fumigadora', marca: 'N/A', cantidad: 2, ubicacion: 'Bodega Jardinería', estado: 'Operativo', valorReposicion: 45000, cc: 'A' },
      { codigo: 'HERR-111', nombre: 'Escalera Telescópica', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativa', valorReposicion: 70000, cc: 'I' },
      { codigo: 'HERR-112', nombre: 'Escalera Mecano', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativa', valorReposicion: 55000, cc: 'I' },
      { codigo: 'HERR-113', nombre: 'Carro Arrastrar', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativo', valorReposicion: 40000, cc: 'B' },
      { codigo: 'HERR-114', nombre: 'Chipeadora', marca: 'Benima', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Operativa (sin uso)', valorReposicion: 350000, cc: 'A' },
      { codigo: 'HERR-115', nombre: 'Tijeras cortar pasto (lote)', marca: 'N/A', cantidad: 7, ubicacion: 'Bodega Jardinería', estado: 'Mal estado', valorReposicion: 8000, cc: 'A' },
      { codigo: 'HERR-117', nombre: 'Tijerón', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Operativo', valorReposicion: 15000, cc: 'A' },
      { codigo: 'HERR-118', nombre: 'Huincha de medir 100m', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativa', valorReposicion: 12000, cc: 'B' },
      { codigo: 'HERR-119', nombre: 'Soplete manual Gas', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativo', valorReposicion: 18000, cc: 'B' },
      { codigo: 'HERR-120', nombre: 'Arnés orilladora', marca: 'N/A', cantidad: 3, ubicacion: 'Bodega Jardinería', estado: 'Operativos', valorReposicion: 15000, cc: 'A' },
      { codigo: 'HERR-121', nombre: 'Horquetas', marca: 'N/A', cantidad: 3, ubicacion: 'Bodega Jardinería', estado: 'Operativas', valorReposicion: 10000, cc: 'A' },
      { codigo: 'HERR-122', nombre: 'Palas (lote)', marca: 'N/A', cantidad: 8, ubicacion: 'Bodega Jardinería', estado: 'Operativas', valorReposicion: 12000, cc: 'A' },
      { codigo: 'HERR-123', nombre: 'Chuzos', marca: 'N/A', cantidad: 2, ubicacion: 'Bodega Mantención', estado: 'Operativos', valorReposicion: 8000, cc: 'B' },
      { codigo: 'HERR-124', nombre: 'Laucha 100m', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativa', valorReposicion: 25000, cc: 'B' },
      { codigo: 'HERR-125', nombre: 'Orilladora Stihl', marca: 'Stihl', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Mal estado', valorReposicion: 130000, cc: 'A' },
      { codigo: 'HERR-126', nombre: 'Orilladora Stihl', marca: 'Stihl', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Operativa', valorReposicion: 130000, cc: 'A' },
      { codigo: 'HERR-127', nombre: 'Cortadora Pasto', marca: 'Bauker', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Mal estado', valorReposicion: 110000, cc: 'A' },
      { codigo: 'HERR-128', nombre: 'Cortadora Pasto', marca: 'Bauker', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Operativa', valorReposicion: 110000, cc: 'A' },
      { codigo: 'HERR-129', nombre: 'Orilladora Stihl', marca: 'Stihl', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Nueva - Falta perno', valorReposicion: 130000, cc: 'A' },
      { codigo: 'HERR-130', nombre: 'Hidrolavadora', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Exterior', estado: 'Buen estado', valorReposicion: 150000, cc: 'As' },
      { codigo: 'HERR-131', nombre: 'Sopladora Recargable', marca: 'Stihl', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Operativa', valorReposicion: 100000, cc: 'A' },
      { codigo: 'HERR-132', nombre: 'Sopladora Recargable', marca: 'Stihl', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Mal estado', valorReposicion: 100000, cc: 'A' },
      { codigo: 'HERR-133', nombre: 'Motosierra', marca: 'Stihl', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Falta mantención', valorReposicion: 180000, cc: 'A' },
      { codigo: 'HERR-134', nombre: 'Motosierra', marca: 'Stihl', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Mal estado', valorReposicion: 180000, cc: 'A' },
      { codigo: 'HERR-135', nombre: 'Soplador', marca: 'Black+Decker', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Operativo', valorReposicion: 65000, cc: 'A' },
      { codigo: 'HERR-136', nombre: 'Rastillo', marca: 'N/A', cantidad: 3, ubicacion: 'Bodega Jardinería', estado: 'Buen estado', valorReposicion: 8000, cc: 'A' },
      { codigo: 'HERR-137', nombre: 'Picota', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Buen estado', valorReposicion: 12000, cc: 'A' },
      { codigo: 'HERR-138', nombre: 'Escobillón', marca: 'N/A', cantidad: 2, ubicacion: 'Bodega Aseo', estado: 'Buen estado', valorReposicion: 5000, cc: 'As' },
      { codigo: 'HERR-139', nombre: 'Palín Hallador', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Buen estado', valorReposicion: 10000, cc: 'B' },
      { codigo: 'HERR-140', nombre: 'Azadón', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Jardinería', estado: 'Buen estado', valorReposicion: 9000, cc: 'A' },
      { codigo: 'HERR-141', nombre: 'Generador Eléctrico', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Emergencia', estado: 'Buen estado', valorReposicion: 450000, cc: 'E' },
      { codigo: 'HERR-142', nombre: 'Escalera Telescópica Aluminio', marca: 'N/A', cantidad: 1, ubicacion: 'Bodega Mantención', estado: 'Operativa', valorReposicion: 85000, cc: 'I' },
    ]
    const ccMap: any = { B: ccB, A: ccA, I: ccI, E: ccE, As: ccAs }
    let hN = 0
    for (const h of herrs) { try { const ex = await db.catHerramienta.findUnique({ where: { codigo: h.codigo } }); if (!ex) { const { cc, ...data } = h; await db.catHerramienta.create({ data: { ...data, centroCostoId: ccMap[cc]?.id, condominioId: CID } }); hN++ } } catch {} }
    out.push(`  ${hN} herramientas`)

    // 7. Tareas
    out.push('7. Tareas...')
    const tars = [
      { codigo: 'MT-ELEC-01', nombre: 'Revisión tableros generales', categoria: 'Eléctrico', frecuencia: 'Trimestral' },
      { codigo: 'MT-ELEC-02', nombre: 'Medición resistencia de tierra', categoria: 'Eléctrico', frecuencia: 'Anual' },
      { codigo: 'MT-HID-01', nombre: 'Inspección bombas agua potable', categoria: 'Hidráulico', frecuencia: 'Mensual' },
      { codigo: 'MT-HID-02', nombre: 'Limpieza estanques', categoria: 'Hidráulico', frecuencia: 'Anual' },
      { codigo: 'MT-ASC-01', nombre: 'Mantención ascensor', categoria: 'Ascensores', frecuencia: 'Mensual' },
      { codigo: 'MT-GAS-01', nombre: 'Revisión salas de calderas', categoria: 'Gas', frecuencia: 'Trimestral' },
      { codigo: 'MT-SEG-01', nombre: 'Prueba alarmas incendio', categoria: 'Seguridad', frecuencia: 'Semanal' },
      { codigo: 'MT-INF-01', nombre: 'Inspección techos y canaletas', categoria: 'Infraestructura', frecuencia: 'Semestral' },
      { codigo: 'MT-ARV-01', nombre: 'Poda áreas verdes', categoria: 'Áreas Verdes', frecuencia: 'Mensual' },
      { codigo: 'MT-PIS-01', nombre: 'Medición pH y Cloro', categoria: 'Piscina', frecuencia: 'Diaria' },
      { codigo: 'MT-PIS-02', nombre: 'Mantención bombas piscina', categoria: 'Piscina', frecuencia: 'Semanal' },
    ]
    let tN = 0
    for (const t of tars) { try { const ex = await db.catTarea.findUnique({ where: { codigo: t.codigo } }); if (!ex) { await db.catTarea.create({ data: { ...t, tipoMantencion: 'Preventivo', esRecurrente: true, activa: true } }); tN++ } } catch {} }
    out.push(`  ${tN} tareas`)

    // 8. LVs PMI
    out.push('8. PMI...')
    try { const r = await fetch('https://condominios-cyj.vercel.app/api/pmi/seed', { method: 'POST' }); const d = await r.json(); out.push(`  ${d.creadas} creadas, ${d.actualizadas} act`) } catch (e: any) { out.push('  ' + e.message.substring(0, 50)) }

    out.push('CARGA COMPLETA')
  } catch (e: any) { out.push('ERROR: ' + e.message.substring(0, 100)) }
  return NextResponse.json({ success: true, out })
}
