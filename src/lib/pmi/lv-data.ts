// ============================================
// PMI - PLAN DE MANTENIMIENTO INTEGRAL
// 20 Listas de Verificación (LV-01 a LV-20)
// Basado en PDF: LV_Mantenimiento_LagunaNorte_CyJ_2026.pdf
// ============================================

export interface LVSeccion {
  seccion: string
  titulo: string
  items: string[]
}

export interface LVData {
  codigo: string
  nombre: string
  sector: string
  frecuencia: string
  responsable: string
  personalRequerido?: string
  descripcion: string
  items: string // JSON.stringify(LVSeccion[])
}

export const LV_DATA: LVData[] = [
  {
    codigo: 'LV-01',
    nombre: 'Dotación diaria de personal y EPP',
    sector: 'General — Todos los sectores',
    frecuencia: 'Diaria',
    responsable: 'Jefe de Mantenimiento',
    personalRequerido: '13 personas',
    descripcion: 'Verificación diaria de dotación de personal y EPP al inicio de jornada',
    items: JSON.stringify([
      {
        seccion: 'A',
        titulo: 'Verificación de dotación de personal',
        items: [
          'Jefe de Operaciones presente',
          'Supervisor de Operaciones presente',
          'Auxiliar de Servicios Generales presente',
          'Auxiliar de Aseo Full Time presente (×3)',
          'Lagunero presente',
          'Mantención Electricista presente',
          'Mantención A y B presentes',
        ],
      },
      {
        seccion: 'B',
        titulo: 'Verificación de EPP por puesto',
        items: [
          'Guantes de cuero asignados',
          'Guantes de nitrilo asignados',
          'Antiparras asignadas',
          'Protector auditivo asignado',
          'Mascarilla asignada',
          'Chaleco reflectante asignado',
          'Botas de seguridad asignadas',
          'Protector solar SPF 50+ asignado',
          'EPP completo verificado por trabajador',
        ],
      },
      {
        seccion: 'C',
        titulo: 'Novedades de inicio de jornada',
        items: [
          'Reunión de inicio de jornada realizada (07:00 hrs)',
          'Novedades de la noche anterior comunicadas',
          'Tareas del día asignadas a cada trabajador',
          'Condiciones climáticas verificadas',
          'Riesgos del día identificados y comunicados',
        ],
      },
    ]),
  },
  {
    codigo: 'LV-02',
    nombre: 'Laguna artificial — Control diario de agua',
    sector: 'Laguna',
    frecuencia: 'Diaria',
    responsable: 'Operario de Laguna',
    personalRequerido: '1 operario',
    descripcion: 'Control diario de calidad del agua e inspección perimetral de la laguna',
    items: JSON.stringify([
      {
        seccion: 'A',
        titulo: 'EPP y materiales requeridos',
        items: [
          'Guantes de nitrilo',
          'Antiparras',
          'Chaleco reflectante',
          'Botas de goma',
          'Mascarilla N95',
          'Protector solar SPF 50+',
          'pH-metro calibrado',
          'Turbidímetro',
          'Termómetro digital',
          'Planilla de registro',
          'Sacos para residuos',
          'Rastrillo de mango largo',
        ],
      },
      {
        seccion: 'B',
        titulo: 'Mediciones de calidad del agua (3 puntos)',
        items: [
          'Punto 1 - pH entre 7.2 y 8.0',
          'Punto 1 - Turbidez < 10 NTU',
          'Punto 1 - Temperatura entre 15°C y 28°C',
          'Punto 1 - Oxígeno disuelto ≥ 5 mg/L',
          'Punto 2 - pH entre 7.2 y 8.0',
          'Punto 2 - Turbidez < 10 NTU',
          'Punto 2 - Temperatura entre 15°C y 28°C',
          'Punto 2 - Oxígeno disuelto ≥ 5 mg/L',
          'Punto 3 - pH entre 7.2 y 8.0',
          'Punto 3 - Turbidez < 10 NTU',
          'Punto 3 - Temperatura entre 15°C y 28°C',
          'Punto 3 - Oxígeno disuelto ≥ 5 mg/L',
          'Aspecto visual del agua claro, sin espuma',
        ],
      },
      {
        seccion: 'C',
        titulo: 'Inspección visual perimetral',
        items: [
          'Color del agua normal',
          'Sin presencia de espuma',
          'Sin olores extraños',
          'Bordes sin grietas',
          'Cierros perimetrales en buen estado',
          'Embarcadero sin daños',
          'Rack de botes operativo',
          'Playas sin residuos',
          'Señalética visible y legible',
          'Sin fauna muerta en el agua o bordes',
          'Sistema de aireación funcionando',
        ],
      },
      {
        seccion: 'D',
        titulo: 'Dosificaciones realizadas',
        items: [
          'Floculante dosificado según protocolo',
          'Algicida dosificado según protocolo',
          'Otros químicos dosificados (especificar)',
          'Registro de dosificación firmado',
        ],
      },
    ]),
  },
  {
    codigo: 'LV-03',
    nombre: 'Piscinas 1-2-3 — Control diario de agua y limpieza',
    sector: 'Piscinas 1-2-3',
    frecuencia: 'Diaria',
    responsable: 'Operario de Piscinas',
    personalRequerido: '1 operario',
    descripcion: 'Control diario de parámetros de agua y limpieza de las 3 piscinas',
    items: JSON.stringify([
      {
        seccion: 'A',
        titulo: 'EPP y equipos',
        items: [
          'Guantes de nitrilo',
          'Antiparras',
          'Mascarilla',
          'Colorímetro DPD',
          'pH-metro calibrado',
          'Termómetro digital',
          'Cepillo de paredes',
          'Mango telescópico',
          'Skimmer',
          'Robot aspirador',
          'Planilla de registro',
        ],
      },
      {
        seccion: 'B',
        titulo: 'Medición de parámetros mañana 08:30',
        items: [
          'Piscina 1 - pH entre 7.2 y 7.6',
          'Piscina 1 - Cloro entre 1.0 y 3.0 ppm',
          'Piscina 1 - Temperatura entre 24°C y 28°C',
          'Piscina 2 - pH entre 7.2 y 7.6',
          'Piscina 2 - Cloro entre 1.0 y 3.0 ppm',
          'Piscina 2 - Temperatura entre 24°C y 28°C',
          'Piscina 3 - pH entre 7.2 y 7.6',
          'Piscina 3 - Cloro entre 1.0 y 3.0 ppm',
          'Piscina 3 - Temperatura entre 24°C y 28°C',
        ],
      },
      {
        seccion: 'C',
        titulo: 'Medición de parámetros tarde 15:00',
        items: [
          'Piscina 1 - pH entre 7.2 y 7.6',
          'Piscina 1 - Cloro entre 1.0 y 3.0 ppm',
          'Piscina 1 - Temperatura entre 24°C y 28°C',
          'Piscina 2 - pH entre 7.2 y 7.6',
          'Piscina 2 - Cloro entre 1.0 y 3.0 ppm',
          'Piscina 2 - Temperatura entre 24°C y 28°C',
          'Piscina 3 - pH entre 7.2 y 7.6',
          'Piscina 3 - Cloro entre 1.0 y 3.0 ppm',
          'Piscina 3 - Temperatura entre 24°C y 28°C',
        ],
      },
      {
        seccion: 'D',
        titulo: 'Limpieza diaria por piscina',
        items: [
          'Piscina 1 - Robot aspirador corrido',
          'Piscina 1 - Cepillado de paredes',
          'Piscina 1 - Prefiltro de bomba limpio',
          'Piscina 1 - Debris flotante retirado',
          'Piscina 1 - Cesto skimmer limpio',
          'Piscina 1 - Borde perimetral limpio',
          'Piscina 1 - Habilitada para uso',
          'Piscina 2 - Robot aspirador corrido',
          'Piscina 2 - Cepillado de paredes',
          'Piscina 2 - Prefiltro de bomba limpio',
          'Piscina 2 - Debris flotante retirado',
          'Piscina 2 - Cesto skimmer limpio',
          'Piscina 2 - Borde perimetral limpio',
          'Piscina 2 - Habilitada para uso',
          'Piscina 3 - Robot aspirador corrido',
          'Piscina 3 - Cepillado de paredes',
          'Piscina 3 - Prefiltro de bomba limpio',
          'Piscina 3 - Debris flotante retirado',
          'Piscina 3 - Cesto skimmer limpio',
          'Piscina 3 - Borde perimetral limpio',
          'Piscina 3 - Habilitada para uso',
        ],
      },
    ]),
  },
  {
    codigo: 'LV-04',
    nombre: 'Playas artificiales — Rastrillado y limpieza diaria',
    sector: 'Playas 1-2-3',
    frecuencia: 'Diaria',
    responsable: 'Operario Laguna + Jardinero',
    personalRequerido: '2 personas',
    descripcion: 'Rastrillado y limpieza diaria de las playas artificiales',
    items: JSON.stringify([
      {
        seccion: 'A',
        titulo: 'Herramientas y materiales',
        items: [
          'Rastrillo de playa',
          'Rastrillo metálico',
          'Sacos 240 L',
          'Guantes de trabajo',
          'Chaleco reflectante',
          'Botas de goma',
          'Carretilla',
          'Cinta de señalización',
        ],
      },
      {
        seccion: 'B',
        titulo: 'Lista de verificación por playa',
        items: [
          'Playa 1 - Rastrillado profundo realizado',
          'Playa 1 - Retiro de residuos completado',
          'Playa 1 - Sin presencia de vidrios',
          'Playa 1 - Nivelación de arena',
          'Playa 1 - Verificación profundidad 30 cm',
          'Playa 1 - Limpieza de accesos',
          'Playa 1 - Señalética en buen estado',
          'Playa 1 - Reposeras limpias y ordenadas',
          'Playa 1 - Sin fauna nociva',
          'Playa 2 - Rastrillado profundo realizado',
          'Playa 2 - Retiro de residuos completado',
          'Playa 2 - Sin presencia de vidrios',
          'Playa 2 - Nivelación de arena',
          'Playa 2 - Verificación profundidad 30 cm',
          'Playa 2 - Limpieza de accesos',
          'Playa 2 - Señalética en buen estado',
          'Playa 2 - Reposeras limpias y ordenadas',
          'Playa 2 - Sin fauna nociva',
          'Playa 3 - Rastrillado profundo realizado',
          'Playa 3 - Retiro de residuos completado',
          'Playa 3 - Sin presencia de vidrios',
          'Playa 3 - Nivelación de arena',
          'Playa 3 - Verificación profundidad 30 cm',
          'Playa 3 - Limpieza de accesos',
          'Playa 3 - Señalética en buen estado',
          'Playa 3 - Reposeras limpias y ordenadas',
          'Playa 3 - Sin fauna nociva',
        ],
      },
    ]),
  },
  {
    codigo: 'LV-05',
    nombre: 'Aseo y limpieza áreas comunes',
    sector: 'Club House / Ciclovía / Estacionamientos',
    frecuencia: 'Diaria',
    responsable: 'Auxiliar de Aseo',
    personalRequerido: '2 operarios (A y B)',
    descripcion: 'Aseo y limpieza diaria de áreas comunes interiores y exteriores',
    items: JSON.stringify([
      {
        seccion: 'A',
        titulo: 'Insumos y herramientas de aseo',
        items: [
          'Escoba',
          'Recogedor',
          'Trapeador',
          'Balde',
          'Detergentes',
          'Desinfectante',
          'Bolsas de basura',
          'Papel higiénico',
          'Jabón de manos',
          'Toallas de papel',
        ],
      },
      {
        seccion: 'B',
        titulo: 'Verificación operario Aseo A - Club House',
        items: [
          'Piso de entrada limpio',
          'Recepción limpia y ordenada',
          'Baños limpios y desinfectados',
          'Cocina limpia',
          'Salón de eventos limpio',
          'Ventanas limpias',
          'Basureros vaciados',
          'Reposición de insumos en baños',
        ],
      },
      {
        seccion: 'C',
        titulo: 'Verificación operario Aseo B - Exteriores',
        items: [
          'Ciclovía barrida',
          'Senderos peatonales limpios',
          'Estacionamientos limpios',
          'Basureros exteriores vaciados',
          'Señalética exterior limpia',
          'Bancos limpios',
          'Cánteras sin residuos',
        ],
      },
    ]),
  },
  {
    codigo: 'LV-06',
    nombre: 'Inspección visual juegos infantiles',
    sector: 'Juegos Infantiles (5 sectores)',
    frecuencia: 'Diaria',
    responsable: 'Auxiliar de Servicios Generales',
    personalRequerido: '1 operario',
    descripcion: 'Inspección visual diaria de juegos infantiles en 5 sectores',
    items: JSON.stringify([
      {
        seccion: 'A',
        titulo: 'Materiales',
        items: [
          'Linterna',
          'Llave allen',
          'Cinta métrica',
          'Cámara fotográfica',
          'Planilla de registro',
        ],
      },
      {
        seccion: 'B',
        titulo: 'Inspección por sector - seguridad inmediata',
        items: [
          'Sector 1 - Estructura sin piezas sueltas',
          'Sector 1 - Cadenas de columpios en buen estado',
          'Sector 1 - Tobogán sin bordes filosos',
          'Sector 1 - Anclajes firmes',
          'Sector 1 - Arena con profundidad 30 cm',
          'Sector 1 - Sin objetos extraños',
          'Sector 1 - Señalética visible',
          'Sector 1 - Pintura en buen estado',
          'Sector 2 - Estructura sin piezas sueltas',
          'Sector 2 - Cadenas de columpios en buen estado',
          'Sector 2 - Tobogán sin bordes filosos',
          'Sector 2 - Anclajes firmes',
          'Sector 2 - Arena con profundidad 30 cm',
          'Sector 2 - Sin objetos extraños',
          'Sector 2 - Señalética visible',
          'Sector 2 - Pintura en buen estado',
          'Sector 3 - Estructura sin piezas sueltas',
          'Sector 3 - Cadenas de columpios en buen estado',
          'Sector 3 - Tobogán sin bordes filosos',
          'Sector 3 - Anclajes firmes',
          'Sector 3 - Arena con profundidad 30 cm',
          'Sector 3 - Sin objetos extraños',
          'Sector 3 - Señalética visible',
          'Sector 3 - Pintura en buen estado',
          'Sector 4 - Estructura sin piezas sueltas',
          'Sector 4 - Anclajes firmes',
          'Sector 4 - Sin objetos extraños',
          'Sector 5 - Estructura sin piezas sueltas',
          'Sector 5 - Anclajes firmes',
          'Sector 5 - Sin objetos extraños',
        ],
      },
      {
        seccion: 'C',
        titulo: 'Sectores con cierre preventivo',
        items: [
          'Motivo del cierre documentado',
          'Acción tomada registrada',
          'Comunicado a Jefe de Mantenimiento',
        ],
      },
    ]),
  },
  {
    codigo: 'LV-07',
    nombre: 'Laguna — Control semanal técnico',
    sector: 'Laguna',
    frecuencia: 'Semanal',
    responsable: 'Operario de Laguna',
    personalRequerido: '1 operario',
    descripcion: 'Mantenimiento técnico semanal de la laguna artificial',
    items: JSON.stringify([
      {
        seccion: 'A',
        titulo: 'EPP y herramientas de la semana',
        items: [
          'Botas de goma',
          'Guantes de nitrilo',
          'Mascarilla',
          'Medidor de oxígeno disuelto',
          'Termómetro',
          'Turbidímetro',
          'Kit de algicida',
          'Cepillo de muros',
          'Hidrolavadora',
        ],
      },
      {
        seccion: 'B',
        titulo: 'Tareas semanales de la laguna',
        items: [
          'Limpieza de muros perimetrales',
          'Retiro de algas',
          'Revisión de bombas de circulación',
          'Limpieza de prefiltros',
          'Inspección de aeradores',
          'Retiro de maleza acuática',
          'Revisión del nivel de agua',
        ],
      },
      {
        seccion: 'C',
        titulo: 'Registro de parámetros de la semana',
        items: [
          'Tendencia de pH registrada',
          'Tendencia de turbidez registrada',
          'Tendencia de oxígeno registrada',
          'Tendencia de temperatura registrada',
        ],
      },
    ]),
  },
  {
    codigo: 'LV-08',
    nombre: 'Piscinas — Mantenimiento semanal',
    sector: 'Piscinas 1-2-3',
    frecuencia: 'Semanal',
    responsable: 'Operario de Piscinas',
    personalRequerido: '1 operario',
    descripcion: 'Mantenimiento semanal de las piscinas: retrolavado y limpieza profunda',
    items: JSON.stringify([
      {
        seccion: 'A',
        titulo: 'Herramientas y materiales de la semana',
        items: [
          'Cepillo de paredes',
          'Mango telescópico',
          'Skimmer',
          'Kit de retrolavado de filtros',
          'Carbón activado',
          'Cloro granulado',
          'Ácido muriático',
          'Soda cáustica',
        ],
      },
      {
        seccion: 'B',
        titulo: 'Retrolavado de filtros',
        items: [
          'Piscina 1 - Presión del filtro < 0.5 bar',
          'Piscina 1 - Ciclo de retrolavado ejecutado',
          'Piscina 1 - Enjuague realizado',
          'Piscina 1 - Retorno a filtración verificado',
          'Piscina 2 - Presión del filtro < 0.5 bar',
          'Piscina 2 - Ciclo de retrolavado ejecutado',
          'Piscina 2 - Enjuague realizado',
          'Piscina 2 - Retorno a filtración verificado',
          'Piscina 3 - Presión del filtro < 0.5 bar',
          'Piscina 3 - Ciclo de retrolavado ejecutado',
          'Piscina 3 - Enjuague realizado',
          'Piscina 3 - Retorno a filtración verificado',
        ],
      },
      {
        seccion: 'C',
        titulo: 'Otras tareas semanales',
        items: [
          'Limpieza profunda de bordes',
          'Verificación de bombas',
          'Calibración de dosificadores',
          'Limpieza de casa de bomba',
          'Revisión de iluminación submarina',
        ],
      },
    ]),
  },
  {
    codigo: 'LV-09',
    nombre: 'Áreas verdes — Tareas semanales',
    sector: 'Jardines / Prados',
    frecuencia: 'Semanal',
    responsable: 'Jardinero General',
    personalRequerido: '1 jardinero',
    descripcion: 'Corte, bordeado y verificación semanal del sistema de riego',
    items: JSON.stringify([
      {
        seccion: 'A',
        titulo: 'Maquinaria y herramientas',
        items: [
          'Podadora',
          'Bordeadora',
          'Soplador',
          'Rastrillo',
          'Pala',
          'Regadera',
          'Manguera',
          'Tijeras de poda',
        ],
      },
      {
        seccion: 'B',
        titulo: 'Tareas de corte y bordeado por sector',
        items: [
          'Corte de césped a altura 5 cm',
          'Bordeado de senderos',
          'Retiro de restos vegetales',
          'Soplado de áreas',
        ],
      },
      {
        seccion: 'C',
        titulo: 'Verificación del sistema de riego',
        items: [
          'Aspersores con giro completo',
          'Goteros sin obstrucción',
          'Sin charcos en prados',
          'Sin manchas amarillas',
          'Sin malezas en canteros',
        ],
      },
    ]),
  },
  {
    codigo: 'LV-10',
    nombre: 'Ciclovía y sendero peatonal — Mantenimiento',
    sector: 'Ciclovía / Sendero',
    frecuencia: 'Semanal',
    responsable: 'Auxiliar de Servicios Generales',
    personalRequerido: '1 operario',
    descripcion: 'Mantenimiento semanal de ciclovía y senderos peatonales',
    items: JSON.stringify([
      {
        seccion: 'A',
        titulo: 'Herramientas y materiales',
        items: [
          'Escoba',
          'Soplador',
          'Cepillo',
          'Hidrolavadora',
          'Pintura demarcatoria',
          'Conos de señalización',
        ],
      },
      {
        seccion: 'B',
        titulo: 'Verificación de tareas semanales',
        items: [
          'Barrido completo de la ciclovía',
          'Soplado de la superficie',
          'Limpieza de cunetas',
          'Revisión de fisuras',
          'Demarcación de líneas',
          'Limpieza de drenajes',
        ],
      },
      {
        seccion: 'C',
        titulo: 'Mapa de daños detectados en pavimento',
        items: [
          'Fisuras identificadas y georreferenciadas',
          'Hundimientos identificados y georreferenciados',
          'Baches identificados y georreferenciados',
          'Desniveles identificados y georreferenciados',
        ],
      },
    ]),
  },
  {
    codigo: 'LV-11',
    nombre: 'Inspección quincenal infraestructura',
    sector: 'Ciclovía / Muelles / Iluminación',
    frecuencia: 'Quincenal',
    responsable: 'Jefe de Mantenimiento',
    personalRequerido: 'Jefe de Mantenimiento + 1 técnico',
    descripcion: 'Inspección quincenal integral de infraestructura',
    items: JSON.stringify([
      {
        seccion: 'A',
        titulo: 'Equipos y herramientas',
        items: [
          'Linterna',
          'Multímetro',
          'Juego de llaves',
          'Cámara fotográfica',
          'Escalera',
          'Cinta métrica',
        ],
      },
      {
        seccion: 'B',
        titulo: 'Muelles, embarcadero y rack de botes',
        items: [
          'Estructura sin fisuras',
          'Madera sin pudrición',
          'Anclajes firmes',
          'Barandas en buen estado',
          'Pintura en buen estado',
        ],
      },
      {
        seccion: 'C',
        titulo: 'Iluminación exterior - circuito nocturno',
        items: [
          'Recorrido nocturno realizado',
          'Luminarias activas',
          'Postes sin inclinación',
          'Cables sin exposición',
        ],
      },
      {
        seccion: 'D',
        titulo: 'Cierros, portones y accesos',
        items: [
          'Malla perimetral sin roturas',
          'Portones operativos',
          'Cerraduras funcionando',
          'Bisagras lubricadas',
        ],
      },
    ]),
  },
  {
    codigo: 'LV-12',
    nombre: 'Piscinas 1-2-3 — Análisis quincenal completo',
    sector: 'Piscinas 1-2-3',
    frecuencia: 'Quincenal',
    responsable: 'Operario de Piscinas',
    personalRequerido: '1 operario',
    descripcion: 'Análisis quincenal completo de parámetros de agua de piscinas',
    items: JSON.stringify([
      {
        seccion: 'A',
        titulo: 'Materiales y equipos',
        items: [
          'Kit de análisis completo',
          'Turbidímetro',
          'Medidor de cloro digital',
          'pH-metro',
          'Termómetro',
        ],
      },
      {
        seccion: 'B',
        titulo: 'Análisis completo de parámetros',
        items: [
          'Cloro libre medido',
          'Cloro combinado medido',
          'pH medido',
          'Alcalinidad total medida',
          'Dureza cálcica medida',
          'Ácido cianúrico medido',
          'Hierro medido',
          'Cobre medido',
        ],
      },
      {
        seccion: 'C',
        titulo: 'Revisión de dosificadores automáticos',
        items: [
          'Calibración de dosificadores verificada',
          'Flujo de dosificadores correcto',
          'Depósitos de químicos con nivel adecuado',
          'Mangueras sin obstrucción ni fugas',
        ],
      },
    ]),
  },
  {
    codigo: 'LV-13',
    nombre: 'Áreas verdes — Mantenimiento mensual',
    sector: 'Jardines / Prados',
    frecuencia: 'Mensual',
    responsable: 'Jardinero General',
    personalRequerido: '1 jardinero',
    descripcion: 'Mantenimiento mensual de áreas verdes: prados, árboles y arbustos',
    items: JSON.stringify([
      {
        seccion: 'A',
        titulo: 'Materiales e insumos del mes',
        items: [
          'Fertilizante',
          'Tierra de hoja',
          'Semillas',
          'Plaguicida',
          'Fungicida',
        ],
      },
      {
        seccion: 'B',
        titulo: 'Estado de prados por sector',
        items: [
          'Evaluación de densidad del césped',
          'Evaluación de color del césped',
          'Identificación de malezas',
          'Identificación de áreas secas',
        ],
      },
      {
        seccion: 'C',
        titulo: 'Revisión de árboles y arbustos',
        items: [
          'Poda de ramas secas',
          'Revisión de copas',
          'Verificación de anclajes',
          'Inspección de plagas',
          'Inspección de enfermedades',
        ],
      },
    ]),
  },
  {
    codigo: 'LV-14',
    nombre: 'Laguna — Revisión mensual sala de máquinas',
    sector: 'Laguna / Sala de máquinas',
    frecuencia: 'Mensual',
    responsable: 'Técnico en Maquinarias',
    personalRequerido: '1 técnico',
    descripcion: 'Revisión mensual de equipos de la sala de máquinas de la laguna',
    items: JSON.stringify([
      {
        seccion: 'A',
        titulo: 'Equipos y herramientas',
        items: [
          'Multímetro',
          'Termómetro infrarrojo',
          'Juego de llaves',
          'Destornillador',
          'Prensa de mordazas',
        ],
      },
      {
        seccion: 'B',
        titulo: 'Verificación de equipos de sala de máquinas',
        items: [
          'Bombas de circulación operativas',
          'Motor sin ruidos anormales',
          'Sellado de bombas correcto',
          'Rodamientos en buen estado',
          'Amperaje dentro de rango nominal',
          'Temperatura de motor dentro de rango',
          'Tablero eléctrico limpio y ordenado',
          'Protecciones eléctricas operativas',
        ],
      },
    ]),
  },
  {
    codigo: 'LV-15',
    nombre: 'Club House — Mantención mensual integral',
    sector: 'Club House / Canchas / Quinchos',
    frecuencia: 'Mensual',
    responsable: 'Jefe de Mantenimiento',
    personalRequerido: 'Jefe de Mantenimiento + 2 técnicos',
    descripcion: 'Mantención mensual integral de instalaciones del Club House y anexos',
    items: JSON.stringify([
      {
        seccion: 'A',
        titulo: 'Materiales para mantención mensual',
        items: [
          'Pintura',
          'Silicona',
          'Sellos',
          'Filtros',
          'Bombillas',
          'Herramientas manuales',
        ],
      },
      {
        seccion: 'B',
        titulo: 'Verificación de instalaciones eléctricas',
        items: [
          'Tablero principal revisado',
          'Disyuntores operativos',
          'Iluminación funcional',
          'Enchufes funcionales',
          'Cables sin deterioro',
        ],
      },
      {
        seccion: 'C',
        titulo: 'Verificación de instalaciones sanitarias y civil',
        items: [
          'Grifería operativa',
          'Inodoros operativos',
          'Cañerías sin fugas',
          'Baldosas en buen estado',
          'Pintura en buen estado',
          'Puertas operativas',
        ],
      },
    ]),
  },
  {
    codigo: 'LV-16',
    nombre: 'Juegos infantiles — Inspección técnica mensual',
    sector: 'Juegos Infantiles',
    frecuencia: 'Mensual',
    responsable: 'Jefe de Mantenimiento',
    personalRequerido: '1 técnico',
    descripcion: 'Inspección técnica estructural mensual de juegos infantiles',
    items: JSON.stringify([
      {
        seccion: 'A',
        titulo: 'Herramientas de inspección técnica',
        items: [
          'Llave de torque',
          'Dinamómetro',
          'Cinta métrica',
          'Nivel de burbuja',
          'Cámara fotográfica',
        ],
      },
      {
        seccion: 'B',
        titulo: 'Inspección técnica estructural por sector',
        items: [
          'Torque de tornillos verificado',
          'Deformación de piezas medida',
          'Corrosión inspeccionada',
          'Fatiga de material evaluada',
          'Anclajes estructurales firmes',
        ],
      },
      {
        seccion: 'C',
        titulo: 'Lubricación de articulaciones',
        items: [
          'Columpios lubricados',
          'Balancines lubricados',
          'Bisagras lubricadas',
        ],
      },
    ]),
  },
  {
    codigo: 'LV-17',
    nombre: 'Estacionamientos y acceso — Mantención mensual',
    sector: 'Estacionamientos / Acceso',
    frecuencia: 'Mensual',
    responsable: 'Personal de Mantención',
    personalRequerido: '1 operario',
    descripcion: 'Mantención mensual de estacionamientos y accesos vehiculares',
    items: JSON.stringify([
      {
        seccion: 'A',
        titulo: 'Herramientas y materiales',
        items: [
          'Pintura',
          'Brocha',
          'Rodillo',
          'Cepillo',
          'Hidrolavadora',
          'Conos de señalización',
        ],
      },
      {
        seccion: 'B',
        titulo: 'Verificación mensual',
        items: [
          'Demarcación de puestos visible',
          'Señalización vertical en buen estado',
          'Barrera de acceso operativa',
          'Iluminación de acceso funcional',
          'Drenajes sin obstrucción',
          'Pavimento sin daños mayores',
        ],
      },
    ]),
  },
  {
    codigo: 'LV-18',
    nombre: 'Mantención mayor trimestral',
    sector: 'Todos los sectores críticos',
    frecuencia: 'Trimestral',
    responsable: 'Jefe de Mantenimiento',
    personalRequerido: 'Empresas externas + personal interno',
    descripcion: 'Mantención mayor trimestral con empresas especializadas',
    items: JSON.stringify([
      {
        seccion: 'A',
        titulo: 'Personal y empresas convocadas',
        items: [
          'Electricista convocado',
          'Gasfíter convocado',
          'Pintor convocado',
          'Empresa de limpieza especializada convocada',
        ],
      },
      {
        seccion: 'B',
        titulo: 'Laguna - actividades trimestrales',
        items: [
          'Vaciado parcial de la laguna realizado',
          'Limpieza profunda de la laguna realizada',
          'Calibración de equipos de la laguna realizada',
        ],
      },
      {
        seccion: 'C',
        titulo: 'Piscinas - actividades trimestrales',
        items: [
          'Análisis de laboratorio realizado',
          'Limpieza profunda de filtros realizada',
        ],
      },
      {
        seccion: 'D',
        titulo: 'Juegos infantiles - actividades trimestrales',
        items: [
          'Certificación NCh 2926 gestionada',
          'Reemplazo de piezas deterioradas realizado',
        ],
      },
    ]),
  },
  {
    codigo: 'LV-19',
    nombre: 'Revisión semestral completa',
    sector: 'Condominio completo',
    frecuencia: 'Semestral',
    responsable: 'Jefe de Mantenimiento',
    personalRequerido: 'Jefe de Mantenimiento + entes certificadores',
    descripcion: 'Revisión semestral completa del estado del condominio',
    items: JSON.stringify([
      {
        seccion: 'A',
        titulo: 'Certificaciones y servicios externos',
        items: [
          'Certificación de ascensores al día',
          'Certificación de extintores al día',
          'Certificación eléctrica al día',
          'Certificación de gas al día',
          'Certificación de agua al día',
        ],
      },
      {
        seccion: 'B',
        titulo: 'Estado de conservación por sector (escala 1-4)',
        items: [
          'Laguna evaluada',
          'Piscinas evaluadas',
          'Club House evaluado',
          'Áreas verdes evaluadas',
          'Ciclovía evaluada',
          'Estacionamientos evaluados',
        ],
      },
      {
        seccion: 'C',
        titulo: 'Presupuesto semestral - ejecución vs planificado',
        items: [
          'Ejecución presupuestaria vs planificado revisada',
          'Desviaciones identificadas y justificadas',
        ],
      },
    ]),
  },
  {
    codigo: 'LV-20',
    nombre: 'Revisión anual — Certificaciones y estado',
    sector: 'Condominio completo',
    frecuencia: 'Anual',
    responsable: 'Ente Certificador',
    personalRequerido: 'Entes certificadores + Jefe de Mantenimiento',
    descripcion: 'Revisión anual de certificaciones y estado integral del condominio',
    items: JSON.stringify([
      {
        seccion: 'A',
        titulo: 'Certificaciones obligatorias con vigencia al 31 de diciembre',
        items: [
          'Certificación eléctrica vigente',
          'Certificación de gas vigente',
          'Certificación de ascensores vigente',
          'Certificación de piscina vigente',
          'Certificación de estructura vigente',
        ],
      },
      {
        seccion: 'B',
        titulo: 'KPIs anuales - resultados finales',
        items: [
          'Cumplimiento de LV anual medido',
          'OT completadas anual contabilizada',
          'Gasto total anual consolidado',
          'Quejas de residentes anuales contabilizadas',
        ],
      },
      {
        seccion: 'C',
        titulo: 'Revisión y aprobación del plan para el próximo año',
        items: [
          'Plan PMI del próximo año revisado',
          'Plan PMI del próximo año aprobado',
        ],
      },
    ]),
  },
]

