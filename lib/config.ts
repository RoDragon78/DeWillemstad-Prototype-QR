// IMPORTANT: This approach is for development/testing only
// In production, use environment variables instead

export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || "https://attdjiaiquhmcmipxgrt.supabase.co",
  anonKey:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0dGRqaWFpcXVobWNtaXB4Z3J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczOTg3ODMsImV4cCI6MjA2Mjk3NDc4M30.suoAVmwx0nnO33MCYqresbYryhGdYR_oRUhe0P0i2oE",
}
