import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Check if accessing admin routes
  if (req.nextUrl.pathname.startsWith("/admin") && !req.nextUrl.pathname.startsWith("/admin/login")) {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      // Redirect to login if no session
      return NextResponse.redirect(new URL("/admin/login", req.url))
    }

    // Check if user is admin
    const { data: adminUser, error } = await supabase
      .from("admin_users")
      .select("*")
      .eq("user_id", session.user.id)
      .single()

    if (error || !adminUser) {
      // Redirect to login if not admin
      return NextResponse.redirect(new URL("/admin/login", req.url))
    }
  }

  return res
}

export const config = {
  matcher: ["/admin/:path*"],
}
