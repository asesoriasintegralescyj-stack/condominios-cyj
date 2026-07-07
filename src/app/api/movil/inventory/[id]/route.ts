import { NextRequest, NextResponse } from 'next/server'
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return NextResponse.json({})
}
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return NextResponse.json({ success: true })
}
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return NextResponse.json({ success: true })
}
