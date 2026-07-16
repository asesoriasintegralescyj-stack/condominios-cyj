import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcrypt'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    // Buscar el admin
    const admin = await db.user.findFirst({ where: { rol: 'admin' } })
    if (!admin) {
      return NextResponse.json({ error: 'No hay admin' }, { status: 404 })
    }

    // Nueva contraseña
    const newPwd = 'LagunaNorte2025'
    const hashed = await bcrypt.hash(newPwd, 10)

    await db.user.update({
      where: { id: admin.id },
      data: { 
        password: hashed,
        cambiarPasswordProximoLogin: false,
      },
    })

    return NextResponse.json({
      success: true,
      email: admin.email,
      newPassword: newPwd,
      message: 'Contraseña reseteada'
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
