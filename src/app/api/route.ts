import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic'
export const maxDuration = 30


export async function GET() {
  return NextResponse.json({ message: "Hello, world!" });
}