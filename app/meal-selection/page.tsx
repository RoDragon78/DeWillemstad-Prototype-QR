"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { FileDown, Save, AlertCircle, Check } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { MealPreviewDialog } from "@/components/meal-preview-dialog"
import { generateAndDownloadPdf } from "@/components/pdf-service"
import type { Guest } from "@/types/guest"
import type { MenuItem } from "@/types/menu-item"

// Day names
const DAY_NAMES = ["", "", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

// Language flags
const LANGUAGE_FLAGS = {
  en: "🇬🇧",
  de: "🇩🇪",
  nl: "🇳🇱",
}

export default function MealSelectionPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [cabinNumber, setCabinNumber] = useState<string | null>(null)
  const [guests, setGuests] = useState<Guest[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(2) // Default to Day 2
  const [mealSelections, setMealSelections] = useState<Record<string, Record<number, number>>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [isPdfGenerating, setIsPdfGenerating] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [language, setLanguage] = useState<"en" | "nl" | "de">("en")
  const [showPreview, setShowPreview] = useState(false)
  const [previewAction, setPreviewAction] = useState<"pdf" | "save" | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [redirectCountdown, setRedirectCountdown] = useState(0)

  // Track which days have selections
  const [daysWithSelections, setDaysWithSelections] = useState<Record<number, boolean>>({
    2: false,
    3: false,
    4: false,
    5: false,
    6: false,
    7: false,
  })

  // Countdown timer for redirect
  useEffect(() => {
    if (redirectCountdown > 0) {
      const timer = setTimeout(() => {
        setRedirectCountdown(redirectCountdown - 1)
      }, 1000)

      return () => clearTimeout(timer)
    } else if (redirectCountdown === 0 && successMessage) {
      // Redirect to home page when countdown reaches 0
      router.push("/")
    }
  }, [redirectCountdown, successMessage, router])

  // Fetch guests for cabin - memoized to prevent unnecessary re-renders
  const fetchGuestsForCabin = useCallback(
    async (cabin: string) => {
      try {
        const { data, error: queryError } = await supabase
          .from("guest_manifest")
          .select("id, guest_name, cabin_nr, nationality, booking_number, cruise_id")
          .eq("cabin_nr", cabin)

        if (queryError) {
          console.error("Error fetching guests:", queryError)
          setError("Failed to fetch guest information. Please try again.")
          setIsLoading(false)
          return
        }

        if (!data || data.length === 0) {
          setError("No guests found for this cabin. Please check the cabin number.")
          setIsLoading(false)
          return
        }

        console.log("Fetched guests:", data)
        setGuests(data)

        // Initialize meal selections
        const initialSelections: Record<string, Record<number, number>> = {}
        data.forEach((guest) => {
          initialSelections[guest.id] = {
            2: 0,
            3: 0,
            4: 0,
            5: 0,
            6: 0,
            7: 0,
          }
        })
        setMealSelections(initialSelections)

        // Check for existing selections
        fetchExistingSelections(data.map((g) => g.id))
      } catch (error) {
        console.error("Error in fetchGuestsForCabin:", error)
        setError("An unexpected error occurred. Please try again.")
        setIsLoading(false)
      }
    },
    [supabase],
  )

  // Fetch menu items - memoized
  const fetchMenuItems = useCallback(async () => {
    try {
      const { data, error: queryError } = await supabase
        .from("menu_items")
        .select("*")
        .order("day", { ascending: true })
        .order("meal_type", { ascending: true })

      if (queryError) {
        console.error("Error fetching menu items:", queryError)
        setError("Failed to fetch menu information. Please try again.")
        return
      }

      if (data) {
        console.log("Fetched menu items:", data)
        setMenuItems(data)
      }
    } catch (error) {
      console.error("Error in fetchMenuItems:", error)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  // Fetch existing selections - memoized
  const fetchExistingSelections = useCallback(
    async (guestIds: string[]) => {
      try {
        const { data, error: queryError } = await supabase.from("meal_selections").select("*").in("guest_id", guestIds)

        if (queryError) {
          console.error("Error fetching existing selections:", queryError)
          return
        }

        if (data && data.length > 0) {
          // Update meal selections with existing data
          const existingSelections = { ...mealSelections }
          const newDaysWithSelections = { ...daysWithSelections }

          data.forEach((selection) => {
            if (existingSelections[selection.guest_id]) {
              existingSelections[selection.guest_id][selection.day] = selection.meal_id
              newDaysWithSelections[selection.day] = true
            }
          })

          setMealSelections(existingSelections)
          setDaysWithSelections(newDaysWithSelections)
        }
      } catch (error) {
        console.error("Error fetching existing selections:", error)
      }
    },
    [supabase, mealSelections, daysWithSelections],
  )

  // Initial data loading
  useEffect(() => {
    // Get cabin number from localStorage
    const storedCabin = typeof window !== "undefined" ? localStorage.getItem("selectedCabin") : null

    if (!storedCabin) {
      router.push("/")
      return
    }

    setCabinNumber(storedCabin)

    // Get language preference
    const storedLanguage = localStorage.getItem("language") as "en" | "nl" | "de"
    if (storedLanguage) {
      setLanguage(storedLanguage)
    }

    // Fetch data in parallel for better performance
    Promise.all([fetchGuestsForCabin(storedCabin), fetchMenuItems()]).catch((err) => {
      console.error("Error loading initial data:", err)
      setError("Failed to load data. Please try again.")
      setIsLoading(false)
    })
  }, [router, fetchGuestsForCabin, fetchMenuItems])

  // Update days with selections whenever meal selections change
  useEffect(() => {
    const newDaysWithSelections = {
      2: false,
      3: false,
      4: false,
      5: false,
      6: false,
      7: false,
    }

    // Check each day - only mark as complete if ALL guests have made a selection
    for (let day = 2; day <= 7; day++) {
      const allGuestsSelected = guests.every((guest) => {
        return mealSelections[guest.id]?.[day] > 0
      })

      if (allGuestsSelected) {
        newDaysWithSelections[day] = true
      }
    }

    setDaysWithSelections(newDaysWithSelections)
  }, [mealSelections, guests])

  // Memoize the update function to prevent unnecessary re-renders
  const updateMealSelection = useCallback((guestId: string, day: number, mealId: number) => {
    setMealSelections((prev) => ({
      ...prev,
      [guestId]: {
        ...prev[guestId],
        [day]: mealId,
      },
    }))
    // Clear validation error when a selection is made
    setValidationError(null)
  }, [])

  // Validate that all meals are selected
  const validateSelections = useCallback(() => {
    // Check if all guests have made selections for all days
    for (const guestId in mealSelections) {
      for (let day = 2; day <= 7; day++) {
        if (!mealSelections[guestId][day]) {
          return false
        }
      }
    }
    return true
  }, [mealSelections])

  // Show preview before saving
  const handleShowPreview = (action: "pdf" | "save") => {
    if (!validateSelections()) {
      setValidationError("Please select a meal for each guest for all days before saving.")
      return
    }

    setPreviewAction(action)
    setShowPreview(true)
  }

  // Close preview
  const handleClosePreview = () => {
    setShowPreview(false)
    setPreviewAction(null)
  }

  const handleSave = async () => {
    setIsSaving(true)
    setValidationError(null)

    try {
      // Prepare meal selections for database
      const mealSelectionsToSave = []

      for (const guestId in mealSelections) {
        for (const day in mealSelections[guestId]) {
          const mealId = mealSelections[guestId][day]
          if (mealId) {
            const meal = menuItems.find((m) => m.id === mealId)
            if (meal) {
              mealSelectionsToSave.push({
                guest_id: guestId,
                day: Number.parseInt(day),
                meal_id: mealId,
                meal_name: meal[`name_${language}` as keyof MenuItem] || meal.name_en,
                meal_category: meal.meal_type,
                created_at: new Date().toISOString(),
              })
            }
          }
        }
      }

      // Save to database
      if (mealSelectionsToSave.length > 0) {
        const { error: saveError } = await supabase
          .from("meal_selections")
          .upsert(mealSelectionsToSave, { onConflict: "guest_id,day" })

        if (saveError) {
          console.error("Error saving meal selections:", saveError)
          throw new Error("Failed to save meal selections")
        }
      }

      // Show success message and start countdown
      setSuccessMessage("Your meal selections have been saved successfully!")
      setRedirectCountdown(3)
      setShowPreview(false)
    } catch (error) {
      console.error("Error saving selections:", error)
      alert("There was an error saving your selections. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveAsPDF = async () => {
    setIsPdfGenerating(true)
    setValidationError(null)
    setShowPreview(false)

    try {
      // First save the selections to the database
      // Prepare meal selections for database
      const mealSelectionsToSave = []

      for (const guestId in mealSelections) {
        for (const day in mealSelections[guestId]) {
          const mealId = mealSelections[guestId][day]
          if (mealId) {
            const meal = menuItems.find((m) => m.id === mealId)
            if (meal) {
              mealSelectionsToSave.push({
                guest_id: guestId,
                day: Number.parseInt(day),
                meal_id: mealId,
                meal_name: meal[`name_${language}` as keyof MenuItem] || meal.name_en,
                meal_category: meal.meal_type,
                created_at: new Date().toISOString(),
              })
            }
          }
        }
      }

      // Save to database
      if (mealSelectionsToSave.length > 0) {
        const { error: saveError } = await supabase
          .from("meal_selections")
          .upsert(mealSelectionsToSave, { onConflict: "guest_id,day" })

        if (saveError) {
          console.error("Error saving meal selections:", saveError)
          throw new Error("Failed to save meal selections")
        }
      }

      // Then generate and download the PDF
      const success = await generateAndDownloadPdf({
        cabinNumber: cabinNumber || "",
        guests,
        mealSelections,
        menuItems,
        language,
      })

      if (!success) {
        throw new Error("Failed to generate PDF")
      }

      // Show success message and start countdown
      setSuccessMessage("Your meal selections have been saved as PDF!")
      setRedirectCountdown(3)
    } catch (error) {
      console.error("Error generating PDF:", error)
      setValidationError("There was an error generating the PDF. Please try again.")
    } finally {
      setIsPdfGenerating(false)
    }
  }

  const handleLanguageChange = useCallback((lang: "en" | "nl" | "de") => {
    setLanguage(lang)
    localStorage.setItem("language", lang)
  }, [])

  // Memoize menu items by day for better performance
  const menuByDay = useMemo(() => {
    const result: Record<number, MenuItem[]> = {}
    menuItems.forEach((item) => {
      if (!result[item.day]) {
        result[item.day] = []
      }
      result[item.day].push(item)
    })
    return result
  }, [menuItems])

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <div className="rounded-lg bg-red-50 p-4 text-red-800">
          <p>{error}</p>
        </div>
        <Button className="mt-4" onClick={() => router.push("/")}>
          Return to Home
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">DeWillemstad Meal Selection</h1>
          <p className="mt-2 text-gray-600">River Cruise Dining</p>
        </div>

        {validationError && (
          <Alert className="mb-6 bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700">{validationError}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              {successMessage} Returning to home page in {redirectCountdown} seconds...
            </AlertDescription>
          </Alert>
        )}

        <div className="mb-6 flex justify-between items-center">
          <div className="rounded-lg bg-blue-50 p-4 text-center flex-grow">
            <h2 className="text-xl font-semibold">
              Cabin: {cabinNumber} - {guests.length} guests
            </h2>
          </div>

          <div className="ml-4">
            <select
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm"
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value as "en" | "nl" | "de")}
            >
              <option value="en">{LANGUAGE_FLAGS.en} English</option>
              <option value="de">{LANGUAGE_FLAGS.de} Deutsch</option>
              <option value="nl">{LANGUAGE_FLAGS.nl} Nederlands</option>
            </select>
          </div>
        </div>

        <Tabs defaultValue="2" onValueChange={(value) => setSelectedDay(Number.parseInt(value))}>
          <TabsList className="mb-8 grid w-full grid-cols-6">
            {[2, 3, 4, 5, 6, 7].map((day) => (
              <TabsTrigger key={day} value={day.toString()} className="relative">
                <span className="relative z-0">Day {day}</span>
                {daysWithSelections[day] && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white z-10">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {[2, 3, 4, 5, 6, 7].map((day) => (
            <TabsContent key={day} value={day.toString()}>
              <h3 className="mb-6 text-center text-2xl font-bold">{DAY_NAMES[day]}</h3>

              <div className={`grid ${guests.length === 2 ? "grid-cols-2" : "grid-cols-1 md:grid-cols-2"} gap-6`}>
                {guests.map((guest) => {
                  const dayMeals = menuByDay[day] || []

                  return (
                    <div key={guest.id} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                      <h4 className="mb-4 text-xl font-semibold">{guest.guest_name}</h4>

                      <RadioGroup
                        value={mealSelections[guest.id]?.[day]?.toString() || ""}
                        onValueChange={(value) => updateMealSelection(guest.id, day, Number(value))}
                      >
                        <div className="space-y-4">
                          {dayMeals.map((meal) => (
                            <div
                              key={meal.id}
                              className="rounded-lg border border-gray-100 p-4 cursor-pointer hover:bg-gray-50"
                              onClick={() => updateMealSelection(guest.id, day, meal.id)}
                            >
                              <div className="flex items-start space-x-2">
                                <RadioGroupItem
                                  value={meal.id.toString()}
                                  id={`${guest.id}-${meal.id}`}
                                  className="mt-1"
                                />
                                <div className="flex-1">
                                  <Label
                                    htmlFor={`${guest.id}-${meal.id}`}
                                    className="text-base font-medium cursor-pointer"
                                  >
                                    {meal[`name_${language}` as keyof MenuItem] || meal.name_en}
                                  </Label>
                                  <p className="text-sm text-gray-600">
                                    {meal[`description_${language}` as keyof MenuItem] || meal.description_en}
                                  </p>
                                  <p className="mt-1 text-xs text-gray-500">{meal.meal_type}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </RadioGroup>
                    </div>
                  )
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <div className="mt-8 flex justify-center space-x-4">
          <Button
            variant={validateSelections() ? "default" : "outline"}
            onClick={() => handleShowPreview("pdf")}
            disabled={isPdfGenerating || isSaving || !validateSelections() || redirectCountdown > 0}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Save as PDF
          </Button>
          <Button
            variant={validateSelections() ? "default" : "outline"}
            onClick={() => handleShowPreview("save")}
            disabled={isSaving || isPdfGenerating || !validateSelections() || redirectCountdown > 0}
          >
            <Save className="mr-2 h-4 w-4" />
            Save Selections
          </Button>
        </div>

        <div className="mt-4 text-center text-sm text-gray-500">
          <p>If you need to make changes after saving, please contact the Hotel Manager.</p>
        </div>
      </div>

      {/* Preview Dialog */}
      <MealPreviewDialog
        isOpen={showPreview}
        onClose={handleClosePreview}
        cabinNumber={cabinNumber || ""}
        guestNames={guests.map((g) => g.guest_name)}
        mealSelections={mealSelections}
        menuItems={menuItems}
        language={language}
        onSavePdf={handleSaveAsPDF}
        onSaveSelections={handleSave}
        isSaving={isSaving}
        isPdfGenerating={isPdfGenerating}
      />
    </div>
  )
}
