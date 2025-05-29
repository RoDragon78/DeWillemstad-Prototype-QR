"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function loginAction(formData: FormData) {
  console.log("🔍 LOGIN DEBUG: Starting login process...")

  const email = formData.get("email") as string
  const password = formData.get("password") as string

  console.log("🔍 LOGIN DEBUG: Email:", email)
  console.log("🔍 LOGIN DEBUG: Password length:", password?.length)

  if (!email || !password) {
    console.log("❌ LOGIN DEBUG: Missing email or password")
    return { error: "Email and password are required" }
  }

  try {
    const supabase = await createClient()
    console.log("🔍 LOGIN DEBUG: Supabase client created")

    // Step 1: Authenticate with Supabase Auth
    console.log("🔍 LOGIN DEBUG: Attempting Supabase auth...")
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    console.log("🔍 LOGIN DEBUG: Auth result:", {
      user: authData.user?.id,
      email: authData.user?.email,
      error: authError?.message,
    })

    if (authError) {
      console.log("❌ LOGIN DEBUG: Supabase auth failed:", authError.message)
      return { error: "Invalid email or password" }
    }

    if (!authData.user) {
      console.log("❌ LOGIN DEBUG: No user returned from auth")
      return { error: "Authentication failed" }
    }

    // Step 2: Check admin privileges
    console.log("🔍 LOGIN DEBUG: Checking admin privileges for user:", authData.user.id)

    const { data: adminUser, error: adminError } = await supabase
      .from("admin_users")
      .select("*")
      .eq("user_id", authData.user.id)
      .eq("is_active", true)
      .single()

    console.log("🔍 LOGIN DEBUG: Admin lookup result:", {
      adminUser: adminUser,
      error: adminError?.message,
      code: adminError?.code,
    })

    if (adminError) {
      console.log("❌ LOGIN DEBUG: Admin lookup failed:", adminError)
      await supabase.auth.signOut()
      return { error: "Access denied. Admin privileges required." }
    }

    if (!adminUser) {
      console.log("❌ LOGIN DEBUG: No admin user found")
      await supabase.auth.signOut()
      return { error: "Access denied. Admin privileges required." }
    }

    // Step 3: Update login stats
    console.log("🔍 LOGIN DEBUG: Updating login stats...")
    const { error: updateError } = await supabase
      .from("admin_users")
      .update({
        last_login: new Date().toISOString(),
        login_count: (adminUser.login_count || 0) + 1,
      })
      .eq("id", adminUser.id)

    if (updateError) {
      console.log("⚠️ LOGIN DEBUG: Failed to update login stats:", updateError.message)
    } else {
      console.log("✅ LOGIN DEBUG: Login stats updated successfully")
    }

    console.log("✅ LOGIN DEBUG: Login successful, redirecting to dashboard")
  } catch (error) {
    console.log("💥 LOGIN DEBUG: Unexpected error:", error)
    return { error: "An unexpected error occurred" }
  }

  // Redirect outside try-catch to avoid issues
  redirect("/admin/dashboard")
}
