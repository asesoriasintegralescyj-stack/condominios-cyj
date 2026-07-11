/**
 * ENDPOINT TEMPORAL — Crear usuario conserje de prueba
 *
 * ⚠️ SOLO PARA SETUP INICIAL — eliminar después de usar.
 *
 * Crea un usuario con rol 'conserje' con credenciales conocidas para
 * poder probar la vista de conserje sin tener que loguearse como admin.
 *
 * POST /api/setup-conserje
 *   { email, password, nombre }
 *
 * Si el usuario ya existe, lo actualiza.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = (body.email || 'conserje@lagunanorte.cl').toLowerCase().trim()
    const password = body.password || 'conserje2025'
    const nombre = body.nombre || 'Conserje'

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 },
      )
    }

    const hashedPassword = await hashPassword(password)

    // Permisos de conserje: solo rondas.ver
    const permisos = {
      'rondas.ver': true,
    }

    // Upsert: si existe, actualiza; si no, crea
    const user = await db.user.upsert({
      where: { email },
      update: {
        password: hashedPassword,
        rol: 'conserje',
        nombre,
        activo: true,
        permisos: JSON.stringify(permisos),
        cambiarPasswordProximoLogin: false,
      },
      create: {
        email,
        nombre,
        apellido: 'Sistema',
        password: hashedPassword,
        rol: 'conserje',
        activo: true,
        emailVerificado: new Date(),
        permisos: JSON.stringify(permisos),
        cambiarPasswordProximoLogin: false,
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        activo: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Usuario conserje creado/actualizado',
      user,
      credentials: { email, password },
    })
  } catch (error: any) {
    console.error('Error en setup-conserje:', error)
    return NextResponse.json(
      { error: error.message || 'Error al crear usuario conserje' },
      { status: 500 },
    )
  }
}
