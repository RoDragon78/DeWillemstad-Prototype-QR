import { createClient } from "@supabase/supabase-js"

// Create a single supabase client for the entire app
const SUPABASE_URL = "https://attdjiaiquhmcmipxgrt.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0dGRqaWFpcXVobWNtaXB4Z3J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczOTg3ODMsImV4cCI6MjA2Mjk3NDc4M30.suoAVmwx0nnO33MCYqresbYryhGdYR_oRUhe0P0i2oE"

// Create a function to get a fresh client each time
// This helps avoid stale connections
export const getSupabaseClient = () => {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
    },
  })
}

export type Guest = {
  id: string
  cabin_nr: string
  guest_name: string
  nationality: string
  table_nr: number | null
  cruise_id: string
  booking_number: string
}

export type MenuItem = {
  id: number
  day: number
  meal_type: string // "meat", "fish", "vegetarian"
  name_en: string
  name_de: string
  description_en: string
  description_de: string
}

export type MealChoice = {
  id?: number
  cabin_nr: string
  guest_index: number
  meal: string
  meal_type: string
  cruise_id: string
  submitted_at?: string
  edited_by?: string | null
  edited_at?: string | null
}

// Helper function to retry a function multiple times
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 500): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (retries <= 1) throw error
    await new Promise((resolve) => setTimeout(resolve, delay))
    return withRetry(fn, retries - 1, delay * 1.5)
  }
}

// Function to check if a cabin has already submitted meal choices
export async function hasCabinSubmittedChoices(cabinNr: string): Promise<boolean> {
  return withRetry(async () => {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.from("meal_choices").select("id").eq("cabin_nr", cabinNr).limit(1)

      if (error) {
        console.error("Error checking cabin submissions:", error)
        throw error
      }

      return data && data.length > 0
    } catch (err) {
      console.error("Failed to check cabin submissions:", err)
      return false // Default to false on error
    }
  })
}

// Function to get guests by cabin number
export async function getGuestsByCabin(cabinNr: string): Promise<Guest[]> {
  return withRetry(async () => {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.from("guest_manifest").select("*").eq("cabin_nr", cabinNr)

      if (error) {
        console.error("Error fetching guests:", error)
        throw error
      }

      return data || []
    } catch (err) {
      console.error("Failed to fetch guests:", err)
      // Return mock data if in development or preview mode
      if (process.env.NODE_ENV !== "production" || window.location.hostname.includes("vercel.app")) {
        console.warn("Using mock guest data due to fetch error")
        return [
          {
            id: "mock-1",
            cabin_nr: cabinNr,
            guest_name: "John Doe",
            nationality: "English",
            table_nr: 1,
            cruise_id: "10.05.2025",
            booking_number: "MOCK123",
          },
          {
            id: "mock-2",
            cabin_nr: cabinNr,
            guest_name: "Jane Doe",
            nationality: "English",
            table_nr: 1,
            cruise_id: "10.05.2025",
            booking_number: "MOCK123",
          },
        ]
      }
      throw err
    }
  })
}

// Function to get all menu items
export async function getAllMenuItems(): Promise<MenuItem[]> {
  return withRetry(async () => {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.from("menu_items").select("*").order("day").order("meal_type")

      if (error) {
        console.error("Error fetching menu items:", error)
        throw error
      }

      return data || []
    } catch (err) {
      console.error("Failed to fetch menu items:", err)
      // Return mock data if in development or preview mode
      if (process.env.NODE_ENV !== "production" || window.location.hostname.includes("vercel.app")) {
        return [
          {
            id: 1,
            day: 2,
            meal_type: "meat",
            name_en: "Beef Tenderloin",
            name_de: "Rinderfilet",
            description_en: "Grilled beef tenderloin with red wine sauce",
            description_de: "Gegrilltes Rinderfilet mit Rotweinsauce",
          },
          {
            id: 2,
            day: 2,
            meal_type: "fish",
            name_en: "Grilled Salmon",
            name_de: "Gegrillter Lachs",
            description_en: "Grilled salmon with lemon butter sauce",
            description_de: "Gegrillter Lachs mit Zitronenbutter",
          },
          {
            id: 3,
            day: 2,
            meal_type: "vegetarian",
            name_en: "Vegetable Risotto",
            name_de: "Gemüserisotto",
            description_en: "Creamy risotto with seasonal vegetables",
            description_de: "Cremiges Risotto mit Saisongemüse",
          },
          // Add more mock items for days 3-7
        ]
      }
      throw err
    }
  })
}

// Function to get menu items for a specific day
export async function getMenuItemsByDay(day: number): Promise<MenuItem[]> {
  return withRetry(async () => {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.from("menu_items").select("*").eq("day", day).order("meal_type")

      if (error) {
        console.error("Error fetching menu items:", error)
        throw error
      }

      return data || []
    } catch (err) {
      console.error("Failed to fetch menu items:", err)
      // Return mock data if in development or preview mode
      if (process.env.NODE_ENV !== "production" || window.location.hostname.includes("vercel.app")) {
        return []
      }
      throw err
    }
  })
}

// Function to save meal choices
export async function saveMealChoices(choices: MealChoice[]): Promise<void> {
  return withRetry(async () => {
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from("meal_choices").upsert(choices)

      if (error) {
        console.error("Error saving meal choices:", error)
        throw error
      }
    } catch (err) {
      console.error("Failed to save meal choices:", err)
      throw err
    }
  })
}

// Function to get existing meal choices for a cabin
export async function getMealChoicesByCabin(cabinNr: string): Promise<MealChoice[]> {
  return withRetry(async () => {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.from("meal_choices").select("*").eq("cabin_nr", cabinNr)

      if (error) {
        console.error("Error fetching meal choices:", error)
        throw error
      }

      return data || []
    } catch (err) {
      console.error("Failed to fetch meal choices:", err)
      // Return mock data if in development or preview mode
      if (process.env.NODE_ENV !== "production" || window.location.hostname.includes("vercel.app")) {
        console.warn("Using mock meal choice data due to fetch error")
        return [
          {
            cabin_nr: cabinNr,
            guest_index: 0,
            meal: "meat",
            meal_type: "meat",
            cruise_id: "10.05.2025",
            submitted_at: new Date().toISOString(),
          },
          {
            cabin_nr: cabinNr,
            guest_index: 0,
            meal: "fish",
            meal_type: "fish",
            cruise_id: "10.05.2025",
            submitted_at: new Date().toISOString(),
          },
        ]
      }
      throw err
    }
  })
}

// Function to get menu item details by meal type and day
export async function getMenuItemByTypeAndDay(mealType: string, day: number): Promise<MenuItem | null> {
  return withRetry(async () => {
    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("meal_type", mealType)
        .eq("day", day)
        .single()

      if (error) {
        if (error.code === "PGRST116") {
          // No rows returned - not an error for our purposes
          return null
        }
        console.error("Error fetching menu item:", error)
        throw error
      }

      return data
    } catch (err) {
      console.error("Failed to fetch menu item:", err)
      return null
    }
  })
}
