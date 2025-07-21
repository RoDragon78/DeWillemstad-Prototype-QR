"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { AlertCircle, Check, ChevronLeft, ChevronRight, FileDown, ArrowLeft } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

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
  const [cabinNumber, setCabinNumber] = useState("")
  const [guests, setGuests] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(2) // Default to Day 2
  const [mealSelections, setMealSelections] = useState({})
  const [isSaving, setIsSaving] = useState(false)
  const [isPdfGenerating, setIsPdfGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [validationError, setValidationError] = useState(null)
  const [language, setLanguage] = useState("en")
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [redirectCountdown, setRedirectCountdown] = useState(3)

  // Track which days have selections
  const [daysWithSelections, setDaysWithSelections] = useState({
    2: false,
    3: false,
    4: false,
    5: false,
    6: false,
    7: false,
  })

  // Countdown timer for redirect
  useEffect(() => {
    if (!showConfirmation) return

    if (redirectCountdown > 0) {
      const timer = setTimeout(() => {
        setRedirectCountdown(redirectCountdown - 1)
      }, 1000)

      return () => clearTimeout(timer)
    } else {
      // Redirect to home page when countdown reaches 0
      router.push("/")
    }
  }, [redirectCountdown, showConfirmation, router])

  // Fetch guests for cabin
  const fetchGuestsForCabin = useCallback(
    async (cabin) => {
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
        const initialSelections = {}
        for (let i = 0; i < data.length; i++) {
          const guest = data[i]
          initialSelections[guest.id] = {
            2: 0,
            3: 0,
            4: 0,
            5: 0,
            6: 0,
            7: 0,
          }
        }
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

  // Fetch menu items
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

  // Fetch existing selections
  const fetchExistingSelections = useCallback(
    async (guestIds) => {
      try {
        const { data, error: queryError } = await supabase.from("meal_selections").select("*").in("guest_id", guestIds)

        if (queryError) {
          console.error("Error fetching existing selections:", queryError)
          return
        }

        if (data && data.length > 0) {
          // Update meal selections with existing data
          const existingSelections = {}
          for (const guestId in mealSelections) {
            existingSelections[guestId] = { ...mealSelections[guestId] }
          }

          const newDaysWithSelections = { ...daysWithSelections }

          for (let i = 0; i < data.length; i++) {
            const selection = data[i]
            if (existingSelections[selection.guest_id]) {
              existingSelections[selection.guest_id][selection.day] = selection.meal_id
              newDaysWithSelections[selection.day] = true
            }
          }

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
    const storedLanguage = localStorage.getItem("language")
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
      let allGuestsSelected = true
      for (let i = 0; i < guests.length; i++) {
        const guest = guests[i]
        if (!mealSelections[guest.id] || !mealSelections[guest.id][day]) {
          allGuestsSelected = false
          break
        }
      }

      if (allGuestsSelected) {
        newDaysWithSelections[day] = true
      }
    }

    setDaysWithSelections(newDaysWithSelections)
  }, [mealSelections, guests])

  // Update meal selection
  const updateMealSelection = useCallback((guestId, day, mealId) => {
    setMealSelections((prev) => {
      const newSelections = {}
      for (const id in prev) {
        newSelections[id] = { ...prev[id] }
      }
      if (!newSelections[guestId]) {
        newSelections[guestId] = {}
      }
      newSelections[guestId][day] = mealId
      return newSelections
    })
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

  // Navigate to previous day
  const goToPreviousDay = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (selectedDay > 2) {
      setSelectedDay(selectedDay - 1)
    }
  }

  // Navigate to next day
  const goToNextDay = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (selectedDay < 7) {
      setSelectedDay(selectedDay + 1)
    }
  }

  // Generate PDF
  const generatePdf = async () => {
    setIsPdfGenerating(true)
    try {
      // Import the PDF generation function dynamically
      const { generateAndDownloadPdf } = await import("@/components/pdf-service")

      // Prepare guest names for PDF
      const guestNames = guests.map((guest) => guest.guest_name)

      // Call the PDF generation function
      await generateAndDownloadPdf({
        cabinNumber,
        guests,
        mealSelections,
        menuItems,
        language,
      })

      return true
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Failed to generate PDF. Please try again.")
      return false
    } finally {
      setIsPdfGenerating(false)
    }
  }

  // Handle save and generate PDF (now the main save function)
  const handleSaveAndGeneratePdf = async () => {
    if (!validateSelections()) {
      setValidationError("Please select a meal for each guest for all days before saving.")
      return
    }

    setIsSaving(true)
    setIsPdfGenerating(true)
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
              // Get meal name based on language
              let mealName = meal.name_en
              if (language === "nl" && meal.name_nl) mealName = meal.name_nl
              if (language === "de" && meal.name_de) mealName = meal.name_de

              mealSelectionsToSave.push({
                guest_id: guestId,
                day: Number.parseInt(day),
                meal_id: mealId,
                meal_name: mealName,
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

      // Generate PDF
      await generatePdf()

      // Show confirmation screen and start countdown
      setShowConfirmation(true)
      setRedirectCountdown(3)
    } catch (error) {
      console.error("Error saving selections:", error)
      alert("There was an error saving your selections. Please try again.")
    } finally {
      setIsSaving(false)
      setIsPdfGenerating(false)
    }
  }

  const handleLanguageChange = useCallback((lang) => {
    setLanguage(lang)
    localStorage.setItem("language", lang)
  }, [])

  // Function to handle meal option click with explicit event prevention
  const handleMealOptionClick = useCallback(
    (e, guestId, day, mealId) => {
      e.preventDefault()
      e.stopPropagation()
      updateMealSelection(guestId, day, mealId)
    },
    [updateMealSelection],
  )

  // Get meal name by ID
  const getMealName = useCallback(
    (mealId) => {
      const meal = menuItems.find((m) => m.id === mealId)
      if (!meal) return ""

      // Get meal name based on language
      if (language === "en") return meal.name_en
      if (language === "nl") return meal.name_nl || meal.name_en
      if (language === "de") return meal.name_de || meal.name_en
      return meal.name_en
    },
    [menuItems, language],
  )

  // Get menu items for a specific day
  const getMenuItemsForDay = useCallback(
    (day) => {
      return menuItems.filter((item) => item.day === day)
    },
    [menuItems],
  )

  // Handle back button click
  const handleBackToHome = () => {
    router.push("/")
  }

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

  // Show confirmation screen after saving
  if (showConfirmation) {
    return (
      <div className="min-h-screen bg-white p-4">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">DeWillemstad Meal Selection</h1>
            <p className="mt-1 text-gray-600">River Cruise Dining</p>
          </div>

          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
              <Check className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
          <p className="text-lg mb-2">Your meal choices have been saved successfully.</p>
          <p className="text-gray-600 mb-6">Returning to home page in {redirectCountdown} seconds...</p>

          <div className="flex justify-center gap-4 mb-8">
            <Button onClick={handleBackToHome}>Return to Home Now</Button>
            <Button variant="outline" onClick={generatePdf} disabled={isPdfGenerating}>
              <FileDown className="mr-2 h-4 w-4" />
              {isPdfGenerating ? "Generating PDF..." : "Save as PDF"}
            </Button>
          </div>

          <div className="max-w-2xl mx-auto text-left">
            <h3 className="text-lg font-medium mb-4">Your selections:</h3>

            {guests.map((guest) => (
              <div key={guest.id} className="mb-6">
                <h4 className="text-blue-600 font-medium">{guest.guest_name}</h4>
                <div className="grid grid-cols-2 gap-x-8 mt-2">
                  <div className="space-y-2">
                    {[2, 3, 4, 5, 6, 7].map((day) => (
                      <div key={day} className="text-gray-600">
                        Day {day} ({DAY_NAMES[day]}):
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {[2, 3, 4, 5, 6, 7].map((day) => {
                      const mealId = mealSelections[guest.id]?.[day]
                      return (
                        <div key={day} className="font-medium">
                          {mealId ? getMealName(mealId) : "No selection"}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900">DeWillemstad Meal Selection</h1>
          <p className="mt-1 text-gray-600">River Cruise Dining</p>
        </div>

        {validationError && (
          <Alert className="mb-4 bg-amber-50 border-amber-200">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700">{validationError}</AlertDescription>
          </Alert>
        )}

        <div className="mb-4 rounded-lg bg-blue-50 p-4">
          <h2 className="text-lg font-medium text-blue-800">
            Cabin {cabinNumber} - {guests.length} guest(s)
          </h2>
        </div>

        <div className="mb-2 flex justify-between items-center">
          <Button variant="outline" onClick={handleBackToHome} className="flex items-center bg-transparent">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>

          <select
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm"
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
          >
            <option value="en">{LANGUAGE_FLAGS.en} English</option>
            <option value="de">{LANGUAGE_FLAGS.de} Deutsch</option>
            <option value="nl">{LANGUAGE_FLAGS.nl} Nederlands</option>
          </select>
        </div>

        {/* Day tabs */}
        <div className="mb-2 flex justify-between">
          {[2, 3, 4, 5, 6, 7].map((day) => (
            <button
              key={day}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setSelectedDay(day)
              }}
              className={`relative px-4 py-2 text-sm font-medium rounded-t-md ${
                selectedDay === day
                  ? "bg-blue-100 text-blue-800"
                  : daysWithSelections[day]
                    ? "bg-green-50 text-green-800"
                    : "bg-gray-50 text-gray-800 hover:bg-gray-100"
              }`}
            >
              Day {day} {daysWithSelections[day] && <span className="text-green-500 ml-1">✓</span>}
            </button>
          ))}
        </div>

        <h3 className="mb-4 text-center text-xl font-medium text-gray-900">{DAY_NAMES[selectedDay]}</h3>

        {/* Guest meal selections - side by side */}
        <div className="grid grid-cols-2 gap-4">
          {guests.map((guest) => {
            const dayMeals = getMenuItemsForDay(selectedDay)

            return (
              <div key={guest.id} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
                <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
                  <h4 className="text-base font-medium">{guest.guest_name}</h4>
                </div>

                <RadioGroup
                  value={mealSelections[guest.id]?.[selectedDay]?.toString() || ""}
                  onValueChange={(value) => updateMealSelection(guest.id, selectedDay, Number(value))}
                  className="p-1"
                >
                  {dayMeals.map((meal) => {
                    const isSelected = mealSelections[guest.id]?.[selectedDay] === meal.id

                    // Get meal name based on language
                    let mealName = meal.name_en
                    if (language === "nl" && meal.name_nl) mealName = meal.name_nl
                    if (language === "de" && meal.name_de) mealName = meal.name_de

                    // Get meal description based on language
                    let mealDescription = meal.description_en
                    if (language === "nl" && meal.description_nl) mealDescription = meal.description_nl
                    if (language === "de" && meal.description_de) mealDescription = meal.description_de

                    return (
                      <div
                        key={meal.id}
                        className={`border-b last:border-0 border-gray-100 ${isSelected ? "bg-blue-50" : ""}`}
                        onClick={(e) => handleMealOptionClick(e, guest.id, selectedDay, meal.id)}
                      >
                        <div className="flex items-start p-2 cursor-pointer hover:bg-gray-50 rounded-md">
                          <RadioGroupItem
                            value={meal.id.toString()}
                            id={`${guest.id}-${meal.id}`}
                            className="mt-1 mr-2"
                          />
                          <div className="flex-1">
                            <Label htmlFor={`${guest.id}-${meal.id}`} className="text-sm font-medium cursor-pointer">
                              {mealName}
                            </Label>
                            <p className="text-xs text-gray-600 mt-1">{mealDescription}</p>
                            <p className="mt-1 text-xs text-gray-500">{meal.meal_type}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </RadioGroup>
              </div>
            )
          })}
        </div>

        {/* Navigation buttons */}
        <div className="mt-6 flex justify-between">
          <Button
            variant="outline"
            onClick={(e) => goToPreviousDay(e)}
            disabled={selectedDay <= 2}
            className="flex items-center"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          <div className="flex gap-2">
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleSaveAndGeneratePdf()
              }}
              disabled={isSaving || isPdfGenerating || !validateSelections()}
            >
              <FileDown className="mr-2 h-4 w-4" />
              {isPdfGenerating || isSaving ? "Processing..." : "Complete Selection & Save PDF"}
            </Button>
          </div>

          <Button
            variant="outline"
            onClick={(e) => goToNextDay(e)}
            disabled={selectedDay >= 7}
            className="flex items-center"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <div className="mt-4 text-center text-sm text-gray-500">
          <p>If you need to make changes after saving, please contact the Hotel Manager.</p>
        </div>
      </div>
    </div>
  )
}