// ============================================
// LÓGICA DE PROGRAMACIÓN POR FRECUENCIA
// ============================================

/**
 * Determina si una LV debe ejecutarse en una fecha específica.
 * - Diaria: todos los días
 * - Semanal: todos los lunes
 * - Quincenal: días 1 y 15 de cada mes
 * - Mensual: día 1 de cada mes
 * - Trimestral: día 1 de ene/abr/jul/oct
 * - Semestral: día 1 de ene/jul
 * - Anual: día 1 de enero
 */
export function leCorrespondeALaFecha(frecuencia: string, fecha: Date): boolean {
  const diaSemana = fecha.getDay() // 0=Domingo, 1=Lunes
  const diaMes = fecha.getDate()
  const mes = fecha.getMonth() // 0=Enero

  switch (frecuencia) {
    case 'Diaria':
      return true
    case 'Semanal':
      return diaSemana === 1 // Lunes
    case 'Quincenal':
      return diaMes === 1 || diaMes === 15
    case 'Mensual':
      return diaMes === 1
    case 'Trimestral':
      return diaMes === 1 && (mes === 0 || mes === 3 || mes === 6 || mes === 9) // ene, abr, jul, oct
    case 'Semestral':
      return diaMes === 1 && (mes === 0 || mes === 6) // ene, jul
    case 'Anual':
      return diaMes === 1 && mes === 0 // 1 de enero
    default:
      return false
  }
}

