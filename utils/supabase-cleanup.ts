import { clientStorage } from "./client-storage"

export const supabaseCleanup = {
  // Clear all Supabase-related storage
  clearAll: (): void => {
    if (typeof window === "undefined") return

    console.log("🧹 Starting Supabase cleanup...")

    // Clear localStorage items
    const localStorageKeys = [
      "sb-auth-token",
      "supabase.auth.token",
      "sb-refresh-token",
      "supabase.auth.refresh-token",
      "sb-access-token",
      "supabase.auth.access-token",
    ]

    localStorageKeys.forEach((key) => {
      clientStorage.removeLocalItem(key)
      // Also try with project-specific prefixes
      clientStorage.removeLocalItem(
        `sb-${process.env.NEXT_PUBLIC_SUPABASE_URL?.split("//")[1]?.split(".")[0]}-auth-token`,
      )
    })

    // Clear sessionStorage items
    const sessionStorageKeys = [
      "sb-auth-token",
      "supabase.auth.token",
      "sb-refresh-token",
      "supabase.auth.refresh-token",
    ]

    sessionStorageKeys.forEach((key) => {
      clientStorage.removeSessionItem(key)
    })

    // Clear all cookies that might contain Supabase data
    if (typeof document !== "undefined") {
      const cookies = document.cookie.split(";")

      cookies.forEach((cookie) => {
        const eqPos = cookie.indexOf("=")
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()

        // Clear Supabase-related cookies
        if (
          name.includes("sb-") ||
          name.includes("supabase") ||
          name.includes("auth-token") ||
          name.includes("refresh-token") ||
          name.includes("access-token")
        ) {
          // Clear cookie for current domain
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
          // Clear cookie for subdomain
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`
          // Clear cookie for parent domain
          const domain = window.location.hostname.split(".").slice(-2).join(".")
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${domain};`
        }
      })
    }

    console.log("✅ Supabase cleanup completed")
  },

  // Clear only corrupted/malformed data
  clearCorrupted: (): void => {
    if (typeof window === "undefined") return

    console.log("🔧 Clearing corrupted Supabase data...")

    // Check and clear corrupted localStorage items
    try {
      const keys = Object.keys(localStorage)
      keys.forEach((key) => {
        if (key.includes("sb-") || key.includes("supabase")) {
          try {
            const value = localStorage.getItem(key)
            if (value && value.startsWith("base64-")) {
              // Try to parse the base64 content
              const decoded = atob(value.replace("base64-", ""))
              JSON.parse(decoded)
            } else if (value) {
              JSON.parse(value)
            }
          } catch (error) {
            console.log(`🗑️ Removing corrupted localStorage key: ${key}`)
            clientStorage.removeLocalItem(key)
          }
        }
      })
    } catch (error) {
      console.error("Error checking localStorage:", error)
    }

    // Check and clear corrupted sessionStorage items
    try {
      const keys = Object.keys(sessionStorage)
      keys.forEach((key) => {
        if (key.includes("sb-") || key.includes("supabase")) {
          try {
            const value = sessionStorage.getItem(key)
            if (value && value.startsWith("base64-")) {
              const decoded = atob(value.replace("base64-", ""))
              JSON.parse(decoded)
            } else if (value) {
              JSON.parse(value)
            }
          } catch (error) {
            console.log(`🗑️ Removing corrupted sessionStorage key: ${key}`)
            clientStorage.removeSessionItem(key)
          }
        }
      })
    } catch (error) {
      console.error("Error checking sessionStorage:", error)
    }

    console.log("✅ Corrupted data cleanup completed")
  },

  // Force refresh after cleanup
  refreshPage: (): void => {
    if (typeof window !== "undefined") {
      console.log("🔄 Refreshing page...")
      window.location.reload()
    }
  },
}
