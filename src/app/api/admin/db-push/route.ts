import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'

// TEMPORAL: ejecuta prisma db push para sincronizar el schema con la BD
// Sin autenticación para poder usar cuando el login no funciona
// TODO: agregar autenticación después de usar
export async function POST(request: NextRequest) {
  try {
    const output = execSync('npx prisma db push --accept-data-loss 2>&1', {
      encoding: 'utf-8',
      timeout: 60000,
      env: process.env,
    })
    return NextResponse.json({
      success: true,
      output: output.substring(0, 2000),
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Error ejecutando db push',
      output: error.stdout || error.stderr || error.message,
    }, { status: 500 })
  }
}
