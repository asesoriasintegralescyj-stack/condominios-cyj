import { NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'

/**
 * Crea los puntos QR de guardia + perfiles de guardia y conserje.
 * Usa la tabla Ronda (sistema escritorio) y MovilQrLocation (app móvil).
 * Ambas comparten la misma BD Aiven.
 */
export async function POST() {
  const session = await getCurrentSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  if (session.user.rol !== 'admin') return NextResponse.json({ error: 'Solo admin' }, { status: 403 })

  try {
    const resultados: any = { rondas: [], perfiles: [], qr_locations: [] }

    // 1. Crear puntos QR de guardia (Ronda)
    const puntosQR = [
      { nombre: 'Portería Principal', codigo: 'QR-PORTERIA', ubicacion: 'Entrada principal del condominio', etapa: 'PORTERIA', post: 'PRINCIPAL' },
      { nombre: 'Club House', codigo: 'QR-CLUBHOUSE', ubicacion: 'Hall del Club House', etapa: 'CLUBHOUSE', post: 'CLUB' },
      { nombre: 'Piscina 1', codigo: 'QR-PISCINA1', ubicacion: 'Costado Piscina 1', etapa: 'PISCINAS', post: 'PISCINA1' },
      { nombre: 'Piscina 2', codigo: 'QR-PISCINA2', ubicacion: 'Costado Piscina 2', etapa: 'PISCINAS', post: 'PISCINA2' },
      { nombre: 'Piscina 3', codigo: 'QR-PISCINA3', ubicacion: 'Costado Piscina 3', etapa: 'PISCINAS', post: 'PISCINA3' },
      { nombre: 'Laguna Artificial', codigo: 'QR-LAGUNA', ubicacion: 'Mirador Laguna', etapa: 'LAGUNA', post: 'LAGUNA' },
      { nombre: 'Quinchos', codigo: 'QR-QUINCHOS', ubicacion: 'Sector Quinchos', etapa: 'QUINCHOS', post: 'QUINCHOS' },
      { nombre: 'Multicancha', codigo: 'QR-MULTICANCHA', ubicacion: 'Multicancha', etapa: 'MULTICANCHA', post: 'MULTI' },
      { nombre: 'Cancha Sintética', codigo: 'QR-CANCHA', ubicacion: 'Cancha de Pasto Sintético', etapa: 'CANCHAS', post: 'SINTETICA' },
      { nombre: 'Bodega Central', codigo: 'QR-BODEGA', ubicacion: 'Bodega de Herramientas', etapa: 'BODEGA', post: 'CENTRAL' },
      { nombre: 'Sala de Bombas', codigo: 'QR-BOMBAS', ubicacion: 'Sala de Bombas', etapa: 'BOMBAS', post: 'BOMBAS' },
      { nombre: 'Jacuzzi/Spa', codigo: 'QR-JACUZZI', ubicacion: 'Jacuzzi', etapa: 'JACUZZI', post: 'SPA' },
      { nombre: 'Sauna', codigo: 'QR-SAUNA', ubicacion: 'Sauna', etapa: 'SAUNA', post: 'SAUNA' },
      { nombre: 'Juegos Infantiles', codigo: 'QR-JUEGOS', ubicacion: 'Plaza de Juegos', etapa: 'JUEGOS', post: 'INFANTILES' },
      { nombre: 'Mirador', codigo: 'QR-MIRADOR', ubicacion: 'Mirador', etapa: 'MIRADOR', post: 'MIRADOR' },
      { nombre: 'Muelle', codigo: 'QR-MUELLE', ubicacion: 'Muelle Laguna', etapa: 'MUELLE', post: 'MUELLE' },
    ]

    for (const p of puntosQR) {
      // Crear en Ronda (sistema escritorio)
      const existente = await withRetry(() => db.ronda.findUnique({ where: { codigo: p.codigo } }))
      if (!existente) {
        const ronda = await withRetry(() => db.ronda.create({
          data: {
            nombre: p.nombre,
            codigo: p.codigo,
            ubicacion: p.ubicacion,
            descripcion: `Punto de control QR para rondas de guardia — ${p.ubicacion}`,
            activo: true,
            qrCodigo: `https://condominios-cyj.vercel.app/ronda/${p.etapa}/${p.post}`,
            creadoPorNombre: 'Sistema',
          }
        }))
        resultados.rondas.push({ codigo: p.codigo, nombre: p.nombre })
      }

      // Crear en MovilQrLocation (app móvil)
      const existenteMovil = await withRetry(() => db.movilQrLocation.findUnique({ where: { code: p.codigo } }))
      if (!existenteMovil) {
        const qrLoc = await withRetry(() => db.movilQrLocation.create({
          data: {
            name: p.nombre,
            description: p.ubicacion,
            location: p.ubicacion,
            code: p.codigo,
            active: true,
          }
        }))
        resultados.qr_locations.push({ code: p.codigo, name: p.nombre })
      }
    }

    // 2. Crear perfiles en MovilProfile para guardias y conserje
    const perfilesCrear = [
      { name: 'GUARDIA TURNO A', accessCode: 'GA01', color: 'bg-blue-600', icon: 'Shield', permissions: ['view', 'create', 'edit'] },
      { name: 'GUARDIA TURNO B', accessCode: 'GB01', color: 'bg-indigo-600', icon: 'Shield', permissions: ['view', 'create', 'edit'] },
      { name: 'CONSERJE', accessCode: 'CO01', color: 'bg-teal-600', icon: 'User', permissions: ['view', 'create', 'edit'] },
      { name: 'ADMINISTRADOR', accessCode: 'AD01', color: 'bg-red-600', icon: 'Star', permissions: ['view', 'create', 'edit', 'delete', 'supervisor'] },
    ]

    for (const p of perfilesCrear) {
      const existente = await withRetry(() => db.movilProfile.findFirst({ where: { accessCode: p.accessCode } }))
      if (!existente) {
        const perfil = await withRetry(() => db.movilProfile.create({ data: p }))
        resultados.perfiles.push({ name: p.name, accessCode: p.accessCode })
      }
    }

    // Contar totales
    const totalRondas = await withRetry(() => db.ronda.count())
    const totalQrLocations = await withRetry(() => db.movilQrLocation.count())
    const totalPerfiles = await withRetry(() => db.movilProfile.count())

    return NextResponse.json({
      success: true,
      resultados,
      totales: { rondas: totalRondas, qr_locations: totalQrLocations, perfiles: totalPerfiles },
      mensaje: 'Puntos QR y perfiles creados en ambas tablas (Ronda + MovilQrLocation)',
    })
  } catch (error) {
    console.error('Error setup guardia:', error)
    return NextResponse.json({ error: 'Error', detalle: String(error) }, { status: 500 })
  }
}
