"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

interface Guest {
  index: number
  guest_name: string
  nationality: string
}

interface MenuItem {
  id: string
  day: number
  meal_type: string
  name_en: string
  name_de: string
  description_en: string
  description_de: string
}

interface MealSelectionFormProps {
  guests: Guest[]
  menuItems: MenuItem[]
  cabinNumber: string
}

// Group menu items by day and meal type
const groupMenuItems = (menuItems: MenuItem[]) => {
  const days = [2, 3, 4, 5, 6, 7]
  const result: Record<number, Record<string, MenuItem[]>> = {}

  days.forEach((day) => {
    result[day] = {
      starter: [],
      main: [],
      dessert: [],
    }
  })

  menuItems.forEach((item) => {
    // Map meal_type to our categories
    const category = item.meal_type
    if (result[item.day]) {
      if (result[item.day][category]) {
        result[item.day][category].push(item)
      }
    }
  })

  return result
}

export default function MealSelectionForm({ guests, menuItems, cabinNumber }: MealSelectionFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentGuestIndex, setCurrentGuestIndex] = useState(0)
  const [currentDay, setCurrentDay] = useState("2")

  const groupedMenuItems = groupMenuItems(menuItems)

  // Initialize selections for all guests and all days
  const [selections, setSelections] = useState<Record<number, Record<number, string>>>({})

  const currentGuest = guests[currentGuestIndex]

  const handleSelectionChange = (mealName: string) => {
    setSelections((prev) => {
      const guestSelections = prev[currentGuest.index] || {}

      return {
        ...prev,
        [currentGuest.index]: {
          ...guestSelections,
          [Number.parseInt(currentDay)]: mealName,
        },
      }
    })
  }

  const isCurrentDayComplete = () => {
    const guestSelections = selections[currentGuest.index] || {}
    return !!guestSelections[Number.parseInt(currentDay)]
  }

  const isGuestComplete = () => {
    const guestSelections = selections[currentGuest.index] || {}
    const days = [2, 3, 4, 5, 6, 7]

    return days.every((day) => !!guestSelections[day])
  }

  const moveToNextDay = () => {
    const nextDay = Number.parseInt(currentDay) + 1
    if (nextDay <= 7) {
      setCurrentDay(nextDay.toString())
    } else {
      // If we're at the last day, check if there are more guests
      if (currentGuestIndex < guests.length - 1) {
        setCurrentGuestIndex(currentGuestIndex + 1)
        setCurrentDay("2")
      } else {
        // All guests and days are done, submit the form
        handleSubmit()
      }
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      const supabase = createClient()

      // Format selections for database
      const mealChoices = []

      for (const guestIndex in selections) {
        for (const day in selections[guestIndex]) {
          mealChoices.push({
            cabin_nr: cabinNumber,
            guest_index: Number(guestIndex),
            meal: selections[guestIndex][day],
            cruise_id: "CR2023-06", // Using the cruise ID from sample data
            day: Number.parseInt(day),
            submitted_at: new Date().toISOString(),
          })
        }
      }

      // Insert all selections
      const { error } = await supabase
        .from("meal_choices")
        .upsert(mealChoices, { onConflict: "cabin_nr,guest_index,day,cruise_id" })

      if (error) throw error

      // Redirect to confirmation page
      const guestParams = guests.map((g) => `guestIndex=${g.index}`).join("&")
      router.push(`/confirmation?cabin=${cabinNumber}&${guestParams}`)
    } catch (err) {
      console.error("Error saving meal selections:", err)
      alert("There was an error saving your selections. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Selecting for: {currentGuest.guest_name}</CardTitle>
          <CardDescription>
            Guest {currentGuestIndex + 1} of {guests.length} • Day {currentDay} of 7
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={currentDay} onValueChange={setCurrentDay}>
            <TabsList className="grid grid-cols-6 mb-4">
              {[2, 3, 4, 5, 6, 7].map((day) => (
                <TabsTrigger key={day} value={day.toString()}>
                  Day {day}
                </TabsTrigger>
              ))}
            </TabsList>

            {[2, 3, 4, 5, 6, 7].map((day) => (
              <TabsContent key={day} value={day.toString()} className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-medium text-lg">Select your meal for Day {day}</h3>
                  <RadioGroup value={selections[currentGuest.index]?.[day] || ""} onValueChange={handleSelectionChange}>
                    {/* Starters */}
                    <div className="mb-6">
                      <h4 className="font-medium mb-2">Starters</h4>
                      {groupedMenuItems[day]?.starter.map((item) => (
                        <div key={item.id} className="flex items-start space-x-2 border p-3 rounded-md mb-2">
                          <RadioGroupItem value={item.name_en} id={`meal-${item.id}`} className="mt-1" />
                          <Label htmlFor={`meal-${item.id}`} className="flex-1 cursor-pointer">
                            <div className="font-medium">{item.name_en}</div>
                            <div className="text-sm text-muted-foreground">{item.description_en}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {item.name_de} - {item.description_de}
                            </div>
                          </Label>
                        </div>
                      ))}
                    </div>

                    {/* Main Courses */}
                    <div className="mb-6">
                      <h4 className="font-medium mb-2">Main Courses</h4>
                      {groupedMenuItems[day]?.main.map((item) => (
                        <div key={item.id} className="flex items-start space-x-2 border p-3 rounded-md mb-2">
                          <RadioGroupItem value={item.name_en} id={`meal-${item.id}`} className="mt-1" />
                          <Label htmlFor={`meal-${item.id}`} className="flex-1 cursor-pointer">
                            <div className="font-medium">{item.name_en}</div>
                            <div className="text-sm text-muted-foreground">{item.description_en}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {item.name_de} - {item.description_de}
                            </div>
                          </Label>
                        </div>
                      ))}
                    </div>

                    {/* Desserts */}
                    <div>
                      <h4 className="font-medium mb-2">Desserts</h4>
                      {groupedMenuItems[day]?.dessert.map((item) => (
                        <div key={item.id} className="flex items-start space-x-2 border p-3 rounded-md mb-2">
                          <RadioGroupItem value={item.name_en} id={`meal-${item.id}`} className="mt-1" />
                          <Label htmlFor={`meal-${item.id}`} className="flex-1 cursor-pointer">
                            <div className="font-medium">{item.name_en}</div>
                            <div className="text-sm text-muted-foreground">{item.description_en}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {item.name_de} - {item.description_de}
                            </div>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => {
            if (Number.parseInt(currentDay) > 2) {
              setCurrentDay((Number.parseInt(currentDay) - 1).toString())
            } else if (currentGuestIndex > 0) {
              setCurrentGuestIndex(currentGuestIndex - 1)
              setCurrentDay("7")
            }
          }}
          disabled={currentDay === "2" && currentGuestIndex === 0}
        >
          Previous
        </Button>

        <Button onClick={moveToNextDay} disabled={!isCurrentDayComplete() || isSubmitting}>
          {Number.parseInt(currentDay) < 7
            ? "Next Day"
            : currentGuestIndex < guests.length - 1
              ? "Next Guest"
              : "Review Selections"}
        </Button>
      </div>
    </div>
  )
}
