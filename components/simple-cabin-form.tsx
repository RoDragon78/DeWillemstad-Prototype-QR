"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

// Changed from export function SimpleCabinForm() to export default function SimpleCabinForm()
export default function SimpleCabinForm() {
  const router = useRouter()
  const [cabinNumber, setCabinNumber] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    // Reset errors
    setValidationError(null)
    setError(null)

    // Validate input
    if (!cabinNumber.trim()) {
      setValidationError("Cabin number is required")
      return
    }

    setIsLoading(true)

    try {
      // Create Supabase client directly
      const supabase = createSupabaseClient(
        "https://attdjiaiquhmcmipxgrt.supabase.co",
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0dGRqaWFpcXVobWNtaXB4Z3J0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczOTg3ODMsImV4cCI6MjA2Mjk3NDc4M30.suoAVmwx0nnO33MCYqresbYryhGdYR_oRUhe0P0i2oE",
      )

      // Check if cabin exists in the manifest
      const { data, error: supabaseError } = await supabase
        .from("guest_manifest")
        .select("*")
        .eq("cabin_nr", cabinNumber)
        .eq("cruise_id", "CR2023-06")

      if (supabaseError) {
        console.error("Supabase query error:", supabaseError)
        throw supabaseError
      }

      if (!data || data.length === 0) {
        setError("No guests found for this cabin number. Please check and try again.")
        return
      }

      // Redirect to guest selection page with cabin number
      router.push(`/select-guests?cabin=${cabinNumber}`)
    } catch (err: any) {
      console.error("Error checking cabin:", err)
      setError(
        err.message || "An error occurred connecting to the database. Please check your connection and try again.",
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="cabinNumber" className="text-sm font-medium">
          Cabin Number
        </label>
        <Input
          id="cabinNumber"
          placeholder="Enter your cabin number (e.g., A101)"
          value={cabinNumber}
          onChange={(e) => {
            setCabinNumber(e.target.value)
            if (e.target.value.trim()) {
              setValidationError(null)
            }
          }}
          disabled={isLoading}
        />
        {validationError && <p className="text-sm text-red-500">{validationError}</p>}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Checking..." : "Continue"}
      </Button>
    </form>
  )
}
