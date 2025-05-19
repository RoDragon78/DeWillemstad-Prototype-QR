"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { LanguageSelector } from "@/components/language-selector"
import { useTranslations } from "@/lib/i18n/use-translations"
import type { Language } from "@/lib/i18n/translations"
import { getGuestsByCabin, type Guest, saveMealChoices, getAllMenuItems, type MenuItem } from "@/lib/supabase-client"

const MEAL_TYPES = ["meat", "fish", "vegetarian"]
const DAYS = [2, 3, 4, 5, 6, 7]
const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday"]

// Mock menu items as fallback if API fails
const MOCK_MENU_ITEMS: MenuItem[] = [
  {
    id: 1,
    day: 2,
    meal_type: "meat",
    name_en: "Beef Tenderloin",
    name_de: "Rinderfilet",
    description_en: "Grilled beef tenderloin with red wine sauce",
    description_de: "Gegrilltes Rinderfilet mit Rotweinsauce",
  },
  {
    id: 2,
    day: 2,
    meal_type: "fish",
    name_en: "Grilled Salmon",
    name_de: "Gegrillter Lachs",
    description_en: "Grilled salmon with lemon butter sauce",
    description_de: "Gegrillter Lachs mit Zitronenbutter",
  },
  {
    id: 3,
    day: 2,
    meal_type: "vegetarian",
    name_en: "Vegetable Risotto",
    name_de: "Gemüserisotto",
    description_en: "Creamy risotto with seasonal vegetables",
    description_de: "Cremiges Risotto mit Saisongemüse",
  },
  {
    id: 4,
    day: 3,
    meal_type: "meat",
    name_en: "Roast Chicken",
    name_de: "Brathuhn",
    description_en: "Herb-roasted chicken with potatoes",
    description_de: "Kräuter-Brathuhn mit Kartoffeln",
  },
  {
    id: 5,
    day: 3,
    meal_type: "fish",
    name_en: "Sea Bass",
    name_de: "Wolfsbarsch",
    description_en: "Sea bass with Mediterranean herbs",
    description_de: "Wolfsbarsch mit mediterranen Kräutern",
  },
  {
    id: 6,
    day: 3,
    meal_type: "vegetarian",
    name_en: "Mushroom Pasta",
    name_de: "Pilz-Pasta",
    description_en: "Pasta with wild mushrooms and cream sauce",
    description_de: "Pasta mit Wildpilzen und Sahnesauce",
  },
  // Days 4-7 with similar pattern
  {
    id: 7,
    day: 4,
    meal_type: "meat",
    name_en: "Pork Chops",
    name_de: "Schweinekoteletts",
    description_en: "Grilled pork chops with apple sauce",
    description_de: "Gegrillte Schweinekoteletts mit Apfelsauce",
  },
  {
    id: 8,
    day: 4,
    meal_type: "fish",
    name_en: "Tuna Steak",
    name_de: "Thunfischsteak",
    description_en: "Seared tuna steak with sesame crust",
    description_de: "Gebratenes Thunfischsteak mit Sesamkruste",
  },
  {
    id: 9,
    day: 4,
    meal_type: "vegetarian",
    name_en: "Vegetable Curry",
    name_de: "Gemüsecurry",
    description_en: "Spicy vegetable curry with rice",
    description_de: "Würziges Gemüsecurry mit Reis",
  },
  {
    id: 10,
    day: 5,
    meal_type: "meat",
    name_en: "Lamb Chops",
    name_de: "Lammkoteletts",
    description_en: "Grilled lamb chops with mint sauce",
    description_de: "Gegrillte Lammkoteletts mit Minzsauce",
  },
  {
    id: 11,
    day: 5,
    meal_type: "fish",
    name_en: "Shrimp Scampi",
    name_de: "Garnelen Scampi",
    description_en: "Shrimp scampi with garlic and butter",
    description_de: "Garnelen Scampi mit Knoblauch und Butter",
  },
  {
    id: 12,
    day: 5,
    meal_type: "vegetarian",
    name_en: "Eggplant Parmesan",
    name_de: "Aubergine Parmesan",
    description_en: "Baked eggplant with tomato sauce and cheese",
    description_de: "Gebackene Aubergine mit Tomatensauce und Käse",
  },
  {
    id: 13,
    day: 6,
    meal_type: "meat",
    name_en: "Steak",
    name_de: "Steak",
    description_en: "Grilled steak with pepper sauce",
    description_de: "Gegrilltes Steak mit Pfeffersauce",
  },
  {
    id: 14,
    day: 6,
    meal_type: "fish",
    name_en: "Lobster",
    name_de: "Hummer",
    description_en: "Butter-poached lobster tail",
    description_de: "Butter-pochierter Hummerschwanz",
  },
  {
    id: 15,
    day: 6,
    meal_type: "vegetarian",
    name_en: "Stuffed Bell Peppers",
    name_de: "Gefüllte Paprika",
    description_en: "Bell peppers stuffed with rice and vegetables",
    description_de: "Mit Reis und Gemüse gefüllte Paprika",
  },
  {
    id: 16,
    day: 7,
    meal_type: "meat",
    name_en: "Duck Breast",
    name_de: "Entenbrust",
    description_en: "Pan-seared duck breast with orange sauce",
    description_de: "Gebratene Entenbrust mit Orangensauce",
  },
  {
    id: 17,
    day: 7,
    meal_type: "fish",
    name_en: "Cod",
    name_de: "Kabeljau",
    description_en: "Baked cod with herb crust",
    description_de: "Gebackener Kabeljau mit Kräuterkruste",
  },
  {
    id: 18,
    day: 7,
    meal_type: "vegetarian",
    name_en: "Vegetable Lasagna",
    name_de: "Gemüselasagne",
    description_en: "Layered pasta with vegetables and cheese",
    description_de: "Geschichtete Nudeln mit Gemüse und Käse",
  },
]

