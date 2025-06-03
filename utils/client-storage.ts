// A utility to safely access sessionStorage and localStorage in Next.js
// This prevents errors during server-side rendering

export const clientStorage = {
  // Session Storage
  getSessionItem: (key: string): string | null => {
    if (typeof window !== "undefined" && window.sessionStorage) {
      try {
        return sessionStorage.getItem(key)
      } catch (error) {
        console.error("Error accessing sessionStorage:", error)
        return null
      }
    }
    return null
  },

  setSessionItem: (key: string, value: string): void => {
    if (typeof window !== "undefined" && window.sessionStorage) {
      try {
        sessionStorage.setItem(key, value)
      } catch (error) {
        console.error("Error setting sessionStorage item:", error)
      }
    }
  },

  removeSessionItem: (key: string): void => {
    if (typeof window !== "undefined" && window.sessionStorage) {
      try {
        sessionStorage.removeItem(key)
      } catch (error) {
        console.error("Error removing sessionStorage item:", error)
      }
    }
  },

  // Local Storage
  getLocalItem: (key: string): string | null => {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        return localStorage.getItem(key)
      } catch (error) {
        console.error("Error accessing localStorage:", error)
        return null
      }
    }
    return null
  },

  setLocalItem: (key: string, value: string): void => {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem(key, value)
      } catch (error) {
        console.error("Error setting localStorage item:", error)
      }
    }
  },

  removeLocalItem: (key: string): void => {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.removeItem(key)
      } catch (error) {
        console.error("Error removing localStorage item:", error)
      }
    }
  },
}
