import { NextResponse } from 'next/server'
import { verifyDriveConfig, getParentFolderId } from '@/lib/google-drive'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const config = await verifyDriveConfig()
    return NextResponse.json({
      configured: config.ok,
      parentFolderId: getParentFolderId(),
      ...(config.ok ? {} : { error: config.error }),
    })
  } catch (error: any) {
    return NextResponse.json({ configured: false, error: error.message }, { status: 500 })
  }
}
