export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      guest_manifest: {
        Row: {
          cabin_nr: string
          guest_name: string
          nationality: string
          table_nr: number
          cruise_id: string
          booking_number: string
        }
        Insert: {
          cabin_nr: string
          guest_name: string
          nationality: string
          table_nr: number
          cruise_id: string
          booking_number: string
        }
        Update: {
          cabin_nr?: string
          guest_name?: string
          nationality?: string
          table_nr?: number
          cruise_id?: string
          booking_number?: string
        }
      }
      menu_items: {
        Row: {
          id: string
          day: number
          meal_type: string
          name_en: string
          name_de: string
          description_en: string
          description_de: string
        }
        Insert: {
          id?: string
          day: number
          meal_type: string
          name_en: string
          name_de: string
          description_en: string
          description_de: string
        }
        Update: {
          id?: string
          day?: number
          meal_type?: string
          name_en?: string
          name_de?: string
          description_en?: string
          description_de?: string
        }
      }
      meal_choices: {
        Row: {
          id: string
          cabin_nr: string
          guest_index: number
          meal: string
          cruise_id: string
          day: number
          submitted_at: string
        }
        Insert: {
          id?: string
          cabin_nr: string
          guest_index: number
          meal: string
          cruise_id: string
          day: number
          submitted_at?: string
        }
        Update: {
          id?: string
          cabin_nr?: string
          guest_index?: number
          meal?: string
          cruise_id?: string
          day?: number
          submitted_at?: string
        }
      }
    }
  }
}
