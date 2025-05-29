import { createBrowserClient } from "@supabase/ssr"
import { supabaseCleanup } from "@/utils/supabase-cleanup"

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  // Return existing client if available (singleton pattern)
  if (supabaseClient) {
    return supabaseClient
  }

  try {
    supabaseClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    return supabaseClient
  } catch (error) {
    console.error("Error creating Supabase client:", error)
    // If client creation fails due to corrupted data, clean up and try again
    supabaseCleanup.clearAll()
    throw new Error("Supabase client creation failed. Please refresh the page.")
  }
}
