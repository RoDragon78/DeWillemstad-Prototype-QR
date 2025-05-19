"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { LanguageSelector } from "@/components/language-selector"
import { useTranslations } from "@/lib/i18n/use-translations"
import type { Language } from "@/lib/i18n/translations"
import { hasCabinSubmittedChoices, getGuestsByCabin } from "@/lib/supabase-client"

export default function Home() {
  const router = useRouter()
  const [language, setLanguage] = useState<Language>("en")
  const { t } = useTranslations(language)
  const [cabinNumber, setCabinNumber] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectionCompleted, setSelectionCompleted] = useState(false)

  // Store language preference
  useEffect(() => {
    localStorage.setItem("language", language)
  }, [language])

  // Load language preference
  useEffect(() => {
    const savedLanguage = localStorage.getItem("language") as Language | null
    if (savedLanguage && ["en", "de", "nl"].includes(savedLanguage)) {
      setLanguage(savedLanguage as Language)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!cabinNumber.trim()) {
      setError(t("noCabinFound"))
      return
    }

    setIsLoading(true)
    setError(null)
    setSelectionCompleted(false)

    try {
      // First check if the cabin exists
      const guests = await getGuestsByCabin(cabinNumber)

      if (!guests || guests.length === 0) {
        setError(t("noCabinFound"))
        setIsLoading(false)
        return
      }

      // Then check if cabin has already submitted choices
      const hasSubmitted = await hasCabinSubmittedChoices(cabinNumber)

      if (hasSubmitted) {
        // Show message that selection is already completed
        setSelectionCompleted(true)

        // After a short delay, redirect to confirmation page
        setTimeout(() => {
          router.push(`/confirmation?cabin=${cabinNumber}&language=${language}`)
        }, 2000)
      } else {
        // Otherwise, go to guest selection
        router.push(`/select-guests?cabin=${cabinNumber}&language=${language}`)
      }
    } catch (err: any) {
      console.error("Error checking cabin:", err)
      setError(t("error"))
    } finally {
      if (!selectionCompleted) {
        setIsLoading(false)
      }
    }
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl relative">
      <LanguageSelector language={language} onChange={setLanguage} />

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-2">{t("subtitle")}</p>
      </div>

      <div className="max-w-md mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="cabinNumber" className="text-sm font-medium">
              {t("cabinNumber")}
            </label>
            <input
              id="cabinNumber"
              type="text"
              value={cabinNumber}
              onChange={(e) => setCabinNumber(e.target.value)}
              placeholder={t("enterCabinNumber")}
              className="w-full p-2 border rounded"
              disabled={isLoading || selectionCompleted}
            />
          </div>

          {error && <p className="text-red-500">{error}</p>}

          {selectionCompleted && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 text-center">
              <p className="text-green-700">{t("selectionAlreadyCompleted")}</p>
              <p className="text-green-600 text-sm mt-1">{t("redirectingToConfirmation")}</p>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
            disabled={isLoading || selectionCompleted || !cabinNumber.trim()}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                {t("searching")}
              </div>
            ) : (
              t("continue")
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
