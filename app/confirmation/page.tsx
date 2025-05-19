"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { LanguageSelector } from "@/components/language-selector"
import { useTranslations } from "@/lib/i18n/use-translations"
import type { Language } from "@/lib/i18n/translations"
import {
  getGuestsByCabin,
  type Guest,
  getMealChoicesByCabin,
  type MealChoice,
  getAllMenuItems,
  type MenuItem,
} from "@/lib/supabase-client"

const DAYS = [2, 3, 4, 5, 6, 7]
const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday"]

export default function ConfirmationPage() {
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
  const [mealChoices, setMealChoices] = useState<MealChoice[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeGuestIndex, setActiveGuestIndex] = useState(0)
  const [fetchAttempts, setFetchAttempts] = useState(0)

  // Fetch guests, meal choices, and menu items
  useEffect(() => {
    async function fetchData() {
      if (!cabinNumber) {
        router.push("/")
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        // Fetch guests
        let guestData: Guest[] = []
        try {
          guestData = await getGuestsByCabin(cabinNumber)
        } catch (err) {
          console.error("Error fetching guests:", err)
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
          setError(t("noCabinFound"))
          setTimeout(() => router.push("/"), 3000)
          return
        }

        setGuests(guestData)

        // Filter guests based on selected indices if provided
        if (guestIndices.length > 0) {
          const selected = guestIndices.map((index) => guestData[index]).filter(Boolean)
          setSelectedGuests(selected)
        } else {
          setSelectedGuests(guestData)
        }

        // Fetch meal choices
        let choices: MealChoice[] = []
        try {
          choices = await getMealChoicesByCabin(cabinNumber)
          setMealChoices(choices)
        } catch (err) {
          console.error("Error fetching meal choices:", err)
          // Continue with empty choices rather than failing completely
          setMealChoices([])
        }

        // Fetch all menu items
        try {
          const items = await getAllMenuItems()
          setMenuItems(items)
        } catch (err) {
          console.error("Error fetching menu items:", err)
          // Continue with empty menu items rather than failing completely
          setMenuItems([])
        }
      } catch (err) {
        console.error("Error fetching data:", err)
        setError(t("error"))
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [cabinNumber, guestIndices, router, t, fetchAttempts])

  // Update language in URL when changed
  useEffect(() => {
    if (language !== langParam && cabinNumber) {
      const guestParams = guestIndices.length > 0 ? guestIndices.map((idx) => `guestIndex=${idx}`).join("&") : ""
      const newUrl = `/confirmation?cabin=${cabinNumber}${guestParams ? `&${guestParams}` : ""}&language=${language}`
      window.history.replaceState({}, "", newUrl)
    }
  }, [language, langParam, cabinNumber, guestIndices])

  // Show loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-10 px-4 max-w-4xl text-center">
        <div className="flex flex-col items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p>{t("loading")}</p>
        </div>
      </div>
    )
  }

  // Show error state
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
        </div>
      </div>
    )
  }

  // If no guests were found or selected, show a message
  if (selectedGuests.length === 0) {
    return (
      <div className="container mx-auto py-10 px-4 max-w-4xl text-center">
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-6">
          <h2 className="text-yellow-700 text-lg font-medium mb-2">{t("noCabinFound")}</h2>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {t("startOver")}
          </button>
        </div>
      </div>
    )
  }

  // Group meal choices by guest index
  const mealChoicesByGuest: Record<number, Record<number, string>> = {}

  mealChoices.forEach((choice) => {
    if (!mealChoicesByGuest[choice.guest_index]) {
      mealChoicesByGuest[choice.guest_index] = {}
    }
    mealChoicesByGuest[choice.guest_index][choice.day] = choice.meal_type
  })

  // Find menu item details for a specific meal type and day
  const getMenuItemDetails = (mealType: string, day: number): MenuItem | undefined => {
    return menuItems.find((item) => item.meal_type === mealType && item.day === day)
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl relative">
      <LanguageSelector language={language} onChange={setLanguage} />

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t("confirmation")}</h1>
        <p className="text-muted-foreground mt-2">{t("confirmationMessage", { cabin: cabinNumber })}</p>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 bg-gray-50 border-b">
          <div className="flex flex-wrap">
            {selectedGuests.map((guest, index) => (
              <button
                key={index}
                onClick={() => setActiveGuestIndex(index)}
                className={`px-4 py-2 mb-2 ${
                  activeGuestIndex === index
                    ? "bg-white border-t border-l border-r rounded-t-md -mb-px"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {guest.guest_name}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          <h2 className="font-semibold text-lg mb-4">{t("dinnerSelections")}</h2>

          <div className="space-y-6">
            {DAYS.map((day, index) => {
              const activeGuest = selectedGuests[activeGuestIndex]
              const guestIndex = guests.findIndex((g) => g.id === activeGuest?.id)
              const mealType = mealChoicesByGuest[guestIndex]?.[day]
              const menuItem = mealType ? getMenuItemDetails(mealType, day) : undefined

              return (
                <div key={day} className="border-b pb-4 last:border-b-0 last:pb-0">
                  <h3 className="font-medium">
                    {t("day")} {day} - {t(DAY_NAMES[index])}
                  </h3>

                  {mealType ? (
                    <div className="mt-2 p-3 bg-gray-50 rounded">
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
                  ) : (
                    <p className="mt-2 text-gray-500 italic">{t("noSelection")}</p>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 mb-4">{t("selectionLocked")}</p>

            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {t("startOver")}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
