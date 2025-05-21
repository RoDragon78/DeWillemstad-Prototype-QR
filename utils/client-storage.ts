// A utility to safely access sessionStorage and localStorage in Next.js
// This prevents errors during server-side rendering

export const clientStorage = {
  // Session Storage
  getSessionItem: (key: string): string | null => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem(key)
    }
    return null
  },

  setSessionItem: (key: string, value: string): void => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(key, value)
    }
  },

  removeSessionItem: (key: string): void => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(key)
    }
  },

  // Local Storage
  getLocalItem: (key: string): string | null => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(key)
    }
    return null
  },

  setLocalItem: (key: string, value: string): void => {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, value)
    }
  },

  removeLocalItem: (key: string): void => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(key)
    }
  },
}
