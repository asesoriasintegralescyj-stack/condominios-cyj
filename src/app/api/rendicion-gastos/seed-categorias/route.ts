import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// ============================================================
// POST /api/rendicion-gastos/seed-categorias — Seed de categorías
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    if (user.rol !== 'admin') {
      return NextResponse.json({ error: 'Solo admin' }, { status: 403 })
    }

    const categoriasDefault = [
      { nombre: 'Combustible', icon: '⛽' },
      { nombre: 'Limpieza', icon: '🧹' },
      { nombre: 'Mantenimiento', icon: '🔧' },
      { nombre: 'Material Menor', icon: '📦' },
      { nombre: 'Alimentación', icon: '🍕' },
      { nombre: 'Transporte', icon: '🚗' },
      { nombre: 'Herramientas', icon: '🛠️' },
      { nombre: 'Pintura', icon: '🎨' },
      { nombre: 'Electricidad', icon: '⚡' },
      { nombre: 'Plomería', icon: '🔧' },
      { nombre: 'Jardinería', icon: '🌿' },
      { nombre: 'Seguridad', icon: '🛡️' },
      { nombre: 'Oficina', icon: '📎' },
      { nombre: 'Otros', icon: '📋' },
    ]

    let creados = 0
    for (const cat of categoriasDefault) {
      const exists = await db.categoriaGasto.findUnique({ where: { nombre: cat.nombre } })
      if (!exists) {
        await db.categoriaGasto.create({ data: cat })
        creados++
      }
    }

    return NextResponse.json({ ok: true, creados, total: categoriasDefault.length })
  } catch (error) {
    console.error('[seed-categorias]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
