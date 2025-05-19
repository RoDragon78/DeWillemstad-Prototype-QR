"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { LanguageSelector } from "@/components/language-selector"
import { useTranslations } from "@/lib/i18n/use-translations"
import type { Language } from "@/lib/i18n/translations"
import { getGuestsByCabin, type Guest } from "@/lib/supabase-client"

export default function SelectGuestsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const cabinNumber = searchParams.get("cabin") || ""
  const langParam = (searchParams.get("language") as Language) || "en"

  const [language, setLanguage] = useState<Language>(langParam)
  const { t } = useTranslations(language)

  const [guests, setGuests] = useState<Guest[]>([])
  const [selectedGuests, setSelectedGuests] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fetchAttempts, setFetchAttempts] = useState(0)

  // Fetch guests for the cabin
  useEffect(() => {
    async function fetchGuests() {
      if (!cabinNumber) {
        router.push("/")
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        const guestData = await getGuestsByCabin(cabinNumber)

        if (guestData.length === 0) {
          setError(t("noCabinFound"))
          setTimeout(() => router.push("/"), 3000)
          return
        }

        setGuests(guestData)
        // Auto-select all guests by default
        setSelectedGuests(guestData.map((_, index) => index))
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
      } finally {
        setIsLoading(false)
      }
    }

    fetchGuests()
  }, [cabinNumber, router, t, fetchAttempts])

  // Update language in URL when changed
  useEffect(() => {
    if (language !== langParam && cabinNumber) {
      const newUrl = `/select-guests?cabin=${cabinNumber}&language=${language}`
      window.history.replaceState({}, "", newUrl)
    }
  }, [language, langParam, cabinNumber])

  const handleGuestToggle = (guestIndex: number) => {
    setSelectedGuests((prev) =>
      prev.includes(guestIndex) ? prev.filter((idx) => idx !== guestIndex) : [...prev, guestIndex],
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedGuests.length === 0) {
      setError(t("pleaseSelect"))
      return
    }

    // Create a query string with all selected guest indices
    const guestParams = selectedGuests.map((idx) => `guestIndex=${idx}`).join("&")
    router.push(`/meal-selection?cabin=${cabinNumber}&${guestParams}&language=${language}`)
  }

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

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl relative">
      <LanguageSelector language={language} onChange={setLanguage} />

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t("selectGuests")}</h1>
        <p className="text-muted-foreground mt-2">{t("cabinInfo", { cabin: cabinNumber })}</p>
      </div>

      <div className="max-w-md mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            {guests.map((guest, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`guest-${index}`}
                  checked={selectedGuests.includes(index)}
                  onChange={() => handleGuestToggle(index)}
                  className="h-4 w-4"
                />
                <label htmlFor={`guest-${index}`} className="text-base">
                  {guest.guest_name}
                </label>
              </div>
            ))}
          </div>

          {error && <p className="text-red-500">{error}</p>}

          <button
            type="submit"
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
            disabled={selectedGuests.length === 0}
          >
            {t("continueToMealSelection")}
          </button>
        </form>
      </div>
    </div>
  )
}
