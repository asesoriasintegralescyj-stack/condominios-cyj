import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import QRCode from 'qrcode'

export const dynamic = 'force-dynamic'

const BASE_URL = 'https://condominios-cyj.vercel.app'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verificar que la herramienta existe (para no generar QRs a IDs inventados)
    const herramienta = await db.catHerramienta.findUnique({
      where: { id },
      select: { id: true, qrCodigo: true },
    })

    if (!herramienta) {
      return NextResponse.json({ error: 'Herramienta no encontrada' }, { status: 404 })
    }

    // Asegurar que el QR guardado apunte a la URL correcta
    const url = `${BASE_URL}/h/${id}`

    // Si no tenía guardado el qrCodigo, lo guardamos ahora
    if (herramienta.qrCodigo !== url) {
      await db.catHerramienta.update({
        where: { id },
        data: { qrCodigo: url },
      })
    }

    const pngBuffer = await QRCode.toBuffer(url, {
      type: 'png',
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 512,
      color: {
        dark: '#0f2040',
        light: '#ffffff',
      },
    })

    // Convertir Buffer a Uint8Array para que NextResponse lo acepte como BodyInit
    const pngBytes = new Uint8Array(pngBuffer)

    return new NextResponse(pngBytes, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'Content-Length': pngBytes.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error('Error generating QR code:', error)
    return NextResponse.json({ error: 'Error generando QR' }, { status: 500 })
  }
}
