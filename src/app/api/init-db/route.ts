/**
 * API para inicializar la base de datos
 *
 * ⚠️ DESHABILITADA por seguridad.
 *
 * Este endpoint ejecutaba `prisma db push --accept-data-loss` sin autenticación,
 * lo que permitía a cualquier atacante destruir el esquema de la BD en producción.
 *
 * La inicialización de la BD debe hacerse vía CI/CD o scripts locales:
 *   npm run db:push
 */

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    { error: 'Endpoint deshabilitado por seguridad. Use npm run db:push localmente.' },
    { status: 404 }
  )
}

export async function POST() {
  return NextResponse.json(
    { error: 'Endpoint deshabilitado por seguridad. Use npm run db:push localmente.' },
    { status: 404 }
  )
}
