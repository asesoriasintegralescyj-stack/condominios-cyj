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
  }
}
