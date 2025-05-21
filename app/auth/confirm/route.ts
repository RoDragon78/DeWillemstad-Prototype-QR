import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    try {
      // Exchange the code for a session
      const { error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error("Error confirming user:", error.message)
        // Redirect to error page with message
        return NextResponse.redirect(`${requestUrl.origin}/admin/login?error=${encodeURIComponent(error.message)}`)
      }

      // Successful verification
      return NextResponse.redirect(
        `${requestUrl.origin}/admin/login?success=Email verified successfully! You can now log in.`,
      )
    } catch (err) {
      console.error("Exception during confirmation:", err)
      return NextResponse.redirect(
        `${requestUrl.origin}/admin/login?error=${encodeURIComponent("An unexpected error occurred")}`,
      )
    }
  }

  // No code provided, redirect to login
  return NextResponse.redirect(
    `${requestUrl.origin}/admin/login?error=${encodeURIComponent("Invalid confirmation link")}`,
  )
}
