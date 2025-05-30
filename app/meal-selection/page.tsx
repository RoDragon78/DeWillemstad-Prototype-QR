"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ChefHat, Users, Calendar } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

interface Guest {
  id: string
  guest_name: string
  cabin_nr: string
}

interface MealSelection {
  guestIndex: number
  day: number
  mealType: string
  mealName: string
}

const MEAL_OPTIONS = {
  breakfast: ["Continental Breakfast", "Full English Breakfast", "Pancakes & Fruit", "Yogurt & Granola"],
  lunch: ["Caesar Salad", "Grilled Chicken", "Fish & Chips", "Vegetarian Pasta", "Soup & Sandwich"],
  dinner: ["Beef Tenderloin", "Grilled Salmon", "Chicken Parmesan", "Vegetarian Risotto", "Pork Medallions"],
}

export default function MealSelectionPage() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [cabinNumber, setCabinNumber] = useState("")
  const [selections, setSelections] = useState<MealSelection[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    // Load cabin data from localStorage
    const cabin = localStorage.getItem("selectedCabin")
    const guestData = localStorage.getItem("cabinGuests")

    if (!cabin || !guestData) {
      router.push("/")
      return
    }

    setCabinNumber(cabin)
    setGuests(JSON.parse(guestData))
  }, [router])

  const handleMealSelection = (guestIndex: number, day: number, mealType: string, mealName: string) => {
    setSelections((prev) => {
      const filtered = prev.filter((s) => !(s.guestIndex === guestIndex && s.day === day && s.mealType === mealType))
      return [...filtered, { guestIndex, day, mealType, mealName }]
    })
  }

  const getSelection = (guestIndex: number, day: number, mealType: string) => {
    return (
      selections.find((s) => s.guestIndex === guestIndex && s.day === day && s.mealType === mealType)?.mealName || ""
    )
  }

  const isComplete = () => {
    const totalRequired = guests.length * 7 * 3 // guests × days × meals
    return selections.length === totalRequired
  }

  const handleSubmit = async () => {
    if (!isComplete()) {
      alert("Please complete all meal selections before submitting.")
      return
    }

    setIsLoading(true)
    try {
      // Prepare data for meal_choices table
      const mealChoices = selections.map((selection, index) => ({
        cabin_nr: cabinNumber,
        guest_index: selection.guestIndex,
        day: selection.day,
        meal_type: selection.mealType,
        meal_name: selection.mealName,
        meal: selection.mealName, // Legacy field
        submitted_at: new Date().toISOString(),
        cruise_id: "default",
      }))

      // Insert into meal_choices table
      const { error } = await supabase.from("meal_choices").insert(mealChoices)

      if (error) throw error

      // Clear localStorage and redirect
      localStorage.removeItem("selectedCabin")
      localStorage.removeItem("cabinGuests")
      router.push("/confirmation")
    } catch (error) {
      console.error("Error submitting selections:", error)
      alert("Failed to submit meal selections. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (guests.length === 0) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Meal Selection</h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              Cabin {cabinNumber}
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {guests.length} Guests
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />7 Days
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          {guests.map((guest, guestIndex) => (
            <Card key={guest.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ChefHat className="h-5 w-5" />
                  {guest.guest_name}
                </CardTitle>
                <CardDescription>Select meals for all 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                    <div key={day} className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3">Day {day}</h4>
                      <div className="grid md:grid-cols-3 gap-4">
                        {Object.entries(MEAL_OPTIONS).map(([mealType, options]) => (
                          <div key={mealType}>
                            <label className="block text-sm font-medium mb-2 capitalize">{mealType}</label>
                            <Select
                              value={getSelection(guestIndex, day, mealType)}
                              onValueChange={(value) => handleMealSelection(guestIndex, day, mealType, value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={`Select ${mealType}`} />
                              </SelectTrigger>
                              <SelectContent>
                                {options.map((option) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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

        <div className="mt-8 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Badge variant={isComplete() ? "default" : "secondary"}>
              {selections.length} / {guests.length * 21} selections
            </Badge>
            {isComplete() && <Badge variant="default">Complete!</Badge>}
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => router.push("/")}>
              Back
            </Button>
            <Button onClick={handleSubmit} disabled={!isComplete() || isLoading}>
              {isLoading ? "Submitting..." : "Submit Selections"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
