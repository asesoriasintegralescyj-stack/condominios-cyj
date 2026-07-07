import { NextRequest, NextResponse } from 'next/server'
import { db, withRetry } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { code, password } = await request.json()
    if (!code) return NextResponse.json({ error: 'Código requerido' }, { status: 400 })

    const perfiles = await withRetry(() => db.movilProfile.findMany({ take: 200 }))
    const perfil = perfiles.find(p => p.accessCode === code.trim())
    if (!perfil) return NextResponse.json({ error: 'Código no válido' }, { status: 404 })

    if (perfil.password && perfil.password !== (password || '')) {
      return NextResponse.json({ error: 'Contraseña incorrecta', profile: { id: perfil.id, name: perfil.name, needsPassword: true } }, { status: 401 })
    }

    return NextResponse.json({
      profile: {
        id: perfil.id, name: perfil.name, accessCode: perfil.accessCode,
        color: perfil.color, icon: perfil.icon, workAreaIds: perfil.workAreaIds,
        permissions: perfil.permissions, personalId: perfil.personalId,
      }
    })
  } catch (error) {
    console.error('Error verify-code:', error)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
}
