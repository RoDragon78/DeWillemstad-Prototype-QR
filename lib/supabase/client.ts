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
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: {
            getItem: (key: string) => {
              try {
                if (typeof window === "undefined") return null
                const item = localStorage.getItem(key)
                if (!item) return null

                // Handle base64 encoded items
                if (item.startsWith("base64-")) {
                  try {
                    const decoded = atob(item.replace("base64-", ""))
                    return JSON.parse(decoded)
                  } catch (error) {
                    console.warn(`Corrupted base64 item found: ${key}`, error)
                    localStorage.removeItem(key)
                    return null
                  }
                }

                // Try to parse as JSON
                try {
                  JSON.parse(item)
                  return item
                } catch (error) {
                  console.warn(`Corrupted JSON item found: ${key}`, error)
                  localStorage.removeItem(key)
                  return null
                }
              } catch (error) {
                console.error(`Error reading storage item ${key}:`, error)
                return null
              }
            },
            setItem: (key: string, value: string) => {
              try {
                if (typeof window === "undefined") return
                localStorage.setItem(key, value)
              } catch (error) {
                console.error(`Error setting storage item ${key}:`, error)
              }
            },
            removeItem: (key: string) => {
              try {
                if (typeof window === "undefined") return
                localStorage.removeItem(key)
              } catch (error) {
                console.error(`Error removing storage item ${key}:`, error)
              }
            },
          },
        },
      },
    )

    return supabaseClient
  } catch (error) {
    console.error("Error creating Supabase client:", error)
    // If client creation fails due to corrupted data, clean up and try again
    supabaseCleanup.clearAll()
    throw new Error("Supabase client creation failed. Please refresh the page.")
  }
}
