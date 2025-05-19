import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // You can add middleware logic here if needed
  // For example, to check if a cabin exists before allowing access to certain pages

  return NextResponse.next()
}
