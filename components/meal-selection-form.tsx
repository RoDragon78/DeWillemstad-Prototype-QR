"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { clientStorage } from "@/utils/client-storage"

interface Guest {
  name: string
  dietaryRestrictions: string
}

interface MealSelectionFormProps {
  cabinNumber: string
  guests: Guest[]
}

// Sample meal options
const MEAL_OPTIONS = [
  { id: "option1", name: "Beef Wellington with Roasted Vegetables" },
  { id: "option2", name: "Grilled Salmon with Lemon Butter Sauce" },
  { id: "option3", name: "Vegetarian Pasta Primavera" },
  { id: "option4", name: "Chicken Cordon Bleu with Mashed Potatoes" },
]

export function MealSelectionForm({ cabinNumber, guests }: MealSelectionFormProps) {
  const [guestMeals, setGuestMeals] = useState<Record<number, string>>(
    guests.reduce((acc, _, index) => ({ ...acc, [index]: "" }), {}),
  )
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const updateMealSelection = (guestIndex: number, mealId: string) => {
    setGuestMeals({ ...guestMeals, [guestIndex]: mealId })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Check if all guests have selected a meal
    const allSelected = guests.every((_, index) => guestMeals[index])

    if (!allSelected) {
      alert("Please select a meal for each guest")
      setIsLoading(false)
      return
    }

    try {
      // Prepare meal selections data
      const mealSelections = guests.map((guest, index) => ({
        guestName: guest.name,
        mealOption: MEAL_OPTIONS.find((option) => option.id === guestMeals[index])?.name || "",
      }))

      // Store meal selections in session storage
      clientStorage.setSessionItem("mealSelections", JSON.stringify(mealSelections))

      // Navigate to confirmation page
      router.push("/confirmation")
    } catch (error) {
      console.error("Error storing meal selections:", error)
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {guests.map((guest, guestIndex) => (
        <div key={guestIndex} className="rounded-lg border border-gray-200 p-6">
          <h3 className="mb-4 text-xl font-medium">
            {guest.name}
            {guest.dietaryRestrictions && (
              <span className="ml-2 text-sm font-normal text-gray-500">({guest.dietaryRestrictions})</span>
            )}
          </h3>

          <RadioGroup value={guestMeals[guestIndex]} onValueChange={(value) => updateMealSelection(guestIndex, value)}>
            <div className="space-y-4">
              {MEAL_OPTIONS.map((option) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.id} id={`${guestIndex}-${option.id}`} />
                  <Label htmlFor={`${guestIndex}-${option.id}`} className="cursor-pointer">
                    {option.name}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>
      ))}

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Processing..." : "Confirm Selections"}
        </Button>
      </div>
    </form>
  )
}
