"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ConfirmationDetails } from "@/components/confirmation-details"
import { clientStorage } from "@/utils/client-storage"

interface MealSelection {
  guestName: string
  mealOption: string
}

export default function ConfirmationPage() {
  const router = useRouter()
  const [cabinNumber, setCabinNumber] = useState<string | null>(null)
  const [mealSelections, setMealSelections] = useState<MealSelection[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get cabin number and meal selections from session storage
    const storedCabinNumber = clientStorage.getSessionItem("cabinNumber")
    const storedMealSelections = clientStorage.getSessionItem("mealSelections")

    if (!storedCabinNumber || !storedMealSelections) {
      // Redirect back to home if data is missing
      router.push("/")
      return
    }

    setCabinNumber(storedCabinNumber)
    setMealSelections(JSON.parse(storedMealSelections))
    setIsLoading(false)
  }, [router])

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-3xl space-y-8 rounded-lg bg-white p-8 shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Confirmation</h1>
          <p className="mt-2 text-gray-600">Cabin {cabinNumber}</p>
        </div>

        <ConfirmationDetails cabinNumber={cabinNumber || ""} mealSelections={mealSelections} />
      </div>
    </div>
  )
}
