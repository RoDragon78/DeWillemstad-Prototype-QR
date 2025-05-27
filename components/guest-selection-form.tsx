"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { clientStorage } from "@/utils/client-storage"

interface GuestSelectionFormProps {
  cabinNumber: string
}

export function GuestSelectionForm({ cabinNumber }: GuestSelectionFormProps) {
  const [guests, setGuests] = useState([{ name: "", dietaryRestrictions: "" }])
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const addGuest = () => {
    setGuests([...guests, { name: "", dietaryRestrictions: "" }])
  }

  const removeGuest = (index: number) => {
    if (guests.length > 1) {
      const updatedGuests = [...guests]
      updatedGuests.splice(index, 1)
      setGuests(updatedGuests)
    }
  }

  const updateGuest = (index: number, field: "name" | "dietaryRestrictions", value: string) => {
    const updatedGuests = [...guests]
    updatedGuests[index] = { ...updatedGuests[index], [field]: value }
    setGuests(updatedGuests)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Store guest information in session storage
      clientStorage.setSessionItem("guests", JSON.stringify(guests))

      // Navigate to meal selection page
      router.push("/meal-selection")
    } catch (error) {
      console.error("Error storing guest information:", error)
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {guests.map((guest, index) => (
          <div key={index} className="rounded-lg border border-gray-200 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium">Guest {index + 1}</h3>
              {guests.length > 1 && (
                <Button type="button" variant="outline" size="sm" onClick={() => removeGuest(index)}>
                  Remove
                </Button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor={`guest-${index}-name`}>Name</Label>
                <Input
                  id={`guest-${index}-name`}
                  value={guest.name}
                  onChange={(e) => updateGuest(index, "name", e.target.value)}
                  placeholder="Enter guest name"
                  required
                />
              </div>

              <div>
                <Label htmlFor={`guest-${index}-dietary`}>Dietary Restrictions (Optional)</Label>
                <Input
                  id={`guest-${index}-dietary`}
                  value={guest.dietaryRestrictions}
                  onChange={(e) => updateGuest(index, "dietaryRestrictions", e.target.value)}
                  placeholder="E.g., vegetarian, gluten-free, allergies"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={addGuest}>
          Add Another Guest
        </Button>

        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Processing..." : "Continue to Meal Selection"}
        </Button>
      </div>
    </form>
  )
}
