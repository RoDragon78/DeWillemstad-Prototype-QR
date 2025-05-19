"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

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

export default function GuestSelectionForm({ guests, cabinNumber }: GuestSelectionFormProps) {
  const router = useRouter()
  const [selectedGuests, setSelectedGuests] = useState<number[]>([])

  const handleGuestToggle = (guestIndex: number) => {
    setSelectedGuests((prev) =>
      prev.includes(guestIndex) ? prev.filter((idx) => idx !== guestIndex) : [...prev, guestIndex],
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedGuests.length === 0) {
      return
    }

    // Create a query string with all selected guest indices
    const guestParams = selectedGuests.map((idx) => `guestIndex=${idx}`).join("&")
    router.push(`/meal-selection?cabin=${cabinNumber}&${guestParams}`)
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
            />
            <Label htmlFor={`guest-${index}`} className="text-base">
              {guest.guest_name} <span className="text-muted-foreground text-sm">({guest.nationality})</span>
            </Label>
          </div>
        ))}
      </div>

      <Button type="submit" className="w-full" disabled={selectedGuests.length === 0}>
        Continue to Meal Selection
      </Button>
    </form>
  )
}
