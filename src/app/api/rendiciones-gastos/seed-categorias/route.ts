<<<<<<< HEAD
import { db, withRetry } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError, apiSuccess, handlePrismaError } from '@/lib/api-helpers'

const CONDOMINIO_LAGUNA_NORTE = 'cmo9f3x7j0000ktyeb0rzhwt9'

const DEFAULT_CATEGORIAS = [
  { nombre: 'Mantenimiento', color: '#0f2044' },
  { nombre: 'Administraci\u00f3n', color: '#1e40af' },
  { nombre: 'Seguridad', color: '#dc2626' },
  { nombre: '\u00c1reas Verdes', color: '#16a34a' },
  { nombre: 'Limpieza', color: '#0d9488' },
  { nombre: 'Suministros', color: '#7c3aed' },
  { nombre: 'Transporte', color: '#ea580c' },
  { nombre: 'Alimentaci\u00f3n', color: '#ca8a04' },
  { nombre: 'Herramientas', color: '#475569' },
  { nombre: 'Reparaciones', color: '#be123c' },
  { nombre: 'Servicios Profesionales', color: '#2563eb' },
  { nombre: 'Otros', color: '#64748b' },
]

// POST: crear categor\u00edas por defecto (admin only)
export async function POST() {
  try {
    const session = await getCurrentSession()
    if (!session) return apiError('No autenticado', 401)
    if (session.user.rol !== 'admin') return apiError('Solo administradores', 403)

    const existing = await withRetry(() =>
      db.categoriaGasto.count({
        where: { condominioId: CONDOMINIO_LAGUNA_NORTE },
      })
    )

    if (existing > 0) {
      return apiSuccess({ message: 'Ya existen categor\u00edas', count: existing })
    }

    const created = await withRetry(() =>
      db.categoriaGasto.createMany({
        data: DEFAULT_CATEGORIAS.map((c) => ({
          nombre: c.nombre,
          color: c.color,
          condominioId: CONDOMINIO_LAGUNA_NORTE,
        })),
      })
    )

    return apiSuccess({ created: created.count }, 201)
  } catch (error) {
    return handlePrismaError(error)
=======
/**
 * API Seed Categorías de Rendición de Gastos
 * 
 * Crea las categorías por defecto si no existen.
 * Se puede ejecutar desde producción (no bloqueado).
 */
import { NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'
import { getCurrentSession } from '@/lib/auth'
import { apiError } from '@/lib/api-helpers'

const CATEGORIAS_DEFAULT = [
  { nombre: 'Mantenimiento', descripcion: 'Gastos de mantenimiento general del condominio', color: '#2563eb' },
  { nombre: 'Administración', descripcion: 'Gastos administrativos y de gestión', color: '#7c3aed' },
  { nombre: 'Seguridad', descripcion: 'Gastos de seguridad y vigilancia', color: '#dc2626' },
  { nombre: 'Áreas Verdes', descripcion: 'Gastos de jardinería y áreas comunes verdes', color: '#16a34a' },
  { nombre: 'Limpieza', descripcion: 'Gastos de limpieza y aseo', color: '#0891b2' },
  { nombre: 'Suministros', descripcion: 'Suministros de oficina y operación', color: '#d97706' },
  { nombre: 'Transporte', descripcion: 'Gastos de transporte y movilización', color: '#ea580c' },
  { nombre: 'Alimentación', descripcion: 'Gastos de alimentación (colaciones, viáticos)', color: '#be185d' },
  { nombre: 'Herramientas', descripcion: 'Compra de herramientas y equipamiento menor', color: '#4f46e5' },
  { nombre: 'Reparaciones', descripcion: 'Reparaciones menores y urgentes', color: '#0f766e' },
  { nombre: 'Servicios Profesionales', descripcion: 'Contratación de servicios externos', color: '#6d28d9' },
  { nombre: 'Otros', descripcion: 'Gastos no clasificados en otras categorías', color: '#64748b' },
]

export async function POST() {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  if (session.user.rol !== 'admin') {
    return apiError('Solo el administrador puede ejecutar seeds', 403)
  }

  try {
    // Verificar si ya existen categorías
    const existentes = await withRetry(() =>
      db.categoriaGasto.count()
    )

    if (existentes > 0) {
      return NextResponse.json({
        ok: true,
        message: `Ya existen ${existentes} categorías. No se crearon nuevas.`,
        existentes,
      })
    }

    // Crear todas las categorías
    const creadas = []
    for (const cat of CATEGORIAS_DEFAULT) {
      const creada = await withRetry(() =>
        db.categoriaGasto.create({
          data: {
            nombre: cat.nombre,
            descripcion: cat.descripcion,
            color: cat.color,
          },
        })
      )
      creadas.push(creada)
    }

    return NextResponse.json({
      ok: true,
      message: `${creadas.length} categorías creadas exitosamente`,
      categorias: creadas,
    })
  } catch (error) {
    console.error('Error seeding categorías:', error)
    return apiError('Error al crear categorías', 500)
  }
}

// GET - Retorna categorías existentes (para verificar)
export async function GET() {
  const session = await getCurrentSession()
  if (!session) return apiError('No autenticado', 401)

  try {
    const categorias = await withRetry(() =>
      db.categoriaGasto.findMany({
        orderBy: { nombre: 'asc' },
      })
    )

    return NextResponse.json({
      total: categorias.length,
      activas: categorias.filter(c => c.activa).length,
      categorias,
    })
  } catch (error) {
    return apiError('Error al obtener categorías', 500)
>>>>>>> 4585c06d3f055df9c7b5541ddeae5adb8114b7b5
  }
}
