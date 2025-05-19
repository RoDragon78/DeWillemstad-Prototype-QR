import { createClient as createSupabaseClient } from "@supabase/supabase-js"

// This function creates a Supabase client with hardcoded credentials
// IMPORTANT: This is not recommended for production use
export const createDirectClient = () => {
  return createSupabaseClient(
    "https://attdjiaiquhmcmipxgrt.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0dGRqaWFpcXVobWNtaXB4Z3J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczOTg3ODMsImV4cCI6MjA2Mjk3NDc4M30.suoAVmwx0nnO33MCYqresbYryhGdYR_oRUhe0P0i2oE",
  )
}
