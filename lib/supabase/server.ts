import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { supabaseConfig } from "../config"

export const createClient = () => {
  const cookieStore = cookies()

  // Use the hardcoded values from config
  const supabaseUrl = supabaseConfig.url
  const supabaseAnonKey = supabaseConfig.anonKey

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
    },
  })
}
