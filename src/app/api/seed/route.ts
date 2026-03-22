import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

// POST - Seed initial data
export async function POST() {
  try {
    // Check if already seeded
    const existingPropiedades = await db.propiedad.count()
    if (existingPropiedades > 0) {
      return NextResponse.json({ message: 'Database already seeded' })
    }
    
    // ==========================================
    // CREAR USUARIO ADMINISTRADOR
    // ==========================================
    const hashedPassword = await hashPassword('Admin123!')
    
    await db.user.create({
      data: {
        email: 'admin@condominio.com',
        nombre: 'Administrador',
        apellido: 'Sistema',
        password: hashedPassword,
        rol: 'admin',
        activo: true,
        emailVerificado: new Date(),
      }
    })
    
    // ==========================================
    // DATOS INICIALES
    // ==========================================
    
    // Create initial caja chica
    await db.cajaChica.create({
      data: { saldo: 1000000, saldoInicial: 1000000 }
    })
    
    // Create centros de costo (modelo nuevo)
    await db.centroCostoMaster.createMany({
      data: [
        { codigo: 'CC-ADM-01', nombre: 'Administración y Gastos Generales', descripcion: 'Oficina, insumos de oficina, fotocopias, gastos bancarios', responsable: 'Administrador', tipoGasto: 'Fijo', presupuestoMens: 500000, presupuestoAnual: 6000000 },
        { codigo: 'CC-SEG-01', nombre: 'Seguridad y Vigilancia', descripcion: 'Contrato de vigilancia, mantención de cámaras, cercos eléctricos', responsable: 'Administrador', tipoGasto: 'Contrato', presupuestoMens: 1200000, presupuestoAnual: 14400000 },
        { codigo: 'CC-INF-01', nombre: 'Infraestructura y Obras Menores', descripcion: 'Pintura de fachadas, reparaciones de losas, canaletas, techos', responsable: 'Administrador', tipoGasto: 'Variable', presupuestoMens: 300000, presupuestoAnual: 3600000 },
        { codigo: 'CC-ASE-01', nombre: 'Aseo y Ornato', descripcion: 'Insumos de aseo, personal de aseo', responsable: 'Administrador', tipoGasto: 'Variable', presupuestoMens: 250000, presupuestoAnual: 3000000 },
      ]
    })
    
    // Create catálogo de materiales
    await db.catMaterial.createMany({
      data: [
        { codigo: 'MAT-ELEC-01', nombre: 'Foco LED 50W', unidad: 'unidad', precioUnit: 9800, categoria: 'Eléctrico' },
        { codigo: 'MAT-CONST-01', nombre: 'Arena', unidad: 'saco', precioUnit: 6500, categoria: 'Construcción' },
        { codigo: 'MAT-CONST-02', nombre: 'Cemento', unidad: 'saco', precioUnit: 25000, categoria: 'Construcción' },
        { codigo: 'MAT-CONST-03', nombre: 'Poste metálico', unidad: 'unidad', precioUnit: 32050, categoria: 'Construcción' },
        { codigo: 'MAT-ELEC-02', nombre: 'Cable eléctrico 2.5mm', unidad: 'metro', precioUnit: 1200, categoria: 'Eléctrico' },
      ]
    })
    
    // Create catálogo de herramientas
    await db.catHerramienta.createMany({
      data: [
        { codigo: 'HERR-01', nombre: 'Escalera aluminio 6m', cantidad: 2, ubicacion: 'Bodega A', estado: 'Bueno', valorReposicion: 120000 },
        { codigo: 'HERR-02', nombre: 'Taladro percutor', cantidad: 3, ubicacion: 'Bodega A', estado: 'Bueno', valorReposicion: 89000 },
        { codigo: 'HERR-03', nombre: 'Chuzo', cantidad: 2, ubicacion: 'Bodega B', estado: 'Bueno', valorReposicion: 15000 },
        { codigo: 'HERR-04', nombre: 'Carretilla', cantidad: 4, ubicacion: 'Bodega B', estado: 'Bueno', valorReposicion: 35000 },
      ]
    })
    
    // Create catálogo de tareas
    await db.catTarea.createMany({
      data: [
        { codigo: 'MT-GEN-01', nombre: 'Inspección visual', categoria: 'General', tipoMantencion: 'Preventivo', tiempoEstimado: 30 },
        { codigo: 'MT-GEN-02', nombre: 'Limpieza del área', categoria: 'General', tipoMantencion: 'Correctivo', tiempoEstimado: 60 },
        { codigo: 'MT-ELEC-01', nombre: 'Instalación eléctrica', categoria: 'Eléctrico', tipoMantencion: 'Correctivo', tiempoEstimado: 120 },
        { codigo: 'MT-CONST-01', nombre: 'Verificar nivel', categoria: 'Construcción', tipoMantencion: 'Preventivo', tiempoEstimado: 45 },
      ]
    })
    
    // Create sample propiedades
    await db.propiedad.createMany({
      data: [
        { nombre: 'Casa A-101', tipo: 'Casa', estado: 'Ocupado', direccion: 'Block A, Nº 101', habitaciones: 3, banos: 2, mts2: 85, precio: 500000, contacto: 'María González', telefono: '+56 9 1234 5678', email: 'maria@email.com' },
        { nombre: 'Depto B-202', tipo: 'Departamento', estado: 'Disponible', direccion: 'Block B, Nº 202', habitaciones: 2, banos: 1, mts2: 55, precio: 380000, contacto: '', telefono: '', email: '' },
      ]
    })
    
    // Create sample residentes
    await db.residente.createMany({
      data: [
        { nombre: 'María González', rut: '12.345.678-9', unidad: 'A-101', tipo: 'Residente', telefono: '+56 9 1234 5678', email: 'maria@email.com', fechaIngreso: '2022-01-15', estado: 'Activo' },
        { nombre: 'Pedro Soto', rut: '9.876.543-2', unidad: 'C-305', tipo: 'Residente', telefono: '+56 9 9876 5432', email: 'pedro@email.com', fechaIngreso: '2021-06-01', estado: 'Moroso' },
      ]
    })
    
    // Create sample personal
    await db.personal.createMany({
      data: [
        { nombre: 'Carlos Mendoza', rut: '15.234.567-8', cargo: 'Administrador', contrato: 'Indefinido', afp: 'ProVida', salud: 'Cruz del Norte', mutual: 'ACHS', fechaIngreso: '2020-03-01', sueldoBase: 1200000, movilizacion: 50000, colacion: 30000, estado: 'Activo', email: 'carlos@ln.cl', telefono: '+56 9 1111 2222' },
        { nombre: 'Ana Torres', rut: '14.111.222-3', cargo: 'Guardiana', contrato: 'Plazo Fijo', afp: 'Cuprum', salud: 'Fonasa', mutual: 'IST', fechaIngreso: '2023-01-01', sueldoBase: 680000, movilizacion: 30000, colacion: 20000, estado: 'Activo', email: 'ana@ln.cl', telefono: '+56 9 3333 4444' },
      ]
    })
    
    // Create sample activos
    await db.activo.createMany({
      data: [
        { nombre: 'Camioneta Ford Ranger', categoria: 'Vehículo', estado: 'Activo', ubicacion: 'Estacionamiento', serie: 'VIN-ABC123', fechaCompra: '2021-05-10', costoCompra: 15000000, valorActual: 12000000 },
        { nombre: 'Cortadora de Pasto Honda', categoria: 'Herramienta', estado: 'Activo', ubicacion: 'Bodega', serie: 'HM-2021-004', fechaCompra: '2022-02-01', costoCompra: 450000, valorActual: 350000 },
      ]
    })
    
    // Create sample proveedor
    await db.proveedor.create({
      data: {
        razonSocial: 'Full Services SpA',
        rut: '76.123.456-7',
        giro: 'Servicios de mantención',
        direccion: 'Av. Principal 100',
        comuna: 'Lampa',
        telCorp: '+56 2 1234 5678',
        emailCorp: 'contacto@fullservices.cl',
        web: 'www.fullservices.cl',
        contacto: 'Juan Rojas',
        cargo: 'Gerente',
        telDirecto: '+56 9 8765 4321',
        emailContacto: 'juan@fullservices.cl',
        celular: '+56 9 8765 4321',
        estado: 'Activo',
      }
    })
    
    return NextResponse.json({ message: 'Database seeded successfully' })
  } catch (error) {
    console.error('Error seeding database:', error)
    return NextResponse.json({ error: 'Error seeding database' }, { status: 500 })
  }
}
