import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import path from 'path'
import { PrismaClient } from '@prisma/client'

// Ejecuta prisma db push para sincronizar el schema con la BD Aiven
export async function POST(request: NextRequest) {
  const out: string[] = []

  // 1. Probar conexión
  const p = new PrismaClient()
  try {
    const r: any = await p.$queryRaw`SELECT 1 as test`
    out.push('BD OK: ' + JSON.stringify(r[0]))
  } catch (e: any) {
    out.push('BD ERR: ' + e.message.substring(0, 100))
    return NextResponse.json({ success: false, out })
  }

  // 2. Intentar prisma db push
  try {
    const prismaBin = path.join(process.cwd(), 'node_modules', '.bin', 'prisma')
    const schema = path.join(process.cwd(), 'schema.prisma')
    const output = execSync(`${prismaBin} db push --accept-data-loss --schema=${schema} 2>&1`, {
      encoding: 'utf-8', timeout: 120000, env: process.env, cwd: process.cwd(),
    })
    out.push('db push OK: ' + output.substring(0, 500))
  } catch (e: any) {
    out.push('db push ERR: ' + ((e.stdout||'')+(e.stderr||'')+e.message).substring(0, 300))
    // Si prisma CLI no funciona, crear tablas manualmente
    out.push('Intentando SQL manual...')
    try {
      // Crear tablas básicas si no existen
      const sqls = [
        'CREATE TABLE IF NOT EXISTS "Condominio" ("id" TEXT NOT NULL, "nombre" TEXT NOT NULL, "direccion" TEXT, "comuna" TEXT, "ciudad" TEXT, "rut" TEXT, "logo" TEXT, "telefono" TEXT, "email" TEXT, "activo" BOOLEAN NOT NULL DEFAULT true, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Condominio_pkey" PRIMARY KEY ("id"))',
        'CREATE TABLE IF NOT EXISTS "User" ("id" TEXT NOT NULL, "email" TEXT NOT NULL, "nombre" TEXT NOT NULL, "apellido" TEXT, "password" TEXT NOT NULL, "rut" TEXT, "telefono" TEXT, "direccion" TEXT, "rol" TEXT NOT NULL DEFAULT \'usuario\', "permisos" TEXT, "activo" BOOLEAN NOT NULL DEFAULT true, "emailVerificado" TIMESTAMP(3), "ultimoAcceso" TIMESTAMP(3), "intentosLogin" INTEGER NOT NULL DEFAULT 0, "bloqueadoHasta" TIMESTAMP(3), "twoFactorSecret" TEXT, "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false, "resetToken" TEXT, "resetTokenExp" TIMESTAMP(3), "cambiarPasswordProximoLogin" BOOLEAN NOT NULL DEFAULT false, "passwordTemp" TEXT, "lastPasswordChange" TIMESTAMP(3), "lastPasswordChangeMotivo" TEXT, "creadoPor" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, "condominioId" TEXT, "sessionToken" TEXT, "sessionExpiry" TIMESTAMP(3), CONSTRAINT "User_pkey" PRIMARY KEY ("id"), CONSTRAINT "User_email_key" UNIQUE ("email"))',
        'CREATE TABLE IF NOT EXISTS "Session" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "token" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "userAgent" TEXT, "ip" TEXT, CONSTRAINT "Session_pkey" PRIMARY KEY ("id"), CONSTRAINT "Session_token_key" UNIQUE ("token"))',
      ]
      for (const s of sqls) {
        try { await p.$executeRawUnsafe(s); out.push('SQL OK') } catch (e2: any) { out.push('SQL: ' + e2.message.substring(0, 60)) }
      }
    } catch (e2: any) { out.push('SQL manual ERR: ' + e2.message.substring(0, 80)) }
  }

  // 3. Crear condominio y usuarios
  try {
    await p.$executeRawUnsafe(`INSERT INTO "Condominio" ("id", "nombre", "activo", "updatedAt") VALUES ('cmo9f3x7j0000ktyeb0rzhwt9', 'Laguna Norte', true, NOW()) ON CONFLICT DO NOTHING`)
    out.push('Condominio OK')
  } catch (e: any) { out.push('Condominio: ' + e.message.substring(0, 50)) }

  const bcrypt = await import('bcryptjs').then(m => m.default).catch(() => null)
  if (bcrypt) {
    const users = [
      { email: 'admin@cyj.cl', pass: 'Admin123456', nombre: 'Administrador', rol: 'admin' },
      { email: 'supervisor.test@cyj.cl', pass: 'Supervisor2026!', nombre: 'Supervisor', rol: 'supervisor' },
      { email: 'guardia.test@cyj.cl', pass: 'Guardia2026!', nombre: 'Guardia', rol: 'guardia' },
    ]
    for (const u of users) {
      try {
        const hash = bcrypt.hashSync(u.pass, 10)
        await p.$executeRawUnsafe(`INSERT INTO "User" ("id", "email", "password", "nombre", "rol", "activo", "condominioId", "updatedAt") VALUES (gen_random_uuid()::text, '${u.email}', '${hash}', '${u.nombre}', '${u.rol}', true, 'cmo9f3x7j0000ktyeb0rzhwt9', NOW()) ON CONFLICT DO NOTHING`)
        out.push(`User ${u.email} OK`)
      } catch (e: any) { out.push(`User ${u.email}: ${e.message.substring(0, 50)}`) }
    }
  }

  await p.$disconnect()
  return NextResponse.json({ success: true, out })
}
