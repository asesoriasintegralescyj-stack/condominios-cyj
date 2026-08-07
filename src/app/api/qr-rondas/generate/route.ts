/**
 * API para generar imágenes de códigos QR (data URL)
 * Sistema de Gestión de Condominios (escritorio) — condominios-cyj
 *
 * Genera un PNG embebido como data URL que puede mostrarse en <img>
 * o descargarse. El contenido del QR es el `code` de la ubicación
 * (ej: "QR-PORTERIA"), que es lo que la app móvil leerá y enviará
 * a /api/qr-scans para registrar el escaneo.
 */

import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'

export const dynamic = 'force-dynamic'
export const maxDuration = 30


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const size = parseInt(searchParams.get('size') || '256', 10) || 256

    if (!code) {
      return NextResponse.json(
        { error: 'Código es obligatorio' },
        { status: 400 },
      )
    }

    const dataUrl = await QRCode.toDataURL(code, {
      width: size,
      margin: 2,
      color: {
        dark: '#0f2044', // azul corporativo
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })

    return NextResponse.json({ code, dataUrl })
  } catch (error) {
    console.error('Error generating QR:', error)
    return NextResponse.json(
      { error: 'Error al generar código QR' },
      { status: 500 },
    )
  }
}
