"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Anchor, AlertCircle } from "lucide-react"
import Link from "next/link"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function HomePage() {
  const [cabinNumber, setCabinNumber] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!cabinNumber.trim()) {
      setError("Please enter a cabin number")
      setIsLoading(false)
      return
    }

    try {
      // Check if cabin exists in guest_manifest
      const { data: cabinData, error: cabinError } = await supabase
        .from("guest_manifest")
        .select("*")
        .eq("cabin_nr", cabinNumber.trim())

      if (cabinError) {
        console.error("Database error:", cabinError)
        setError("Failed to verify cabin number")
        setIsLoading(false)
        return
      }

      if (!cabinData || cabinData.length === 0) {
        setError("Cabin number not found. Please check and try again.")
        setIsLoading(false)
        return
      }

      // Check if cabin already has meal choices
      const { data: existingChoices } = await supabase
        .from("meal_choices")
        .select("id")
        .eq("cabin_nr", cabinNumber.trim())
        .limit(1)

      if (existingChoices && existingChoices.length > 0) {
        setError("This cabin already has meal selections. Please contact staff for changes.")
        setIsLoading(false)
        return
      }

      // Store cabin data and navigate
      localStorage.setItem("selectedCabin", cabinNumber.trim())
      localStorage.setItem("cabinGuests", JSON.stringify(cabinData))
      router.push("/meal-selection")
    } catch (err) {
      console.error("Error:", err)
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-blue-500 flex items-center justify-center">
              <Anchor className="h-10 w-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">DeWillemstad Meal Selection</CardTitle>
          <CardDescription>River Cruise Dining</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="cabinNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Cabin Number
              </label>
              <Input
                id="cabinNumber"
                type="text"
                placeholder="Enter your cabin number"
                value={cabinNumber}
                onChange={(e) => setCabinNumber(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Checking..." : "Continue"}
            </Button>
          </form>

          <div className="text-center pt-4">
            <Link href="/admin/login" className="text-sm text-gray-500 hover:text-gray-700">
              Admin Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