export default function MealSelectionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const cabinNumber = searchParams.get("cabin") || ""
  const guestIndicesParam = searchParams.getAll("guestIndex")
  const langParam = (searchParams.get("language") as Language) || "en"

  const guestIndices = guestIndicesParam.map(Number)

  const [language, setLanguage] = useState<Language>(langParam)
  const { t } = useTranslations(language)

  const [guests, setGuests] = useState<Guest[]>([])
  const [selectedGuests, setSelectedGuests] = useState<Guest[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetchAttempts, setFetchAttempts] = useState(0)

  const [currentGuestIndex, setCurrentGuestIndex] = useState(0)
  const [currentDay, setCurrentDay] = useState(2)
  const [selections, setSelections] = useState<Record<number, Record<number, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>("")

  // Fetch guests and menu items
  useEffect(() => {
    async function fetchData() {
      if (!cabinNumber || guestIndices.length === 0) {
        router.push("/")
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        setDebugInfo("Starting data fetch")

        // Fetch guests
        let guestData: Guest[] = []
        try {
          setDebugInfo((prev) => `${prev}\nFetching guests for cabin ${cabinNumber}`)
          guestData = await getGuestsByCabin(cabinNumber)
          setDebugInfo((prev) => `${prev}\nReceived ${guestData.length} guests`)
        } catch (err: any) {
          console.error("Error fetching guests:", err)
          setDebugInfo((prev) => `${prev}\nError fetching guests: ${err?.message || "Unknown error"}`)

          // If we've already tried 3 times, show an error
          if (fetchAttempts >= 2) {
            setError(t("error"))
            setIsLoading(false)
            return
          }

          // Otherwise, try again after a delay
          setTimeout(() => {
            setFetchAttempts(fetchAttempts + 1)
          }, 1000)
          return
        }

        if (guestData.length === 0) {
          setDebugInfo((prev) => `${prev}\nNo guests found for cabin ${cabinNumber}`)
          setError(t("noCabinFound"))
          setTimeout(() => router.push("/"), 3000)
          return
        }

        setGuests(guestData)
        setDebugInfo((prev) => `${prev}\nGuests set successfully`)

        // Filter guests based on selected indices
        const selected = guestIndices
          .map((index) => {
            if (index >= 0 && index < guestData.length) {
              return guestData[index]
            }
            return null
          })
          .filter(Boolean) as Guest[]

        setDebugInfo((prev) => `${prev}\nFiltered to ${selected.length} selected guests`)

        if (selected.length === 0) {
          setDebugInfo((prev) => `${prev}\nNo valid guest indices, redirecting`)
          router.push(`/select-guests?cabin=${cabinNumber}&language=${language}`)
          return
        }

        setSelectedGuests(selected)
        setDebugInfo((prev) => `${prev}\nSelected guests set successfully`)

        // Fetch all menu items
        try {
          setDebugInfo((prev) => `${prev}\nFetching menu items`)
          const items = await getAllMenuItems()
          setMenuItems(items)
          setDebugInfo((prev) => `${prev}\nReceived ${items.length} menu items`)
        } catch (err: any) {
          console.error("Error fetching menu items:", err)
          setDebugInfo(
            (prev) => `${prev}\nError fetching menu items: ${err?.message || "Unknown error"}\nUsing mock data`,
          )

          // Use mock data as fallback
          setMenuItems(MOCK_MENU_ITEMS)
        }
      } catch (err: any) {
        console.error("Error fetching data:", err)
        setDebugInfo((prev) => `${prev}\nGeneral error: ${err?.message || "Unknown error"}`)
        setError(t("error"))
      } finally {
        setIsLoading(false)
        setDebugInfo((prev) => `${prev}\nFetch complete, loading state set to false`)
      }
    }

    fetchData()
  }, [cabinNumber, guestIndices, router, language, t, fetchAttempts])

  // Update language in URL when changed
  useEffect(() => {
    if (language !== langParam && cabinNumber) {
      const guestParams = guestIndices.map((idx) => `guestIndex=${idx}`).join("&")
      const newUrl = `/meal-selection?cabin=${cabinNumber}&${guestParams}&language=${language}`
      window.history.replaceState({}, "", newUrl)
    }
  }, [language, langParam, cabinNumber, guestIndices])

  const handleSelectionChange = (mealType: string) => {
    setSelections((prev) => {
      const guestIndex = guestIndices[currentGuestIndex]
      const guestSelections = prev[guestIndex] || {}

      return {
        ...prev,
        [guestIndex]: {
          ...guestSelections,
          [currentDay]: mealType,
        },
      }
    })
  }

  const isCurrentDayComplete = () => {
    const guestIndex = guestIndices[currentGuestIndex]
    const guestSelections = selections[guestIndex] || {}
    return !!guestSelections[currentDay]
  }

  const moveToNextDay = () => {
    if (currentDay < 7) {
      setCurrentDay(currentDay + 1)
    } else {
      // If we're at the last day, check if there are more guests
      if (currentGuestIndex < selectedGuests.length - 1) {
        setCurrentGuestIndex(currentGuestIndex + 1)
        setCurrentDay(2)
      } else {
        // All guests and days are done, submit the form
        handleSubmit()
      }
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Format selections for database
      const mealChoices = []

      for (let i = 0; i < guestIndices.length; i++) {
        const guestIndex = guestIndices[i]
        const guestSelections = selections[guestIndex] || {}

        for (let day = 2; day <= 7; day++) {
          const mealType = guestSelections[day]

          if (mealType) {
            mealChoices.push({
              cabin_nr: cabinNumber,
              guest_index: guestIndex,
              meal: mealType,
              meal_type: mealType,
              cruise_id: guests[guestIndex]?.cruise_id || "",
              submitted_at: new Date().toISOString(),
            })
          }
        }
      }

      // Save to database
      await saveMealChoices(mealChoices)

      // Redirect to confirmation page
      const guestParams = guestIndices.map((idx) => `guestIndex=${idx}`).join("&")
      router.push(`/confirmation?cabin=${cabinNumber}&${guestParams}&language=${language}`)
    } catch (err) {
      console.error("Error saving meal selections:", err)
      setError(t("error"))
      setIsSubmitting(false)
    }
  }

  // Get menu items for the current day and meal type
  const getMenuItemsForCurrentDay = (mealType: string): MenuItem | undefined => {
    return menuItems.find((item) => item.day === currentDay && item.meal_type === mealType)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 px-4 max-w-4xl text-center">
        <div className="flex flex-col items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p>{t("loading")}</p>
          <p className="text-sm text-gray-500 mt-2">Loading cabin: {cabinNumber}</p>
        </div>
      </div>
    )
  }

  // Show error state with debugging info
  if (error) {
    return (
      <div className="container mx-auto py-10 px-4 max-w-4xl text-center">
        <div className="bg-red-50 border border-red-200 rounded-md p-6">
          <h2 className="text-red-700 text-lg font-medium mb-2">{t("error")}</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {t("startOver")}
          </button>

          {process.env.NODE_ENV !== "production" && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm text-gray-500">Debug Info</summary>
              <pre className="mt-2 p-2 bg-gray-100 text-xs overflow-auto rounded">{debugInfo}</pre>
            </details>
          )}
        </div>
      </div>
    )
  }

  // Add a fallback if selectedGuests is empty but we're past the loading state
  if (!selectedGuests.length) {
    return (
      <div className="container mx-auto py-10 px-4 max-w-4xl text-center">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-6">
          <h2 className="text-yellow-700 text-lg font-medium mb-2">{t("warning")}</h2>
          <p className="text-yellow-600 mb-4">No guests selected. Please return to the previous page.</p>
          <button
            onClick={() => router.push(`/select-guests?cabin=${cabinNumber}&language=${language}`)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {t("back")}
          </button>
        </div>
      </div>
    )
  }

  const currentGuest = selectedGuests[currentGuestIndex]

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl relative">
      <LanguageSelector language={language} onChange={setLanguage} />

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t("mealSelection")}</h1>
        <p className="text-muted-foreground mt-2">{t("cabinInfo", { cabin: cabinNumber })}</p>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <h2 className="font-semibold text-lg">{t("selectingFor", { name: currentGuest?.guest_name })}</h2>
          <p className="text-sm text-gray-500">
            {t("guestProgress", {
              current: currentGuestIndex + 1,
              total: selectedGuests.length,
              day: currentDay,
            })}
          </p>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <div className="flex border-b">
              {DAYS.map((day, index) => (
                <button
                  key={day}
                  onClick={() => setCurrentDay(day)}
                  className={`flex-1 py-2 px-1 text-center text-sm ${
                    currentDay === day ? "border-b-2 border-blue-500 font-medium" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t("day")} {day}
                  <div className="text-xs">{t(DAY_NAMES[index])}</div>
                </button>
              ))}
            </div>
          </div>

          <h3 className="font-medium mb-4">{t("selectMeal", { day: currentDay })}</h3>

          <div className="space-y-4">
            {MEAL_TYPES.map((mealType) => {
              const guestIndex = guestIndices[currentGuestIndex]
              const isSelected = selections[guestIndex]?.[currentDay] === mealType
              const menuItem = getMenuItemsForCurrentDay(mealType)

              return (
                <div
                  key={mealType}
                  onClick={() => handleSelectionChange(mealType)}
                  className={`p-4 border rounded-md cursor-pointer ${
                    isSelected ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start">
                    <div className="h-5 w-5 mt-0.5 mr-3">
                      <input
                        type="radio"
                        checked={isSelected}
                        onChange={() => handleSelectionChange(mealType)}
                        className="h-5 w-5"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{t(mealType)}</div>

                      {menuItem && (
                        <div className="mt-2">
                          <div className="font-medium text-sm">
                            {language === "de" ? menuItem.name_de : menuItem.name_en}
                          </div>
                          <div className="text-sm text-gray-600">
                            {language === "de" ? menuItem.description_de : menuItem.description_en}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {error && <p className="text-red-500 mt-4">{error}</p>}

          <div className="flex justify-between mt-8">
            <button
              onClick={() => {
                if (currentDay > 2) {
                  setCurrentDay(currentDay - 1)
                } else if (currentGuestIndex > 0) {
                  setCurrentGuestIndex(currentGuestIndex - 1)
                  setCurrentDay(7)
                }
              }}
              className="px-4 py-2 border rounded hover:bg-gray-50"
              disabled={currentDay === 2 && currentGuestIndex === 0}
            >
              {t("previous")}
            </button>

            <button
              onClick={moveToNextDay}
              disabled={!isCurrentDayComplete() || isSubmitting}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  {t("loading")}
                </div>
              ) : currentDay < 7 ? (
                t("nextDay")
              ) : currentGuestIndex < selectedGuests.length - 1 ? (
                t("nextGuest")
              ) : (
                t("reviewSelections")
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
