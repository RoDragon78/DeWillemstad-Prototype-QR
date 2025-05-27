import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// This is a simplified middleware that doesn't actually check authentication
// since we're using client-side authentication with localStorage
export async function middleware(req: NextRequest) {
  // Just pass through all requests
  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*"],
}
