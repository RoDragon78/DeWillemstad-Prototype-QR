"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Users, CheckCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface Guest {
  id: string
  guest_name: string
  cabin_nr: string
  nationality: string
  table_nr: number
}

interface MealChoice {
  guestId: string
  guestName: string
  day: number
  mealType: string
  meal: string
  mealName: string
}

const MEAL_OPTIONS = {
  breakfast: ["Continental Breakfast", "Full English Breakfast", "Vegetarian Breakfast"],
  lunch: ["Soup & Sandwich", "Caesar Salad", "Fish & Chips", "Vegetarian Pasta"],
  dinner: ["Beef Tenderloin", "Grilled Salmon", "Chicken Breast", "Vegetarian Risotto"],
}

export default function MealSelectionPage() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [cabinNumber, setCabinNumber] = useState("")
  const [mealChoices, setMealChoices] = useState<MealChoice[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Load cabin data from localStorage
    const cabin = localStorage.getItem("selectedCabin")
    const guestData = localStorage.getItem("cabinGuests")

    if (!cabin || !guestData) {
      router.push("/")
      return
    }

    setCabinNumber(cabin)
    const parsedGuests = JSON.parse(guestData)
    setGuests(parsedGuests)

    // Initialize meal choices for 7 days
    const initialChoices: MealChoice[] = []
    for (let day = 1; day <= 7; day++) {
      for (const guest of parsedGuests) {
        for (const mealType of ["breakfast", "lunch", "dinner"]) {
          initialChoices.push({
            guestId: guest.id,
            guestName: guest.guest_name,
            day,
            mealType,
            meal: MEAL_OPTIONS[mealType as keyof typeof MEAL_OPTIONS][0],
            mealName: MEAL_OPTIONS[mealType as keyof typeof MEAL_OPTIONS][0],
          })
        }
      }
    }
    setMealChoices(initialChoices)
  }, [router])

  const updateMealChoice = (guestId: string, day: number, mealType: string, meal: string) => {
    setMealChoices((prev) =>
      prev.map((choice) =>
        choice.guestId === guestId && choice.day === day && choice.mealType === mealType
          ? { ...choice, meal, mealName: meal }
          : choice,
      ),
    )
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Save meal choices to database
      const choicesForDb = mealChoices.map((choice) => ({
        guest_index: guests.findIndex((g) => g.id === choice.guestId),
        cabin_nr: cabinNumber,
        day: choice.day,
        meal_type: choice.mealType,
        meal: choice.meal,
        meal_name: choice.mealName,
        cruise_id: "default",
        submitted_at: new Date().toISOString(),
        edited_by: "guest",
      }))

      const { error: insertError } = await supabase.from("meal_choices").insert(choicesForDb)

      if (insertError) {
        throw insertError
      }

      setSuccess(true)
      setTimeout(() => {
        router.push("/confirmation")
      }, 2000)
    } catch (err) {
      console.error("Error saving meal choices:", err)
      setError("Failed to save meal selections. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-700 mb-2">Success!</h2>
            <p className="text-gray-600">Your meal selections have been saved.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" onClick={() => router.push("/")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Meal Selection</h1>
            <p className="text-gray-600">Cabin {cabinNumber}</p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6">
          {guests.map((guest) => (
            <Card key={guest.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {guest.guest_name}
                </CardTitle>
                <CardDescription>
                  Table {guest.table_nr} • {guest.nationality}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                    <div key={day} className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3">Day {day}</h4>
                      <div className="grid md:grid-cols-3 gap-4">
                        {["breakfast", "lunch", "dinner"].map((mealType) => (
                          <div key={mealType}>
                            <label className="block text-sm font-medium mb-2 capitalize">{mealType}</label>
                            <select
                              className="w-full p-2 border rounded-md"
                              value={
                                mealChoices.find(
                                  (c) => c.guestId === guest.id && c.day === day && c.mealType === mealType,
                                )?.meal || ""
                              }
                              onChange={(e) => updateMealChoice(guest.id, day, mealType, e.target.value)}
                            >
                              {MEAL_OPTIONS[mealType as keyof typeof MEAL_OPTIONS].map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Button onClick={handleSubmit} disabled={isLoading} size="lg">
            {isLoading ? "Saving..." : "Submit Meal Selections"}
          </Button>
        </div>
      </div>
    </div>
  )
}
