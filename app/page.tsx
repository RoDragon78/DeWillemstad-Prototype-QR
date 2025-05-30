"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Anchor, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Language flags
const LANGUAGE_FLAGS = {
  en: "🇬🇧",
  de: "🇩🇪",
  nl: "🇳🇱",
}

export default function HomePage() {
  const [cabinNumber, setCabinNumber] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warningMessage, setWarningMessage] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setWarningMessage(null)

    if (!cabinNumber.trim()) {
      setError("Please enter a cabin number")
      setIsLoading(false)
      return
    }

    try {
      // Check if cabin exists in the database
      const { data: cabinData, error: cabinError } = await supabase
        .from("guest_manifest")
        .select("id")
        .eq("cabin_nr", cabinNumber.trim())

      if (cabinError) {
        console.error("Database query error:", cabinError)
        throw new Error("Failed to verify cabin number")
      }

      if (!cabinData || cabinData.length === 0) {
        setError("Cabin number not found. Please check and try again.")
        setIsLoading(false)
        return
      }

      // Check if this cabin already has meal selections
      const guestIds = cabinData.map((guest) => guest.id)
      const { data: mealData, error: mealError } = await supabase
        .from("meal_selections")
        .select("id")
        .in("guest_id", guestIds)
        .limit(1)

      if (mealError) {
        console.error("Error checking meal selections:", mealError)
        throw new Error("Failed to check existing meal selections")
      }

      if (mealData && mealData.length > 0) {
        // Cabin already has meal selections - show warning and don't allow navigation
        setWarningMessage(
          "This cabin already has meal selections. Please contact the Hotel Manager if you need to make changes.",
        )
        setIsLoading(false)
        return
      }

      // Store cabin number in localStorage for the meal selection page
      localStorage.setItem("selectedCabin", cabinNumber.trim())

      // Navigate to meal selection page
      router.push("/meal-selection")
    } catch (err) {
      console.error("Error:", err)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="absolute right-4 top-4">
        <select
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm"
          onChange={(e) => {
            localStorage.setItem("language", e.target.value)
          }}
          defaultValue={typeof window !== "undefined" ? localStorage.getItem("language") || "en" : "en"}
        >
          <option value="en">{LANGUAGE_FLAGS.en} English</option>
          <option value="de">{LANGUAGE_FLAGS.de} Deutsch</option>
          <option value="nl">{LANGUAGE_FLAGS.nl} Nederlands</option>
        </select>
      </div>

      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-md">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-blue-500 flex items-center justify-center">
              <Anchor className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold">DeWillemstad Meal Selection</h1>
          <p className="mt-2 text-gray-600">River Cruise Dining</p>
        </div>

        {warningMessage && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700">{warningMessage}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="cabinNumber" className="block text-center text-sm font-medium text-gray-700">
              Cabin Number
            </label>
            <Input
              id="cabinNumber"
              type="text"
              placeholder="Enter your cabin number"
              value={cabinNumber}
              onChange={(e) => setCabinNumber(e.target.value)}
              className="mt-2"
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Processing..." : "Continue"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/admin/login" className="text-sm text-gray-500 hover:text-gray-700">
            Admin
          </Link>
        </div>
      </div>
    </div>
  )
}
