import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/patentes/ocr
 * Extrae texto de una imagen de patente (OCR).
 * Compatibilidad con app móvil — retorna texto extraído.
 * 
 * Body: { image: string (base64 data URL) }
 * Returns: { text: string, confidence: number }
 */
export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json()

    if (!image || typeof image !== 'string') {
      return NextResponse.json({ error: 'Imagen requerida' }, { status: 400 })
    }

    // Extraer texto de la patente usando pattern matching básico
    // Formato chileno: AB CD 12 o ABCD12 (4 letras + 2-3 números)
    const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, '')
    
    // Como no tenemos un servicio OCR real, devolvemos un placeholder
    // La app móvil puede manejar esto con fallback
    const text = ''
    
    return NextResponse.json({ 
      text, 
      confidence: 0,
      message: 'OCR no disponible en este servidor. Use entrada manual.' 
    })
  } catch (err) {
    console.error('POST /api/patentes/ocr error:', err)
    return NextResponse.json({ error: 'Error en OCR' }, { status: 500 })
  }
}
