/**
 * Endpoint de diagnóstico para verificar configuración SMTP y probar envío de email.
 * Solo accesible para admins.
 */

import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { getCurrentSession } = await import('@/lib/auth')
  const session = await getCurrentSession()
  if (!session || session.user.rol !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const diagnostico: any = {
    timestamp: new Date().toISOString(),
    variables: {
      SMTP_HOST: process.env.SMTP_HOST ? '✓ configurado' : '✗ FALTA',
      SMTP_PORT: process.env.SMTP_PORT ? '✓ configurado' : '✗ FALTA',
      SMTP_USER: process.env.SMTP_USER ? `✓ configurado (${process.env.SMTP_USER})` : '✗ FALTA',
      SMTP_PASSWORD: process.env.SMTP_PASSWORD ? '✓ configurado' : '✗ FALTA',
      CRON_SECRET: process.env.CRON_SECRET ? '✓ configurado' : '✗ FALTA',
    },
    pasos: [],
  }

  // Paso 1: Verificar que nodemailer esté disponible
  diagnostico.pasos.push({ paso: 1, descripcion: 'Importar nodemailer' })
  let nodemailer: any = null
  try {
    const mod = await import('nodemailer')
    nodemailer = (mod as any).default || mod
    diagnostico.pasos[0].resultado = 'OK'
  } catch (e: any) {
    diagnostico.pasos[0].resultado = `ERROR: ${e.message}`
    return NextResponse.json(diagnostico)
  }

  // Paso 2: Verificar credenciales
  diagnostico.pasos.push({ paso: 2, descripcion: 'Verificar credenciales SMTP' })
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
    diagnostico.pasos[1].resultado = 'ERROR: Faltan credenciales'
    return NextResponse.json(diagnostico)
  }
  diagnostico.pasos[1].resultado = `OK (host=${SMTP_HOST}, port=${SMTP_PORT || '587'}, user=${SMTP_USER})`

  // Paso 3: Crear transporter
  diagnostico.pasos.push({ paso: 3, descripcion: 'Crear transporter' })
  let transporter: any
  try {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT || '587'),
      secure: false,
      auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    })
    diagnostico.pasos[2].resultado = 'OK'
  } catch (e: any) {
    diagnostico.pasos[2].resultado = `ERROR: ${e.message}`
    return NextResponse.json(diagnostico)
  }

  // Paso 4: Verificar conexión SMTP
  diagnostico.pasos.push({ paso: 4, descripcion: 'Verificar conexión SMTP' })
  try {
    await transporter.verify()
    diagnostico.pasos[3].resultado = 'OK — servidor SMTP accesible'
  } catch (e: any) {
    diagnostico.pasos[3].resultado = `ERROR: ${e.message}`
  }

  // Paso 5: Enviar email de prueba (sin adjuntos)
  diagnostico.pasos.push({ paso: 5, descripcion: 'Enviar email de prueba sin adjuntos' })
  try {
    const info = await transporter.sendMail({
      from: `"Sistema Condominios CyJ" <${SMTP_USER}>`,
      to: SMTP_USER,
      subject: 'Test SMTP — Sistema Condominios CyJ',
      html: `
        <div style="font-family:Arial,sans-serif;padding:20px">
          <h2>Test de configuración SMTP</h2>
          <p>Si recibes este email, la configuración SMTP funciona correctamente.</p>
          <p>Timestamp: ${new Date().toISOString()}</p>
          <p>Servidor: ${SMTP_HOST}:${SMTP_PORT || '587'}</p>
          <p>Usuario: ${SMTP_USER}</p>
        </div>
      `,
    })
    diagnostico.pasos[4].resultado = `OK — messageId: ${info.messageId}, response: ${info.response}`
  } catch (e: any) {
    diagnostico.pasos[4].resultado = `ERROR: ${e.message}`
  }

  return NextResponse.json(diagnostico)
}
