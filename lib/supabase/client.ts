import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { supabaseConfig } from "../config"

export const createClient = () => {
  // Use the hardcoded values from config
  const supabaseUrl = supabaseConfig.url
  const supabaseAnonKey = supabaseConfig.anonKey

  return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  })
}
