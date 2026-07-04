import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST() {
  const out: string[] = []
  try {
    out.push('1. Buscando user...')
    const user = await db.user.findUnique({ where: { email: 'admin@cyj.cl' } })
    if (!user) { out.push('ERROR: user no encontrado'); return NextResponse.json({ out }) }
    out.push(`2. User: ${user.email} (${user.rol})`)
    out.push('3. Verificando password...')
    const valid = bcrypt.compareSync('Admin123456', user.password)
    out.push(`4. Password: ${valid}`)
    if (valid) {
      out.push('5. Creando session...')
      const session = await db.session.create({ data: { userId: user.id, token: 'test-' + Date.now(), expiresAt: new Date(Date.now() + 86400000) } })
      out.push(`6. Session OK: ${session.id}`)
    }
  } catch (e: any) { out.push(`ERROR: ${e.message.substring(0, 200)}`) }
  return NextResponse.json({ out })
}
