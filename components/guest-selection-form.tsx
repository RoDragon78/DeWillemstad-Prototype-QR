"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface Guest {
  guest_name: string
  nationality: string
  table_nr: number
  booking_number: string
}

interface GuestSelectionFormProps {
  guests: Guest[]
  cabinNumber: string
}

// Changed from export function GuestSelectionForm to export default function GuestSelectionForm
export default function GuestSelectionForm({ guests, cabinNumber }: GuestSelectionFormProps) {
  const router = useRouter()
  const [selectedGuests, setSelectedGuests] = useState<number[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGuestToggle = (guestIndex: number) => {
    setSelectedGuests((prev) =>
      prev.includes(guestIndex) ? prev.filter((idx) => idx !== guestIndex) : [...prev, guestIndex],
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedGuests.length === 0) {
      setError("Please select at least one guest")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Create a query string with all selected guest indices
      const guestParams = selectedGuests.map((idx) => `guestIndex=${idx}`).join("&")
      router.push(`/meal-selection?cabin=${cabinNumber}&${guestParams}`)
    } catch (err: any) {
      console.error("Navigation error:", err)
      setError("An error occurred. Please try again.")
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {guests.map((guest, index) => (
          <div key={index} className="flex items-center space-x-2">
            <Checkbox
              id={`guest-${index}`}
              checked={selectedGuests.includes(index)}
              onCheckedChange={() => handleGuestToggle(index)}
              disabled={isSubmitting}
            />
            <Label htmlFor={`guest-${index}`} className="text-base">
              {guest.guest_name} <span className="text-muted-foreground text-sm">({guest.nationality})</span>
            </Label>
          </div>
        ))}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" className="w-full" disabled={selectedGuests.length === 0 || isSubmitting}>
        {isSubmitting ? "Processing..." : "Continue to Meal Selection"}
      </Button>
    </form>
  )
}
