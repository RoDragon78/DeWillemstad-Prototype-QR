import { createClient } from "@supabase/supabase-js"

// Create a single supabase client for the entire app
const SUPABASE_URL = "https://attdjiaiquhmcmipxgrt.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0dGRqaWFpcXVobWNtaXB4Z3J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczOTg3ODMsImV4cCI6MjA2Mjk3NDc4M30.suoAVmwx0nnO33MCYqresbYryhGdYR_oRUhe0P0i2oE"

// Create a function to get a fresh client each time
export const getSupabaseClient = () => {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
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
  meal_type: string
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

// Function to check if a cabin has already submitted meal choices
export async function hasCabinSubmittedChoices(cabinNr: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.from("meal_choices").select("id").eq("cabin_nr", cabinNr).limit(1)

    if (error) {
      console.error("Error checking cabin submissions:", error)
      return false
    }

    return data && data.length > 0
  } catch (err) {
    console.error("Failed to check cabin submissions:", err)
    return false
  }
}

// Function to get guests by cabin number
export async function getGuestsByCabin(cabinNr: string): Promise<Guest[]> {
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
    // Return mock data if in development
    if (process.env.NODE_ENV !== "production") {
      return [
        {
          id: `mock-${cabinNr}-1`,
          cabin_nr: cabinNr,
          guest_name: `Guest 1 (Cabin ${cabinNr})`,
          nationality: "English",
          table_nr: 1,
          cruise_id: "10.05.2025",
          booking_number: `MOCK${cabinNr}-1`,
        },
        {
          id: `mock-${cabinNr}-2`,
          cabin_nr: cabinNr,
          guest_name: `Guest 2 (Cabin ${cabinNr})`,
          nationality: "English",
          table_nr: 1,
          cruise_id: "10.05.2025",
          booking_number: `MOCK${cabinNr}-1`,
        },
      ]
    }
    throw err
  }
}

// Function to get all menu items
export async function getAllMenuItems(): Promise<MenuItem[]> {
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
    return []
  }
}

// Function to save meal choices
export async function saveMealChoices(choices: MealChoice[]): Promise<void> {
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
}

// Function to get existing meal choices for a cabin
export async function getMealChoicesByCabin(cabinNr: string): Promise<MealChoice[]> {
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
    return []
  }
}
