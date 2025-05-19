import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { supabaseConfig } from "../config"

export const createClient = () => {
  const cookieStore = cookies()

  // Use environment variables if available, otherwise fall back to config
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || supabaseConfig.url
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || supabaseConfig.anonKey

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: { path: string; maxAge?: number; domain?: string; secure?: boolean }) {
        // This is a server action, we can't set cookies directly
        // This is just to satisfy the interface
      },
      remove(name: string, options: { path: string; domain?: string }) {
        // This is a server action, we can't remove cookies directly
        // This is just to satisfy the interface
      },
    },
  })
}