export const FRECUENCIAS = [
  'Diaria',
  'Semanal',
  'Quincenal',
  'Mensual',
  'Trimestral',
  'Semestral',
  'Anual',
] as const

export const COLOR_FRECUENCIA: Record<string, string> = {
  Diaria: 'azul',
  Semanal: 'verde',
  Quincenal: 'naranja',
  Mensual: 'purpura',
  Trimestral: 'cyan',
  Semestral: 'rose',
  Anual: 'rojo',
}

// Tailwind classes para badges de frecuencia
export const BADGE_FRECUENCIA: Record<string, string> = {
  Diaria: 'bg-blue-100 text-blue-700 border-blue-200',
  Semanal: 'bg-green-100 text-green-700 border-green-200',
  Quincenal: 'bg-amber-100 text-amber-700 border-amber-200',
  Mensual: 'bg-purple-100 text-purple-700 border-purple-200',
  Trimestral: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  Semestral: 'bg-rose-100 text-rose-700 border-rose-200',
  Anual: 'bg-red-100 text-red-700 border-red-200',
}

// Punto de color para el calendario
export const DOT_FRECUENCIA: Record<string, string> = {
  Diaria: 'bg-blue-500',
  Semanal: 'bg-green-500',
  Quincenal: 'bg-amber-500',
  Mensual: 'bg-purple-500',
  Trimestral: 'bg-cyan-500',
  Semestral: 'bg-rose-500',
  Anual: 'bg-red-500',
}
