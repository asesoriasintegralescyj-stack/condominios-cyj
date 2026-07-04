import { NextRequest, NextResponse } from 'next/server'
import { execSync } from 'child_process'
import path from 'path'

// TEMPORAL: ejecuta prisma db push para sincronizar el schema con la BD
// Usa el prisma CLI instalado en node_modules (no npx)
export async function POST(request: NextRequest) {
  try {
    const prismaBin = path.join(process.cwd(), 'node_modules', '.bin', 'prisma')
    const output = execSync(`${prismaBin} db push --accept-data-loss 2>&1`, {
      encoding: 'utf-8',
      timeout: 60000,
      env: process.env,
      cwd: process.cwd(),
    })
    return NextResponse.json({
      success: true,
      output: output.substring(0, 2000),
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Error ejecutando db push',
      output: (error.stdout || '') + (error.stderr || '') + error.message,
    }, { status: 500 })
  }
}
